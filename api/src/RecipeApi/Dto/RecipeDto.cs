using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeDto
{
    [JsonPropertyName("id")]
    public required Guid Id { get; set; }

    [JsonPropertyName("rating")]
    public int? Rating { get; set; }

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

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("difficulty")]
    public string? Difficulty { get; set; }

    [JsonPropertyName("isVegetarian")]
    public bool? IsVegetarian { get; set; }

    [JsonPropertyName("isHealthyChoice")]
    public bool? IsHealthyChoice { get; set; }

    [JsonPropertyName("ingredients")]
    public List<string>? Ingredients { get; set; }

    [JsonPropertyName("recipeInstructions")]
    public object? RecipeInstructions { get; set; }

    [JsonPropertyName("createdAt")]
    public required DateTimeOffset CreatedAt { get; set; }
}
