using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public partial class TomorrowPushPostgresTests(ITestOutputHelper output)
{
    internal static readonly DateOnly Sunday = new(2026, 10, 11);
    internal static readonly Guid Selected = Guid.Parse("660e8400-e29b-41d4-a716-446655440011");
    internal static readonly Guid Other = Guid.Parse("660e8400-e29b-41d4-a716-446655440012");
    internal static object Request(string? disposition = null) => new {
        weekOffset = 0, fromIndex = 6, toIndex = 0, targetWeekOffset = 1,
        recipeId = Selected, intent = "tomorrow", sourceDisposition = disposition,
    };
    internal const string MoveUrl = "/api/schedule/move?referenceWeekStartDate=2026-10-05";

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task TomorrowPush_SundayConservesEveryOccurrenceAcrossFourWeeks()
    {
        await WithDatabase(async settings => {
            await using var factory = await CreateFactory(settings);
            await Seed(factory);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var before = await db.CalendarEvents.AsNoTracking().OrderBy(e => e.Date).ThenBy(e => e.MealSlot).ToListAsync();
            using var client = factory.CreateAuthenticatedClient();
            var response = await client.PostAsJsonAsync(MoveUrl, Request());
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var result = json.RootElement.GetProperty("data");
            Assert.True(result.TryGetProperty("moved", out var moved) && moved.GetBoolean(), "Tomorrow must confirm a committed move, not legacy completion.");
            Assert.True(result.GetProperty("refreshComplete").GetBoolean());
            Assert.Equal(new[] { "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26" }, result.GetProperty("affectedWeekStartDates").EnumerateArray().Select(e => e.GetString()));
            var after = await db.CalendarEvents.AsNoTracking().ToListAsync();
            Assert.Equal(before.Count, after.Count);
            foreach (var original in before) {
                var actual = Assert.Single(after, e => e.Id == original.Id);
                Assert.Equal(original.MealSlot == 0 ? original.Date.AddDays(1) : original.Date, actual.Date);
                Assert.Equal(original.RecipeId, actual.RecipeId);
                Assert.Equal(original.Status, actual.Status);
                Assert.Equal(original.MealSlot, actual.MealSlot);
                Assert.Equal(original.VoteCount, actual.VoteCount);
                Assert.Equal(original.CandidateIds, actual.CandidateIds);
                Assert.Equal(original.NonCookingKind, actual.NonCookingKind);
                Assert.Equal(original.NonCookingLabel, actual.NonCookingLabel);
            }
            Assert.Equal(2, after.Count(e => e.RecipeId == Selected && e.MealSlot == 0));
            foreach (var monday in new[] { new DateOnly(2026,10,5), new(2026,10,12), new(2026,10,19), new(2026,10,26) }) {
                var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(p => p.WeekStartDate == monday);
                Assert.NotNull(plan.GroceryItems);
                if (monday == new DateOnly(2026,10,12)) {
                    Assert.Equal(WeeklyPlanStatus.Locked, plan.Status);
                    Assert.True(JsonDocument.Parse(plan.GroceryState!).RootElement.GetProperty("carrot").GetBoolean());
                }
            }
        });
    }

    [Fact]
    public async Task TomorrowPush_ExplicitIntentDoesNotSilentlySwapTheSource()
    {
        await using var factory = await DeploymentCalendarIntegrationTests.CreateAsync();
        await Seed(factory);
        using var client = factory.CreateAuthenticatedClient();
        var response = await client.PostAsJsonAsync(MoveUrl, Request());
        response.EnsureSuccessStatusCode();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.Equal(Selected, (await db.CalendarEvents.SingleAsync(e => e.Date == Sunday.AddDays(1) && e.MealSlot == 0)).RecipeId);
        Assert.False(await db.CalendarEvents.AnyAsync(e => e.Date == Sunday && e.MealSlot == 0));
        Assert.Equal(Other, (await db.CalendarEvents.SingleAsync(e => e.Date == Sunday.AddDays(15) && e.MealSlot == 0)).RecipeId);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task TomorrowPush_ConflictsLeaveAllPersistedContentUnchanged()
    {
        foreach (var position in new[] { 0, 1, 7, 14, -1, -2 })
        await WithDatabase(async settings => {
            await using var factory = await CreateFactory(settings);
            await Seed(factory);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var source = await db.CalendarEvents.SingleAsync(e => e.Date == Sunday && e.MealSlot == 0);
            if (position == -1) source.RecipeId = Other;
            else if (position == -2) source.Status = CalendarEventStatus.AwaitingConsensus;
            else (await db.CalendarEvents.SingleAsync(e => e.Date == Sunday.AddDays(position) && e.MealSlot == 0)).Status = CalendarEventStatus.Cooked;
            await db.SaveChangesAsync();
            var before = await Snapshot(db);
            using var client = factory.CreateAuthenticatedClient();
            var response = await client.PostAsJsonAsync(MoveUrl, Request("order_in"));
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal(before, await Snapshot(db));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task TomorrowPush_ConstraintFailureRollsBackIntermediateDateUpdates()
    {
        await WithDatabase(async settings => {
            await using var factory = await CreateFactory(settings);
            await Seed(factory);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            await db.Database.ExecuteSqlRawAsync("ALTER TABLE calendar_events ADD CONSTRAINT tomorrow_failure CHECK (date <> DATE '2026-10-23') NOT VALID");
            var before = await Snapshot(db);
            using var client = factory.CreateAuthenticatedClient();
            var response = await client.PostAsJsonAsync(MoveUrl, Request());
            Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
            Assert.Equal(before, await Snapshot(db));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task TomorrowPush_ConcurrentDuplicateMovesOnlyOnce()
    {
        await WithDatabase(async settings => {
            await using var factory = await CreateFactory(settings);
            await Seed(factory);
            using var a = factory.CreateAuthenticatedClient();
            using var b = factory.CreateAuthenticatedClient();
            var responses = await Task.WhenAll(a.PostAsJsonAsync(MoveUrl, Request()), b.PostAsJsonAsync(MoveUrl, Request()));
            Assert.Single(responses, r => r.StatusCode == HttpStatusCode.OK);
            Assert.True(responses.Any(r => r.StatusCode == HttpStatusCode.Conflict), string.Join(";", await Task.WhenAll(responses.Select(r=>r.Content.ReadAsStringAsync()))));
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            Assert.Equal(Selected, (await db.CalendarEvents.SingleAsync(e => e.Date == Sunday.AddDays(1) && e.MealSlot == 0)).RecipeId);
            Assert.Equal(15, await db.CalendarEvents.CountAsync(e => e.MealSlot == 0));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task TomorrowPush_OrderInAndLegacySkippedSourceKeepOneRecipeAndSourceDetails()
    {
        foreach (var legacy in new[] { false, true })
        await WithDatabase(async settings => {
            await using var factory = await CreateFactory(settings);
            await Seed(factory);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            if (legacy) {
                var source = await db.CalendarEvents.SingleAsync(e => e.Date == Sunday && e.MealSlot == 0);
                source.Status = CalendarEventStatus.Skipped;
                await db.SaveChangesAsync();
            }
            var nonCooking = await db.CalendarEvents.SingleAsync(e => e.Date == Sunday.AddDays(3) && e.MealSlot == 0);
            nonCooking.RecipeId = null; nonCooking.Status = CalendarEventStatus.Skipped;
            nonCooking.NonCookingKind = "custom"; nonCooking.NonCookingLabel = "Grandma's supper";
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            var response = await client.PostAsJsonAsync(MoveUrl, Request(legacy ? null : "order_in"));
            response.EnsureSuccessStatusCode();
            db.ChangeTracker.Clear();
            var original = await db.CalendarEvents.SingleAsync(e => e.Date == Sunday && e.MealSlot == 0);
            Assert.Null(original.RecipeId); Assert.Equal(CalendarEventStatus.Skipped, original.Status);
            var moved = await db.CalendarEvents.SingleAsync(e => e.Date == Sunday.AddDays(1) && e.MealSlot == 0);
            Assert.Equal(Selected, moved.RecipeId); Assert.Equal(CalendarEventStatus.Planned, moved.Status); Assert.Equal(0, moved.VoteCount);
            var shifted = await db.CalendarEvents.SingleAsync(e => e.Id == nonCooking.Id);
            Assert.Equal(Sunday.AddDays(4), shifted.Date); Assert.Equal("Grandma's supper", shifted.NonCookingLabel);
            Assert.Equal(2, await db.CalendarEvents.CountAsync(e => e.MealSlot == 0 && e.RecipeId == Selected));
        });
    }

    [Fact]
    public async Task TomorrowPush_InvalidTargetAndDispositionRejectBeforeMutation()
    {
        await using var factory = await DeploymentCalendarIntegrationTests.CreateAsync();
        await Seed(factory);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var before = await Snapshot(db);
        using var client = factory.CreateAuthenticatedClient();
        foreach (var request in new object[] {
            new { weekOffset=0, fromIndex=6, toIndex=1, targetWeekOffset=1, recipeId=Selected, intent="tomorrow" },
            new { weekOffset=0, toIndex=0, targetWeekOffset=1, recipeId=Selected, intent="tomorrow" },
            new { weekOffset=0, fromIndex=7, toIndex=0, targetWeekOffset=1, recipeId=Selected, intent="tomorrow" },
            new { weekOffset=int.MaxValue, fromIndex=6, toIndex=0, targetWeekOffset=1, recipeId=Selected, intent="tomorrow" },
            new { weekOffset=0, fromIndex=6, toIndex=0, targetWeekOffset=1, recipeId=Selected, intent="push", sourceDisposition="order_in" },
        }) Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync(MoveUrl, request)).StatusCode);
        Assert.Equal(before, await Snapshot(db));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task TomorrowPush_GroceryFailureReportsCommittedAndStillRefreshesLaterWeeks()
    {
        await WithDatabase(async settings => {
            await using var factory=await CreateFactory(settings);await Seed(factory);
            using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            await db.Database.ExecuteSqlRawAsync("CREATE FUNCTION fail_tomorrow_grocery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.week_start_date = DATE '2026-10-12' THEN RAISE EXCEPTION 'injected grocery failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_tomorrow_grocery BEFORE UPDATE OF grocery_items ON weekly_plans FOR EACH ROW EXECUTE FUNCTION fail_tomorrow_grocery()");
            using var client=factory.CreateAuthenticatedClient();var response=await client.PostAsJsonAsync(MoveUrl,Request());
            response.EnsureSuccessStatusCode();using var json=JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.True(json.RootElement.GetProperty("data").GetProperty("moved").GetBoolean());
            Assert.False(json.RootElement.GetProperty("data").GetProperty("refreshComplete").GetBoolean());
            Assert.NotNull((await db.WeeklyPlans.AsNoTracking().SingleAsync(p=>p.WeekStartDate==new DateOnly(2026,10,26))).GroceryItems);
            Assert.Equal(Selected,(await db.CalendarEvents.AsNoTracking().SingleAsync(e=>e.Date==Sunday.AddDays(1)&&e.MealSlot==0)).RecipeId);
        });
    }

    private static async Task<string> Snapshot(RecipeDbContext db) {
        db.ChangeTracker.Clear();
        return JsonSerializer.Serialize(new {
            Events = await db.CalendarEvents.AsNoTracking().OrderBy(e=>e.Id).Select(e => new { e.Id,e.Date,e.RecipeId,e.Status,e.MealSlot,e.VoteCount,e.CandidateIds,e.NonCookingKind,e.NonCookingLabel }).ToListAsync(),
            Plans = await db.WeeklyPlans.AsNoTracking().OrderBy(e=>e.Id).ToListAsync(),
        });
    }

    internal static async Task Seed(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.Recipes.AddRange(new Recipe { Id = Selected, Name = "Sunday Chicken", Ingredients = "[\"Carrot\"]", IsReady = true }, new Recipe { Id = Other, Name = "Chain Lasagna", Ingredients = "[\"Potato\"]", IsReady = true });
        for (var i=0; i<15; i++) db.CalendarEvents.Add(new CalendarEvent {
            Id = Guid.NewGuid(), Date = Sunday.AddDays(i), RecipeId = i is 0 or 4 ? Selected : Other,
            Status = i == 2 ? CalendarEventStatus.Locked : CalendarEventStatus.Planned,
            VoteCount = i, CandidateIds = [Selected, Other],
        });
        db.CalendarEvents.Add(new CalendarEvent { Date = Sunday.AddDays(2), MealSlot = 1, RecipeId = Other, VoteCount = 99 });
        db.WeeklyPlans.Add(new WeeklyPlan { Id = Guid.NewGuid(), WeekStartDate = new(2026,10,12), Status = WeeklyPlanStatus.Locked, GroceryState = "{\"carrot\":true}" });
        await db.SaveChangesAsync();
    }

    internal static Task<TestWebApplicationFactory> CreateFactory(NpgsqlConnectionStringBuilder settings) => TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(), new() {
        ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString,
    });
    internal async Task WithDatabase(Func<NpgsqlConnectionStringBuilder, Task> check)
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        var database = $"wfs_tomorrow_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(settings.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        try {
            settings.Database = database;
            await using (var connection = new NpgsqlConnection(settings.ConnectionString)) {
                await connection.OpenAsync();
                await new NpgsqlCommand(File.ReadAllText(Path.Combine(Root(), "api/database/schema.sql")), connection).ExecuteNonQueryAsync();
            }
            output.WriteLine($"Disposable database {database}, host {settings.Host}, port {settings.Port}");
            await check(settings);
        } finally { await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync(); }
    }
    internal static string Root() {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName,"Taskfile.yml"))) directory=directory.Parent;
        return directory?.FullName ?? throw new DirectoryNotFoundException();
    }
}
