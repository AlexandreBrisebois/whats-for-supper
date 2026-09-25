using System.Globalization;
using System.Text;
using System.Text.Json;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed record RecipeSearchContent(string DocumentText, string SearchMetadata, int SchemaVersion);

public interface IRecipeSearchDocumentBuilder
{
    RecipeSearchContent Build(Recipe recipe);
}

/// <summary>The single, versioned projection from recipe-owned fields to search content.</summary>
public sealed class RecipeSearchDocumentBuilder : IRecipeSearchDocumentBuilder
{
    public const int CurrentSchemaVersion = 3;

    public RecipeSearchContent Build(Recipe recipe)
    {
        var ingredients = NormalizeCollection(ReadIngredients(recipe.Ingredients));
        var mealTypes = NormalizeCollection(recipe.MealTypes ?? []);
        var dietaryProfiles = NormalizeCollection(ReadDietaryProfiles(recipe.DietaryProfile));
        var hasVegetarianClassification = recipe.VegetarianClassificationVersion is not null;
        var metadata = new SortedDictionary<string, object?>(StringComparer.Ordinal)
        {
            ["category"] = Normalize(recipe.Category),
            ["cuisineTypes"] = NormalizeCollection([recipe.CuisineType]),
            ["dietaryProfiles"] = dietaryProfiles,
            ["ingredients"] = ingredients,
            ["mealTypes"] = mealTypes,
            ["tags"] = Array.Empty<string>(),
            ["totalTimeMinutes"] = ParseTotalMinutes(recipe.TotalTime)
        };
        if (hasVegetarianClassification) metadata["isVegetarian"] = recipe.IsVegetarian;
        var text = new List<string>();
        Add(text, "Name", recipe.Name); Add(text, "Description", recipe.Description);
        AddMany(text, "Ingredients", ingredients); Add(text, "Notes", recipe.Notes);
        Add(text, "Category", recipe.Category); Add(text, "Cuisine", recipe.CuisineType);
        AddMany(text, "Meal types", mealTypes); AddMany(text, "Dietary profile", dietaryProfiles);
        if (hasVegetarianClassification) text.Add($"Vegetarian: {recipe.IsVegetarian.ToString().ToLowerInvariant()}.");
        if (metadata["totalTimeMinutes"] is int minutes) text.Add($"Total time minutes: {minutes}.");
        return new RecipeSearchContent(string.Join("\n", text), JsonSerializer.Serialize(metadata), CurrentSchemaVersion);
    }

    public static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var normalized = value.Normalize(NormalizationForm.FormKC).Trim().ToLowerInvariant();
        return string.Join(' ', normalized.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
    }

    public static int? ParseTotalMinutes(string? value)
    {
        var input = Normalize(value);
        if (input is null) return null;
        var iso = System.Text.RegularExpressions.Regex.Match(input, "^pt(?:(\\d+)h)?(?:(\\d+)m)?$");
        if (iso.Success && (iso.Groups[1].Success || iso.Groups[2].Success))
            return (iso.Groups[1].Success ? int.Parse(iso.Groups[1].Value, CultureInfo.InvariantCulture) * 60 : 0) + (iso.Groups[2].Success ? int.Parse(iso.Groups[2].Value, CultureInfo.InvariantCulture) : 0);
        var legacy = System.Text.RegularExpressions.Regex.Match(input, "^([1-9]\\d*)\\s*(m|min|mins|minute|minutes)$");
        return legacy.Success ? int.Parse(legacy.Groups[1].Value, CultureInfo.InvariantCulture) : null;
    }

    private static IEnumerable<string> ReadIngredients(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) yield break;
        JsonDocument? document = null;
        try { document = JsonDocument.Parse(json); }
        catch (JsonException) { yield break; }
        using (document)
        {
            if (document.RootElement.ValueKind != JsonValueKind.Array) yield break;
            foreach (var item in document.RootElement.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String) yield return item.GetString()!;
                else if (item.ValueKind == JsonValueKind.Object && item.TryGetProperty("name", out var name) && name.ValueKind == JsonValueKind.String) yield return name.GetString()!;
            }
        }
    }

    private static IEnumerable<string> ReadDietaryProfiles(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) yield break;
        JsonDocument? document = null;
        try { document = JsonDocument.Parse(json); }
        catch (JsonException) { yield break; }
        using (document)
        {
            if (document.RootElement.ValueKind != JsonValueKind.Object) yield break;
            foreach (var key in new[] { "primaryFoodGroup", "proteinSource" })
                if (document.RootElement.TryGetProperty(key, out var property) && property.ValueKind == JsonValueKind.String) yield return property.GetString()!;
            if (document.RootElement.TryGetProperty("secondaryFoodGroups", out var secondary) && secondary.ValueKind == JsonValueKind.Array)
                foreach (var item in secondary.EnumerateArray()) if (item.ValueKind == JsonValueKind.String) yield return item.GetString()!;
        }
    }

    private static string[] NormalizeCollection(IEnumerable<string?> values) => values.Select(Normalize).Where(x => x is not null).Cast<string>().Distinct(StringComparer.Ordinal).OrderBy(x => x, StringComparer.Ordinal).ToArray();
    private static void Add(List<string> values, string label, string? value) { var normalized = Normalize(value); if (normalized is not null) values.Add($"{label}: {normalized}."); }
    private static void AddMany(List<string> values, string label, IReadOnlyCollection<string> items) { if (items.Count > 0) values.Add($"{label}: {string.Join(", ", items)}."); }
}
