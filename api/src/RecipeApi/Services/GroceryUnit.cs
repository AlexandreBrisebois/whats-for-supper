using System.Text;
using System.Text.RegularExpressions;

namespace RecipeApi.Services;

/// <summary>No implicit culinary standard or generic count conversion.</summary>
internal readonly record struct GroceryUnit(string? Text, int Numerator, int Denominator)
{
    internal string Bucket => Text ?? "";
    internal static GroceryUnit Read(string? raw) => (raw is null ? null : Regex.Replace(raw.Normalize(NormalizationForm.FormC).Trim().ToLowerInvariant(), @"\s+", " ")) switch
    {
        "g" or "gram" or "grams" or "gramme" or "grammes" => new("g", 1, 1),
        "kg" or "kilogram" or "kilograms" or "kilogramme" or "kilogrammes" => new("g", 1000, 1),
        "mg" or "milligram" or "milligrams" or "milligramme" or "milligrammes" => new("g", 1, 1000),
        "ml" or "milliliter" or "milliliters" or "millilitre" or "millilitres" => new("ml", 1, 1),
        "l" or "liter" or "liters" or "litre" or "litres" => new("ml", 1000, 1),
        "cl" => new("ml", 10, 1),
        "dl" => new("ml", 100, 1),
        "cup" or "cups" or "tasse" or "tasses" => new("cup", 1, 1),
        "tsp" or "tsp." or "tsps" or "teaspoon" or "teaspoons" or "c. à thé" or "c à thé" or "cuillère à thé" or "cuillères à thé" or "cuillerée à thé" or "cuillerées à thé" => new("tsp", 1, 1),
        "tbsp" or "tbsp." or "tbsps" or "tablespoon" or "tablespoons" or "c. à soupe" or "c à soupe" or "cuillère à soupe" or "cuillères à soupe" or "cuillerée à soupe" or "cuillerées à soupe" => new("tbsp", 1, 1),
        _ => new(raw, 1, 1),
    };
}
