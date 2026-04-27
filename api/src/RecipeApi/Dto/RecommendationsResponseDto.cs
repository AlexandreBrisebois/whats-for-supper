using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecommendationsResponseDto
{
    [JsonPropertyName("topPick")]
    public TopPickDto TopPick { get; set; } = new();

    [JsonPropertyName("results")]
    public List<RecommendationResultDto> Results { get; set; } = [];
}
