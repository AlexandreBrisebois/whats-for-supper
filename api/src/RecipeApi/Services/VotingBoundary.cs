using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed class VotingConflictException(string message) : Exception(message);

/// <summary>Serializes household round writes and snapshots, including legacy SQL vote writers.</summary>
internal static class VotingBoundary
{
    public static async Task<IDbContextTransaction?> BeginAsync(RecipeDbContext db, CancellationToken ct = default)
    {
        if (!db.Database.IsRelational()) return null;
        if (db.Database.CurrentTransaction is not null)
        {
            await LockAsync(db, ct);
            return null;
        }
        var transaction = await db.Database.BeginTransactionAsync(ct);
        try
        {
            await LockAsync(db, ct);
            return transaction;
        }
        catch { await transaction.DisposeAsync(); throw; }
    }

    private static Task<int> LockAsync(RecipeDbContext db, CancellationToken ct) => db.Database.ExecuteSqlRawAsync(
        "LOCK TABLE weekly_plans, calendar_events, recipe_votes, voting_round_state, weekly_household_interest IN SHARE ROW EXCLUSIVE MODE", ct);

    public static async Task<VotingRoundState> StateAsync(RecipeDbContext db, CancellationToken ct = default)
    {
        var state = await db.VotingRoundStates.SingleOrDefaultAsync(ct);
        if (state is not null) return state;
        state = new VotingRoundState();
        db.VotingRoundStates.Add(state);
        return state;
    }
}
