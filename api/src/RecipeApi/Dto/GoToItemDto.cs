using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class GoToItemDto
{
    [JsonPropertyName("recipeId")]
    public Guid RecipeId { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }
}
