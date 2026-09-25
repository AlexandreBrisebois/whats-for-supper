using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace RecipeApi.Tests.Integration.Fixtures;

/// <summary>
/// Versioned, source-owned corpus for the hybrid-search baseline. It deliberately
/// models facts only; it neither changes serving behavior nor supplies aliases.
/// </summary>
public static partial class HybridRecipeSearchBaselineFixture
{
    public const string Version = "2026.09.15.1";

    public static readonly IReadOnlyList<FixtureRecipe> Recipes =
    [
        Recipe("11111111-1111-1111-1111-111111111111", "Fresh Salmon with Vegetables", ["salmon", "zucchini", "tomato"], "Mediterranean", ["Supper"], "Main", "PT25M", "fresh-vegetables-fish", "{\"keywords\":[\"weeknight\"]}"),
        Recipe("22222222-2222-2222-2222-222222222222", "Saumon frais aux légumes", ["saumon", "courgette", "tomate"], "French", ["Dinner"], "Main", "30 mins", "fresh-vegetables-fish"),
        Recipe("33333333-3333-3333-3333-333333333333", "Hearty Beef Stew", ["beef", "potato", "carrot"], "Canadian", ["Supper"], "Stew", "PT1H30M", "hearty-cold-evening"),
        // Representative French source shape copied from data/recipes/25f38bfb-33aa-4db6-abbd-e1545cab9090.
        Recipe("44444444-4444-4444-4444-444444444444", "Riz au four au consommé de bœuf et curcuma", ["0.25 tasse d'huile végétale", "1.5 tasses de riz blanc", "1 boîte (284 ml) de consommé de bœuf", "1.5 tasses d'eau chaude", "1 pincée de sel", "1 pincée de poivre", "0.5 c. à thé de sel d'oignon", "0.5 c. à thé de sel d'ail", "1 c. à thé de curcuma"], "French-Canadian", ["Dinner"], "Main", "PT1H5M", "hearty-cold-evening"),
        Recipe("55555555-5555-5555-5555-555555555555", "Lemon Chicken", ["chicken", "lemon", "rice"], "Mediterranean", ["Supper"], "Main", "25m", "chicken"),
        Recipe("66666666-6666-6666-6666-666666666666", "Poulet citronné", ["poulet", "citron", "riz"], "French", ["Dinner"], "Main", "PT25M", "chicken"),
        Recipe("77777777-7777-7777-7777-777777777777", "Quick Tomato Pasta", ["pasta", "tomato"], "Italian", ["Lunch"], "Main", "20 minutes", "near-match"),
        Recipe("88888888-8888-8888-8888-888888888888", "Mystery Fish Dish", ["fish"], "Mediterranean", ["Supper"], "Main", "unknown", "near-match")
    ];

    public static readonly IReadOnlyList<FixtureCase> Cases =
    [
        Case("beef", ["33333333-3333-3333-3333-333333333333", "44444444-4444-4444-4444-444444444444"], "hearty-cold-evening"),
        Case("boeuf", ["33333333-3333-3333-3333-333333333333", "44444444-4444-4444-4444-444444444444"], "hearty-cold-evening"),
        Case("chicken", ["55555555-5555-5555-5555-555555555555", "66666666-6666-6666-6666-666666666666"], "chicken"),
        Case("poulet", ["55555555-5555-5555-5555-555555555555", "66666666-6666-6666-6666-666666666666"], "chicken"),
        Case("fresh vegetables and fish", ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"], "fresh-vegetables-fish"),
        Case("something hearty for a cold evening", ["33333333-3333-3333-3333-333333333333", "44444444-4444-4444-4444-444444444444"], "hearty-cold-evening"),
        Case("salmon", ["11111111-1111-1111-1111-111111111111"], "fresh-vegetables-fish", new("Mediterranean", 30)),
    ];

    // This is a fixture embedding output table, not a word-to-word alias map.
    // The production provider remains the owner of cross-language similarity.
    public static float[] EmbeddingFor(string semanticGroup)
    {
        var vector = new float[1536];
        vector[semanticGroup switch
        {
            "fresh-vegetables-fish" => 0,
            "hearty-cold-evening" => 1,
            "chicken" => 2,
            _ => 3
        }] = 1f;
        return vector;
    }

    public static IReadOnlyList<string> NormalizeIncludedIngredients(string? ingredientsJson)
    {
        if (string.IsNullOrWhiteSpace(ingredientsJson)) return [];
        try
        {
            using var document = JsonDocument.Parse(ingredientsJson);
            if (document.RootElement.ValueKind != JsonValueKind.Array) return [];
            return document.RootElement.EnumerateArray()
                .Select(element => element.ValueKind switch
                {
                    JsonValueKind.String => element.GetString(),
                    JsonValueKind.Object when element.TryGetProperty("name", out var name) && name.ValueKind == JsonValueKind.String => name.GetString(),
                    _ => null
                })
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => NormalizeFact(value!))
                .Distinct(StringComparer.Ordinal)
                .Order(StringComparer.Ordinal)
                .ToArray();
        }
        catch (JsonException) { return []; }
    }

    public static int? ParseTotalTimeMinutes(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var iso = IsoDuration().Match(value.Trim());
        if (iso.Success)
            return int.Parse(iso.Groups["hours"].ValueOrZero(), CultureInfo.InvariantCulture) * 60
                + int.Parse(iso.Groups["minutes"].ValueOrZero(), CultureInfo.InvariantCulture);
        var legacy = LegacyMinutes().Match(value.Trim());
        return legacy.Success
            ? int.Parse(legacy.Groups["minutes"].Value, CultureInfo.InvariantCulture)
            : null;
    }

    public static string NormalizeFact(string value) => Whitespace().Replace(value.Normalize(NormalizationForm.FormKC).Trim().ToLowerInvariant(), " ");

    private static FixtureRecipe Recipe(string id, string name, string[] ingredients, string cuisine, string[] mealTypes, string category, string? totalTime, string semanticGroup, string? rawMetadata = null) =>
        new(Guid.Parse(id), name, JsonSerializer.Serialize(ingredients), cuisine, mealTypes, category, totalTime, semanticGroup, rawMetadata);

    private static FixtureCase Case(string query, string[] relevantIds, string embeddingSampleGroup, HardConstraints? hardConstraints = null) =>
        new(query, relevantIds.Select(Guid.Parse).ToArray(), embeddingSampleGroup, hardConstraints);

    [GeneratedRegex("^PT(?:(?<hours>\\d+)H)?(?:(?<minutes>\\d+)M)?$", RegexOptions.IgnoreCase)] private static partial Regex IsoDuration();
    [GeneratedRegex("^(?<minutes>\\d+)\\s*(?:m|min|mins|minute|minutes)$", RegexOptions.IgnoreCase)] private static partial Regex LegacyMinutes();
    [GeneratedRegex("\\s+")] private static partial Regex Whitespace();

    public sealed record FixtureRecipe(Guid Id, string Name, string IngredientsJson, string Cuisine, string[] MealTypes, string Category, string? TotalTime, string SemanticGroup, string? RawMetadata);
    public sealed record FixtureCase(string Query, IReadOnlyList<Guid> RelevantRecipeIds, string EmbeddingSampleGroup, HardConstraints? HardConstraints);
    public sealed record HardConstraints(string? Cuisine = null, int? MaximumTotalTimeMinutes = null);
}

internal static class MatchGroupExtensions
{
    public static string ValueOrZero(this Group group) => group.Success ? group.Value : "0";
}
