using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_FreshUrlCanonicalGroceries() => FreshCanonicalGroceries(absoluteUse: false);

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_FreshAbsoluteCanonicalGroceries() => FreshCanonicalGroceries(absoluteUse: true);

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_FreshMultipleAbsoluteCanonicalGroceries() => FreshCanonicalGroceries(absoluteUse: false, multipleUse: true);

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_FreshFractionCanonicalGroceries() => FreshCanonicalGroceries(absoluteUse: false, fractionUse: true);

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_FreshRemainderCanonicalGroceries() => FreshCanonicalGroceries(absoluteUse: false, remainderUse: true);

    private async Task FreshCanonicalGroceries(bool absoluteUse, bool multipleUse = false, bool fractionUse = false, bool remainderUse = false)
    {
        var browserRoot = Environment.GetEnvironmentVariable("WFS_CANONICAL_BROWSER_ROOT")
            ?? throw new InvalidOperationException("Requires an isolated production-built PWA copy.");
        var evidenceRoot = Environment.GetEnvironmentVariable("WFS_CANONICAL_EVIDENCE")
            ?? throw new InvalidOperationException("Requires a unique evidence directory.");
        Assert.True(File.Exists(Path.Combine(browserRoot, "pwa", ".next", "BUILD_ID")));
        var evidence = Path.Combine(evidenceRoot, remainderUse ? "fresh-remainder" : fractionUse ? "fresh-fraction" : multipleUse ? "fresh-multiple-absolute" : absoluteUse ? "fresh-absolute" : "fresh-url");
        Directory.CreateDirectory(evidence);
        var pwaPort = DeploymentCalendarPostgresTests.FreePort();
        var pwaUrl = $"http://127.0.0.1:{pwaPort}";
        var monday = new DateOnly(2026, 10, 12);
        var reviewMonday = monday.AddDays(7);
        var photoMonday = reviewMonday;
        var photoDate = photoMonday.AddDays(6);
        Func<Guid, Task>? finishReview = null;
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
                new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = DateTimeOffset.Parse("2026-10-12T16:00:00Z") }, new()
                {
                    ["Calendar:TimeZone"] = "America/Toronto",
                    ["Tests:HttpUrl"] = "http://127.0.0.1:0",
                    ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                    ["Tests:LocalRecipeStore"] = "true",
                    ["Tests:RealWorkflowOrchestrator"] = "true"
                }, configureApplication: app =>
                {
                    app.MapPost("/_test/fresh-url/recompute", async (GroceryRecomputeService grocery) =>
                    {
                        await grocery.RecomputeForWeekAsync(monday, default);
                        return Results.Ok();
                    }).ExcludeFromDescription().RequireAuthorization();
                    app.MapPost("/_test/fresh-url/recompute-photo", async (GroceryRecomputeService grocery) =>
                    {
                        await grocery.RecomputeForWeekAsync(photoMonday, default);
                        return Results.Ok();
                    }).ExcludeFromDescription().RequireAuthorization();
                    app.MapPost("/_test/fresh-url/complete-review/{importId:guid}", async (Guid importId) =>
                    {
                        if (finishReview is null) return Results.Conflict();
                        await finishReview(importId);
                        return Results.Ok();
                    }).ExcludeFromDescription().RequireAuthorization();
                    app.MapFallback("{**path}", async context =>
                    {
                        using var gateway = new HttpClient();
                        using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), pwaUrl + context.Request.Path + context.Request.QueryString);
                        if (context.Request.ContentLength > 0) request.Content = new StreamContent(context.Request.Body);
                        foreach (var header in context.Request.Headers)
                            if (!string.Equals(header.Key, "Host", StringComparison.OrdinalIgnoreCase))
                                request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                        try
                        {
                            using var response = await gateway.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, context.RequestAborted);
                            context.Response.StatusCode = (int)response.StatusCode;
                            foreach (var header in response.Headers.Concat(response.Content.Headers)) context.Response.Headers[header.Key] = header.Value.ToArray();
                            context.Response.Headers.Remove("transfer-encoding");
                            await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                        }
                        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
                    });
                });
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            var clock = services.GetRequiredService<IClock>();
            var storage = new FailingStorage(services.GetRequiredService<IStorageProvider>());
            await storage.SaveAsync("workflows", "url-import.yaml", await File.ReadAllTextAsync(
                Path.Combine(browserRoot, "api", "src", "RecipeApi", "Workflows", "url-import.yaml")));
            var repository = new RecipeRepository(storage);
            var store = new RecipeFilePublicationStore(db, repository, clock,
                services.GetRequiredService<SupperProjectionInvalidation>());
            var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db, store);
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
            async Task CategorizeFreshAsync(WorkflowInstance intake, Guid recipeId)
            {
                var beforeCategory = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipeId);
                Assert.NotEqual("Lunch", beforeCategory.Category);
                Assert.NotEqual("Italian", beforeCategory.CuisineType);
                Assert.NotEqual(new[] { "Lunch", "Supper" }, beforeCategory.MealTypes);
                Assert.NotEqual(true, beforeCategory.IsVegetarian);
                var categoryChat = new Mock<IChatClient>();
                categoryChat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync((IEnumerable<ChatMessage> messages, ChatOptions? _, CancellationToken _) =>
                    {
                        var prompt = string.Join("\n", messages.Select(x => x.Text));
                        if (prompt.Contains("grocery categorization assistant", StringComparison.Ordinal))
                            return new ChatResponse(new ChatMessage(ChatRole.Assistant,
                                """[{"normalizedKey":"oil","section":"Pantry","confidence":1},{"normalizedKey":"photo oil","section":"Pantry","confidence":1},{"normalizedKey":"pasta","section":"Pantry","confidence":1},{"normalizedKey":"photo pasta","section":"Pantry","confidence":1},{"normalizedKey":"sauce","section":"Pantry","confidence":1}]"""));
                        Assert.Contains("recipe facts categorization assistant", prompt);
                        return new ChatResponse(new ChatMessage(ChatRole.Assistant,
                            """{"cuisineType":"Italian","mealTypes":["Lunch","Supper"],"primaryMealType":"Lunch","isVegetarian":true}"""));
                    });
                await new CategorizeIngredientsProcessor(clock, db, categoryChat.Object,
                    NullLogger<CategorizeIngredientsProcessor>.Instance).ExecuteAsync(
                        intake.Tasks.Single(x => x.ProcessorName == "CategorizeIngredients"), default);
                await ActivatorUtilities.CreateInstance<CategorizeRecipeProcessor>(services, categoryChat.Object)
                    .ExecuteAsync(intake.Tasks.Single(x => x.ProcessorName == "CategorizeRecipe"), default);
                var classified = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipeId);
                Assert.Equal("Lunch", classified.Category);
                Assert.Equal("Italian", classified.CuisineType);
                Assert.Equal(new[] { "Lunch", "Supper" }, classified.MealTypes);
                Assert.True(classified.IsVegetarian);
            }
            var member = (await db.FamilyMembers.FirstAsync()).Id;
            var id = await service.CaptureUrl(new() { Url = "https://example.test/live-pasta" }, member);
            db.ChangeTracker.Clear();
            var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == "url-import");
            await Web(store, new SourceHandler(() => { })).ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "FetchUrlContent"), default);
            var extracted = """
                {"name":"Pasta","recipeYield":"4 servings","recipeIngredient":["200 g pasta","100 ml sauce"],"supply":[{"name":"pasta","requiredQuantity":{"value":200,"unitText":"g"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Add all 200 g pasta."},{"text":"Simmer 20 minutes at 180 °C."}]}
                """;
            if (fractionUse) extracted = extracted.Replace("Add all 200 g pasta.", "Add half of the pasta (100 g).", StringComparison.Ordinal);
            if (multipleUse) extracted = MultipleAbsoluteSource;
            if (remainderUse) extracted = RemainderUseSource;
            if (absoluteUse) extracted = extracted.Replace("Add all 200 g pasta.", "Add 50 g pasta.", StringComparison.Ordinal);
            var chat = new Mock<IChatClient>();
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, extracted)));
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
            await new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe")
                .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe"), default);
            var hero = workflow.Tasks.Single(x => x.ProcessorName == "GenerateHero");
            await store.PublishAsync(await store.CaptureForTaskAsync(hero, id),
                new(null, await repository.GetInfoAsync(id, default),
                    "GenerateHero\n" + JsonSerializer.Serialize(JsonDocument.Parse(hero.Payload).RootElement),
                    new Dictionary<string, byte[]?> { ["hero.webp"] = [1, 2, 3] }, SourceKind: "hero"), hero.TaskId);
            await new SyncRecipeProcessor(clock, db, repository,
                services.GetRequiredService<SupperProjectionInvalidation>(), Mock.Of<ISupperProjectionPublisher>(),
                NullLogger<SyncRecipeProcessor>.Instance).ExecuteAsync(
                    workflow.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
            await CategorizeFreshAsync(workflow, id);
            await new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance,
                Mock.Of<IScheduleEventPublisher>(), store).ExecuteAsync(
                    workflow.Tasks.Single(x => x.ProcessorName == "RecipeReady"), default);
            Assert.True((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).IsReady);
            (await db.CalendarEvents.SingleAsync(x => x.Date == monday && x.MealSlot == 0)).RecipeId = id;
            db.SupperServings.Add(new SupperServing { Date = monday, OverrideServings = absoluteUse || fractionUse ? 6 : 8 });
            var second = new FamilyMember { Id = Guid.NewGuid(), Name = "Second shopper" };
            db.FamilyMembers.Add(second);
            await db.SaveChangesAsync();
            await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);

            var reviewId = await service.CaptureUrl(new() { Url = "https://example.test/reviewed-pasta" }, member);
            db.ChangeTracker.Clear();
            var reviewWorkflow = (await db.WorkflowInstances.Include(x => x.Tasks)
                .Where(x => x.WorkflowId == "url-import").ToListAsync())
                .Single(x => x.Tasks.Any(t => t.Payload != null && t.Payload.Contains(reviewId.ToString(), StringComparison.Ordinal)));
            await Web(store, new SourceHandler(() => { })).ExecuteAsync(
                reviewWorkflow.Tasks.Single(x => x.ProcessorName == "FetchUrlContent"), default);
            const string unsafeSource = """
                {"name":"Reviewed Pasta","recipeYield":"4 servings","recipeIngredient":["200 g pasta, diced","100 ml sauce"],"supply":[{"name":"pasta","requiredQuantity":{"value":200,"unitText":"g"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Cook the pasta."}]}
                """;
            var reviewChat = new Mock<IChatClient>();
            reviewChat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, unsafeSource)));
            var reviewAgent = new RecipeAgent(reviewChat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
            var reviewExtract = reviewWorkflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            var reviewFailure = await Assert.ThrowsAsync<RecipeContentReviewException>(() => reviewAgent.ExecuteAsync(reviewExtract, default));
            reviewWorkflow.Status = WorkflowStatus.Failed;
            reviewExtract.Status = RecipeApi.Models.TaskStatus.Failed;
            await db.SaveChangesAsync();
            var reports = new RecipeImportReportService(clock, db, orchestrator);
            await reports.MarkFailedAsync(reviewId, reviewWorkflow.Id, reviewExtract.TaskName,
                "Unsafe source wording", reviewFailure.Reasons);
            Assert.False((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == reviewId)).IsReady);
            finishReview = async importId =>
            {
                db.ChangeTracker.Clear();
                var repair = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == importId);
                Assert.True(repair.Tasks.Any(task => task.ProcessorName == "FetchUrlContent"),
                    $"Repair {importId} is {repair.Status} with tasks: {string.Join(", ", repair.Tasks.Select(task => task.ProcessorName))}");
                await Web(store, new SourceHandler(() => { })).ExecuteAsync(
                    repair.Tasks.Single(x => x.ProcessorName == "FetchUrlContent"), default);
                await reviewAgent.ExecuteAsync(repair.Tasks.Single(x => x.ProcessorName == "ExtractRecipe"), default);
                var hero = repair.Tasks.Single(x => x.ProcessorName == "GenerateHero");
                await store.PublishAsync(await store.CaptureForTaskAsync(hero, reviewId),
                    new(null, await repository.GetInfoAsync(reviewId, default),
                        "GenerateHero\n" + JsonSerializer.Serialize(JsonDocument.Parse(hero.Payload!).RootElement),
                        new Dictionary<string, byte[]?> { ["hero.webp"] = [4, 5, 6] }, SourceKind: "hero"), hero.TaskId);
                await new SyncRecipeProcessor(clock, db, repository,
                    services.GetRequiredService<SupperProjectionInvalidation>(), Mock.Of<ISupperProjectionPublisher>(),
                    NullLogger<SyncRecipeProcessor>.Instance).ExecuteAsync(
                        repair.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
                await new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance,
                    Mock.Of<IScheduleEventPublisher>(), store).ExecuteAsync(
                        repair.Tasks.Single(x => x.ProcessorName == "RecipeReady"), default);
                await new CompleteRecipeImportReportProcessor(reports).ExecuteAsync(
                    repair.Tasks.Single(x => x.ProcessorName == "CompleteRecipeImportReport"), default);
                var eventForReview = await db.CalendarEvents.SingleAsync(x => x.Date == reviewMonday && x.MealSlot == 0);
                eventForReview.RecipeId = reviewId;
                db.SupperServings.Add(new SupperServing { Date = reviewMonday, OverrideServings = 8 });
                await db.SaveChangesAsync();
                await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(reviewMonday, default);
            };

            await storage.SaveAsync("workflows", "recipe-import.yaml", await File.ReadAllTextAsync(
                Path.Combine(browserRoot, "api", "src", "RecipeApi", "Workflows", "recipe-import.yaml")));
            var photoId = await service.CreateRecipe(member, new FormFileCollection { Upload() }, new());
            db.ChangeTracker.Clear();
            var photoWorkflow = (await db.WorkflowInstances.Include(x => x.Tasks)
                .Where(x => x.WorkflowId == "recipe-import").ToListAsync()).Single();
            var photoSource = """
                {"name":"Photo Pasta","recipeYield":"4 servings","recipeIngredient":["200 g photo pasta","100 ml sauce"],"supply":[{"name":"photo pasta","requiredQuantity":{"value":200,"unitText":"g"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Cook the photo pasta."}]}
                """;
            if (fractionUse) photoSource = photoSource.Replace("Cook the photo pasta.", "Add half of the photo pasta (100 g).", StringComparison.Ordinal);
            if (multipleUse) photoSource = MultipleAbsoluteSource.Replace("Oil", "Photo Oil", StringComparison.Ordinal)
                .Replace("oil", "photo oil", StringComparison.Ordinal);
            if (remainderUse) photoSource = RemainderUseSource.Replace("Oil", "Photo Oil", StringComparison.Ordinal)
                .Replace("oil", "photo oil", StringComparison.Ordinal);
            if (absoluteUse) photoSource = photoSource.Replace("Cook the photo pasta.", "Add 50 g photo pasta.", StringComparison.Ordinal);
            var photoChat = new Mock<IChatClient>();
            photoChat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, photoSource)));
            await new RecipeAgent(photoChat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe")
                .ExecuteAsync(photoWorkflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe"), default);
            var photoHero = photoWorkflow.Tasks.Single(x => x.ProcessorName == "GenerateHero");
            await store.PublishAsync(await store.CaptureForTaskAsync(photoHero, photoId),
                new(null, await repository.GetInfoAsync(photoId, default),
                    "GenerateHero\n" + JsonSerializer.Serialize(JsonDocument.Parse(photoHero.Payload!).RootElement),
                    new Dictionary<string, byte[]?> { ["hero.webp"] = [7, 8, 9] }, SourceKind: "hero"), photoHero.TaskId);
            await new SyncRecipeProcessor(clock, db, repository,
                services.GetRequiredService<SupperProjectionInvalidation>(), Mock.Of<ISupperProjectionPublisher>(),
                NullLogger<SyncRecipeProcessor>.Instance).ExecuteAsync(
                    photoWorkflow.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
            await CategorizeFreshAsync(photoWorkflow, photoId);
            await new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance,
                Mock.Of<IScheduleEventPublisher>(), store).ExecuteAsync(
                    photoWorkflow.Tasks.Single(x => x.ProcessorName == "RecipeReady"), default);
            Assert.True((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == photoId)).IsReady);
            Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(photoId, 0, default));
            (await db.CalendarEvents.SingleAsync(x => x.Date == photoDate && x.MealSlot == 0)).RecipeId = photoId;
            db.SupperServings.Add(new SupperServing { Date = photoDate, OverrideServings = absoluteUse || fractionUse ? 6 : 8 });
            await db.SaveChangesAsync();
            await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(photoMonday, default);

            ProcessStartInfo Command(params string[] args)
            {
                var start = new ProcessStartInfo("node")
                {
                    WorkingDirectory = Path.Combine(browserRoot, "pwa"),
                    RedirectStandardOutput = true, RedirectStandardError = true
                };
                foreach (var arg in args) start.ArgumentList.Add(arg);
                foreach (var key in new[] { "CI", "WFS_E2E_SUITE", "PORT" }) start.Environment.Remove(key);
                start.Environment["BASE_URL"] = factory.HttpAddress;
                start.Environment["API_INTERNAL_URL"] = factory.HttpAddress;
                start.Environment["NEXT_PUBLIC_API_BASE_URL"] = "";
                start.Environment["NEXT_PUBLIC_ENVIRONMENT"] = "test";
                start.Environment["NEXT_TELEMETRY_DISABLED"] = "1";
                start.Environment["HEARTH_SECRET"] = TestWebApplicationFactory.TestSecret;
                start.Environment["FRESH_REMAINDER_USE"] = remainderUse ? "1" : "0";
                start.Environment["FRESH_FRACTION_USE"] = fractionUse ? "1" : "0";
                start.Environment["FRESH_ABSOLUTE_USE"] = absoluteUse ? "1" : "0";
                start.Environment["FRESH_MULTIPLE_ABSOLUTE_USE"] = multipleUse ? "1" : "0";
                start.Environment["FRESH_URL_RECIPE_ID"] = id.ToString();
                start.Environment["FRESH_PHOTO_RECIPE_ID"] = photoId.ToString();
                start.Environment["REVIEW_URL_RECIPE_ID"] = reviewId.ToString();
                start.Environment["FRESH_URL_MEMBERS"] = $"{member},{second.Id}";
                start.Environment["PLAYWRIGHT_JSON_OUTPUT_NAME"] = Path.Combine(evidence, "browser-results.json");
                return start;
            }
            using var server = Process.Start(Command("node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", pwaPort.ToString()))!;
            var stdout = PumpFresh(server.StandardOutput, Path.Combine(evidence, "server.log"));
            var stderr = PumpFresh(server.StandardError, Path.Combine(evidence, "server-error.log"));
            try
            {
                using var probe = new HttpClient();
                var ready = false;
                for (var attempt = 0; attempt < 100; attempt++)
                {
                    try { ready = (await probe.GetAsync(pwaUrl + "/welcome")).IsSuccessStatusCode; }
                    catch (HttpRequestException) { }
                    if (ready || server.HasExited) break;
                    await Task.Delay(300);
                }
                Assert.True(ready, "Owned production PWA did not become ready.");
                using var browser = Process.Start(Command("node_modules/@playwright/test/cli.js", "test", "fresh-url-live.spec.ts",
                    "--workers=1", "--retries=0", "--reporter=line,json", "--output", Path.Combine(evidence, "browser-artifacts")))!;
                var browserOut = PumpFresh(browser.StandardOutput, Path.Combine(evidence, "browser.log"));
                var browserErr = PumpFresh(browser.StandardError, Path.Combine(evidence, "browser-error.log"));
                try
                {
                    await browser.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(4));
                    await Task.WhenAll(browserOut, browserErr);
                    Assert.Equal(0, browser.ExitCode);
                }
                finally { await StopFresh(browser); }
                var final = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                Assert.Equal("https://example.test/live-pasta", final.SourceUrl);
                Assert.Equal(multipleUse || remainderUse ? "3" : "250", CanonicalRecipeContentStore.Read(final)!.IngredientLines[0].AmountText);
                var reviewed = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == reviewId);
                Assert.True(reviewed.IsReady);
                Assert.Equal("https://example.test/reviewed-pasta", reviewed.SourceUrl);
                Assert.Equal("250", CanonicalRecipeContentStore.Read(reviewed)!.IngredientLines[0].AmountText);
                var photo = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == photoId);
                Assert.True(photo.IsReady);
                Assert.Null(photo.SourceUrl);
                Assert.Equal(multipleUse || remainderUse ? "3" : "250", CanonicalRecipeContentStore.Read(photo)!.IngredientLines[0].AmountText);
                Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(photoId, 0, default));
                Assert.Equal(RecipeImportReportStatus.ReadyToReview,
                    (await db.RecipeImportReports.AsNoTracking().SingleAsync(x => x.RecipeId == reviewId)).Status);
                await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new
                { final.Id, final.SourceUrl, final.CanonicalContent, final.Ingredients }));
            }
            finally
            {
                await StopFresh(server);
                await Task.WhenAll(stdout, stderr);
            }
        });
    }

    private static async Task PumpFresh(StreamReader reader, string path)
    {
        await using var log = new StreamWriter(path) { AutoFlush = true };
        while (await reader.ReadLineAsync() is { } line) await log.WriteLineAsync(line);
    }

    private static async Task StopFresh(Process process)
    {
        if (process.HasExited) return;
        using var terminate = Process.Start(new ProcessStartInfo("kill") { ArgumentList = { "-TERM", process.Id.ToString() } });
        if (terminate is not null) await terminate.WaitForExitAsync();
        try { await process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(15)); }
        catch (TimeoutException) { process.Kill(true); await process.WaitForExitAsync(); }
    }
}
