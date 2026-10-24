using System.Net.Http.Json;
using System.Net;
using System.Diagnostics;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Builder;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

namespace RecipeApi.Tests.Integration;

public class VotingSessionPostgresTests(Xunit.Abstractions.ITestOutputHelper output) : IAsyncLifetime
{
    private readonly string database = $"wfs_voting_test_{Guid.NewGuid():N}";
    private NpgsqlConnection admin = null!;
    private string connection = null!;
    private RecipeDbContext db = null!;

    public async Task InitializeAsync()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        admin = new(settings.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        settings.Database = database;
        connection = settings.ConnectionString;
        db = new(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(connection).Options);
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !File.Exists(Path.Combine(root.FullName, "database", "schema.sql"))) root = root.Parent;
        await using var schemaConnection = new NpgsqlConnection(connection);
        await schemaConnection.OpenAsync();
        await new NpgsqlCommand(await File.ReadAllTextAsync(Path.Combine(root!.FullName, "database", "schema.sql")), schemaConnection).ExecuteNonQueryAsync();
    }

    public async Task DisposeAsync()
    {
        if (db is not null) await db.DisposeAsync();
        if (admin is null) return;
        if (admin.State == System.Data.ConnectionState.Open)
            await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync();
        await admin.DisposeAsync();
    }

    [PostgresFact]
    public async Task ThreeMatchesForNextWeek_ConvergeForBothSubscribers_WithoutAssignmentsOrHistory()
    {
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(new TestClock(),
            new() { ["Tests:PostgresConnectionString"] = connection });
        using var client = app.CreateAuthenticatedClient();
        var members = Enumerable.Range(1, 3).Select(i => new FamilyMember { Id = Guid.NewGuid(), Name = $"Member {i}" }).ToArray();
        db.FamilyMembers.AddRange(members);
        var recipes = Enumerable.Range(1, 4).Select(i => new Recipe
        {
            Id = Guid.NewGuid(), Name = $"Supper {i}", Category = "Supper", IsReady = true, IsDiscoverable = true
        }).ToArray();
        db.Recipes.AddRange(recipes);
        var monday = new DateOnly(2026, 10, 19);
        var otherPlans = Enumerable.Range(0, 4).Select(i => new CalendarEvent
        {
            Id = Guid.NewGuid(), Date = monday.AddDays(i), Status = CalendarEventStatus.Skipped,
            NonCookingKind = "eating_out", NonCookingLabel = $"Other plan {i}"
        }).ToArray();
        db.CalendarEvents.AddRange(otherPlans);
        await db.SaveChangesAsync();
        Assert.Equal(4, await db.FamilyMembers.CountAsync());

        var manager = app.Services.GetRequiredService<SseConnectionManager>();
        using var firstBody = new MemoryStream();
        using var secondBody = new MemoryStream();
        var firstContext = new DefaultHttpContext();
        var secondContext = new DefaultHttpContext();
        firstContext.Response.Body = firstBody;
        secondContext.Response.Body = secondBody;
        var firstConnection = manager.AddConnection(firstContext.Response);
        var secondConnection = manager.AddConnection(secondContext.Response);
        try
        {
            (await client.PostAsync("/api/schedule/voting/open?weekOffset=1", null)).EnsureSuccessStatusCode();
            foreach (var recipe in recipes.Take(3))
            {
                // Four household members still require the existing strict majority of three.
                foreach (var member in members)
                {
                    client.DefaultRequestHeaders.Remove("X-Family-Member-Id");
                    client.DefaultRequestHeaders.Add("X-Family-Member-Id", member.Id.ToString());
                    (await client.PostAsJsonAsync($"/api/discovery/{recipe.Id}/vote", new { vote = 1 })).EnsureSuccessStatusCode();
                }
            }

            var response = await client.GetAsync("/api/discovery/session");
            response.EnsureSuccessStatusCode();
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var session = json.RootElement.GetProperty("data");
            Assert.Equal("converged", session.GetProperty("phase").GetString());
            Assert.Equal("2026-10-19", session.GetProperty("weekStartDate").GetString());
            Assert.Equal(3, session.GetProperty("requiredSlots").GetInt32());
            Assert.Equal(3, session.GetProperty("coveredSlots").GetInt32());
            Assert.Equal(3, session.GetProperty("candidateCount").GetInt32());
            Assert.Equal(3, session.GetProperty("smartDefaults").GetProperty("preSelectedRecipes").GetArrayLength());
            AssertConvergedFrame(firstBody, session);
            AssertConvergedFrame(secondBody, session);

            db.ChangeTracker.Clear();
            var persistedPlans = await db.CalendarEvents.OrderBy(e => e.Date).ToListAsync();
            Assert.Equal(otherPlans.Select(e => e.Id), persistedPlans.Select(e => e.Id));
            Assert.All(persistedPlans, e => { Assert.Null(e.RecipeId); Assert.Equal(CalendarEventStatus.Skipped, e.Status); Assert.Equal("eating_out", e.NonCookingKind); });
            Assert.Empty(await db.WeeklyHouseholdInterests.ToListAsync());
            Assert.Equal(9, await db.RecipeVotes.CountAsync());
            Assert.Equal(WeeklyPlanStatus.VotingOpen, (await db.WeeklyPlans.SingleAsync()).Status);
        }
        finally
        {
            manager.RemoveConnection(firstConnection);
            manager.RemoveConnection(secondConnection);
        }
    }

    private static void AssertConvergedFrame(MemoryStream body, JsonElement session)
    {
        var frames = Encoding.UTF8.GetString(body.ToArray()).Split("\n\n", StringSplitOptions.RemoveEmptyEntries);
        var frame = frames.Last(f => f.StartsWith("event: voting_session_updated\n", StringComparison.Ordinal));
        using var json = JsonDocument.Parse(frame.Split('\n').Single(line => line.StartsWith("data: ", StringComparison.Ordinal))[6..]);
        var published = json.RootElement.GetProperty("session");
        Assert.Equal("converged", published.GetProperty("phase").GetString());
        Assert.Equal(session.GetProperty("roundId").GetGuid(), published.GetProperty("roundId").GetGuid());
        Assert.Equal(session.GetProperty("weekStartDate").GetString(), published.GetProperty("weekStartDate").GetString());
        Assert.Equal(3, published.GetProperty("coveredSlots").GetInt32());
    }

    [PostgresFact]
    public async Task LateUnanimityAndWithdrawal_RecalculateButLatch_AndRestartRehydratesCoverage()
    {
        await using var app = await Host();
        using var client = app.CreateAuthenticatedClient();
        var (members, recipes) = await Seed(app.DefaultFamilyMemberId);
        await Open(client);
        foreach (var recipe in recipes.Take(3))
        {
            await Vote(client, members[0], recipe.Id);
            await Vote(client, members[1], recipe.Id);
        }
        var converged = await Session(client);
        Assert.Equal("converged", converged.GetProperty("phase").GetString());
        var last = converged.GetProperty("smartDefaults").GetProperty("preSelectedRecipes")[2].GetProperty("recipeId").GetGuid();
        await Vote(client, members[2], last);
        var unanimous = await Session(client);
        Assert.Equal(last, unanimous.GetProperty("smartDefaults").GetProperty("preSelectedRecipes")[0].GetProperty("recipeId").GetGuid());
        var withdrawn = recipes.First(r => r.Id != last);
        await Vote(client, members[1], withdrawn.Id, (int)VoteType.Dislike);
        var latched = await Session(client);
        Assert.Equal("converged", latched.GetProperty("phase").GetString());
        Assert.Equal(2, latched.GetProperty("coveredSlots").GetInt32());

        // Recreate only the host-local singleton; the HTTP test factory always seeds a new member.
        // Keeping its scoped database provider preserves the household while discarding the latch.
        var restarted = new VotingSession(app.Services.GetRequiredService<IServiceScopeFactory>(), NullLogger<VotingSession>.Instance);
        var recovered = await restarted.ReadAsync();
        Assert.Equal("collecting", recovered.Phase);
        Assert.Equal(latched.GetProperty("roundId").GetGuid(), recovered.RoundId);
        Assert.NotEqual(latched.GetProperty("incarnationId").GetGuid(), recovered.IncarnationId);
        await Vote(client, members[1], withdrawn.Id);
        Assert.Equal("converged", (await restarted.ReadAsync()).Phase);
        var sufficientRestart = new VotingSession(app.Services.GetRequiredService<IServiceScopeFactory>(), NullLogger<VotingSession>.Instance);
        Assert.Equal("converged", (await sufficientRestart.ReadAsync()).Phase);
        Assert.Equal(4, await db.CalendarEvents.CountAsync());
        Assert.Empty(await db.WeeklyHouseholdInterests.ToListAsync());
    }

    [PostgresFact]
    public async Task ConcurrentFinalVotesAndOtherPlan_KeepUniqueSuggestionsInsideRemainingDates()
    {
        await using var app = await Host();
        using var client = app.CreateAuthenticatedClient();
        var (members, recipes) = await Seed(app.DefaultFamilyMemberId, otherCount: 3);
        await Open(client);
        foreach (var recipe in recipes) await Vote(client, members[0], recipe.Id);
        using var planClient = app.CreateAuthenticatedClient();
        var writes = recipes.Select(async recipe =>
        {
            using var voter = app.CreateAuthenticatedClient();
            await Vote(voter, members[1], recipe.Id);
        }).Append(AddOther(planClient, "2026-10-22"));
        await Task.WhenAll(writes);
        var session = await Session(client);
        Assert.Equal("converged", session.GetProperty("phase").GetString());
        Assert.Equal(3, session.GetProperty("requiredSlots").GetInt32());
        Assert.Equal(4, session.GetProperty("candidateCount").GetInt32());
        var suggestions = session.GetProperty("smartDefaults").GetProperty("preSelectedRecipes").EnumerateArray().ToArray();
        Assert.Equal(3, suggestions.Length);
        Assert.Equal(3, suggestions.Select(s => s.GetProperty("recipeId").GetGuid()).Distinct().Count());
        Assert.Equal(new[] { 4, 5, 6 }, suggestions.Select(s => s.GetProperty("dayIndex").GetInt32()));
        db.ChangeTracker.Clear();
        Assert.Equal(4, await db.CalendarEvents.CountAsync());
        Assert.All(await db.CalendarEvents.ToListAsync(), e => Assert.Null(e.RecipeId));
        Assert.Equal(8, await db.RecipeVotes.CountAsync());
        Assert.Empty(await db.WeeklyHouseholdInterests.ToListAsync());
    }

    [PostgresFact]
    public async Task GuardedPromotionConflict_PreservesSuccessfulAssignmentAndOther_ThenCloseReplayKeepsEarlyVotes()
    {
        await using var app = await Host();
        using var client = app.CreateAuthenticatedClient();
        var (members, recipes) = await Seed(app.DefaultFamilyMemberId);
        await Open(client);
        foreach (var recipe in recipes.Take(3))
        {
            await Vote(client, members[0], recipe.Id);
            await Vote(client, members[1], recipe.Id);
        }
        var session = await Session(client);
        var round = session.GetProperty("roundId").GetGuid();
        var suggestions = session.GetProperty("smartDefaults").GetProperty("preSelectedRecipes").EnumerateArray().ToArray();
        var first = suggestions[0];
        (await client.PostAsJsonAsync("/api/schedule/assign?referenceWeekStartDate=2026-10-12", new
        {
            weekOffset = 1, dayIndex = first.GetProperty("dayIndex").GetInt32(),
            recipeId = first.GetProperty("recipeId").GetGuid(), requireEmpty = true
        })).EnsureSuccessStatusCode();
        var blocked = suggestions[1];
        var blockedDate = new DateOnly(2026, 10, 19).AddDays(blocked.GetProperty("dayIndex").GetInt32());
        await AddOther(client, blockedDate.ToString("yyyy-MM-dd"));
        var conflict = await client.PostAsJsonAsync("/api/schedule/assign?referenceWeekStartDate=2026-10-12", new
        {
            weekOffset = 1, dayIndex = blocked.GetProperty("dayIndex").GetInt32(),
            recipeId = blocked.GetProperty("recipeId").GetGuid(), requireEmpty = true
        });
        Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);
        db.ChangeTracker.Clear();
        Assert.Equal(first.GetProperty("recipeId").GetGuid(), (await db.CalendarEvents.SingleAsync(e => e.Date == new DateOnly(2026, 10, 23))).RecipeId);
        Assert.Null((await db.CalendarEvents.SingleAsync(e => e.Date == blockedDate)).RecipeId);
        Assert.Equal(WeeklyPlanStatus.VotingOpen, (await db.WeeklyPlans.SingleAsync()).Status);
        Assert.Empty(await db.WeeklyHouseholdInterests.ToListAsync());

        var close = $"/api/schedule/lock?weekOffset=1&referenceWeekStartDate=2026-10-12&votingRoundId={round}";
        (await client.PostAsync(close, null)).EnsureSuccessStatusCode();
        await Vote(client, members[0], recipes[3].Id);
        // Replaying a lost response cannot clear this next-round early vote or recapture history.
        (await client.PostAsync(close, null)).EnsureSuccessStatusCode();
        Assert.Equal(1, await db.RecipeVotes.CountAsync());
        Assert.Equal(3, await db.WeeklyHouseholdInterests.CountAsync());
        Assert.Equal("unowned", (await Session(client)).GetProperty("phase").GetString());
        await Open(client);
        var reopened = await Session(client);
        Assert.NotEqual(round, reopened.GetProperty("roundId").GetGuid());
        Assert.Equal("collecting", reopened.GetProperty("phase").GetString());
        Assert.Equal(1, reopened.GetProperty("requiredSlots").GetInt32());
        await Vote(client, members[1], recipes[3].Id);
        Assert.Equal("converged", (await Session(client)).GetProperty("phase").GetString());
        Assert.Equal(3, await db.WeeklyHouseholdInterests.CountAsync());
        await Vote(client, members[0], blocked.GetProperty("recipeId").GetGuid(), (int)VoteType.Dislike);
        var secondRound = reopened.GetProperty("roundId").GetGuid();
        (await client.PostAsync($"/api/schedule/lock?weekOffset=1&referenceWeekStartDate=2026-10-12&votingRoundId={secondRound}", null)).EnsureSuccessStatusCode();
        db.ChangeTracker.Clear();
        Assert.False(await db.WeeklyHouseholdInterests.AnyAsync(h => h.RecipeId == blocked.GetProperty("recipeId").GetGuid()));
        var untouched = await db.WeeklyHouseholdInterests.SingleAsync(h => h.RecipeId == suggestions[2].GetProperty("recipeId").GetGuid());
        Assert.Equal(round, untouched.CloseId);
        Assert.Equal(2, untouched.PositiveCount);
        var latest = await db.WeeklyHouseholdInterests.SingleAsync(h => h.RecipeId == recipes[3].Id);
        Assert.Equal(secondRound, latest.CloseId);
        Assert.Equal(2, latest.PositiveCount);
        Assert.Equal(3, await db.WeeklyHouseholdInterests.CountAsync());
    }

    private Task<TestWebApplicationFactory> Host() => TestWebApplicationFactory.CreateWithAuthAsync(new TestClock(),
        new() { ["Tests:PostgresConnectionString"] = connection });

    [PostgresFact]
    public async Task ConcurrentGuardedPromotions_ForDistinctEmptyDates_PreserveSuccessAndReturnBoundedConflicts()
    {
        await using var app = await Host();
        using var client = app.CreateAuthenticatedClient();
        var (_, recipes) = await Seed(app.DefaultFamilyMemberId);
        await Open(client);
        var writes = recipes.Take(3).Select(async (recipe, index) =>
        {
            using var scope = app.Services.CreateScope();
            try
            {
                await scope.ServiceProvider.GetRequiredService<ScheduleService>().AssignRecipeAsync(
                    new(1, index + 4, recipe.Id, true), referenceWeekStartDate: new DateOnly(2026, 10, 12));
                return true;
            }
            catch (AssignmentConflictException) { return false; }
        });
        bool[] outcomes;
        try { outcomes = await Task.WhenAll(writes); }
        catch (Exception error) { output.WriteLine(error.ToString()); throw; }
        Assert.Contains(true, outcomes);
        Assert.Equal(outcomes.Count(success => success), await db.CalendarEvents.CountAsync(e => e.RecipeId != null));
        Assert.Equal(4, await db.CalendarEvents.CountAsync(e => e.NonCookingKind != null));
        db.ChangeTracker.Clear();
        var meals = await db.CalendarEvents.Where(e => e.RecipeId != null).ToListAsync();
        Assert.All(meals, meal => Assert.Equal(recipes[meal.Date.DayNumber - new DateOnly(2026, 10, 23).DayNumber].Id, meal.RecipeId));
    }

    private async Task<(Guid[] Members, Recipe[] Recipes)> Seed(Guid firstMember, int otherCount = 4)
    {
        var members = Enumerable.Range(1, 2).Select(i => new FamilyMember { Id = Guid.NewGuid(), Name = $"Member {i}" }).ToArray();
        db.FamilyMembers.AddRange(members);
        var recipes = Enumerable.Range(1, 4).Select(i => new Recipe
        {
            Id = Guid.Parse($"78000000-0000-0000-0000-{i:000000000000}"), Name = $"Live supper {i}",
            Category = "Supper", IsReady = true, IsDiscoverable = true
        }).ToArray();
        db.Recipes.AddRange(recipes);
        for (var i = 0; i < otherCount; i++)
            db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), Date = new DateOnly(2026, 10, 19).AddDays(i), Status = CalendarEventStatus.Skipped, NonCookingKind = "eating_out" });
        await db.SaveChangesAsync();
        return ([firstMember, .. members.Select(m => m.Id)], recipes);
    }

    private static async Task Open(HttpClient client) =>
        (await client.PostAsync("/api/schedule/voting/open?weekOffset=1", null)).EnsureSuccessStatusCode();

    private static async Task Vote(HttpClient client, Guid member, Guid recipe, int vote = 1)
    {
        client.DefaultRequestHeaders.Remove("X-Family-Member-Id");
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", member.ToString());
        (await client.PostAsJsonAsync($"/api/discovery/{recipe}/vote", new { vote })).EnsureSuccessStatusCode();
    }

    private static async Task AddOther(HttpClient client, string date) =>
        (await client.PostAsJsonAsync($"/api/schedule/day/{date}/validate", new
        {
            status = 3, nonCooking = new { kind = "eating_out", label = "Family outing" }
        })).EnsureSuccessStatusCode();

    private static async Task<JsonElement> Session(HttpClient client)
    {
        using var json = JsonDocument.Parse(await client.GetStringAsync("/api/discovery/session"));
        return json.RootElement.GetProperty("data").Clone();
    }

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public async Task LiveBrowser_TwoMembersConvergeReconnectAndReopenAgainstRealPostgres()
    {
        var pwaUrl = $"http://127.0.0.1:{DeploymentCalendarPostgresTests.FreePort()}";
        var streams = new ConcurrentDictionary<Guid, HttpContext>();
        var streamsOnline = 1;
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(new TestClock(), new()
        {
            ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = connection,
            ["Tests:HttpUrl"] = "http://127.0.0.1:0"
        }, application =>
        {
            application.Use(async (context, next) =>
            {
                if (context.Request.Path != "/api/stream") { await next(context); return; }
                if (Volatile.Read(ref streamsOnline) == 0) { context.Response.StatusCode = 503; return; }
                var id = Guid.NewGuid();
                streams[id] = context;
                try { await next(context); }
                finally { streams.TryRemove(id, out _); }
            });
            application.MapPost("/_test/voting/stream", (JsonElement body) =>
            {
                var online = body.GetProperty("online").GetBoolean();
                Interlocked.Exchange(ref streamsOnline, online ? 1 : 0);
                if (!online) foreach (var context in streams.Values) context.Abort();
                return Results.Ok();
            }).ExcludeFromDescription().RequireAuthorization();
            // Same-origin test gateway mirrors deployment routing; API routes terminate at this host.
            application.MapFallback("{**path}", async context =>
            {
                try
                {
                    using var gateway = new HttpClient();
                    using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), pwaUrl + context.Request.Path + context.Request.QueryString);
                    if (context.Request.ContentLength > 0) request.Content = new StreamContent(context.Request.Body);
                    foreach (var header in context.Request.Headers)
                        if (!string.Equals(header.Key, "Host", StringComparison.OrdinalIgnoreCase))
                            request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    using var response = await gateway.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, context.RequestAborted);
                    context.Response.StatusCode = (int)response.StatusCode;
                    foreach (var header in response.Headers.Concat(response.Content.Headers)) context.Response.Headers[header.Key] = header.Value.ToArray();
                    context.Response.Headers.Remove("transfer-encoding");
                    await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                }
                catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
            });
        });
        var (members, recipes) = await Seed(app.DefaultFamilyMemberId);
        using var client = app.CreateAuthenticatedClient();
        await Open(client);
        foreach (var recipe in recipes.Take(3)) await Vote(client, members[0], recipe.Id);
        Assert.Equal(4, await db.CalendarEvents.CountAsync());
        Assert.Empty(await db.WeeklyHouseholdInterests.ToListAsync());

        var root = DeploymentCalendarPostgresTests.RepositoryRoot();
        var start = new ProcessStartInfo("node")
        {
            WorkingDirectory = Path.Combine(root, "pwa"), RedirectStandardOutput = true, RedirectStandardError = true
        };
        foreach (var arg in new[] { "node_modules/next/dist/bin/next", "dev", "-H", "127.0.0.1", "-p", new Uri(pwaUrl).Port.ToString() }) start.ArgumentList.Add(arg);
        DeploymentCalendarPostgresTests.ConfigureEnvironment(start, app.HttpAddress, pwaUrl);
        using var server = Process.Start(start)!;
        server.OutputDataReceived += (_, e) => { if (e.Data is not null) output.WriteLine(e.Data); };
        server.ErrorDataReceived += (_, e) => { if (e.Data is not null) output.WriteLine(e.Data); };
        server.BeginOutputReadLine();
        server.BeginErrorReadLine();
        try
        {
            using var probe = new HttpClient();
            var ready = false;
            for (var attempt = 0; attempt < 60; attempt++)
            {
                try { ready = (await probe.GetAsync(pwaUrl + "/welcome")).IsSuccessStatusCode; }
                catch (HttpRequestException) { }
                if (ready || server.HasExited) break;
                await Task.Delay(500);
            }
            Assert.True(ready, "Task-owned PWA failed to start.");
            var acceptance = new ProcessStartInfo("task") { WorkingDirectory = root, RedirectStandardOutput = true, RedirectStandardError = true };
            foreach (var arg in new[] { "test:e2e:reuse-server", "--", "voting-session-live.spec.ts" }) acceptance.ArgumentList.Add(arg);
            DeploymentCalendarPostgresTests.ConfigureEnvironment(acceptance, app.HttpAddress, pwaUrl);
            acceptance.Environment["VOTING_LIVE_MEMBERS"] = string.Join(',', members);
            output.WriteLine($"Isolated API {app.HttpAddress}; PWA {pwaUrl}; PostgreSQL {database}; clock 2026-10-12T12:00Z");
            var progressPath = Path.Combine(Path.GetTempPath(), "wfs-voting-browser-progress.log");
            await File.WriteAllTextAsync(progressPath, "");
            using var browser = Process.Start(acceptance)!;
            var stdout = ReadProgress(browser.StandardOutput, progressPath);
            var stderr = browser.StandardError.ReadToEndAsync();
            try
            {
                await browser.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(3));
                output.WriteLine(await stdout);
                output.WriteLine(await stderr);
                Assert.Equal(0, browser.ExitCode);
                db.ChangeTracker.Clear();
                Assert.Equal(6, await db.CalendarEvents.CountAsync());
                Assert.Equal(2, await db.CalendarEvents.CountAsync(e => e.RecipeId != null));
                Assert.Equal(4, await db.CalendarEvents.CountAsync(e => e.NonCookingKind == "eating_out"));
                Assert.Equal(4, await db.WeeklyHouseholdInterests.CountAsync());
                Assert.Equal(3, await db.WeeklyHouseholdInterests.CountAsync(e => e.Selected));
                Assert.Equal(2, await db.RecipeVotes.CountAsync());
                Assert.Equal("converged", (await Session(client)).GetProperty("phase").GetString());
                Assert.Equal(WeeklyPlanStatus.VotingOpen, (await db.WeeklyPlans.SingleAsync()).Status);
                // Optional isolated-host lease for the lead's final live contract verification.
                var holdFile = Environment.GetEnvironmentVariable("WFS_VOTING_VERIFY_HOLD_FILE");
                if (!string.IsNullOrWhiteSpace(holdFile))
                {
                    if (!server.HasExited) { server.Kill(entireProcessTree: true); await server.WaitForExitAsync(); }
                    await File.WriteAllTextAsync(holdFile, app.HttpAddress);
                    var deadline = DateTimeOffset.UtcNow.AddMinutes(10);
                    while (File.Exists(holdFile) && DateTimeOffset.UtcNow < deadline) await Task.Delay(500);
                }
            }
            finally { if (!browser.HasExited) browser.Kill(entireProcessTree: true); }
        }
        finally { if (!server.HasExited) { server.Kill(entireProcessTree: true); await server.WaitForExitAsync(); } }
    }

    private static async Task<string> ReadProgress(StreamReader reader, string path)
    {
        var text = new StringBuilder();
        while (await reader.ReadLineAsync() is { } line)
        {
            text.AppendLine(line);
            await File.AppendAllTextAsync(path, line + Environment.NewLine);
        }
        return text.ToString();
    }

    private sealed class TestClock : IClock
    {
        public DateTimeOffset UtcNow => new(2026, 10, 12, 12, 0, 0, TimeSpan.Zero);
    }
}
