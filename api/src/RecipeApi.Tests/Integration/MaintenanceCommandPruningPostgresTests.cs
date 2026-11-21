using System.Text.Json;
using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;
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

        await db.Database.ExecuteSqlRawAsync("DROP TRIGGER reject_maintenance_delete ON maintenance_commands");
        // A later unrelated save must not reapply a rolled-back deletion or timestamp.
        db.FamilySettings.Add(new FamilySetting { Key = "unrelated-after-prune-rollback", Value = JsonSerializer.SerializeToElement(true) });
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        Assert.True(await db.MaintenanceCommands.AnyAsync(c => c.Id == expired.Id));
        Assert.Null((await db.MaintenanceCommands.SingleAsync(c => c.Id == legacy.Id)).CompletedAt);
        Assert.Empty(await db.MaintenanceCommandLifecycleRecords.ToArrayAsync());
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

    [PostgresFact]
    public async Task RetainedHistory_PreservesNullResultAndOriginalRequestWithoutRecipeDependency()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var command = Command("skipped", Now.AddDays(-31));
        command.Payload = JsonSerializer.Serialize(new { recipeId = Guid.NewGuid(), workflowInstanceId = Guid.NewGuid(), reason = "original" });
        command.Result = null; command.LastError = "Original failed attempt"; command.Attempts = 4;
        var requester = new FamilyMember { Id = Guid.NewGuid(), Name = "Disposable requester" };
        db.FamilyMembers.Add(requester); command.RequestedBy = requester.Id; command.ScheduledFor = Now.AddDays(-50); command.StartedAt = Now.AddDays(-45);
        db.MaintenanceCommands.Add(command); await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var original = JsonSerializer.SerializeToElement(await db.MaintenanceCommands.SingleAsync(), JsonDefaults.CamelCase);
        Assert.Equal(1, (await CreateService(scope, db).PruneMaintenanceCommandsAsync()).PrunedCommands);
        db.ChangeTracker.Clear();
        Assert.Empty(await db.MaintenanceCommands.ToArrayAsync());
        var history = await db.MaintenanceCommandLifecycleRecords.SingleAsync();
        using var payload = JsonDocument.Parse(history.Payload);
        Assert.True(JsonElement.DeepEquals(original, payload.RootElement.GetProperty("command")));
        Assert.Empty(payload.RootElement.GetProperty("workflowRetirements").EnumerateArray());
        Assert.Equal("inert", payload.RootElement.GetProperty("executionDisposition").GetString());
        Assert.Equal(command.Id, history.Id);
        Assert.Equal("pruned", history.Disposition);
    }

    [PostgresFact]
    public async Task Prune_LostCommitAcknowledgementKeepsHistoryAndDoesNotReplayRemoval()
    {
        using var scope = factory.Services.CreateScope();
        var source = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var lost = new LostCommit();
        await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
            .UseNpgsql(source.Database.GetConnectionString()).AddInterceptors(lost).Options);
        var command = Command("completed", Now.AddDays(-31));
        command.Result = """{"filesDeleted":false,"recipeDeleted":false,"outcome":"recipe-not-found"}""";
        db.MaintenanceCommands.Add(command); await db.SaveChangesAsync();
        var service = CreateService(scope, db);
        lost.Armed = true;
        await Assert.ThrowsAsync<IOException>(() => service.PruneMaintenanceCommandsAsync());
        db.FamilySettings.Add(new FamilySetting { Key = "after-committed-prune", Value = JsonSerializer.SerializeToElement(true) });
        await db.SaveChangesAsync();
        Assert.Equal(0, (await service.PruneMaintenanceCommandsAsync()).PrunedCommands);
        source.ChangeTracker.Clear();
        Assert.Empty(await source.MaintenanceCommands.ToArrayAsync());
        var retained = await source.MaintenanceCommandLifecycleRecords.SingleAsync();
        Assert.Equal(command.Id, retained.Id);
        using var snapshot = JsonDocument.Parse(retained.Payload);
        using var result = JsonDocument.Parse(snapshot.RootElement.GetProperty("command").GetProperty("result").GetString()!);
        Assert.False(result.RootElement.GetProperty("filesDeleted").GetBoolean());
        Assert.False(result.RootElement.GetProperty("recipeDeleted").GetBoolean());
    }

    [PostgresFact]
    public async Task Prune_DrainsCommandWriterAndRetainsFinalObservedResult()
    {
        using var scope = factory.Services.CreateScope();
        var writer = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var command = Command("completed", Now.AddDays(-31));
        command.Result = """{"observed":1}""";
        writer.MaintenanceCommands.Add(command); await writer.SaveChangesAsync();
        await using var pruning = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
            .UseNpgsql(writer.Database.GetConnectionString()).Options);
        Assert.Equal(0, (await pruning.MaintenanceCommands.SingleAsync()).Attempts);
        await using var transaction = await writer.Database.BeginTransactionAsync();
        command.Result = """{"observed":2}"""; command.Attempts = 5; command.LastError = "retained final error";
        await writer.SaveChangesAsync();
        var prune = CreateService(scope, pruning).PruneMaintenanceCommandsAsync();
        Assert.NotSame(prune, await Task.WhenAny(prune, Task.Delay(100)));
        await transaction.CommitAsync();
        Assert.Equal(1, (await prune.WaitAsync(TimeSpan.FromSeconds(10))).PrunedCommands);
        writer.ChangeTracker.Clear();
        using var snapshot = JsonDocument.Parse((await writer.MaintenanceCommandLifecycleRecords.SingleAsync()).Payload);
        var saved = snapshot.RootElement.GetProperty("command");
        Assert.Equal(5, saved.GetProperty("attempts").GetInt32());
        Assert.Equal("retained final error", saved.GetProperty("lastError").GetString());
        using var result = JsonDocument.Parse(saved.GetProperty("result").GetString()!);
        Assert.Equal(2, result.RootElement.GetProperty("observed").GetInt32());
    }

    [PostgresFact]
    public async Task LegacyNullCompletion_RetainsBothOriginalObservationAndLaterPrune()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var command = Command("completed", null);
        db.MaintenanceCommands.Add(command); await db.SaveChangesAsync();
        Assert.Equal(1, (await CreateService(scope, db).PruneMaintenanceCommandsAsync()).InitializedCompletionTimestamps);
        Assert.Equal(1, (await CreateService(scope, db, Now.AddDays(31)).PruneMaintenanceCommandsAsync()).PrunedCommands);
        db.ChangeTracker.Clear();
        var records = await db.MaintenanceCommandLifecycleRecords.Where(x => x.Id == command.Id).ToArrayAsync();
        Assert.Equal(2, records.Length);
        using var original = JsonDocument.Parse(Assert.Single(records, x => x.Disposition == "retention-started").Payload);
        using var pruned = JsonDocument.Parse(Assert.Single(records, x => x.Disposition == "pruned").Payload);
        Assert.Equal(JsonValueKind.Null, original.RootElement.GetProperty("command").GetProperty("completedAt").ValueKind);
        Assert.Equal(Now, pruned.RootElement.GetProperty("command").GetProperty("completedAt").GetDateTimeOffset());
        Assert.Empty(await db.MaintenanceCommands.ToArrayAsync());
    }

    private sealed class LostCommit : DbTransactionInterceptor
    {
        internal bool Armed;
        public override Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
        {
            if (Armed) { Armed = false; throw new IOException("Synthetic lost committed acknowledgement"); }
            return Task.CompletedTask;
        }
    }

    private static ManagementService CreateService(IServiceScope scope, RecipeDbContext db, DateTimeOffset? now = null) => new(
        db,
        scope.ServiceProvider.GetRequiredService<IRecipeStore>(),
        scope.ServiceProvider.GetRequiredService<RecipesRootResolver>(),
        scope.ServiceProvider.GetRequiredService<DataRootResolver>(),
        new FixedClock(now ?? Now),
        NullLogger<ManagementService>.Instance,
        scope.ServiceProvider.GetRequiredService<DemoModeOptions>(),
        scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>(),
        scope.ServiceProvider.GetRequiredService<DeploymentCalendar>());

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
