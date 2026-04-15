namespace RecipeApi.Dto;

public class RecipeDetailResponseDto
{
    public DateTimeOffset UpdatedAt { get; set; }
    public RecipeDto Recipe { get; set; } = null!;
}
