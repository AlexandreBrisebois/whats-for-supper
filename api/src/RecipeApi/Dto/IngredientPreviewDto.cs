namespace RecipeApi.Dto;

public record IngredientPreviewDto
{
    public required Guid RecipeId { get; set; }
    public required int? BaseServings { get; set; }
    public required int TargetServings { get; set; }
    public required double? Factor { get; set; }
    public required string Version { get; set; }
    public required string Status { get; set; }
    public required List<IngredientProjectionLineDto> Lines { get; set; }
}
