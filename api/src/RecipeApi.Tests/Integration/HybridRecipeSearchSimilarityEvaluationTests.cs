using RecipeApi.Services;
using RecipeApi.Tests.Integration.Fixtures;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class HybridRecipeSearchSimilarityEvaluationTests
{
    [Fact]
    public void SimilarBaseline_UsesPairwiseAndTopNExpectationsAcrossRepresentativeRecipes()
    {
        var scorer = new RecipeSimilarityScorer();

        foreach (var fixtureCase in HybridRecipeSearchBaselineFixture.SimilarCases)
        {
            var source = HybridRecipeSearchBaselineFixture.Recipes.Single(recipe => recipe.Id == fixtureCase.SourceId);
            var ranked = HybridRecipeSearchBaselineFixture.Recipes
                .Where(recipe => recipe.Id != source.Id)
                .Select(recipe => new
                {
                    recipe.Id,
                    Score = scorer.Score(ToInput(source), ToInput(recipe),
                        source.SemanticGroup == recipe.SemanticGroup ? 1d : 0d).Total
                })
                .OrderByDescending(candidate => candidate.Score)
                .ThenBy(candidate => candidate.Id)
                .ToList();

            var preferred = ranked.Single(candidate => candidate.Id == fixtureCase.PreferredId);
            var lower = ranked.Single(candidate => candidate.Id == fixtureCase.LowerId);
            Assert.True(preferred.Score > lower.Score,
                $"Expected {fixtureCase.PreferredId} to outrank {fixtureCase.LowerId} for source {source.Id}.");
            Assert.Contains(fixtureCase.PreferredId, ranked.Take(fixtureCase.TopN).Select(candidate => candidate.Id));
        }
    }

    private static RecipeSimilarityInput ToInput(HybridRecipeSearchBaselineFixture.FixtureRecipe recipe) => new(
        recipe.IngredientsJson,
        recipe.Category,
        recipe.Cuisine,
        recipe.MealTypes,
        null,
        recipe.TotalTime);
}
