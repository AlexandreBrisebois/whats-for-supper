using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public sealed partial class FoodVocabularyStore
{
    // The caller owns Snapshot/Publish coordination. All retained statuses are
    // observed, including originals whose runtime membership has been retired.
    internal async Task<FoodVocabularyInventoryFacts> ObserveInventoryFactsAsync(CancellationToken ct)
    {
        await using var readConnection = await DatabaseReadConnection.RetainAsync(db, ct);
        var membership = await db.FamilySettings.AsNoTracking().SingleOrDefaultAsync(x => x.Key == Key, ct);
        var recipeFacts = await db.Recipes.IgnoreQueryFilters().AsNoTracking().Select(x => new FoodVocabularyRecipeObservation(
            x.Id, x.CanonicalContent, x.FoodMappingEvidence)).ToArrayAsync(ct);
        var operations = await db.CanonicalRecipeOperations.AsNoTracking().ToArrayAsync(ct);
        var publications = await db.RecipeFilePublications.AsNoTracking().ToArrayAsync(ct);
        var history = new FoodVocabularyHistoryFacts(
            await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).ToArrayAsync(ct),
            await db.WorkflowLaunchIntents.AsNoTracking().ToArrayAsync(ct),
            await db.WorkflowChildIntents.AsNoTracking().ToArrayAsync(ct),
            await db.WorkflowResetIntents.AsNoTracking().ToArrayAsync(ct),
            await db.WorkflowProcessorAttempts.AsNoTracking().ToArrayAsync(ct),
            await db.WorkflowLifecycleRecords.AsNoTracking().ToArrayAsync(ct),
            await db.RecipeRepairIntents.AsNoTracking().ToArrayAsync(ct),
            await db.RecipePhysicalDeletions.AsNoTracking().ToArrayAsync(ct),
            await db.MaintenanceCommandLifecycleRecords.AsNoTracking().ToArrayAsync(ct),
            await ObserveStagedJournalsAsync(ct),
            await db.MaintenanceCommands.AsNoTracking().Select(x => new MaintenanceCommandObservation(x.Id,
                x.CommandType, x.Status, x.Payload, x.Result, x.Attempts, x.RequestedBy, x.CreatedAt, x.ScheduledFor,
                x.StartedAt, x.CompletedAt, x.LastError)).ToArrayAsync(ct));
        // Observe rows directly. The public presentation feed calls CaptureActive
        // and therefore cannot be called from the absent-membership inventory.
        var overrides = (await db.HouseholdFoodOverrides.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync(ct))
            .Select(HouseholdFoodOverrideSnapshot.From).ToArray();
        var captures = new List<FoodVocabularyCapture>();
        foreach (var reference in overrides.Where(x => x.Document is not null).Select(x => x.Document!).Distinct())
            captures.Add(await LoadCapturedAsync(reference, ct));
        HouseholdFoodOverrideValidation.Validate(overrides, new(null, captures.ToArray()));
        var overrideFacts = overrides.Select(x => new FoodVocabularyScopedOverrideObservation(x.Id, x.Revision,
            x.FoodId, x.DictionaryRevision, x.Document, x.FallbackKey, x.ShoppingName, x.GrocerySection,
            x.ProtectedFields, x.PresentationSequence, x.CreatedAt, x.UpdatedAt)).ToArray();
        return new(new(membership?.Value.GetRawText()), recipeFacts, operations, publications, history,
            new(FoodVocabularyOverrideCoverage.CapturedV1, overrideFacts));
    }

    private static Task<IReadOnlyList<FoodVocabularyStagedJournalObservation>> ObserveStagedJournalsAsync(CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        return Task.FromResult<IReadOnlyList<FoodVocabularyStagedJournalObservation>>([]);
    }
}
