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

public sealed class MaintenanceCommandPruningPostgresTests : IAsyncLifetime
{
    private static readonly DateTimeOffset Now = new(2026, 10, 23, 12, 0, 0, TimeSpan.Zero);
    private readonly string database = "wfs_maintenance_prune_" + Guid.NewGuid().ToString("N");
    private NpgsqlConnection admin = null!;
    private TestWebApplicationFactory factory = null!;

    public async Task InitializeAsync()
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        admin = new NpgsqlConnection(connection.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        connection.Database = database;
        await using (var schema = new NpgsqlConnection(connection.ConnectionString))
        {
            await schema.OpenAsync();
            var root = new DirectoryInfo(AppContext.BaseDirectory);
            while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "api", "database"))) root = root.Parent;
            var sql = await File.ReadAllTextAsync(Path.Combine(root!.FullName, "api", "database", "schema.sql"));
            await new NpgsqlCommand(sql, schema).ExecuteNonQueryAsync();
        }

        factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
        {
            ["Tests:PostgresConnectionString"] = connection.ConnectionString,
            ["Tests:LocalRecipeStore"] = "true"
        });
    }

    public async Task DisposeAsync()
    {
        if (factory is not null) await factory.DisposeAsync();
        if (admin is not null)
        {
            await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync();
            await admin.DisposeAsync();
        }
    }

    [PostgresFact]
    public async Task Pruning_UsesActualPredicate_IsRepeatable_AndBoundsEachCommit()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var protectedFailed = Command("failed", Now.AddDays(-90));
        db.MaintenanceCommands.AddRange(
            Command("completed", Now.AddDays(-31)),
            Command("skipped", Now.AddDays(-30)),
            Command("completed", Now.AddDays(-29)),
            protectedFailed);
        await db.SaveChangesAsync();
        var service = CreateService(scope, db);

        var first = await service.PruneMaintenanceCommandsAsync(30, 1);
        var second = await service.PruneMaintenanceCommandsAsync(30, 1);
        var third = await service.PruneMaintenanceCommandsAsync(30, 1);

        Assert.Equal(1, first.PrunedCommands);
        Assert.Equal(1, second.PrunedCommands);
        Assert.Equal(0, third.PrunedCommands);
        Assert.Equal(2, await db.MaintenanceCommands.CountAsync());
        Assert.True(await db.MaintenanceCommands.AnyAsync(c => c.Id == protectedFailed.Id));
    }

    [PostgresFact]
    public async Task DeleteFailure_RollsBackLegacyTimestampInitialization_AndReportsNoResult()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var expired = Command("completed", Now.AddDays(-31));
        var legacy = Command("skipped", null);
        db.MaintenanceCommands.AddRange(expired, legacy);
        await db.SaveChangesAsync();
        await db.Database.ExecuteSqlRawAsync("""
            CREATE FUNCTION reject_maintenance_delete() RETURNS trigger AS $$
            BEGIN
              RAISE EXCEPTION 'injected maintenance prune failure';
            END;
            $$ LANGUAGE plpgsql;
            CREATE TRIGGER reject_maintenance_delete
            BEFORE DELETE ON maintenance_commands
            FOR EACH ROW EXECUTE FUNCTION reject_maintenance_delete();
            """);
        var service = CreateService(scope, db);

        await Assert.ThrowsAsync<DbUpdateException>(() => service.PruneMaintenanceCommandsAsync(30, 500));

        db.ChangeTracker.Clear();
        Assert.True(await db.MaintenanceCommands.AnyAsync(c => c.Id == expired.Id));
        Assert.Null((await db.MaintenanceCommands.SingleAsync(c => c.Id == legacy.Id)).CompletedAt);
    }

    [PostgresFact]
    public async Task Cancellation_BeforeTransaction_LeavesEligibleHistory()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var expired = Command("skipped", Now.AddDays(-31));
        db.MaintenanceCommands.Add(expired);
        await db.SaveChangesAsync();
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            CreateService(scope, db).PruneMaintenanceCommandsAsync(30, 500, cancellation.Token));

        db.ChangeTracker.Clear();
        Assert.True(await db.MaintenanceCommands.AnyAsync(c => c.Id == expired.Id));
    }

    private static ManagementService CreateService(IServiceScope scope, RecipeDbContext db) => new(
        db,
        scope.ServiceProvider.GetRequiredService<IRecipeStore>(),
        scope.ServiceProvider.GetRequiredService<RecipesRootResolver>(),
        scope.ServiceProvider.GetRequiredService<DataRootResolver>(),
        new FixedClock(Now),
        NullLogger<ManagementService>.Instance,
        scope.ServiceProvider.GetRequiredService<DemoModeOptions>(),
        scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>());

    private static MaintenanceCommand Command(string status, DateTimeOffset? completedAt) => new()
    {
        Id = Guid.NewGuid(),
        CommandType = CaptureFailureService.DeleteFailedCaptureResidueCommand,
        Status = status,
        CreatedAt = Now.AddDays(-100),
        CompletedAt = completedAt,
    };

    private sealed class FixedClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow => now;
    }
}
