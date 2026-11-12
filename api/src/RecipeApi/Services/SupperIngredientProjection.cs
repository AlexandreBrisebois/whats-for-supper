using System.Text.Json;
using System.Text;
using System.Text.RegularExpressions;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>Reads coherent original ingredient amounts before aggregation or display rounding.</summary>
public static class SupperIngredientProjection
{
    public static double? ScaleAmount(double? original, int? basis, int? target)
    {
        if (target is null) return original;
        if (basis is not > 0 || original is null) return null;
        var scaled = original.Value * ((double)target.Value / basis.Value);
        return double.IsFinite(scaled) ? scaled : null;
    }

    public static List<IngredientProjectionLineDto> Read(Recipe recipe, int? target)
    {
        if (CanonicalRecipeContentStore.Read(recipe) is { } canonical) return ReadCanonical(canonical, target);
        var ingredients = RecipeService.DeserializeIngredients(recipe.Ingredients ?? "[]");
        using var metadata = Metadata(recipe.RawMetadata);
        var root = metadata?.RootElement;
        var source = root is { ValueKind: JsonValueKind.Object } value &&
            (value.TryGetProperty("recipeIngredient", out var retained) || value.TryGetProperty("ingredients", out retained))
            && retained.ValueKind == JsonValueKind.Array ? retained : default;
        var supply = root is { ValueKind: JsonValueKind.Object } data && data.TryGetProperty("supply", out var supplies)
            && supplies.ValueKind == JsonValueKind.Array ? supplies : default;
        if (recipe.Ingredients is null && source.ValueKind == JsonValueKind.Array && source.EnumerateArray().All(x => x.ValueKind == JsonValueKind.String))
            ingredients = source.EnumerateArray().Select(x => x.GetString()!).ToList();
        var coherent = source.ValueKind == JsonValueKind.Array && source.GetArrayLength() == ingredients.Count
            && source.EnumerateArray().Select(x => x.ValueKind == JsonValueKind.String ? x.GetString()?.Trim() : null)
                .SequenceEqual(ingredients.Select(x => x.Trim()), StringComparer.Ordinal);
        // A legacy supply without a retained current ingredient basis may supply names,
        // but cannot establish quantities. Never parse numbers out of fallback text.
        if (ingredients.Count == 0 && supply.ValueKind == JsonValueKind.Array)
            ingredients = supply.EnumerateArray().Select(x => Text(x, "name")).Where(x => x is not null).Select(x => x!).ToList();
        var stale = supply.ValueKind == JsonValueKind.Array && supply.GetArrayLength() > 0 && !coherent;
        var bindings = coherent ? BindSupplies(ingredients, supply) : new Dictionary<int, JsonElement>();
        var result = new List<IngredientProjectionLineDto>();
        for (var index = 0; index < ingredients.Count; index++)
        {
            var text = ingredients[index];
            var item = bindings.GetValueOrDefault(index);
            var name = Text(item, "name") ?? text;
            var required = item.ValueKind == JsonValueKind.Object && item.TryGetProperty("requiredQuantity", out var nested) ? nested : default;
            var amount = Number(item, "quantity") ?? Number(required, "value");
            var unit = Text(item, "unitText") ?? Text(required, "unitText");
            var unquantified = amount is null && IntentionallyUnquantified(text);
            var issues = new List<string>();
            if (!unquantified)
            {
                if (stale) issues.Add("stale_source");
                else if (target is not null && recipe.Servings is not > 0) issues.Add("missing_basis");
                else if (amount is null) issues.Add("unreliable_amount");
            }
            var quantity = issues.Count == 0 && !unquantified ? ScaleAmount(amount, recipe.Servings, target) : null;
            if (quantity is null && amount is not null && issues.Count == 0) issues.Add("unreliable_amount");
            result.Add(new IngredientProjectionLineDto
            {
                GroceryRecordedNumberToken = NumericToken(item, "quantity") ?? NumericToken(required, "value"),
                GroceryObservation = bindings.ContainsKey(index)
                    ? LegacyGroceryQuantity.Read(text, name, unit, NumericToken(item, "quantity") ?? NumericToken(required, "value"),
                        basis: recipe.Servings, target: target)
                    : new(null, "unresolved"),
                OriginalText = text,
                Name = name,
                Quantity = quantity,
                UnitText = unit,
                Status = unquantified ? "unquantified" : issues.Count > 0 ? "unresolved" : target is null ? "original" : "scaled",
                Issues = issues.ToArray()
            });
        }
        return result;
    }

