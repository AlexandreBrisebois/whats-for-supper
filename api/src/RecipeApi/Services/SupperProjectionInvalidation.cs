using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>Enlists effective ingredient changes in the existing durable supper-grocery refresh lifecycle.</summary>
public sealed class SupperProjectionInvalidation(RecipeDbContext db, IClock clock, DeploymentCalendar calendar)
{
    // Awaited by Program before the host starts accepting requests or running workers.
    public async Task ReconcileActivationAsync(RecoveryBoundary boundary, RecoverySnapshotService recovery, CancellationToken ct)
    {
        // Publication must finish before acquiring the shared write lease: never upgrade leases.
        await recovery.ResumeIfInterruptedAsync(ct);
        await using var lease = await boundary.EnterAsync(RecoveryAccess.Write, ct);
        await using var transaction = await SupperServingsService.BeginAsync(db, ct);
        await AuditSavedWeeksAsync(false, ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
    }

    // Caller already owns the household transaction (including exact recovery publication).
    internal async Task AuditSavedWeeksAsync(bool restartPending, CancellationToken ct)
    {
        var plans = await db.WeeklyPlans.ToListAsync(ct);
        var weeks = plans.Select(x => x.WeekStartDate).ToArray();
        var usual = await SupperServingsService.ReadUsualAsync(db, ct);
        await SupperServingsService.MaterializeInheritedAsync(db, clock, calendar, usual.Count, ct);
        var changed = await EnlistWeeksAsync(weeks, ct);
        // Exact restore fenced pre-restore workers. Pending equal-version work needs a new owner.
        if (restartPending)
            foreach (var plan in plans.Where(x => !changed.Contains(x.WeekStartDate)
                && x.ServingInputVersion is not null && x.ServingAppliedVersion != x.ServingInputVersion))
                SupperServingsService.Enqueue(db, plan, plan.ServingInputVersion!, clock.UtcNow);
        await db.SaveChangesAsync(ct);
    }

    // Caller owns the leading supper-input locks and the recipe write transaction.
    public async Task<IReadOnlyList<DateOnly>> EnlistRecipeAsync(Guid recipeId, CancellationToken ct)
    {
        var now = clock.UtcNow;
        var today = calendar.Capture(now).Today;
        var dates = await db.CalendarEvents.Where(x => x.RecipeId == recipeId && x.Date >= today).Select(x => x.Date).ToListAsync(ct);
        return await EnlistWeeksAsync(dates.Select(DeploymentCalendar.Monday), ct);
    }

    // The same transaction-aware week owner is reusable by calendar/portions writers.
    public async Task<IReadOnlyList<DateOnly>> EnlistWeeksAsync(IEnumerable<DateOnly> weeks, CancellationToken ct)
    {
        var now = clock.UtcNow;
        var today = calendar.Capture(now).Today;
        var changed = new List<DateOnly>();
        foreach (var monday in weeks.Distinct().Order())
        {
            var version = SupperProjectionInputs.WeekVersion(await SupperProjectionInputs.ReadWeekAsync(db, monday, today, ct));
            var plan = await db.WeeklyPlans.SingleOrDefaultAsync(x => x.WeekStartDate == monday, ct);
            if (plan is null) { plan = new WeeklyPlan { WeekStartDate = monday, CreatedAt = now }; db.WeeklyPlans.Add(plan); }
            if (plan.ServingInputVersion == version) continue;
            SupperServingsService.Enqueue(db, plan, version, now);
            changed.Add(monday);
        }
        await db.SaveChangesAsync(ct);
        return changed;
    }

    internal async Task MarkFailedAsync(DateOnly monday, Guid workflowId, CancellationToken ct)
    {
        if (db.Database.IsRelational())
            await db.Database.ExecuteSqlAsync($"UPDATE weekly_plans SET serving_refresh_status = 'failed' WHERE week_start_date = {monday} AND serving_refresh_workflow_id = {workflowId} AND serving_applied_version IS DISTINCT FROM serving_input_version", ct);
        else
        {
            var plan = await db.WeeklyPlans.SingleAsync(x => x.WeekStartDate == monday, ct);
            if (plan.ServingRefreshWorkflowId == workflowId && plan.ServingAppliedVersion != plan.ServingInputVersion)
            { plan.ServingRefreshStatus = "failed"; await db.SaveChangesAsync(ct); }
        }
        // A prior read may be tracked in the calendar writer's context.
        foreach (var entry in db.ChangeTracker.Entries<WeeklyPlan>().Where(x => x.Entity.WeekStartDate == monday).ToArray())
            await entry.ReloadAsync(ct);
    }

}
