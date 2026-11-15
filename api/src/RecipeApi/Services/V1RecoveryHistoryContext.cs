using System.Text.Json;

namespace RecipeApi.Services;

// Source-dependent, finite authority. Only the qualified admission owner constructs
// it; no public reader, DI registration, parser option or demo path obtains one.
internal sealed class V1RecoveryHistoryContext
{
    internal V1ExactSourceAdmission Attestation { get; }
    internal Guid SnapshotId { get; }
    internal Guid OperationId { get; }
    internal string Generation { get; }

    internal V1RecoveryHistoryContext(V1ExactSourceAdmission attestation, JsonElement request)
    {
        Attestation = attestation;
        SnapshotId = request.GetProperty("snapshotId").GetGuid();
        OperationId = request.GetProperty("recoveryOperationId").GetGuid();
        Generation = request.GetProperty("targetGeneration").GetString()!;
        FoodVocabularyDefinitions.Require(request.GetProperty("historyKind").GetString() == "snapshot");
    }

    internal void RequireContext(string kind, Guid? snapshot, Guid? operation, string? generation) =>
        FoodVocabularyDefinitions.Require(kind == "snapshot" && snapshot == SnapshotId
            && operation == OperationId && generation == Generation);

    internal void RequireContext(FoodVocabularyObservationContext context) =>
        RequireContext(context.Kind, context.SnapshotId, context.RecoveryOperationId, context.Generation);

    internal void RequireFacts(FoodVocabularyInventoryFacts facts) => Attestation.RequireReceiptMembership(facts);

    internal void RequireSingleContext(IReadOnlyList<FoodVocabularyContextFacts> contexts)
    {
        FoodVocabularyDefinitions.Require(contexts.Count == 1);
        RequireContext(contexts[0].Context);
        RequireFacts(contexts[0].Facts);
    }
}
