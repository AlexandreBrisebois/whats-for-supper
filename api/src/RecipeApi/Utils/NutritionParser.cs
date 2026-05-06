using System.Globalization;
using RecipeApi.Models;
using RecipeApi.Services;

namespace RecipeApi.Utils;

/// <summary>
/// Parses Schema.org NutritionInformation string values (e.g. "370 mg", "9 g") into doubles.
/// Returns null when the string is absent or unparseable — never throws.
/// </summary>
public static class NutritionParser
{
    /// <summary>
    /// Parses a grams value (e.g. "9 g") into a double.
    /// Returns null when the string is absent or unparseable.
    /// </summary>
    public static double? ParseGrams(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        try
        {
            var trimmed = value.Trim();
            if (trimmed.EndsWith(" g", StringComparison.OrdinalIgnoreCase))
            {
                trimmed = trimmed[..^2].Trim();
            }

            if (double.TryParse(trimmed, NumberStyles.Float, CultureInfo.InvariantCulture, out var result))
            {
                return result;
            }
        }
        catch
        {
            // Silently return null on any parse error
        }

        return null;
    }

    /// <summary>
    /// Parses a milligrams value (e.g. "370 mg") into a double.
    /// Returns null when the string is absent or unparseable.
    /// </summary>
    public static double? ParseMilligrams(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        try
        {
            var trimmed = value.Trim();
            if (trimmed.EndsWith(" mg", StringComparison.OrdinalIgnoreCase))
            {
                trimmed = trimmed[..^3].Trim();
            }

            if (double.TryParse(trimmed, NumberStyles.Float, CultureInfo.InvariantCulture, out var result))
            {
                return result;
            }
        }
        catch
        {
            // Silently return null on any parse error
        }

        return null;
    }

    /// <summary>
    /// Computes FOP flags from nutrition information.
    /// Returns null when nutrition is null or all three relevant fields are null.
    /// Otherwise computes each flag independently — a field being null does not block
    /// the others. E.g. sodium present but saturated fat absent → highInSodium set,
    /// highInSaturatedFat = false (cannot confirm, defaults conservative to false).
    /// </summary>
    public static FopFlags? ComputeFopFlags(NutritionInformation? nutrition)
    {
        if (nutrition == null)
            return null;

        var saturatedFat = ParseGrams(nutrition.SaturatedFatContent);
        var sugars = ParseGrams(nutrition.SugarContent);
        var sodium = ParseMilligrams(nutrition.SodiumContent);

        // If all three are null, return null (no data to evaluate)
        if (saturatedFat == null && sugars == null && sodium == null)
            return null;

        // Compute each flag independently
        var highInSaturatedFat = saturatedFat.HasValue && saturatedFat.Value > FopThresholds.SaturatedFatG;
        var highInSugars = sugars.HasValue && sugars.Value > FopThresholds.SugarsG;
        var highInSodium = sodium.HasValue && sodium.Value > FopThresholds.SodiumMg;

        return new FopFlags(
            HighInSaturatedFat: highInSaturatedFat,
            HighInSugars: highInSugars,
            HighInSodium: highInSodium
        );
    }
}
