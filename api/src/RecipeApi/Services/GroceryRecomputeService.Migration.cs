using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public partial class GroceryRecomputeService
{
    internal async Task<MaintenanceCommandObservation> RebuildMigrationWeekAsync(DateOnly monday, MaintenanceCommandObservation planReceipt,
        Func<RecipeDbContext, CancellationToken, Task> admit, Action validate, Func<WeeklyPlan, string> protectedWeekSha256, DateOnly evaluationDate,
        IRecoveryCheckpoint? checkpoint, CancellationToken ct)
    {
        var operation = CanonicalRecipeMigrationReceipt.Read(planReceipt).Payload.OperationId;
        WeeklyPlan? committed = null;
        var receipt = await groceryChecks.ProcessWeekAsync(monday, async fresh =>
        {
            validate();
            await admit(fresh, ct);
            var id = CanonicalRecipeMigrationReceipt.WeekReceiptId(operation, monday);
            if (await CanonicalRecipeMigrationReceipt.FindAsync(fresh, id, ct) is { } done)
            {
                CanonicalRecipeMigrationReceipt.RequireWeekBinding(done, planReceipt, monday);
                return done;
            }
            // All converter output is already admitted. Recompute's internal save
            // stays uncommitted inside the coordinator's transaction.
            validate();
            var (plan, checks, _) = await RecomputeOwnedAsync(fresh, monday, ct, migrationReset: true, evaluationDate: evaluationDate);
            if (checkpoint is not null) await checkpoint.ReachedAsync("migration-week-recomputed", ct);
            // Hash the provider's actual timestamp/JSON representation. PostgreSQL
            // truncates timestamp precision relative to a .NET clock tick.
            await fresh.Entry(plan).ReloadAsync(ct);
            foreach (var key in checks.Keys.ToArray()) checks[key] = false;
            plan.GroceryState = JsonSerializer.Serialize(checks);
            plan.GroceryCheckedDemandBaselines = "{}";
            plan.GroceryResetSummaryVersion = operation.ToString("N");
            plan.GroceryListVersion = GroceryRowState.Next(plan.GroceryListVersion);
            // Recompute all weeks synchronously; no new refresh worker is queued.
            var command = CanonicalRecipeMigrationReceipt.Week(planReceipt, plan, protectedWeekSha256(plan), clock.UtcNow);
            fresh.MaintenanceCommands.Add(command);
            await fresh.SaveChangesAsync(ct);
            if (checkpoint is not null) await checkpoint.ReachedAsync("migration-week-before-commit", ct);
            await admit(fresh, ct);
            validate();
            committed = plan;
            return MaintenanceCommandObservation.From(command);
        }, ct, mutationId: CanonicalRecipeMigrationReceipt.WeekReceiptId(operation, monday));
        // Synchronize only committed data; an interrupted transaction cannot leak
        // speculative reset state into the caller's tracker or an SSE event.
        if (committed is not null)
            GroceryCheckCoordinator.SynchronizeTrackedPlan(db, monday, committed.GroceryState, committed.GroceryItems, committed.GroceryListVersion, committed);
        return receipt;
    }
}
