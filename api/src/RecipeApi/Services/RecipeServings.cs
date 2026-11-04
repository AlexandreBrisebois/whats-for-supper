using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace RecipeApi.Services;

/// <summary>Conservative projection of raw serving yield; never scales ingredients.</summary>
public static partial class RecipeServings
{
    public static int? FromMetadata(string? metadata)
    {
        if (string.IsNullOrWhiteSpace(metadata)) return null;
        try
        {
            using var json = JsonDocument.Parse(metadata);
            return json.RootElement.ValueKind == JsonValueKind.Object &&
                json.RootElement.TryGetProperty("recipeYield", out var yield) && yield.ValueKind == JsonValueKind.String
                ? Parse(yield.GetString()) : null;
        }
        catch (JsonException) { return null; }
    }

    public static int? Parse(string? yield)
    {
        if (yield is null) return null;
        var match = ServingExpression().Match(yield.Trim());
        return match.Success && int.TryParse((match.Groups[1].Success ? match.Groups[1].Value : match.Groups[2].Value), NumberStyles.None, CultureInfo.InvariantCulture, out var count) && count > 0
            ? count : null;
    }

    [GeneratedRegex(@"\A(?:([0-9]+)\s+(?:portion|portions|serving|servings|personne|personnes|person|people)|serves\s+([0-9]+))\z", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex ServingExpression();
}
