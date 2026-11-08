using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;

namespace RecipeApi.Services;

// Own the task from its final eligibility read through processor/result handling.
// A timestamp is not liveness proof. No transaction is held across the processor:
// its child/publication commits use their existing independent scopes/locks.
internal sealed class WorkflowExecutionLease : IAsyncDisposable
{
    private sealed class Gate
    {
        public readonly SemaphoreSlim Semaphore = new(1, 1);
        public int Users;
    }
    private static readonly Dictionary<Guid, Gate> Gates = [];
    private readonly Guid id;
    private readonly Gate gate;
    private NpgsqlConnection? connection;
    private bool disposed;

    private WorkflowExecutionLease(Guid id, Gate gate) { this.id = id; this.gate = gate; }

    public static async Task<WorkflowExecutionLease?> EnterAsync(RecipeDbContext db, Guid id,
        bool wait, CancellationToken ct)
    {
        Gate gate;
        lock (Gates)
        {
            if (!Gates.TryGetValue(id, out gate!)) Gates.Add(id, gate = new Gate());
            gate.Users++;
        }
        var acquired = false;
        WorkflowExecutionLease? lease = null;
        try
        {
            acquired = await gate.Semaphore.WaitAsync(wait ? Timeout.Infinite : 0, ct);
            if (!acquired) return null;
            lease = new WorkflowExecutionLease(id, gate);
            if (db.Database.IsNpgsql())
            {
                // A dedicated unpooled session makes disposal release ownership even
                // after cancellation/failed unlock, without returning a locked pool slot.
                var settings = new NpgsqlConnectionStringBuilder(db.Database.GetConnectionString()) { Pooling = false };
                lease.connection = new NpgsqlConnection(settings.ConnectionString);
                await lease.connection.OpenAsync(ct);
                var function = wait ? "pg_advisory_lock" : "pg_try_advisory_lock";
                await using var command = new NpgsqlCommand(
                    $"SELECT {function}(hashtextextended(@identity, 0))", lease.connection)
                { CommandTimeout = 0 };
                command.Parameters.AddWithValue("identity", "workflow-execution:" + id.ToString("D"));
                var result = await command.ExecuteScalarAsync(ct);
                if (!wait && result is not true)
                {
                    await lease.DisposeAsync();
                    return null;
                }
            }
            return lease;
        }
        catch
        {
            if (lease is not null) await lease.DisposeAsync();
            else if (acquired) gate.Semaphore.Release();
            throw;
        }
        finally
        {
            if (lease is null) ReleaseReference(id, gate);
        }
    }

    private static void ReleaseReference(Guid id, Gate gate)
    {
        lock (Gates)
        {
            if (--gate.Users == 0)
            {
                Gates.Remove(id);
                gate.Semaphore.Dispose();
            }
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (disposed) return;
        disposed = true;
        try { if (connection is not null) await connection.DisposeAsync(); }
        finally
        {
            gate.Semaphore.Release();
            ReleaseReference(id, gate);
        }
    }
}
