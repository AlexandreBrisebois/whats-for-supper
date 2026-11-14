using System.Diagnostics.CodeAnalysis;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

// Internal recovery wire facts, not catalogue adoption or public mapping APIs.
// Definitions are carried in the archive; reads never fetch or infer them.
public sealed record CurrentRecoveryUnitAlias(string Locale, string Text);
public sealed record CurrentRecoveryUnit(string Id, string Family, GroceryRational Factor, string? CountKind,
    CurrentRecoveryUnitAlias[] Aliases);
public sealed record CurrentRecoveryFoodLabels(string? En, string? Fr);
public sealed record CurrentRecoveryFoodAlias(string Locale, string Text, string MatchKey, string Relation,
    string SourceRef, DateTimeOffset ReviewedAt);
public sealed record CurrentRecoveryFood(Guid Id, string Revision, CurrentRecoveryFoodLabels Labels,
    Dictionary<string, string> Qualifiers, string Status, CurrentRecoveryFoodAlias[] Aliases);
public sealed record CurrentRecoveryDictionaryRelease(string Revision, string SourceRef, CurrentRecoveryFood[] Foods);
public sealed record CurrentRecoveryFoodMapping(Guid RecipeId, Guid IngredientLineId, string ContentRevision,
    Guid FoodId, string FoodRevision, string DictionaryRevision, string MappingRevision, string Origin,
    string? SourceRef, string? EvidenceSourceRevision, string[] ProtectedFields);
public sealed record CurrentRecoveryDictionary(int Version, CurrentRecoveryUnit[] Units,
    CurrentRecoveryDictionaryRelease[] Releases, CurrentRecoveryFoodMapping[] Mappings);
