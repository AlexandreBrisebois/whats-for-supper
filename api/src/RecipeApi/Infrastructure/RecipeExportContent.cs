using System.Text.Json;

namespace RecipeApi.Infrastructure;

/// <summary>Compatibility boundary shared by readers of current recipe export envelopes.</summary>
internal sealed record RecipeExportContent(string? RawMetadata, string? Ingredients)
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
        return new(rawText, ingredientText);
    }
}
