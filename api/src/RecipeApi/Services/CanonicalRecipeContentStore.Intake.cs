using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class CanonicalRecipeContentStore
{
    // Version1 sharing contains text, not structured quantity or retained source
    // authority. A new local aggregate owns these exact strings and fresh IDs.
    internal static CanonicalRecipeExport PrepareSharedSource(Guid id, string rawMetadata, string? sourceUrl)
    {
        using var raw = JsonDocument.Parse(rawMetadata);
        var texts = raw.RootElement.GetProperty("recipeIngredient").Deserialize<string[]>()
            ?? throw new InvalidDataException("Shared ingredient text is missing.");
        // A share may explicitly declare a basis even though its ingredient
        // strings carry no structured quantity evidence. Missing/unusable basis
        // stays unknown; never infer it from the title or instruction text.
        int? servings = raw.RootElement.TryGetProperty("servings", out var declared)
            && declared.ValueKind == JsonValueKind.Number && declared.TryGetInt32(out var count) && count > 0 ? count : null;
        var source = new Recipe { Id = id, SourceUrl = sourceUrl, RawMetadata = rawMetadata };
        var lines = texts.Select(text => new RecipeIngredientLineDto
        {
            Id = Guid.NewGuid(),
            Description = text,
            Amount = null,
            AmountText = null,
            Unit = null,
            Package = null,
            Scaling = "proportional",
            Shopping = new(text, null, null),
            Provenance = new("legacy_unknown", null, ProtectedFacts)
        }).ToArray();
        var content = new CanonicalRecipeContent(2, NewRevision(), InspectSourceRevision(source), servings,
            lines, ConvertInstructions(rawMetadata, Guid.NewGuid, Guid.NewGuid, NewRevision));
        var export = new CanonicalRecipeExport(id, content, rawMetadata);
        _ = RecipeExportContent.WriteCurrent(export);
        return export;
    }
}
