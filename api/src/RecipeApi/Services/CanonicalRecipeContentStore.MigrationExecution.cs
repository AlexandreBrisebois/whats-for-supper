using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public sealed record CanonicalMigrationRecipeOutcome(Guid RecipeId, Guid OperationId, string Outcome, string? Reason);
public sealed record CanonicalMigrationWeekOutcome(DateOnly WeekStart, Guid ReceiptId, string Outcome);
public sealed record CanonicalMigrationExecutionReport(Guid OperationId, string ManifestSha256, bool Completed,
    IReadOnlyList<CanonicalMigrationRecipeOutcome> Recipes, IReadOnlyList<CanonicalMigrationWeekOutcome> Weeks, DateOnly EvaluationDate);

public sealed partial class CanonicalRecipeContentStore
{
    internal async Task<CanonicalMigrationExecutionReport> ExecuteMigrationAsync(CanonicalMigrationInventory inventory, string candidateCommit,
        RecoverySnapshotService snapshots, RecoveryBoundary boundary, RecipesRootResolver roots,
        GroceryRecomputeService groceries, IRecoveryCheckpoint? checkpoint = null, CancellationToken ct = default)
    {
        void Validate() => boundary.ValidateMaintenanceInvocation(inventory.Request.OperationId, candidateCommit, inventory.Request.CandidateSha256);
        Validate();
        // Freeze the complete object graph so a caller cannot change the binding while awaiting I/O.
        inventory = FoodVocabularyDefinitions.ReadStrict<CanonicalMigrationInventory>(JsonSerializer.Serialize(inventory, Json));
        _ = CanonicalRecipeMigrationManifest.FreezeRequest(inventory.Request);
        CanonicalRecipeMigrationManifest.Require(inventory.Version == 1 && inventory.EvaluationDate != default && inventory.Request.ModelRevision == MigrationModelRevision
            && inventory.ObservationSha256 == CanonicalRecipeMigrationManifest.Hash(JsonSerializer.Serialize(inventory with { ObservationSha256 = "" }, Json)),
            "Migration observation or executing model differs.");
        if (inventory.Recipes.Any(x => x.Status is not ("observed-canonical" or "requires-forward-assessment")))
            return new(inventory.Request.OperationId, inventory.ObservationSha256, false,
                Array.AsReadOnly(inventory.Recipes.Select(x => new CanonicalMigrationRecipeOutcome(x.RecipeId, x.OperationId,
                    x.Status is "observed-canonical" or "requires-forward-assessment" ? "not-executed" : x.Status, x.Reason)).ToArray()), [], inventory.EvaluationDate);
        var expected = CanonicalRecipeMigrationReceipt.Plan(inventory, candidateCommit, clock.UtcNow);
        var existingPlan = await CanonicalRecipeMigrationReceipt.FindAsync(db, expected.Id, ct);
        if (existingPlan is null) _ = await snapshots.RequireSourceCoverageAsync(inventory.Request.SnapshotId, ct);
        await using var writeLease = await boundary.EnterAsync(RecoveryAccess.Write, ct);
        using var binding = boundary.BindLease(writeLease);
        await RequireMigrationAdmissionAsync(db, inventory, expected, snapshots, roots, ct);
        var outcomes = new List<CanonicalMigrationRecipeOutcome>();
        foreach (var item in inventory.Recipes)
        {
            Validate();
            if (item.Status is not ("observed-canonical" or "requires-forward-assessment"))
                outcomes.Add(new(item.RecipeId, item.OperationId, item.Status, item.Reason));
            else
            {
                var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == item.RecipeId, ct);
                var prior = await db.CanonicalRecipeOperations.AsNoTracking().SingleOrDefaultAsync(x => x.RecipeId == item.RecipeId && x.OperationId == item.OperationId, ct);
                try
                {
                    if (prior is null && Read(recipe) is null)
                    {
                        var content = new CanonicalRecipeContent(2, NewRevision(), item.SourceRevision!, recipe.Servings,
                            ConvertLines(recipe, Guid.NewGuid), ConvertInstructions(recipe.RawMetadata, Guid.NewGuid, Guid.NewGuid, NewRevision));
                        var authority = await vocabulary.CaptureAuthorityAsync(recipe.FoodMappingEvidence, ct);
                        _ = FoodMappingQualification.Prepare(new(recipe.Id, content, recipe.RawMetadata), authority, item.OperationId);
                    }
                    outcomes.Add(new(item.RecipeId, item.OperationId, prior is null ? "admitted" : "retained", null));
                }
                catch (Exception error) when (error is InvalidDataException or InvalidOperationException or JsonException or ArgumentException) { outcomes.Add(new(item.RecipeId, item.OperationId, "deferred", error.Message)); }
            }
        }
        // No plan/conversion/reset writes on an unsupported or deferred selection.
        if (outcomes.Any(x => x.Outcome is not ("admitted" or "retained")))
            return new(inventory.Request.OperationId, inventory.ObservationSha256, false, outcomes.AsReadOnly(), [], inventory.EvaluationDate);
        Validate();
        var plan = await CanonicalRecipeMigrationReceipt.FindAsync(db, expected.Id, ct);
        if (plan is null)
        {
            // This owner compares real protected source rows/history/media, never hash counts.
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            await RequireMigrationAdmissionAsync(db, inventory, expected, snapshots, roots, ct);
            Validate();
            db.MaintenanceCommands.Add(expected);
            await db.SaveChangesAsync(ct);
            Validate();
            await transaction.CommitAsync(ct);
            plan = MaintenanceCommandObservation.From(expected);
        }
        else CanonicalRecipeMigrationReceipt.RequireBinding(plan, expected);
        foreach (var item in inventory.Recipes)
        {
            Validate();
            await ConvertCoreAsync(item.RecipeId, item.ContentRevision!, item.SourceRevision!, item.OperationId, ct,
                async token => { Validate(); await RequireMigrationAdmissionAsync(db, inventory, expected, snapshots, roots, token); Validate(); });
            if (checkpoint is not null) await checkpoint.ReachedAsync("migration-recipe-committed", ct);
        }
        var weeks = new List<CanonicalMigrationWeekOutcome>();
        foreach (var week in inventory.Weeks)
        {
            Validate();
            var receipt = await groceries.RebuildMigrationWeekAsync(week.WeekStart, plan,
                async (fresh, token) => { Validate(); await RequireMigrationAdmissionAsync(fresh, inventory, expected, snapshots, roots, token); Validate(); },
                Validate, state => MigrationProtectedWeekHash(inventory, week, state), inventory.EvaluationDate, checkpoint, ct);
            weeks.Add(new(week.WeekStart, receipt.Id, CanonicalRecipeMigrationReceipt.Read(receipt).Result.Outcome));
            if (checkpoint is not null) await checkpoint.ReachedAsync("migration-week-committed", ct);
        }
        Validate();
        await RequireMigrationAdmissionAsync(db, inventory, expected, snapshots, roots, ct);
        return new(inventory.Request.OperationId, inventory.ObservationSha256, true,
            Array.AsReadOnly(outcomes.Select(x => x with { Outcome = "converted-or-retained" }).ToArray()), weeks.AsReadOnly(), inventory.EvaluationDate);
    }

    private static string MigrationProtectedWeekHash(CanonicalMigrationInventory inventory, CanonicalMigrationWeek week, RecipeApi.Models.WeeklyPlan committed) =>
        CanonicalRecipeMigrationManifest.Hash(JsonSerializer.Serialize(new
        {
            week,
            committed.Id,
            committed.WeekStartDate,
            committed.CreatedAt,
            committed.ServingInputVersion,
            committed.ServingAppliedVersion,
            committed.ServingRefreshStatus,
            committed.ServingRefreshWorkflowId,
            committed.GroceryResetSummaryVersion,
            Plans = inventory.Tables.Single(x => x.Name == "weekly_plans").Rows.Where(x => week.StoredPlanIds.Contains(JsonSerializer.Deserialize<Guid[]>(x.Key)![0]))
                .Select(x => new { x.Key, Columns = x.Columns.Where(c => !CanonicalRecipeMigrationManifest.GroceryDerivedColumns.Contains(c.Name)) })
        }, Json));
}
