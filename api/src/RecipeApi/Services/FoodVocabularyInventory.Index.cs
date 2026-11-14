using System.Text;
using System.Text.Json;

namespace RecipeApi.Services;

public sealed record FoodVocabularyRecoveryDocument(FoodVocabularyReference Reference, string Path, long Length);
public sealed record FoodVocabularyRecoveryIndex(int Version, Guid SnapshotId, string? Generation,
    string? MembershipRawJson, string HistorySha256, FoodVocabularyOverrideCoverage OverrideCoverage,
    FoodVocabularyRecoveryDocument[] Documents, FoodVocabularyReferenceOrigin[] Origins);

public static partial class FoodVocabularyInventoryQualification
{
    internal static byte[] WriteRecoveryIndex(FoodVocabularyRecoveryIndex index) => JsonSerializer.SerializeToUtf8Bytes(index, HistoryJson);

    public static IReadOnlyList<FoodVocabularyContextFacts> ValidateRecoveryArtifacts(byte[] indexBytes, byte[] historyBytes,
        IReadOnlyList<FoodVocabularyCapture> captures, string kind)
    {
        FoodVocabularyDefinitions.Require(kind is "snapshot" or "demo");
        var index = ReadRecoveryIndex(indexBytes);
        FoodVocabularyDefinitions.Require(index.HistorySha256 == FoodVocabularyDefinitions.Sha256(historyBytes)
            && captures is not null && captures.All(x => x is not null)
            && captures.Select(x => x.Reference).Distinct().Count() == captures.Count
            && index.Documents.Select(x => x.Reference).ToHashSet().SetEquals(captures.Select(x => x.Reference)));
        foreach (var document in index.Documents)
        {
            var capture = captures.Single(x => x.Reference == document.Reference);
            _ = capture.Definitions();
            FoodVocabularyDefinitions.Require(capture.RawBytes.Length == document.Length);
        }
        var contexts = ValidateHistoryAuthority(historyBytes, captures);
        var live = contexts.Where(x => x.Context.Kind == kind && x.Context.SnapshotId == index.SnapshotId
            && x.Context.Generation == index.Generation).ToArray();
        FoodVocabularyDefinitions.Require(live.Length == 1 && live[0].Facts.Membership.RawJson == index.MembershipRawJson);
        var required = contexts.SelectMany(ContextReferences).ToHashSet();
        FoodVocabularyDefinitions.Require(index.Origins.Length == index.Origins.Distinct().Count()
            && required.SetEquals(index.Origins) && required.Select(x => x.Reference).ToHashSet().SetEquals(index.Documents.Select(x => x.Reference)));
        return contexts;
    }

    internal static IReadOnlyList<FoodVocabularyContextFacts> ValidateHistoryAuthority(byte[] historyBytes,
        IReadOnlyList<FoodVocabularyCapture> captures)
    {
        FoodVocabularyDefinitions.Require(captures is not null && captures.All(x => x is not null)
            && captures.Select(x => x.Reference).Distinct().Count() == captures.Count
            && captures.Select(x => x.Reference.Revision).Distinct(StringComparer.Ordinal).Count() == captures.Count);
        foreach (var capture in captures)
            foreach (var previous in captures) capture.Definitions().ValidateCompatible(previous.Definitions());
        var contexts = ReadHistoryObservations(historyBytes);
        ValidateObservationCompatibility(contexts);
        FoodVocabularyDefinitions.Require(contexts.SelectMany(ContextReferences).Select(x => x.Reference).ToHashSet()
            .SetEquals(captures.Select(x => x.Reference)));
        foreach (var context in contexts)
        {
            var facts = context.Facts;
            FoodVocabularyDefinitions.Require(facts.Overrides.Coverage == FoodVocabularyOverrideCoverage.CapturedV1 && facts.Overrides.Rows is not null);
            var membership = facts.Membership.RawJson is null ? null : FoodVocabularyStore.InspectMembership(facts.Membership.RawJson);
            FoodVocabularyDefinitions.Require(membership?.HasPrepared != true && (membership is not null || ContextReferences(context).Count == 0));
            var authority = new FoodVocabularyAuthority(membership?.ActiveRef, captures.ToArray());
            authority.Validate();
            foreach (var recipe in facts.Recipes)
            {
                var content = CanonicalRecipeContentStore.Read(new RecipeApi.Models.Recipe { Id = recipe.RecipeId, CanonicalContent = recipe.CanonicalContent });
                if (content is not null) FoodMappingQualification.Validate(content, recipe.FoodMappingEvidence, authority, recipe.RecipeId);
            }
            var overrides = facts.Overrides.Rows.Select(x => new HouseholdFoodOverrideSnapshot(x.Id, x.Revision, x.FoodId,
                x.DictionaryRevision, x.FallbackKey, x.ShoppingName, x.GrocerySection, x.ProtectedFields, x.CreatedAt,
                x.UpdatedAt, x.Document, x.PresentationSequence)).ToArray();
            HouseholdFoodOverrideValidation.Validate(overrides, authority);
        }
        return contexts;
    }

    public static FoodVocabularyRecoveryIndex ReadRecoveryIndex(byte[] bytes)
    {
        string raw;
        try { raw = new UTF8Encoding(false, true).GetString(bytes); }
        catch (DecoderFallbackException error) { throw new InvalidDataException("Recovery vocabulary index is not valid UTF-8.", error); }
        var index = ReadObservation<FoodVocabularyRecoveryIndex>(raw);
        FoodVocabularyDefinitions.Require(index.Version == 1 && index.SnapshotId != Guid.Empty
            && (index.Generation is null || Guid.TryParseExact(index.Generation, "N", out var generation) && generation != Guid.Empty)
            && index.HistorySha256 is { Length: 64 } && index.HistorySha256.All(c => c is >= '0' and <= '9' or >= 'a' and <= 'f')
            && index.OverrideCoverage == FoodVocabularyOverrideCoverage.CapturedV1 && index.Documents is not null && index.Origins is not null
            && index.Documents.All(x => x is not null && x.Reference is not null) && index.Origins.All(x => x is not null));
        FoodVocabularyDefinitions.Require(index.Documents.Select(x => x.Reference).Distinct().Count() == index.Documents.Length
            && index.Documents.Select(x => x.Reference.Revision).Distinct(StringComparer.Ordinal).Count() == index.Documents.Length);
        foreach (var document in index.Documents)
        {
            FoodVocabularyDefinitions.ValidateReference(document.Reference);
            FoodVocabularyDefinitions.Require(document.Path == "recipes/" + FoodVocabularyStore.PathFor(document.Reference) && document.Length > 0);
        }
        foreach (var origin in index.Origins)
        {
            FoodVocabularyDefinitions.ValidateReference(origin.Reference);
            FoodVocabularyDefinitions.Require(index.Documents.Any(x => x.Reference == origin.Reference)
                && !string.IsNullOrWhiteSpace(origin.OwnerKind) && !string.IsNullOrWhiteSpace(origin.OwnerKey));
        }
        return index;
    }
}
