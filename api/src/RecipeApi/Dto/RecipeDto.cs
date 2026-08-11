using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeDto
{
    [JsonPropertyName("id")]
    public required Guid Id { get; set; }

    [JsonPropertyName("rating")]
    public int? Rating { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("addedBy")]
    public Guid? AddedBy { get; set; }

    /// <summary>Zero-based photo indices available for this recipe.</summary>
    [JsonPropertyName("images")]
    public List<int>? Images { get; set; } = [];

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("name")]
    public required string? Name { get; set; }

    [JsonPropertyName("imageUrl")]
    public required string? ImageUrl { get; set; }

    [JsonPropertyName("totalTime")]
    public string? TotalTime { get; set; }

    [JsonPropertyName("sourceUrl")]
    public string? SourceUrl { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("cuisineType")]
    public string? CuisineType { get; set; }

    [JsonPropertyName("mealTypes")]
    public string[]? MealTypes { get; set; }

    [JsonPropertyName("dietaryProfile")]
    public RecipeDietaryProfileDto? DietaryProfile { get; set; }

    [JsonPropertyName("isVegetarian")]
    public bool? IsVegetarian { get; set; }

    [JsonPropertyName("isHealthyChoice")]
    public bool? IsHealthyChoice { get; set; }

    [JsonPropertyName("isDiscoverable")]
    public bool? IsDiscoverable { get; set; }

    [JsonPropertyName("ingredients")]
    public List<string>? Ingredients { get; set; }

    [JsonPropertyName("recipeInstructions")]
    public object? RecipeInstructions { get; set; }

    [JsonPropertyName("sourceType")]
    public required string SourceType { get; set; }

    [JsonPropertyName("canReimport")]
    public required bool CanReimport { get; set; }

    [JsonPropertyName("importIssue")]
    public RecipeImportIssueDto? ImportIssue { get; set; }

    [JsonPropertyName("imageCount")]
    public required int ImageCount { get; set; }

    [JsonPropertyName("finishedDishIndex")]
    public int FinishedDishIndex { get; set; } = -1;

    [JsonPropertyName("createdAt")]
    public required DateTimeOffset CreatedAt { get; set; }

    [JsonPropertyName("isReady")]
    public bool IsReady { get; set; }

    [JsonPropertyName("deletedAt")]
    public DateTimeOffset? DeletedAt { get; set; }
}
