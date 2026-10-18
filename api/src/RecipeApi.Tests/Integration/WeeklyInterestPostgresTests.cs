using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Services.Processors;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

namespace RecipeApi.Tests.Integration;

public class WeeklyInterestPostgresTests(Xunit.Abstractions.ITestOutputHelper output) : IAsyncLifetime
{
    private readonly string database = $"wfs_interest_test_{Guid.NewGuid():N}";
    private NpgsqlConnection admin = null!;
    private string connection = null!;
    private RecipeDbContext db = null!;
    private readonly IClock clock = new TestClock();
    private readonly DeploymentCalendar calendar = new(new ConfigurationManager());
    private readonly Guid recipe = Guid.NewGuid();
    private readonly Guid member = Guid.NewGuid();

    public async Task InitializeAsync()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        admin = new(settings.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        settings.Database = database;
        connection = settings.ConnectionString;
        db = Context();
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !File.Exists(Path.Combine(root.FullName, "database", "schema.sql"))) root = root.Parent;
        await using var schemaConnection = new NpgsqlConnection(connection);
        await schemaConnection.OpenAsync();
        await new NpgsqlCommand(await File.ReadAllTextAsync(Path.Combine(root!.FullName, "database", "schema.sql")), schemaConnection).ExecuteNonQueryAsync();
        db.Recipes.Add(new Recipe { Id = recipe, Name = "Supper", IsReady = true });
        db.FamilyMembers.Add(new FamilyMember { Id = member, Name = "Family" });
        await db.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        if (db is not null) await db.DisposeAsync();
        if (admin is null) return;
        if (admin.State == System.Data.ConnectionState.Open)
            await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync();
        await admin.DisposeAsync();
    }

    private RecipeDbContext Context() => new(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(connection).Options);
    private ScheduleService Schedule(RecipeDbContext context, IScheduleEventPublisher? publisher = null) =>
        new(context, NullLogger<ScheduleService>.Instance, publisher ?? Mock.Of<IScheduleEventPublisher>(), null!, clock, calendar, RecipeApi.Tests.Infrastructure.TestHistoricalInterest.Create(context, clock, calendar));
    private DiscoveryService Voting(RecipeDbContext context) => new(context, Mock.Of<IScheduleEventPublisher>(), clock, calendar, RecipeApi.Tests.Infrastructure.TestHistoricalInterest.Create(context, clock, calendar));

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public async Task LiveBrowser_WeeklyInterestOrderingAndClose()
    {
        {
            var settings = new NpgsqlConnectionStringBuilder(connection);
            var pwaUrl = $"http://127.0.0.1:{DeploymentCalendarPostgresTests.FreePort()}";
            await using var factory = await DeploymentCalendarPostgresTests.CreateFactory(settings, pwaUrl, new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = clock.UtcNow });
            var live = await db.Recipes.SingleAsync();
            live.Name = "Live family supper";
            live.IsDiscoverable = true;
            live.MealTypes = ["Supper"];
            var historical = new Recipe { Name = "Historical family supper", IsReady = true, IsDiscoverable = true, MealTypes = ["Supper"] };
            db.Recipes.Add(historical);
            db.RecipeVotes.Add(new RecipeVote { RecipeId = recipe, FamilyMemberId = factory.DefaultFamilyMemberId, Vote = VoteType.Like });
            db.WeeklyHouseholdInterests.Add(new WeeklyHouseholdInterest { RecipeId = historical.Id, WeekStartDate = new(2026, 10, 5), PositiveCount = 2, CapturedAt = clock.UtcNow, CloseId = Guid.NewGuid() });
            await db.SaveChangesAsync();
            var root = DeploymentCalendarPostgresTests.RepositoryRoot();
            var pwa = new ProcessStartInfo("node") { WorkingDirectory = Path.Combine(root, "pwa"), RedirectStandardOutput = true, RedirectStandardError = true };
            foreach (var arg in new[] { "node_modules/next/dist/bin/next", "dev", "-H", "127.0.0.1", "-p", new Uri(pwaUrl).Port.ToString() }) pwa.ArgumentList.Add(arg);
            DeploymentCalendarPostgresTests.ConfigureEnvironment(pwa, factory.HttpAddress, pwaUrl);
            using var server = Process.Start(pwa)!;
            server.OutputDataReceived += (_, e) => { if (e.Data is not null) output.WriteLine(e.Data); };
            server.ErrorDataReceived += (_, e) => { if (e.Data is not null) output.WriteLine(e.Data); };
            server.BeginOutputReadLine(); server.BeginErrorReadLine();
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
                output.WriteLine($"API {factory.HttpAddress}; PWA {pwaUrl}; DB {settings.Database}; clock 2026-10-12T12:00Z; zone America/Toronto");
                var acceptance = new ProcessStartInfo("task") { WorkingDirectory = root, RedirectStandardOutput = true, RedirectStandardError = true };
                foreach (var arg in new[] { "test:e2e", "--", "weekly-interest-live.spec.ts" }) acceptance.ArgumentList.Add(arg);
                DeploymentCalendarPostgresTests.ConfigureEnvironment(acceptance, factory.HttpAddress, pwaUrl);
                using var browser = Process.Start(acceptance)!;
                var stdout = browser.StandardOutput.ReadToEndAsync();
                var stderr = browser.StandardError.ReadToEndAsync();
                try
                {
                    await browser.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(3));
                    output.WriteLine(await stdout); output.WriteLine(await stderr);
                    Assert.Equal(0, browser.ExitCode);
                    db.ChangeTracker.Clear();
                    var captured = await db.WeeklyHouseholdInterests.SingleAsync(x => x.WeekStartDate == new DateOnly(2026, 10, 12));
                    Assert.Equal(recipe, captured.RecipeId);
                    Assert.True(captured.Selected);
                    Assert.Equal(1, captured.PositiveCount);
                    Assert.Empty(await db.RecipeVotes.ToListAsync());
                    Assert.Equal(CalendarEventStatus.Locked, (await db.CalendarEvents.SingleAsync()).Status);
                }
                finally
                {
                    if (!browser.HasExited) browser.Kill(entireProcessTree: true);
                    await browser.WaitForExitAsync();
                }
            }
            finally
            {
                if (!server.HasExited) server.Kill(entireProcessTree: true);
                await server.WaitForExitAsync();
            }
        }
    }

    [PostgresFact]
    public async Task LegacyMultipleOpenWeeks_ExplicitOpenAdoptsOneWithoutDiscardingVotesOrInventingHistory()
    {
        db.WeeklyPlans.AddRange(new WeeklyPlan { WeekStartDate = new(2026, 10, 5), Status = WeeklyPlanStatus.VotingOpen },
            new WeeklyPlan { WeekStartDate = new(2026, 10, 12), Status = WeeklyPlanStatus.VotingOpen });
        db.RecipeVotes.Add(new RecipeVote { RecipeId = recipe, FamilyMemberId = member, Vote = VoteType.Like });
        await db.SaveChangesAsync();
        await Schedule(db).OpenVotingAsync(0);
        Assert.Equal(1, await db.WeeklyPlans.CountAsync(p => p.Status == WeeklyPlanStatus.VotingOpen));
        Assert.All(await db.WeeklyPlans.ToListAsync(), p => Assert.True(p.RequiresRoundIdentity));
        Assert.Equal(1, await db.RecipeVotes.CountAsync());
        Assert.Empty(await db.WeeklyHouseholdInterests.ToListAsync());
        await Assert.ThrowsAsync<VotingConflictException>(() => Schedule(db).LockScheduleAsync(0));
    }

    [PostgresFact]
    public async Task AdditiveCompatibility_IsRepeatable_PreservesVotesAndUnknownLegacyOff()
    {
        await using var sql = new NpgsqlConnection(connection);
        await sql.OpenAsync();
        await new NpgsqlCommand("""
            DROP VIEW vw_discovery_recipes;
            DROP TABLE weekly_household_interest;
            DROP TABLE voting_round_state;
            ALTER TABLE recipes DROP COLUMN rotation_human_off, DROP COLUMN rotation_source, DROP COLUMN cooked_suppressed, DROP COLUMN supper_suitable;
            ALTER TABLE weekly_plans DROP COLUMN voting_round_id, DROP COLUMN last_closed_round_id, DROP COLUMN requires_round_identity;
            ALTER TABLE recipe_search_affinity_facts DROP COLUMN live_vote_contribution;
            """, sql).ExecuteNonQueryAsync();
        await using (var insert = new NpgsqlCommand("INSERT INTO recipe_votes(recipe_id,family_member_id,vote) VALUES (@recipe,@member,1)", sql))
        {
            insert.Parameters.AddWithValue("recipe", recipe);
            insert.Parameters.AddWithValue("member", member);
            await insert.ExecuteNonQueryAsync();
        }
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !File.Exists(Path.Combine(root.FullName, "database", "compatibility.sql"))) root = root.Parent;
        var compatibility = await File.ReadAllTextAsync(Path.Combine(root!.FullName, "database", "compatibility.sql"));
        await new NpgsqlCommand(compatibility, sql).ExecuteNonQueryAsync();
        await new NpgsqlCommand(compatibility, sql).ExecuteNonQueryAsync();
        db.ChangeTracker.Clear();
        var legacy = await db.Recipes.SingleAsync();
        Assert.False(legacy.IsDiscoverable);
        Assert.False(legacy.RotationHumanOff);
        Assert.Equal("Unknown", legacy.RotationSource);
        Assert.Equal(1, await db.RecipeVotes.CountAsync());
        Assert.Empty(await db.WeeklyHouseholdInterests.ToListAsync());
    }

    [PostgresFact]
    public async Task HistoricalTies_RankBeforePagination_AndChangedHistoryRequiresRestart()
    {
        (await db.Recipes.SingleAsync()).IsReady = false;
        var old = new Recipe { Name = "Older", Category = "Supper", IsReady = true, IsDiscoverable = true, CreatedAt = clock.UtcNow.AddDays(-5) };
        var newest = new Recipe { Name = "Newest", Category = "Supper", IsReady = true, IsDiscoverable = true, CreatedAt = clock.UtcNow };
        var selected = new Recipe { Name = "Selected history", Category = "Supper", IsReady = true, IsDiscoverable = true, CreatedAt = clock.UtcNow.AddDays(-1) };
        db.Recipes.AddRange(old, newest, selected);
        db.WeeklyHouseholdInterests.AddRange(new WeeklyHouseholdInterest { RecipeId = old.Id, WeekStartDate = new(2026, 10, 5), PositiveCount = 1 },
            new WeeklyHouseholdInterest { RecipeId = selected.Id, WeekStartDate = new(2026, 10, 5), PositiveCount = 5, Selected = true });
        await db.SaveChangesAsync();
        Assert.Equal(old.Id, (await Voting(db).GetRecipesForDiscoveryAsync(member, "Supper"))[0].Id);
        var history = new HistoricalInterestService(db, clock, calendar, new(new ConfigurationManager()));
        var search = new RecipeSearchService(clock, history, db, Schedule(db), continuationStore: new(clock));
        var browse = await search.SearchAsync(new RecipeSearchRequestDto { Query = "", Limit = 1 });
        Assert.Null(browse.TopPick);
        Assert.Equal(old.Id, Assert.Single(browse.Results).Id);
        Assert.NotNull(browse.NextCursor);
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(clock, new() { ["Tests:PostgresConnectionString"] = connection });
        using var client = app.CreateAuthenticatedClient();
        var first = await client.GetFromJsonAsync<RecipeListResponseDto>("/api/recipes?order=explore&limit=1");
        Assert.Equal(old.Id, Assert.Single(first!.Recipes).Id);
        await Schedule(db).OpenVotingAsync(-1);
        Assert.Equal(HttpStatusCode.Conflict, (await client.GetAsync($"/api/recipes?order=explore&limit=1&page=2&historyGeneration={first.HistoryGeneration}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.GetAsync("/api/recipes?order=explore&limit=1&page=2")).StatusCode);
        await Assert.ThrowsAsync<RecipeSearchContinuationExpiredException>(() => search.SearchAsync(new RecipeSearchRequestDto { Query = "", Limit = 1, ContinuationToken = browse.NextCursor }));
        var restarted = await client.GetFromJsonAsync<RecipeListResponseDto>("/api/recipes?order=explore&limit=1");
        Assert.Equal(newest.Id, Assert.Single(restarted!.Recipes).Id);
    }

    [PostgresFact]
    public async Task QuickFind_EarlyLiveThenHistoryThenFallback_FiltersBeforeFive()
    {
        var candidates = Enumerable.Range(1, 6).Select(i => new Recipe
        {
            Id = Guid.Parse($"00000000-0000-0000-0000-{i:000000000000}"), Name = $"Candidate {i}",
            Category = "Supper", IsReady = true, IsDiscoverable = i >= 5
        }).ToArray();
        db.Recipes.AddRange(candidates);
        db.RecipeVotes.AddRange(candidates.Take(2).Select(r => new RecipeVote { RecipeId = r.Id, FamilyMemberId = member, Vote = VoteType.Like }));
        db.WeeklyHouseholdInterests.AddRange(candidates.Take(4).Select(r => new WeeklyHouseholdInterest
        {
            RecipeId = r.Id, WeekStartDate = new(2026, 10, 5), PositiveCount = 3, Selected = false,
            CapturedAt = clock.UtcNow, CloseId = Guid.NewGuid()
        }));
        await db.SaveChangesAsync();
        var results = await Schedule(db).FillTheGapAsync();
        Assert.Equal(candidates.Take(5).Select(r => r.Id), results.Select(r => r.Id));
        Assert.All(results.Take(2), r => Assert.Equal(1, r.VoteCount));
        Assert.All(results.Skip(2), r => Assert.Null(r.VoteCount));
    }

    [PostgresFact]
    public async Task ClockCooldown_FinalizedCivilDatesSurviveTimezoneAndWeekBoundaries()
    {
        foreach (var zone in new[] { "UTC", "America/Toronto" })
        foreach (var monday in new[] { new DateOnly(2026, 10, 12), new DateOnly(2026, 11, 2), new DateOnly(2026, 3, 9) })
        {
            db.CalendarEvents.RemoveRange(db.CalendarEvents);
            await db.SaveChangesAsync();
            var calendarClock = new DeploymentCalendarIntegrationTests.CalendarClock
            { UtcNow = new DateTimeOffset(monday.ToDateTime(new TimeOnly(12, 0)), TimeSpan.Zero) };
            var localCalendar = new DeploymentCalendar(new ConfigurationManager { ["Calendar:TimeZone"] = zone });
            var cutoff = monday.AddDays(-28);
            var rows = Enumerable.Range(-1, 3).Select(offset => new Recipe
            { Name = $"{zone} {monday} {offset}", Category = "Supper", IsReady = true, IsDiscoverable = true }).ToArray();
            db.Recipes.AddRange(rows);
            for (var i = 0; i < rows.Length; i++)
                db.CalendarEvents.Add(new CalendarEvent { RecipeId = rows[i].Id, Date = cutoff.AddDays(i - 1), Status = CalendarEventStatus.Planned });
            await db.SaveChangesAsync();
            var schedule = new ScheduleService(db, NullLogger<ScheduleService>.Instance, Mock.Of<IScheduleEventPublisher>(), null!, calendarClock, localCalendar, RecipeApi.Tests.Infrastructure.TestHistoricalInterest.Create(db, calendarClock, localCalendar));
            await schedule.FinalizeOverdueMealsAsync();
            for (var i = 0; i < rows.Length; i++)
            {
                await db.Entry(rows[i]).ReloadAsync();
                Assert.Equal(new DateTimeOffset(cutoff.AddDays(i - 1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero), rows[i].LastCookedDate);
                Assert.True(rows[i].IsDiscoverable); // Finalization does not recompute cooldown.
            }
            var processor = new ReconcileRecipeRotationProcessor(db, calendarClock, localCalendar,
                new(new ConfigurationManager()), Mock.Of<IScheduleEventPublisher>(), NullLogger<ReconcileRecipeRotationProcessor>.Instance);
            await processor.ExecuteAsync(new WorkflowTask(), default);
            Assert.False(rows[0].CookedSuppressed);
            Assert.True(rows[1].CookedSuppressed, $"Exact civil cutoff lost in {zone}, current Monday {monday}");
            Assert.True(rows[2].CookedSuppressed);
            rows[2].RotationHumanOff = true;
            await db.SaveChangesAsync();
            calendarClock.UtcNow = calendarClock.UtcNow.AddDays(7);
            Assert.True(rows[1].CookedSuppressed); // Aging alone does not reconcile.
            await processor.ExecuteAsync(new WorkflowTask(), default);
            Assert.False(rows[1].CookedSuppressed);
            Assert.True(rows[1].IsDiscoverable);
            Assert.False(rows[2].IsDiscoverable);
            Assert.True(rows[2].RotationHumanOff);
        }
    }

    [PostgresFact]
    public async Task ClockCooldown_LegacyInstantRequiresMatchingCivilEvidence()
    {
        var localCalendar = new DeploymentCalendar(new ConfigurationManager { ["Calendar:TimeZone"] = "America/Toronto" });
        var row = await db.Recipes.SingleAsync();
        row.Category = "Supper";
        row.LastCookedDate = new DateTimeOffset(2026, 9, 14, 0, 0, 0, TimeSpan.Zero);
        var processor = new ReconcileRecipeRotationProcessor(db, clock, localCalendar,
            new(new ConfigurationManager()), Mock.Of<IScheduleEventPublisher>(), NullLogger<ReconcileRecipeRotationProcessor>.Instance);
        await processor.ExecuteAsync(new WorkflowTask(), default);
        Assert.False(row.CookedSuppressed); // Imported midnight is still Sunday locally.
        db.CalendarEvents.Add(new CalendarEvent { RecipeId = row.Id, Date = new(2026, 9, 15), Status = CalendarEventStatus.Cooked });
        await db.SaveChangesAsync();
        await processor.ExecuteAsync(new WorkflowTask(), default);
        Assert.False(row.CookedSuppressed); // Unmatched event must not replace imported value.
        row.LastCookedDate = new DateTimeOffset(2026, 9, 14, 4, 0, 0, TimeSpan.Zero);
        await db.SaveChangesAsync();
        await processor.ExecuteAsync(new WorkflowTask(), default);
        Assert.True(row.CookedSuppressed); // Real Toronto Monday instant remains Monday.
    }

    [PostgresFact]
    public async Task Dreaming_UsesCalendarCutoff_AndPreservesHumanOffAcrossExplicitReturn()
    {
        var recent = await db.Recipes.SingleAsync();
        recent.Category = "Supper";
        recent.IsDiscoverable = true;
        recent.LastCookedDate = new DateTimeOffset(2026, 9, 14, 0, 0, 0, TimeSpan.Zero);
        var aged = new Recipe { Name = "Aged", Category = "Supper", IsReady = true, LastCookedDate = new DateTimeOffset(2026, 9, 13, 23, 59, 0, TimeSpan.Zero) };
        var unknown = new Recipe { Name = "Never eaten", Category = "Supper", IsReady = true };
        db.Recipes.AddRange(aged, unknown);
        await db.SaveChangesAsync();
        var processor = new ReconcileRecipeRotationProcessor(db, clock, calendar, new(new ConfigurationManager()), Mock.Of<IScheduleEventPublisher>(), NullLogger<ReconcileRecipeRotationProcessor>.Instance);
        await processor.ExecuteAsync(new WorkflowTask(), default);
        Assert.False(recent.IsDiscoverable);
        Assert.True(recent.CookedSuppressed);
        Assert.True(aged.IsDiscoverable);
        Assert.True(unknown.IsDiscoverable);
        Assert.Equal("Dreaming", unknown.RotationSource);
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(clock, new() { ["Tests:PostgresConnectionString"] = connection });
        using var client = app.CreateAuthenticatedClient();
        (await client.PatchAsJsonAsync($"/api/recipes/{recipe}", new { isDiscoverable = true })).EnsureSuccessStatusCode();
        await db.Entry(recent).ReloadAsync();
        Assert.True(recent.IsDiscoverable);
        Assert.False(recent.CookedSuppressed);
        await processor.ExecuteAsync(new WorkflowTask(), default);
        Assert.False(recent.IsDiscoverable);
        (await client.PatchAsJsonAsync($"/api/recipes/{recipe}", new { isDiscoverable = false })).EnsureSuccessStatusCode();
        await db.Entry(recent).ReloadAsync();
        Assert.True(recent.RotationHumanOff);
        Assert.Equal("Human", recent.RotationSource);
        recent.LastCookedDate = null;
        await db.SaveChangesAsync();
        await processor.ExecuteAsync(new WorkflowTask(), default);
        Assert.False(recent.IsDiscoverable);
        Assert.Equal("Human", recent.RotationSource);
    }

    [PostgresFact]
    public async Task Dreaming_RereadsStaleTrackedIntent_AndConcurrentHumanOffWins()
    {
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(clock,
            new() { ["Tests:PostgresConnectionString"] = connection });
        using var client = app.CreateAuthenticatedClient();
        var initial = await db.Recipes.SingleAsync();
        initial.Category = "Supper";
        initial.IsDiscoverable = false;
        await db.SaveChangesAsync();
        await using var worker = Context();
        await worker.Recipes.SingleAsync(x => x.Id == recipe); // Deliberately tracked before Human OFF.
        (await client.PatchAsJsonAsync($"/api/recipes/{recipe}", new { isDiscoverable = false })).EnsureSuccessStatusCode();
        var processor = new ReconcileRecipeRotationProcessor(worker, clock, calendar, new(new ConfigurationManager()),
            Mock.Of<IScheduleEventPublisher>(), NullLogger<ReconcileRecipeRotationProcessor>.Instance);
        await processor.ExecuteAsync(new WorkflowTask(), default);
        db.ChangeTracker.Clear();
        Assert.True((await db.Recipes.SingleAsync()).RotationHumanOff);
        Assert.False((await db.Recipes.SingleAsync()).IsDiscoverable);
        await Task.WhenAll(processor.ExecuteAsync(new WorkflowTask(), default),
            client.PatchAsJsonAsync($"/api/recipes/{recipe}", new { isDiscoverable = false }));
        db.ChangeTracker.Clear();
        var persisted = await db.Recipes.SingleAsync();
        Assert.True(persisted.RotationHumanOff);
        Assert.Equal("Human", persisted.RotationSource);
        Assert.False(persisted.IsDiscoverable);
    }

    [PostgresFact]
    public async Task Dreaming_PublicationFailureKeepsCommittedRotation_AndRetryConverges()
    {
        var row = await db.Recipes.SingleAsync();
        row.IsDiscoverable = true;
        row.LastCookedDate = clock.UtcNow;
        var later = new Recipe { Id = Guid.Parse("ffffffff-ffff-ffff-ffff-ffffffffffff"), Name = "Later item", IsReady = true, Category = "Supper", IsDiscoverable = true, LastCookedDate = clock.UtcNow };
        db.Recipes.Add(later);
        await db.SaveChangesAsync();
        var publisher = new Mock<IScheduleEventPublisher>();
        publisher.SetupSequence(x => x.PublishAllSuggestionsInvalidatedAsync())
            .ThrowsAsync(new IOException("injected publication failure"))
            .Returns(Task.CompletedTask);
        var processor = new ReconcileRecipeRotationProcessor(db, clock, calendar, new(new ConfigurationManager()),
            publisher.Object, NullLogger<ReconcileRecipeRotationProcessor>.Instance);
        await Assert.ThrowsAsync<IOException>(() => processor.ExecuteAsync(new WorkflowTask(), default));
        db.ChangeTracker.Clear();
        Assert.True((await db.Recipes.SingleAsync(x => x.Id == recipe)).CookedSuppressed);
        Assert.False((await db.Recipes.SingleAsync(x => x.Id == recipe)).IsDiscoverable);
        Assert.True((await db.Recipes.SingleAsync(x => x.Id == later.Id)).IsDiscoverable);
        await processor.ExecuteAsync(new WorkflowTask(), default);
        db.ChangeTracker.Clear();
        Assert.All(await db.Recipes.ToListAsync(), r => { Assert.True(r.CookedSuppressed); Assert.False(r.IsDiscoverable); });
        await processor.ExecuteAsync(new WorkflowTask(), default);
        publisher.Verify(x => x.PublishAllSuggestionsInvalidatedAsync(), Times.Exactly(2));
    }

    [PostgresFact]
    public async Task HistoryAndHumanIntent_RoundTripThroughBackupAndDemoReset()
    {
        var row = await db.Recipes.SingleAsync();
        row.RotationHumanOff = true;
        row.RotationSource = "Human";
        row.ImageCount = 1;
        var deleted = new Recipe { Name = "Deleted history dependency", IsReady = false, DeletedAt = clock.UtcNow };
        db.Recipes.Add(deleted);
        db.WeeklyHouseholdInterests.Add(new WeeklyHouseholdInterest { RecipeId = deleted.Id, WeekStartDate = new(2026, 10, 5), PositiveCount = 1, CapturedAt = clock.UtcNow, CloseId = Guid.NewGuid() });
        db.WeeklyHouseholdInterests.Add(new WeeklyHouseholdInterest { RecipeId = recipe, WeekStartDate = new(2026, 10, 5), PositiveCount = 2, CapturedAt = clock.UtcNow, CloseId = Guid.NewGuid() });
        await db.SaveChangesAsync();
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(clock,
            new() { ["Tests:PostgresConnectionString"] = connection });
        async Task Manage(Func<ManagementService, Task> action)
        {
            using var scope = app.Services.CreateScope();
            await action(scope.ServiceProvider.GetRequiredService<ManagementService>());
        }
        async Task MutateSnapshot()
        {
            await db.WeeklyHouseholdInterests.ExecuteDeleteAsync();
            await db.Recipes.Where(x => x.Id == recipe).ExecuteUpdateAsync(s => s
                .SetProperty(x => x.RotationHumanOff, false)
                .SetProperty(x => x.RotationSource, "Unknown")
                .SetProperty(x => x.IsDiscoverable, true));
        }
        async Task AssertSnapshot()
        {
            db.ChangeTracker.Clear();
            Assert.Equal(2, await db.WeeklyHouseholdInterests.CountAsync());
            Assert.Equal(2, (await db.WeeklyHouseholdInterests.SingleAsync(x => x.RecipeId == recipe)).PositiveCount);
            Assert.True((await db.Recipes.SingleAsync(x => x.Id == recipe)).RotationHumanOff);
            Assert.Equal("Human", (await db.Recipes.SingleAsync(x => x.Id == recipe)).RotationSource);
            var tombstone = await db.Recipes.IgnoreQueryFilters().SingleAsync(x => x.Id == deleted.Id);
            Assert.NotNull(tombstone.DeletedAt);
            Assert.False(tombstone.IsReady);
        }
        await Manage(m => m.BackupAsync());
        await MutateSnapshot();
        await Manage(m => m.RestoreAsync());
        await Manage(m => m.RestoreAsync());
        await AssertSnapshot();
        await Manage(m => m.CaptureDemoStateAsync());
        await MutateSnapshot();
        await Manage(m => m.RestoreDemoStateAsync());
        await AssertSnapshot();
        Assert.Empty(await db.RecipeVotes.ToListAsync());
        Assert.True((await db.VotingRoundStates.SingleAsync()).RequiresRoundIdentity);
    }

    [PostgresFact]
    public async Task ProtectedHttp_EarlyVotesSurviveOpening_CloseCaptures_StaleReplayPreservesNewVotes()
    {
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(clock,
            new() { ["Tests:PostgresConnectionString"] = connection });
        using var unauthorized = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await unauthorized.PostAsync("/api/schedule/lock", null)).StatusCode);
        using var client = app.CreateAuthenticatedClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", member.ToString());
        (await client.PostAsJsonAsync($"/api/discovery/{recipe}/vote", new { vote = 1 })).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/schedule/voting/open", null)).EnsureSuccessStatusCode();
        Assert.Equal(1, await db.RecipeVotes.CountAsync());
        var response = await client.GetFromJsonAsync<JsonElement>("/api/schedule");
        var opened = response.GetProperty("data").Deserialize<ScheduleDays>();
        Assert.NotNull(opened!.VotingRoundId);
        var closeUrl = $"/api/schedule/lock?referenceWeekStartDate=2026-10-12&votingRoundId={opened.VotingRoundId}";
        (await client.PostAsync(closeUrl, null)).EnsureSuccessStatusCode();
        Assert.Equal(1, (await db.WeeklyHouseholdInterests.SingleAsync()).PositiveCount);
        (await client.PostAsJsonAsync($"/api/discovery/{recipe}/vote", new { vote = 1 })).EnsureSuccessStatusCode();
        (await client.PostAsync(closeUrl, null)).EnsureSuccessStatusCode();
        Assert.Equal(1, await db.RecipeVotes.CountAsync());
        (await client.PostAsync("/api/schedule/voting/open", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync("/api/schedule/lock", null)).StatusCode);
        Assert.Equal(1, await db.RecipeVotes.CountAsync());
    }

    [PostgresFact]
    public async Task CloseAndVoteRace_NoPositiveVoteIsLost_AndReplayPreservesEarlyVotes()
    {
        await Schedule(db).OpenVotingAsync(0);
        var round = (await Schedule(db).GetScheduleAsync(0)).VotingRoundId;
        await using var closeContext = Context();
        await using var voteContext = Context();
        await Task.WhenAll(Schedule(closeContext).LockScheduleAsync(0, votingRoundId: round),
            Voting(voteContext).SubmitVoteAsync(recipe, member, VoteType.Like));
        db.ChangeTracker.Clear();
        var captured = await db.WeeklyHouseholdInterests.SumAsync(row => (int?)row.PositiveCount) ?? 0;
        var live = await db.RecipeVotes.CountAsync();
        Assert.Equal(1, captured + live);
        await Voting(db).SubmitVoteAsync(recipe, member, VoteType.Like);
        await Schedule(db).LockScheduleAsync(0, votingRoundId: round);
        Assert.Equal(1, await db.RecipeVotes.CountAsync());
    }

    [PostgresFact]
    public async Task FailedHistoryInsert_RollsBackPlanAndVoteClear()
    {
        await Schedule(db).OpenVotingAsync(0);
        await Voting(db).SubmitVoteAsync(recipe, member, VoteType.Like);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE FUNCTION reject_history() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'injected history failure'; END $$;
            CREATE TRIGGER reject_history BEFORE INSERT ON weekly_household_interest
            FOR EACH ROW EXECUTE FUNCTION reject_history();
            """);
        await Assert.ThrowsAsync<DbUpdateException>(() => Schedule(db).LockScheduleAsync(0));
        db.ChangeTracker.Clear();
        Assert.Equal(1, await db.RecipeVotes.CountAsync());
        Assert.Empty(await db.WeeklyHouseholdInterests.ToListAsync());
        Assert.Equal(WeeklyPlanStatus.VotingOpen, (await db.WeeklyPlans.SingleAsync()).Status);
    }

    [PostgresFact]
    public async Task ConcurrentCloseAndPublicationFailure_HaveOneDurableOutcome()
    {
        await Schedule(db).OpenVotingAsync(0);
        await Voting(db).SubmitVoteAsync(recipe, member, VoteType.Like);
        var round = (await Schedule(db).GetScheduleAsync(0)).VotingRoundId;
        var publisher = new Mock<IScheduleEventPublisher>();
        publisher.Setup(x => x.PublishWeekUpdatedAsync(It.IsAny<RecipeApi.Dto.ScheduleDays>(), It.IsAny<string?>(), It.IsAny<int?>()))
            .ThrowsAsync(new IOException("injected SSE failure"));
        await Assert.ThrowsAsync<IOException>(() => Schedule(db, publisher.Object).LockScheduleAsync(0, votingRoundId: round));
        await using var first = Context();
        await using var second = Context();
        await Task.WhenAll(Schedule(first).LockScheduleAsync(0, votingRoundId: round), Schedule(second).LockScheduleAsync(0, votingRoundId: round));
        Assert.Equal(1, await db.WeeklyHouseholdInterests.CountAsync());
        Assert.Equal(1, (await db.WeeklyHouseholdInterests.SingleAsync()).PositiveCount);
        Assert.Empty(await db.RecipeVotes.ToListAsync());
    }

    private sealed class TestClock : IClock
    {
        public DateTimeOffset UtcNow => new(2026, 10, 12, 12, 0, 0, TimeSpan.Zero);
    }
}
