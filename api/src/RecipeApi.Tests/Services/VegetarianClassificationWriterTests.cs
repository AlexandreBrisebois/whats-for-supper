using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class VegetarianClassificationWriterTests
{
    [Fact]
    public void ApplyFailure_PreservesConfirmedClassification()
    {
        var recipe = new Recipe
        {
            IsVegetarian = true,
            VegetarianClassificationVersion = 1,
            VegetarianClassifiedAt = DateTimeOffset.Parse("2026-09-20T12:00:00Z")
        };

        new VegetarianClassificationWriter().ApplyFailure(recipe, "LLM unavailable", DateTimeOffset.Parse("2026-09-24T12:00:00Z"));

        Assert.True(recipe.IsVegetarian);
        Assert.Equal(1, recipe.VegetarianClassificationVersion);
        Assert.Equal(DateTimeOffset.Parse("2026-09-20T12:00:00Z"), recipe.VegetarianClassifiedAt);
        Assert.NotNull(recipe.VegetarianClassificationFailedAt);
        Assert.Equal("LLM unavailable", recipe.VegetarianClassificationFailureReason);
    }

    [Fact]
    public void ApplySuccess_UpdatesFactAndClearsFailureDiagnostics()
    {
        var recipe = new Recipe
        {
            VegetarianClassificationFailedAt = DateTimeOffset.Parse("2026-09-24T11:00:00Z"),
            VegetarianClassificationFailureReason = "bad JSON"
        };

        new VegetarianClassificationWriter().ApplySuccess(recipe, false, 1, DateTimeOffset.Parse("2026-09-24T12:00:00Z"));

        Assert.False(recipe.IsVegetarian);
        Assert.Equal(1, recipe.VegetarianClassificationVersion);
        Assert.Null(recipe.VegetarianClassificationFailedAt);
        Assert.Null(recipe.VegetarianClassificationFailureReason);
    }
}
