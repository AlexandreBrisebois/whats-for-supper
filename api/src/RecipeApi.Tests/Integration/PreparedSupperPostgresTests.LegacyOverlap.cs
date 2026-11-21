using System.Data;
using System.Data.Common;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Moq;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class PreparedSupperPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PreparedSupper_LegacyCompletionOverlap_CannotOverwriteNewerActualHistory() => LegacyOverlap(2);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PreparedSupper_LegacySkippedOverlap_CannotOverwritePreparedStatus() => LegacyOverlap(3);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PreparedSupper_LegacyLockedOverlap_CannotOverwritePreparedStatus() => LegacyOverlap(1);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PreparedSupper_LegacyPrimaryCommitPrecedesPublicationAndStandaloneEarlyReturnsStayDurable()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var clock = new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = Tuesday };
            var publications = 0; var failPublication = false;
            await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(clock,
                new() { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString },
                configureServices: services => services.AddScoped<IScheduleEventPublisher>(provider => {
                    var db = provider.GetRequiredService<RecipeDbContext>(); var mock = new Mock<IScheduleEventPublisher>();
                    async Task Published() {
                        Assert.Null(db.Database.CurrentTransaction);
                        await db.Recipes.AsNoTracking().CountAsync();
                        Interlocked.Increment(ref publications);
                        if (failPublication) throw new IOException("Controlled post-commit publication failure");
                    }
                    mock.Setup(x => x.PublishSlotUpdatedAsync(It.IsAny<DateOnly>(), It.IsAny<ScheduleRecipeDto?>(), It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<NonCookingPlanDto?>(), It.IsAny<Guid?>())).Returns(Published);
                    mock.Setup(x => x.PublishFillTheGapInvalidatedAsync(It.IsAny<int>(), It.IsAny<DateOnly>(), It.IsAny<string?>())).Returns(Published);
                    return mock.Object;
                }));
            var recipe = await Seed(app); using var client = app.CreateAuthenticatedClient();
            // Typed non-cooking retains its existing Serializable boundary, which must end before follow-up reads.
            using var typed = await client.PostAsJsonAsync("/api/schedule/day/2026-10-17/validate", new {status=3,nonCooking=new {kind="order_in"}});
            Assert.Equal(HttpStatusCode.OK,typed.StatusCode);
            using var plain = await client.PostAsJsonAsync("/api/schedule/day/2026-10-18/validate",new {status=3}); Assert.Equal(HttpStatusCode.OK,plain.StatusCode);
            using var completed = await client.PostAsJsonAsync("/api/schedule/day/2026-10-16/validate",new {status=2,recipeId=recipe}); Assert.Equal(HttpStatusCode.OK,completed.StatusCode);
            using var scope=app.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var viewed=new Recipe{Name="Viewed standalone lunch"};db.Recipes.Add(viewed);await db.SaveChangesAsync();
            var today=await db.CalendarEvents.AsNoTracking().SingleAsync(x=>x.Date==Friday.AddDays(-3));
            using var standalone=await client.PostAsJsonAsync("/api/schedule/day/2026-10-13/validate",new {status=2,recipeId=viewed.Id});Assert.Equal(HttpStatusCode.OK,standalone.StatusCode);
            db.ChangeTracker.Clear();Assert.Equal(Tuesday,(await db.Recipes.AsNoTracking().SingleAsync(x=>x.Id==viewed.Id)).LastCookedDate);
            Assert.Equal(today.Status,(await db.CalendarEvents.AsNoTracking().SingleAsync(x=>x.Id==today.Id)).Status);
            Assert.Equal(today.RecipeId,(await db.CalendarEvents.AsNoTracking().SingleAsync(x=>x.Id==today.Id)).RecipeId);
            // A recipe-specific completion on an empty date creates no calendar entry. Losing publication cannot roll it back.
            clock.UtcNow=Tuesday.AddMinutes(2);failPublication=true;
            using var lost=await client.PostAsJsonAsync("/api/schedule/day/2026-10-19/validate",new {status=2,recipeId=viewed.Id});Assert.Equal(HttpStatusCode.InternalServerError,lost.StatusCode);
            Assert.Equal(Tuesday.AddMinutes(2),(await db.Recipes.AsNoTracking().SingleAsync(x=>x.Id==viewed.Id)).LastCookedDate);
            Assert.False(await db.CalendarEvents.AnyAsync(x=>x.Date==new DateOnly(2026,10,19)));Assert.Equal(5,publications);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PreparedSupper_LegacyCapturedBeforeLock_UnscheduledKeepsLaterExplicitPreparation() => CapturedBeforeLock(false);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PreparedSupper_LegacyCapturedBeforeLock_MatchingTodayKeepsLaterExplicitPreparation() => CapturedBeforeLock(true);

    private async Task CapturedBeforeLock(bool matchingToday)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var clock=new DeploymentCalendarIntegrationTests.CalendarClock {UtcNow=Tuesday};var gate=new BeforeFirstLegacyLock();
            await using var app=await TestWebApplicationFactory.CreateWithAuthAsync(clock,
                new() { ["Calendar:TimeZone"]="America/Toronto",["Tests:PostgresConnectionString"]=settings.ConnectionString },
                configureServices:services=>services.AddDbContext<RecipeDbContext>(options=>options.AddInterceptors(gate)));
            var recipe=await Seed(app);using var client=app.CreateAuthenticatedClient();
            using(var scope=app.Services.CreateScope()) {
                var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                if(matchingToday) {(await db.CalendarEvents.SingleAsync(x=>x.Date==Friday.AddDays(-3))).RecipeId=recipe;await db.SaveChangesAsync();}
            }
            var captured=await Capture(client,recipe);gate.Armed=true;
            var legacy=client.PostAsJsonAsync("/api/schedule/day/2026-10-13/validate",new {status=2,recipeId=recipe});
            JsonElement receipt;
            try {
                await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(15));clock.UtcNow=Tuesday.AddMinutes(1);
                receipt=await Prepare(client,captured);
            } finally {gate.Release.TrySetResult();}
            using var response=await legacy.WaitAsync(TimeSpan.FromSeconds(15));Assert.Equal(HttpStatusCode.OK,response.StatusCode);
            Assert.Equal(matchingToday,JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("data").GetProperty("mealMarkedCooked").GetBoolean());
            using var check=app.Services.CreateScope();var saved=check.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var friday=await saved.CalendarEvents.AsNoTracking().SingleAsync(x=>x.Date==Friday);
            var history=(await saved.Recipes.AsNoTracking().SingleAsync(x=>x.Id==recipe)).LastCookedDate;
            output.WriteLine($"Captured before lock; matching Today={matchingToday}; receipt={friday.PreparedAtUtc:O}; history={history:O}");
            Assert.Equal(Tuesday.AddMinutes(1),friday.PreparedAtUtc);Assert.Equal(6,friday.PreparedServings);Assert.Equal(CalendarEventStatus.Cooked,friday.Status);
            Assert.Equal(receipt.GetProperty("preparation").GetProperty("planToken").GetString(),friday.PreparationPlanToken);
            Assert.Equal(Tuesday.AddMinutes(1),history);
            var today=await saved.CalendarEvents.AsNoTracking().SingleAsync(x=>x.Date==Friday.AddDays(-3));
            Assert.Equal(matchingToday?CalendarEventStatus.Cooked:CalendarEventStatus.Locked,today.Status);Assert.Null(today.PreparedAtUtc);
            if(matchingToday)Assert.Equal(recipe,today.RecipeId);else Assert.NotEqual(recipe,today.RecipeId);
            Assert.Equal(3,await saved.CalendarEvents.CountAsync());
        });
    }

    private sealed class BeforeFirstLegacyLock : DbCommandInterceptor
    {
        public bool Armed {get;set;}
        public readonly TaskCompletionSource Entered=new(TaskCreationOptions.RunContinuationsAsynchronously);
        public readonly TaskCompletionSource Release=new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int entered;
        public override async ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(DbCommand command,CommandEventData eventData,InterceptionResult<int> result,CancellationToken ct=default)
        {
            if(Armed&&command.CommandText.StartsWith("LOCK TABLE weekly_plans",StringComparison.Ordinal)&&Interlocked.CompareExchange(ref entered,1,0)==0) {
                Entered.TrySetResult();await Release.Task.WaitAsync(TimeSpan.FromSeconds(15),ct);
            }
            return result;
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task PreparedSupper_LegacyHistoryCompatibility_Http(bool keepEarlierPreparation)
    {
        var clock=new DeploymentCalendarIntegrationTests.CalendarClock {UtcNow=Tuesday};await using var app=await Factory(clock:clock);
        await LegacyHistoryCompatibility(app,clock,keepEarlierPreparation);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PreparedSupper_LegacyHistoryCompatibility_OnlyExplicitPreparationCanRaiseCapturedInstant()
    {
        foreach(var keep in new[]{false,true}) await new TomorrowPushPostgresTests(output).WithDatabase(async settings=>{
            var clock=new DeploymentCalendarIntegrationTests.CalendarClock {UtcNow=Tuesday};await using var app=await Factory(settings.ConnectionString,clock);
            await LegacyHistoryCompatibility(app,clock,keep);
        });
    }

    private static async Task LegacyHistoryCompatibility(TestWebApplicationFactory app,DeploymentCalendarIntegrationTests.CalendarClock clock,bool keepEarlierPreparation)
    {
        var recipe=await Seed(app);using var client=app.CreateAuthenticatedClient();var captured=await Capture(client,recipe);
        clock.UtcNow=Tuesday.AddMinutes(-1);await Prepare(client,captured);
        using var scope=app.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        if(!keepEarlierPreparation)db.CalendarEvents.Remove(await db.CalendarEvents.SingleAsync(x=>x.Date==Friday));
        (await db.CalendarEvents.SingleAsync(x=>x.Date==Friday.AddDays(-2))).Status=CalendarEventStatus.Cooked;
        // Neither a later legacy calendar fallback nor prior standalone history redefines this explicit legacy action time.
        (await db.Recipes.SingleAsync(x=>x.Id==recipe)).LastCookedDate=Tuesday.AddDays(1);await db.SaveChangesAsync();clock.UtcNow=Tuesday;
        using var result=await client.PostAsJsonAsync("/api/schedule/day/2026-10-13/validate",new {status=2,recipeId=recipe});Assert.Equal(HttpStatusCode.OK,result.StatusCode);
        Assert.False(JsonDocument.Parse(await result.Content.ReadAsStringAsync()).RootElement.GetProperty("data").GetProperty("mealMarkedCooked").GetBoolean());
        db.ChangeTracker.Clear();Assert.Equal(Tuesday,(await db.Recipes.AsNoTracking().SingleAsync(x=>x.Id==recipe)).LastCookedDate);
        Assert.Equal(CalendarEventStatus.Locked,(await db.CalendarEvents.AsNoTracking().SingleAsync(x=>x.Date==Friday.AddDays(-3))).Status);
        if(keepEarlierPreparation)Assert.Equal(Tuesday.AddMinutes(-1),(await db.CalendarEvents.AsNoTracking().SingleAsync(x=>x.Date==Friday)).PreparedAtUtc);
    }

    private async Task LegacyOverlap(int legacyStatus)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var clock = new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = Tuesday };
            var barrier = new BeforeLegacyCompletionSave(legacyStatus);
            await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(clock,
                new() { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString },
                configureServices: services => services.AddDbContext<RecipeDbContext>(options => options.AddInterceptors(barrier)));
            var recipe = await Seed(app); using var client = app.CreateAuthenticatedClient();
            var captured = await Capture(client, recipe);
            barrier.Armed = true;
            var legacy = client.PostAsJsonAsync("/api/schedule/day/2026-10-16/validate", new { status = legacyStatus, recipeId = recipe });
            Task<HttpResponseMessage>? preparation = null;
            string ordering;
            try {
                await barrier.Entered.Task.WaitAsync(TimeSpan.FromSeconds(15));
                clock.UtcNow = Tuesday.AddMinutes(1);
                preparation = client.PostAsJsonAsync(PrepareUrl, captured);
                ordering = await ReceiptOrBlockedOnLegacy(preparation, settings.ConnectionString, barrier.OwnerPid);
            } finally { barrier.Release.TrySetResult(); }
            using var legacyResponse = await legacy.WaitAsync(TimeSpan.FromSeconds(15));
            using var prepareResponse = await preparation!.WaitAsync(TimeSpan.FromSeconds(15));
            output.WriteLine($"Legacy status {legacyStatus}; observed ordering: {ordering}; prepare HTTP {(int)prepareResponse.StatusCode}");
            Assert.Equal(HttpStatusCode.OK, legacyResponse.StatusCode);
            using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var saved = await db.CalendarEvents.AsNoTracking().SingleAsync(x => x.Date == Friday);
            var history = (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipe)).LastCookedDate;
            if (ordering == "preparation-receipt") {
                Assert.Equal(HttpStatusCode.OK, prepareResponse.StatusCode);
                Assert.Equal(Tuesday.AddMinutes(1), saved.PreparedAtUtc);
                Assert.Equal(6, saved.PreparedServings);
                Assert.Equal(CalendarEventStatus.Cooked, saved.Status);
                Assert.Equal(Tuesday.AddMinutes(1), history);
            } else {
                Assert.Equal("preparation-blocked-on-legacy", ordering);
                Assert.Equal(HttpStatusCode.Conflict, prepareResponse.StatusCode);
                Assert.Null(saved.PreparedAtUtc); Assert.Null(saved.PreparedOn);
                Assert.Equal((CalendarEventStatus)legacyStatus, saved.Status);
                Assert.Equal(legacyStatus == 2 ? Tuesday : (DateTimeOffset?)null, history);
            }

            // Reverse order: preparation wins first, then legacy must read the stored receipt.
            var tracked = await db.CalendarEvents.SingleAsync(x => x.Date == Friday);
            tracked.Status = CalendarEventStatus.Planned;
            var trackedRecipe = await db.Recipes.SingleAsync(x => x.Id == recipe); trackedRecipe.LastCookedDate = null;
            await db.SaveChangesAsync();
            var latest = await Capture(client, recipe); var original = await Prepare(client, latest);
            clock.UtcNow = Tuesday.AddMinutes(2);
            using var repeat = await client.PostAsJsonAsync("/api/schedule/day/2026-10-16/validate", new { status = legacyStatus, recipeId = recipe });
            Assert.Equal(legacyStatus == 2 ? HttpStatusCode.OK : HttpStatusCode.Conflict, repeat.StatusCode);
            db.ChangeTracker.Clear(); saved = await db.CalendarEvents.AsNoTracking().SingleAsync(x => x.Date == Friday);
            Assert.Equal(CalendarEventStatus.Cooked, saved.Status); Assert.Equal(Tuesday.AddMinutes(1), saved.PreparedAtUtc); Assert.Equal(6, saved.PreparedServings);
            Assert.Equal(Tuesday.AddMinutes(1), (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipe)).LastCookedDate);
            Assert.Equal(original.GetProperty("preparation").GetProperty("planToken").GetString(), saved.PreparationPlanToken);
        });
    }

    private static async Task<string> ReceiptOrBlockedOnLegacy(Task<HttpResponseMessage> preparation, string connectionString, int? legacyPid)
    {
        await using var observer = new NpgsqlConnection(connectionString); await observer.OpenAsync();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        while (!preparation.IsCompleted) {
            if (legacyPid is { } owner) {
                await using var query = new NpgsqlCommand("""
                    SELECT EXISTS (SELECT 1 FROM pg_stat_activity a
                    WHERE a.datname=current_database() AND a.wait_event_type='Lock'
                    AND a.query LIKE 'LOCK TABLE weekly_plans, calendar_events, supper_servings, family_settings%'
                    AND @owner=ANY(pg_blocking_pids(a.pid)))
                    """, observer);
                query.Parameters.AddWithValue("owner", owner);
                if ((bool)(await query.ExecuteScalarAsync(timeout.Token))!) return "preparation-blocked-on-legacy";
            }
            // Poll only for positive lock evidence or an actual HTTP receipt. Elapsed time never passes a case.
            await Task.WhenAny(preparation, Task.Delay(20, timeout.Token)).WaitAsync(timeout.Token);
        }
        return "preparation-receipt";
    }

    private sealed class BeforeLegacyCompletionSave(int status) : SaveChangesInterceptor
    {
        public bool Armed { get; set; }
        public int? OwnerPid { get; private set; }
        public readonly TaskCompletionSource Entered = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public readonly TaskCompletionSource Release = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int entered;
        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
        {
            var db = eventData.Context!;
            if (Armed && db.ChangeTracker.Entries<CalendarEvent>().Any(x => x.State == EntityState.Modified && x.Entity.Date == Friday && (int)x.Entity.Status == status && x.Entity.PreparedAtUtc is null)
                && Interlocked.CompareExchange(ref entered, 1, 0) == 0) {
                if (db.Database.GetDbConnection() is NpgsqlConnection connection && connection.State == ConnectionState.Open) OwnerPid = connection.ProcessID;
                Entered.TrySetResult(); await Release.Task.WaitAsync(TimeSpan.FromSeconds(15), ct);
            }
            return result;
        }
    }
}
