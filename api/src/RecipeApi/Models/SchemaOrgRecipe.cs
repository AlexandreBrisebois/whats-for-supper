using System.Text.Json.Serialization;

namespace RecipeApi.Models;

/// <summary>
/// Represents a Schema.org/Recipe object.
/// Note: This structure may be handled/stored as a raw JSON string in the future
/// (e.g., if migrated from disk-based files to database JSONB columns).
/// </summary>
public class SchemaOrgRecipe
{
    [JsonPropertyName("@context")]
    public string Context { get; set; } = "https://schema.org/";

    [JsonPropertyName("@type")]
    public string Type { get; set; } = "Recipe";

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("recipeYield")]
    public string? RecipeYield { get; set; }

    [JsonPropertyName("totalTime")]
    public string? TotalTime { get; set; }

    [JsonPropertyName("recipeIngredient")]
    public List<string>? RecipeIngredient { get; set; }

    [JsonPropertyName("recipeInstructions")]
    public List<HowToSection>? RecipeInstructions { get; set; }

    [JsonPropertyName("nutrition")]
    public NutritionInformation? Nutrition { get; set; }

    [JsonPropertyName("supply")]
    public List<HowToSupply>? Supply { get; set; }

    [JsonPropertyName("suggestedPairing")]
    public string? SuggestedPairing { get; set; }
}

public class HowToSection
{
    [JsonPropertyName("@type")]
    public string Type { get; set; } = "HowToSection";

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("itemListElement")]
    public List<HowToStep>? ItemListElement { get; set; }
}

public class HowToStep
{
    [JsonPropertyName("@type")]
    public string Type { get; set; } = "HowToStep";

    [JsonPropertyName("text")]
    public string? Text { get; set; }
}

public class NutritionInformation
{
    [JsonPropertyName("@type")]
    public string Type { get; set; } = "NutritionInformation";

    [JsonPropertyName("calories")]
    public string? Calories { get; set; }

    [JsonPropertyName("fatContent")]
    public string? FatContent { get; set; }

    [JsonPropertyName("saturatedFatContent")]
    public string? SaturatedFatContent { get; set; }

    [JsonPropertyName("sodiumContent")]
    public string? SodiumContent { get; set; }

    [JsonPropertyName("carbohydrateContent")]
    public string? CarbohydrateContent { get; set; }

    [JsonPropertyName("fiberContent")]
    public string? FiberContent { get; set; }

    [JsonPropertyName("sugarContent")]
    public string? SugarContent { get; set; }

    [JsonPropertyName("proteinContent")]
    public string? ProteinContent { get; set; }
}

public class HowToSupply
{
    [JsonPropertyName("@type")]
    public string Type { get; set; } = "HowToSupply";

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("requiredQuantity")]
    public QuantitativeValue? RequiredQuantity { get; set; }
}

public class QuantitativeValue
{
    [JsonPropertyName("@type")]
    public string Type { get; set; } = "QuantitativeValue";

    [JsonPropertyName("value")]
    public double? Value { get; set; }

    [JsonPropertyName("unitText")]
    public string? UnitText { get; set; }

    [JsonPropertyName("unitCode")]
    public string? UnitCode { get; set; }
}
