using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class DiscoveryService(RecipeDbContext dbContext)
{
    private readonly RecipeDbContext _dbContext = dbContext;

    public async Task<List<Recipe>> GetRecipesForDiscoveryAsync(Guid familyMemberId, string? category = null)
    {
        var query = _dbContext.DiscoveryRecipes.AsQueryable();

        if (!string.IsNullOrEmpty(category))
        {
            query = query.Where(r => r.Category == category);
        }

        // Exclude recipes already voted on by this user
        query = query.Where(r => !_dbContext.RecipeVotes.Any(v => v.RecipeId == r.Id
                                                                && v.FamilyMemberId == familyMemberId));

        // Apply ordering: VoteCount DESC, then within same vote count: never-cooked first,
        // then oldest last-cooked date first (ASC) — surfaces recipes that haven't been
        // on the table in a while, driving conversion toward high-momentum picks.
        query = query
            .OrderByDescending(r => r.VoteCount)
            .ThenBy(r => r.LastCookedDate == null ? 0 : 1)
            .ThenBy(r => r.LastCookedDate);

        var results = await query.ToListAsync();

        return results.Select(r => r.ToRecipe()).ToList();
    }

    public async Task<List<string>> GetAvailableCategoriesAsync(Guid familyMemberId)
    {
        return await _dbContext.DiscoveryRecipes
            .Where(r => !_dbContext.RecipeVotes.Any(v => v.RecipeId == r.Id && v.FamilyMemberId == familyMemberId))
            .Where(r => r.Category != null)
            .Select(r => r.Category!)
            .Distinct()
            .ToListAsync();
    }

    public async Task SubmitVoteAsync(Guid recipeId, Guid familyMemberId, VoteType vote)
    {
        var existingVote = await _dbContext.RecipeVotes
            .FirstOrDefaultAsync(v => v.RecipeId == recipeId && v.FamilyMemberId == familyMemberId);

        if (existingVote != null)
        {
            existingVote.Vote = vote;
            existingVote.VotedAt = DateTimeOffset.UtcNow;
        }
        else
        {
            _dbContext.RecipeVotes.Add(new RecipeVote
            {
                RecipeId = recipeId,
                FamilyMemberId = familyMemberId,
                Vote = vote
            });
        }

        await _dbContext.SaveChangesAsync();
    }

    public string InferDifficulty(SchemaOrgRecipe recipe)
    {
        int ingredientCount = recipe.RecipeIngredient?.Count ?? 0;
        int prepTimeMinutes = ParseIso8601Duration(recipe.TotalTime);

        return InferDifficulty(ingredientCount, prepTimeMinutes);
    }

    public string InferDifficulty(int ingredientCount, int prepTimeMinutes)
    {
        if (ingredientCount < 5 && prepTimeMinutes < 20)
            return "Easy";
        if (ingredientCount > 12 || prepTimeMinutes > 45)
            return "Hard";
        return "Medium";
    }

    private int ParseIso8601Duration(string? duration)
    {
        if (string.IsNullOrEmpty(duration)) return 0;

        try
        {
            // Simple ISO 8601 duration parser for "PTxxM", "PTxxHxxM", etc.
            // Example: PT30M -> 30, PT1H10M -> 70
            var timeSpan = System.Xml.XmlConvert.ToTimeSpan(duration);
            return (int)timeSpan.TotalMinutes;
        }
        catch
        {
            return 0;
        }
    }

    public async Task<bool> IsMatchAsync(Guid recipeId)
        => await _dbContext.RecipeMatches.AnyAsync(m => m.RecipeId == recipeId);
}
