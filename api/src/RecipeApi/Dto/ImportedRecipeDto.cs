using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class ImportedRecipeDto
{
    [Required]
    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [Required]
    [JsonPropertyName("ingredients")]
    public required List<string> Ingredients { get; set; } = [];

    [Required]
    [JsonPropertyName("instructions")]
    public required List<string> Instructions { get; set; } = [];

    [JsonPropertyName("prepTimeMinutes")]
    public int? PrepTimeMinutes { get; set; }

    [JsonPropertyName("cookTimeMinutes")]
    public int? CookTimeMinutes { get; set; }

    [JsonPropertyName("totalTimeMinutes")]
    public int? TotalTimeMinutes { get; set; }

    [JsonPropertyName("servings")]
    public int? Servings { get; set; }

    [JsonPropertyName("sourceUrl")]
    public string? SourceUrl { get; set; }

    [JsonPropertyName("sourceName")]
    public string? SourceName { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("isSynthesized")]
    public bool IsSynthesized { get; set; }
}
