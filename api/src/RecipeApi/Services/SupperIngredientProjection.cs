using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>Reads coherent original ingredient amounts before aggregation or display rounding.</summary>
public static class SupperIngredientProjection
{
    public static List<IngredientProjectionLineDto> Read(Recipe recipe, int? target)
    {
        if (StructuredRecipeContentStore.Read(recipe) is { } canonical)
        {
            if (canonical.ContentSchemaVersion != 2)
                throw new InvalidDataException("Unsupported canonical recipe content schema version.");
            return ReadCanonical(canonical, target);
        }
        if (RecipeService.DeserializeIngredients(recipe.Ingredients).Count == 0 && string.IsNullOrWhiteSpace(recipe.RawMetadata))
            return [];
        throw new InvalidDataException("Recipe requires structured v2 canonical content.");
    }

    private static List<IngredientProjectionLineDto> ReadCanonical(StructuredRecipeContent content, int? target)
    {
        return content.IngredientLines.Select(row =>
        {
            var quantity = target is null || row.Scaling == "fixed" ? row.Amount
                : content.Servings is > 0 ? QuantityMath.Scale(row.Amount, target.Value, content.Servings.Value) : null;
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
                GroceryFoodId = row.Shopping.FoodId,
                OriginalText = StructuredRecipeContentStore.Render(row),
                DisplayText = row.Package is null
                    ? target is not null && quantity is not null
                        ? string.Join(" ", new[] { StructuredRecipeContentStore.Format(quantity), row.Unit?.Text, row.Shopping.Name }.Where(x => x is not null))
                        : null
                    : quantity is null ? StructuredRecipeContentStore.Render(row)
                    : StructuredRecipeContentStore.Render(row with { Amount = quantity, AmountText = null }),
                Name = row.Shopping.Name,
                UnitText = row.Unit?.Text,
                Quantity = number,
                GroceryObservation = new(quantity, "canonical_original"),
                Status = row.Amount is null ? "unquantified" : issues.Count > 0 ? "unresolved" : target is null ? "original" : "scaled",
                Issues = issues.ToArray()
            };
        }).ToList();
    }
}
