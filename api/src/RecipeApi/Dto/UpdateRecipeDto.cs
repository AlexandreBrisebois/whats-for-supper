using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

/// <summary>
/// Payload for PATCH /api/recipes/{id}.
/// Both fields are optional; only non-null values are applied.
/// Changes are persisted to both the database and the recipe.info file on disk.
/// </summary>
public class UpdateRecipeDto
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("ingredients")]
    public List<string>? Ingredients { get; set; }

    [JsonPropertyName("recipeInstructions")]
    public object? RecipeInstructions { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    /// <summary>0 = Unknown, 1 = Dislike, 2 = Like, 3 = Love</summary>
    [JsonPropertyName("rating")]
    public int? Rating { get; set; }

    [JsonPropertyName("isDiscoverable")]
    public bool? IsDiscoverable { get; set; }

    [JsonPropertyName("cuisineType")]
    public string? CuisineType { get; set; }

    [JsonPropertyName("mealTypes")]
    public string[]? MealTypes { get; set; }
}
