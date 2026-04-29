using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using static RecipeApi.Dto.SmartDefaultsDto;

namespace RecipeApi.Services;

public class ScheduleService(RecipeDbContext dbContext)
{
    private readonly RecipeDbContext _dbContext = dbContext;

    public async Task<ScheduleDays> GetScheduleAsync(int weekOffset)
    {
        var (monday, sunday) = GetWeekBounds(weekOffset);

        var events = await _dbContext.CalendarEvents
            .Include(e => e.Recipe)
            .Where(e => e.Date >= monday && e.Date <= sunday)
            .ToListAsync();

        var isLocked = events.Any(e => e.Status == CalendarEventStatus.Locked);

        var days = new List<ScheduleDayDto>();
        var dayNames = new[] { "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" };

        for (int i = 0; i < 7; i++)
        {
            var date = monday.AddDays(i);
            var @event = events.FirstOrDefault(e => e.Date == date);
            var recipe = @event?.Recipe != null
                ? new ScheduleRecipeDto(
                    @event.Recipe.Id,
                    @event.Recipe.Name,
                    $"/api/recipes/{@event.Recipe.Id}/hero",
                    @event.VoteCount,
                    RecipeService.DeserializeIngredients(@event.Recipe.Ingredients),
                    @event.Recipe.Description)
                : null;

            days.Add(new ScheduleDayDto(dayNames[i], date.ToString("yyyy-MM-dd"), recipe));
        }

        return new ScheduleDays(weekOffset, isLocked, days);
    }

    public async Task LockScheduleAsync(int weekOffset)
    {
        var (monday, sunday) = GetWeekBounds(weekOffset);

        var events = await _dbContext.CalendarEvents
            .Include(e => e.Recipe)
            .Where(e => e.Date >= monday && e.Date <= sunday && e.Status == CalendarEventStatus.Planned)
            .ToListAsync();

        // Get vote counts for recipes in this week and persist them before clearing votes
        var voteCountsByRecipe = await _dbContext.RecipeVotes
            .Where(v => v.Vote == VoteType.Like)
            .GroupBy(v => v.RecipeId)
            .Select(g => new { RecipeId = g.Key, VoteCount = g.Count() })
            .ToListAsync();

        var voteCountDict = voteCountsByRecipe.ToDictionary(x => x.RecipeId, x => x.VoteCount);

        foreach (var @event in events)
        {
            @event.Status = CalendarEventStatus.Locked;
            if (voteCountDict.TryGetValue(@event.RecipeId, out var voteCount))
            {
                @event.VoteCount = voteCount;
            }
            if (@event.Recipe != null)
            {
                @event.Recipe.LastCookedDate = DateTimeOffset.UtcNow;
            }
        }

        var votes = await _dbContext.RecipeVotes.ToListAsync();
        _dbContext.RecipeVotes.RemoveRange(votes);

        await _dbContext.SaveChangesAsync();
    }

    public async Task MoveScheduleEventAsync(MoveScheduleDto dto)
    {
        var (monday, _) = GetWeekBounds(dto.WeekOffset);
        var fromDate = monday.AddDays(dto.FromIndex);
        var toDate = monday.AddDays(dto.ToIndex);

        var fromEvent = await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.Date == fromDate);
        var toEvent = await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.Date == toDate);

        if (fromEvent == null && toEvent == null)
        {
            return;
        }

        if (fromEvent != null && toEvent != null)
        {
            (fromEvent.RecipeId, toEvent.RecipeId) = (toEvent.RecipeId, fromEvent.RecipeId);
        }
        else if (fromEvent != null)
        {
            fromEvent.Date = toDate;
        }
        else if (toEvent != null)
        {
            toEvent.Date = fromDate;
        }

        await _dbContext.SaveChangesAsync();
    }

    public async Task AssignRecipeAsync(AssignScheduleDto dto)
    {
        var (monday, _) = GetWeekBounds(dto.WeekOffset);
        var date = monday.AddDays(dto.DayIndex);

        var existingEvent = await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.Date == date);

        if (existingEvent != null)
        {
            existingEvent.RecipeId = dto.RecipeId;
        }
        else
        {
            _dbContext.CalendarEvents.Add(new CalendarEvent
            {
                Id = Guid.NewGuid(),
                RecipeId = dto.RecipeId,
                Date = date,
                Status = CalendarEventStatus.Planned
            });
        }

        await _dbContext.SaveChangesAsync();
    }

    public async Task<List<ScheduleRecipeDto>> FillTheGapAsync()
    {
        var results = await _dbContext.RecipeMatches
            .Join(_dbContext.Recipes, m => m.RecipeId, r => r.Id, (m, r) => new { Match = m, Recipe = r })
            .OrderBy(x => x.Recipe.LastCookedDate == null ? 0 : 1)
            .ThenBy(x => x.Recipe.LastCookedDate)
            .Take(5)
            .ToListAsync();

        var dtos = results
            .Select(x => new ScheduleRecipeDto(
                x.Recipe.Id,
                x.Recipe.Name,
                $"/api/recipes/{x.Recipe.Id}/hero",
                x.Match.LikeCount,
                RecipeService.DeserializeIngredients(x.Recipe.Ingredients),
                x.Recipe.Description))
            .ToList();

        if (dtos.Count < 5)
        {
            var remaining = 5 - dtos.Count;
            var usedIds = results.Select(x => x.Recipe.Id).ToHashSet();

            var fallback = await _dbContext.DiscoveryRecipes
                .Where(r => !usedIds.Contains(r.Id))
                .OrderByDescending(r => r.VoteCount)
                .ThenBy(r => r.LastCookedDate == null ? 0 : 1)
                .ThenBy(r => r.LastCookedDate)
                .Take(remaining)
                .ToListAsync();

            dtos.AddRange(fallback
                .Select(dr => new ScheduleRecipeDto(
                    dr.Id,
                    dr.Name,
                    $"/api/recipes/{dr.Id}/hero",
                    null,
                    RecipeService.DeserializeIngredients(dr.Ingredients),
                    dr.Description)));
        }

        return dtos;
    }

    public async Task<SmartDefaultsDto> GetSmartDefaultsAsync(int weekOffset)
    {
        var (monday, sunday) = GetWeekBounds(weekOffset);

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

        var filteredVotes = likeVotes
            .Where(x => x.VoteCount >= consensusThreshold && recipeDict.ContainsKey(x.RecipeId))
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
        var existingEvents = await _dbContext.CalendarEvents
            .Where(e => e.Date >= monday && e.Date <= sunday)
            .ToListAsync();

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
                IsLocked: isUnanimous
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
            ConsensusRecipesCount: filteredVotes.Count
        );
    }

    public async Task ValidateDayAsync(string dateStr, ValidationDto dto)
    {
        var date = DateOnly.Parse(dateStr);
        var @event = await _dbContext.CalendarEvents
            .Include(e => e.Recipe)
            .FirstOrDefaultAsync(e => e.Date == date);

        if (@event == null)
        {
            throw new Exception("No meal planned for this date");
        }

        @event.Status = (CalendarEventStatus)dto.Status;

        if (dto.Status == 2 && @event.Recipe != null) // 2 = Cooked
        {
            @event.Recipe.LastCookedDate = DateTimeOffset.UtcNow;
        }

        await _dbContext.SaveChangesAsync();
    }

    private static (DateOnly Monday, DateOnly Sunday) GetWeekBounds(int weekOffset)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday + weekOffset * 7);
        var sunday = monday.AddDays(6);
        return (monday, sunday);
    }
}
