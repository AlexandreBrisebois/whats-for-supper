using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
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

    private RecipeDbContext Context() => new(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(connection).Options);
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
        Assert.Single(await verify.GroceryExtraOccurrences.Where(row => row.LineageId == ended).ToListAsync());
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

    private sealed class FixedClock : IClock { public DateTimeOffset UtcNow => Now; }
}
