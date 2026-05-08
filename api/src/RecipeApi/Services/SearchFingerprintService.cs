using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>
/// Computes a stable SHA-256 fingerprint for a recipe's search-relevant fields.
/// Field set and sort order are defined in requirements.md R8-AC5.
/// </summary>
public static class SearchFingerprintService
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public static string ComputeSourceFingerprint(Recipe recipe)
    {
        var ingredients = DeserializeIngredients(recipe.Ingredients);
        var sortedIngredients = ingredients.OrderBy(i => i, StringComparer.Ordinal).ToList();

        // Canonical field set, alphabetically sorted as per R8-AC5
        var canonical = new Dictionary<string, object?>
        {
            ["category"] = recipe.Category,
            ["description"] = recipe.Description,
            ["difficulty"] = recipe.Difficulty,
            ["dietaryProfile"] = recipe.DietaryProfile != null
                ? JsonSerializer.Deserialize<object>(recipe.DietaryProfile)
                : null,
            ["ingredients"] = sortedIngredients,
            ["isDiscoverable"] = recipe.IsDiscoverable,
            ["name"] = recipe.Name,
            ["notes"] = recipe.Notes,
            ["rating"] = (int)recipe.Rating,
            ["recipeId"] = recipe.Id.ToString(),
            ["totalTime"] = recipe.TotalTime
        };

        var json = JsonSerializer.Serialize(canonical, _jsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static List<string> DeserializeIngredients(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }
}
