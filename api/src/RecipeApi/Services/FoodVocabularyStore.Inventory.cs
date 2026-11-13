using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace RecipeApi.Services;

public sealed partial class FoodVocabularyStore
{
    // The caller owns Snapshot/Publish coordination. All retained statuses are
    // observed, including originals whose runtime membership has been retired.
    internal async Task<FoodVocabularyInventoryFacts> ObserveInventoryFactsAsync(CancellationToken ct)
    {
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
            await ObserveStagedJournalsAsync(ct));
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

    private async Task<IReadOnlyList<FoodVocabularyStagedJournalObservation>> ObserveStagedJournalsAsync(CancellationToken ct)
    {
        var root = recipes.Root;
        if (new DirectoryInfo(root).LinkTarget is not null) throw new InvalidDataException("Vocabulary reference inventory cannot follow a recipe root link.");
        if (!Directory.Exists(root)) return [];
        var stages = new List<FoodVocabularyStagedJournalObservation>();
        foreach (var recipeDirectory in Directory.GetDirectories(root).Order(StringComparer.Ordinal))
        {
            ct.ThrowIfCancellationRequested();
            if (!Guid.TryParseExact(Path.GetFileName(recipeDirectory), "D", out var recipeId)) continue;
            var stageRoot = Path.Combine(recipeDirectory, ".publications");
            if (new DirectoryInfo(recipeDirectory).LinkTarget is not null || new DirectoryInfo(stageRoot).LinkTarget is not null)
                throw new InvalidDataException("Vocabulary reference inventory cannot follow recipe links.");
            if (File.Exists(stageRoot)) throw new InvalidDataException("Publication staging root is a file.");
            if (!Directory.Exists(stageRoot)) continue;
            if (Directory.GetFiles(stageRoot).Length != 0) throw new InvalidDataException("Unmatched publication stage requires reconciliation.");
            foreach (var operationDirectory in Directory.GetDirectories(stageRoot).Order(StringComparer.Ordinal))
            {
                if (new DirectoryInfo(operationDirectory).LinkTarget is not null
                    || !Guid.TryParseExact(Path.GetFileName(operationDirectory), "N", out var operationId)
                    || Directory.GetDirectories(operationDirectory).Length != 0)
                    throw new InvalidDataException("Publication stage operation is invalid.");
                foreach (var file in Directory.GetFiles(operationDirectory).Order(StringComparer.Ordinal))
                {
                    ct.ThrowIfCancellationRequested();
                    if (new FileInfo(file).LinkTarget is not null || !Regex.IsMatch(Path.GetFileName(file), "^[A-F0-9]{64}\\.json$", RegexOptions.CultureInvariant))
                        throw new InvalidDataException("Publication stage file is invalid.");
                    stages.Add(new(recipeId, operationId, Path.GetFileNameWithoutExtension(file), await File.ReadAllBytesAsync(file, ct)));
                }
            }
        }
        return stages;
    }
}
