using System.Data;
using System.Text.Json;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class SupperServingsPostgresTests
{
    private const string ScheduleReadRow = "660e8400-e29b-41d4-a716-446655440602";
    private static string ScheduleReadItems(int amount) => JsonSerializer.Serialize(new[] { new GroceryLineItemDto("pasta", "pasta", "Pantry", amount, "g", [], true) {
        ExactQuantity = new("scalar", new(amount.ToString(), "1")), RowId = ScheduleReadRow, RowVersion = "1", WeekStartDate = new(2026,10,12), DemandIdentity = "snapshot-fixture"
    }});
    private static readonly Guid ScheduleReadRound = Guid.Parse("660e8400-e29b-41d4-a716-446655440601");
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_ScheduleReadCannotMixCalendarAndGroceryCommits()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var race = new BetweenScheduleQueries();
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(),
                new() { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString },
                configureServices: services => services.AddDbContext<RecipeDbContext>(options => options.AddInterceptors(race)));
            await SeedScheduleRead(factory);
            race.Commit = async () => {
                using var writer = factory.Services.CreateScope();
                var db = writer.ServiceProvider.GetRequiredService<RecipeDbContext>();
                await using var tx = await db.Database.BeginTransactionAsync();
                (await db.CalendarEvents.SingleAsync()).VoteCount = 9;
                (await db.Recipes.SingleAsync()).Name = "New recipe";
                var plan = await db.WeeklyPlans.SingleAsync();
                plan.GroceryItems = ScheduleReadItems(600);
                plan.GroceryState = JsonSerializer.Serialize(new Dictionary<string,bool>{[ScheduleReadRow]=false});
                plan.ServingInputVersion = "new"; plan.ServingRefreshStatus = "updating";
                (await db.VotingRoundStates.SingleAsync()).RoundId = Guid.NewGuid();
                (await db.GroceryExtraOccurrences.SingleAsync()).Checked = true;
                await db.SaveChangesAsync(); await tx.CommitAsync();
            };
            using var reader = factory.Services.CreateScope();
            var service = reader.ServiceProvider.GetRequiredService<ScheduleService>();
            var during = await service.GetScheduleAsync(0, new(2026, 10, 12));
            Assert.True(race.Ran);
            Assert.Equal("Old recipe", during.Days[2].Recipe!.Name);
            Assert.Equal(2, during.Days[2].Recipe!.VoteCount);
            Assert.Equal(200, during.GroceryItems![0].Quantity);
            Assert.True(during.GroceryState![ScheduleReadRow]);
            Assert.Equal("current", during.GroceryRefresh!.Status);
            Assert.Equal(ScheduleReadRound, during.VotingRoundId);
            Assert.False(Assert.Single(during.GroceryExtras!).Checked);
            var after = await service.GetScheduleAsync(0, new(2026, 10, 12));
            Assert.Equal("New recipe", after.Days[2].Recipe!.Name);
            Assert.Equal(9, after.Days[2].Recipe!.VoteCount);
            Assert.Equal(600, after.GroceryItems![0].Quantity);
            Assert.False(after.GroceryState![ScheduleReadRow]);
            Assert.Equal("updating", after.GroceryRefresh!.Status);
            Assert.NotEqual(ScheduleReadRound, after.VotingRoundId);
            Assert.Empty(after.GroceryExtras!);
            Assert.NotEqual(during.Days[2].RemovalToken, after.Days[2].RemovalToken);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_ScheduleReadDoesNotPublishOldTrackedEntities()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await SeedScheduleRead(factory);
            using var reader = factory.Services.CreateScope();
            var tracked = reader.ServiceProvider.GetRequiredService<RecipeDbContext>();
            await tracked.CalendarEvents.Include(x => x.Recipe).LoadAsync();
            await tracked.WeeklyPlans.LoadAsync();
            using (var writer = factory.Services.CreateScope()) {
                var db = writer.ServiceProvider.GetRequiredService<RecipeDbContext>();
                (await db.CalendarEvents.SingleAsync()).VoteCount = 9;
                (await db.Recipes.SingleAsync()).Name = "New recipe";
                (await db.WeeklyPlans.SingleAsync()).GroceryState = JsonSerializer.Serialize(new Dictionary<string,bool>{[ScheduleReadRow]=false});
                await db.SaveChangesAsync();
            }
            var fresh = await reader.ServiceProvider.GetRequiredService<ScheduleService>().GetScheduleAsync(0, new(2026, 10, 12));
            Assert.Equal("New recipe", fresh.Days[2].Recipe!.Name);
            Assert.Equal(9, fresh.Days[2].Recipe!.VoteCount);
            Assert.False(fresh.GroceryState![ScheduleReadRow]);
            // Snapshot reads must not clear or overwrite the caller's tracked write state.
            Assert.Equal("Old recipe", tracked.Recipes.Local.Single().Name);
            Assert.Equal(2, tracked.CalendarEvents.Local.Single().VoteCount);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_CurrentScheduleReadReusesOuterTransactionAndStillRollsExtras()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var publisher = new Mock<IScheduleEventPublisher>();
            var clock = new DeploymentCalendarIntegrationTests.CalendarClock();
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var current = new DateOnly(2026, 10, 5);
            db.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), current.AddDays(-7), "Coffee", "coffee", "Grocery", clock.UtcNow));
            await db.SaveChangesAsync();
            var calendar = scope.ServiceProvider.GetRequiredService<DeploymentCalendar>();
            var rollover = new GroceryExtraRolloverService(db, clock, calendar, publisher.Object);
            var service = new ScheduleService(db, Microsoft.Extensions.Logging.Abstractions.NullLogger<ScheduleService>.Instance,
                publisher.Object, scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>(), clock, calendar,
                scope.ServiceProvider.GetRequiredService<HistoricalInterestService>(), scope.ServiceProvider.GetRequiredService<GroceryCheckCoordinator>(),
                scope.ServiceProvider.GetRequiredService<SupperProjectionInvalidation>(), scope.ServiceProvider.GetRequiredService<GroceryExtraService>(), rollover);
            await using (var tx = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead)) {
                var snapshot = await service.GetScheduleAsync(0, current);
                Assert.Same(tx, db.Database.CurrentTransaction);
                Assert.Equal(current, Assert.Single(snapshot.GroceryExtras!).OccurrenceWeekStartDate);
                Assert.Equal(2, await db.GroceryExtraOccurrences.CountAsync());
                publisher.Verify(p => p.PublishGroceryExtrasUpdatedAsync(It.IsAny<DateOnly>(), It.IsAny<IReadOnlyList<GroceryExtraDto>>(), It.IsAny<string?>()), Times.Never);
                await tx.RollbackAsync();
            }
            db.ChangeTracker.Clear();
            Assert.Single(await db.GroceryExtraOccurrences.ToListAsync());
            var committed = await service.GetScheduleAsync(0, current);
            Assert.Equal(current, Assert.Single(committed.GroceryExtras!).OccurrenceWeekStartDate);
            Assert.Equal(2, await db.GroceryExtraOccurrences.CountAsync());
            publisher.Verify(p => p.PublishGroceryExtrasUpdatedAsync(current, It.IsAny<IReadOnlyList<GroceryExtraDto>>(), It.IsAny<string?>()), Times.Once);
        });
    }

    private static async Task SeedScheduleRead(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = CorrectionRecipe(); recipe.Name = "Old recipe"; db.Recipes.Add(recipe);
        db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id, VoteCount = 2 });
        db.WeeklyPlans.Add(new WeeklyPlan { WeekStartDate = new(2026, 10, 12), GroceryItems = ScheduleReadItems(200), GroceryState = JsonSerializer.Serialize(new Dictionary<string,bool>{[ScheduleReadRow]=true}), ServingInputVersion = "old", ServingAppliedVersion = "old" });
        var round = await db.VotingRoundStates.SingleOrDefaultAsync();
        if (round is null) { round = new VotingRoundState(); db.VotingRoundStates.Add(round); }
        round.RoundId = ScheduleReadRound; round.WeekStartDate = new(2026, 10, 12);
        db.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 5), "Coffee", "coffee", "Grocery", DateTimeOffset.Parse("2026-10-12T01:30:00Z")));
        await db.SaveChangesAsync();
    }

    private sealed class BetweenScheduleQueries : DbCommandInterceptor
    {
        public Func<Task>? Commit;
        public bool Ran;
        public override async ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            if (!Ran && Commit is not null && command.CommandText.Contains("FROM weekly_plans", StringComparison.Ordinal)) { Ran = true; await Commit(); }
            return result;
        }
    }
}