public sealed record CurrentRecoveryFoodOverride(Guid Id, string Revision, Guid? FoodId, string? DictionaryRevision,
    string? FallbackKey, string? ShoppingName, string? GrocerySection, string[] ProtectedFields,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record CurrentRecoveryFoodOverrides(int Version, Guid HouseholdId, CurrentRecoveryFoodOverride[] Overrides);

public sealed partial class CurrentRecoveryHouseholdState
{
    public CurrentRecoveryDictionary ReadDictionary() => Read<CurrentRecoveryDictionary>("food-dictionary");
    public CurrentRecoveryFoodOverrides ReadFoodOverrides() => Read<CurrentRecoveryFoodOverrides>("household-food-overrides");

    private void ValidateDictionaryState(CurrentRecoveryManifest manifest, CurrentRecoveryRecipes recipes,
        List<CurrentRecoveryDiagnostic> errors, CancellationToken ct)
    {
        static void Require([DoesNotReturnIf(false)] bool valid) { if (!valid) throw new InvalidDataException(); }
        static bool Text(string? text) => !string.IsNullOrWhiteSpace(text);
        static string Key(string text) => Regex.Replace(text.Normalize(NormalizationForm.FormC).Trim().ToLowerInvariant(), @"\s+", " ");
        static bool Locale(string? locale) => locale is "en" or "fr";
        void Rows<T, TKey>(T[]? rows, Func<T, TKey> key, Action<T> validate) where T : class where TKey : notnull
        {
            Require(rows is not null);
            var keys = new HashSet<TKey>();
            foreach (var row in rows) { ct.ThrowIfCancellationRequested(); Require(row is not null); Require(keys.Add(key(row))); validate(row); }
        }
        CurrentRecoveryDictionary? dictionary = null;
        var units = new Dictionary<string, CurrentRecoveryUnit>(StringComparer.Ordinal);
        var foods = new Dictionary<(string Release, Guid Id), CurrentRecoveryFood>();
        void UnitAlias(CurrentRecoveryUnit definition, string text)
        {
            // The existing owner supplies only already supported equivalences.
            // Unknown aliases stay declared facts, never guessed conversions.
            var known = GroceryUnit.Read(text);
            var family = known.Bucket switch { "g" => "mass", "ml" => "volume", "cup" => "cup", "tsp" => "tsp", "tbsp" => "tbsp", _ => null };
            if (family is not null)
                Require(definition.Family == family && LegacyGroceryQuantity.Parse($"{known.Numerator}/{known.Denominator}")
                    == new GroceryQuantity("scalar", definition.Factor));
        }
        try
        {
            var value = ReadDictionary();
            Require(value.Version == 1);
            var unitAliases = new HashSet<(string Locale, string Text)>();
            Rows(value.Units, x => x.Id, x =>
            {
                ct.ThrowIfCancellationRequested();
                Require(Text(x.Id) && x.Family is "mass" or "volume" or "count" or "cup" or "tsp" or "tbsp"
                    && x.Factor is not null && x.Factor.N != "0" && LegacyGroceryQuantity.IsCanonical(new("scalar", x.Factor))
                    && (x.Family == "count" ? Text(x.CountKind) : x.CountKind is null));
                // No culinary-to-metric, cross-family or generic count factors.
                if (x.Family is "cup" or "tsp" or "tbsp" or "count") Require(x.Factor == new GroceryRational("1", "1"));
                Rows(x.Aliases, a => (a.Locale, a.Text), a =>
                {
                    Require(Locale(a.Locale) && Text(a.Text) && unitAliases.Add((a.Locale, Key(a.Text))));
                    UnitAlias(x, a.Text);
                });
                Require(x.Aliases.Length > 0);
                units.Add(x.Id, x);
            });
            var revisions = new Dictionary<(Guid Id, string Revision), string>();
            var qualifiers = new Dictionary<Guid, string>();
            Rows(value.Releases, x => x.Revision, release =>
            {
                ct.ThrowIfCancellationRequested();
                Require(Text(release.Revision) && Text(release.SourceRef));
                var exactAliases = new Dictionary<(string Locale, string Key), Guid>();
                Rows(release.Foods, x => x.Id, food =>
                {
                    Require(food.Id != Guid.Empty && Text(food.Revision) && food.Labels is not null
                        && (food.Labels.En is null || Text(food.Labels.En)) && (food.Labels.Fr is null || Text(food.Labels.Fr))
                        && food.Status is "validated" or "unresolved" or "retired" && food.Qualifiers is not null
                        && food.Qualifiers.All(x => Text(x.Key) && Text(x.Value)));
                    if (food.Status == "validated") Require(food.Labels.En is not null || food.Labels.Fr is not null);
                    var purchase = JsonSerializer.Serialize(food.Qualifiers.OrderBy(x => x.Key, StringComparer.Ordinal));
                    if (qualifiers.TryGetValue(food.Id, out var priorPurchase)) Require(priorPurchase == purchase);
                    else qualifiers.Add(food.Id, purchase);
                    Rows(food.Aliases, a => (a.Locale, a.MatchKey), a =>
                    {
                        Require(Locale(a.Locale) && Text(a.Text) && Text(a.MatchKey) && a.Relation == "exact"
                            && Text(a.SourceRef) && a.ReviewedAt != default);
                        // Conflicting active exact aliases cannot certify equivalence.
                        // Unresolved food facts remain retained without becoming mappings.
                        if (food.Status == "validated")
                        {
                            var key = (a.Locale, a.MatchKey);
                            Require(!exactAliases.TryGetValue(key, out var prior) || prior == food.Id);
                            exactAliases[key] = food.Id;
                        }
                    });
                    var serialized = CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(food, Json));
                    if (revisions.TryGetValue((food.Id, food.Revision), out var priorContent)) Require(priorContent == serialized);
                    else revisions.Add((food.Id, food.Revision), serialized);
                    foods.Add((release.Revision, food.Id), food);
                });
            });
            var mappings = new Dictionary<(Guid Recipe, Guid Line), CurrentRecoveryFoodMapping>();
            var sourceRecipes = manifest.Recipes.ToDictionary(x => x.RecipeId);
            Rows(value.Mappings, x => (x.RecipeId, x.IngredientLineId), mapping =>
            {
                ct.ThrowIfCancellationRequested();
                Require(sourceRecipes.TryGetValue(mapping.RecipeId, out var recipe) && mapping.IngredientLineId != Guid.Empty
                    && Text(mapping.ContentRevision) && Text(mapping.MappingRevision) && Text(mapping.FoodRevision)
                    && Text(mapping.DictionaryRevision) && foods.TryGetValue((mapping.DictionaryRevision, mapping.FoodId), out var food)
                    && food.Status == "validated" && food.Revision == mapping.FoodRevision
                    && mapping.Origin is "human" or "source" or "legacy_unknown" or "unknown"
                    && mapping.ProtectedFields is not null && mapping.ProtectedFields.All(x => x == "shopping")
                    && mapping.ProtectedFields.Distinct().Count() == mapping.ProtectedFields.Length
                    && (mapping.SourceRef is null) == (mapping.EvidenceSourceRevision is null));
                if (mapping.SourceRef is not null)
                    Require(recipe.Sources.Any(x => x.SourceRef == mapping.SourceRef && x.SourceRevision == mapping.EvidenceSourceRevision));
                if (mapping.Origin == "source") Require(mapping.SourceRef is not null);
                mappings.Add((mapping.RecipeId, mapping.IngredientLineId), mapping);
            });
            foreach (var id in recipes.RecipeIds)
            {
                ct.ThrowIfCancellationRequested();
                var content = recipes.ReadContent(id).Content;
                foreach (var line in content.IngredientLines)
                {
                    void CheckUnit(RecipeUnitDto? unit)
                    {
                        if (unit?.DefinitionId is not { } definitionId) return;
                        Require(units.TryGetValue(definitionId, out var definition));
                        Require(definition.Aliases.Any(a => Key(a.Text) == Key(unit.Text)));
                        UnitAlias(definition, unit.Text);
                    }
                    CheckUnit(line.Unit); CheckUnit(line.Package?.CountUnit); CheckUnit(line.Package?.Capacity.Unit);
                    var mapped = mappings.Remove((id, line.Id), out var mapping);
                    Require((line.Shopping.FoodId is not null) == mapped);
                    if (mapped)
                        Require(mapping!.FoodId == line.Shopping.FoodId && mapping.MappingRevision == line.Shopping.MappingRevision
                            && mapping.ContentRevision == content.ContentRevision
                            && mapping.ProtectedFields.Contains("shopping") == line.Provenance.ProtectedFields.Contains("shopping"));
                }
            }
            Require(mappings.Count == 0);
            dictionary = value;
        }
        catch (Exception ex) when (ex is JsonException or InvalidDataException or ArgumentException or OverflowException)
        { errors.Add(new(_paths["food-dictionary"], "invalid-current-food-dictionary")); }

        try
        {
            var value = ReadFoodOverrides();
            Require(value.Version == 1 && value.HouseholdId == manifest.HouseholdId);
            var targets = new HashSet<(Guid? Food, string? Fallback)>();
            Rows(value.Overrides, x => x.Id, x =>
            {
                ct.ThrowIfCancellationRequested();
                Require(x.Id != Guid.Empty && Text(x.Revision) && x.CreatedAt != default && x.UpdatedAt >= x.CreatedAt
                    && x.FoodId != Guid.Empty && (x.FoodId is not null ? x.FallbackKey is null && Text(x.DictionaryRevision)
                        : Text(x.FallbackKey) && x.DictionaryRevision is null)
                    && targets.Add((x.FoodId, x.FallbackKey)) && x.ProtectedFields is not null
                    && x.ProtectedFields.Length > 0 && x.ProtectedFields.All(f => f is "shoppingName" or "grocerySection")
                    && x.ProtectedFields.Distinct().Count() == x.ProtectedFields.Length
                    && (x.ShoppingName is null || x.ShoppingName.Length <= 500)
                    && (x.GrocerySection is null || GrocerySections.IsCanonicalName(x.GrocerySection))
                    && (x.ShoppingName is null || x.ProtectedFields.Contains("shoppingName"))
                    && (x.GrocerySection is null || x.ProtectedFields.Contains("grocerySection")));
                // Null protected values and explicit empty names remain clears.
                // Private corrections never become dictionary aliases.
                if (dictionary is not null && x.FoodId is { } food)
                    Require(foods.ContainsKey((x.DictionaryRevision!, food)));
            });
        }
        catch (Exception ex) when (ex is JsonException or InvalidDataException or ArgumentException or OverflowException)
        { errors.Add(new(_paths["household-food-overrides"], "invalid-current-household-food-overrides")); }
    }
}
