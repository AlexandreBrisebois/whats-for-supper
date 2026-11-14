using RecipeApi.Dto;
using RecipeApi.Services;
using RecipeApi.Models;
using System.Text.Json;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class LegacyGroceryQuantityTests
{
    [Theory]
    [InlineData("١")]
    [InlineData("１")]
    [InlineData("1/٢")]
    [InlineData("1 ٢/3")]
    [InlineData("2–٣")]
    public void UnsupportedDigitScriptsRemainUnresolvedWithoutThrowing(string text)
        => Assert.Null(LegacyGroceryQuantity.Parse(text));

    [Theory]
    [InlineData("١", "1")]
    [InlineData("1", "٢")]
    [InlineData("01", "1")]
    [InlineData("1", "01")]
    [InlineData("1\n", "1")]
    [InlineData("1", "0")]
    [InlineData("2", "4")]
    [InlineData(null, "1")]
    [InlineData("1", null)]
    [InlineData("100000000000000000000000000000000000000", "1")]
    public void PersistedRationalValidationRejectsMalformedOperandsWithoutThrowing(string? n, string? d)
        => Assert.False(LegacyGroceryQuantity.IsCanonical(new("scalar", new(n!, d!))));

    [Theory]
    [InlineData("{\"kind\":\"scalar\",\"value\":{\"n\":\"1\",\"d\":\"0\"}}")]
    [InlineData("{\"kind\":\"scalar\",\"value\":{\"n\":\"2\",\"d\":\"4\"}}")]
    [InlineData("{\"kind\":\"range\",\"min\":{\"n\":\"3\",\"d\":\"1\"},\"max\":{\"n\":\"2\",\"d\":\"1\"}}")]
    public void CorruptPersistedExactQuantitiesAreNotReadAsCurrentFacts(string quantity)
        => Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<GroceryLineItemDto>("{\"displayName\":\"Water\",\"quantity\":" + quantity + "}"));

    [Fact]
    public void LegacySignedZeroRemainsZeroWithoutRelaxingHumanNegativeInputGrammar()
    {
        var zero = new GroceryQuantity("scalar", new("0", "1"));
        Assert.Equal(zero, LegacyGroceryQuantity.Read("Water", "Water", "ml", "-0.0").Quantity);
        Assert.Equal(zero, LegacyGroceryQuantity.Read("Water", "Water", "ml", null, -0d).Quantity);
        Assert.Null(LegacyGroceryQuantity.Parse("-0"));
    }
    [Fact]
    public void ProjectionSuppliesExactEvidenceOnlyForCurrentUniqueBindings()
    {
        var recipe = new Recipe
        {
            Ingredients = "[\"1/3 cup Water\"]", Servings = 3,
            RawMetadata = "{\"recipeIngredient\":[\"1/3 cup Water\"],\"supply\":[{\"name\":\"Water\",\"quantity\":0.3333333333333333,\"unitText\":\"cup\"}]}",
        };
        var projected = SupperIngredientProjection.Read(recipe, 5).Single();
        Assert.Equal(new GroceryQuantity("scalar", new("5", "9")), projected.GroceryObservation.Quantity);
        recipe.Ingredients = "[\"1/4 cup Water\"]";
        Assert.Null(SupperIngredientProjection.Read(recipe, 5).Single().GroceryObservation.Quantity);
    }

    [Fact]
    public void DuplicateSupplyNamesNeverAcquirePositionalExactEvidence()
    {
        var recipe = new Recipe
        {
            Ingredients = "[\"1 cup Water\",\"2 cup Water\"]", Servings = 3,
            RawMetadata = "{\"recipeIngredient\":[\"1 cup Water\",\"2 cup Water\"],\"supply\":[{\"name\":\"Water\",\"quantity\":1,\"unitText\":\"cup\"},{\"name\":\"Water\",\"quantity\":2,\"unitText\":\"cup\"}]}",
        };
        Assert.All(SupperIngredientProjection.Read(recipe, 5), line => Assert.Null(line.GroceryObservation.Quantity));
    }

    [Theory]
    [InlineData("0.1", "1", "10")]
    [InlineData("0.3333333333333333", "3333333333333333", "10000000000000000")]
    [InlineData("1e-3", "1", "1000")]
    public void RetainedNumericTokensKeepTheirRecordedDecimalValue(string token, string n, string d)
    {
        var observed = LegacyGroceryQuantity.Read("Water", "Water", "ml", token);
        Assert.Equal("retained_numeric_token", observed.Evidence);
        Assert.Equal(new GroceryQuantity("scalar", new(n, d)), observed.Quantity);
    }

    [Fact]
    public void DoubleOnlyCompatibilityKeepsRoundTripDecimalWithoutInventingOneThird()
    {
        var observed = LegacyGroceryQuantity.Read("Water", "Water", "ml", null, 1d / 3);
        Assert.Equal("legacy_roundtrip", observed.Evidence);
        Assert.Equal(new GroceryQuantity("scalar", new("3333333333333333", "10000000000000000")), observed.Quantity);
    }

    [Theory]
    [InlineData("1/3 cup Water", "1", "3")]
    [InlineData("⅓ cup Water", "1", "3")]
    [InlineData("1 1/2 cup Water", "3", "2")]
    [InlineData("0,25 cup Water", "1", "4")]
    public void CurrentUniquelyBoundIngredientEvidenceIsExact(string text, string n, string d)
    {
        var observed = LegacyGroceryQuantity.Read(text, "Water", "cup", "0.3333333333333333");
        Assert.Equal("current_ingredient_text", observed.Evidence);
        Assert.Equal(new GroceryQuantity("scalar", new(n, d)), observed.Quantity);
    }

    [Theory]
    [InlineData("1/3 cups finely chopped Water")]
    [InlineData("1/3 cup Water, finely chopped")]
    [InlineData("⅓ tasse Water")]
    [InlineData("⅓ cups Water")]
    public void DeclaredUnitAndUniqueCurrentBindingAllowQualifiersWithoutGuessingAFraction(string current)
        => Assert.Equal(new GroceryQuantity("scalar", new("1", "3")), LegacyGroceryQuantity.Read(current, "Water", "cup", "0.3333333333333333").Quantity);

    [Theory]
    [InlineData("1/3 tbsp Water", "cup")]
    [InlineData("1/3 cup Water, plus 2 cups", "cup")]
    [InlineData("Bake Water for 20 minutes", "cup")]
    [InlineData("1/3 cup of unrelated Water substitute", "cup")]
    public void ConflictingOrUnsupportedSourceWordingKeepsRecordedDecimal(string current, string unit)
    {
        var observed = LegacyGroceryQuantity.Read(current, "Water", unit, "0.33");
        Assert.Equal("retained_numeric_token", observed.Evidence);
        Assert.Equal(new GroceryQuantity("scalar", new("33", "100")), observed.Quantity);
    }

    [Fact]
    public void CurrentRangeIsNotReducedToLegacyMidpointAndScalesFromOriginalEndpoints()
    {
        var observed = LegacyGroceryQuantity.Read("2–3 ml Water", "Water", "ml", "2.5", basis: 4, target: 6);
        Assert.Equal(new GroceryQuantity("range", Min: new("3", "1"), Max: new("9", "2")), observed.Quantity);
    }

    [Fact]
    public void NumbersInDescriptionAreNotParsedAsAmounts()
    {
        Assert.Null(LegacyGroceryQuantity.Read("Bake Water for 20 minutes", "Water", null, null).Quantity);
        Assert.Null(LegacyGroceryQuantity.Read("2 jars of Water", "Water", "ml", null).Quantity);
    }

    [Theory]
    [InlineData("NaN")]
    [InlineData("-1")]
    [InlineData("1e1000")]
    [InlineData("1e-1000")]
    [InlineData("1/0")]
    [InlineData("1,000")]
    public void ExceptionalOrAmbiguousAmountsRemainUnresolved(string text)
        => Assert.Null(LegacyGroceryQuantity.Parse(text));

    [Fact]
    public void ExactScalingDoesNotCreateAChainedRoundingDrift()
    {
        var projected = LegacyGroceryQuantity.Read("1/3 cup Water", "Water", "cup", null, basis: 3, target: 5);
        Assert.Equal(new GroceryQuantity("scalar", new("5", "9")), projected.Quantity);
        Assert.Equal(new GroceryQuantity("scalar", new("1", "3")), LegacyGroceryQuantity.Read("1/3 cup Water", "Water", "cup", null, basis: 3, target: 3).Quantity);
        Assert.Null(LegacyGroceryQuantity.Read("1/3 cup Water", "Water", "cup", null, target: 5).Quantity);
    }
}
