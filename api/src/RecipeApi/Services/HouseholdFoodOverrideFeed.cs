using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed record HouseholdFoodOverrideSnapshot(Guid Id, string Revision, Guid? FoodId, string? DictionaryRevision,
    string? FallbackKey, string? ShoppingName, string? GrocerySection, string[] ProtectedFields,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, FoodVocabularyReference? Document, string PresentationSequence)
{
    public static HouseholdFoodOverrideSnapshot From(HouseholdFoodOverride row) => new(row.Id, row.Revision, row.FoodId,
        row.DictionaryRevision, row.FallbackKey, row.ShoppingName, row.GrocerySection, row.ProtectedFields.ToArray(),
        row.CreatedAt, row.UpdatedAt, row.DocumentRevision is null && row.DocumentSha256 is null ? null
            : new(row.DocumentRevision ?? "", row.DocumentSha256 ?? ""), row.PresentationSequence);
}
public sealed record HouseholdFoodOverrideFeed(int Version, Guid HouseholdId, HouseholdFoodOverrideSnapshot[] Overrides);

internal static class HouseholdFoodOverrideValidation
{
    internal static void Validate(IReadOnlyList<HouseholdFoodOverrideSnapshot> rows, FoodVocabularyAuthority authority)
    {
        var ids = new HashSet<Guid>(); var foods = new HashSet<Guid>(); var fallbacks = new HashSet<string>(StringComparer.Ordinal);
        var sequences = new HashSet<string>(StringComparer.Ordinal);
        foreach (var row in rows)
        {
            FoodVocabularyDefinitions.Require(row.Id != Guid.Empty && ids.Add(row.Id) && !string.IsNullOrWhiteSpace(row.Revision)
                && row.CreatedAt != default && row.UpdatedAt >= row.CreatedAt && row.ProtectedFields is { Length: > 0 }
                && row.ProtectedFields.All(x => x is "shoppingName" or "grocerySection")
                && row.ProtectedFields.Distinct(StringComparer.Ordinal).Count() == row.ProtectedFields.Length
                && (row.ShoppingName is null || row.ShoppingName.Length <= 500 && row.ProtectedFields.Contains("shoppingName"))
                && (row.GrocerySection is null || GrocerySections.IsCanonicalName(row.GrocerySection) && row.ProtectedFields.Contains("grocerySection"))
                && System.Numerics.BigInteger.TryParse(row.PresentationSequence, out var sequence) && sequence > 0
                && sequence.ToString(System.Globalization.CultureInfo.InvariantCulture) == row.PresentationSequence && sequences.Add(row.PresentationSequence));
            if (row.FoodId is { } foodId)
            {
                FoodVocabularyDefinitions.Require(foodId != Guid.Empty && foods.Add(foodId) && row.FallbackKey is null && row.Document is not null
                    && !string.IsNullOrWhiteSpace(row.DictionaryRevision));
                var capture = authority.Find(row.Document!);
                var definition = FoodVocabularyDefinitions.ReadStrict<FoodVocabularyDocument>(System.Text.Encoding.UTF8.GetString(capture.RawBytes));
                FoodVocabularyDefinitions.Require(definition.Releases.Any(release => release.Revision == row.DictionaryRevision
                    && release.Foods.Any(food => food.Id == foodId && food.Status == "validated")));
            }
            else FoodVocabularyDefinitions.Require(!string.IsNullOrWhiteSpace(row.FallbackKey) && fallbacks.Add(row.FallbackKey)
                && row.DictionaryRevision is null && row.Document is null);
        }
    }
}
