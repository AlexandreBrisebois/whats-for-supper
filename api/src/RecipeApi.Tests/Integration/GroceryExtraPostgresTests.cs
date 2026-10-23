using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

namespace RecipeApi.Tests.Integration;

public sealed class GroceryExtraPostgresTests : IAsyncLifetime
{
    private readonly string database = $"wfs_grocery_extra_{Guid.NewGuid():N}";
    private NpgsqlConnection admin = null!;
    private string connection = null!;

    public async Task InitializeAsync()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        admin = new(settings.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        settings.Database = database;
        connection = settings.ConnectionString;
        await using var sql = new NpgsqlConnection(connection);
        await sql.OpenAsync();
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !File.Exists(Path.Combine(root.FullName, "database", "schema.sql"))) root = root.Parent;
        await new NpgsqlCommand(await File.ReadAllTextAsync(Path.Combine(root!.FullName, "database", "schema.sql")), sql).ExecuteNonQueryAsync();
    }

    public async Task DisposeAsync()
    {
        if (admin is null) return;
        await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync();
        await admin.DisposeAsync();
    }

    private RecipeDbContext Context(DbCommandInterceptor? interceptor = null)
    {
        var options = new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(connection);
        if (interceptor is not null) options.AddInterceptors(interceptor);
        return new(options.Options);
    }
    private static readonly DateTimeOffset Now = new(2026, 10, 20, 12, 0, 0, TimeSpan.Zero);
    private static GroceryExtraService Service(RecipeDbContext db) =>
        new(db, new FixedClock(), new DeploymentCalendar(new ConfigurationManager()), new AisleMapper());

    [PostgresFact]
    public async Task CreateReadSuggestionsAndVersionOwnershipUseAuthoritativeRows()
    {
        await using var db = Context();
        var service = Service(db);
        var current = new DateOnly(2026, 10, 19);
        var id = Guid.NewGuid();
        var created = await service.CreateAsync(new(id, current, " Milk "));
        Assert.True(created.Created);
        Assert.False((await service.CreateAsync(new(id, current, "Milk"))).Created);
        await Assert.ThrowsAsync<GroceryExtraValidationException>(() => service.CreateAsync(new(Guid.NewGuid(), current.AddDays(7), "Coffee")));
        await Assert.ThrowsAsync<GroceryExtraValidationException>(() => service.CreateAsync(new(Guid.NewGuid(), current, "   ")));

        db.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), current.AddDays(-7),
            "Milk bags", "milk bags", "Dairy & Eggs", Now.AddDays(-7)));
        await db.SaveChangesAsync();
        Assert.Equal(["Milk bags"], await service.SuggestAsync("mi"));
        Assert.Single(await service.ReadForViewAsync(current.AddDays(7), current));
        await Assert.ThrowsAsync<GroceryExtraConflictException>(() =>
            service.UpdateAsync(id, new(current.AddDays(7), created.Extra.Version, Checked: true)));
        await Assert.ThrowsAsync<GroceryExtraConflictException>(() =>
            service.UpdateAsync(id, new(current, created.Extra.Version + 1, Checked: true)));
    }

    [PostgresFact]
    public async Task ConcurrentRolloverConvergesAndPreservesSnapshotsAndEndedLineages()
    {
        var lineage = Guid.NewGuid();
        var ended = Guid.NewGuid();
        await using (var seed = Context())
        {
            seed.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(Guid.NewGuid(), lineage, new(2026, 9, 28),
                "Coffee", "coffee", "Beverages", Now.AddDays(-22)));
            var checkedRow = GroceryExtraOccurrence.Create(Guid.NewGuid(), ended, new(2026, 10, 5),
                "Soap", "soap", "Grocery", Now.AddDays(-15));
            checkedRow.Checked = true;
            seed.GroceryExtraOccurrences.Add(checkedRow);
            await seed.SaveChangesAsync();
        }

        await using var firstDb = Context();
        await using var secondDb = Context();
        var first = new GroceryExtraRolloverService(firstDb, new FixedClock(), new DeploymentCalendar(new ConfigurationManager()));
        var second = new GroceryExtraRolloverService(secondDb, new FixedClock(), new DeploymentCalendar(new ConfigurationManager()));
        await Task.WhenAll(first.ReconcileCurrentAsync(), second.ReconcileCurrentAsync());

        await using var verify = Context();
        var carried = await verify.GroceryExtraOccurrences.Where(row => row.LineageId == lineage).OrderBy(row => row.WeekStartDate).ToListAsync();
        Assert.Equal(4, carried.Count);
        Assert.Equal(4, carried.Select(row => row.WeekStartDate).Distinct().Count());
        Assert.Equal("Coffee", carried[0].Name);
        Assert.All(carried, row => Assert.Equal("Coffee", row.Name));
        Assert.All(carried, row => Assert.Equal("Beverages", row.GrocerySection));
        Assert.Null(carried[0].PredecessorId);
        for (var index = 1; index < carried.Count; index++)
            Assert.Equal(carried[index - 1].Id, carried[index].PredecessorId);
        Assert.Single(await verify.GroceryExtraOccurrences.Where(row => row.LineageId == ended).ToListAsync());
    }

    [PostgresFact]
    public async Task CurrentScheduleReadRepairsMissedRolloverOnce()
    {
        var lineage = Guid.NewGuid();
        await using var db = Context();
        db.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(Guid.NewGuid(), lineage, new(2026, 10, 12),
            "Coffee", "coffee", "Beverages", Now.AddDays(-7)));
        await db.SaveChangesAsync();
        var clock = new FixedClock();
        var calendar = new DeploymentCalendar(new ConfigurationManager());
        var publisher = new Mock<IScheduleEventPublisher>().Object;
        var extras = Service(db);
        var rollover = new GroceryExtraRolloverService(db, clock, calendar, publisher);
        var recompute = new GroceryRecomputeService(db, new AisleMapper(), NullLogger<GroceryRecomputeService>.Instance,
            clock, calendar, publisher);
        var schedule = new ScheduleService(db, NullLogger<ScheduleService>.Instance, publisher, recompute, clock,
            calendar, TestHistoricalInterest.Create(db, clock, calendar), extras, rollover);

        var first = await schedule.GetScheduleAsync(0);
        var second = await schedule.GetScheduleAsync(0);

        Assert.NotNull(first.GroceryExtras);
        Assert.NotNull(second.GroceryExtras);
        Assert.Single(first.GroceryExtras);
        Assert.Single(second.GroceryExtras);
        Assert.Equal(new DateOnly(2026, 10, 19), first.GroceryExtras[0].OccurrenceWeekStartDate);
        Assert.Equal(2, await db.GroceryExtraOccurrences.CountAsync(row => row.LineageId == lineage));
    }

    [PostgresFact]
    public async Task DatabaseConstraintsRejectDuplicateLineageWeekAndSuccessor()
    {
        await using var db = Context();
        var lineage = Guid.NewGuid();
        var predecessor = GroceryExtraOccurrence.Create(Guid.NewGuid(), lineage, new(2026, 10, 12), "Coffee", "coffee", "Grocery", Now);
        db.GroceryExtraOccurrences.Add(predecessor);
        await db.SaveChangesAsync();
        db.GroceryExtraOccurrences.AddRange(
            GroceryExtraOccurrence.Create(Guid.NewGuid(), lineage, new(2026, 10, 19), "Coffee", "coffee", "Grocery", Now, predecessor.Id),
            GroceryExtraOccurrence.Create(Guid.NewGuid(), lineage, new(2026, 10, 19), "Coffee", "coffee", "Grocery", Now, predecessor.Id));
        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [PostgresFact]
    public async Task GroceryExtra_VersionIsAnOptimisticConcurrencyToken()
    {
        var row = GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new(2026, 10, 19),
            "Coffee", "coffee", "Grocery", Now);
        await using (var seed = Context())
        {
            seed.GroceryExtraOccurrences.Add(row);
            await seed.SaveChangesAsync();
        }

        await using var first = Context();
        await using var second = Context();
        var firstCopy = await first.GroceryExtraOccurrences.SingleAsync(extra => extra.Id == row.Id);
        var secondCopy = await second.GroceryExtraOccurrences.SingleAsync(extra => extra.Id == row.Id);
        firstCopy.Name = "Coffee beans";
        firstCopy.Version++;
        secondCopy.Name = "Ground coffee";
        secondCopy.Version++;

        await first.SaveChangesAsync();
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => second.SaveChangesAsync());
    }

    [PostgresFact]
    public async Task ConcurrentSameClientCreateConvergesToOneIdempotentOccurrence()
    {
        var id = Guid.NewGuid();
        var request = new RecipeApi.Dto.CreateGroceryExtraRequest(id, new(2026, 10, 19), "Coffee");
        await using var firstDb = Context();
        await using var secondDb = Context();

        var results = await Task.WhenAll(Service(firstDb).CreateAsync(request), Service(secondDb).CreateAsync(request));

        Assert.Single(results, result => result.Created);
        Assert.Single(results, result => !result.Created);
        await using var verify = Context();
        Assert.Equal(id, (await verify.GroceryExtraOccurrences.SingleAsync()).Id);
    }

    [PostgresFact]
    public async Task ConcurrentExpectedVersionMutationsCommitExactlyOneWinner()
    {
        var id = Guid.NewGuid();
        await using (var seed = Context())
        {
            seed.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(id, id, new(2026, 10, 19),
                "Coffee", "coffee", "Beverages", Now));
            await seed.SaveChangesAsync();
        }
        var barrier = new GroceryExtraReadBarrier();
        await using var firstDb = Context(barrier);
        await using var secondDb = Context(barrier);

        static async Task<bool> Mutate(GroceryExtraService service, Guid occurrenceId, string section)
        {
            try
            {
                await service.UpdateAsync(occurrenceId, new(new(2026, 10, 19), 1, GrocerySection: section));
                return true;
            }
            catch (GroceryExtraConflictException)
            {
                return false;
            }
        }

        var results = await Task.WhenAll(Mutate(Service(firstDb), id, "Pantry"), Mutate(Service(secondDb), id, "Grocery"));

        Assert.Single(results, result => result);
        Assert.Single(results, result => !result);
        await using var verify = Context();
        var saved = await verify.GroceryExtraOccurrences.SingleAsync(row => row.Id == id);
        Assert.Equal(2, saved.Version);
        Assert.Contains(saved.GrocerySection, new[] { "Pantry", "Grocery" });
    }

    [PostgresFact]
    public async Task CompatibilityMigrationCreatesExtrasIdempotentlyWithoutResettingExistingData()
    {
        await using var sql = new NpgsqlConnection(connection);
        await sql.OpenAsync();
        await new NpgsqlCommand("INSERT INTO ingredient_categories (normalized_key, grocery_section, source) VALUES ('coffee', 'Beverages', 'manual'); DROP TABLE grocery_extra_occurrences", sql).ExecuteNonQueryAsync();
        var compatibility = ReadDatabaseFile("compatibility.sql");

        await new NpgsqlCommand(compatibility, sql).ExecuteNonQueryAsync();
        await new NpgsqlCommand("INSERT INTO grocery_extra_occurrences (id, lineage_id, week_start_date, name, normalized_key, grocery_section) VALUES (gen_random_uuid(), gen_random_uuid(), '2026-10-19', 'Coffee', 'coffee', 'Beverages')", sql).ExecuteNonQueryAsync();
        await new NpgsqlCommand(compatibility, sql).ExecuteNonQueryAsync();

        Assert.Equal(1L, await new NpgsqlCommand("SELECT count(*) FROM grocery_extra_occurrences", sql).ExecuteScalarAsync());
        Assert.Equal("Beverages", await new NpgsqlCommand("SELECT grocery_section FROM ingredient_categories WHERE normalized_key = 'coffee'", sql).ExecuteScalarAsync());
    }

    private static string ReadDatabaseFile(string name)
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !File.Exists(Path.Combine(root.FullName, "database", name))) root = root.Parent;
        return File.ReadAllText(Path.Combine(root!.FullName, "database", name));
    }

    private sealed class GroceryExtraReadBarrier : DbCommandInterceptor
    {
        private readonly TaskCompletionSource bothRead = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int arrivals;

        public override async ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand command,
            CommandExecutedEventData eventData, DbDataReader result, CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("FROM grocery_extra_occurrences") && Interlocked.Increment(ref arrivals) <= 2)
            {
                if (arrivals == 2) bothRead.TrySetResult();
                await bothRead.Task.WaitAsync(TimeSpan.FromSeconds(10), cancellationToken);
            }
            return result;
        }
    }

    private sealed class FixedClock : IClock { public DateTimeOffset UtcNow => Now; }
}
