using System.Diagnostics;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Http;
using System.Net;
using System.Net.Sockets;
using Microsoft.AspNetCore.Builder;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text.Json;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Ai;

namespace RecipeApi.Tests.Integration;

public partial class SupperServingsPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public async Task LiveBrowser_SupperServingsGeneratedClientAndTwoClientUpdates()
    {
        await LiveSupperOriginalJourney();
        await LiveSupperRecoveryJourney();
    }

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_IngredientPreviewReadOnly() => LiveSupperOriginalJourney(previewOnly: true);

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_GrocerySourceTitlesReadOnly() => LiveSupperOriginalJourney(sourceTitlesOnly: true);

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_SettingsUsualPortionsAndMembership() => LiveSupperOriginalJourney(settingsOnly: true);

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_PlannerDateResetCancelAndEqualNumber() => LiveSupperOriginalJourney(resetOnly: true);

    private async Task LiveSupperOriginalJourney(bool previewOnly = false, bool sourceTitlesOnly = false, bool settingsOnly = false, bool resetOnly = false)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            using var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            var port = ((IPEndPoint)listener.LocalEndpoint).Port;
            listener.Stop();
            var counts = new ConcurrentDictionary<string, int>();

            var pwaUrl = $"http://127.0.0.1:{port}";
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
                new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = DateTimeOffset.Parse("2026-10-12T12:00:00Z") }, new() {
                    ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                    ["Tests:HttpUrl"] = "http://127.0.0.1:0",
                }, app => {
                    app.Use(async (context, next) => {
                        if (context.Request.Method != "GET" && context.Request.Path.StartsWithSegments("/api")) counts.AddOrUpdate(context.Request.Method + " " + context.Request.Path, 1, (_, n) => n + 1);
                        if (context.Request.Method == "PUT" && context.Request.Path == "/api/schedule/servings") counts.AddOrUpdate("save", 1, (_, n) => n + 1);
                        await next(context);
                    });
                    app.MapGet("/_test/servings/requests", () => Results.Ok(counts)).RequireAuthorization();
                    app.MapGet("/_test/servings/persisted", async (RecipeDbContext db) => Results.Ok(new {
                        recipes = await db.Recipes.AsNoTracking().Select(x => new { x.Id, x.Name, x.Servings, x.Ingredients, x.RawMetadata }).ToListAsync(),
                        occurrences = await db.CalendarEvents.AsNoTracking().Select(x => new { x.Id, x.Date, x.RecipeId, x.Status, x.VoteCount, x.PreparedOn, x.PreparedAtUtc, x.PreparedServings, x.PreparedOriginalServings, x.PreparationPlanToken, x.PreparationServingVersion }).OrderBy(x => x.Date).ToListAsync(),
                        defaults = await db.FamilySettings.AsNoTracking().Where(x => x.Key == SupperServingsService.DefaultKey).Select(x => new { x.Key, x.Value }).ToListAsync(),
                        rows = await db.SupperServings.AsNoTracking().Select(x => new { x.Date, x.OverrideServings }).ToListAsync(),
                        servingSnapshots = await db.SupperServings.AsNoTracking().OrderBy(x => x.Date).Select(x => new { x.Date, x.OverrideServings, x.InheritedServings, x.Version, x.CreatedAt, x.UpdatedAt }).ToListAsync(),
                        members = await db.FamilyMembers.AsNoTracking().Select(x => new { x.Id, x.Name }).ToListAsync(),
                        tasks = await db.WorkflowTasks.AsNoTracking().Select(x => new { x.TaskId, x.InstanceId, x.ProcessorName, status = x.Status.ToString() }).ToListAsync(),
                        workflows = await db.WorkflowInstances.AsNoTracking().OrderBy(x => x.Id).Select(x => new { x.Id, x.WorkflowId, x.Parameters }).ToListAsync(),
                        plans = await db.WeeklyPlans.AsNoTracking().OrderBy(x => x.WeekStartDate).Select(x => new { x.GroceryItems, x.GroceryState, x.ServingRefreshStatus }).ToListAsync(),
                    })).RequireAuthorization();
                    app.MapPost("/_test/servings/recompute", async (RecipeDbContext db, IEnumerable<RecipeApi.Workflow.IWorkflowProcessor> processors) => {
                        // Preserve the group-one completed-task replay check after a later shopper check.
                        var completed = await db.WorkflowTasks.SingleAsync(x => x.ProcessorName == "RefreshSupperGroceries");
                        await processors.Single(x => x.ProcessorName == completed.ProcessorName).ExecuteAsync(completed, default);
                        return Results.Ok();
                    }).RequireAuthorization();
                    if (sourceTitlesOnly) app.MapPost("/_test/servings/add-grocery-source", async (RecipeDbContext db, GroceryRecomputeService groceries) => {
                        var original = await db.Recipes.AsNoTracking().FirstAsync(x => x.Name == "Original pasta for two");
                        var lunch = new Recipe { Name = "New live lunch source", Servings = 2, Ingredients = original.Ingredients, RawMetadata = original.RawMetadata, IsReady = true };
                        db.Recipes.Add(lunch); db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday.AddDays(1), MealSlot = 1, RecipeId = lunch.Id });
                        await db.SaveChangesAsync();
                        await groceries.RecomputeForWeekAsync(new(2026, 10, 12), default);
                        return Results.Ok(new { recipeId = lunch.Id });
                    }).RequireAuthorization();
                    app.MapPost("/_test/servings/recreate", async (RecipeDbContext db, ISupperProjectionPublisher publisher) => {
                        var old = await db.CalendarEvents.SingleAsync(x => x.Date == Wednesday.AddDays(2));
                        var recipeId = old.RecipeId;
                        db.CalendarEvents.Remove(old); await db.SaveChangesAsync();
                        var replacement = new CalendarEvent { Id = Guid.NewGuid(), Date = Wednesday.AddDays(2), RecipeId = recipeId, Status = CalendarEventStatus.Planned };
                        db.CalendarEvents.Add(replacement); await db.SaveChangesAsync();
                        await publisher.PublishAsync([new DateOnly(2026, 10, 12)]);
                        return Results.Ok(new { oldId = old.Id, newId = replacement.Id });
                    }).RequireAuthorization();
                    // Explicit controlled advancement: the real worker picks up the committed task,
                    // resolves the production-registered processor and owns task/instance completion.
                    app.MapPost("/_test/servings/advance", async (IServiceScopeFactory scopes, IClock clock, ILoggerFactory logs) => {
                        using var worker = new WorkflowWorker(clock, scopes, logs.CreateLogger<WorkflowWorker>(),
                            new AiExceptionHandler(clock, logs.CreateLogger<AiExceptionHandler>()), Options.Create(new WorkflowRetryOptions()));
                        return Results.Ok(new { processed = await worker.ProcessPendingTasksAsync(default) });
                    }).RequireAuthorization();
                    app.MapFallback("{**path}", async context => {
                    try {
                        using var client = new HttpClient();
                        using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), pwaUrl + context.Request.Path + context.Request.QueryString);
                        if (context.Request.ContentLength > 0) request.Content = new StreamContent(context.Request.Body);
                        foreach (var header in context.Request.Headers)
                            if (!string.Equals(header.Key, "Host", StringComparison.OrdinalIgnoreCase)) request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, context.RequestAborted);
                        context.Response.StatusCode = (int)response.StatusCode;
                        foreach (var header in response.Headers.Concat(response.Content.Headers)) context.Response.Headers[header.Key] = header.Value.ToArray();
                        context.Response.Headers.Remove("transfer-encoding");
                        await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                    } catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
                }); });
            Guid recipeId;
            using (var scope = factory.Services.CreateScope()) {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = new Recipe { Name = "Original pasta for two", Servings = 2, Ingredients = "[\"200 g pasta\"]", IsReady = true, SourceUrl = "https://example.test/original-pasta", Notes = "Keep the original pasta instructions.", RawMetadata = "{\"recipeInstructions\":[{\"@type\":\"HowToSection\",\"name\":\"Pasta\",\"itemListElement\":[{\"@type\":\"HowToStep\",\"text\":\"Add 200 g pasta.\"},{\"@type\":\"HowToStep\",\"text\":\"Serve.\"}]}],\"recipeIngredient\":[\"200 g pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"}]}" };
                recipeId = recipe.Id; db.Recipes.Add(recipe);
                var coffeeId = Guid.NewGuid();
                var coffee = GroceryExtraOccurrence.Create(coffeeId, coffeeId, new(2026, 10, 12), "Coffee", "coffee", "Grocery", DateTimeOffset.Parse("2026-10-12T12:00:00Z"));
                coffee.Checked = true; db.GroceryExtraOccurrences.Add(coffee);
                db.Recipes.Add(new Recipe { Name = "Unassigned pasta for two", Servings = 2, Ingredients = recipe.Ingredients, RawMetadata = recipe.RawMetadata, IsReady = true });
                db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id, Status = CalendarEventStatus.Planned, VoteCount = 7 });
                db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), Date = Wednesday.AddDays(2), RecipeId = recipe.Id, Status = CalendarEventStatus.Planned });
                await db.SaveChangesAsync();
                if (resetOnly) {
                    db.FamilySettings.Add(new FamilySetting { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 4 }) });
                    db.SupperServings.AddRange(new SupperServing { Date = Wednesday, OverrideServings = 5 }, new SupperServing { Date = Wednesday.AddDays(2), OverrideServings = 4 });
                    await db.SaveChangesAsync();
                }
                if (settingsOnly) {
                    for (var index = await db.FamilyMembers.CountAsync(); index < 4; index++)
                        db.FamilyMembers.Add(new FamilyMember { Name = $"Settings fixture {index}" });
                    var prepared = await db.CalendarEvents.SingleAsync(x => x.Date == Wednesday.AddDays(2));
                    prepared.Status = CalendarEventStatus.Cooked; prepared.PreparedOn = new(2026, 10, 12);
                    prepared.PreparedAtUtc = DateTimeOffset.Parse("2026-10-12T12:00:00Z");
                    prepared.PreparedServings = 7; prepared.PreparedOriginalServings = 2;
                    prepared.PreparationPlanToken = "settings-prepared-plan"; prepared.PreparationServingVersion = "settings-prepared-version";
                    db.CalendarEvents.AddRange(
                        new CalendarEvent { Date = Wednesday.AddDays(-4), RecipeId = recipe.Id },
                        new CalendarEvent { Date = Wednesday.AddDays(3), RecipeId = recipe.Id });
                    db.SupperServings.AddRange(
                        new SupperServing { Date = Wednesday.AddDays(-4), InheritedServings = null },
                        new SupperServing { Date = Wednesday.AddDays(2), InheritedServings = null },
                        new SupperServing { Date = Wednesday.AddDays(3), OverrideServings = 6, InheritedServings = 4 });
                    await db.SaveChangesAsync();
                }
                if (previewOnly) {
                    db.Recipes.Add(SupperIngredientPreviewPostgresTests.LegacyShells());
                    db.FamilySettings.Add(new FamilySetting { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 5 }) });
                    // The deployment clock is Monday. Home and Cook must both read this
                    // captured occurrence through the real assigned projection contract.
                    db.CalendarEvents.Add(new CalendarEvent { Date = new(2026, 10, 12), RecipeId = recipe.Id, Status = CalendarEventStatus.Planned });
                    db.SupperServings.Add(new SupperServing { Date = new(2026, 10, 12), OverrideServings = 6 });
                    db.SupperServings.Add(new SupperServing { Date = Wednesday.AddDays(2), OverrideServings = 7 });
                    var prepared = await db.CalendarEvents.SingleAsync(x => x.Date == Wednesday.AddDays(2));
                    prepared.Status = CalendarEventStatus.Cooked; prepared.PreparedOn = new(2026, 10, 12);
                    prepared.PreparedAtUtc = DateTimeOffset.Parse("2026-10-12T12:00:00Z");
                    prepared.PreparedServings = 7; prepared.PreparedOriginalServings = 2;
                    prepared.PreparationPlanToken = "fixture-prepared-plan"; prepared.PreparationServingVersion = "fixture-prepared-ingredients";
                    await db.SaveChangesAsync();
                }
                if (sourceTitlesOnly) {
                    var lunch = new Recipe { Name = "Lunch-only source", Servings = 2, Ingredients = recipe.Ingredients, RawMetadata = recipe.RawMetadata, IsReady = true };
                    db.Recipes.Add(lunch); db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, MealSlot = 1, RecipeId = lunch.Id });
                    await db.SaveChangesAsync();
                }
                // Publish the canonical lexical document expected by real library search.
                foreach (var searchable in await db.Recipes.ToListAsync()) {
                    var content = new RecipeSearchDocumentBuilder().Build(searchable);
                    db.RecipeSearchDocuments.Add(new RecipeSearchDocument {
                        RecipeId = searchable.Id, DocumentText = content.DocumentText, SearchMetadata = content.SearchMetadata,
                        IndexStatus = "ready", SourceFingerprint = SearchFingerprintService.ComputeSourceFingerprint(searchable, content),
                        SchemaVersion = content.SchemaVersion, LastIndexedAt = DateTimeOffset.Parse("2026-10-12T12:00:00Z"),
                    });
                }
                await db.SaveChangesAsync();
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12), default);
                var plan = await db.WeeklyPlans.SingleAsync();
                if (sourceTitlesOnly) {
                    var items = JsonSerializer.Deserialize<List<RecipeApi.Dto.GroceryLineItemDto>>(plan.GroceryItems!)!;
                    plan.GroceryItems = JsonSerializer.Serialize(items.Select(item => JsonSerializer.SerializeToElement(item)).Select(item => item.EnumerateObject().ToDictionary(p => p.Name, p => (object?)p.Value)).Select(item => { item["checkReviewReason"] = "prior_amount_unknown"; return item; }));
                    await db.SaveChangesAsync();
                }

            }
            using (var client = factory.CreateAuthenticatedClient())
                await GroceryTestRows.CheckAsync(client, new(2026, 10, 12));

            ProcessStartInfo Command(params string[] args) {
                var process = new ProcessStartInfo("node") { WorkingDirectory = Path.Combine(TomorrowPushPostgresTests.Root(), "pwa"), RedirectStandardOutput = true, RedirectStandardError = true };
                foreach (var arg in args) process.ArgumentList.Add(arg);
                var artifactRoot = Environment.GetEnvironmentVariable("WFS_LIVE_ARTIFACT_ROOT");
                if (artifactRoot is not null) {
                    Directory.CreateDirectory(artifactRoot);
                    process.Environment["PLAYWRIGHT_JSON_OUTPUT_NAME"] = Path.Combine(artifactRoot, "original-browser.json");
                }
                process.Environment["BASE_URL"] = factory.HttpAddress;
                process.Environment["SUPPER_SERVINGS_API_URL"] = factory.HttpAddress;
                process.Environment["API_INTERNAL_URL"] = factory.HttpAddress;
                process.Environment["NEXT_PUBLIC_API_BASE_URL"] = "";
                process.Environment["HEARTH_SECRET"] = TestWebApplicationFactory.TestSecret;
                process.Environment["NEXT_PUBLIC_ENVIRONMENT"] = "test";
                if (settingsOnly) process.Environment["SUPPER_SETTINGS_LIVE"] = "1";
                if (resetOnly) process.Environment["SUPPER_RESET_LIVE"] = "1";
                return process;
            }
            using var server = Process.Start(Command("node_modules/next/dist/bin/next", "dev", "-H", "127.0.0.1", "-p", port.ToString()))!;
            server.OutputDataReceived += (_, e) => { if (e.Data is not null) output.WriteLine(e.Data); };
            server.ErrorDataReceived += (_, e) => { if (e.Data is not null) output.WriteLine(e.Data); };
            server.BeginOutputReadLine(); server.BeginErrorReadLine();
            try {
                using var probe = new HttpClient();
                var ready = false;
                for (var attempt = 0; attempt < 60; attempt++) {
                    try { ready = (await probe.GetAsync(pwaUrl + "/welcome")).IsSuccessStatusCode; } catch (HttpRequestException) { }
                    if (ready || server.HasExited) break;
                    await Task.Delay(500);
                }
                Assert.True(ready, "Task-owned PWA failed to start.");
                output.WriteLine($"Real API/gateway {factory.HttpAddress}; PWA {pwaUrl}; disposable database {settings.Database}");
                var browserArgs = new List<string> { "node_modules/@playwright/test/cli.js", "test", previewOnly ? "recipe-ingredient-preview-live.spec.ts" : sourceTitlesOnly ? "grocery-recipe-sources-live.spec.ts" : "supper-servings-live.spec.ts", "--workers=1", "--retries=0", Environment.GetEnvironmentVariable("WFS_LIVE_ARTIFACT_ROOT") is null ? "--reporter=line" : "--reporter=line,json" };
                if (settingsOnly) browserArgs.AddRange(["--grep", "real Settings usual portions"]);
                if (resetOnly) browserArgs.AddRange(["--grep", "real Planner reset"]);
                using var browser = Process.Start(Command(browserArgs.ToArray()))!;
                var stdout = browser.StandardOutput.ReadToEndAsync(); var stderr = browser.StandardError.ReadToEndAsync();
                try {
                    await browser.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(6));
                    output.WriteLine(await stdout); output.WriteLine(await stderr);
                    Assert.Equal(0, browser.ExitCode);
                    if (resetOnly) {
                        using var resetScope = factory.Services.CreateScope();
                        var resetDb = resetScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                        var resetRows = await resetDb.SupperServings.AsNoTracking().OrderBy(x => x.Date).ToListAsync();
                        Assert.Equal(new[] { Wednesday, Wednesday.AddDays(2) }, resetRows.Select(x => x.Date));
                        Assert.All(resetRows, x => Assert.Null(x.OverrideServings));
                        Assert.All(resetRows, x => Assert.Equal(7, x.InheritedServings));
                        Assert.Equal(7, (await resetDb.FamilySettings.SingleAsync(x => x.Key == SupperServingsService.DefaultKey)).Value.GetProperty("servings").GetInt32());
                        Assert.Equal(2, (await resetDb.Recipes.SingleAsync(x => x.Id == recipeId)).Servings);
                        Assert.All(await resetDb.WorkflowTasks.Where(x => x.ProcessorName == "RefreshSupperGroceries").ToListAsync(), x => Assert.Equal(RecipeApi.Models.TaskStatus.Completed, x.Status));
                        PreserveSupperLiveArtifacts("planner-reset");
                        output.WriteLine("Planner date-only reset, Cancel, equal-number provenance, subsequent default inheritance and real grocery workflow/SSE passed.");
                        return;
                    }
                    if (settingsOnly) {
                        using var settingsScope = factory.Services.CreateScope();
                        var settingsDb = settingsScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                        Assert.Equal(6, await settingsDb.FamilyMembers.CountAsync());
                        Assert.Equal(6, (await settingsDb.SupperServings.SingleAsync(x => x.Date == Wednesday)).InheritedServings);
                        Assert.Equal(6, (await settingsDb.SupperServings.SingleAsync(x => x.Date == Wednesday.AddDays(3))).OverrideServings);
                        Assert.Null((await settingsDb.SupperServings.SingleAsync(x => x.Date == Wednesday.AddDays(-4))).InheritedServings);
                        var frozen = await settingsDb.CalendarEvents.SingleAsync(x => x.Date == Wednesday.AddDays(2));
                        Assert.Equal(7, frozen.PreparedServings); Assert.Equal(2, frozen.PreparedOriginalServings);
                        Assert.Equal("settings-prepared-plan", frozen.PreparationPlanToken);
                        Assert.Equal(2, (await settingsDb.Recipes.SingleAsync(x => x.Id == recipeId)).Servings);
                        Assert.All(await settingsDb.WorkflowTasks.Where(x => x.ProcessorName == "RefreshSupperGroceries").ToListAsync(), x => Assert.Equal(RecipeApi.Models.TaskStatus.Completed, x.Status));
                        PreserveSupperLiveArtifacts("settings-usual");
                        output.WriteLine("Settings generated-client saves, real family mutations, PostgreSQL independent reads, grocery workflows/SSE and frozen snapshots passed.");
                        return;
                    }
                    if (sourceTitlesOnly) {
                        output.WriteLine("Grocery source titles, independent live refresh, and explicit check acknowledgement passed.");
                        return;
                    }
                    if (previewOnly) {
                        using var checkScope = factory.Services.CreateScope();
                        var checkDb = checkScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                        var prepared = await checkDb.CalendarEvents.AsNoTracking().SingleAsync(x => x.Date == Wednesday.AddDays(2));
                        Assert.Equal(7, prepared.PreparedServings);
                        Assert.Equal(new DateOnly(2026, 10, 12), prepared.PreparedOn);
                        Assert.Equal(2, (await checkDb.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipeId)).Servings);
                        Assert.Equal(6, (await checkDb.SupperServings.AsNoTracking().SingleAsync(x => x.Date == new DateOnly(2026, 10, 12))).OverrideServings);
                        output.WriteLine("Home/Cook captured assigned quantities, stale-occurrence rejection, preview generated-client browser and independent persisted-state checks passed.");
                        return;
                    }

                    using var scope = factory.Services.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                    var rows = await db.SupperServings.OrderBy(x => x.Date).ToListAsync();
                    Assert.Equal(new[] { Wednesday, Wednesday.AddDays(2) }, rows.Select(x => x.Date));
                    Assert.Equal(new int?[] { 4, 6 }, rows.Select(x => x.OverrideServings));
                    var original = await db.Recipes.SingleAsync(x => x.Id == recipeId);
                    Assert.Equal(1, original.Servings); Assert.Contains("current sauce", original.Ingredients);
                    var occurrences = await db.CalendarEvents.OrderBy(x => x.Date).ToListAsync();
                    Assert.Equal(2, occurrences.Count); Assert.All(occurrences, x => Assert.Equal(CalendarEventStatus.Planned, x.Status));
                    Assert.Equal(7, occurrences[0].VoteCount);
                    var plan = await db.WeeklyPlans.SingleAsync();
                    Assert.Contains("current sauce", plan.GroceryItems); Assert.DoesNotContain("2000", plan.GroceryItems);
                    var tasks = await db.WorkflowTasks.ToListAsync();
                    Assert.All(tasks.Where(x => x.ProcessorName == "RefreshSupperGroceries"), x => Assert.Equal(RecipeApi.Models.TaskStatus.Completed, x.Status));
                    var refreshInstances = tasks.Where(x => x.ProcessorName == "RefreshSupperGroceries").Select(x => x.InstanceId).ToArray();
                    var instances = await db.WorkflowInstances.Where(x => refreshInstances.Contains(x.Id)).ToListAsync();
                    Assert.Equal(refreshInstances.Length, instances.Count);
                    Assert.All(instances, x => Assert.Equal(WorkflowStatus.Completed, x.Status));
                    var evidence = new {
                        api = factory.HttpAddress, postgres = new { settings.Database, settings.Host, settings.Port },
                        runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
                        assemblySha256 = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(await File.ReadAllBytesAsync(typeof(SupperServingsService).Assembly.Location))),
                        recipeId, rows = rows.Select(x => new { x.Date, x.OverrideServings }), original.Servings, original.Ingredients,
                        occurrences = occurrences.Select(x => new { x.Id, x.Date, x.Status, x.VoteCount }),
                        groceries = plan.GroceryItems, checks = plan.GroceryState,
                        tasks = tasks.Select(x => new { x.TaskId, x.ProcessorName, x.Status }),
                        refreshWorkflows = instances.Select(x => new { x.Id, x.Status }),
                        advancement = "Controlled explicit production WorkflowWorker.ProcessPendingTasksAsync; no automatic scheduler claim",
                    };
                    var evidenceDirectory = Path.Combine(TomorrowPushPostgresTests.Root(), ".task/supper-servings/live");
                    Directory.CreateDirectory(evidenceDirectory);
                    await File.WriteAllTextAsync(Path.Combine(evidenceDirectory, "database-evidence.json"), JsonSerializer.Serialize(evidence));
                    PreserveSupperLiveArtifacts("original-journey");

                } finally { if (!browser.HasExited) browser.Kill(entireProcessTree: true); await browser.WaitForExitAsync(); }
            } finally { if (!server.HasExited) server.Kill(entireProcessTree: true); await server.WaitForExitAsync(); }
        });
    }
}
