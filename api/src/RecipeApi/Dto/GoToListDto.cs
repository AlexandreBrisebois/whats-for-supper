using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class GoToListDto
{
    [JsonPropertyName("items")]
    public List<GoToItemDto> Items { get; set; } = [];
}
