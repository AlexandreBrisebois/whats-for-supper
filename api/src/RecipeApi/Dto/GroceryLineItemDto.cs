using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

[JsonConverter(typeof(GroceryLineItemJsonConverter))]
public record GroceryLineItemDto(
    [property: JsonPropertyName("displayName")] string DisplayName,
    [property: JsonPropertyName("normalizedKey")] string NormalizedKey,
    [property: JsonPropertyName("section")] string Section,
    [property: JsonIgnore] double? Quantity,
    [property: JsonPropertyName("unitText")] string? UnitText,
    [property: JsonPropertyName("recipeIds")] List<Guid> RecipeIds,
    [property: JsonPropertyName("quantityComplete")] bool? QuantityComplete = null)
{
    [JsonPropertyName("quantity")] public GroceryQuantity? ExactQuantity { get; init; }
    [JsonPropertyName("rowId")] public string RowId { get; init; } = "";
    [JsonPropertyName("rowVersion")] public string RowVersion { get; init; } = "";
    [JsonPropertyName("weekStartDate")] public DateOnly WeekStartDate { get; init; }
    [JsonPropertyName("demandIdentity")] public string DemandIdentity { get; init; } = "";
    [JsonPropertyName("source")] public string Source => "recipe";
}
