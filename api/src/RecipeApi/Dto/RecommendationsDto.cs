using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecommendationsDto
{
    [JsonPropertyName("topPick")]
    public TopPickDto TopPick { get; set; } = new();

    [JsonPropertyName("results")]
    public List<RecommendationResultDto> Results { get; set; } = [];
}
