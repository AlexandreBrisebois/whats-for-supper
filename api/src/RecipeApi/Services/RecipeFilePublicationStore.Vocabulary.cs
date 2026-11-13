using RecipeApi.Infrastructure;
using System.Text.Json;
using RecipeApi.Models;

namespace RecipeApi.Services;

// Presence of this wrapper observes null; omission is never a V4 observation.
public sealed record FoodMappingObservation(string? Value);

public sealed partial class RecipeFilePublicationStore
{
    public static FoodVocabularyReference[] VocabularyReferences(RecipeFilePublication publication)
    {
        var envelope = ReadEnvelope(publication);
        return CaptureVocabularyReferences(envelope.Capture);
    }
    public static FoodVocabularyReference[] VocabularyReferences(WorkflowInstance instance)
    {
        if (instance.RecipePublicationCapture is null) return [];
        ValidateRecoveryLaunch(instance, retainUncaptured: true);
        if (IsDispatchLaunch(instance.RecipePublicationCapture)) return [];
        return CaptureVocabularyReferences(ReadRecoveryJson<Launch>(instance.RecipePublicationCapture).Capture);
    }
    private static FoodVocabularyReference[] CaptureVocabularyReferences(RecipePublicationCapture capture)
    {
        ValidateOriginalFields(capture);
        if (capture.FieldHashVersion == 4) return capture.FoodAuthority!.Captures.Select(x => x.Reference).Distinct().ToArray();
        if (capture.Fields is not null && CanonicalRecipeContentStore.Read(RestoreObservation(capture.Fields)) is { } old
            && old.IngredientLines.Any(x => x.Shopping.FoodId is not null || x.Shopping.MappingRevision is not null))
            throw new InvalidDataException("Historical mapping has no retained vocabulary authority.");
        return [];
    }

    private static string? Evidence(Recipe recipe) => recipe.FoodMappingEvidence is null ? null
        : CanonicalRecipeContentStore.NormalizeJson(recipe.FoodMappingEvidence);
    private static void ValidateRecipeEvidence(Recipe recipe, FoodVocabularyAuthority authority)
    {
        if (CanonicalRecipeContentStore.Read(recipe) is { } content)
            FoodMappingQualification.Validate(content, Evidence(recipe), authority, recipe.Id);
        else if (recipe.FoodMappingEvidence is not null) throw new InvalidDataException("Mapping evidence requires canonical content.");
    }
    private static Recipe RestoreV4(RecipePublicationCapture capture)
    {
        var recipe = RestoreObservation(capture.Fields ?? throw new InvalidDataException("V4 fields are absent."));
        recipe.FoodMappingEvidence = capture.FoodEvidence?.Value;
        return recipe;
    }

    internal FoodMappingPreparation PrepareMappedSource(RecipePublicationCapture capture, CanonicalRecipeExport prepared, Guid operationId)
    {
        ValidateOriginalFields(capture);
        return capture.FieldHashVersion == 4
            ? FoodMappingQualification.Prepare(prepared, capture.FoodAuthority!, operationId)
            : new(prepared, null, []); // Explicit historical producer dispatch; no new authority.
    }

    private static void ValidateV4Capture(RecipePublicationCapture capture)
    {
        if (capture.FoodAuthority is null || capture.FoodEvidence is null) throw new InvalidDataException("V4 vocabulary observation is absent.");
        capture.FoodAuthority.Validate();
        if (capture.ContentRevision == "absent")
        {
            if (capture.SourceRevision != "absent" || capture.FieldHash != "absent" || capture.Fields is not null || capture.FoodEvidence.Value is not null)
                throw new InvalidDataException("V4 absence differs from captured facts.");
            return;
        }
        var recipe = RestoreV4(capture);
        if (recipe.Id != capture.RecipeId || Fields(recipe, 4) != capture.FieldHash
            || CanonicalRecipeContentStore.InspectContentRevision(recipe) != capture.ContentRevision
            || CanonicalRecipeContentStore.InspectSourceRevision(recipe) != capture.SourceRevision)
            throw new InvalidDataException("V4 field/evidence observations differ from their fingerprint.");
        ValidateRecipeEvidence(recipe, capture.FoodAuthority);
    }

    private static void ApplyFoodEvidence(Recipe recipe, RecipePublicationCapture capture, RecipePublicationCandidate candidate)
    {
        if (capture.FieldHashVersion != 4) return;
        if (candidate.SourceKind is "fresh-canonical" or "review-canonical") recipe.FoodMappingEvidence = candidate.MappingEvidence;
        ValidateRecipeEvidence(recipe, capture.FoodAuthority!);
    }

