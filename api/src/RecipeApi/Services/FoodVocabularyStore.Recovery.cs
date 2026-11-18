using System.Text.Json;

namespace RecipeApi.Services;

internal sealed record FoodVocabularyRecoveryObservation(FoodVocabularyInventoryFacts Live, byte[] HistoryBytes,
    FoodVocabularyCapture[] Documents, FoodVocabularyReferenceOrigin[] Origins);

public sealed partial class FoodVocabularyStore
{
    internal const string RetainedHistoryPath = ".household/food-vocabulary/history-observations.json";

    private async Task RequireRetainedAbsenceAsync(CancellationToken ct)
    {
        var retained = await storage.LoadAsync("recipes", RetainedHistoryPath);
        if (retained is not null)
            FoodVocabularyDefinitions.Require(FoodVocabularyInventoryQualification.ReadHistoryObservations(retained)
                .SelectMany(FoodVocabularyInventoryQualification.ContextReferences).Any() == false);
    }

    internal async Task<FoodVocabularyRecoveryObservation> ObserveRecoveryAsync(string kind, Guid? snapshotId,
        Guid? operationId, CancellationToken ct)
    {
        var facts = await ObserveInventoryFactsAsync(ct);
        if (facts.Membership.RawJson is { } raw && InspectMembership(raw).HasPrepared)
            throw new RecoveryBusyException("Reconcile prepared vocabulary publication before recovery.");
        var current = FoodVocabularyInventoryQualification.WriteHistoryObservations(facts, kind, snapshotId, operationId, recipes.Generation);
        var retained = await storage.LoadAsync("recipes", RetainedHistoryPath);
        var history = retained is null ? current : FoodVocabularyInventoryQualification.MergeHistoryObservations(retained, current);
        var contexts = FoodVocabularyInventoryQualification.ReadHistoryObservations(history);
        var origins = contexts.SelectMany(FoodVocabularyInventoryQualification.ContextReferences).Distinct().ToArray();
        if (facts.Membership.RawJson is null && origins.Length != 0)
            throw new InvalidDataException("Absent live vocabulary membership cannot admit retained vocabulary authority.");
        var documents = new List<FoodVocabularyCapture>();
        foreach (var reference in origins.Select(x => x.Reference).Distinct().OrderBy(x => x.Revision, StringComparer.Ordinal).ThenBy(x => x.Sha256, StringComparer.Ordinal))
            documents.Add(await LoadCapturedAsync(reference, ct));
        _ = FoodVocabularyInventoryQualification.ValidateHistoryAuthority(history, documents);
        return new(facts, history, documents.ToArray(), origins);
    }
}
