namespace RecipeApi.Dto;

public record IngredientProjectionLineDto
{
    [System.Text.Json.Serialization.JsonIgnore]
    public GroceryQuantityObservation GroceryObservation { get; init; } = new(null, "unresolved");
    [System.Text.Json.Serialization.JsonIgnore]
    public string? GroceryRecordedNumberToken { get; init; }
    [System.Text.Json.Serialization.JsonIgnore]
    public Guid? SavedIngredientLineId { get; init; }
    [System.Text.Json.Serialization.JsonIgnore]
    public string? GroceryPurchaseIdentity { get; init; }
    [System.Text.Json.Serialization.JsonIgnore]
    public RecipePackageDto? GroceryPackage { get; init; }
    public required string OriginalText { get; set; }
    public string? DisplayText { get; set; }
    public required string Name { get; set; }
    public required double? Quantity { get; set; }
    public required string? UnitText { get; set; }
    public required string Status { get; set; }
    public required string[] Issues { get; set; }
}
