using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using Microsoft.Extensions.Logging;
using static RecipeApi.Dto.SmartDefaultsDto;

namespace RecipeApi.Services;

public class ScheduleService(RecipeDbContext dbContext, ILogger<ScheduleService> logger, IScheduleEventPublisher publisher, GroceryRecomputeService groceryRecomputeService)
{
    private readonly RecipeDbContext _dbContext = dbContext;
    private readonly ILogger<ScheduleService> _logger = logger;
    private readonly IScheduleEventPublisher _publisher = publisher;
    private readonly GroceryRecomputeService _groceryRecomputeService = groceryRecomputeService;

    public async Task<ScheduleDays> GetScheduleAsync(int weekOffset)
    {
        var (monday, sunday) = GetWeekBounds(weekOffset);

        var events = await _dbContext.CalendarEvents
            .Include(e => e.Recipe)
            .Where(e => e.Date >= monday && e.Date <= sunday)
            .ToListAsync();

        var plan = await _dbContext.WeeklyPlans.FirstOrDefaultAsync(p => p.WeekStartDate == monday);
        var isLocked = plan?.Status == WeeklyPlanStatus.Locked;
        var status = (int)(plan?.Status ?? WeeklyPlanStatus.Draft);

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
                    @event.Recipe.Description,
                    @event.Recipe.TotalTime)
                : null;

