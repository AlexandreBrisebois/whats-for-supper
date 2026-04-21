using RecipeApi.Models;
using Xunit;

namespace RecipeApi.Tests.Models;

public class RecipeDiscoveryTests
{
    [Fact]
    public void Recipe_ShouldSupportDiscoveryFields()
    {
        // Arrange
        var recipe = new Recipe
        {
            IsDiscoverable = true,
            Category = "Pasta",
            Difficulty = "Easy"
        };

        // Assert
        Assert.True(recipe.IsDiscoverable);
        Assert.Equal("Pasta", recipe.Category);
        Assert.Equal("Easy", recipe.Difficulty);
    }

    [Fact]
    public void RecipeVote_ShouldSupportVotingFields()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var familyMemberId = Guid.NewGuid();
        var votedAt = DateTimeOffset.UtcNow;

        var vote = new RecipeVote
        {
            RecipeId = recipeId,
            FamilyMemberId = familyMemberId,
            Vote = VoteType.Like,
            VotedAt = votedAt
        };

        // Assert
        Assert.Equal(recipeId, vote.RecipeId);
        Assert.Equal(familyMemberId, vote.FamilyMemberId);
        Assert.Equal(VoteType.Like, vote.Vote);
        Assert.Equal(votedAt, vote.VotedAt);
    }
}
