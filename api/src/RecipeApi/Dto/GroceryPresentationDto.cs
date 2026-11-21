using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public sealed record GroceryDisplayLabels([property: JsonPropertyName("en")] string En, [property: JsonPropertyName("fr")] string Fr);
public sealed record GroceryDisplayContributor([property: JsonPropertyName("occurrenceId")] Guid OccurrenceId,
    [property: JsonPropertyName("recipeId")] Guid RecipeId, [property: JsonPropertyName("ingredientLineId")] Guid IngredientLineId);
public sealed record GroceryDisplayNameVariant([property: JsonPropertyName("text")] string Text,
    [property: JsonPropertyName("contributors")] IReadOnlyList<GroceryDisplayContributor> Contributors);
public sealed record GroceryDisplayNameVariants([property: JsonPropertyName("en")] IReadOnlyList<GroceryDisplayNameVariant> En,
    [property: JsonPropertyName("fr")] IReadOnlyList<GroceryDisplayNameVariant> Fr);
public sealed record GroceryCategoryChoice([property: JsonPropertyName("normalizedKey")] string NormalizedKey,
    [property: JsonPropertyName("grocerySection")] string GrocerySection, [property: JsonPropertyName("source")] string Source);
public sealed record GroceryPresentationDto(GroceryDisplayLabels DisplayLabels, string LabelStatus,
    GroceryDisplayNameVariants DisplayNameVariants, string CategoryScope, string CategoryStatus,
    string? CategoryRevision, IReadOnlyList<GroceryCategoryChoice> CategoryChoices)
{
    internal static GroceryPresentationDto Fallback(GroceryLineItemDto row) => new(new(row.DisplayName, row.DisplayName), "fallback",
        new([new(row.DisplayName, [])], [new(row.DisplayName, [])]), row.FoodId is null ? "fallback" : "food", "resolved", null, []);
}
