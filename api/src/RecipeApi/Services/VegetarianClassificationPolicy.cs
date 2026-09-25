using Microsoft.Extensions.Options;

namespace RecipeApi.Services;

/// <summary>Server-owned facts policy. Change configured terms without changing client contracts.</summary>
public sealed class VegetarianClassificationOptions
{
    public string[] NonVegetarianIngredients { get; set; } =
    ["meat", "poultry", "fish", "shellfish", "meat stock", "meat broth", "fish stock", "fish broth", "lard", "gelatin", "fish sauce", "anchovy", "meat drippings"];
}

public sealed class VegetarianClassificationPolicy(IOptions<VegetarianClassificationOptions> options)
{
    public string BuildPromptRules()
    {
        var terms = options.Value.NonVegetarianIngredients
            .Where(term => !string.IsNullOrWhiteSpace(term))
            .Select(term => term.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        return $"Return true only when the available ingredients contain none of: {string.Join(", ", terms)}. Eggs and ordinary dairy are vegetarian. Use ingredients, never the title alone. Return null when ingredients are insufficient.";
    }
}
