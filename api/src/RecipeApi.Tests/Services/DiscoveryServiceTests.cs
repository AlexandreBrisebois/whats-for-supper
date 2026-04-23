using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class DiscoveryServiceTests
{
    [Fact]
    public async Task GetRecipesForDiscoveryAsync_Returns_Only_Unvoted_Recipes()
    {
        // Arrange
        await using var ctx = TestDbContextFactory.Create();
        var service = new DiscoveryService(ctx);
        var memberId = Guid.NewGuid();

        var recipe1 = new Recipe { Id = Guid.NewGuid(), IsDiscoverable = true, Category = "Italian" };
        var recipe2 = new Recipe { Id = Guid.NewGuid(), IsDiscoverable = true, Category = "Italian" };
        
        ctx.DiscoveryRecipes.AddRange(
            new DiscoveryRecipe { Id = recipe1.Id, Category = "Italian" },
            new DiscoveryRecipe { Id = recipe2.Id, Category = "Italian" }
        );

        ctx.RecipeVotes.Add(new RecipeVote { RecipeId = recipe1.Id, FamilyMemberId = memberId, Vote = VoteType.Like });
        await ctx.SaveChangesAsync();

        // Act
        var results = await service.GetRecipesForDiscoveryAsync(memberId);

        // Assert
        Assert.Single(results);
        Assert.Equal(recipe2.Id, results[0].Id);
    }

    [Fact]
    public async Task GetRecipesForDiscoveryAsync_Returns_Only_Discoverable_Recipes()
    {
        // Arrange
        await using var ctx = TestDbContextFactory.Create();
        var service = new DiscoveryService(ctx);
        var memberId = Guid.NewGuid();

        var recipe1 = new Recipe { Id = Guid.NewGuid(), IsDiscoverable = true };
        var recipe2 = new Recipe { Id = Guid.NewGuid(), IsDiscoverable = false };
        
        ctx.DiscoveryRecipes.Add(new DiscoveryRecipe { Id = recipe1.Id });
        // recipe2 is not discoverable, so it wouldn't be in the view anyway
        
        await ctx.SaveChangesAsync();

        // Act
        var results = await service.GetRecipesForDiscoveryAsync(memberId);

        // Assert
        Assert.Single(results);
        Assert.Equal(recipe1.Id, results[0].Id);
    }

    [Fact]
    public async Task IsMatchAsync_Returns_True_When_50Percent_Or_More_Like()
    {
        // Arrange
        await using var ctx = TestDbContextFactory.Create();
        var service = new DiscoveryService(ctx);
        var recipeId = Guid.NewGuid();

        var member1 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 1" };
        var member2 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 2" };
        ctx.FamilyMembers.AddRange(member1, member2);
        ctx.Recipes.Add(new Recipe { Id = recipeId, IsDiscoverable = true });

        ctx.RecipeVotes.Add(new RecipeVote { RecipeId = recipeId, FamilyMemberId = member1.Id, Vote = VoteType.Like });
        
        // Seed the view-backed DbSet since In-Memory DB doesn't support views
        ctx.RecipeMatches.Add(new RecipeMatch { RecipeId = recipeId, LikeCount = 1 });
        
        await ctx.SaveChangesAsync();

        // Act
        var isMatch = await service.IsMatchAsync(recipeId);

        // Assert
        Assert.True(isMatch); // 1 out of 2 is 50%
    }

    [Fact]
    public async Task IsMatchAsync_Returns_False_When_Less_Than_50Percent_Like()
    {
        // Arrange
        await using var ctx = TestDbContextFactory.Create();
        var service = new DiscoveryService(ctx);
        var recipeId = Guid.NewGuid();

        var member1 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 1" };
        var member2 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 2" };
        var member3 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 3" };
        ctx.FamilyMembers.AddRange(member1, member2, member3);
        ctx.Recipes.Add(new Recipe { Id = recipeId, IsDiscoverable = true });

        ctx.RecipeVotes.Add(new RecipeVote { RecipeId = recipeId, FamilyMemberId = member1.Id, Vote = VoteType.Like });
        
        // Ensure RecipeMatches is empty for this recipe (which is the default, but being explicit here if needed)
        // In-Memory DB won't have it unless we add it.

        await ctx.SaveChangesAsync();

        // Act
        var isMatch = await service.IsMatchAsync(recipeId);

        // Assert
        Assert.False(isMatch); // 1 out of 3 is 33%
    }

    [Theory]
    [InlineData(4, 19, "Easy")]
    [InlineData(5, 19, "Medium")]
    [InlineData(4, 20, "Medium")]
    [InlineData(13, 10, "Hard")]
    [InlineData(10, 46, "Hard")]
    [InlineData(10, 30, "Medium")]
    public void InferDifficulty_Returns_Correct_Level(int ingredients, int time, string expected)
    {
        // Arrange
        var service = new DiscoveryService(null!); // Context not needed for this logic

        // Act
        var result = service.InferDifficulty(ingredients, time);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task GetAvailableCategoriesAsync_Returns_Categories_With_Unvoted_Recipes()
    {
        // Arrange
        await using var ctx = TestDbContextFactory.Create();
        var service = new DiscoveryService(ctx);
        var memberId = Guid.NewGuid();

        var recipe1 = new Recipe { Id = Guid.NewGuid(), IsDiscoverable = true, Category = "Italian" };
        var recipe2 = new Recipe { Id = Guid.NewGuid(), IsDiscoverable = true, Category = "French" };
        var recipe3 = new Recipe { Id = Guid.NewGuid(), IsDiscoverable = true, Category = "Mexican" };
        
        ctx.DiscoveryRecipes.AddRange(
            new DiscoveryRecipe { Id = recipe1.Id, Category = "Italian" },
            new DiscoveryRecipe { Id = recipe2.Id, Category = "French" },
            new DiscoveryRecipe { Id = recipe3.Id, Category = "Mexican" }
        );

        // Member voted on Italian
        ctx.RecipeVotes.Add(new RecipeVote { RecipeId = recipe1.Id, FamilyMemberId = memberId, Vote = VoteType.Like });
        await ctx.SaveChangesAsync();

        // Act
        var categories = await service.GetAvailableCategoriesAsync(memberId);

        // Assert
        Assert.Equal(2, categories.Count);
        Assert.Contains("French", categories);
        Assert.Contains("Mexican", categories);
        Assert.DoesNotContain("Italian", categories);
    }

    [Fact]
    public async Task GetRecipesForDiscoveryAsync_Orders_By_VoteCount_And_LastCookedDate()
    {
        // Arrange
        await using var ctx = TestDbContextFactory.Create();
        var service = new DiscoveryService(ctx);
        var memberId = Guid.NewGuid();

        var now = DateTimeOffset.UtcNow;
        var recipe1 = new Recipe { Id = Guid.NewGuid(), IsDiscoverable = true, LastCookedDate = now.AddDays(-1) }; // Less votes, older
        var recipe2 = new Recipe { Id = Guid.NewGuid(), IsDiscoverable = true, LastCookedDate = now };          // Less votes, newer
        var recipe3 = new Recipe { Id = Guid.NewGuid(), IsDiscoverable = true, LastCookedDate = now.AddDays(-2) }; // More votes
        var recipe4 = new Recipe { Id = Guid.NewGuid(), IsDiscoverable = true, LastCookedDate = null };        // Never cooked

        ctx.DiscoveryRecipes.AddRange(
            new DiscoveryRecipe { Id = recipe1.Id, LastCookedDate = recipe1.LastCookedDate, VoteCount = 0 },
            new DiscoveryRecipe { Id = recipe2.Id, LastCookedDate = recipe2.LastCookedDate, VoteCount = 0 },
            new DiscoveryRecipe { Id = recipe3.Id, LastCookedDate = recipe3.LastCookedDate, VoteCount = 1 },
            new DiscoveryRecipe { Id = recipe4.Id, LastCookedDate = recipe4.LastCookedDate, VoteCount = 0 }
        );

        // Add votes: recipe3 has 1 vote, others have 0
        ctx.RecipeVotes.Add(new RecipeVote { RecipeId = recipe3.Id, FamilyMemberId = Guid.NewGuid(), Vote = VoteType.Like });

        await ctx.SaveChangesAsync();

        // Act
        var results = await service.GetRecipesForDiscoveryAsync(memberId);

        // Assert
        Assert.Equal(4, results.Count);
        Assert.Equal(recipe3.Id, results[0].Id); // Top due to vote count
        Assert.Equal(recipe4.Id, results[1].Id); // Never cooked (NULL) comes first among same vote count
        Assert.Equal(recipe2.Id, results[2].Id); // Next due to newer LastCookedDate
        Assert.Equal(recipe1.Id, results[3].Id); // Last
    }
}
