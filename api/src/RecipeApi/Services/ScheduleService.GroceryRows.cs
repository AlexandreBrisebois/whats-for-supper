using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public partial class ScheduleService
{
    public Task<GroceryMutationResult> MutateGroceryItemAsync(int offset, GroceryItemMutationDto request,
        string? exclude = null, CancellationToken ct = default, DateOnly? reference = null)
    {
        if (request.RowId is null || request.RowId == Guid.Empty || request.WeekStartDate is null
            || !GroceryRowState.IsVersion(request.ExpectedRowVersion) || request.Checked is null
            || request.ClientMutationId is null || request.ClientMutationId == Guid.Empty)
            throw new GroceryMutationConflictException("upgrade_required");
        var id = request.RowId.Value.ToString("D");
        var input = GroceryRowState.ItemInput(request);
        return MutateGroceryRowsAsync(offset, request.WeekStartDate.Value, request.ClientMutationId.Value,
            input, request.ExpectedPresentationEpoch,
            (plan, rows, checks) =>
            {
                var row = rows.SingleOrDefault(row => row.RowId == id);
                if (row is null || row.RowVersion != request.ExpectedRowVersion)
                    throw new GroceryMutationConflictException("grocery_conflict", GroceryRowState.Snapshot(plan, _clock.UtcNow, row?.RowId), row is null);
                if (checks.GetValueOrDefault(id) != request.Checked.Value)
                    rows[rows.IndexOf(row)] = row with { RowVersion = GroceryRowState.Next(row.RowVersion) };
                checks[id] = request.Checked.Value;
                return id;
            }, exclude, ct, reference);
    }

    public Task<GroceryMutationResult> MutateGroceryBulkAsync(int offset, GroceryBulkMutationDto request,
        string? exclude = null, CancellationToken ct = default, DateOnly? reference = null)
    {
        if (request.WeekStartDate is null || !GroceryRowState.IsVersion(request.ExpectedListVersion) || request.Checks is null
            || request.ClientMutationId is null || request.ClientMutationId == Guid.Empty)
            throw new GroceryMutationConflictException("upgrade_required");
        var ordered = request.Checks.OrderBy(pair => pair.Key, StringComparer.Ordinal).ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal);
        var input = GroceryRowState.BulkInput(request);
        return MutateGroceryRowsAsync(offset, request.WeekStartDate.Value, request.ClientMutationId.Value,
            input, request.ExpectedPresentationEpoch,
            (plan, rows, checks) =>
            {
                if (plan.GroceryListVersion != request.ExpectedListVersion || ordered.Keys.Any(id => rows.All(row => row.RowId != id)))
                    throw new GroceryMutationConflictException("grocery_conflict", GroceryRowState.Snapshot(plan, _clock.UtcNow));
                foreach (var row in rows.ToArray())
                {
                    var next = ordered.GetValueOrDefault(row.RowId!);
                    if (checks.GetValueOrDefault(row.RowId!) != next)
                        rows[rows.IndexOf(row)] = row with { RowVersion = GroceryRowState.Next(row.RowVersion) };
                    checks[row.RowId!] = next;
                }
                return null;
            }, exclude, ct, reference);
    }

    private async Task<GroceryMutationResult> MutateGroceryRowsAsync(int offset, DateOnly week, Guid mutationId, object input, Guid? expectedPresentationEpoch,
        Func<WeeklyPlan, List<GroceryLineItemDto>, Dictionary<string, bool>, string?> apply,
        string? exclude, CancellationToken ct, DateOnly? reference)
    {
        if (week.DayOfWeek != DayOfWeek.Monday || _calendar.Capture(_clock.UtcNow, reference).WeekStart(offset) != week)
            throw new GroceryMutationConflictException("week_conflict");
        var boundary = groceryRecoveryBoundary ?? throw new InvalidOperationException("Grocery mutations require recovery coordination.");
        var vocabulary = groceryVocabulary ?? throw new InvalidOperationException("Grocery mutations require the presentation authority.");
        // Service-direct calls need the same publication fence as HTTP calls.
        // Keep it through receipt lookup, mutation, commit and response decoration.
        await using var writeLease = await boundary.EnterAsync(RecoveryAccess.Write, ct);
        using var binding = boundary.BindLease(writeLease);
        var presentation = await vocabulary.CapturePresentationAsync([], ct);
        if (expectedPresentationEpoch is { } expected ? expected != presentation.Epoch : presentation.Epoch != Guid.Empty)
            throw new GroceryMutationConflictException("epoch_conflict");
        var hash = GroceryRowState.InputHash(input);
        var replay = false;
        WeeklyPlan? authoritativePlan = null;
        try
        {
            var result = await groceryChecks.ProcessWeekAsync(week, async db =>
            {
                var saved = await db.GroceryMutationOutcomes.AsNoTracking().SingleOrDefaultAsync(outcome => outcome.Id == mutationId, ct);
                if (saved is not null)
                {
                    if (saved.InputHash != hash) throw new GroceryMutationConflictException("mutation_conflict");
                    replay = true;
                    return GroceryRowState.ReadCapturedOutcome(saved).Result;
                }
                var plan = await db.WeeklyPlans.SingleOrDefaultAsync(plan => plan.WeekStartDate == week, ct)
                    ?? throw new GroceryMutationConflictException("grocery_conflict", absent: true);
                var rows = GroceryRowState.Rows(plan);
                GroceryRowState.RequireCurrent(plan, rows);
                var checks = GroceryRowState.Checks(plan);
                var priorChecks = new Dictionary<string, bool>(checks, StringComparer.Ordinal);
                var baselines = GroceryCheckedDemand.Read(plan, _logger);
                var evidence = GroceryDemandEvidence.Read(plan, _logger);
                var rowId = apply(plan, rows, checks);
                foreach (var row in rows)
                {
                    if (!checks.GetValueOrDefault(row.RowId)) baselines.Remove(row.RowId);
                    else if (!priorChecks.GetValueOrDefault(row.RowId))
                        baselines[row.RowId] = GroceryCheckedDemand.Capture(row, row.RowVersion, evidence.GetValueOrDefault(row.RowId)?.InputFingerprint);
                    // A missing baseline on an already checked row stays unknown.
                }
                plan.GroceryCheckedDemandBaselines = JsonSerializer.Serialize(baselines);
                authoritativePlan = plan;
                plan.GroceryState = JsonSerializer.Serialize(checks);
                plan.GroceryItems = JsonSerializer.Serialize(rows);
                plan.GroceryListVersion = GroceryRowState.Next(plan.GroceryListVersion);
                var outcome = GroceryRowState.Snapshot(plan, _clock.UtcNow, rowId);
                db.GroceryMutationOutcomes.Add(new() { Id = mutationId, InputHash = hash, WeekStartDate = week, Outcome = GroceryRowState.SerializeCapturedOutcome(outcome, input) });
                await db.SaveChangesAsync(ct);
                return outcome;
            }, ct, async outcome =>
            {
                GroceryCheckCoordinator.SynchronizeTrackedPlan(_dbContext, outcome.WeekStartDate, JsonSerializer.Serialize(outcome.Checks), JsonSerializer.Serialize(outcome.Rows), outcome.ListVersion, authoritativePlan);
                if (!replay) await _publisher.PublishGroceryRowsUpdatedAsync(offset, outcome, exclude);
            }, mutationId);
            return groceryPresentation is null ? result : await groceryPresentation.DecorateAsync(result, ct);
        }
        catch (GroceryMutationConflictException conflict) when (conflict.Current is not null && groceryPresentation is not null)
        {
            throw new GroceryMutationConflictException(conflict.Code, await groceryPresentation.DecorateAsync(conflict.Current, ct), conflict.Absent);
        }
    }
}
