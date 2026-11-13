using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using RecipeApi.Services;

namespace RecipeApi.Dto;

/// <summary>Reads retained legacy numeric observations without inventing original fractions.</summary>
public sealed class GroceryLineItemJsonConverter : JsonConverter<GroceryLineItemDto>
{
    public override GroceryLineItemDto Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        using var document = JsonDocument.ParseValue(ref reader);
        var root = document.RootElement;
        string? Text(string key) => root.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
        bool? Boolean(string key) => root.TryGetProperty(key, out var value) && value.ValueKind is JsonValueKind.True or JsonValueKind.False ? value.GetBoolean() : null;
        var quantity = root.TryGetProperty("quantity", out var q) ? q : default;
        GroceryQuantity? exact = quantity.ValueKind == JsonValueKind.Number
            ? LegacyGroceryQuantity.Read("", "", null, quantity.GetRawText()).Quantity
            : quantity.ValueKind == JsonValueKind.Object ? quantity.Deserialize<GroceryQuantity>(options) : null;
        if (quantity.ValueKind == JsonValueKind.Object && !LegacyGroceryQuantity.IsCanonical(exact))
            throw new JsonException("Invalid persisted exact grocery quantity.");
        double? numeric = quantity.ValueKind == JsonValueKind.Number && quantity.TryGetDouble(out var number) && double.IsFinite(number)
            ? number : exact?.Value is { } scalar ? double.Parse(scalar.N, CultureInfo.InvariantCulture) / double.Parse(scalar.D, CultureInfo.InvariantCulture) : null;
        Guid? foodId = null;
        if (root.TryGetProperty("foodId", out var savedFood) && savedFood.ValueKind != JsonValueKind.Null)
        {
            if (savedFood.ValueKind != JsonValueKind.String || !Guid.TryParseExact(savedFood.GetString(), "D", out var parsedFood) || parsedFood == Guid.Empty)
                throw new JsonException("Invalid persisted grocery food identity.");
            foodId = parsedFood;
        }
        return new(Text("displayName") ?? "", Text("normalizedKey") ?? "", Text("section") ?? "Grocery", numeric,
            Text("unitText"), root.TryGetProperty("recipeIds", out var ids) ? ids.Deserialize<List<Guid>>(options) ?? [] : [],
            Boolean("quantityComplete"))
        {
            ExactQuantity = exact,
            FoodId = foodId,
            RowId = Text("rowId") ?? "",
            RowVersion = Text("rowVersion") ?? "",
            DemandIdentity = Text("demandIdentity") ?? "",
            WeekStartDate = DateOnly.TryParseExact(Text("weekStartDate"), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var week) ? week : default,
        };
    }

    public override void Write(Utf8JsonWriter writer, GroceryLineItemDto value, JsonSerializerOptions options)
    {
        var exact = value.ExactQuantity ?? LegacyGroceryQuantity.Read("", "", null, null, value.Quantity).Quantity;
        if (exact is not null && !LegacyGroceryQuantity.IsCanonical(exact)) throw new JsonException("Invalid exact grocery quantity.");
        // Internal numeric projection remains a compatibility observation. The wire
        // always carries bounded rational strings, never a rounded numeric authority.
        var fields = new Dictionary<string, object?>
        {
            ["displayName"] = value.DisplayName,
            ["normalizedKey"] = value.NormalizedKey,
            ["section"] = value.Section,
            ["quantity"] = exact,
            ["unitText"] = value.UnitText,
            ["recipeIds"] = value.RecipeIds,
            ["quantityComplete"] = value.Quantity.HasValue && exact is null ? false : value.QuantityComplete,
            ["rowId"] = value.RowId,
            ["rowVersion"] = value.RowVersion,
            ["weekStartDate"] = value.WeekStartDate,
            ["demandIdentity"] = value.DemandIdentity,
            ["source"] = "recipe",
        };
        if (value.FoodId is { } savedFoodId) fields["foodId"] = savedFoodId;
        if (value.Presentation is not null)
        {
            fields["displayLabels"] = value.DisplayLabels;
            fields["labelStatus"] = value.LabelStatus;
            fields["displayNameVariants"] = value.DisplayNameVariants;
            fields["categoryScope"] = value.CategoryScope;
            fields["categoryStatus"] = value.CategoryStatus;
            fields["categoryRevision"] = value.CategoryRevision;
            fields["categoryChoices"] = value.CategoryChoices;
        }
        JsonSerializer.Serialize(writer, fields, options);
    }
}
