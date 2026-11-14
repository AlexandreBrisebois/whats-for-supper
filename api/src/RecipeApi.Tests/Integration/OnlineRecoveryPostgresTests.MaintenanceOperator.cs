using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

namespace RecipeApi.Tests.Integration;

public partial class OnlineRecoveryPostgresTests
{
    [PostgresFact]
    public async Task MaintenanceOperator_ExactHoldAllowsNestedOwnerLocksButNoOrdinaryWriter()
    {
        using var scope = app.Services.CreateScope();
        var gate = scope.ServiceProvider.GetRequiredService<RecoveryBoundary>();
        var roots = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>();
        var (operation, candidate, marker, hash) = await OperatorMarker(roots);
        await Assert.ThrowsAsync<RecoveryBusyException>(() => gate.EnterAsync(RecoveryAccess.Write, default));
        Assert.Equal(42, await gate.RunMaintenanceAsync(operation, candidate, hash, async token =>
        {
            var assemblyHash = Convert.ToHexStringLower(SHA256.HashData(await File.ReadAllBytesAsync(typeof(RecoveryBoundary).Assembly.Location)));
            gate.ValidateMaintenanceInvocation(operation, candidate, assemblyHash);
            Assert.Throws<RecoveryBusyException>(() => gate.ValidateMaintenanceInvocation(Guid.NewGuid(), candidate, assemblyHash));
            Assert.Throws<RecoveryBusyException>(() => gate.ValidateMaintenanceInvocation(operation, new string('b', 40), assemblyHash));
            Assert.Throws<RecoveryBusyException>(() => gate.ValidateMaintenanceInvocation(operation, candidate, new string('f', 64)));
            await using (await gate.EnterAsync(RecoveryAccess.Write, token)) { }
            await using (await gate.EnterAsync(RecoveryAccess.Snapshot, token)) { }
            await using (await gate.EnterAsync(RecoveryAccess.Publish, token)) { }
            return 42;
        }));
        Assert.True(File.Exists(marker));
        await Assert.ThrowsAsync<RecoveryBusyException>(() => gate.EnterAsync(RecoveryAccess.Write, default));
        File.Delete(marker);
    }

    [PostgresFact]
    public async Task MaintenanceOperator_MutatedOrMissingMarkerRevokesCapabilityBeforeNestedWrite()
    {
        using var scope = app.Services.CreateScope();
        var gate = scope.ServiceProvider.GetRequiredService<RecoveryBoundary>();
        var roots = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>();
        foreach (var remove in new[] { false, true })
        {
            var (operation, candidate, marker, hash) = await OperatorMarker(roots);
            await gate.RunMaintenanceAsync(operation, candidate, hash, async token =>
            {
                if (remove) File.Delete(marker); else await File.AppendAllTextAsync(marker, " ");
                await Assert.ThrowsAsync<RecoveryBusyException>(() => gate.EnterAsync(RecoveryAccess.Write, token));
                await Assert.ThrowsAsync<RecoveryBusyException>(() => gate.EnterAsync(RecoveryAccess.Publish, token));
                return 0;
            });
            if (File.Exists(marker)) File.Delete(marker);
        }
    }

    [PostgresFact]
    public async Task MaintenanceOperator_CopiedExecutionContextCannotOutliveCallbackAndErrorReleasesMutex()
    {
        using var scope = app.Services.CreateScope();
        var gate = scope.ServiceProvider.GetRequiredService<RecoveryBoundary>();
        var roots = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>();
        var (operation, candidate, marker, hash) = await OperatorMarker(roots);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        Task? retired = null;
        await Assert.ThrowsAsync<IOException>(() => gate.RunMaintenanceAsync<int>(operation, candidate, hash, token =>
        {
            retired = Task.Run(async () =>
            {
                await release.Task;
                await Assert.ThrowsAsync<RecoveryBusyException>(() => gate.EnterAsync(RecoveryAccess.Write, default));
            });
            throw new IOException("Controlled operator interruption");
        }));
        release.SetResult(); await retired!;
        Assert.Equal(1, await gate.RunMaintenanceAsync(operation, candidate, hash, _ => Task.FromResult(1)));
        File.Delete(marker);
    }