    private static List<IngredientProjectionLineDto> ReadCanonical(CanonicalRecipeContent content, int? target)
    {
        return content.IngredientLines.Select(row =>
        {
            var quantity = target is null || row.Scaling == "fixed" ? row.Amount
                : content.Servings is > 0 ? LegacyGroceryQuantity.Scale(row.Amount, target.Value, content.Servings.Value) : null;
            var issues = new List<string>();
            if (row.Amount is not null && quantity is null) issues.Add(content.Servings is not > 0 && target is not null ? "missing_basis" : "unreliable_amount");
            double? number = quantity?.Value is { } scalar && double.TryParse(scalar.N, System.Globalization.CultureInfo.InvariantCulture, out var n)
                && double.TryParse(scalar.D, System.Globalization.CultureInfo.InvariantCulture, out var d) && double.IsFinite(n / d) ? n / d : null;
            return new IngredientProjectionLineDto
            {
                SavedIngredientLineId = row.Id,
                GroceryPurchaseIdentity = GroceryDemandEvidence.Fingerprint(new
                {
                    row.Shopping.FoodId,
                    Name = row.Shopping.FoodId is null ? row.Shopping.Name : null,
                    row.Package
                }),
                GroceryPackage = row.Package,
                OriginalText = CanonicalRecipeContentStore.Render(row),
                DisplayText = row.Package is null
                    ? target is not null && quantity is not null
                        ? string.Join(" ", new[] { CanonicalRecipeContentStore.Format(quantity), row.Unit?.Text, row.Shopping.Name }.Where(x => x is not null))
                        : null
                    : quantity is null ? CanonicalRecipeContentStore.Render(row)
                    : CanonicalRecipeContentStore.Render(row with { Amount = quantity, AmountText = null }),
                Name = row.Shopping.Name,
                UnitText = row.Unit?.Text,
                Quantity = number,
                GroceryObservation = new(quantity, "canonical_original"),
                Status = row.Amount is null ? "unquantified" : issues.Count > 0 ? "unresolved" : target is null ? "original" : "scaled",
                Issues = issues.ToArray()
            };
        }).ToList();
    }

    // Legacy supply arrays omit unquantified ingredients and do not carry source indices.
    // A positional zip (even for equally sized arrays) cannot establish their identity.
    private static Dictionary<int, JsonElement> BindSupplies(List<string> ingredients, JsonElement supply)
    {
        if (supply.ValueKind != JsonValueKind.Array) return [];
        var entries = supply.EnumerateArray().ToArray();
        var normalized = ingredients.Select(NormalizeName).ToArray();
        var candidates = entries.Select(entry =>
        {
            var name = Text(entry, "name");
            if (string.IsNullOrWhiteSpace(name)) return Array.Empty<int>();
            var pattern = @"(?<![\p{L}\p{M}\p{N}])" + Regex.Escape(NormalizeName(name)) + @"(?![\p{L}\p{M}\p{N}])";
            return Enumerable.Range(0, normalized.Length).Where(i => Regex.IsMatch(normalized[i], pattern, RegexOptions.CultureInvariant)).ToArray();
        }).ToArray();
        var result = new Dictionary<int, JsonElement>();
        for (var i = 0; i < entries.Length; i++)
        {
            if (candidates[i].Length != 1) continue;
            var line = candidates[i][0];
            if (candidates.Count(matches => matches.Contains(line)) == 1) result[line] = entries[i];
        }
        return result;
    }

    private static string NormalizeName(string text) => Regex.Replace(text.Normalize(NormalizationForm.FormC).ToUpperInvariant(), @"\s+", " ").Trim();

    private static bool IntentionallyUnquantified(string text)
        => new[] { "to taste", "for frying", "au goût", "au gout", "pour la friture", "pour frire" }
            .Any(x => text.Contains(x, StringComparison.OrdinalIgnoreCase));

    private static JsonDocument? Metadata(string? raw)
    {
        try { return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw); }
        catch (JsonException) { return null; }
    }
    private static string? Text(JsonElement item, string key)
        => item.ValueKind == JsonValueKind.Object && item.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String
            ? string.IsNullOrWhiteSpace(value.GetString()) ? null : value.GetString() : null;
    private static double? Number(JsonElement item, string key)
        => item.ValueKind == JsonValueKind.Object && item.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.Number
            && value.TryGetDouble(out var number) && double.IsFinite(number) && number >= 0 ? number : null;

    private static string? NumericToken(JsonElement item, string key) =>
        item.ValueKind == JsonValueKind.Object && item.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.Number
            ? value.GetRawText() : null;
}
