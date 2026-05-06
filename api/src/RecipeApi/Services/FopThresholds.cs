namespace RecipeApi.Services;

/// <summary>
/// Health Canada front-of-package (FOP) "High in" symbol thresholds.
/// 15% of the Daily Value per serving for each nutrient.
/// Source: https://www.canada.ca/en/health-canada/services/food-nutrition/nutrition-labelling/front-package.html
/// DO NOT duplicate these constants. All rules and scorers reference this class.
/// </summary>
public static class FopThresholds
{
    public const double SaturatedFatG = 4.0;   // DV 27g × 15%
    public const double SugarsG = 15.0;  // DV 100g × 15%
    public const double SodiumMg = 345.0; // DV 2300mg × 15%
}
