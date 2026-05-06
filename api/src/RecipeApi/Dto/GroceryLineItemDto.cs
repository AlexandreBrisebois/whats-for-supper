using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public record GroceryLineItemDto(
    [property: JsonPropertyName("displayName")] string DisplayName,
    [property: JsonPropertyName("normalizedKey")] string NormalizedKey,
    [property: JsonPropertyName("section")] string Section,
    [property: JsonPropertyName("quantity")] double? Quantity,
    [property: JsonPropertyName("unitText")] string? UnitText,
    [property: JsonPropertyName("recipeIds")] List<Guid> RecipeIds);