    private static IReadOnlyDictionary<string, byte[]?> PrepareV4(RecipePublicationCapture capture, RecipePublicationCandidate candidate, Guid operationId)
    {
        ValidateV4Capture(capture);
        var legacyCapture = capture with
        {
            FieldHashVersion = 3,
            FieldHash = capture.Fields is null ? "absent" : Hash(capture.Fields),
            FoodEvidence = null,
            FoodAuthority = null
        };
        var legacyCandidate = candidate with { MappingEvidence = null };
        if (candidate.SourceKind is "fresh-canonical" or "review-canonical")
        {
            if (operationId == Guid.Empty || candidate.RecipeJson is null || capture.Fields is null)
                throw new InvalidDataException("Mapped source requires exact operation and original fields.");
            using var doc = JsonDocument.Parse(candidate.RecipeJson);
            var incoming = RecipeExportContent.ReadCurrent(doc.RootElement, capture.RecipeId);
            var original = candidate.SourceKind == "fresh-canonical"
                ? CanonicalRecipeContentStore.PrepareFreshSource(capture.RecipeId, incoming.RawMetadata!, capture.Fields.SourceUrl)
                : CanonicalRecipeContentStore.PrepareReviewedSource(capture.Fields);
            if (incoming.Content.IngredientLines.Count != original.Content.IngredientLines.Count)
                throw new InvalidDataException("Mapped source collection differs.");
            // Allocate no historical identity: all proposed identities are already
            // in the retained candidate. Independently derive every original fact.
            original = original with
            {
                Content = original.Content with
                {
                    ContentRevision = incoming.Content.ContentRevision,
                    IngredientLines = original.Content.IngredientLines.Select((line, i) => line with { Id = incoming.Content.IngredientLines[i].Id }).ToArray()
                }
            };
            var expected = FoodMappingQualification.Prepare(original, capture.FoodAuthority!, operationId);
            if (FreshOriginalFacts(expected.Export.Content) != FreshOriginalFacts(incoming.Content)
                || CanonicalRecipeContentStore.NormalizeJson(expected.Evidence) != CanonicalRecipeContentStore.NormalizeJson(candidate.MappingEvidence))
                throw new InvalidDataException("Mapped originals/evidence differ from the captured source decision.");
            FoodMappingQualification.Validate(incoming.Content, candidate.MappingEvidence, capture.FoodAuthority!, capture.RecipeId);
            // Legacy validation still compares complete Shopping originals and
            // relationships. Its explicit V3 input is independently reconstructed,
            // rather than weakening any old equality guard for mapped facts.
            var legacyContent = incoming.Content with
            {
                IngredientLines = incoming.Content.IngredientLines.Select((line, i) => line with
                { Shopping = original.Content.IngredientLines[i].Shopping }).ToArray()
            };
            legacyCandidate = legacyCandidate with { RecipeJson = RecipeExportContent.WriteCurrent(incoming with { Content = legacyContent }) };
        }
        else if (candidate.MappingEvidence is not null) throw new InvalidDataException("Only a canonical source decision can replace mapping evidence.");
        var output = Prepare(legacyCapture, legacyCandidate, operationId).ToDictionary(x => x.Key, x => x.Value);
        if (candidate.SourceKind is "fresh-canonical" or "review-canonical")
            output["recipe.json"] = System.Text.Encoding.UTF8.GetBytes(candidate.RecipeJson!);
        return output;
    }

    private static void ValidateV4Result(RecipeFilePublication publication, Envelope envelope)
    {
        ValidateV4Capture(envelope.Capture);
        if (envelope.Result is null || envelope.ResultEvidence is null) throw new InvalidDataException("V4 result observations are absent.");
        var expected = envelope.Candidate.SourceKind == "bootstrap" ? NewRecipe(envelope.Candidate) : RestoreV4(envelope.Capture);
        if (envelope.Candidate.SourceKind != "bootstrap")
            Apply(expected, envelope.Candidate, envelope.Output.GetValueOrDefault("recipe.info") ?? envelope.Capture.Files["recipe.info"]!);
        ApplyFoodEvidence(expected, envelope.Capture, envelope.Candidate);
        if (Hash(Observe(expected)) != Hash(envelope.Result) || Evidence(expected) != envelope.ResultEvidence.Value
            || Fields(expected, 4) != publication.ResultHash)
            throw new InvalidDataException("V4 result differs from its complete captured derivation.");
    }
}
