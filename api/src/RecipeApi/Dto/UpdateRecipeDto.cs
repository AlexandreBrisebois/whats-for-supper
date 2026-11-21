using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

namespace RecipeApi.Dto;

/// <summary>
/// Payload for PATCH /api/recipes/{id}.
/// Fields are optional; supplied servings must be a positive integer.
/// Servings is database-only; existing editable metadata also updates recipe.info.
/// </summary>
public class UpdateRecipeDto
{
    [JsonPropertyName("expectedContentRevision")]
    public string? ExpectedContentRevision { get; set; }

    // Capture presence, including explicit null, so unsupported current-content
    // input cannot be silently ignored while other fields in the PATCH commit.
    private System.Text.Json.JsonElement ingredientLines;
    private System.Text.Json.JsonElement instructionSections;
    [JsonIgnore] public bool HasCanonicalContent { get; private set; }
    [JsonPropertyName("ingredientLines"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public System.Text.Json.JsonElement IngredientLines
    {
        get => ingredientLines;
        set { ingredientLines = value; HasCanonicalContent = true; }
    }
    [JsonPropertyName("instructionSections"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public System.Text.Json.JsonElement InstructionSections
    {
        get => instructionSections;
        set { instructionSections = value; HasCanonicalContent = true; }
    }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("ingredients")]
    public List<string>? Ingredients { get; set; }

    [JsonPropertyName("recipeInstructions")]
    public object? RecipeInstructions { get; set; }

    private int? servings;
    [JsonIgnore]
    public bool HasServings { get; private set; }

    [JsonNumberHandling(JsonNumberHandling.Strict)]
    [Range(1, int.MaxValue)]
    [JsonPropertyName("servings")]
    public int? Servings
    {
        get => servings;
        set { servings = value; HasServings = true; }
    }

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
