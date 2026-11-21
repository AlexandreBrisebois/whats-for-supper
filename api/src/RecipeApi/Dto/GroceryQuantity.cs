using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public sealed record GroceryQuantityObservation(GroceryQuantity? Quantity, string Evidence);

public sealed record GroceryRational(
    [property: JsonPropertyName("n")] string N,
    [property: JsonPropertyName("d")] string D);

public sealed record GroceryQuantity(
    [property: JsonPropertyName("kind")] string Kind,
    [property: JsonPropertyName("value"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] GroceryRational? Value = null,
    [property: JsonPropertyName("min"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] GroceryRational? Min = null,
    [property: JsonPropertyName("max"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] GroceryRational? Max = null);
