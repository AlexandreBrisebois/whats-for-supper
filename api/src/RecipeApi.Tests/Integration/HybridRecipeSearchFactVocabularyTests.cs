using RecipeApi.Tests.Integration.Fixtures;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>Fast guardrails for Task 1's documented factual baseline.</summary>
public class HybridRecipeSearchFactVocabularyTests
{
    [Fact]
    public void FactVocabulary_UsesExactIngredientsAndKnownDurations()
    {
        Assert.Equal("2026.09.15.1", HybridRecipeSearchBaselineFixture.Version);
        Assert.Equal(["chicken", "salmon"], HybridRecipeSearchBaselineFixture.NormalizeIncludedIngredients("[\"  Salmon \", {\"name\":\"CHICKEN\",\"amount\":\"500 g\"}]") );
        Assert.Empty(HybridRecipeSearchBaselineFixture.NormalizeIncludedIngredients("[{\"amount\":\"500 g\"}]"));
        Assert.Equal(90, HybridRecipeSearchBaselineFixture.ParseTotalTimeMinutes("PT1H30M"));
        Assert.Equal(65, HybridRecipeSearchBaselineFixture.ParseTotalTimeMinutes("PT1H5M"));
        Assert.Equal(30, HybridRecipeSearchBaselineFixture.ParseTotalTimeMinutes("30 mins"));
        Assert.Null(HybridRecipeSearchBaselineFixture.ParseTotalTimeMinutes("unknown"));
        Assert.Null(HybridRecipeSearchBaselineFixture.ParseTotalTimeMinutes("1 hour 30 minutes"));
    }

    [Fact]
    public void RawMetadataTags_AreNotATrustworthySource()
    {
        Assert.NotNull(HybridRecipeSearchBaselineFixture.Recipes.Single(recipe => recipe.RawMetadata is not null).RawMetadata);
        Assert.All(HybridRecipeSearchBaselineFixture.Recipes, recipe => Assert.DoesNotContain("tags", recipe.RawMetadata ?? "", StringComparison.OrdinalIgnoreCase));
    }
}
