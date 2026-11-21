using System.Text.Json;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class CanonicalRecipeContentStore
{
    internal static CanonicalRecipeExport PrepareSynthesizedSource(Guid id, string normalizedJson)
    {
        var parsed = JsonSerializer.Deserialize<SchemaOrgRecipe>(normalizedJson, JsonDefaults.CaseInsensitive)
            ?? throw new InvalidDataException("Synthesized content is missing.");
        var source = new Recipe
        {
            Id = id,
            IsSynthesized = true,
            RawMetadata = normalizedJson,
            Ingredients = JsonSerializer.Serialize(parsed.RecipeIngredient ?? [], Json),
            Servings = RecipeServings.FromMetadata(normalizedJson)
        };
        var lines = ConvertLines(source, Guid.NewGuid).Select(line => line with
        {
            // This is retained generated text, never original-provider evidence.
            Provenance = new("unknown", null, ProtectedFacts)
        }).ToArray();
        var content = new CanonicalRecipeContent(2, NewRevision(), InspectSourceRevision(source), source.Servings,
            lines, ConvertInstructions(normalizedJson, Guid.NewGuid, Guid.NewGuid, NewRevision));
        content = CookingStepRelationshipProducer.Discover(content);
        var export = new CanonicalRecipeExport(id, content, normalizedJson);
        _ = RecipeExportContent.WriteCurrent(export);
        return export;
    }
}
