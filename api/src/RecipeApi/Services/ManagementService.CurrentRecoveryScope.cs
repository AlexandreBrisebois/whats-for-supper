using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public partial class ManagementService
{
    // Explicit internal setup only, not registered as an HTTP/workflow operation.
    // The ID is selected outside the archive, never generated while reading it.
    public async Task<CurrentRecoveryScope> SelectCurrentRecoveryScopeAsync(Guid householdId, CancellationToken ct = default)
    {
        if (householdId == Guid.Empty) throw new ArgumentException("Select a nonempty destination household identity.", nameof(householdId));
        RequireOwnCurrentRecoveryTransaction();
        if (!db.Database.IsNpgsql()) throw new InvalidOperationException("Recovery scope selection requires PostgreSQL schema qualification.");
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var fingerprint = await LockCurrentRecoverySchemaAsync(ct);
        return await CurrentRecoveryScopeStore.SelectAsync(DataRoot, householdId, fingerprint, ct);
    }

    public async Task<CurrentRecoveryInspection> InspectSelectedCurrentRecoveryAsync(string root,
        IReadOnlyList<CurrentRecipeRecoveryBaseline> reviewedBaselines, CancellationToken ct = default)
    {
        var selected = await CurrentRecoveryScopeStore.ReadAsync(DataRoot, ct);
        return await InspectCurrentRecoveryCoreAsync(root, selected.HouseholdId, selected.SchemaFingerprint,
            reviewedBaselines, verifySelectedSchema: true, ct);
    }

    private void RequireOwnCurrentRecoveryTransaction()
    {
        if (db.Database.CurrentTransaction is not null || System.Transactions.Transaction.Current is not null)
            throw new InvalidOperationException("Current recovery requires its own transaction, without caller-uncommitted state.");
    }

    private async Task<string> LockCurrentRecoverySchemaAsync(CancellationToken ct)
    {
        if (!db.Database.IsNpgsql()) throw new InvalidOperationException("Selected recovery inspection requires PostgreSQL schema qualification.");
        // Reuse the existing complete public-table inventory and shape fingerprint
        // owner. Dispositions still belong to exact/demo recovery, not this read.
        var tables = RecoverySnapshotService.DemoDispositions.Keys.Order(StringComparer.Ordinal).ToArray();
        await db.Database.ExecuteSqlRawAsync("SET LOCAL lock_timeout = '5s'", ct);
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();
        // Identifiers are the fixed repository inventory above, never archive or
        // request values. SQL parameters cannot represent table identifiers.
        await using (var command = new NpgsqlCommand("LOCK TABLE " + string.Join(",", tables) + " IN SHARE MODE", connection))
            await command.ExecuteNonQueryAsync(ct);
        var actual = await RecoverySnapshotService.ScalarAsync(connection,
            "SELECT string_agg(tablename,',' ORDER BY tablename) FROM pg_tables WHERE schemaname='public'", ct);
        if (!actual.Split(',').SequenceEqual(tables))
            throw new InvalidDataException("Current recovery requires a classified complete database schema.");
        return await RecoverySnapshotService.SchemaAsync(connection, ct, tables);
    }
}
