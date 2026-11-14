using System.Text;
using System.Text.Json;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class RecipeFilePublicationStore
{
    private static bool IsBootstrap(RecipePublicationCandidate candidate) => candidate.SourceKind is "bootstrap" or "shared-canonical";

    public RecipePublicationCandidate PrepareSharedIntake(RecipePublicationCapture capture, string rawMetadata,
        RecipeInfo info, IReadOnlyDictionary<string, byte[]?> files, Guid operationId)
    {
        if (capture.FieldHashVersion != 4 || capture.ContentRevision != "absent")
            throw new InvalidDataException("Shared intake requires captured new membership and vocabulary authority.");
        var prepared = PrepareMappedSource(capture,
            CanonicalRecipeContentStore.PrepareSharedSource(capture.RecipeId, rawMetadata, info.SourceUrl), operationId);
        return new(RecipeExportContent.WriteCurrent(prepared.Export), info, SourceFiles: files,
            SourceKind: "shared-canonical", MappingEvidence: prepared.Evidence);
    }

    private static IReadOnlyDictionary<string, byte[]?> PrepareSharedBootstrap(RecipePublicationCapture capture,
        RecipePublicationCandidate candidate, Guid operationId)
    {
        if (candidate.RecipeJson is null || candidate.BootstrapIntent is not null || candidate.FollowupIntent is not null
            || candidate.ProducerInput is not null || operationId == Guid.Empty || candidate.Info.IsReady != true)
            throw new InvalidDataException("Shared intake requires exact content and no workflow authority.");
        using var document = JsonDocument.Parse(candidate.RecipeJson);
        var incoming = RecipeExportContent.ReadCurrent(document.RootElement, capture.RecipeId);
        var raw = incoming.RawMetadata ?? throw new InvalidDataException("Shared text evidence is missing.");
        var original = CanonicalRecipeContentStore.PrepareSharedSource(capture.RecipeId, raw, candidate.Info.SourceUrl);
        if (incoming.Content.IngredientLines.Count != original.Content.IngredientLines.Count
            || incoming.Content.InstructionSections.SelectMany(section => section.Steps).Any(step => step.Bindings.Count != 0))
            throw new InvalidDataException("Shared intake cannot invent ingredients or instruction relationships.");
        original = original with
        {
            Content = original.Content with
            {
                ContentRevision = incoming.Content.ContentRevision,
                IngredientLines = original.Content.IngredientLines.Select((line, index) => line with { Id = incoming.Content.IngredientLines[index].Id }).ToArray()
            }
        };
        var mapped = FoodMappingQualification.Prepare(original, capture.FoodAuthority!, operationId);
        if (incoming.Content.SourceRevision != original.Content.SourceRevision
            || FreshOriginalFacts(mapped.Export.Content) != FreshOriginalFacts(incoming.Content)
            || CanonicalRecipeContentStore.NormalizeJson(mapped.Evidence) != CanonicalRecipeContentStore.NormalizeJson(candidate.MappingEvidence))
            throw new InvalidDataException("Shared content differs from its captured text and vocabulary decision.");
        var legacy = JsonSerializer.Serialize(new
        {
            backupContentVersion = 1,
            rawMetadata = raw,
            ingredients = JsonSerializer.Serialize(original.Content.IngredientLines.Select(line => line.Description), Json),
            servings = original.Content.Servings
        });
        var output = PrepareBootstrap(capture, candidate with { SourceKind = "bootstrap", RecipeJson = legacy }).ToDictionary(x => x.Key, x => x.Value);
        output["recipe.json"] = Encoding.UTF8.GetBytes(candidate.RecipeJson);
        return output;
    }
}
