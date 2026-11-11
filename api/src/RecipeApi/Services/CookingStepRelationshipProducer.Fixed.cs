using System.Text.RegularExpressions;
using RecipeApi.Dto;

namespace RecipeApi.Services;

public static partial class CookingStepRelationshipProducer
{
    private const string FixedRule = "explicit-fixed-portions-clause";

    // Fixed intent must be affirmative in the saved clause. A matching amount,
    // provider role or the ingredient's own scaling policy cannot supply it.
    private static Clause? ParseFixed(string text, RecipeIngredientLineDto row)
    {
        if (row.Unit is null) return null;
        const string amount = @"(?<amount>[0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞][0-9¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.,–\- \t]*)";
        var measurement = @"(?<measurement>" + amount + @"[ \t]+" + Regex.Escape(row.Unit.Text) + ")";
        var noun = Regex.Escape(row.Description);
        var pattern = @"\A[ \t]*(?:For[ \t]+any[ \t]+number[ \t]+of[ \t]+portions,[ \t]+use[ \t]+exactly[ \t]+" +
            measurement + @"[ \t]+(?:of[ \t]+)?" + noun +
            @"|Quel[ \t]+que[ \t]+soit[ \t]+le[ \t]+nombre[ \t]+de[ \t]+portions,[ \t]+utilisez[ \t]+exactement[ \t]+" +
            measurement + @"[ \t]+(?:de[ \t]+|d['’])" + noun + @")\.?[ \t]*\z";
        var match = Regex.Match(text, pattern, Options, MatchTimeout);
        if (!match.Success) return null;
        var quantity = LegacyGroceryQuantity.Parse(match.Groups["amount"].Value.Trim());
        if (quantity is not { Kind: "scalar", Value.N: not "0" } || !LegacyGroceryQuantity.IsCanonical(quantity)) return null;
        var span = match.Groups["measurement"];
        return new(new(span.Index, span.Index + span.Length, span.Value), quantity, "fixed");
    }

    private static bool UsableFixedRow(CanonicalRecipeContent content, RecipeIngredientLineDto row) =>
        row.Id != Guid.Empty && content.IngredientLines.Count(other => other.Id == row.Id) == 1 &&
        row.Scaling is "proportional" or "fixed" && row.Package is null && FixedAmount(row, row.Amount) &&
        !string.IsNullOrWhiteSpace(row.Description) && row.Description.IndexOfAny(['\r', '\n', '.', ';', ':', '!', '?']) < 0 &&
        content.IngredientLines.Count(other => string.Equals(other.Description, row.Description, StringComparison.OrdinalIgnoreCase)) == 1;

    // Standalone fixed uses are not an exhaustive allocation. In particular,
    // total corrections do not redistribute or impose a new bound on the use.
    private static bool FixedAmount(RecipeIngredientLineDto row, GroceryQuantity? amount) =>
        row.Amount is { Kind: "scalar", Value.N: not "0" } && LegacyGroceryQuantity.IsCanonical(row.Amount) &&
        amount is { Kind: "scalar", Value.N: not "0" } && LegacyGroceryQuantity.IsCanonical(amount) && row.Unit is not null &&
        GroceryUnit.Read(row.Unit.Text).Bucket is "g" or "ml" or "cup" or "tsp" or "tbsp";
}
