using RecipeApi.Infrastructure;
using System.Text.Json;
using RecipeApi.Dto;

namespace RecipeApi.Services;

public sealed record RecipeFoodMapping(CurrentRecoveryFoodMapping Facts, string VocabularyRevision, string VocabularySha256, int ResolverPolicyVersion);
public sealed record RecipeFoodNameDecision(Guid IngredientLineId, string ContentRevision, Guid DecidingOperationId,
    string Name, string Kind, string? MappingRevision);
public sealed record RecipeFoodMappingEvidence(int Version, Guid RecipeId, RecipeFoodMapping[] Mappings,
    RecipeFoodNameDecision[] NameDecisions);
public sealed record FoodMappingPreparation(CanonicalRecipeExport Export, string? Evidence, RecipeFoodNameDecision[] Decisions);

// One pure qualification owner. No file, settings, provider or today's-head
// lookup is possible while validating an accepted operation's captured inputs.
public static class FoodMappingQualification
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public static IEnumerable<FoodVocabularyReference> References(string evidence)
    {
        var saved = Read(evidence);
        FoodVocabularyDefinitions.Require(saved.Version == 1 && saved.RecipeId != Guid.Empty && saved.Mappings is not null && saved.NameDecisions is not null);
        return saved.Mappings.Select(x =>
        {
            FoodVocabularyDefinitions.Require(x is not null && x.Facts is not null && x.ResolverPolicyVersion == 1);
            var reference = new FoodVocabularyReference(x.VocabularyRevision, x.VocabularySha256);
            FoodVocabularyDefinitions.ValidateReference(reference);
            return reference;
        }).Distinct().ToArray();
    }
    private static RecipeFoodMappingEvidence Read(string raw) => FoodVocabularyDefinitions.ReadStrict<RecipeFoodMappingEvidence>(raw);

    public static void Validate(CanonicalRecipeContent content, string? evidence, FoodVocabularyAuthority authority, Guid recipeId)
    {
        authority.Validate();
        if (evidence is null)
        {
            FoodVocabularyDefinitions.Require(content.IngredientLines.All(x => x.Shopping.FoodId is null && x.Shopping.MappingRevision is null));
            return;
        }
        var saved = Read(evidence);
        FoodVocabularyDefinitions.Require(saved.Version == 1 && saved.RecipeId == recipeId && saved.Mappings is not null && saved.NameDecisions is not null
            && saved.Mappings.Select(x => x.Facts.IngredientLineId).Distinct().Count() == saved.Mappings.Length
            && saved.NameDecisions.Select(x => x.IngredientLineId).Distinct().Count() == saved.NameDecisions.Length
            && saved.NameDecisions.Length == content.IngredientLines.Count);
        foreach (var decision in saved.NameDecisions)
        {
            var line = content.IngredientLines.SingleOrDefault(x => x.Id == decision.IngredientLineId);
            FoodVocabularyDefinitions.Require(line is not null && decision.DecidingOperationId != Guid.Empty
                && decision.ContentRevision == content.ContentRevision && decision.Name == line.Shopping.Name
                && decision.MappingRevision == line.Shopping.MappingRevision
                && decision.Kind is "source" or "explicit_private" or "legacy_ambiguous" or "protected_clear");
            if (decision.Kind == "protected_clear") FoodVocabularyDefinitions.Require(line.Shopping.FoodId is null && line.Shopping.MappingRevision is null);
        }
        foreach (var mapping in saved.Mappings)
        {
            var fact = mapping.Facts;
            var line = content.IngredientLines.SingleOrDefault(x => x.Id == fact.IngredientLineId);
            FoodVocabularyDefinitions.Require(line is not null && fact.RecipeId == recipeId && fact.ContentRevision == content.ContentRevision
                && fact.FoodId == line.Shopping.FoodId && fact.MappingRevision == line.Shopping.MappingRevision
                && !string.IsNullOrWhiteSpace(fact.MappingRevision) && mapping.ResolverPolicyVersion == 1
                && fact.SourceRef == line.Provenance.SourceRef
                && fact.EvidenceSourceRevision == (fact.SourceRef is null ? null : content.SourceRevision)
                && fact.Origin is "source" or "human" or "legacy_unknown" or "unknown"
                && fact.ProtectedFields is not null && fact.ProtectedFields.All(x => x == "shopping")
                && fact.ProtectedFields.Distinct().Count() == fact.ProtectedFields.Length);
            var capture = authority.Find(new(mapping.VocabularyRevision, mapping.VocabularySha256));
            var food = capture.Definitions().RequireFood(fact.DictionaryRevision, fact.FoodId, fact.FoodRevision);
            var match = capture.Definitions().ResolveInRelease(line.Shopping.Name, fact.DictionaryRevision);
            FoodVocabularyDefinitions.Require(match is not null && match.Food.Id == food.Id);
        }
        foreach (var line in content.IngredientLines)
            FoodVocabularyDefinitions.Require((line.Shopping.FoodId is null && line.Shopping.MappingRevision is null)
                ? saved.Mappings.All(x => x.Facts.IngredientLineId != line.Id)
                : saved.Mappings.Count(x => x.Facts.IngredientLineId == line.Id) == 1);
    }

    public static FoodMappingPreparation Prepare(CanonicalRecipeExport export, FoodVocabularyAuthority authority,
        Guid operationId, CanonicalRecipeContent? priorContent = null, string? priorEvidence = null)
        => PrepareCore(export, authority, operationId, priorContent, priorEvidence, requalifyCapturedRepair: false);

    // The guarded photo repair owner independently reconstructs source rows and
    // the complete protected merge. This entrypoint requalifies only an existing
    // unchanged shopping decision against its captured dictionary proof; it
    // never reruns matching for a private name, identity clear or override.
    internal static FoodMappingPreparation PrepareCapturedPhotoRepair(CanonicalRecipeExport export, FoodVocabularyAuthority authority,
        Guid operationId, CanonicalRecipeContent priorContent, string? priorEvidence)
    {
        FoodVocabularyDefinitions.Require(export.RawMetadata is not null
            && export.Content.SourceRevision == CanonicalRecipeContentStore.InspectSourceRevision(new Models.Recipe
            { Id = export.RecipeId, RawMetadata = export.RawMetadata })
            && priorContent.IngredientLines.Select(x => x.Id).SequenceEqual(export.Content.IngredientLines.Select(x => x.Id)));
        foreach (var line in export.Content.IngredientLines)
        {
            var old = priorContent.IngredientLines.Single(x => x.Id == line.Id);
            FoodVocabularyDefinitions.Require(line.Shopping == old.Shopping);
            if (old.Provenance.Origin != "source" || old.Provenance.ProtectedFields.Count != 0)
                FoodVocabularyDefinitions.Require(JsonSerializer.Serialize(line, Json) == JsonSerializer.Serialize(old, Json));
            else
                FoodVocabularyDefinitions.Require(old.Provenance.SourceRef == priorContent.SourceRevision
                    && line.Provenance.Origin == "source" && line.Provenance.ProtectedFields.Count == 0
                    && line.Provenance.SourceRef == export.Content.SourceRevision);
        }
        return PrepareCore(export, authority, operationId, priorContent, priorEvidence, requalifyCapturedRepair: true);
    }

    private static FoodMappingPreparation PrepareCore(CanonicalRecipeExport export, FoodVocabularyAuthority authority,
        Guid operationId, CanonicalRecipeContent? priorContent, string? priorEvidence, bool requalifyCapturedRepair)
    {
        FoodVocabularyDefinitions.Require(operationId != Guid.Empty);
        var active = authority.ActiveDefinitions();
        if (priorContent is not null) Validate(priorContent, priorEvidence, authority, export.RecipeId);
        if (active is null && priorEvidence is null) return new(export, null, []);
        var prior = priorEvidence is null ? null : Read(priorEvidence);
        var mappings = new List<RecipeFoodMapping>();
        var decisions = new List<RecipeFoodNameDecision>();
        var lines = export.Content.IngredientLines.Select(line =>
        {
            var old = priorContent?.IngredientLines.SingleOrDefault(x => x.Id == line.Id);
            var saved = prior?.NameDecisions.SingleOrDefault(x => x.IngredientLineId == line.Id);
            if (old is not null && saved is not null && old.Shopping == line.Shopping)
            {
                decisions.Add(saved with { ContentRevision = export.Content.ContentRevision });
                var carried = prior!.Mappings.SingleOrDefault(x => x.Facts.IngredientLineId == line.Id);
                if (carried is not null) mappings.Add(carried with
                {
                    Facts = requalifyCapturedRepair
                        ? carried.Facts with
                        {
                            ContentRevision = export.Content.ContentRevision,
                            SourceRef = line.Provenance.SourceRef,
                            EvidenceSourceRevision = line.Provenance.SourceRef is null ? null : export.Content.SourceRevision
                        }
                        : carried.Facts with { ContentRevision = export.Content.ContentRevision }
                });
                return line;
            }
            // A quantity/description edit's coarse human row provenance is not
            // evidence of a Name edit. Without a prior fine decision, an
            // unchanged historical Name retains conservative authority.
            var kind = old is not null && old.Shopping.Name == line.Shopping.Name ? "legacy_ambiguous"
                : old is not null || line.Provenance.Origin == "human" ? "explicit_private"
                : line.Provenance.Origin == "source" ? "source" : "legacy_ambiguous";
            // Nulling an existing identity is an explicit durable clear, including
            // an unchanged name. It is never a request to run source matching again.
            if (old?.Shopping.FoodId is not null && line.Shopping.FoodId is null) kind = "protected_clear";
            FoodVocabularyMatch? match = null;
            if (kind == "source" && SourceAligned(export, line)) match = active?.Resolve(line.Shopping.Name);
            if (kind == "explicit_private" && old?.Shopping.FoodId is not null && line.Shopping.FoodId == old.Shopping.FoodId)
            {
                var same = active?.Resolve(line.Shopping.Name);
                if (same?.Food.Id == old.Shopping.FoodId) match = same;
            }
            var mappingRevision = match is null ? null : $"mapping.{operationId:N}.{line.Id:N}";
            var next = line with { Shopping = new(line.Shopping.Name, match?.Food.Id, mappingRevision) };
            decisions.Add(new(line.Id, export.Content.ContentRevision, operationId, next.Shopping.Name, kind, mappingRevision));
            if (match is not null)
            {
                FoodVocabularyDefinitions.Require(authority.ActiveRef is not null);
                mappings.Add(new(new(export.RecipeId, line.Id, export.Content.ContentRevision, match.Food.Id, match.Food.Revision,
                    match.DictionaryRevision, mappingRevision!, line.Provenance.Origin == "source" ? "source" : "human",
                    line.Provenance.SourceRef, line.Provenance.SourceRef is null ? null : export.Content.SourceRevision,
                    line.Provenance.ProtectedFields.Contains("shopping") ? ["shopping"] : []), authority.ActiveRef.Revision, authority.ActiveRef.Sha256, 1));
            }
            return next;
        }).ToArray();
        var result = export with { Content = export.Content with { IngredientLines = lines } };
        var evidence = JsonSerializer.Serialize(new RecipeFoodMappingEvidence(1, export.RecipeId, mappings.ToArray(), decisions.ToArray()), Json);
        Validate(result.Content, evidence, authority, export.RecipeId);
        return new(result, evidence, decisions.ToArray());
    }

    private static bool SourceAligned(CanonicalRecipeExport export, RecipeIngredientLineDto line)
    {
        if (export.RawMetadata is null || line.Provenance.SourceRef != export.Content.SourceRevision
            || line.Provenance.ProtectedFields.Contains("shopping")) return false;
        using var document = JsonDocument.Parse(export.RawMetadata);
        if (!document.RootElement.TryGetProperty("recipeIngredient", out var originals) || originals.ValueKind != JsonValueKind.Array
            || originals.GetArrayLength() != export.Content.IngredientLines.Count) return false;
        var index = export.Content.IngredientLines.Select((value, i) => (value.Id, i)).Single(x => x.Id == line.Id).i;
        // Complete source phrase, not a provider-shortened purchase name.
        if (originals[index].GetString() != CanonicalRecipeContentStore.Render(line) || line.Description != line.Shopping.Name) return false;
        if (document.RootElement.TryGetProperty("supply", out var supply) && supply.ValueKind == JsonValueKind.Array)
        {
            if (supply.GetArrayLength() != originals.GetArrayLength() || !supply[index].TryGetProperty("name", out var name)
                || name.GetString() != line.Shopping.Name) return false;
        }
        return true;
    }
}
