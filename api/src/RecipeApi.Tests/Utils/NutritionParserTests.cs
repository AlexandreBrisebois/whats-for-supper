using RecipeApi.Models;
using RecipeApi.Utils;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Utils;

public class NutritionParserTests
{
    [Fact]
    public void ParseMilligrams_ValidValue_ReturnsDouble()
    {
        // Act
        var result = NutritionParser.ParseMilligrams("370 mg");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(370.0, result.Value);
    }

    [Fact]
    public void ParseGrams_ValidValue_ReturnsDouble()
    {
        // Act
        var result = NutritionParser.ParseGrams("9 g");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(9.0, result.Value);
    }

    [Fact]
    public void ParseMilligrams_NullValue_ReturnsNull()
    {
        // Act
        var result = NutritionParser.ParseMilligrams(null);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void ParseGrams_NullValue_ReturnsNull()
    {
        // Act
        var result = NutritionParser.ParseGrams(null);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void ParseMilligrams_UnparseableValue_ReturnsNull()
    {
        // Act
        var result = NutritionParser.ParseMilligrams("unparseable");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void ParseGrams_UnparseableValue_ReturnsNull()
    {
        // Act
        var result = NutritionParser.ParseGrams("unparseable");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void ComputeFopFlags_SodiumAboveThreshold_HighInSodiumTrue()
    {
        // Arrange
        var nutrition = new NutritionInformation { SodiumContent = "400 mg" };

        // Act
        var result = NutritionParser.ComputeFopFlags(nutrition);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.HighInSodium);
    }

    [Fact]
    public void ComputeFopFlags_SodiumBelowThreshold_HighInSodiumFalse()
    {
        // Arrange
        var nutrition = new NutritionInformation { SodiumContent = "300 mg" };

        // Act
        var result = NutritionParser.ComputeFopFlags(nutrition);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.HighInSodium);
    }

    [Fact]
    public void ComputeFopFlags_SaturatedFatAboveThreshold_HighInSaturatedFatTrue()
    {
        // Arrange
        var nutrition = new NutritionInformation { SaturatedFatContent = "5 g" };

        // Act
        var result = NutritionParser.ComputeFopFlags(nutrition);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.HighInSaturatedFat);
    }

    [Fact]
    public void ComputeFopFlags_SugarsAboveThreshold_HighInSugarsTrue()
    {
        // Arrange
        var nutrition = new NutritionInformation { SugarContent = "20 g" };

        // Act
        var result = NutritionParser.ComputeFopFlags(nutrition);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.HighInSugars);
    }

    [Fact]
    public void ComputeFopFlags_AllNutrients_ReturnsNull()
    {
        // Arrange
        var nutrition = new NutritionInformation();

        // Act
        var result = NutritionParser.ComputeFopFlags(nutrition);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void ComputeFopFlags_NullNutrition_ReturnsNull()
    {
        // Act
        var result = NutritionParser.ComputeFopFlags(null);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public void ComputeFopFlags_SodiumPresentSaturatedFatNull_SodiumSetSaturatedFatFalse()
    {
        // Arrange
        var nutrition = new NutritionInformation { SodiumContent = "400 mg" };

        // Act
        var result = NutritionParser.ComputeFopFlags(nutrition);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.HighInSodium);
        Assert.False(result.HighInSaturatedFat);
        Assert.False(result.HighInSugars);
    }

    [Fact]
    public void FopThresholds_SaturatedFatG_EqualsExpectedValue()
    {
        // Assert
        Assert.Equal(4.0, FopThresholds.SaturatedFatG);
    }

    [Fact]
    public void FopThresholds_SugarsG_EqualsExpectedValue()
    {
        // Assert
        Assert.Equal(15.0, FopThresholds.SugarsG);
    }

    [Fact]
    public void FopThresholds_SodiumMg_EqualsExpectedValue()
    {
        // Assert
        Assert.Equal(345.0, FopThresholds.SodiumMg);
    }
}
