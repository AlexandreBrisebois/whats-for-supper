using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeDetailResponseDto
{
    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; }

    [JsonPropertyName("recipe")]
    public RecipeDto Recipe { get; set; } = null!;
}
