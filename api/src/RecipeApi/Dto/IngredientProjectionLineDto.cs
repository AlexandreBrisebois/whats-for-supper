namespace RecipeApi.Dto;

public record IngredientProjectionLineDto
{
    public required string OriginalText { get; set; }
    public required string Name { get; set; }
    public required double? Quantity { get; set; }
    public required string? UnitText { get; set; }
    public required string Status { get; set; }
    public required string[] Issues { get; set; }
}
