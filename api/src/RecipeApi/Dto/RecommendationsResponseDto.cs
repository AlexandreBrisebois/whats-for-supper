namespace RecipeApi.Dto;

public class RecommendationsDto
{
    public TopPickDto TopPick { get; set; } = new();
    public List<RecommendationResultDto> Results { get; set; } = [];
}
