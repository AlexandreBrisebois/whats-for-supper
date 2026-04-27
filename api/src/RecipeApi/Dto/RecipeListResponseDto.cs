using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeListResponseDto
{
    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; }

    [JsonPropertyName("recipes")]
    public List<RecipeDto> Recipes { get; set; } = [];

    [JsonPropertyName("pagination")]
    public PaginationDto Pagination { get; set; } = new();
}