            days.Add(new ScheduleDayDto(dayNames[i], date.ToString("yyyy-MM-dd"), recipe, (int)(@event?.Status ?? CalendarEventStatus.Planned)));
        }

        var groceryState = plan?.GroceryState != null
            ? JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)
            : null;

        var groceryItems = plan?.GroceryItems != null
            ? JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)
            : null;

        var balanceSummary = plan?.BalanceSummary != null
            ? JsonSerializer.Deserialize<WeeklyBalanceSummaryDto>(plan.BalanceSummary)
            : null;

        return new ScheduleDays(weekOffset, isLocked, status, days, groceryState, groceryItems, balanceSummary);
    }

    public async Task OpenVotingAsync(int weekOffset, string? excludeConnectionId = null)
    {
        var (monday, _) = GetWeekBounds(weekOffset);
        var plan = await _dbContext.WeeklyPlans.FirstOrDefaultAsync(p => p.WeekStartDate == monday);

        if (plan == null)
        {
            plan = new WeeklyPlan
            {
                Id = Guid.NewGuid(),
                WeekStartDate = monday,
                Status = WeeklyPlanStatus.VotingOpen
            };
            _dbContext.WeeklyPlans.Add(plan);
            _logger.LogInformation("Created new WeeklyPlan for week starting {Date} with status VotingOpen", monday);
        }
        else
        {
            plan.Status = WeeklyPlanStatus.VotingOpen;
            _logger.LogInformation("Updated WeeklyPlan for week starting {Date} to status VotingOpen", monday);
        }

        await _dbContext.SaveChangesAsync();

        var schedule = await GetScheduleAsync(weekOffset);
        await _publisher.PublishWeekUpdatedAsync(schedule, excludeConnectionId);
    }

    public async Task LockScheduleAsync(int weekOffset, string? excludeConnectionId = null)
    {
        var (monday, sunday) = GetWeekBounds(weekOffset);

        // 1. Update WeeklyPlan
        var plan = await _dbContext.WeeklyPlans.FirstOrDefaultAsync(p => p.WeekStartDate == monday);
        if (plan == null)
        {
            plan = new WeeklyPlan { WeekStartDate = monday };
            _dbContext.WeeklyPlans.Add(plan);
        }
        plan.Status = WeeklyPlanStatus.Locked;

        // 2. Lock all events for this week
        var events = await _dbContext.CalendarEvents
            .Include(e => e.Recipe)
            .Where(e => e.Date >= monday && e.Date <= sunday)
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
            if (@event.RecipeId is { } recipeId && voteCountDict.TryGetValue(recipeId, out var voteCount))
            {
                @event.VoteCount = voteCount;
            }
        }

        // 3. Global Purge #1: Delete all recipe votes
        var votes = await _dbContext.RecipeVotes.ToListAsync();
        _dbContext.RecipeVotes.RemoveRange(votes);
        _logger.LogInformation("Global Purge #1: Deleted {Count} votes from recipe_votes", votes.Count);

        await _dbContext.SaveChangesAsync();

        var schedule = await GetScheduleAsync(weekOffset);
        await _publisher.PublishWeekUpdatedAsync(schedule, excludeConnectionId);
    }

    public async Task MoveScheduleEventAsync(MoveScheduleDto dto, string? excludeConnectionId = null, int? echoSeq = null)
    {
        var targetWeekOffset = dto.TargetWeekOffset ?? dto.WeekOffset;
        if (targetWeekOffset != dto.WeekOffset)
        {
            await MoveCrossWeekAsync(dto, targetWeekOffset);
            var crossWeekSchedule = await GetScheduleAsync(dto.WeekOffset);
            await _publisher.PublishWeekUpdatedAsync(crossWeekSchedule, excludeConnectionId, echoSeq);
            return;
        }

        var (monday, _) = GetWeekBounds(dto.WeekOffset);
        var toDate = monday.AddDays(dto.ToIndex);

        var fromDate = dto.FromIndex is { } fromIndex ? monday.AddDays(fromIndex) : (DateOnly?)null;

        // Prefer the explicit source slot when the client knows it. This avoids moving the wrong
        // event when the same recipe appears multiple times in a week.
        var fromEvent = fromDate is { } explicitFromDate
            ? await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.Date == explicitFromDate)
            : null;

        // Fallback to recipeId for older clients that do not send fromIndex.
        fromEvent ??= await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.RecipeId == dto.RecipeId);
        if (fromEvent == null)
        {
            _logger.LogWarning("Move ignored: Recipe {RecipeId} not found in schedule.", dto.RecipeId);
            return;
        }

        if (fromEvent.RecipeId != dto.RecipeId)
        {
            _logger.LogWarning(
                "Move ignored: source slot {FromDate} does not contain recipe {RecipeId}.",
                fromEvent.Date,
                dto.RecipeId);
            return;
        }

        var preserveOrderedInSource = fromEvent.Status == CalendarEventStatus.Skipped;
        var sourceRecipeId = fromEvent.RecipeId ?? throw new InvalidOperationException("Scheduled event is missing a recipe association.");
        var sourceVoteCount = fromEvent.VoteCount;
        var currentFromDate = fromEvent.Date;

        if (dto.Intent == "push")
        {
            // Push logic: find first empty slot starting at toIndex
            var targetIndex = dto.ToIndex;
            bool foundEmpty = false;
            while (targetIndex < 7)
            {
                var checkDate = monday.AddDays(targetIndex);
                var exists = await _dbContext.CalendarEvents.AnyAsync(e => e.Date == checkDate);
                if (!exists)
                {
                    foundEmpty = true;
                    break;
                }
                targetIndex++;
            }

            if (foundEmpty)
            {
                _logger.LogInformation("Pushing recipe {RecipeId} from {From} to {To}, shifting slots", dto.RecipeId, currentFromDate, toDate);
                // Shift recipes from targetIndex down to toIndex
                for (int i = targetIndex; i > dto.ToIndex; i--)
                {
                    var currentDay = monday.AddDays(i);
                    var prevDay = monday.AddDays(i - 1);
                    var prevEvent = await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.Date == prevDay);
                    if (prevEvent != null)
                    {
                        prevEvent.Date = currentDay;
                    }
                }
                if (preserveOrderedInSource)
                {
                    _dbContext.CalendarEvents.Add(new CalendarEvent
                    {
                        Id = Guid.NewGuid(),
                        RecipeId = sourceRecipeId,
                        Date = toDate,
                        Status = CalendarEventStatus.Planned,
                        VoteCount = sourceVoteCount,
                    });
                    fromEvent.RecipeId = null;
                    fromEvent.VoteCount = 0;
                }
                else
                {
                    fromEvent.Date = toDate;
                }
            }
            else
            {
                _logger.LogWarning("No empty slot found for push, falling back to swap");
                await SwapInternalAsync(currentFromDate, toDate);
            }
        }
        else
        {
            await SwapInternalAsync(currentFromDate, toDate);
        }

        await _dbContext.SaveChangesAsync();

        var schedule = await GetScheduleAsync(dto.WeekOffset);
        await _publisher.PublishWeekUpdatedAsync(schedule, excludeConnectionId, echoSeq);
    }

    private async Task MoveCrossWeekAsync(MoveScheduleDto dto, int targetWeekOffset)
    {
        var (sourceMonday, _) = GetWeekBounds(dto.WeekOffset);
        var (targetMonday, _) = GetWeekBounds(targetWeekOffset);

        var fromDate = dto.FromIndex is { } fromIndex ? sourceMonday.AddDays(fromIndex) : (DateOnly?)null;
        var fromEvent = fromDate is { } explicitFromDate
            ? await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.Date == explicitFromDate)
            : null;

        fromEvent ??= await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.RecipeId == dto.RecipeId);
        if (fromEvent == null) return;

        if (fromEvent.RecipeId != dto.RecipeId)
        {
            _logger.LogWarning(
                "Cross-week move ignored: source slot {FromDate} does not contain recipe {RecipeId}.",
                fromEvent.Date,
                dto.RecipeId);
            return;
        }

        var preserveOrderedInSource = fromEvent.Status == CalendarEventStatus.Skipped;
        var sourceRecipeId = fromEvent.RecipeId ?? throw new InvalidOperationException("Scheduled event is missing a recipe association.");
        var sourceVoteCount = fromEvent.VoteCount;

        // Find first available slot in target week starting at toIndex
        var targetIndex = dto.ToIndex;
        while (targetIndex < 7)
        {
            var checkDate = targetMonday.AddDays(targetIndex);
            var exists = await _dbContext.CalendarEvents.AnyAsync(e => e.Date == checkDate);
            if (!exists) break;
            targetIndex++;
        }

        if (targetIndex >= 7)
        {
            _logger.LogWarning("No empty slot in target week {Offset}, cross-week move aborted", targetWeekOffset);
            return;
        }

        await EnsureWeekPlanExistsAsync(targetMonday);

        if (preserveOrderedInSource)
        {
            _dbContext.CalendarEvents.Add(new CalendarEvent
            {
                Id = Guid.NewGuid(),
                RecipeId = sourceRecipeId,
                Date = targetMonday.AddDays(targetIndex),
                Status = CalendarEventStatus.Planned,
                VoteCount = sourceVoteCount,
            });
            fromEvent.RecipeId = null;
            fromEvent.VoteCount = 0;
        }
        else
        {
            fromEvent.Date = targetMonday.AddDays(targetIndex);
        }
        await _dbContext.SaveChangesAsync();

        await _groceryRecomputeService.RecomputeForWeekAsync(sourceMonday, CancellationToken.None);
        await _groceryRecomputeService.RecomputeForWeekAsync(targetMonday, CancellationToken.None);
    }

    private async Task SwapInternalAsync(DateOnly fromDate, DateOnly toDate)
    {
        var fromEvent = await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.Date == fromDate);
        var toEvent = await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.Date == toDate);

        if (fromEvent != null && toEvent != null)
        {
            _logger.LogInformation("Swapping recipes between {From} and {To}", fromDate, toDate);
            (fromEvent.RecipeId, toEvent.RecipeId) = (toEvent.RecipeId, fromEvent.RecipeId);
            (fromEvent.VoteCount, toEvent.VoteCount) = (toEvent.VoteCount, fromEvent.VoteCount);
            (fromEvent.Status, toEvent.Status) = (toEvent.Status, fromEvent.Status);
        }
        else if (fromEvent != null)
        {
            fromEvent.Date = toDate;
        }
        else if (toEvent != null)
        {
            toEvent.Date = fromDate;
        }
    }

    public async Task<DisplacedRecipeDto?> AssignRecipeAsync(AssignScheduleDto dto, string? excludeConnectionId = null)
    {
        var (monday, _) = GetWeekBounds(dto.WeekOffset);
        var date = monday.AddDays(dto.DayIndex);

        await EnsureWeekPlanExistsAsync(monday);

        var existingEvent = await _dbContext.CalendarEvents
            .Include(e => e.Recipe)
            .FirstOrDefaultAsync(e => e.Date == date);

        DisplacedRecipeDto? displaced = null;

        if (existingEvent != null)
        {
            // Sunday (dayIndex 6) displacement: carry the evicted recipe forward to next week Monday
            // rather than silently dropping it.
            if (existingEvent.RecipeId.HasValue && dto.DayIndex == 6)
            {
                var nextWeekOffset = dto.WeekOffset + 1;
                var (nextMonday, _) = GetWeekBounds(nextWeekOffset);
                await EnsureWeekPlanExistsAsync(nextMonday);

                var nextMonday_slot = await _dbContext.CalendarEvents
                    .FirstOrDefaultAsync(e => e.Date == nextMonday);

                if (nextMonday_slot != null)
                {
                    nextMonday_slot.RecipeId = existingEvent.RecipeId;
                    nextMonday_slot.Status = CalendarEventStatus.Planned;
                }
                else
                {
                    _dbContext.CalendarEvents.Add(new CalendarEvent
                    {
                        Id = Guid.NewGuid(),
                        RecipeId = existingEvent.RecipeId,
                        Date = nextMonday,
                        Status = CalendarEventStatus.Planned
                    });
                }

                displaced = new DisplacedRecipeDto(
                    existingEvent.RecipeId.Value,
                    existingEvent.Recipe?.Name,
                    nextWeekOffset,
                    0);
            }

            existingEvent.RecipeId = dto.RecipeId;
            existingEvent.Status = CalendarEventStatus.Planned;
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

        await _groceryRecomputeService.RecomputeForWeekAsync(monday, CancellationToken.None);

        var schedule = await GetScheduleAsync(dto.WeekOffset);
        await _publisher.PublishWeekUpdatedAsync(schedule, excludeConnectionId);
        await _publisher.PublishFillTheGapInvalidatedAsync(dto.WeekOffset, excludeConnectionId);

        if (displaced != null)
        {
            var (nextMonday2, _) = GetWeekBounds(dto.WeekOffset + 1);
            await _groceryRecomputeService.RecomputeForWeekAsync(nextMonday2, CancellationToken.None);
            var nextSchedule = await GetScheduleAsync(dto.WeekOffset + 1);
            await _publisher.PublishWeekUpdatedAsync(nextSchedule, excludeConnectionId);
        }

        return displaced;
    }

    public async Task<List<ScheduleRecipeDto>> FillTheGapAsync(int weekOffset = 0)
    {
        var (monday, sunday) = GetWeekBounds(weekOffset);

        var assignedIds = await _dbContext.CalendarEvents
            .Where(e => e.Date >= monday && e.Date <= sunday)
            .Where(e => e.RecipeId != null)
            .Select(e => e.RecipeId!.Value)
            .ToHashSetAsync();

        var results = await _dbContext.RecipeMatches
            .Join(_dbContext.Recipes, m => m.RecipeId, r => r.Id, (m, r) => new { Match = m, Recipe = r })
            .Where(x => !assignedIds.Contains(x.Recipe.Id))
            .OrderBy(x => x.Recipe.LastCookedDate == null ? 0 : 1)
            .ThenBy(x => x.Recipe.LastCookedDate)
            .ThenByDescending(x => x.Match.LikeCount)
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
                .Where(r => !usedIds.Contains(r.Id) && !assignedIds.Contains(r.Id))
                .OrderBy(r => r.LastCookedDate == null ? 0 : 1)
                .ThenBy(r => r.LastCookedDate)
                .ThenByDescending(r => r.VoteCount)
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

    public async Task RemoveRecipeAsync(DateOnly date, string? excludeConnectionId = null)
    {
        var @event = await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.Date == date);
        if (@event != null)
        {
            // Determine weekOffset from the date before removing
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
            var thisMonday = today.AddDays(-daysToMonday);
            var dateDayNumber = date.DayNumber;
            var weekOffset = (dateDayNumber - thisMonday.DayNumber) / 7;

            // Derive the Monday of the week containing the removed event's date
            var eventDaysToMonday = ((int)date.DayOfWeek - 1 + 7) % 7;
            var monday = date.AddDays(-eventDaysToMonday);

            _dbContext.CalendarEvents.Remove(@event);
            await _dbContext.SaveChangesAsync();
            _logger.LogInformation("Removed recipe from date {Date}", date);

            await _groceryRecomputeService.RecomputeForWeekAsync(monday, CancellationToken.None);

            var schedule = await GetScheduleAsync(weekOffset);
            await _publisher.PublishWeekUpdatedAsync(schedule, excludeConnectionId);
            await _publisher.PublishFillTheGapInvalidatedAsync(weekOffset, excludeConnectionId);
        }
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

    public async Task ValidateDayAsync(string dateStr, ValidationDto dto, string? excludeConnectionId = null)
    {
        var date = DateOnly.Parse(dateStr);
        var @event = await _dbContext.CalendarEvents
            .Include(e => e.Recipe)
            .FirstOrDefaultAsync(e => e.Date == date);

        if (@event == null)
        {
            if (dto.Status == 3) // Ordered In / Skipped — no recipe required
            {
                var newEvent = new CalendarEvent
                {
                    Id = Guid.NewGuid(),
                    RecipeId = null,
                    Date = date,
                    Status = CalendarEventStatus.Skipped,
                };
                _dbContext.CalendarEvents.Add(newEvent);
                await _dbContext.SaveChangesAsync();
                _logger.LogInformation("Created ordered-in CalendarEvent for date {Date} with no recipe", date);

                await _publisher.PublishSlotUpdatedAsync(date, null, dto.Status, excludeConnectionId);
                return;
            }
            throw new Exception("No meal planned for this date");
        }

        var oldStatus = @event.Status;
        @event.Status = (CalendarEventStatus)dto.Status;

        // Consensus Purge (Global Purge #2)
        if (oldStatus == CalendarEventStatus.AwaitingConsensus && @event.Status == CalendarEventStatus.Locked)
        {
            _logger.LogInformation("Consensus Purge #2: Recipe {RecipeId} reached consensus, purging votes", @event.RecipeId);
            if (@event.RecipeId is { } recipeId)
            {
                var votesToPurge = await _dbContext.RecipeVotes.Where(v => v.RecipeId == recipeId).ToListAsync();
                _dbContext.RecipeVotes.RemoveRange(votesToPurge);
            }
        }

        if (dto.Status == 2 && @event.Recipe != null) // 2 = Cooked
        {
            @event.Recipe.LastCookedDate = DateTimeOffset.UtcNow;
            _logger.LogInformation("Updated LastCookedDate for recipe {RecipeId}", @event.RecipeId);
        }

        await _dbContext.SaveChangesAsync();

        // Build ScheduleRecipeDto for the slot (may be null for ordered-in)
        ScheduleRecipeDto? recipeDto = null;
        if (@event.Recipe != null && @event.RecipeId != null)
        {
            recipeDto = new ScheduleRecipeDto(
                @event.Recipe.Id,
                @event.Recipe.Name,
                $"/api/recipes/{@event.Recipe.Id}/hero",
                @event.VoteCount,
                RecipeService.DeserializeIngredients(@event.Recipe.Ingredients),
                @event.Recipe.Description,
                @event.Recipe.TotalTime);
        }

        await _publisher.PublishSlotUpdatedAsync(date, recipeDto, dto.Status, excludeConnectionId);
    }

    public async Task<Dictionary<string, bool>> UpdateGroceryStateAsync(
        int weekOffset,
        Dictionary<string, bool> groceryState,
        string? excludeConnectionId = null)
    {
        var (monday, _) = GetWeekBounds(weekOffset);
        var weekPlan = await _dbContext.WeeklyPlans.FirstOrDefaultAsync(wp => wp.WeekStartDate == monday)
            ?? throw new KeyNotFoundException($"Weekly plan for week starting {monday} not found.");

        weekPlan.GroceryState = System.Text.Json.JsonSerializer.Serialize(groceryState);
        await _dbContext.SaveChangesAsync();
        await _publisher.PublishGroceryUpdatedAsync(weekOffset, groceryState, excludeConnectionId);
        return groceryState;
    }

    public async Task ToggleGroceryItemAsync(
        int weekOffset,
        string ingredientName,
        bool checked_,
        string? excludeConnectionId = null)
    {
        var (monday, _) = GetWeekBounds(weekOffset);
        var weekPlan = await _dbContext.WeeklyPlans.FirstOrDefaultAsync(wp => wp.WeekStartDate == monday)
            ?? throw new KeyNotFoundException($"Weekly plan for week starting {monday} not found.");

        // Deserialize current state, merge the single item, re-serialize.
        // This is the atomic server-side merge that prevents concurrent toggles
        // from overwriting each other (last-write-wins on the full map).
        var current = string.IsNullOrEmpty(weekPlan.GroceryState)
            ? new Dictionary<string, bool>()
            : System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, bool>>(weekPlan.GroceryState)
              ?? new Dictionary<string, bool>();

        current[ingredientName] = checked_;
        weekPlan.GroceryState = System.Text.Json.JsonSerializer.Serialize(current);
        await _dbContext.SaveChangesAsync();
        await _publisher.PublishGroceryUpdatedAsync(weekOffset, current, excludeConnectionId);
    }

    /// <summary>
    /// Ensures a WeeklyPlan row exists for the given Monday.
    /// Called by any operation that places a recipe onto a week — the plan must
    /// exist before grocery state can be persisted against it.
    /// </summary>
    private async Task EnsureWeekPlanExistsAsync(DateOnly monday)
    {
        var exists = await _dbContext.WeeklyPlans.AnyAsync(p => p.WeekStartDate == monday);
        if (!exists)
        {
            _dbContext.WeeklyPlans.Add(new WeeklyPlan
            {
                Id = Guid.NewGuid(),
                WeekStartDate = monday,
                Status = WeeklyPlanStatus.Draft
            });
            _logger.LogInformation("Created WeeklyPlan for week starting {Date}", monday);
            await _dbContext.SaveChangesAsync();
        }
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
