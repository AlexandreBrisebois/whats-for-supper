using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

/// <summary>
/// Request body for POST /api/recipes/describe.
/// Creates a stub recipe from a text description and triggers the goto-synthesis workflow.
/// </summary>
public record DescribeRecipeDto
{
    /// <summary>Short name for the recipe (e.g. "Our family spaghetti").</summary>
    [Required]
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    /// <summary>Free-text description used to synthesize the full recipe via AI.</summary>
    [JsonPropertyName("description")]
    public string? Description { get; init; }
}
