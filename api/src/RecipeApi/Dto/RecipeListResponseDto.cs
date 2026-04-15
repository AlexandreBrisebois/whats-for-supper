namespace RecipeApi.Dto;

public class RecipeListResponseDto
{
    public DateTimeOffset UpdatedAt { get; set; }
    public List<RecipeDto> Recipes { get; set; } = [];
    public PaginationDto Pagination { get; set; } = new();
}
