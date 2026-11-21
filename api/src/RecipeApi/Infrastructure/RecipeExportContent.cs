using System.Text.Json;
using RecipeApi.Services;

namespace RecipeApi.Infrastructure;

/// <summary>Separate decoding boundaries for internal version-1 journals and declared current recipe content.</summary>
public sealed partial record RecipeExportContent(string? RawMetadata, string? Ingredients, int? Servings)
{
    public static RecipeExportContent? Read(JsonElement root)
    {
        if (!root.TryGetProperty("backupContentVersion", out var marker)) return null;
        if (marker.ValueKind != JsonValueKind.Number || !marker.TryGetInt32(out var version) || version != 1 ||
            !root.TryGetProperty("rawMetadata", out var raw) ||
            raw.ValueKind is not (JsonValueKind.String or JsonValueKind.Null) ||
            !root.TryGetProperty("ingredients", out var ingredients) ||
            ingredients.ValueKind is not (JsonValueKind.String or JsonValueKind.Null))
            throw new InvalidDataException("Unsupported or malformed recipe content envelope.");

        var rawText = raw.GetString();
        var ingredientText = ingredients.GetString();
        if (rawText is not null) using (JsonDocument.Parse(rawText)) { }
        if (ingredientText is not null)
        {
            using var parsed = JsonDocument.Parse(ingredientText);
            if (parsed.RootElement.ValueKind != JsonValueKind.Array)
                throw new InvalidDataException("Recipe export ingredients must contain a JSON array.");
        }
        int? servings;
        if (root.TryGetProperty("servings", out var exportedServings))
        {
            // Presence is authoritative, including an explicit unknown projection.
            if (exportedServings.ValueKind == JsonValueKind.Null) servings = null;
            else if (exportedServings.ValueKind == JsonValueKind.Number && exportedServings.TryGetInt32(out var count) && count > 0) servings = count;
            else throw new InvalidDataException("Recipe export servings must be null or a positive integer.");
        }
        else servings = RecipeServings.FromMetadata(rawText);
        return new(rawText, ingredientText, servings);
    }
}
