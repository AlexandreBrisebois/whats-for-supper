using RecipeApi.Dto;
using RecipeApi.Services;
using RecipeApi.Models;
using System.Text.Json;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class QuantityMathTests
{
    [Theory]
    [InlineData("١")]
    [InlineData("１")]
    [InlineData("1/٢")]
    [InlineData("1 ٢/3")]
    [InlineData("2–٣")]
    public void UnsupportedDigitScriptsRemainUnresolvedWithoutThrowing(string text)
        => Assert.Null(QuantityMath.Parse(text));

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
        => Assert.False(QuantityMath.IsCanonical(new("scalar", new(n!, d!))));

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
        Assert.Equal(zero, QuantityMath.Parse("0"));
        Assert.Null(QuantityMath.Parse("-0"));
    }

    [Theory]
    [InlineData("1/3", "1", "3")]
    [InlineData("⅓", "1", "3")]
    [InlineData("1 1/2", "3", "2")]
    [InlineData("0.25", "1", "4")]
    [InlineData("0,25", "1", "4")]
    public void ParseExactHumanScalars(string text, string n, string d)
    {
        Assert.Equal(new GroceryQuantity("scalar", new(n, d)), QuantityMath.Parse(text));
    }

    [Theory]
    [InlineData("1E-05", "1", "100000")]
    [InlineData("1e-3", "1", "1000")]
    [InlineData("2.5E+02", "250", "1")]
    [InlineData("1E+15", "1000000000000000", "1")]
    [InlineData("1.25e4", "12500", "1")]
    public void ParseRoundtripScientificNotationScalars(string text, string n, string d)
    {
        Assert.Equal(new GroceryQuantity("scalar", new(n, d)), QuantityMath.Parse(text));
    }

    [Fact]
    public void GroceryLineItemJsonConverterRoundtripsScientificNotationQuantities()
    {
        var value = 1e-5d;
        var roundtripText = value.ToString("R", System.Globalization.CultureInfo.InvariantCulture);
        Assert.Contains("E", roundtripText, StringComparison.OrdinalIgnoreCase);

        var dto = new GroceryLineItemDto("Vanilla extract", "vanilla extract", "Pantry", value, "L", [], true);
        var json = JsonSerializer.Serialize(dto);
        var deserialized = JsonSerializer.Deserialize<GroceryLineItemDto>(json)!;
        Assert.Equal(new GroceryQuantity("scalar", new("1", "100000")), deserialized.ExactQuantity);
        Assert.True(deserialized.QuantityComplete);

        var fromJsonNumber = JsonSerializer.Deserialize<GroceryLineItemDto>("{\"displayName\":\"Water\",\"quantity\":1e-3,\"quantityComplete\":true}")!;
        Assert.Equal(new GroceryQuantity("scalar", new("1", "1000")), fromJsonNumber.ExactQuantity);
    }

    [Theory]
    [InlineData("NaN")]
    [InlineData("-1")]
    [InlineData("1e1000")]
    [InlineData("1e-1000")]
    [InlineData("1/0")]
    [InlineData("1,000")]
    public void ExceptionalOrAmbiguousAmountsRemainUnresolved(string text)
        => Assert.Null(QuantityMath.Parse(text));

    [Fact]
    public void ExactScalingCalculatesTargetOverBasisWithoutRoundingDrift()
    {
        var original = QuantityMath.Parse("1/3");
        var scaled = QuantityMath.Scale(original, 5, 3);
        Assert.Equal(new GroceryQuantity("scalar", new("5", "9")), scaled);
        Assert.Equal(new GroceryQuantity("scalar", new("1", "3")), QuantityMath.Scale(original, 3, 3));
        Assert.Null(QuantityMath.Scale(original, 5, 0));
        Assert.Null(QuantityMath.Scale(original, -1, 3));
    }

    [Fact]
    public void RangeScalingScalesEndpointsIndependently()
    {
        var range = QuantityMath.Parse("2–3");
        Assert.Equal(new GroceryQuantity("range", Min: new("2", "1"), Max: new("3", "1")), range);
        var scaled = QuantityMath.Scale(range, 6, 4);
        Assert.Equal(new GroceryQuantity("range", Min: new("3", "1"), Max: new("9", "2")), scaled);
    }

    [Fact]
    public void AddCombinesScalarsAndRanges()
    {
        var a = QuantityMath.Parse("1/3");
        var b = QuantityMath.Parse("1/6");
        Assert.Equal(QuantityMath.Parse("1/2"), QuantityMath.Add(a, b));

        var r = QuantityMath.Parse("1–2");
        Assert.Equal(QuantityMath.Parse("4/3–7/3"), QuantityMath.Add(a, r));
    }

    [Fact]
    public void MultiplyScalesByRationalFactor()
    {
        var value = QuantityMath.Parse("2/3");
        Assert.Equal(QuantityMath.Parse("1/3"), QuantityMath.Multiply(value, new GroceryRational("1", "2")));
    }

    [Fact]
    public void SubtractScalarSubtractsExactRational()
    {
        var total = QuantityMath.Parse("1");
        var part = QuantityMath.Parse("1/3");
        Assert.Equal(QuantityMath.Parse("2/3"), QuantityMath.SubtractScalar(total, part));
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

    [Fact]
    public void ProjectionRetainsStructuredSupplyTokenAndQualifiedUnitAliasesThroughQuantityMath()
    {
        var structuredOnly = new Recipe
        {
            Ingredients = "[\"flour\"]",
            Servings = 2,
            RawMetadata = "{\"recipeIngredient\":[\"flour\"],\"supply\":[{\"name\":\"flour\",\"quantity\":200,\"unitText\":\"g\"}]}",
        };
        var scaledStructured = SupperIngredientProjection.Read(structuredOnly, 6).Single();
        Assert.Equal("retained_numeric_token", scaledStructured.GroceryObservation.Evidence);
        Assert.Equal(new GroceryQuantity("scalar", new("600", "1")), scaledStructured.GroceryObservation.Quantity);

        var qualified = new Recipe
        {
            Ingredients = "[\"1/3 cups finely chopped Water\"]",
            Servings = 3,
            RawMetadata = "{\"recipeIngredient\":[\"1/3 cups finely chopped Water\"],\"supply\":[{\"name\":\"Water\",\"quantity\":0.3333333333333333,\"unitText\":\"cup\"}]}",
        };
        var scaledQualified = SupperIngredientProjection.Read(qualified, 6).Single();
        Assert.Equal("current_ingredient_text", scaledQualified.GroceryObservation.Evidence);
        Assert.Equal(new GroceryQuantity("scalar", new("2", "3")), scaledQualified.GroceryObservation.Quantity);
    }
}
