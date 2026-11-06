using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Ai;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class SupperServingsPostgresTests
{
    // Separate database/history: the original journey still requires every refresh to complete.
    private async Task LiveSupperRecoveryJourney()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            using var listener = new TcpListener(IPAddress.Loopback, 0); listener.Start();
            var port = ((IPEndPoint)listener.LocalEndpoint).Port; listener.Stop();
            var pwaUrl = $"http://127.0.0.1:{port}";
            var writes = new ConcurrentQueue<object>();
            var loseCount = 0; var holdCheck = 0;
            var checkEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var releaseCheck = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var clock = new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = DateTimeOffset.Parse("2026-10-12T12:00:00Z") };
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(clock, new() {
                ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                ["Tests:HttpUrl"] = "http://127.0.0.1:0",
            }, app => {
                app.Use(async (context, next) => {
                    if (context.Request.Method != "GET" && context.Request.Path.StartsWithSegments("/api")) {
                        context.Request.EnableBuffering();
                        var body = await new StreamReader(context.Request.Body, leaveOpen: true).ReadToEndAsync(); context.Request.Body.Position = 0;
                        writes.Enqueue(new { method = context.Request.Method, path = context.Request.Path.Value, query = context.Request.QueryString.Value, body });
                    }
                    if (context.Request.Method == "PATCH" && context.Request.Path.Value?.EndsWith("/grocery/item") == true && Interlocked.Exchange(ref holdCheck, 0) == 1) {
                        checkEntered.TrySetResult(); await releaseCheck.Task.WaitAsync(TimeSpan.FromSeconds(30));
                    }
                    if (context.Request.Method != "PUT" || context.Request.Path != "/api/schedule/servings" || Interlocked.Exchange(ref loseCount, 0) == 0) { await next(context); return; }
                    var original = context.Response.Body; await using var buffer = new MemoryStream(); context.Response.Body = buffer;
                    try {
                        await next(context); Assert.Equal(200, context.Response.StatusCode);
                        context.Response.Body = original; context.Response.StatusCode = 504; context.Response.ContentLength = null;
                        await context.Response.WriteAsJsonAsync(new { message = "Lost response after real portions commit" });
                    } finally { context.Response.Body = original; }
                });
                app.MapPost("/_test/recovery/lose-count", () => { Interlocked.Exchange(ref loseCount, 1); return Results.Ok(); }).RequireAuthorization();
                app.MapPost("/_test/recovery/hold-check", () => { checkEntered = new(TaskCreationOptions.RunContinuationsAsynchronously); releaseCheck = new(TaskCreationOptions.RunContinuationsAsynchronously); Interlocked.Exchange(ref holdCheck, 1); return Results.Ok(); }).RequireAuthorization();
                app.MapGet("/_test/recovery/check-entered", () => Results.Ok(checkEntered.Task.IsCompleted)).RequireAuthorization();
                app.MapPost("/_test/recovery/release-check", () => { releaseCheck.TrySetResult(); return Results.Ok(); }).RequireAuthorization();
                app.MapPost("/_test/recovery/fail", async (RecipeDbContext db) => {
                    await db.Database.ExecuteSqlRawAsync("CREATE FUNCTION fail_live_serving_grocery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected grocery failure'; END $$; CREATE TRIGGER fail_live_serving_grocery BEFORE UPDATE OF grocery_items ON weekly_plans FOR EACH ROW EXECUTE FUNCTION fail_live_serving_grocery()"); return Results.Ok();
                }).RequireAuthorization();
                app.MapPost("/_test/recovery/restore", async (RecipeDbContext db) => {
                    await db.Database.ExecuteSqlRawAsync("DROP TRIGGER IF EXISTS fail_live_serving_grocery ON weekly_plans; DROP FUNCTION IF EXISTS fail_live_serving_grocery()"); return Results.Ok();
                }).RequireAuthorization();
                app.MapPost("/_test/recovery/legacy-prior", async (RecipeDbContext db) => {
                    // A supported old cache lacks completeness; do not publish an invented event.
                    var plan = await db.WeeklyPlans.SingleAsync();
                    var recipe = await db.Recipes.SingleAsync();
                    plan.GroceryItems = JsonSerializer.Serialize(new[] { new { displayName = "pasta", normalizedKey = "pasta", section = "Pantry", quantity = 200, unitText = "g", recipeIds = new[] { recipe.Id } } });
                    plan.GroceryState = "{\"pasta\":true,\"unrelated\":true}"; await db.SaveChangesAsync(); return Results.Ok();
                }).RequireAuthorization();
                app.MapPost("/_test/recovery/replay/{taskId:guid}", async (Guid taskId, RecipeDbContext db) => {
                    var task = await db.WorkflowTasks.SingleAsync(x => x.TaskId == taskId); Assert.Equal(RecipeApi.Models.TaskStatus.Completed, task.Status);
                    task.Status = RecipeApi.Models.TaskStatus.Pending; task.ScheduledAt = clock.UtcNow;
                    (await db.WorkflowInstances.SingleAsync(x => x.Id == task.InstanceId)).Status = WorkflowStatus.Pending;
                    await db.SaveChangesAsync(); return Results.Ok();
                }).RequireAuthorization();
                app.MapPost("/_test/recovery/advance", async (IServiceScopeFactory scopes, ILoggerFactory logs) => {
                    using var worker = new WorkflowWorker(clock, scopes, logs.CreateLogger<WorkflowWorker>(), new AiExceptionHandler(clock, logs.CreateLogger<AiExceptionHandler>()), Options.Create(new WorkflowRetryOptions()));
                    return Results.Ok(new { processed = await worker.ProcessPendingTasksAsync(default) });
                }).RequireAuthorization();
                app.MapGet("/_test/recovery/persisted", async (RecipeDbContext db) => Results.Ok(new {
                    writes = writes.ToArray(),
                    rows = await db.SupperServings.AsNoTracking().OrderBy(x => x.Date).Select(x => new { x.Date, x.OverrideServings, x.InheritedServings, x.Version, x.UpdatedAt }).ToListAsync(),
                    defaults = await db.FamilySettings.AsNoTracking().Where(x => x.Key == "supper_servings_default").ToListAsync(),
                    recipes = await db.Recipes.AsNoTracking().Select(x => new { x.Id, x.Servings, x.Ingredients }).ToListAsync(),
                    occurrences = await db.CalendarEvents.AsNoTracking().OrderBy(x => x.Date).Select(x => new { x.Id, x.Date, x.RecipeId, x.Status, x.MealSlot, x.VoteCount }).ToListAsync(),
                    plans = await db.WeeklyPlans.AsNoTracking().OrderBy(x => x.WeekStartDate).Select(x => new { x.WeekStartDate, x.GroceryItems, x.GroceryState, x.ServingInputVersion, x.ServingAppliedVersion, x.ServingRefreshStatus, x.ServingRefreshWorkflowId, x.GroceryResetSummaryVersion }).ToListAsync(),
                    tasks = await db.WorkflowTasks.AsNoTracking().Select(x => new { x.TaskId, x.InstanceId, x.ProcessorName, status = x.Status.ToString(), x.ErrorMessage }).ToListAsync(),
                    workflows = await db.WorkflowInstances.AsNoTracking().Select(x => new { x.Id, status = x.Status.ToString() }).ToListAsync(),
                    extras = await db.GroceryExtraOccurrences.AsNoTracking().Select(x => new { x.Id, x.Name, x.Checked, x.Version, x.WeekStartDate }).ToListAsync(),
                })).RequireAuthorization();
                app.MapFallback("{**path}", async context => {
                    try {
                        using var client = new HttpClient(); using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), pwaUrl + context.Request.Path + context.Request.QueryString);
                        if (context.Request.ContentLength > 0) request.Content = new StreamContent(context.Request.Body);
                        foreach (var header in context.Request.Headers) if (!string.Equals(header.Key, "Host", StringComparison.OrdinalIgnoreCase)) request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, context.RequestAborted);
                        context.Response.StatusCode = (int)response.StatusCode;
                        foreach (var header in response.Headers.Concat(response.Content.Headers)) context.Response.Headers[header.Key] = header.Value.ToArray();
                        context.Response.Headers.Remove("transfer-encoding"); await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                    } catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
                });
            });
            using (var scope = factory.Services.CreateScope()) {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = new Recipe { Name = "Recovery pasta", Servings = 2, Ingredients = "[\"200 g pasta\"]", RawMetadata = "{\"recipeIngredient\":[\"200 g pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"}]}", IsReady = true };
                db.Recipes.Add(recipe); db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id, VoteCount = 7 });
                db.SupperServings.Add(new SupperServing { Date = Wednesday, OverrideServings = 4 }); db.SupperServings.Add(new SupperServing { Date = Wednesday.AddDays(1), OverrideServings = 6 });
                var id = Guid.NewGuid(); var extra = GroceryExtraOccurrence.Create(id, id, new(2026,10,12), "Coffee", "coffee", "Grocery", clock.UtcNow); extra.Checked = true; db.GroceryExtraOccurrences.Add(extra);
                await db.SaveChangesAsync(); await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12), default);
                var plan = await db.WeeklyPlans.SingleAsync(); plan.GroceryState = "{\"pasta\":true,\"unrelated\":true}"; await db.SaveChangesAsync();
            }
            ProcessStartInfo Command(params string[] args) {
                var process = new ProcessStartInfo("node") { WorkingDirectory = Path.Combine(TomorrowPushPostgresTests.Root(), "pwa"), RedirectStandardOutput = true, RedirectStandardError = true };
                foreach (var arg in args) process.ArgumentList.Add(arg);
                process.Environment["BASE_URL"] = factory.HttpAddress; process.Environment["SUPPER_SERVINGS_RECOVERY_API_URL"] = factory.HttpAddress;
                process.Environment["API_INTERNAL_URL"] = factory.HttpAddress; process.Environment["NEXT_PUBLIC_API_BASE_URL"] = "";
                process.Environment["HEARTH_SECRET"] = TestWebApplicationFactory.TestSecret; process.Environment["NEXT_PUBLIC_ENVIRONMENT"] = "test"; return process;
            }
            using var server = Process.Start(Command("node_modules/next/dist/bin/next", "dev", "-H", "127.0.0.1", "-p", port.ToString()))!;
            server.OutputDataReceived += (_, e) => { if (e.Data is not null) output.WriteLine(e.Data); }; server.ErrorDataReceived += (_, e) => { if (e.Data is not null) output.WriteLine(e.Data); }; server.BeginOutputReadLine(); server.BeginErrorReadLine();
            try {
                using var probe = new HttpClient(); var ready = false;
                for (var attempt = 0; attempt < 60; attempt++) { try { ready = (await probe.GetAsync(pwaUrl + "/welcome")).IsSuccessStatusCode; } catch (HttpRequestException) { } if (ready || server.HasExited) break; await Task.Delay(500); }
                Assert.True(ready, "Owned recovery PWA did not start");
                output.WriteLine($"Recovery actual API {factory.HttpAddress}; PWA {pwaUrl}; isolated database {settings.Database}");
                using var browser = Process.Start(Command("node_modules/@playwright/test/cli.js", "test", "supper-servings-recovery-live.spec.ts", "--workers=1", "--reporter=line"))!;
                var stdout = browser.StandardOutput.ReadToEndAsync(); var stderr = browser.StandardError.ReadToEndAsync();
                try { await browser.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(6)); output.WriteLine(await stdout); output.WriteLine(await stderr); Assert.Equal(0, browser.ExitCode); }
                finally { if (!browser.HasExited) browser.Kill(entireProcessTree: true); await browser.WaitForExitAsync(); }
                using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                Assert.Equal(2, (await db.Recipes.SingleAsync()).Servings); Assert.Equal(2, await db.SupperServings.CountAsync());
                Assert.Contains(await db.WorkflowTasks.ToListAsync(), x => x.Status == RecipeApi.Models.TaskStatus.Failed);
                Assert.Contains(await db.WorkflowTasks.ToListAsync(), x => x.Status == RecipeApi.Models.TaskStatus.Completed);
                var occurrence = await db.CalendarEvents.SingleAsync(); Assert.Equal(Wednesday.AddDays(1), occurrence.Date); Assert.Equal(7, occurrence.VoteCount);
                Assert.True((await db.GroceryExtraOccurrences.SingleAsync()).Checked);
                var proof = new {
                    database = new { settings.Database, settings.Host, settings.Port },
                    runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
                    assemblySha256 = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(await File.ReadAllBytesAsync(typeof(SupperServingsService).Assembly.Location))),
                    rows = await db.SupperServings.AsNoTracking().OrderBy(x => x.Date).ToListAsync(),
                    occurrences = await db.CalendarEvents.AsNoTracking().ToListAsync(),
                    plans = await db.WeeklyPlans.AsNoTracking().ToListAsync(),
                    tasks = await db.WorkflowTasks.AsNoTracking().Select(x => new { x.TaskId, x.InstanceId, status = x.Status.ToString(), x.ProcessorName }).ToListAsync(),
                    advancement = "Registered production WorkflowWorker; explicit task replay requeues selected completed task, never fabricates completion",
                };
                var artifactRoot = Environment.GetEnvironmentVariable("WFS_LIVE_ARTIFACT_ROOT");
                if (artifactRoot is not null) await File.WriteAllTextAsync(Path.Combine(artifactRoot, "recovery-database-evidence.json"), JsonSerializer.Serialize(proof));
                PreserveSupperLiveArtifacts("recovery-journey");
            } finally { releaseCheck.TrySetResult(); if (!server.HasExited) server.Kill(entireProcessTree: true); await server.WaitForExitAsync(); }
        });
    }
    private static void PreserveSupperLiveArtifacts(string journey)
    {
        var artifactRoot = Environment.GetEnvironmentVariable("WFS_LIVE_ARTIFACT_ROOT");
        if (artifactRoot is null) return;
        var source = Path.Combine(TomorrowPushPostgresTests.Root(), "pwa/test-results");
        var destination = Path.Combine(artifactRoot, journey);
        Directory.CreateDirectory(destination);
        foreach (var file in Directory.EnumerateFiles(source, "*", SearchOption.AllDirectories)) {
            var target = Path.Combine(destination, Path.GetRelativePath(source, file));
            Directory.CreateDirectory(Path.GetDirectoryName(target)!); File.Copy(file, target, true);
        }
        if (journey == "original-journey") File.Copy(Path.Combine(TomorrowPushPostgresTests.Root(), ".task/supper-servings/live/database-evidence.json"), Path.Combine(destination, "database-evidence.json"), true);
    }

}
