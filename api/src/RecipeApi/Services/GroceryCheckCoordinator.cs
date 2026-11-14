using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;
using RecipeApi.Data;

namespace RecipeApi.Services;

/// <summary>Serializes normal grocery-map writes on this application instance.</summary>
public sealed class GroceryCheckCoordinator(IServiceScopeFactory scopes)
{
    private readonly SemaphoreSlim gate = new(1, 1);

    internal Task<T> ProcessWeekAsync<T>(DateOnly monday, Func<RecipeDbContext, Task<T>> operation,
        CancellationToken ct, Func<T, Task>? afterCommit = null, Guid? mutationId = null) => ProcessAsync(async db =>
    {
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        if (db.Database.IsNpgsql())
        {
            if (mutationId is { } id)
            {
                var key = System.Buffers.Binary.BinaryPrimitives.ReadInt32LittleEndian(System.Security.Cryptography.SHA256.HashData(id.ToByteArray()));
                await db.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock({1464226632}, {key})", ct);
            }
            await db.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock({1464226631}, {monday.DayNumber})", ct);
        }
        var result = await operation(db);
        if (transaction is not null) await transaction.CommitAsync(ct);
        if (afterCommit is not null) await afterCommit(result);
        return result;
    }, ct);

    internal async Task<T> ProcessAsync<T>(Func<RecipeDbContext, Task<T>> operation, CancellationToken ct)
    {
        await gate.WaitAsync(ct);
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            return await operation(scope.ServiceProvider.GetRequiredService<RecipeDbContext>());
        }
        finally { gate.Release(); }
    }

    internal static void SynchronizeTrackedPlan(RecipeDbContext caller, DateOnly monday, string state, string items, string? listVersion = null, WeeklyPlan? demand = null)
    {
        foreach (var entry in caller.ChangeTracker.Entries<Models.WeeklyPlan>().Where(e => e.Entity.WeekStartDate == monday).ToArray())
        {
            if (listVersion is not null && GroceryRowState.IsVersion(entry.Entity.GroceryListVersion)
                && ulong.Parse(entry.Entity.GroceryListVersion, System.Globalization.CultureInfo.InvariantCulture) > ulong.Parse(listVersion, System.Globalization.CultureInfo.InvariantCulture)) continue;
            if (demand is not null)
            {
                var baseline = entry.Property(p => p.GroceryCheckedDemandBaselines);
                baseline.CurrentValue = baseline.OriginalValue = demand.GroceryCheckedDemandBaselines;
                baseline.IsModified = false;
                var evidence = entry.Property(p => p.GroceryDemandEvidence);
                evidence.CurrentValue = evidence.OriginalValue = demand.GroceryDemandEvidence;
                evidence.IsModified = false;
                var summary = entry.Property(p => p.GroceryResetSummaryVersion);
                summary.CurrentValue = summary.OriginalValue = demand.GroceryResetSummaryVersion;
                summary.IsModified = false;

            }
            var checks = entry.Property(p => p.GroceryState);
            checks.CurrentValue = checks.OriginalValue = state;
            checks.IsModified = false;
            var lines = entry.Property(p => p.GroceryItems);
            lines.CurrentValue = lines.OriginalValue = items;
            lines.IsModified = false;
            if (listVersion is not null)
            {
                var version = entry.Property(p => p.GroceryListVersion);
                version.CurrentValue = version.OriginalValue = listVersion;
                version.IsModified = false;
            }
        }
    }
}
