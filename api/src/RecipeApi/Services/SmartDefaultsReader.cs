using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

internal sealed class SmartDefaultsReader(RecipeDbContext db)
{
    private readonly RecipeDbContext _dbContext = db;
    public async Task<SmartDefaultsDto> ReadAsync(int weekOffset, DeploymentCalendarContext context)
    {
        var monday = context.WeekStart(weekOffset);
        var sunday = monday.AddDays(6);

        // Get family size
        var familySize = await _dbContext.FamilyMembers.CountAsync();

        // Calculate consensus threshold
        var consensusThreshold = (int)Math.Ceiling((familySize + 1.0) / 2);

        // Get all votes for recipes where vote = Like (1)
        var likeVotes = await _dbContext.RecipeVotes
            .Where(v => v.Vote == VoteType.Like)
            .GroupBy(v => v.RecipeId)
            .Select(g => new
            {
                RecipeId = g.Key,
                VoteCount = g.Count()
            })
            .ToListAsync();

        // Filter by consensus threshold, then load recipes
        var recipeIds = likeVotes
            .Where(x => x.VoteCount >= consensusThreshold)
            .Select(x => x.RecipeId)
            .ToList();

        var recipes = await _dbContext.Recipes
            .Where(r => recipeIds.Contains(r.Id))
            .ToListAsync();

        var recipeDict = recipes.ToDictionary(r => r.Id);

        var existingEvents = await _dbContext.CalendarEvents
            .Where(e => e.Date >= monday && e.Date <= sunday).ToListAsync();
        var selectedIds = existingEvents.Where(e => e.RecipeId.HasValue).Select(e => e.RecipeId!.Value).ToHashSet();

        var filteredVotes = likeVotes
            .Where(x => x.VoteCount >= consensusThreshold && recipeDict.ContainsKey(x.RecipeId) && !selectedIds.Contains(x.RecipeId))
            .Select(x => new
            {
                RecipeId = x.RecipeId,
                Recipe = recipeDict[x.RecipeId],
                VoteCount = x.VoteCount
            })
            .OrderByDescending(x => x.VoteCount == familySize) // Unanimous first
            .ThenByDescending(x => x.Recipe.LastCookedDate)   // Then by freshness
            .ToList();

        // Get existing calendar events for the week

        var occupiedDays = existingEvents
            .Select(e => e.Date.DayNumber - monday.DayNumber)
            .ToHashSet();

        var preSelectedRecipes = new List<PreSelectedRecipeDto>();
        var openSlots = new List<OpenSlotDto>();
        var dayIndex = 0;

        // Assign consensus recipes to available day slots (0-6)
        foreach (var voteGroup in filteredVotes)
        {
            if (preSelectedRecipes.Count >= 7)
                break;

            // Skip occupied days
            while (dayIndex < 7 && occupiedDays.Contains(dayIndex))
                dayIndex++;

            if (dayIndex >= 7)
                break;

            var isUnanimous = voteGroup.VoteCount == familySize;
            var recipe = voteGroup.Recipe!;

            preSelectedRecipes.Add(new PreSelectedRecipeDto(
                RecipeId: recipe.Id,
                Name: recipe.Name,
                HeroImageUrl: $"/api/recipes/{recipe.Id}/hero",
                VoteCount: voteGroup.VoteCount,
                FamilySize: familySize,
                UnanimousVote: isUnanimous,
                DayIndex: dayIndex,
                IsLocked: isUnanimous,
                TotalTime: recipe.TotalTime
            ));

            dayIndex++;
        }

        // Mark remaining available slots as open
        while (dayIndex < 7)
        {
            if (!occupiedDays.Contains(dayIndex))
            {
                openSlots.Add(new OpenSlotDto(dayIndex));
            }
            dayIndex++;
        }

        return new SmartDefaultsDto(
            WeekOffset: weekOffset,
            FamilySize: familySize,
            ConsensusThreshold: consensusThreshold,
            PreSelectedRecipes: preSelectedRecipes,
            OpenSlots: openSlots,
            ConsensusRecipesCount: filteredVotes.Count,
            WeekStartDate: monday
        );
    }

}
