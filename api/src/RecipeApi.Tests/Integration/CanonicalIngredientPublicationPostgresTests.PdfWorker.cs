using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Moq;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Ai;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Workflow;
using SkiaSharp;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    private const string PdfWorkerFixtureHash = "20808885823da6870ff6dfd8b7408e35d0fc0de766491bdc0344b204df48916d";
    private const string PdfWorkerSource = """
        {"name":"Pasta for four","recipeYield":"4 servings","recipeIngredient":["200 g pasta","100 ml sauce","salt to taste"],"supply":[{"name":"pasta","requiredQuantity":{"value":200,"unitText":"g"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Cook the pasta."},{"text":"Serve with the sauce."}]}
        """;

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshPdf_BackgroundWorkerAndNativeRendererPublishCanonicalAndReady()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            using var provider = new PdfWorkerProvider(holdExternalResponses: true);
            await using var factory = await CreatePdfWorkerFactoryAsync(settings.ConnectionString, provider);
            using var client = factory.CreateAuthenticatedClient();
            client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
            var original = PdfWorkerFixture();
            using var form = new MultipartFormDataContent();
            var file = new ByteArrayContent(original);
            file.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
            form.Add(file, "file", "canonical-pasta-bilingual.pdf");
            form.Add(new StringContent("2"), "rating");
            form.Add(new StringContent("Keep this public PDF source."), "notes");
            using var accepted = await client.PostAsync("/api/recipes/capture-pdf", form);
            Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
            using var acceptedWire = JsonDocument.Parse(await accepted.Content.ReadAsStringAsync());
            var id = acceptedWire.RootElement.GetProperty("data").GetProperty("id").GetGuid();
            await WaitPdfWorkerAsync(factory, _ => Task.FromResult(provider.ExtractionEntered.Task.IsCompleted), "native conversion and extraction dispatch");
            // Only the external model response is held. All source conversion,
            // task promotion and attempt observation ran autonomously in the host.
            string[] pageHashes;
            Guid rootId;
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                Assert.True(db.Database.IsNpgsql());
                Assert.IsType<PdfProcessRenderer>(scope.ServiceProvider.GetRequiredService<IPdfPageRenderer>());
                Assert.Single(factory.Services.GetServices<IHostedService>().OfType<WorkflowWorker>());
                Assert.Equal(1, await db.Recipes.CountAsync());
                var root = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == "recipe-import");
                rootId = root.Id;
                var convert = root.Tasks.Single(x => x.ProcessorName == "ConvertPdf");
                Assert.Equal(TaskStatus.Completed, convert.Status);
                Assert.Equal(TaskStatus.Processing, root.Tasks.Single(x => x.ProcessorName == "ExtractRecipe").Status);
                var conversion = await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == convert.TaskId);
                Assert.True(conversion.Delivered);
                var validate = typeof(PdfConversionProcessor).GetMethod("ValidateOriginalHistory", BindingFlags.NonPublic | BindingFlags.Static)!;
                Assert.Equal(id, Assert.IsType<Guid>(validate.Invoke(null, [convert.Payload, convert.Result, new[] { conversion }])));
                var history = await db.WorkflowProcessorAttempts.AsNoTracking().SingleAsync(x => x.TaskId == convert.TaskId);
                ValidatePdfWorkerHistory(history);
                using var outcome = JsonDocument.Parse(history.Outcome!);
                Assert.True(outcome.RootElement.GetProperty("processorReturned").GetBoolean());
                using var returned = JsonDocument.Parse(outcome.RootElement.GetProperty("returnedResult").GetString()!);
                Assert.Equal(2, returned.RootElement.GetProperty("imageCount").GetInt32());
                var capture = await scope.ServiceProvider.GetRequiredService<RecipeFilePublicationStore>().CaptureAsync(id);
                Assert.Equal(original, capture.Files["original/source.pdf"]);
                Assert.Null(capture.Fields!.CanonicalContent);
                Assert.False(capture.Fields.IsReady);
                pageHashes = Enumerable.Range(0, 2).Select(index =>
                {
                    var png = capture.Files[$"original/{index}.png"]!;
                    Assert.Equal(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }, png.Take(8));
                    using var bitmap = SKBitmap.Decode(png);
                    Assert.NotNull(bitmap);
                    Assert.Equal(1699, bitmap.Width);
                    Assert.Equal(2200, bitmap.Height);
                    return PdfWorkerHash(png);
                }).ToArray();
                Assert.NotEqual(pageHashes[0], pageHashes[1]);
                Assert.Equal(pageHashes, provider.ExtractionPageHashes);
                var bootstrap = await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.RecipeId == id && x.OperationId == root.Id);
                Assert.True(bootstrap.Delivered);
                Assert.NotNull(root.RecipePublicationCapture);
                Assert.Equal(factory.DefaultFamilyMemberId, (await db.Recipes.AsNoTracking().SingleAsync()).AddedBy);
            }
            for (var index = 0; index < 2; index++)
            {
                using var page = await client.GetAsync($"/api/recipes/{id}/original/{index}");
                Assert.Equal(HttpStatusCode.OK, page.StatusCode);
                Assert.Equal("image/png", page.Content.Headers.ContentType!.MediaType);
                Assert.Equal(pageHashes[index], PdfWorkerHash(await page.Content.ReadAsByteArrayAsync()));
            }
            provider.ReleaseExtraction();
            await WaitPdfWorkerAsync(factory, _ => Task.FromResult(provider.HeroEntered.Task.IsCompleted), "canonical publication before hero response");
            string beforeReadyCanonical;
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                Assert.False(recipe.IsReady);
                Assert.NotNull(recipe.CanonicalContent);
                beforeReadyCanonical = recipe.CanonicalContent;
                var content = CanonicalRecipeContentStore.Read(recipe)!;
                Assert.Equal(4, content.Servings);
                Assert.Equal(new[] { "200 g pasta", "100 ml sauce", "salt to taste" }, content.IngredientLines.Select(CanonicalRecipeContentStore.Render));
                Assert.Equal(LegacyGroceryQuantity.Parse("200"), content.IngredientLines[0].Amount);
                Assert.Equal(LegacyGroceryQuantity.Parse("100"), content.IngredientLines[1].Amount);
                Assert.Null(content.IngredientLines[2].Amount);
                Assert.Null(content.IngredientLines[2].Unit);
                Assert.All(content.IngredientLines, row =>
                {
                    Assert.Equal("source", row.Provenance.Origin);
                    Assert.Equal(content.SourceRevision, row.Provenance.SourceRef);
                    Assert.Empty(row.Provenance.ProtectedFields);
                });
                Assert.Equal(new[] { "Cook the pasta.", "Serve with the sauce." }, content.InstructionSections.SelectMany(x => x.Steps).Select(x => x.Text));
                Assert.Empty(content.InstructionSections.SelectMany(x => x.Steps).SelectMany(x => x.Bindings));
            }
            provider.ReleaseHero();
            await WaitPdfWorkerAsync(factory, async db =>
            {
                var root = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleAsync(x => x.Id == rootId);
                if (root.Status != WorkflowStatus.Completed) return false;
                var queue = root.Tasks.Single(x => x.ProcessorName == "QueueRecipeSearchIndex");
                using var result = JsonDocument.Parse(queue.Result!);
                var childId = result.RootElement.GetProperty("workflowInstanceId").GetGuid();
                return await db.WorkflowInstances.AnyAsync(x => x.Id == childId && x.Status == WorkflowStatus.Completed);
            }, "complete root and actual search child");
            var producerProof = await ReadPdfWorkerProofAsync(factory, id);
            Assert.Equal(1, provider.Calls["extract"]);
            Assert.Equal(1, provider.Calls["description"]);
            Assert.Equal(1, provider.Calls["ingredient-category"]);
            Assert.Equal(1, provider.Calls["recipe-category"]);
            Assert.Equal(1, provider.Calls["hero"]);
            Assert.Equal(1, provider.Calls["embedding"]);
            Assert.Empty(provider.Unexpected);
            CanonicalRecipeContent initial;
            string rawSource;
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                Assert.True(recipe.IsReady);
                Assert.Equal(beforeReadyCanonical, recipe.CanonicalContent);
                Assert.Equal("Italian", recipe.CuisineType);
                Assert.Equal(RecipeRating.Like, recipe.Rating);
                Assert.Equal("Keep this public PDF source.", recipe.Notes);
                Assert.Equal("Pantry", (await db.IngredientCategories.AsNoTracking().SingleAsync(x => x.NormalizedKey == "pasta")).GrocerySection);
                var index = await db.RecipeSearchDocuments.AsNoTracking().SingleAsync(x => x.RecipeId == id);
                Assert.Equal("ready", index.IndexStatus);
                Assert.Equal("ready", index.EmbeddingStatus);
                Assert.Equal(1536, index.Embedding!.Length);
                Assert.Equal(SearchFingerprintService.ComputeSourceFingerprint(recipe), index.SourceFingerprint);
                Assert.Equal(index.SourceFingerprint, index.EmbeddingFingerprint);
                initial = CanonicalRecipeContentStore.Read(recipe)!;
                rawSource = recipe.RawMetadata!;
            }
            // Concise consumer continuation: only ordinary guarded API writes;
            // all derived grocery work is claimed by the autonomous worker.
            var monday = new DateOnly(2026, 10, 12);
            using var assignment = await client.PostAsJsonAsync($"/api/schedule/assign?referenceWeekStartDate={monday:yyyy-MM-dd}",
                new { weekOffset = 0, dayIndex = 0, recipeId = id, requireEmpty = true });
            Assert.Equal(HttpStatusCode.OK, assignment.StatusCode);
            using var portionsRead = JsonDocument.Parse(await client.GetStringAsync($"/api/schedule/servings?referenceWeekStartDate={monday:yyyy-MM-dd}"));
            var portionVersion = portionsRead.RootElement.GetProperty("data").GetProperty("version").GetString();
            using var portions = await client.PutAsJsonAsync("/api/schedule/servings", new
            {
                referenceWeekStartDate = monday, weekOffset = 0, expectedVersion = portionVersion,
                days = new[] { new { date = monday, servings = 8 } }
            });
            Assert.Equal(HttpStatusCode.OK, portions.StatusCode);
            await WaitPdfWorkerGroceriesAsync(factory, monday, "400");
            await GroceryTestRows.CheckAsync(client, monday, "sauce");
            var control = await PdfWorkerSauceControlAsync(factory, monday);
            using var save = await client.PatchAsJsonAsync($"/api/recipes/{id}", new
            {
                expectedContentRevision = initial.ContentRevision,
                ingredientLines = initial.IngredientLines.Select((row, index) => PdfGuardRow(row) with
                    { Amount = index == 0 ? LegacyGroceryQuantity.Parse("250") : row.Amount, AmountText = index == 0 ? "250" : row.AmountText })
            });
            Assert.Equal(HttpStatusCode.OK, save.StatusCode);
            await WaitPdfWorkerGroceriesAsync(factory, monday, "500");
            var detail = (await client.GetFromJsonAsync<RecipeDetailResponseDto>($"/api/recipes/{id}"))!.Recipe;
            Assert.Equal(LegacyGroceryQuantity.Parse("250"), detail.IngredientLines![0].Amount);
            Assert.Equal(initial.IngredientLines.Select(x => x.Id), detail.IngredientLines.Select(x => x.Id));
            Assert.Equal(control, await PdfWorkerSauceControlAsync(factory, monday));
            using (var scope = factory.Services.CreateScope())
            {
                var plan = await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking()
                    .SingleAsync(x => x.WeekStartDate == monday);
                var pasta = Assert.Single(JsonSerializer.Deserialize<GroceryLineItemDto[]>(plan.GroceryItems)!, row => row.NormalizedKey == "pasta");
                Assert.Equal(id, Assert.Single(pasta.RecipeIds));
            }
            Guid occurrence;
            using (var scope = factory.Services.CreateScope())
                occurrence = (await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().CalendarEvents.AsNoTracking()
                    .SingleAsync(x => x.Date == monday && x.MealSlot == 0)).Id;
            using var projection = JsonDocument.Parse(await client.GetStringAsync(
                $"/api/recipes/{id}/ingredient-projection?supperDate={monday:yyyy-MM-dd}&context=assigned&occurrenceId={occurrence}"));
            Assert.Equal("500 g pasta", projection.RootElement.GetProperty("lines")[0].GetProperty("displayText").GetString());
            using var clear = await client.PatchAsJsonAsync($"/api/recipes/{id}", new
            {
                expectedContentRevision = detail.ContentRevision,
                ingredientLines = detail.IngredientLines.Select((row, index) => PdfGuardRow(row) with
                    { Amount = index == 0 ? null : row.Amount, AmountText = index == 0 ? null : row.AmountText })
            });
            Assert.Equal(HttpStatusCode.OK, clear.StatusCode);
            await WaitPdfWorkerGroceriesAsync(factory, monday, null);
            Assert.Equal(control, await PdfWorkerSauceControlAsync(factory, monday));
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                var final = CanonicalRecipeContentStore.Read(recipe)!;
                Assert.Null(final.IngredientLines[0].Amount);
                Assert.Equal("human", final.IngredientLines[0].Provenance.Origin);
                Assert.Contains("amount", final.IngredientLines[0].Provenance.ProtectedFields);
                Assert.Equal(initial.SourceRevision, final.SourceRevision);
                Assert.Equal(rawSource, recipe.RawMetadata);
                Assert.Equal(JsonSerializer.Serialize(initial.IngredientLines[1]), JsonSerializer.Serialize(final.IngredientLines[1]));
                Assert.Equal(JsonSerializer.Serialize(initial.InstructionSections), JsonSerializer.Serialize(final.InstructionSections));
                var files = (await scope.ServiceProvider.GetRequiredService<RecipeFilePublicationStore>().CaptureAsync(id)).Files;
                Assert.Equal(original, files["original/source.pdf"]);
                Assert.Equal(pageHashes, Enumerable.Range(0, 2).Select(index => PdfWorkerHash(files[$"original/{index}.png"]!)));
            }
            await WaitPdfWorkerAsync(factory, db => db.WorkflowInstances.AllAsync(x => x.Status == WorkflowStatus.Completed),
                "all owned work completed after edits");
            Assert.Empty(provider.Unexpected);
            output.WriteLine(JsonSerializer.Serialize(new { producer = producerProof,
                final = await ReadPdfWorkerProofAsync(factory, id), runtime = PdfWorkerRuntimeIdentity(),
                externalCalls = provider.Calls, canonicalBeforeReady = true }, JsonDefaults.CamelCase));
        });
    }

    // Privately shared with the later native browser partial. Defaults remain
    // unchanged for every unrelated TestWebApplicationFactory consumer.
    private static Task<TestWebApplicationFactory> CreatePdfWorkerFactoryAsync(string connectionString,
        PdfWorkerProvider provider, string? httpUrl = null, Action<WebApplication>? configureApplication = null) =>
        TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(), new()
        {
            ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = connectionString,
            ["Tests:LocalRecipeStore"] = "true", ["Tests:RealWorkflowOrchestrator"] = "true",
            ["Tests:HttpUrl"] = httpUrl, ["GEMINI_API_KEY"] = "synthetic-pdf-worker-key", ["DEMO_MODE"] = "false"
        }, configureApplication: app =>
        {
            using var scope = app.Services.CreateScope();
            var storage = scope.ServiceProvider.GetRequiredService<IStorageProvider>();
            foreach (var definition in new[] { "recipe-import", "index-recipe-search" })
                storage.SaveAsync("workflows", definition + ".yaml", File.ReadAllText(Path.Combine(
                    DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi/Workflows", definition + ".yaml"))).GetAwaiter().GetResult();
            configureApplication?.Invoke(app);
        }, configureServices: services =>
        {
            services.RemoveAll<IChatClient>();
            services.AddSingleton(provider.Chat.Object);
            services.RemoveAll<IEmbeddingProvider>();
            services.AddSingleton(provider.Embedding.Object);
            services.AddSingleton<IHttpClientFactory>(new PdfWorkerHttpFactory(provider));
            services.AddSingleton<IPdfPageRenderer, PdfProcessRenderer>();
            services.AddSingleton<AiExceptionHandler>();
            services.AddOptions<WorkflowRetryOptions>();
            services.AddScoped<IWorkflowProcessor, PdfConversionProcessor>();
            services.AddScoped<IWorkflowProcessor>(sp => ActivatorUtilities.CreateInstance<RecipeAgent>(sp, "ExtractRecipe"));
            services.AddScoped<IWorkflowProcessor, RecipeHeroAgent>();
            services.AddScoped<IWorkflowProcessor, SyncRecipeProcessor>();
            services.AddScoped<IWorkflowProcessor, CategorizeIngredientsProcessor>();
            services.AddScoped<IWorkflowProcessor, CategorizeRecipeProcessor>();
            services.AddScoped<IWorkflowProcessor, RecipeReadyProcessor>();
            services.AddScoped<IWorkflowProcessor, CompleteRecipeImportReportProcessor>();
            services.AddScoped<IWorkflowProcessor, QueueRecipeSearchIndexProcessor>();
            services.AddScoped<IWorkflowProcessor>(sp => sp.GetRequiredService<SearchIndexWorkflow>());
            // RefreshSupperGroceries is already registered exactly once by the factory.
            services.AddHostedService<WorkflowWorker>();
        });

    private static byte[] PdfWorkerFixture()
    {
        var bytes = File.ReadAllBytes(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/canonical-pasta-bilingual.pdf"));
        Assert.Equal(1330, bytes.Length);
        Assert.Equal(PdfWorkerFixtureHash, PdfWorkerHash(bytes));
        return bytes;
    }

    private static string PdfWorkerHash(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

    private static string PdfWorkerFileHash(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
    }

    private static void ValidatePdfWorkerHistory(WorkflowProcessorAttempt attempt) => typeof(WorkflowWorker).Assembly
        .GetType("RecipeApi.Services.WorkflowProcessorHistory")!.GetMethod("Validate", BindingFlags.Public | BindingFlags.Static)!.Invoke(null, [attempt]);

    private static async Task WaitPdfWorkerAsync(TestWebApplicationFactory factory, Func<RecipeDbContext, Task<bool>> condition, string phase)
    {
        var timeout = Stopwatch.StartNew();
        while (timeout.Elapsed < TimeSpan.FromSeconds(120))
        {
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var failed = await db.WorkflowTasks.AsNoTracking().Where(x => x.Status == TaskStatus.Failed || x.RetryCount > 0)
                .Select(x => new { x.TaskId, x.ProcessorName, x.Status, x.RetryCount }).ToArrayAsync();
            Assert.True(failed.Length == 0, $"PDF background worker failed during {phase}: {JsonSerializer.Serialize(failed)}");
            if (await condition(db)) return;
            await Task.Delay(100);
        }
        using var diagnostics = factory.Services.CreateScope();
        var tasks = await diagnostics.ServiceProvider.GetRequiredService<RecipeDbContext>().WorkflowTasks.AsNoTracking()
            .Select(x => new { x.TaskId, x.ProcessorName, x.Status, x.RetryCount }).ToArrayAsync();
        Assert.Fail($"PDF background worker timed out during {phase}: {JsonSerializer.Serialize(tasks)}");
    }

    private static Task WaitPdfWorkerGroceriesAsync(TestWebApplicationFactory factory, DateOnly monday, string? amount) =>
        WaitPdfWorkerAsync(factory, async db =>
        {
            var plan = await db.WeeklyPlans.AsNoTracking().SingleOrDefaultAsync(x => x.WeekStartDate == monday);
            if (plan?.ServingInputVersion is null || plan.ServingInputVersion != plan.ServingAppliedVersion) return false;
            var rows = JsonSerializer.Deserialize<GroceryLineItemDto[]>(plan.GroceryItems)!;
            var pasta = rows.SingleOrDefault(x => x.NormalizedKey == "pasta");
            if (pasta is null) return false;
            return amount is null ? pasta.ExactQuantity is null : pasta.ExactQuantity == LegacyGroceryQuantity.Parse(amount);
        }, "autonomous grocery refresh");

    private static async Task<string> PdfWorkerSauceControlAsync(TestWebApplicationFactory factory, DateOnly monday)
    {
        using var scope = factory.Services.CreateScope();
        var plan = await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
        var sauce = Assert.Single(JsonSerializer.Deserialize<GroceryLineItemDto[]>(plan.GroceryItems)!, x => x.NormalizedKey == "sauce");
        Assert.Equal(LegacyGroceryQuantity.Parse("200"), sauce.ExactQuantity);
        using var checks = JsonDocument.Parse(plan.GroceryState);
        using var baselines = JsonDocument.Parse(plan.GroceryCheckedDemandBaselines);
        Assert.True(checks.RootElement.GetProperty(sauce.RowId).GetBoolean());
        return JsonSerializer.Serialize(new { sauce, check = checks.RootElement.GetProperty(sauce.RowId), baseline = baselines.RootElement.GetProperty(sauce.RowId) });
    }

    private static async Task<JsonElement> ReadPdfWorkerProofAsync(TestWebApplicationFactory factory, Guid id)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        var workflows = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).OrderBy(x => x.Id).ToArrayAsync();
        Assert.All(workflows, workflow => Assert.Equal(WorkflowStatus.Completed, workflow.Status));
        var tasks = workflows.SelectMany(x => x.Tasks).ToArray();
        Assert.All(tasks, task => { Assert.Equal(TaskStatus.Completed, task.Status); Assert.Equal(0, task.RetryCount); });
        var attempts = await db.WorkflowProcessorAttempts.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync();
        Assert.Equal(tasks.Length, attempts.Length);
        foreach (var task in tasks) ValidatePdfWorkerHistory(Assert.Single(attempts, attempt => attempt.TaskId == task.TaskId));
        var root = Assert.Single(workflows, x => x.WorkflowId == "recipe-import");
        Assert.Equal(new[] { "ConvertPdf", "ExtractRecipe", "GenerateHero", "SyncRecipe", "CategorizeIngredients", "CategorizeRecipe", "RecipeReady", "CompleteRecipeImportReport", "QueueRecipeSearchIndex" }.Order(),
            root.Tasks.Select(x => x.ProcessorName).Order());
        var child = Assert.Single(workflows, x => x.WorkflowId == "index-recipe-search");
        var queue = root.Tasks.Single(x => x.ProcessorName == "QueueRecipeSearchIndex");
        using var queueResult = JsonDocument.Parse(queue.Result!);
        Assert.Equal(child.Id, queueResult.RootElement.GetProperty("workflowInstanceId").GetGuid());
        var intent = await db.WorkflowChildIntents.AsNoTracking().SingleAsync(x => x.ParentTaskId == queue.TaskId);
        Assert.NotNull(intent.AcceptedAt);
        var files = (await scope.ServiceProvider.GetRequiredService<RecipeFilePublicationStore>().CaptureAsync(id)).Files;
        var publications = await db.RecipeFilePublications.AsNoTracking().Where(x => x.RecipeId == id).OrderBy(x => x.OperationId).ToArrayAsync();
        Assert.All(publications, publication => Assert.True(publication.Delivered));
        var plans = await db.WeeklyPlans.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync();
        return JsonSerializer.SerializeToElement(new
        {
            content = CanonicalRecipeContentStore.Read(recipe),
            source = new { recipe.SourceUrl, recipe.Servings, recipe.ImageCount, recipe.FinishedDishIndex, recipe.IsReady,
                rawMetadataSha256 = PdfWorkerHash(Encoding.UTF8.GetBytes(recipe.RawMetadata!)), recipe.AddedBy, recipe.Rating, recipe.Notes },
            reports = await db.RecipeImportReports.AsNoTracking().Where(x => x.RecipeId == id)
                .Select(x => new { x.Status, x.LastWorkflowInstanceId }).ToArrayAsync(),
            sourceFiles = new[] { "original/source.pdf", "original/0.png", "original/1.png", "hero.webp" }
                .ToDictionary(path => path, path => new { sha256 = PdfWorkerHash(files[path]!), bytes = files[path]!.Length }),
            workflow = workflows.Select(x => new { x.Id, x.WorkflowId, x.Status, tasks = x.Tasks.Select(t => new { t.TaskId, t.ProcessorName, t.Status, t.RetryCount }) }),
            attempts = attempts.Select(x => new { x.Id, x.TaskId, x.InstanceId, x.RequestHash, x.OutcomeHash, x.ObservedAt }),
            publications = publications.Select(x => new { x.OperationId, x.InputHash, x.ResultHash, x.Delivered }),
            categories = await db.IngredientCategories.AsNoTracking().OrderBy(x => x.NormalizedKey).ToArrayAsync(),
            rows = plans.Select(x => new { x.WeekStartDate, items = JsonDocument.Parse(x.GroceryItems).RootElement.Clone() }),
            checks = plans.Select(x => new { x.WeekStartDate, state = JsonDocument.Parse(x.GroceryState).RootElement.Clone(), baseline = JsonDocument.Parse(x.GroceryCheckedDemandBaselines).RootElement.Clone() }),
            operations = await db.CanonicalRecipeOperations.AsNoTracking().Where(x => x.RecipeId == id).Select(x => new { x.OperationId, x.InputHash }).ToArrayAsync()
        }, JsonDefaults.CamelCase);
    }

    private static object PdfWorkerRuntimeIdentity()
    {
        var assembly = typeof(PdfNativeWorker).Assembly.Location;
        var directory = Path.GetDirectoryName(assembly)!;
        var dotnet = (Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator)
            .Where(path => !string.IsNullOrWhiteSpace(path)).Select(path => Path.Combine(path, OperatingSystem.IsWindows() ? "dotnet.exe" : "dotnet")).First(File.Exists);
        return new
        {
            runtime = RuntimeInformation.FrameworkDescription, os = RuntimeInformation.OSDescription,
            architecture = RuntimeInformation.ProcessArchitecture.ToString(), profile = PdfRenderLimits.Default,
            dotnetSha256 = PdfWorkerFileHash(dotnet),
            inputs = new[] { assembly, Path.ChangeExtension(assembly, ".runtimeconfig.json"), Path.ChangeExtension(assembly, ".deps.json") }
                .ToDictionary(path => Path.GetFileName(path), PdfWorkerFileHash),
            nativeAssets = Directory.EnumerateFiles(directory, "*", SearchOption.AllDirectories)
                .Where(path => Path.GetFileName(path).Contains("pdfium", StringComparison.OrdinalIgnoreCase)
                    || Path.GetFileName(path).Contains("SkiaSharp", StringComparison.OrdinalIgnoreCase))
                .ToDictionary(path => Path.GetRelativePath(directory, path), PdfWorkerFileHash)
        };
    }

    private sealed class PdfWorkerProvider : IDisposable
    {
        public Mock<IChatClient> Chat { get; } = new();
        public Mock<IEmbeddingProvider> Embedding { get; } = new(MockBehavior.Strict);
        public ConcurrentDictionary<string, int> Calls { get; } = new();
        public ConcurrentQueue<string> Unexpected { get; } = new();
        public TaskCompletionSource<bool> ExtractionEntered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource<bool> HeroEntered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource<bool> extractionRelease = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource<bool> heroRelease = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public string[] ExtractionPageHashes { get; private set; } = [];
        public PdfWorkerProvider(bool holdExternalResponses)
        {
            if (!holdExternalResponses) { ReleaseExtraction(); ReleaseHero(); }
            Chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .Returns(async (IEnumerable<ChatMessage> messages, ChatOptions? options, CancellationToken ct) =>
                {
                    var observed = messages.ToArray();
                    var text = string.Join("\n", observed.Select(x => x.Text));
                    string response;
                    if (text.Contains("Please extract the recipe as instructed.", StringComparison.Ordinal))
                    {
                        Count("extract");
                        var images = observed.SelectMany(x => x.Contents).OfType<DataContent>().ToArray();
                        Assert.Equal(2, images.Length);
                        ExtractionPageHashes = images.Select(x => PdfWorkerHash(x.Data.ToArray())).ToArray();
                        ExtractionEntered.TrySetResult(true);
                        await extractionRelease.Task.WaitAsync(ct);
                        response = PdfWorkerSource;
                    }
                    else if (text.Contains("Recipe Data (JSON):", StringComparison.Ordinal))
                    { Count("description"); response = "Pasta is cooked and served with sauce. Salt is added to taste."; }
                    else if (text.Contains("You are a grocery categorization assistant.", StringComparison.Ordinal))
                    { Count("ingredient-category"); response = """[{"normalizedKey":"pasta","section":"Pantry","confidence":1},{"normalizedKey":"sauce","section":"Pantry","confidence":1},{"normalizedKey":"salt to taste","section":"Pantry","confidence":1}]"""; }
                    else if (text.Contains("You are a recipe facts categorization assistant.", StringComparison.Ordinal))
                    { Count("recipe-category"); response = """{"cuisineType":"Italian","mealTypes":["Supper"],"primaryMealType":"Supper","isVegetarian":true}"""; }
                    else { Unexpected.Enqueue("unmatched-chat"); throw new InvalidOperationException("Unmatched PDF fixture chat boundary."); }
                    return new ChatResponse(new ChatMessage(ChatRole.Assistant, response));
                });
            Embedding.Setup(x => x.GenerateAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns((string text, CancellationToken ct) =>
            {
                if (string.IsNullOrWhiteSpace(text)) { Unexpected.Enqueue("empty-embedding"); throw new InvalidOperationException("Empty PDF fixture embedding request."); }
                Count("embedding"); var vector = new float[1536]; vector[0] = 1;
                return Task.FromResult(vector);
            });
        }
        private void Count(string kind) => Calls.AddOrUpdate(kind, 1, (_, value) => value + 1);
        public void ReleaseExtraction() => extractionRelease.TrySetResult(true);
        public void ReleaseHero() => heroRelease.TrySetResult(true);
        public async Task<HttpResponseMessage> HeroAsync(HttpRequestMessage request, CancellationToken ct)
        {
            if (request.Method != HttpMethod.Post || request.RequestUri?.Host != "generativelanguage.googleapis.com"
                || !request.RequestUri.AbsolutePath.EndsWith(":generateContent", StringComparison.Ordinal))
            { Unexpected.Enqueue("unmatched-http"); throw new InvalidOperationException("Unmatched PDF fixture HTTP boundary."); }
            Count("hero"); HeroEntered.TrySetResult(true); await heroRelease.Task.WaitAsync(ct);
            using var bitmap = new SKBitmap(8, 8); bitmap.Erase(SKColors.Orange);
            using var image = SKImage.FromBitmap(bitmap); using var png = image.Encode(SKEncodedImageFormat.Png, 100);
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new
            {
                candidates = new[] { new { content = new { parts = new[] { new { inlineData = new { mimeType = "image/png", data = Convert.ToBase64String(png.ToArray()) } } } } } }
            }), Encoding.UTF8, "application/json") };
        }
        public void Dispose() { extractionRelease.TrySetCanceled(); heroRelease.TrySetCanceled(); }
    }

    private sealed class PdfWorkerHttpFactory(PdfWorkerProvider provider) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name)
        {
            if (name != "recipe-hero") { provider.Unexpected.Enqueue("unmatched-client"); throw new InvalidOperationException("Unexpected PDF fixture HTTP client."); }
            return new HttpClient(new PdfWorkerHttpHandler(provider));
        }
    }
    private sealed class PdfWorkerHttpHandler(PdfWorkerProvider provider) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) => provider.HeroAsync(request, ct);
    }
}
