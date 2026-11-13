using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public async Task LiveBrowser_FreshPdfCanonicalGroceries()
    {
        foreach (var locale in new[] { "en", "fr" })
            await RunFreshPdfBrowserAsync(locale);
    }

    private async Task RunFreshPdfBrowserAsync(string locale)
    {
        var browserRoot = Environment.GetEnvironmentVariable("WFS_CANONICAL_BROWSER_ROOT")
            ?? throw new InvalidOperationException("Requires an isolated production-built PWA copy.");
        var evidenceRoot = Environment.GetEnvironmentVariable("WFS_CANONICAL_EVIDENCE")
            ?? throw new InvalidOperationException("Requires a unique evidence directory.");
        Assert.True(File.Exists(Path.Combine(browserRoot, "pwa", ".next", "BUILD_ID")));
        var evidence = Path.Combine(evidenceRoot, "fresh-pdf", locale);
        Assert.False(Directory.Exists(evidence), "PDF browser evidence must be a fresh directory.");
        Directory.CreateDirectory(evidence);
        var fixture = Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi.Tests/Fixtures/canonical-pasta-bilingual.pdf");
        _ = PdfWorkerFixture();
        var pwaPort = DeploymentCalendarPostgresTests.FreePort();
        var pwaUrl = $"http://127.0.0.1:{pwaPort}";
        var title = $"fresh PDF {locale} uses native conversion, guarded editing and grocery refresh";
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            using var provider = new PdfWorkerProvider(holdExternalResponses: false);
            TestWebApplicationFactory? ownedFactory = null;
            await using var factory = await CreatePdfWorkerFactoryAsync(settings.ConnectionString, provider,
                "http://127.0.0.1:0", app =>
                {
                    app.MapGet("/_test/pdf/producer-settled", (HttpContext context, RecipeDbContext db) =>
                        PdfProducerSettledReadAsync(context, db, ownedFactory))
                        .ExcludeFromDescription().RequireAuthorization();
                    app.MapGet("/_test/pdf/grocery-control", (HttpContext context, RecipeDbContext db) =>
                        PdfGroceryControlReadAsync(context, db, ownedFactory))
                        .ExcludeFromDescription().RequireAuthorization();
                    app.MapFallback("{**path}", async context =>
                    {
                        // This bridge is navigation/static reads only. Product writes
                        // must match their actual controller before reaching fallback.
                        if (context.Request.Method is not ("GET" or "HEAD"))
                        { context.Response.StatusCode = StatusCodes.Status405MethodNotAllowed; return; }
                        if (context.Request.Path.StartsWithSegments("/api") || context.Request.Path.StartsWithSegments("/_test"))
                        { context.Response.StatusCode = StatusCodes.Status404NotFound; return; }
                        using var gateway = new HttpClient();
                        using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method),
                            pwaUrl + context.Request.Path + context.Request.QueryString);
                        foreach (var header in context.Request.Headers)
                            if (!string.Equals(header.Key, "Host", StringComparison.OrdinalIgnoreCase))
                                request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                        try
                        {
                            using var response = await gateway.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, context.RequestAborted);
                            context.Response.StatusCode = (int)response.StatusCode;
                            foreach (var header in response.Headers.Concat(response.Content.Headers))
                                context.Response.Headers[header.Key] = header.Value.ToArray();
                            context.Response.Headers.Remove("transfer-encoding");
                            await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                        }
                        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
                    });
                });
            ownedFactory = factory;
            ProcessStartInfo Command(params string[] args)
            {
                var start = new ProcessStartInfo("node")
                {
                    WorkingDirectory = Path.Combine(browserRoot, "pwa"), RedirectStandardOutput = true, RedirectStandardError = true
                };
                foreach (var arg in args) start.ArgumentList.Add(arg);
                foreach (var key in new[] { "CI", "WFS_E2E_SUITE", "PORT" }) start.Environment.Remove(key);
                start.Environment["BASE_URL"] = factory.HttpAddress;
                start.Environment["API_INTERNAL_URL"] = factory.HttpAddress;
                start.Environment["NEXT_PUBLIC_API_BASE_URL"] = "";
                start.Environment["NEXT_PUBLIC_ENVIRONMENT"] = "test";
                start.Environment["NEXT_TELEMETRY_DISABLED"] = "1";
                start.Environment["HEARTH_SECRET"] = TestWebApplicationFactory.TestSecret;
                start.Environment["CANONICAL_PDF_LOCALE"] = locale;
                start.Environment["CANONICAL_PDF_FIXTURE"] = fixture;
                start.Environment["CANONICAL_PDF_EVIDENCE"] = evidence;
                start.Environment["CANONICAL_MEMBERS"] = factory.DefaultFamilyMemberId.ToString();
                start.Environment["PLAYWRIGHT_JSON_OUTPUT_NAME"] = Path.Combine(evidence, "browser-results.json");
                return start;
            }
            using var server = Process.Start(Command("node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", pwaPort.ToString()))!;
            var serverOut = PumpFresh(server.StandardOutput, Path.Combine(evidence, "server.log"));
            var serverErr = PumpFresh(server.StandardError, Path.Combine(evidence, "server-error.log"));
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
                using var browser = Process.Start(Command("node_modules/@playwright/test/cli.js", "test", "canonical-pdf-live.spec.ts",
                    "--workers=1", "--retries=0", "--reporter=line,json",
                    "--output", Path.Combine(evidence, "browser-artifacts")))!;
                var browserOut = PumpFresh(browser.StandardOutput, Path.Combine(evidence, "browser.log"));
                var browserErr = PumpFresh(browser.StandardError, Path.Combine(evidence, "browser-error.log"));
                try
                {
                    await browser.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(4));
                    await Task.WhenAll(browserOut, browserErr);
                    Assert.Equal(0, browser.ExitCode);
                }
                finally { await StopFresh(browser); }
                AssertPdfBrowserReport(Path.Combine(evidence, "browser-results.json"), title);
                using var receipt = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(evidence, "browser-receipt.json")));
                Assert.Equal(locale, receipt.RootElement.GetProperty("locale").GetString());
                var id = receipt.RootElement.GetProperty("id").GetGuid();
                Assert.Equal(1, receipt.RootElement.GetProperty("captureRequests").GetInt32());
                Assert.Equal(id, receipt.RootElement.GetProperty("accepted").GetProperty("data").GetProperty("id").GetGuid());
                await WaitPdfWorkerAsync(factory, db => db.WorkflowInstances.AllAsync(x => x.Status == WorkflowStatus.Completed),
                    "all actual PDF browser root/child/refresh work");
                await AssertPdfBrowserPersistenceAsync(factory, provider, id, receipt.RootElement);
                await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new
                {
                    locale, id, proof = await ReadPdfWorkerProofAsync(factory, id), runtime = PdfWorkerRuntimeIdentity(), externalCalls = provider.Calls
                }, JsonDefaults.CamelCase));
            }
            finally
            {
                await StopFresh(server);
                await Task.WhenAll(serverOut, serverErr);
            }
        });
    }

    private static bool PdfObservationRead(HttpContext context) => context.Request.Method == "GET"
        && !context.Request.QueryString.HasValue && context.Request.ContentLength is not > 0;

    private static async Task<IResult> PdfProducerSettledReadAsync(HttpContext context, RecipeDbContext db, TestWebApplicationFactory? factory)
    {
        if (!PdfObservationRead(context)) return Results.BadRequest();
        if (factory is null) return Results.Conflict();
        var recipes = await db.Recipes.AsNoTracking().Select(x => new { x.Id, x.AddedBy }).Take(2).ToArrayAsync();
        if (recipes.Length == 0) return Results.Ok(new { settled = false, failed = false });
        if (recipes.Length != 1 || recipes[0].AddedBy != factory.DefaultFamilyMemberId) return Results.Conflict();
        var id = recipes[0].Id;
        var roots = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).Where(x => x.WorkflowId == "recipe-import").ToArrayAsync();
        if (roots.Length != 1) return Results.Conflict();
        var root = roots[0];
        using var parameters = JsonDocument.Parse(root.Parameters!);
        if (parameters.RootElement.GetProperty("recipeId").GetString() != id.ToString()) return Results.Conflict();
        if (root.Status is WorkflowStatus.Failed or WorkflowStatus.Paused || root.Tasks.Any(x => x.Status == TaskStatus.Failed || x.RetryCount > 0))
            return Results.Ok(new { settled = false, failed = true });
        if (root.Status != WorkflowStatus.Completed) return Results.Ok(new { settled = false, failed = false });
        var queue = root.Tasks.Single(x => x.ProcessorName == "QueueRecipeSearchIndex");
        var childCommand = await db.WorkflowChildIntents.AsNoTracking().SingleOrDefaultAsync(x => x.ParentTaskId == queue.TaskId);
        if (childCommand?.AcceptedAt is null || queue.ChildLaunchIntentId != childCommand.Id) return Results.Conflict();
        using var queued = JsonDocument.Parse(queue.Result!);
        var childId = queued.RootElement.GetProperty("workflowInstanceId").GetGuid();
        if (childId != childCommand.Id) return Results.Conflict();
        var child = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleAsync(x => x.Id == childId);
        using var childParameters = JsonDocument.Parse(child.Parameters!);
        if (child.WorkflowId != "index-recipe-search" || childParameters.RootElement.GetProperty("recipeId").GetString() != id.ToString())
            return Results.Conflict();
        if (child.Status is WorkflowStatus.Failed or WorkflowStatus.Paused || child.Tasks.Any(x => x.Status == TaskStatus.Failed || x.RetryCount > 0))
            return Results.Ok(new { settled = false, failed = true });
        var tasks = root.Tasks.Concat(child.Tasks).ToArray();
        if (child.Status != WorkflowStatus.Completed || tasks.Any(x => x.Status != TaskStatus.Completed))
            return Results.Ok(new { settled = false, failed = false });
        var taskIds = tasks.Select(x => x.TaskId).ToArray();
        var attempts = await db.WorkflowProcessorAttempts.AsNoTracking().Where(x => taskIds.Contains(x.TaskId)).ToArrayAsync();
        if (attempts.Length != tasks.Length || attempts.Any(x => x.ObservedAt is null || x.Outcome is null))
            return Results.Ok(new { settled = false, failed = false });
        foreach (var task in tasks) ValidatePdfWorkerHistory(Assert.Single(attempts, attempt => attempt.TaskId == task.TaskId));
        var index = await db.RecipeSearchDocuments.AsNoTracking().SingleAsync(x => x.RecipeId == id);
        return Results.Ok(new { settled = index.IndexStatus == "ready" && index.EmbeddingStatus == "ready",
            failed = index.IndexStatus != "ready" || index.EmbeddingStatus != "ready" });
    }

    private static async Task<IResult> PdfGroceryControlReadAsync(HttpContext context, RecipeDbContext db, TestWebApplicationFactory? factory)
    {
        if (!PdfObservationRead(context)) return Results.BadRequest();
        if (factory is null) return Results.Conflict();
        var recipes = await db.Recipes.AsNoTracking().Select(x => new { x.Id, x.AddedBy, x.IsReady }).Take(2).ToArrayAsync();
        if (recipes.Length != 1 || recipes[0].AddedBy != factory.DefaultFamilyMemberId || !recipes[0].IsReady) return Results.Conflict();
        var monday = new DateOnly(2026, 10, 12);
        var plan = await db.WeeklyPlans.AsNoTracking().SingleOrDefaultAsync(x => x.WeekStartDate == monday);
        if (plan?.ServingInputVersion is null || plan.ServingInputVersion != plan.ServingAppliedVersion) return Results.Conflict();
        var rows = JsonSerializer.Deserialize<GroceryLineItemDto[]>(plan.GroceryItems)!;
        var sauces = rows.Where(x => x.NormalizedKey == "sauce").ToArray();
        if (sauces.Length != 1 || !sauces[0].RecipeIds.SequenceEqual(new[] { recipes[0].Id })) return Results.Conflict();
        return Results.Text(await PdfWorkerSauceControlAsync(factory, monday), "application/json");
    }

    private static void AssertPdfBrowserReport(string path, string title)
    {
        using var report = JsonDocument.Parse(File.ReadAllText(path));
        var specs = new List<JsonElement>();
        void Visit(JsonElement node)
        {
            if (node.ValueKind == JsonValueKind.Object)
            {
                if (node.TryGetProperty("title", out _) && node.TryGetProperty("tests", out var tests) && tests.ValueKind == JsonValueKind.Array)
                    specs.Add(node.Clone());
                foreach (var property in node.EnumerateObject()) Visit(property.Value);
            }
            else if (node.ValueKind == JsonValueKind.Array) foreach (var item in node.EnumerateArray()) Visit(item);
        }
        Visit(report.RootElement);
        var spec = Assert.Single(specs);
        Assert.Equal(title, spec.GetProperty("title").GetString());
        var test = Assert.Single(spec.GetProperty("tests").EnumerateArray());
        var result = Assert.Single(test.GetProperty("results").EnumerateArray());
        Assert.Equal("passed", result.GetProperty("status").GetString());
        Assert.Equal(0, result.GetProperty("retry").GetInt32());
        var stats = report.RootElement.GetProperty("stats");
        Assert.Equal(1, stats.GetProperty("expected").GetInt32());
        foreach (var name in new[] { "unexpected", "flaky", "skipped" }) Assert.Equal(0, stats.GetProperty(name).GetInt32());
    }

    private static async Task AssertPdfBrowserPersistenceAsync(TestWebApplicationFactory factory, PdfWorkerProvider provider, Guid id, JsonElement receipt)
    {
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var recipe = Assert.Single(await db.Recipes.AsNoTracking().ToArrayAsync());
        Assert.Equal(id, recipe.Id);
        Assert.Equal(factory.DefaultFamilyMemberId, recipe.AddedBy);
        Assert.Null(recipe.SourceUrl);
        Assert.True(recipe.IsReady);
        Assert.Equal(4, recipe.Servings);
        Assert.Equal(RecipeRating.Like, recipe.Rating);
        Assert.Equal("Keep this public PDF source.", recipe.Notes);
        Assert.Equal(-1, recipe.FinishedDishIndex);
        var content = CanonicalRecipeContentStore.Read(recipe)!;
        var initial = receipt.GetProperty("initial");
        var initialLines = initial.GetProperty("ingredientLines");
        Assert.Equal(3, content.IngredientLines.Count);
        Assert.Equal(initialLines.EnumerateArray().Select(x => x.GetProperty("id").GetGuid()), content.IngredientLines.Select(x => x.Id));
        var sourceRevision = initialLines[0].GetProperty("provenance").GetProperty("sourceRef").GetString();
        Assert.False(string.IsNullOrWhiteSpace(sourceRevision));
        Assert.Equal(sourceRevision, content.SourceRevision);
        foreach (var line in initialLines.EnumerateArray())
        {
            Assert.Equal(sourceRevision, line.GetProperty("provenance").GetProperty("sourceRef").GetString());
            Assert.Equal("source", line.GetProperty("provenance").GetProperty("origin").GetString());
        }
        Assert.Null(content.IngredientLines[0].Amount);
        Assert.Null(content.IngredientLines[0].AmountText);
        Assert.Equal(new RecipeUnitDto("g", null), content.IngredientLines[0].Unit);
        Assert.Equal("human", content.IngredientLines[0].Provenance.Origin);
        Assert.Contains("amount", content.IngredientLines[0].Provenance.ProtectedFields);
        AssertPdfJsonEqual(receipt.GetProperty("final").GetProperty("ingredientLines"), JsonSerializer.SerializeToElement(content.IngredientLines, JsonDefaults.CamelCase));
        for (var index = 1; index < 3; index++)
            AssertPdfJsonEqual(initialLines[index], JsonSerializer.SerializeToElement(content.IngredientLines[index], JsonDefaults.CamelCase));
        AssertPdfJsonEqual(initial.GetProperty("instructionSections"), JsonSerializer.SerializeToElement(content.InstructionSections, JsonDefaults.CamelCase));
        Assert.All(content.InstructionSections.SelectMany(x => x.Steps), step => Assert.Empty(step.Bindings));
        using var raw = JsonDocument.Parse(recipe.RawMetadata!);
        Assert.Equal(new[] { "200 g pasta", "100 ml sauce", "salt to taste" }, raw.RootElement.GetProperty("recipeIngredient").EnumerateArray().Select(x => x.GetString()));
        Assert.Equal(200, raw.RootElement.GetProperty("supply")[0].GetProperty("requiredQuantity").GetProperty("value").GetInt32());
        var files = (await services.GetRequiredService<RecipeFilePublicationStore>().CaptureAsync(id)).Files;
        Assert.Equal(PdfWorkerFixtureHash, PdfWorkerHash(files["original/source.pdf"]!));
        var pages = receipt.GetProperty("originalPages");
        Assert.Equal(2, pages.GetArrayLength());
        var pageHashes = new List<string>();
        for (var index = 0; index < 2; index++)
        {
            var bytes = files[$"original/{index}.png"]!;
            Assert.Equal(index, pages[index].GetProperty("index").GetInt32());
            Assert.Equal(bytes.Length, pages[index].GetProperty("bytes").GetInt32());
            Assert.Equal(PdfWorkerHash(bytes), pages[index].GetProperty("sha256").GetString());
            pageHashes.Add(PdfWorkerHash(bytes));
        }
        Assert.NotEqual(pageHashes[0], pageHashes[1]);
        Assert.Equal(pageHashes, provider.ExtractionPageHashes);
        using var control = JsonDocument.Parse(await PdfWorkerSauceControlAsync(factory, new(2026, 10, 12)));
        foreach (var name in new[] { "sauceControlBefore", "sauceControlAfterSave", "sauceControlAfterClear" })
            AssertPdfJsonEqual(control.RootElement, receipt.GetProperty(name));
        var monday = new DateOnly(2026, 10, 12);
        var occurrence = await db.CalendarEvents.AsNoTracking().SingleAsync(x => x.Date == monday && x.MealSlot == 0 && x.RecipeId == id);
        Assert.Equal(8, (await db.SupperServings.AsNoTracking().SingleAsync(x => x.Date == monday)).OverrideServings);
        Assert.Equal(occurrence.Id, receipt.GetProperty("dated").GetProperty("occurrenceId").GetGuid());
        Assert.Equal("assigned", receipt.GetProperty("dated").GetProperty("context").GetString());
        Assert.Equal(id, receipt.GetProperty("dated").GetProperty("recipeId").GetGuid());
        Assert.Equal(4, receipt.GetProperty("dated").GetProperty("baseServings").GetInt32());
        Assert.Equal(8, receipt.GetProperty("dated").GetProperty("targetServings").GetInt32());
        Assert.Equal(receipt.GetProperty("saved").GetProperty("contentRevision").GetString(),
            receipt.GetProperty("dated").GetProperty("contentRevision").GetString());
        var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
        Assert.Equal(plan.ServingInputVersion, plan.ServingAppliedVersion);
        var pasta = Assert.Single(JsonSerializer.Deserialize<GroceryLineItemDto[]>(plan.GroceryItems)!, x => x.NormalizedKey == "pasta");
        Assert.Null(pasta.ExactQuantity);
        Assert.Equal(id, Assert.Single(pasta.RecipeIds));
        using var checks = JsonDocument.Parse(plan.GroceryState);
        Assert.False(checks.RootElement.GetProperty(pasta.RowId).GetBoolean());
        var operations = (await db.CanonicalRecipeOperations.AsNoTracking().Where(x => x.RecipeId == id).ToArrayAsync())
            .Select(operation => JsonSerializer.Deserialize<CanonicalRecipeWriteResult>(operation.Result, JsonDefaults.CamelCase)!).ToArray();
        Assert.Equal(2, operations.Length);
        var saved = Assert.Single(operations, operation => operation.Content.ContentRevision ==
            receipt.GetProperty("saved").GetProperty("contentRevision").GetString());
        Assert.Equal(LegacyGroceryQuantity.Parse("250"), saved.Content.IngredientLines[0].Amount);
        Assert.Equal(content.SourceRevision, saved.Content.SourceRevision);
        var cleared = Assert.Single(operations, operation => operation.Content.ContentRevision == content.ContentRevision);
        Assert.Null(cleared.Content.IngredientLines[0].Amount);
        foreach (var kind in new[] { "extract", "description", "hero", "ingredient-category", "recipe-category", "embedding" })
            Assert.Equal(1, provider.Calls[kind]);
        Assert.Empty(provider.Unexpected);
        _ = await ReadPdfWorkerProofAsync(factory, id); // Actual root/child/attempt/category receipts, never just IsReady.
    }

    private static void AssertPdfJsonEqual(JsonElement expected, JsonElement actual) =>
        Assert.True(JsonNode.DeepEquals(JsonNode.Parse(expected.GetRawText()), JsonNode.Parse(actual.GetRawText())), "PDF browser observation differs from actual persisted facts.");
}
