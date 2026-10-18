using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;

namespace RecipeApi.Services;

public partial class ManagementService
{
    private sealed record InterestSnapshot(int Version, Guid Generation, List<WeeklyHouseholdInterest> Rows);

    private async Task ExportInterestAsync(string path, CancellationToken ct, bool boundaryHeld = false)
    {
        InterestSnapshot snapshot;
        await using (var transaction = boundaryHeld ? null : await VotingBoundary.BeginAsync(db, ct))
        {
            var state = await VotingBoundary.StateAsync(db, ct);
            var rows = await db.WeeklyHouseholdInterests.AsNoTracking().OrderBy(x => x.WeekStartDate).ThenBy(x => x.RecipeId).ToListAsync(ct);
            snapshot = new(1, state.HistoryGeneration, rows);
            await db.SaveChangesAsync(ct);
            if (transaction is not null) await transaction.CommitAsync(ct);
        }
        var temporary = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await WriteJsonAsync(temporary, snapshot, ct);
            File.Move(temporary, path, true);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }

    private async Task<InterestSnapshot?> ReadInterestAsync(string path, bool absentMeansEmpty, CancellationToken ct)
    {
        if (!File.Exists(path)) return absentMeansEmpty ? new(1, Guid.NewGuid(), []) : null;
        var snapshot = await ReadJsonAsync<InterestSnapshot>(path, ct)
            ?? throw new InvalidDataException("Aggregate history artifact is empty or invalid.");
        if (snapshot.Version != 1 || snapshot.Rows is null ||
            snapshot.Rows.Any(x => x.PositiveCount <= 0 || x.WeekStartDate.DayOfWeek != DayOfWeek.Monday || x.RecipeId == Guid.Empty) ||
            snapshot.Rows.Select(x => (x.WeekStartDate, x.RecipeId)).Distinct().Count() != snapshot.Rows.Count)
            throw new InvalidDataException("Unsupported or malformed aggregate history artifact; history was not replaced.");
        return snapshot;
    }

    private async Task ReplaceInterestAsync(InterestSnapshot snapshot, CancellationToken ct)
    {
        var ids = snapshot.Rows.Select(x => x.RecipeId).Distinct().ToArray();
        if (await db.Recipes.IgnoreQueryFilters().CountAsync(x => ids.Contains(x.Id), ct) != ids.Length)
            throw new InvalidDataException("Aggregate history references recipes missing after restore; history was not replaced.");
        db.WeeklyHouseholdInterests.RemoveRange(db.WeeklyHouseholdInterests);
        await db.SaveChangesAsync(ct);
        db.WeeklyHouseholdInterests.AddRange(snapshot.Rows);
        var state = await VotingBoundary.StateAsync(db, ct);
        state.RoundId = Guid.NewGuid();
        state.HistoryGeneration = Guid.NewGuid();
        state.RequiresRoundIdentity = true;
        var plans = await db.WeeklyPlans.ToListAsync(ct);
        var active = plans.Where(x => x.Status == WeeklyPlanStatus.VotingOpen).ToList();
        state.WeekStartDate = active.Count == 1 ? active[0].WeekStartDate : null;
        foreach (var plan in plans)
        {
            plan.LastClosedRoundId = null;
            plan.VotingRoundId = active.Count == 1 && plan == active[0] ? state.RoundId : null;
            plan.RequiresRoundIdentity = true;
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task RestoreInterestAsync(string path, bool absentMeansEmpty, CancellationToken ct)
    {
        var snapshot = await ReadInterestAsync(path, absentMeansEmpty, ct);
        if (snapshot is null)
        {
            if (publisher is not null) await publisher.PublishAllSuggestionsInvalidatedAsync();
            return;
        }
        await using var transaction = await VotingBoundary.BeginAsync(db, ct);
        await ReplaceInterestAsync(snapshot, ct);
        await new RecipeSearchFilterMaterializer(db, clock).MaterializeAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        if (publisher is not null) await publisher.PublishAllSuggestionsInvalidatedAsync();
    }
}
