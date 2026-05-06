using RecipeApi.Utils;
using Xunit;

namespace RecipeApi.Tests.Utils;

public class UnitNormalizerTests
{
    [Theory]
    [InlineData("g", "g", 1)]
    [InlineData("kg", "g", 1000)]
    [InlineData("mg", "g", 0.001)]
    [InlineData("Kg", "g", 1000)]
    [InlineData("ml", "ml", 1)]
    [InlineData("l", "ml", 1000)]
    [InlineData("dl", "ml", 100)]
    [InlineData("tsp", "ml", 5)]
    [InlineData("cup", "ml", 240)]
    [InlineData("tbsp", "ml", 15)]
    [InlineData("piece", "piece", 1)]
    [InlineData("whole", "piece", 1)]
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
    [InlineData("oz")]
    public void Normalize_UnknownUnit_ReturnsNull(string input)
    {
        Assert.Null(UnitNormalizer.Normalize(input));
    }
}
