using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class RecipeSimilarityScorerTests
{
    private readonly RecipeSimilarityScorer scorer = new();

    [Theory]
    [InlineData(-2d, 0d)]
    [InlineData(-1d, 0d)]
    [InlineData(0d, 0.5d)]
    [InlineData(1d, 1d)]
    [InlineData(2d, 1d)]
    public void Score_NormalizesSemanticCosineBoundaries(double rawSemanticCosine, double expectedSemantic)
    {
        var result = scorer.Score(Empty, Empty, rawSemanticCosine);

        Assert.Equal(expectedSemantic, result.Semantic);
        Assert.Equal(expectedSemantic * 0.40d, result.Total, 10);
    }

    [Fact]
    public void Score_PrefersIngredientAndCuisineAlignmentOverBroadSemanticSimilarity()
    {
        var source = Empty with { Ingredients = "[\"tomato\", \"basil\"]", CuisineType = "Italian" };
        var aligned = source with { Ingredients = "[\"BASIL\", \" tomato \"]" };
        var broadButWeak = Empty with { Ingredients = "[\"chicken\"]", CuisineType = "Thai" };

        var alignedResult = scorer.Score(source, aligned, 0.2d);
        var broadResult = scorer.Score(source, broadButWeak, 0.8d);

        Assert.Equal(1d, alignedResult.Ingredients);
        Assert.Equal(1d, alignedResult.Cuisine);
        Assert.True(alignedResult.Total > broadResult.Total);
    }

    [Fact]
    public void Score_DoesNotTreatCuisineAloneAsSufficientSimilarity()
    {
        var source = Empty with { CuisineType = "Italian" };
        var candidate = Empty with { CuisineType = " italian " };

        var result = scorer.Score(source, candidate, -1d);

        Assert.Equal(1d, result.Cuisine);
        Assert.Equal(0.10d, result.Total, 10);
    }

    [Fact]
    public void Score_DoesNotTreatVegetarianStatusAloneAsSufficientSimilarity()
    {
        var source = Empty with { IsVegetarian = true };
        var candidate = Empty with { IsVegetarian = true };

        var result = scorer.Score(source, candidate, -1d);

        Assert.Equal(1d, result.VegetarianCompatibility);
        Assert.Equal(0.05d, result.Total, 10);
    }

    [Fact]
    public void Score_UsesPreparationTimeAsASmallContributorySignal()
    {
        var source = Empty with { TotalTime = "PT20M" };
        var candidate = Empty with { TotalTime = "40 mins" };

        var result = scorer.Score(source, candidate, -1d);

        Assert.Equal(0.7d, result.PreparationTime);
        Assert.Equal(0.035d, result.Total, 10);
        Assert.True(result.Total < 0.05d);
    }

    [Fact]
    public void Score_AssignsNoPenaltyOrFalseSignalForMissingMetadata()
    {
        var result = scorer.Score(Empty, Empty, -1d);

        Assert.Equal(0d, result.Ingredients);
        Assert.Equal(0d, result.Cuisine);
        Assert.Equal(0d, result.Category);
        Assert.Equal(0d, result.MealTypes);
        Assert.Equal(0d, result.VegetarianCompatibility);
        Assert.Equal(0d, result.PreparationTime);
        Assert.Equal(0d, result.Total);
    }

    [Fact]
    public void Score_HandlesLegacyIngredientsButDoesNotMatchMalformedIngredientJson()
    {
        var legacySource = Empty with { Ingredients = "[{\"name\":\" Tomato \"}, {\"name\":\"Basil\"}, {\"name\":\"tomato\"}]" };
        var legacyCandidate = Empty with { Ingredients = "[\"basil\", \"TOMATO\"]" };
        var malformed = Empty with { Ingredients = "[{\"name\":\"tomato\"}" };

        Assert.Equal(1d, scorer.Score(legacySource, legacyCandidate, -1d).Ingredients);
        Assert.Equal(0d, scorer.Score(malformed, malformed, -1d).Ingredients);
    }

    [Fact]
    public void Score_RetainsSemanticContributionWhenFrenchAndEnglishIngredientStringsDoNotOverlap()
    {
        var source = Empty with { Ingredients = "[\"poulet\", \"oignon\"]" };
        var candidate = Empty with { Ingredients = "[\"chicken\", \"onion\"]" };

        var result = scorer.Score(source, candidate, 0.8d);

        Assert.Equal(0d, result.Ingredients);
        Assert.Equal(0.9d, result.Semantic);
        Assert.Equal(0.36d, result.Total, 10);
    }

    [Fact]
    public void Score_IsDeterministicForTotalsAndNamedComponents()
    {
        var source = new RecipeSimilarityInput("[\" tomato \", \"basil\"]", "Main", "Italian", ["Supper"], true, "PT20M");
        var candidate = new RecipeSimilarityInput("[\"BASIL\", \"tomato\"]", " main ", " italian ", ["supper", "weeknight"], true, "40 mins");

        var first = scorer.Score(source, candidate, 0.4d);
        var second = scorer.Score(source, candidate, 0.4d);

        Assert.Equal(first, second);
        Assert.Equal(0.7d, first.Semantic);
        Assert.Equal(1d, first.Ingredients);
        Assert.Equal(1d, first.Cuisine);
        Assert.Equal(1d, first.Category);
        Assert.Equal(0.5d, first.MealTypes);
        Assert.Equal(1d, first.VegetarianCompatibility);
        Assert.Equal(0.7d, first.PreparationTime);
        Assert.Equal(0.84d, first.Total, 10);
    }

    private static readonly RecipeSimilarityInput Empty = new(null, null, null, null, null, null);
}
