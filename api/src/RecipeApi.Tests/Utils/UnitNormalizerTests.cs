using RecipeApi.Utils;
using Xunit;

namespace RecipeApi.Tests.Utils;

public class UnitNormalizerTests
{
    [Theory]
    [InlineData("g", "g", 1)]
    [InlineData("gram", "g", 1)]
    [InlineData("grams", "g", 1)]
    [InlineData("kg", "g", 1000)]
    [InlineData("kilogram", "g", 1000)]
    [InlineData("kilograms", "g", 1000)]
    [InlineData("mg", "g", 0.001)]
    [InlineData("milligram", "g", 0.001)]
    [InlineData("milligrams", "g", 0.001)]
    [InlineData("Kg", "g", 1000)]
    [InlineData("ml", "ml", 1)]
    [InlineData("milliliter", "ml", 1)]
    [InlineData("millilitre", "ml", 1)]
    [InlineData("l", "ml", 1000)]
    [InlineData("liter", "ml", 1000)]
    [InlineData("litre", "ml", 1000)]
    [InlineData("dl", "ml", 100)]
    [InlineData("deciliter", "ml", 100)]
    [InlineData("decilitre", "ml", 100)]
    [InlineData("tsp", "ml", 5)]
    [InlineData("teaspoon", "ml", 5)]
    [InlineData("teaspoons", "ml", 5)]
    [InlineData("cup", "ml", 240)]
    [InlineData("cups", "ml", 240)]
    [InlineData("tbsp", "ml", 15)]
    [InlineData("tablespoon", "ml", 15)]
    [InlineData("tablespoons", "ml", 15)]
    [InlineData("piece", "piece", 1)]
    [InlineData("pieces", "piece", 1)]
    [InlineData("whole", "piece", 1)]
    [InlineData("unit", "piece", 1)]
    [InlineData("units", "piece", 1)]
    [InlineData("clove", "piece", 1)]
    [InlineData("cloves", "piece", 1)]
    [InlineData("  cloves  ", "piece", 1)]
    public void Normalize_KnownUnit_ReturnsCorrectCanonicalAndFactor(
        string input,
        string expectedCanonical,
        double expectedFactor)
    {
        var result = UnitNormalizer.Normalize(input);
        Assert.NotNull(result);
        Assert.Equal(expectedCanonical, result.CanonicalUnit);
        Assert.Equal(expectedFactor, result.Factor, precision: 6);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Normalize_NullOrBlank_ReturnsPiece(string? input)
    {
        var result = UnitNormalizer.Normalize(input);
        Assert.NotNull(result);
        Assert.Equal("piece", result.CanonicalUnit);
        Assert.Equal(1, result.Factor);
    }

    [Theory]
    [InlineData("handful")]
    [InlineData("pinch")]
    [InlineData("head")]
    [InlineData("oz")]
    public void Normalize_UnknownUnit_ReturnsNull(string input)
    {
        Assert.Null(UnitNormalizer.Normalize(input));
    }
}
