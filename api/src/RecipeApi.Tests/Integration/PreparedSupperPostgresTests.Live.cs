using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;
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

namespace RecipeApi.Tests.Integration;

public partial class PreparedSupperPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public async Task LiveBrowser_PreparedSupperGeneratedClientAndTwoClientUpdates()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            const int port = 3311;
            var pwaUrl = $"http://127.0.0.1:{port}";
            var writes = new ConcurrentQueue<object>();
            var receipts = new ConcurrentQueue<object>();
            var fault = "none";
            var blockRead = false;
            var publication = new PreparationPublicationFault();
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
                new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = Tuesday }, new() {
                    ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                    ["Tests:HttpUrl"] = "http://127.0.0.1:0",
                }, app => {
                    app.Use(async (context, next) => {
                        var preparing = context.Request.Method == "POST" && context.Request.Path == PrepareUrl;
                        if (preparing) {
                            context.Request.EnableBuffering();
                            var body = await new StreamReader(context.Request.Body, leaveOpen: true).ReadToEndAsync(); context.Request.Body.Position = 0;
                            writes.Enqueue(new { path = context.Request.Path.Value, body });
                        }
                        if (blockRead && context.Request.Path.Value?.EndsWith("/ingredient-projection") == true) {
                            context.Response.StatusCode = 503; await context.Response.WriteAsJsonAsync(new { message = "Projection read unavailable at external HTTP boundary" }); return;
                        }
                        if (!preparing) { await next(context); return; }
                        var selected = Interlocked.Exchange(ref fault, "none");
                        if (selected == "negative") {
                            context.Response.StatusCode = 504; await context.Response.WriteAsJsonAsync(new { message = "Request did not reach preparation" }); return;
                        }
                        if (selected is "changed" or "recreated") {
                            var db = context.RequestServices.GetRequiredService<RecipeDbContext>();
                            if (selected == "changed") (await db.SupperServings.SingleAsync(x => x.Date == Friday)).OverrideServings = 8;
                            else {
                                var old = await db.CalendarEvents.SingleAsync(x => x.Date == Friday);
                                var recipe = old.RecipeId; db.CalendarEvents.Remove(old); await db.SaveChangesAsync();
                                db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), Date = Friday, RecipeId = recipe });
                            }
                            await db.SaveChangesAsync(); db.ChangeTracker.Clear();
                        }
                        var original = context.Response.Body; await using var buffer = new MemoryStream(); context.Response.Body = buffer;
                        try {
                            await next(context);
                            buffer.Position = 0; var receipt = await new StreamReader(buffer, leaveOpen: true).ReadToEndAsync();
                            receipts.Enqueue(new { status = context.Response.StatusCode, body = receipt, fault = selected });
                            context.Response.Body = original;
                            if (selected is "lost" or "unavailable") {
                                Assert.Equal(200, context.Response.StatusCode);
                                blockRead = selected == "unavailable";
                                context.Response.StatusCode = 504; context.Response.ContentLength = null;
                                await context.Response.WriteAsJsonAsync(new { message = "Lost response after real preparation commit" });
                            } else {
                                buffer.Position = 0; await buffer.CopyToAsync(original);
                            }
                        } finally { context.Response.Body = original; }
                    });
                    app.MapPost("/_test/prepared/fault/{name}", (string name) => {
                        Assert.Contains(name, new[] { "none", "lost", "unavailable", "negative", "changed", "recreated", "publisher" });
                        blockRead = false; publication.Fail = name == "publisher"; Interlocked.Exchange(ref fault, name); return Results.Ok();
                    }).RequireAuthorization();
                    app.MapPost("/_test/prepared/reset", async (RecipeDbContext db) => {
                        blockRead = false; publication.Fail = false; fault = "none"; writes.Clear(); receipts.Clear();
                        db.CalendarEvents.RemoveRange(db.CalendarEvents); db.SupperServings.RemoveRange(db.SupperServings);
                        db.FamilySettings.RemoveRange(db.FamilySettings); db.WeeklyPlans.RemoveRange(db.WeeklyPlans);
                        foreach (var recipe in await db.Recipes.ToListAsync()) recipe.LastCookedDate = null;
                        await db.SaveChangesAsync();
                        var pasta = await db.Recipes.SingleAsync(x => x.Name == "Friday pasta");
                        var soup = await db.Recipes.SingleAsync(x => x.Name == "Tuesday soup");
                        db.CalendarEvents.AddRange(new CalendarEvent { Id = Guid.NewGuid(), Date = Friday, RecipeId = pasta.Id },
                            new CalendarEvent { Id = Guid.NewGuid(), Date = Friday.AddDays(-2), RecipeId = pasta.Id },
                            new CalendarEvent { Id = Guid.NewGuid(), Date = Friday.AddDays(-3), RecipeId = soup.Id, Status = CalendarEventStatus.Locked });
                        db.FamilySettings.Add(new FamilySetting { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 4 }) });
                        db.SupperServings.Add(new SupperServing { Date = Friday, OverrideServings = 6, InheritedServings = 4, CreatedAt = Tuesday, UpdatedAt = Tuesday });
                        await db.SaveChangesAsync(); return Results.Ok();
                    }).RequireAuthorization();
                    app.MapGet("/_test/prepared/persisted", async (RecipeDbContext db) => Results.Ok(new {
                        writes = writes.ToArray(), receipts = receipts.ToArray(), publicationFailures = publication.Failures,
                        occurrences = await db.CalendarEvents.AsNoTracking().OrderBy(x => x.Date).ToListAsync(),
                        recipes = await db.Recipes.AsNoTracking().Select(x => new { x.Id, x.Name, x.Servings, x.Ingredients, x.LastCookedDate }).ToListAsync(),
                        rows = await db.SupperServings.AsNoTracking().OrderBy(x => x.Date).ToListAsync(),
                    })).RequireAuthorization();
                    app.MapPost("/_test/prepared/default", async (RecipeDbContext db) => {
                        (await db.FamilySettings.SingleAsync(x => x.Key == SupperServingsService.DefaultKey)).Value = JsonSerializer.SerializeToElement(new { servings = 9 });
                        await db.SaveChangesAsync(); return Results.Ok();
                    }).RequireAuthorization();
                    app.MapPost("/_test/prepared/ordinary-roundtrip", async (RecipeDbContext db, ManagementService management, DataRootResolver root) => {
                        var before = await db.CalendarEvents.AsNoTracking().SingleAsync(x => x.Date == Friday);
                        Assert.NotNull(before.PreparedAtUtc); Assert.Equal(6, before.PreparedServings);
                        await management.BackupAsync();
                        var wire = await File.ReadAllTextAsync(Path.Combine(root.Root, "calendar-events.json"));
                        db.CalendarEvents.Remove(await db.CalendarEvents.SingleAsync(x => x.Date == Friday)); await db.SaveChangesAsync();
                        for (var repeat = 0; repeat < 2; repeat++) {
                            var result = await management.RestoreAsync(); Assert.Equal(0, result.Errors); db.ChangeTracker.Clear();
                            var after = await db.CalendarEvents.SingleAsync(x => x.Date == Friday);
                            Assert.Equal(before.Id, after.Id); Assert.Equal(before.PreparedOn, after.PreparedOn); Assert.Equal(before.PreparedAtUtc, after.PreparedAtUtc);
                            Assert.Equal(before.PreparedServings, after.PreparedServings); Assert.Equal(before.PreparedOriginalServings, after.PreparedOriginalServings);
                            Assert.Equal(before.PreparationPlanToken, after.PreparationPlanToken); Assert.Equal(before.PreparationServingVersion, after.PreparationServingVersion);
                            Assert.Equal(Tuesday, (await db.Recipes.SingleAsync(x => x.Id == before.RecipeId)).LastCookedDate);
                        }
                        return Results.Ok(new { before, after = await db.CalendarEvents.AsNoTracking().SingleAsync(x => x.Date == Friday), exportedCalendar = JsonDocument.Parse(wire).RootElement });
                    }).RequireAuthorization();
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
                }, services => {
                    // Only the external publication boundary is faulted. All normal events pass
                    // through the actual registered publisher and singleton SSE connection manager.
                    services.AddScoped<IScheduleEventPublisher>(provider => new PreparationLivePublisher(
                        new SseEventPublisher(provider.GetRequiredService<SseConnectionManager>(), provider.GetRequiredService<VotingSession>()), publication));
                });
            var recipeId = await Seed(factory);
            using (var scope = factory.Services.CreateScope()) {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.SingleAsync(x => x.Id == recipeId);
                recipe.IsReady = true; recipe.IsSynthesized = true;
                recipe.RawMetadata = "{\"recipeInstructions\":[\"Add 200 g pasta.\",\"Serve.\"],\"recipeIngredient\":[\"200 g pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"}]}";
                await db.SaveChangesAsync();
            }
            ProcessStartInfo Command(params string[] args) {
                var process = new ProcessStartInfo("node") { WorkingDirectory = Path.Combine(TomorrowPushPostgresTests.Root(), "pwa"), RedirectStandardOutput = true, RedirectStandardError = true };
                foreach (var arg in args) process.ArgumentList.Add(arg);
                process.Environment["BASE_URL"] = factory.HttpAddress; process.Environment["PREPARED_SUPPER_API_URL"] = factory.HttpAddress;
                process.Environment["API_INTERNAL_URL"] = factory.HttpAddress; process.Environment["NEXT_PUBLIC_API_BASE_URL"] = "";
                process.Environment["HEARTH_SECRET"] = TestWebApplicationFactory.TestSecret; process.Environment["NEXT_PUBLIC_ENVIRONMENT"] = "test"; return process;
            }
            using var server = Process.Start(Command("node_modules/next/dist/bin/next", "dev", "-H", "127.0.0.1", "-p", port.ToString()))!;
            server.OutputDataReceived += (_, e) => { if (e.Data is not null) output.WriteLine(e.Data); };
            server.ErrorDataReceived += (_, e) => { if (e.Data is not null) output.WriteLine(e.Data); }; server.BeginOutputReadLine(); server.BeginErrorReadLine();
            try {
                using var probe = new HttpClient(); var ready = false;
                for (var attempt = 0; attempt < 60; attempt++) { try { ready = (await probe.GetAsync(pwaUrl + "/welcome")).IsSuccessStatusCode; } catch (HttpRequestException) { } if (ready || server.HasExited) break; await Task.Delay(500); }
                Assert.True(ready && !server.HasExited, "Task-owned PWA3311 failed to start.");
                output.WriteLine($"Real API/gateway {factory.HttpAddress}; PWA {pwaUrl}; disposable database {settings.Database}");
                using var browser = Process.Start(Command("node_modules/@playwright/test/cli.js", "test", "prepared-supper-live.spec.ts", "--workers=1", "--reporter=line"))!;
                var stdout = browser.StandardOutput.ReadToEndAsync(); var stderr = browser.StandardError.ReadToEndAsync();
                try {
                    await browser.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(8)); output.WriteLine(await stdout); output.WriteLine(await stderr); Assert.Equal(0, browser.ExitCode);
                } finally { if (!browser.HasExited) browser.Kill(entireProcessTree: true); await browser.WaitForExitAsync(); }
            } finally {
                if (!server.HasExited) server.Kill(entireProcessTree: true); await server.WaitForExitAsync();
                var artifactRoot = Environment.GetEnvironmentVariable("WFS_LIVE_ARTIFACT_ROOT");
                if (artifactRoot is not null) {
                    Directory.CreateDirectory(artifactRoot);
                    var source = Path.Combine(TomorrowPushPostgresTests.Root(), "pwa/test-results");
                    foreach (var file in Directory.EnumerateFiles(source, "*", SearchOption.AllDirectories)) {
                        var target = Path.Combine(artifactRoot, Path.GetRelativePath(source, file)); Directory.CreateDirectory(Path.GetDirectoryName(target)!); File.Copy(file, target, true);
                    }
                    await File.WriteAllTextAsync(Path.Combine(artifactRoot,"runtime-database.json"), JsonSerializer.Serialize(new {
                        settings.Database, settings.Host, settings.Port, api = factory.HttpAddress, pwa = pwaUrl,
                        runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
                        assemblySha256 = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(await File.ReadAllBytesAsync(typeof(ScheduleService).Assembly.Location))),
                    }));
                }
            }
        });
    }
    private sealed class PreparationPublicationFault
    {
        public bool Fail;
        public int Failures;
    }

    private sealed class PreparationLivePublisher(SseEventPublisher actual, PreparationPublicationFault fault) : IScheduleEventPublisher
    {
        public Task PublishWeekUpdatedAsync(ScheduleDays schedule, string? excludeConnectionId = null, int? echoSeq = null)
        {
            if (fault.Fail) { Interlocked.Increment(ref fault.Failures); throw new IOException("Injected external publication failure after preparation commit"); }
            return actual.PublishWeekUpdatedAsync(schedule, excludeConnectionId, echoSeq);
        }
        public Task PublishSlotUpdatedAsync(DateOnly date, ScheduleRecipeDto? recipe, int status, string? excludeConnectionId = null, NonCookingPlanDto? nonCooking = null, Guid? occurrenceId = null) => actual.PublishSlotUpdatedAsync(date, recipe, status, excludeConnectionId, nonCooking, occurrenceId);
        public Task PublishVotingSessionUpdatedAsync(VotingSessionSnapshot session) => actual.PublishVotingSessionUpdatedAsync(session);
        public Task PublishVoteUpdatedAsync(Guid recipeId, int voteCount, string? excludeConnectionId = null) => actual.PublishVoteUpdatedAsync(recipeId, voteCount, excludeConnectionId);
        public Task PublishSmartDefaultsUpdatedAsync(int weekOffset, SmartDefaultsDto defaults, string? excludeConnectionId = null) => actual.PublishSmartDefaultsUpdatedAsync(weekOffset, defaults, excludeConnectionId);
        public Task PublishFillTheGapInvalidatedAsync(int weekOffset, DateOnly weekStartDate, string? excludeConnectionId = null) => actual.PublishFillTheGapInvalidatedAsync(weekOffset, weekStartDate, excludeConnectionId);
        public Task PublishAllSuggestionsInvalidatedAsync() => actual.PublishAllSuggestionsInvalidatedAsync();
        public Task PublishDemoResetAsync(Guid generation) => actual.PublishDemoResetAsync(generation);
        public Task PublishRecipeReadyAsync(Guid recipeId, string name, string? imageUrl, string? excludeConnectionId = null) => actual.PublishRecipeReadyAsync(recipeId, name, imageUrl, excludeConnectionId);
        public Task PublishRecipeFailedAsync(Guid recipeId, Guid workflowInstanceId, string errorMessage, string failedStep, object? partialData, string? excludeConnectionId = null) => actual.PublishRecipeFailedAsync(recipeId, workflowInstanceId, errorMessage, failedStep, partialData, excludeConnectionId);
        public Task PublishGroceryUpdatedAsync(int weekOffset, Dictionary<string, bool> groceryState, DateOnly weekStartDate, string? excludeConnectionId = null) => actual.PublishGroceryUpdatedAsync(weekOffset, groceryState, weekStartDate, excludeConnectionId);
        public Task PublishGroceryExtrasUpdatedAsync(DateOnly weekStartDate, IReadOnlyList<GroceryExtraDto> groceryExtras, string? excludeConnectionId = null) => actual.PublishGroceryExtrasUpdatedAsync(weekStartDate, groceryExtras, excludeConnectionId);
    }

}
