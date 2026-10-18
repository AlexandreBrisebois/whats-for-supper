using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public enum RecoveryAccess { Read, Write, Snapshot, Publish }
public sealed class RecoveryBusyException(string message) : Exception(message);

/// <summary>Cross-process leases. Order is always publication, then writes; never upgrade a held lease.</summary>
public sealed class RecoveryBoundary(RecipeDbContext db, IConfiguration configuration, RecipesRootResolver recipes)
{
    public bool Enabled => !string.IsNullOrWhiteSpace(configuration["Recovery:BackupRoot"]);
    public async Task<IAsyncDisposable> EnterAsync(RecoveryAccess access, CancellationToken ct)
    {
        if (!Enabled) return new EmptyLease();
        if (!db.Database.IsNpgsql()) throw new RecoveryBusyException("Online recovery coordination requires PostgreSQL.");
        var connection = new NpgsqlConnection(db.Database.GetConnectionString());
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Recovery:WaitSeconds", 5), 1, 60)));
        try
        {
            await connection.OpenAsync(timeout.Token);
            var publication = access == RecoveryAccess.Publish ? "pg_advisory_lock" : "pg_advisory_lock_shared";
            await using var command = new NpgsqlCommand($"SELECT {publication}(244001)", connection);
            await command.ExecuteNonQueryAsync(timeout.Token);
            if (access is RecoveryAccess.Write or RecoveryAccess.Snapshot)
            {
                command.CommandText = $"SELECT {(access == RecoveryAccess.Snapshot ? "pg_advisory_lock" : "pg_advisory_lock_shared")}(244002)";
                await command.ExecuteNonQueryAsync(timeout.Token);
            }
            if (access != RecoveryAccess.Publish && File.Exists(Path.Combine(recipes.BaseRoot, ".recovery-journal.json")))
                throw new RecoveryBusyException("An interrupted restore requires reconciliation; use recovery resume.");
            return new Lease(connection);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            await connection.DisposeAsync();
            throw new RecoveryBusyException("Recovery is coordinating household operations; retry after five seconds.");
        }
        catch { await connection.DisposeAsync(); throw; }
    }
    private sealed class EmptyLease : IAsyncDisposable { public ValueTask DisposeAsync() => ValueTask.CompletedTask; }
    private sealed class Lease(NpgsqlConnection connection) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            try { await new NpgsqlCommand("SELECT pg_advisory_unlock_all()", connection).ExecuteNonQueryAsync(); }
            finally { await connection.DisposeAsync(); }
        }
    }
}
