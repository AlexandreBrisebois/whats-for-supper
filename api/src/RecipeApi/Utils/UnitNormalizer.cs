namespace RecipeApi.Utils;

public static class UnitNormalizer
{
    public sealed record NormalizedUnit(string CanonicalUnit, double Factor);

    private static readonly Dictionary<string, NormalizedUnit> Map =
        new(StringComparer.OrdinalIgnoreCase)
        {
            // Weight -> g
            ["g"] = new("g", 1),
            ["gram"] = new("g", 1),
            ["grams"] = new("g", 1),
            ["mg"] = new("g", 0.001),
            ["milligram"] = new("g", 0.001),
            ["milligrams"] = new("g", 0.001),
            ["kg"] = new("g", 1000),
            ["kilogram"] = new("g", 1000),
            ["kilograms"] = new("g", 1000),
            // Volume -> ml
            ["ml"] = new("ml", 1),
            ["milliliter"] = new("ml", 1),
            ["millilitre"] = new("ml", 1),
            ["dl"] = new("ml", 100),
            ["deciliter"] = new("ml", 100),
            ["decilitre"] = new("ml", 100),
            ["l"] = new("ml", 1000),
            ["liter"] = new("ml", 1000),
            ["litre"] = new("ml", 1000),
            // Culinary -> ml (shopping labels are typically metric volume)
            ["tsp"] = new("ml", 5),
            ["teaspoon"] = new("ml", 5),
            ["teaspoons"] = new("ml", 5),
            ["tbsp"] = new("ml", 15),
            ["tablespoon"] = new("ml", 15),
            ["tablespoons"] = new("ml", 15),
            ["cup"] = new("ml", 240),
            ["cups"] = new("ml", 240),
            // Count -> piece (null/blank handled in Normalize)
            ["piece"] = new("piece", 1),
            ["pieces"] = new("piece", 1),
            ["whole"] = new("piece", 1),
            ["unit"] = new("piece", 1),
            ["units"] = new("piece", 1),
        };

    /// <summary>
    /// Returns the canonical unit and conversion factor for <paramref name="unitText"/>.
    /// Null or blank input maps to the "piece" family (count).
    /// Returns null if <paramref name="unitText"/> is not in any known family.
    /// </summary>
    public static NormalizedUnit? Normalize(string? unitText)
    {
        if (string.IsNullOrWhiteSpace(unitText))
            return new NormalizedUnit("piece", 1);

        return Map.TryGetValue(unitText.Trim(), out var result) ? result : null;
    }
}
