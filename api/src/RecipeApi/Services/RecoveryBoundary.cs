using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public enum RecoveryAccess { Read, Write, Snapshot, Publish }
public sealed class RecoveryBusyException(string message) : Exception(message);

/// <summary>Cross-process leases. Order is always publication, then writes; never upgrade a held lease.</summary>
public sealed class RecoveryBoundary(RecipeDbContext db, IConfiguration configuration, RecipesRootResolver recipes, DemoModeOptions? demoMode = null)
{
    private readonly DemoModeOptions _demoPolicy = demoMode ?? new DemoModeOptions(configuration);
    private readonly AsyncLocal<LeaseState?> ambientLease = new();

    // Bind synchronously in the caller's execution context, after acquiring the
    // real lease. Only its retained ownership can authorize nested work.
    internal IDisposable BindLease(IAsyncDisposable acquired)
    {
        if (acquired is EmptyLease empty && ReferenceEquals(empty.Owner, this)) return new EmptyBinding();
        if (acquired is not Lease lease || !ReferenceEquals(lease.State.Owner, this) || lease.Disposed
            || lease.State.Access is not (RecoveryAccess.Read or RecoveryAccess.Write or RecoveryAccess.Snapshot))
            throw new InvalidOperationException("Only this boundary's live read, write or snapshot lease can be bound.");
        var previous = ambientLease.Value;
        ambientLease.Value = lease.State;
        return new Binding(ambientLease, previous);
    }
    // Operator-owned intent survives application/session loss. Creation drains the
    // existing publication lease first; removal requires stopped-app read-back.
    // Any entry (even malformed or unreadable) is a hold, never an automatic reopen.
    private bool MaintenanceHeld
    {
        get
        {
            try
            {
                _ = File.GetAttributes(Path.Combine(recipes.BaseRoot, ".maintenance-hold.json"));
                return true;
            }
            catch (FileNotFoundException) { return false; }
            catch (DirectoryNotFoundException) { return false; }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { return true; }
        }
    }
    public bool Enabled => (_demoPolicy.Enabled && db.Database.IsNpgsql())
        || MaintenanceHeld
        || File.Exists(Path.Combine(recipes.BaseRoot, ".demo-coordination"))
        || !string.IsNullOrWhiteSpace(configuration["Recovery:BackupRoot"])
        || File.Exists(Path.Combine(recipes.BaseRoot, ".recovery-journal.json"));
    // Writes participate before the first snapshot so activation can drain in-flight work.
    public bool CoordinatesWrites => db.Database.IsNpgsql() || Enabled;
    public async Task<IAsyncDisposable> EnterAsync(RecoveryAccess access, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        if (ambientLease.Value is { } held && held.TryRetain(access, out var borrowed)) return borrowed!;
        if (!Enabled && !db.Database.IsNpgsql()) return new EmptyLease(this);
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
            if (access is RecoveryAccess.Write or RecoveryAccess.Publish && MaintenanceHeld)
                throw new RecoveryBusyException("Planned maintenance holds writes and recovery publication until verified operator reopening.");
            if (access is RecoveryAccess.Write or RecoveryAccess.Snapshot)
            {
                command.CommandText = $"SELECT {(access == RecoveryAccess.Snapshot ? "pg_advisory_lock" : "pg_advisory_lock_shared")}(244002)";
                await command.ExecuteNonQueryAsync(timeout.Token);
            }
            if (access != RecoveryAccess.Publish && File.Exists(Path.Combine(recipes.BaseRoot, ".recovery-journal.json")))
                throw new RecoveryBusyException("An interrupted restore requires reconciliation; use recovery resume.");
            return new Lease(new LeaseState(this, access, connection));
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            await connection.DisposeAsync();
            throw new RecoveryBusyException("Recovery is coordinating household operations; retry after five seconds.");
        }
        catch { await connection.DisposeAsync(); throw; }
    }
    private sealed class EmptyLease(RecoveryBoundary owner) : IAsyncDisposable
    {
        public RecoveryBoundary Owner { get; } = owner;
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
    private sealed class EmptyBinding : IDisposable { public void Dispose() { } }
    private sealed class Binding(AsyncLocal<LeaseState?> ambient, LeaseState? previous) : IDisposable
    {
        private bool disposed;
        public void Dispose()
        {
            if (disposed) return;
            ambient.Value = previous;
            disposed = true;
        }
    }
    private sealed class Lease(LeaseState state) : IAsyncDisposable
    {
        private int disposed;
        public LeaseState State { get; } = state;
        public bool Disposed => Volatile.Read(ref disposed) != 0;
        public ValueTask DisposeAsync() => Interlocked.Exchange(ref disposed, 1) == 0
            ? State.ReleaseAsync() : ValueTask.CompletedTask;
    }
    private sealed class LeaseState(RecoveryBoundary owner, RecoveryAccess access, NpgsqlConnection connection)
    {
        private int references = 1;
        public RecoveryBoundary Owner { get; } = owner;
        public RecoveryAccess Access { get; } = access;
        public bool TryRetain(RecoveryAccess requested, out Lease? lease)
        {
            lease = null;
            while (true)
            {
                var count = Volatile.Read(ref references);
                if (count <= 0) return false;
                if (requested != RecoveryAccess.Read && !(requested == RecoveryAccess.Write && Access == RecoveryAccess.Write))
                    throw new InvalidOperationException("A bound recovery lease cannot be upgraded or used for nested snapshot/publication.");
                if (Interlocked.CompareExchange(ref references, checked(count + 1), count) != count) continue;
                lease = new Lease(this);
                return true;
            }
        }
        public async ValueTask ReleaseAsync()
        {
            if (Interlocked.Decrement(ref references) != 0) return;
            try
            {
                await using var command = new NpgsqlCommand("SELECT pg_advisory_unlock_all()", connection);
                await command.ExecuteNonQueryAsync();
            }
            finally { await connection.DisposeAsync(); }
        }
    }
}
