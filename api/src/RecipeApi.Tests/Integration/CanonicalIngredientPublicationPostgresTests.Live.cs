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
    public async Task LiveBrowser_FreshUrlCanonicalGroceries()
    {
        var browserRoot = Environment.GetEnvironmentVariable("WFS_CANONICAL_BROWSER_ROOT")
            ?? throw new InvalidOperationException("Requires an isolated production-built PWA copy.");
        var evidenceRoot = Environment.GetEnvironmentVariable("WFS_CANONICAL_EVIDENCE")
            ?? throw new InvalidOperationException("Requires a unique evidence directory.");
        Assert.True(File.Exists(Path.Combine(browserRoot, "pwa", ".next", "BUILD_ID")));
        var evidence = Path.Combine(evidenceRoot, "fresh-url");
        Directory.CreateDirectory(evidence);
        var pwaPort = DeploymentCalendarPostgresTests.FreePort();
        var pwaUrl = $"http://127.0.0.1:{pwaPort}";
        var monday = new DateOnly(2026, 10, 12);
        var reviewMonday = monday.AddDays(7);
        Func<Guid, Task>? finishReview = null;
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
                new DeploymentCalendarIntegrationTests.CalendarClock(), new()
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
            var member = (await db.FamilyMembers.FirstAsync()).Id;
            var id = await service.CaptureUrl(new() { Url = "https://example.test/live-pasta" }, member);
            db.ChangeTracker.Clear();
            var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == "url-import");
            await Web(store, new SourceHandler(() => { })).ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "FetchUrlContent"), default);
            const string extracted = """
                {"name":"Pasta","recipeYield":"4 servings","recipeIngredient":["200 g pasta","100 ml sauce"],"supply":[{"name":"pasta","requiredQuantity":{"value":200,"unitText":"g"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Cook the pasta."}]}
                """;
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
            await new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance,
                Mock.Of<IScheduleEventPublisher>(), store).ExecuteAsync(
                    workflow.Tasks.Single(x => x.ProcessorName == "RecipeReady"), default);
            Assert.True((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).IsReady);
            (await db.CalendarEvents.SingleAsync(x => x.Date == monday && x.MealSlot == 0)).RecipeId = id;
            db.SupperServings.Add(new SupperServing { Date = monday, OverrideServings = 8 });
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
                start.Environment["FRESH_URL_RECIPE_ID"] = id.ToString();
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
                Assert.Equal("250", CanonicalRecipeContentStore.Read(final)!.IngredientLines[0].AmountText);
                var reviewed = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == reviewId);
                Assert.True(reviewed.IsReady);
                Assert.Equal("https://example.test/reviewed-pasta", reviewed.SourceUrl);
                Assert.Equal("250", CanonicalRecipeContentStore.Read(reviewed)!.IngredientLines[0].AmountText);
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