    [PostgresFact]
    public async Task MaintenanceOperator_WrongOperationCandidateHashAndMalformedHoldNeverInvokeCallback()
    {
        using var scope = app.Services.CreateScope();
        var gate = scope.ServiceProvider.GetRequiredService<RecoveryBoundary>();
        var roots = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>();
        var (operation, candidate, marker, hash) = await OperatorMarker(roots);
        var invoked = 0;
        Task<int> Action(CancellationToken _) { invoked++; return Task.FromResult(1); }
        await Assert.ThrowsAsync<RecoveryBusyException>(() => gate.RunMaintenanceAsync(Guid.NewGuid(), candidate, hash, Action));
        await Assert.ThrowsAsync<RecoveryBusyException>(() => gate.RunMaintenanceAsync(operation, new string('b', 40), hash, Action));
        await Assert.ThrowsAsync<RecoveryBusyException>(() => gate.RunMaintenanceAsync(operation, candidate, new string('f', 64), Action));
        await File.WriteAllTextAsync(marker, "{}");
        var malformedHash = Convert.ToHexStringLower(SHA256.HashData(await File.ReadAllBytesAsync(marker)));
        await Assert.ThrowsAsync<RecoveryBusyException>(() => gate.RunMaintenanceAsync(operation, candidate, malformedHash, Action));
        Assert.Equal(0, invoked); File.Delete(marker);
    }

    [PostgresFact]
    public async Task MaintenanceOperator_ConcurrentInvocationCannotEnterCallbackBeforeCurrentOwnerCompletes()
    {
        using var scope = app.Services.CreateScope();
        var gate = scope.ServiceProvider.GetRequiredService<RecoveryBoundary>();
        var roots = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>();
        var (operation, candidate, marker, hash) = await OperatorMarker(roots);
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var calls = 0;
        var first = gate.RunMaintenanceAsync(operation, candidate, hash, async _ =>
        {
            Interlocked.Increment(ref calls); entered.SetResult(); await release.Task; return 1;
        });
        await entered.Task;
        try
        {
            await Assert.ThrowsAsync<RecoveryBusyException>(() => gate.RunMaintenanceAsync(operation, candidate, hash,
                _ => { Interlocked.Increment(ref calls); return Task.FromResult(2); }));
            Assert.Equal(1, calls);
        }
        finally { release.SetResult(); await first; }
        Assert.Equal(3, await gate.RunMaintenanceAsync(operation, candidate, hash, _ => Task.FromResult(3)));
        File.Delete(marker);
    }

    [PostgresFact]
    public async Task MaintenanceOperator_LostMutexSessionRevokesInvocationBeforeMutation()
    {
        using var scope = app.Services.CreateScope();
        var gate = scope.ServiceProvider.GetRequiredService<RecoveryBoundary>();
        var roots = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>();
        var (operation, candidate, marker, hash) = await OperatorMarker(roots);
        await gate.RunMaintenanceAsync(operation, candidate, hash, async token =>
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeApi.Data.RecipeDbContext>();
            await using var control = new Npgsql.NpgsqlConnection(Microsoft.EntityFrameworkCore.RelationalDatabaseFacadeExtensions.GetConnectionString(db.Database));
            await control.OpenAsync(token);
            await using var terminate = new Npgsql.NpgsqlCommand("SELECT pg_terminate_backend(pid) FROM pg_locks WHERE locktype='advisory' AND classid=0 AND objid=244005 AND objsubid=1 AND granted", control);
            Assert.True((bool)(await terminate.ExecuteScalarAsync(token))!);
            var assemblyHash = Convert.ToHexStringLower(SHA256.HashData(await File.ReadAllBytesAsync(typeof(RecoveryBoundary).Assembly.Location, token)));
            Assert.Throws<RecoveryBusyException>(() => gate.ValidateMaintenanceInvocation(operation, candidate, assemblyHash));
            await Assert.ThrowsAsync<RecoveryBusyException>(() => gate.EnterAsync(RecoveryAccess.Write, token));
            return 0;
        });
        File.Delete(marker);
    }

    private static async Task<(Guid Operation, string Candidate, string Marker, string Hash)> OperatorMarker(RecipesRootResolver roots)
    {
        Directory.CreateDirectory(roots.BaseRoot);
        var operation = Guid.NewGuid(); var candidate = new string('a', 40);
        var marker = Path.Combine(roots.BaseRoot, ".maintenance-hold.json");
        await File.WriteAllTextAsync(marker, JsonSerializer.Serialize(new { version = 1, operationId = operation,
            candidate, createdAt = DateTimeOffset.UtcNow, apiImage = "sha256:" + new string('c', 64), databaseContainer = new string('d', 64) }));
        return (operation, candidate, marker, Convert.ToHexStringLower(SHA256.HashData(await File.ReadAllBytesAsync(marker))));
    }
}
