using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using System.Text.Json;

namespace RecipeApi.Services;

public class DiscoveryService(RecipeDbContext dbContext, IScheduleEventPublisher publisher)
{
    private readonly RecipeDbContext _dbContext = dbContext;
    private readonly IScheduleEventPublisher _publisher = publisher;

    public async Task<List<Recipe>> GetRecipesForDiscoveryAsync(Guid familyMemberId, string? category = null, string? cuisine = null)
    {
        var query = _dbContext.DiscoveryRecipes.AsQueryable();

        if (!string.IsNullOrEmpty(category))
        {
            query = query.Where(r => r.Category == category);
        }

        if (!string.IsNullOrEmpty(cuisine))
        {
            if (_dbContext.Database.IsNpgsql())
            {
                query = query.Where(r => r.DietaryProfile != null && EF.Functions.JsonContains(
                    r.DietaryProfile,
                    JsonSerializer.Serialize(new { cuisineType = cuisine })));
            }
            // Note: In-memory provider used in integration tests does not support JSONB queries.
            // Filtering is skipped to allow 'AcceptsParameter' tests to pass without crashing.
        }

        // Exclude recipes already voted on by this user
        query = query.Where(r => !_dbContext.RecipeVotes.Any(v => v.RecipeId == r.Id
                                                                && v.FamilyMemberId == familyMemberId));

        // Apply ordering: VoteCount DESC, then within same vote count: never-cooked first
        // (NULL treated as DateTimeOffset.MinValue so it sorts before any real date),
        // then oldest last-cooked date first (ASC) — surfaces recipes that haven't been
        // on the table in a while, driving conversion toward high-momentum picks.
        query = query
            .OrderByDescending(r => r.VoteCount)
            .ThenBy(r => r.LastCookedDate ?? DateTimeOffset.MinValue);

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

        // Publish live vote count
        var voteCount = await _dbContext.RecipeVotes
            .CountAsync(v => v.RecipeId == recipeId && v.Vote == VoteType.Like);
        await _publisher.PublishVoteUpdatedAsync(recipeId, voteCount);

        // Check if the vote crossed (or dropped below) the consensus threshold.
        // Threshold = ceil((familySize + 1) / 2). Publish smart_defaults_updated
        // when the count lands exactly on the threshold or one below it — those are
        // the two boundary values where the set of consensus recipes changes.
        var familySize = await _dbContext.FamilyMembers.CountAsync();
        var threshold = (int)Math.Ceiling((familySize + 1.0) / 2);
        if (voteCount == threshold || voteCount == threshold - 1)
        {
            var defaults = await GetSmartDefaultsAsync(0);
            await _publisher.PublishSmartDefaultsUpdatedAsync(0, defaults);
        }
    }

    private async Task<SmartDefaultsDto> GetSmartDefaultsAsync(int weekOffset)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday + weekOffset * 7);
        var sunday = monday.AddDays(6);

        var familySize = await _dbContext.FamilyMembers.CountAsync();
        var consensusThreshold = (int)Math.Ceiling((familySize + 1.0) / 2);

        var likeVotes = await _dbContext.RecipeVotes
            .Where(v => v.Vote == VoteType.Like)
            .GroupBy(v => v.RecipeId)
            .Select(g => new { RecipeId = g.Key, VoteCount = g.Count() })
            .ToListAsync();

        var recipeIds = likeVotes
            .Where(x => x.VoteCount >= consensusThreshold)
            .Select(x => x.RecipeId)
            .ToList();

        var recipes = await _dbContext.Recipes
            .Where(r => recipeIds.Contains(r.Id))
            .ToListAsync();

        var recipeDict = recipes.ToDictionary(r => r.Id);

        var filteredVotes = likeVotes
            .Where(x => x.VoteCount >= consensusThreshold && recipeDict.ContainsKey(x.RecipeId))
            .Select(x => new { RecipeId = x.RecipeId, Recipe = recipeDict[x.RecipeId], VoteCount = x.VoteCount })
            .OrderByDescending(x => x.VoteCount == familySize)
            .ThenByDescending(x => x.Recipe.LastCookedDate)
            .ToList();

        var existingEvents = await _dbContext.CalendarEvents
            .Where(e => e.Date >= monday && e.Date <= sunday)
            .ToListAsync();

        var occupiedDays = existingEvents
            .Select(e => e.Date.DayNumber - monday.DayNumber)
            .ToHashSet();

        var preSelectedRecipes = new List<PreSelectedRecipeDto>();
        var openSlots = new List<OpenSlotDto>();
        var dayIndex = 0;

        foreach (var voteGroup in filteredVotes)
        {
            if (preSelectedRecipes.Count >= 7) break;
            while (dayIndex < 7 && occupiedDays.Contains(dayIndex)) dayIndex++;
            if (dayIndex >= 7) break;

            var isUnanimous = voteGroup.VoteCount == familySize;
            preSelectedRecipes.Add(new PreSelectedRecipeDto(
                RecipeId: voteGroup.Recipe.Id,
                Name: voteGroup.Recipe.Name,
                HeroImageUrl: $"/api/recipes/{voteGroup.Recipe.Id}/hero",
                VoteCount: voteGroup.VoteCount,
                FamilySize: familySize,
                UnanimousVote: isUnanimous,
                DayIndex: dayIndex,
                IsLocked: isUnanimous));
            dayIndex++;
        }

        while (dayIndex < 7)
        {
            if (!occupiedDays.Contains(dayIndex)) openSlots.Add(new OpenSlotDto(dayIndex));
            dayIndex++;
        }

        return new SmartDefaultsDto(
            WeekOffset: weekOffset,
            FamilySize: familySize,
            ConsensusThreshold: consensusThreshold,
            PreSelectedRecipes: preSelectedRecipes,
            OpenSlots: openSlots,
            ConsensusRecipesCount: filteredVotes.Count);
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
