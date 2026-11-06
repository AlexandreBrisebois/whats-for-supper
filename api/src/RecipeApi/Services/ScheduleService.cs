using System.Data;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using Microsoft.Extensions.Logging;
using static RecipeApi.Dto.SmartDefaultsDto;

namespace RecipeApi.Services;

public partial class ScheduleService(RecipeDbContext dbContext, ILogger<ScheduleService> logger, IScheduleEventPublisher publisher, GroceryRecomputeService groceryRecomputeService, IClock clock, DeploymentCalendar calendar, HistoricalInterestService historicalInterest, GroceryCheckCoordinator groceryChecks, SupperProjectionInvalidation projectionInvalidation, GroceryExtraService? groceryExtras = null, GroceryExtraRolloverService? groceryExtraRollover = null)
{
    private readonly RecipeDbContext _dbContext = dbContext;
    private readonly ILogger<ScheduleService> _logger = logger;
    private readonly IScheduleEventPublisher _publisher = publisher;
    private readonly GroceryRecomputeService _groceryRecomputeService = groceryRecomputeService;
    private readonly IClock _clock = clock;
    private readonly DeploymentCalendar _calendar = calendar;
    private readonly HistoricalInterestService _historicalInterest = historicalInterest;
    private readonly GroceryExtraService? _groceryExtras = groceryExtras;
    private readonly GroceryExtraRolloverService? _groceryExtraRollover = groceryExtraRollover;

    public Task<ScheduleDays> GetScheduleAsync(int weekOffset, DateOnly? referenceWeekStartDate = null) =>
        ReadScheduleAsync(weekOffset, _calendar.Capture(_clock.UtcNow, referenceWeekStartDate));

    private async Task<ScheduleDays> ReadScheduleAsync(int weekOffset, DeploymentCalendarContext context)
    {
        var monday = context.WeekStart(weekOffset);
        var sunday = monday.AddDays(6);

        if (monday == context.CurrentWeekStartDate && _groceryExtraRollover is not null)
            await _groceryExtraRollover.ReconcileAsync(context.CurrentWeekStartDate);

        // Rollover commits first. The returned calendar, check map and derived freshness
        // then come from one snapshot, independent of entities tracked by a prior write.
        await using var transaction = _dbContext.Database.IsRelational() && _dbContext.Database.CurrentTransaction is null
            ? await _dbContext.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead) : null;
        var events = await _dbContext.CalendarEvents.AsNoTracking()
            .Include(e => e.Recipe)
            .Where(e => e.Date >= monday && e.Date <= sunday)
            .ToListAsync();

        var plan = await _dbContext.WeeklyPlans.AsNoTracking().FirstOrDefaultAsync(p => p.WeekStartDate == monday);
        var isLocked = plan?.Status == WeeklyPlanStatus.Locked;
        var status = (int)(plan?.Status ?? WeeklyPlanStatus.Draft);

        var days = new List<ScheduleDayDto>();
        var dayNames = new[] { "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" };

        for (int i = 0; i < 7; i++)
        {
            var date = monday.AddDays(i);
            var @event = events.FirstOrDefault(e => e.Date == date && e.MealSlot == 0);
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

            days.Add(new ScheduleDayDto(dayNames[i], date.ToString("yyyy-MM-dd"), recipe, (int)(@event?.Status ?? CalendarEventStatus.Planned), GetNonCookingPlan(@event), @event is null ? null : PlanToken(@event), @event?.Id, Preparation(@event)));
        }

        var groceryState = plan?.GroceryState != null
            ? JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)
            : null;

        var groceryItems = plan?.GroceryItems != null
            ? JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)
            : null;

        var round = await _dbContext.VotingRoundStates.AsNoTracking().SingleOrDefaultAsync();
        var roundId = plan?.VotingRoundId ?? plan?.LastClosedRoundId ??
            (round?.WeekStartDate is null || round.WeekStartDate == monday ? round?.RoundId : null);
        var extras = _groceryExtras is null ? [] : await _groceryExtras.ReadForViewAsync(monday, context.CurrentWeekStartDate);
        if (transaction is not null) await transaction.CommitAsync();
        return new ScheduleDays(weekOffset, isLocked, status, days, context, monday, groceryState, groceryItems, roundId, extras, SupperServingsService.Freshness(plan, "legacy"));
    }

    public async Task OpenVotingAsync(int weekOffset, string? excludeConnectionId = null, DateOnly? referenceWeekStartDate = null)
    {
        var context = _calendar.Capture(_clock.UtcNow, referenceWeekStartDate);
        var monday = context.WeekStart(weekOffset);
        await using (var transaction = await VotingBoundary.BeginAsync(_dbContext))
        {
            var state = await VotingBoundary.StateAsync(_dbContext);
            var legacyOpen = await _dbContext.WeeklyPlans.Where(p => p.Status == WeeklyPlanStatus.VotingOpen).ToListAsync();
            if (state.WeekStartDate is null && legacyOpen.Count > 1 && legacyOpen.All(p => p.VotingRoundId is null) &&
                legacyOpen.Any(p => p.WeekStartDate == monday))
            {
                // An explicit open chooses the owner of an ambiguous pre-upgrade round.
                // Keep every vote and calendar entry; do not invent a historical close.
                foreach (var legacy in legacyOpen)
                {
                    legacy.Status = legacy.WeekStartDate == monday ? WeeklyPlanStatus.VotingOpen : WeeklyPlanStatus.Draft;
                    legacy.RequiresRoundIdentity = true;
                }
                await _dbContext.SaveChangesAsync();
            }
            if ((state.WeekStartDate is { } owner && owner != monday) ||
                await _dbContext.WeeklyPlans.AnyAsync(p => p.Status == WeeklyPlanStatus.VotingOpen && p.WeekStartDate != monday))
                throw new VotingConflictException("Another week owns voting. Refresh the planner.");
            var plan = await _dbContext.WeeklyPlans.FirstOrDefaultAsync(p => p.WeekStartDate == monday);
            if (plan is null)
            {
                plan = new WeeklyPlan { WeekStartDate = monday, CreatedAt = _clock.UtcNow };
                _dbContext.WeeklyPlans.Add(plan);
            }
            if (plan.Status != WeeklyPlanStatus.VotingOpen || plan.VotingRoundId is null)
            {
                plan.RequiresRoundIdentity |= plan.Status == WeeklyPlanStatus.Locked || plan.LastClosedRoundId is not null;
                plan.VotingRoundId = state.RoundId;
            }
            plan.Status = WeeklyPlanStatus.VotingOpen;
            state.WeekStartDate = monday;
            state.HistoryGeneration = Guid.NewGuid();
            await _dbContext.SaveChangesAsync();
            if (transaction is not null) await transaction.CommitAsync();
        }
        await _publisher.PublishWeekUpdatedAsync(await ReadScheduleAsync(weekOffset, context), excludeConnectionId);
        await _publisher.PublishAllSuggestionsInvalidatedAsync();
    }

    public async Task LockScheduleAsync(int weekOffset, string? excludeConnectionId = null,
        DateOnly? referenceWeekStartDate = null, Guid? votingRoundId = null)
    {
        var context = _calendar.Capture(_clock.UtcNow, referenceWeekStartDate);
        var monday = context.WeekStart(weekOffset);
        var sunday = monday.AddDays(6);
        await using (var transaction = await VotingBoundary.BeginAsync(_dbContext))
        {
            var state = await VotingBoundary.StateAsync(_dbContext);
            var plan = await _dbContext.WeeklyPlans.FirstOrDefaultAsync(p => p.WeekStartDate == monday);
            // A receipt is checked before current-round ownership: replay never mutates a newer round.
            var replay = plan?.LastClosedRoundId is { } receipt &&
                (votingRoundId == receipt || (votingRoundId is null && plan.Status == WeeklyPlanStatus.Locked));
            if (!replay)
            {
                if ((state.WeekStartDate is { } owner && owner != monday) ||
                    await _dbContext.WeeklyPlans.AnyAsync(p => p.Status == WeeklyPlanStatus.VotingOpen && p.WeekStartDate != monday) ||
                    (votingRoundId is { } requested && requested != state.RoundId) ||
                    (votingRoundId is null && (plan?.RequiresRoundIdentity == true || state.RequiresRoundIdentity)))
                    throw new VotingConflictException("Voting changed. Refresh the planner before closing this round.");
                if (plan is null)
                {
                    plan = new WeeklyPlan { WeekStartDate = monday, CreatedAt = _clock.UtcNow };
                    _dbContext.WeeklyPlans.Add(plan);
                }
                var events = await _dbContext.CalendarEvents.Where(e => e.Date >= monday && e.Date <= sunday).ToListAsync();
                var votes = await _dbContext.RecipeVotes.ToListAsync();
                var selected = events.Where(e => e.RecipeId != null &&
                    e.Status is CalendarEventStatus.Planned or CalendarEventStatus.Locked or CalendarEventStatus.Cooked)
                    .Select(e => e.RecipeId!.Value).ToHashSet();
                var history = await _dbContext.WeeklyHouseholdInterests.Where(x => x.WeekStartDate == monday).ToDictionaryAsync(x => x.RecipeId);
                foreach (var group in votes.GroupBy(v => v.RecipeId))
                {
                    var likes = group.Count(v => v.Vote == VoteType.Like);
                    history.TryGetValue(group.Key, out var row);
                    if (likes == 0)
                    {
                        if (row is not null) _dbContext.WeeklyHouseholdInterests.Remove(row);
                        continue;
                    }
                    if (row is null)
                    {
                        row = new WeeklyHouseholdInterest { WeekStartDate = monday, RecipeId = group.Key };
                        _dbContext.WeeklyHouseholdInterests.Add(row);
                    }
                    row.PositiveCount = likes;
                    row.Selected = selected.Contains(group.Key);
                    row.CapturedAt = _clock.UtcNow;
                    row.CloseId = state.RoundId;
                }
                var counts = votes.Where(v => v.Vote == VoteType.Like).GroupBy(v => v.RecipeId).ToDictionary(g => g.Key, g => g.Count());
                // Retire the materialized live contribution with the round. Preserve cooked
                // affinity; legacy facts lack a decomposition, so rebuild that component.
                var facts = await _dbContext.RecipeSearchAffinityFacts.ToListAsync();
                var cookedCounts = await _dbContext.CalendarEvents.Where(e => e.RecipeId != null && e.Status == CalendarEventStatus.Cooked)
                    .GroupBy(e => e.RecipeId!.Value).Select(g => new { Id = g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Id, x => x.Count);
                foreach (var fact in facts)
                {
                    fact.Affinity = fact.LiveVoteContribution is { } live ? fact.Affinity - live : cookedCounts.GetValueOrDefault(fact.RecipeId);
                    fact.LiveVoteContribution = 0;
                }
                foreach (var entry in events)
                {
                    if (entry.Status is not (CalendarEventStatus.Cooked or CalendarEventStatus.Skipped))
                        entry.Status = CalendarEventStatus.Locked;
                    if (entry.RecipeId is { } id && counts.TryGetValue(id, out var count)) entry.VoteCount = count;
                }
                plan.Status = WeeklyPlanStatus.Locked;
                plan.LastClosedRoundId = state.RoundId;
                plan.VotingRoundId = null;
                state.RoundId = Guid.NewGuid();
                state.WeekStartDate = null;
                state.HistoryGeneration = Guid.NewGuid();
                _dbContext.RecipeVotes.RemoveRange(votes);
                await _dbContext.SaveChangesAsync();
            }
            if (transaction is not null) await transaction.CommitAsync();
        }
        await _publisher.PublishWeekUpdatedAsync(await ReadScheduleAsync(weekOffset, context), excludeConnectionId);
        await _publisher.PublishFillTheGapInvalidatedAsync(weekOffset, monday, excludeConnectionId);
        await _publisher.PublishAllSuggestionsInvalidatedAsync();
    }

    public async Task<MoveScheduleResultDto?> MoveScheduleEventAsync(MoveScheduleDto dto, string? excludeConnectionId = null, int? echoSeq = null, DateOnly? referenceWeekStartDate = null, CancellationToken ct = default)
    {
        var context = _calendar.Capture(_clock.UtcNow, referenceWeekStartDate);
        if (dto.SourceDisposition != null && (dto.Intent != "tomorrow" || dto.SourceDisposition != "order_in"))
            throw new ArgumentException("Source disposition is only supported for Tomorrow Order In.");
        if (dto.Intent == "tomorrow")
            return await MoveTomorrowAsync(dto, context, excludeConnectionId, echoSeq, ct);
        var targetWeekOffset = dto.TargetWeekOffset ?? dto.WeekOffset;
        if (targetWeekOffset != dto.WeekOffset)
        {
            var result = await MoveCrossWeekAsync(dto, targetWeekOffset, context, excludeConnectionId, echoSeq);
            if (result is not null) return result;
            var crossWeekSchedule = await ReadScheduleAsync(dto.WeekOffset, context);
            await _publisher.PublishWeekUpdatedAsync(crossWeekSchedule, excludeConnectionId, echoSeq);
            return null;
        }

        await using var transaction = await SupperServingsService.BeginAsync(_dbContext, ct);
        var monday = context.WeekStart(dto.WeekOffset);
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
            return null;
        }

        if (fromEvent.RecipeId != dto.RecipeId)
        {
            _logger.LogWarning(
                "Move ignored: source slot {FromDate} does not contain recipe {RecipeId}.",
                fromEvent.Date,
                dto.RecipeId);
            return null;
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
            while (targetIndex < 14)
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
                if (dto.ToIndex >= 7)
                {
                    var targetWeekMonday = monday.AddDays((dto.ToIndex / 7) * 7);
                    await EnsureWeekPlanExistsAsync(targetWeekMonday);
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

        var affected = _dbContext.ChangeTracker.Entries<CalendarEvent>()
            .Where(x => x.State != EntityState.Unchanged)
            .SelectMany(x => new[] { GetMonday(x.Entity.Date), GetMonday(x.OriginalValues.GetValue<DateOnly>(nameof(CalendarEvent.Date))) })
            .Append(monday).Distinct().ToArray();
        await _dbContext.SaveChangesAsync();
        await EnlistSupperWeeksAsync(affected, ct);
        if (transaction is not null) { await transaction.CommitAsync(ct); await transaction.DisposeAsync(); }
        foreach (var week in affected)
        {
            await RefreshCommittedWeekAsync(week, context, excludeConnectionId, echoSeq);
        }
        return null;
    }

    private async Task<MoveScheduleResultDto?> MoveCrossWeekAsync(MoveScheduleDto dto, int targetWeekOffset, DeploymentCalendarContext context, string? excludeConnectionId, int? echoSeq)
    {
        await using var transaction = await SupperServingsService.BeginAsync(_dbContext, CancellationToken.None);
        var sourceMonday = context.WeekStart(dto.WeekOffset);
        var targetMonday = context.WeekStart(targetWeekOffset);

        var fromDate = dto.FromIndex is { } fromIndex ? sourceMonday.AddDays(fromIndex) : (DateOnly?)null;
        var fromEvent = fromDate is { } explicitFromDate
            ? await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.Date == explicitFromDate)
            : null;

        fromEvent ??= await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.RecipeId == dto.RecipeId);
        if (fromEvent == null) return null;

        if (fromEvent.RecipeId != dto.RecipeId)
        {
            _logger.LogWarning(
                "Cross-week move ignored: source slot {FromDate} does not contain recipe {RecipeId}.",
                fromEvent.Date,
                dto.RecipeId);
            return null;
        }

        var sourceDate = fromEvent.Date;
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
            return null;
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

        await EnlistSupperWeeksAsync([sourceMonday, targetMonday], CancellationToken.None);
        if (transaction is not null) { await transaction.CommitAsync(); await transaction.DisposeAsync(); }
        // Movement is committed. Follow-up failures must not invite replaying it.
        var complete = true;
        foreach (var monday in new[] { sourceMonday, targetMonday })
        {
            var offset = GetWeekOffset(monday, context);
            complete &= await RefreshCommittedWeekAsync(monday, context, excludeConnectionId, echoSeq);
        }
        return new MoveScheduleResultDto("Recipe moved", true, sourceDate, targetMonday.AddDays(targetIndex),
            new[] { sourceMonday, targetMonday }, complete);
    }

    public async Task<DeferScheduleResultDto> DeferRecipeAsync(
        DeferScheduleDto dto,
        string? excludeConnectionId = null,
        int? echoSeq = null,
        CancellationToken ct = default,
        DateOnly? referenceWeekStartDate = null,
        int targetWeekOffset = 1)
    {
        var context = _calendar.Capture(_clock.UtcNow, referenceWeekStartDate);
        var nextWeekStart = context.WeekStart(targetWeekOffset);
        await using var transaction = await SupperServingsService.BeginAsync(_dbContext, ct);
        var source = await _dbContext.CalendarEvents
            .Include(e => e.Recipe)
            .SingleOrDefaultAsync(e => e.Date == dto.SourceDate && e.RecipeId == dto.RecipeId, ct)
            ?? throw new KeyNotFoundException("The scheduled recipe was not found on the requested source date.");

        if (source.Status == CalendarEventStatus.AwaitingConsensus)
            throw new DeferScheduleConflictException("Meals awaiting consensus cannot be deferred.");

        var sourceMonday = GetMonday(source.Date);
        var destinationDate = await FindFirstAvailableDateAsync(nextWeekStart, ct);
        var destinationMonday = GetMonday(destinationDate);
        var voteCount = source.VoteCount;
        var wasCooked = source.Status == CalendarEventStatus.Cooked;

        if (!await _dbContext.WeeklyPlans.AnyAsync(p => p.WeekStartDate == destinationMonday, ct))
        {
            _dbContext.WeeklyPlans.Add(new WeeklyPlan
            {
                CreatedAt = _clock.UtcNow,
                Id = Guid.NewGuid(),
                WeekStartDate = destinationMonday,
                Status = WeeklyPlanStatus.Draft
            });
        }

        if (source.Status == CalendarEventStatus.Skipped)
        {
            source.RecipeId = null;
            _dbContext.CalendarEvents.Add(new CalendarEvent
            {
                Id = Guid.NewGuid(),
                RecipeId = dto.RecipeId,
                Date = destinationDate,
                Status = CalendarEventStatus.Planned,
                VoteCount = voteCount
            });
        }
        else
        {
            source.Date = destinationDate;
            source.Status = CalendarEventStatus.Planned;
            ClearPreparation(source);
        }

        await SaveChangesAndRecalculateLastCookedDatesAsync(wasCooked ? [dto.RecipeId] : [], ct);

        var mondays = new[] { sourceMonday, destinationMonday }.Distinct().ToArray();
        await EnlistSupperWeeksAsync(mondays, ct);
        if (transaction is not null) { await transaction.CommitAsync(ct); await transaction.DisposeAsync(); }
        foreach (var monday in mondays)
            await RefreshCommittedWeekAsync(monday, context, excludeConnectionId, echoSeq);

        var offsetFromCurrent = GetWeekOffset(destinationMonday, context);
        var recipeName = source.Recipe?.Name ?? "meal";
        var spillPrefix = destinationMonday > nextWeekStart ? "Next week is full. " : string.Empty;
        return new DeferScheduleResultDto(
            destinationDate,
            offsetFromCurrent,
            $"{spillPrefix}Moved {recipeName} to {destinationDate:dddd, MMMM d}.");
    }

    public async Task FinalizeOverdueMealsAsync(CancellationToken ct = default)
    {
        var context = _calendar.Capture(_clock.UtcNow);
        var today = context.Today;
        var overdue = await _dbContext.CalendarEvents
            .Where(e => e.Date < today && e.RecipeId != null &&
                (e.Status == CalendarEventStatus.Planned || e.Status == CalendarEventStatus.Locked))
            .ToListAsync(ct);
        if (overdue.Count == 0) return;

        var recipeIds = overdue.Select(e => e.RecipeId!.Value).Distinct().ToArray();
        foreach (var @event in overdue) @event.Status = CalendarEventStatus.Cooked;
        await SaveChangesAndRecalculateLastCookedDatesAsync(recipeIds, ct);

        foreach (var monday in overdue.Select(e => GetMonday(e.Date)).Distinct())
        {
            var offset = GetWeekOffset(monday, context);
            await _publisher.PublishWeekUpdatedAsync(await ReadScheduleAsync(offset, context));
        }
    }

    private async Task<DateOnly> FindFirstAvailableDateAsync(DateOnly startDate, CancellationToken ct)
    {
        for (var date = startDate; ; date = date.AddDays(1))
            if (!await _dbContext.CalendarEvents.AnyAsync(e => e.Date == date, ct)) return date;
    }

    private async Task RecalculateLastCookedDateAsync(Guid recipeId, CancellationToken ct, DateTimeOffset? observedLegacyCookingAt = null)
    {
        var recipe = await _dbContext.Recipes.FindAsync([recipeId], ct);
        if (recipe is null) return;
        var latest = await _dbContext.CalendarEvents
            .Where(e => e.RecipeId == recipeId && e.Status == CalendarEventStatus.Cooked)
            .Select(e => new { e.Date, e.PreparedAtUtc })
            .ToListAsync(ct);
        // An explicit legacy action still means its captured instant, not a calendar-date
        // inference. Only a later observed preparation may protect newer history from it.
        recipe.LastCookedDate = observedLegacyCookingAt is { } observed
            ? latest.Select(e => e.PreparedAtUtc).Append(observed).Max()
            : latest.Select(e => (DateTimeOffset?)(e.PreparedAtUtc ?? new DateTimeOffset(e.Date.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero))).Max();
    }

    private async Task SaveChangesAndRecalculateLastCookedDatesAsync(IEnumerable<Guid> recipeIds, CancellationToken ct)
    {
        await using var transaction = _dbContext.Database.IsRelational() && _dbContext.Database.CurrentTransaction is null
            ? await _dbContext.Database.BeginTransactionAsync(ct) : null;
        await _dbContext.SaveChangesAsync(ct);

        foreach (var recipeId in recipeIds.Distinct())
            await RecalculateLastCookedDateAsync(recipeId, ct);

        await _dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
    }

    private async Task SwapInternalAsync(DateOnly fromDate, DateOnly toDate)
    {
        var fromEvent = await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.Date == fromDate);
        var toEvent = await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.Date == toDate);

        if (fromEvent != null && toEvent != null)
        {
            _logger.LogInformation("Swapping recipes between {From} and {To}", fromDate, toDate);
            SwapPreparation(fromEvent, toEvent);
            (fromEvent.RecipeId, toEvent.RecipeId) = (toEvent.RecipeId, fromEvent.RecipeId);
            (fromEvent.VoteCount, toEvent.VoteCount) = (toEvent.VoteCount, fromEvent.VoteCount);
            (fromEvent.Status, toEvent.Status) = (toEvent.Status, fromEvent.Status);
            (fromEvent.NonCookingKind, toEvent.NonCookingKind) = (toEvent.NonCookingKind, fromEvent.NonCookingKind);
            (fromEvent.NonCookingLabel, toEvent.NonCookingLabel) = (toEvent.NonCookingLabel, fromEvent.NonCookingLabel);
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

    public async Task<DisplacedRecipeDto?> AssignRecipeAsync(AssignScheduleDto dto, string? excludeConnectionId = null, DateOnly? referenceWeekStartDate = null)
    {
        var context = _calendar.Capture(_clock.UtcNow, referenceWeekStartDate);
        var monday = context.WeekStart(dto.WeekOffset);
        var date = monday.AddDays(dto.DayIndex);

        await using var transaction = await SupperServingsService.BeginAsync(_dbContext, CancellationToken.None);
        DisplacedRecipeDto? displaced = null;
        var lostPreparedRecipes = new HashSet<Guid>();
        if (dto.RequireEmpty)
        {
            if (referenceWeekStartDate is null || dto.DayIndex is < 0 or > 6)
                throw new ArgumentException("Guarded assignment requires an explicit target.");
            await AssignEmptySupperAsync(dto.RecipeId, date, monday);
        }
        else
        {
            await EnsureWeekPlanExistsAsync(monday);

            var existingEvent = await _dbContext.CalendarEvents
                .Include(e => e.Recipe)
                .FirstOrDefaultAsync(e => e.Date == date);

            if (existingEvent != null)
            {
                if (existingEvent.PreparedAtUtc is not null && existingEvent.RecipeId is { } preparedRecipe)
                    lostPreparedRecipes.Add(preparedRecipe);
                ClearPreparation(existingEvent);
                // Sunday (dayIndex 6) displacement: carry the evicted recipe forward to next week Monday
                // rather than silently dropping it.
                if (existingEvent.RecipeId.HasValue && dto.DayIndex == 6)
                {
                    var nextWeekOffset = dto.WeekOffset + 1;
                    var nextMonday = context.WeekStart(nextWeekOffset);
                    await EnsureWeekPlanExistsAsync(nextMonday);

                    var nextMonday_slot = await _dbContext.CalendarEvents
                        .FirstOrDefaultAsync(e => e.Date == nextMonday);

                    if (nextMonday_slot != null)
                    {
                        if (nextMonday_slot.PreparedAtUtc is not null && nextMonday_slot.RecipeId is { } preparedTarget)
                            lostPreparedRecipes.Add(preparedTarget);
                        ClearPreparation(nextMonday_slot);
                        nextMonday_slot.RecipeId = existingEvent.RecipeId;
                        nextMonday_slot.Status = CalendarEventStatus.Planned;
                        nextMonday_slot.NonCookingKind = null;
                        nextMonday_slot.NonCookingLabel = null;
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
                existingEvent.NonCookingKind = null;
                existingEvent.NonCookingLabel = null;
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

            await SaveChangesAndRecalculateLastCookedDatesAsync(lostPreparedRecipes, CancellationToken.None);

        }

        var affected = displaced is null ? new[] { monday } : new[] { monday, context.WeekStart(dto.WeekOffset + 1) };
        await EnlistSupperWeeksAsync(affected, CancellationToken.None);
        if (transaction is not null) { await transaction.CommitAsync(); await transaction.DisposeAsync(); }
        foreach (var week in affected)
            await RefreshCommittedWeekAsync(week, context, excludeConnectionId);
        try { await _publisher.PublishFillTheGapInvalidatedAsync(dto.WeekOffset, monday, excludeConnectionId); }
        catch (Exception ex) { _logger.LogWarning(ex, "Assignment committed; suggestion publication failed for {Week}", monday); }
        return displaced;
    }

    public async Task<List<ScheduleRecipeDto>> FillTheGapAsync(int weekOffset = 0, DateOnly? referenceWeekStartDate = null)
    {
        await using var rankingBoundary = await VotingBoundary.BeginAsync(_dbContext);
        var history = await _historicalInterest.CaptureAsync();
        var context = _calendar.Capture(_clock.UtcNow, referenceWeekStartDate);
        var monday = context.WeekStart(weekOffset);
        var sunday = monday.AddDays(6);

        var assignedIds = await _dbContext.CalendarEvents
            .Where(e => e.Date >= monday && e.Date <= sunday)
            .Where(e => e.RecipeId != null)
            .Select(e => e.RecipeId!.Value)
            .ToHashSetAsync();

        var results = await _dbContext.RecipeMatches
            .Join(_dbContext.Recipes, m => m.RecipeId, r => r.Id, (m, r) => new { Match = m, Recipe = r })
            .Where(x => !assignedIds.Contains(x.Recipe.Id) && x.Recipe.IsReady && !x.Recipe.CookedSuppressed)
            .OrderBy(x => x.Recipe.LastCookedDate == null ? 0 : 1)
            .ThenBy(x => x.Recipe.LastCookedDate)
            .ThenByDescending(x => x.Match.LikeCount)
            .ThenBy(x => x.Recipe.Id)
            .Take(5)
            .ToListAsync();

        var dtos = results
            .Select(x => new ScheduleRecipeDto(
                x.Recipe.Id,
                x.Recipe.Name,
                $"/api/recipes/{x.Recipe.Id}/hero",
                x.Match.LikeCount,
                RecipeService.DeserializeIngredients(x.Recipe.Ingredients),
                x.Recipe.Description,
                x.Recipe.TotalTime))
            .ToList();

        if (dtos.Count < 5 && history.Counts.Count > 0)
        {
            var historicalIds = history.Counts.Keys.ToArray();
            var used = dtos.Select(x => x.Id).ToArray();
            var historical = await _dbContext.Recipes
                .Where(r => r.IsReady && !r.CookedSuppressed && historicalIds.Contains(r.Id) && !used.Contains(r.Id) && !assignedIds.Contains(r.Id))
                .OrderBy(r => r.LastCookedDate == null ? 0 : 1).ThenBy(r => r.LastCookedDate).ThenBy(r => r.Id)
                .Take(5 - dtos.Count).ToListAsync();
            dtos.AddRange(historical.Select(r => new ScheduleRecipeDto(r.Id, r.Name, $"/api/recipes/{r.Id}/hero", null,
                RecipeService.DeserializeIngredients(r.Ingredients), r.Description, r.TotalTime)));
        }

        if (dtos.Count < 5)
        {
            var remaining = 5 - dtos.Count;
            var usedIds = dtos.Select(x => x.Id).ToHashSet();

            var fallback = await _dbContext.DiscoveryRecipes
                .Where(r => !usedIds.Contains(r.Id) && !assignedIds.Contains(r.Id))
                .Where(r => !_dbContext.Recipes.Any(recipe => recipe.Id == r.Id && recipe.CookedSuppressed))
                .OrderBy(r => r.LastCookedDate == null ? 0 : 1)
                .ThenBy(r => r.LastCookedDate)
                .ThenByDescending(r => r.VoteCount)
                .ThenBy(r => r.Id)
                .Take(remaining)
                .ToListAsync();

            dtos.AddRange(fallback
                .Select(dr => new ScheduleRecipeDto(
                    dr.Id,
                    dr.Name,
                    $"/api/recipes/{dr.Id}/hero",
                    null,
                    RecipeService.DeserializeIngredients(dr.Ingredients),
                    dr.Description,
                    dr.TotalTime)));
        }

        return dtos;
    }

    public async Task RemoveRecipeAsync(DateOnly date, string? excludeConnectionId = null, string? expectedPlanToken = null)
    {
        var context = _calendar.Capture(_clock.UtcNow);
        await using var transaction = await SupperServingsService.BeginAsync(_dbContext, CancellationToken.None);
        var @event = expectedPlanToken is null
            ? await _dbContext.CalendarEvents.FirstOrDefaultAsync(e => e.Date == date)
            : await RemoveExpectedSupperAsync(date, expectedPlanToken);
        if (@event != null)
        {
            // Derive the Monday of the week containing the removed event's date
            var monday = GetMonday(date);
            var weekOffset = GetWeekOffset(monday, context);

            if (expectedPlanToken is null)
            {
                _dbContext.CalendarEvents.Remove(@event);
                if (@event.Status == CalendarEventStatus.Cooked && @event.RecipeId is { } cookedRecipeId)
                    await SaveChangesAndRecalculateLastCookedDatesAsync([cookedRecipeId], CancellationToken.None);
                else
                    await _dbContext.SaveChangesAsync();
            }
            await EnlistSupperWeeksAsync([monday], CancellationToken.None);
            if (transaction is not null) { await transaction.CommitAsync(); await transaction.DisposeAsync(); }
            _logger.LogInformation("Removed recipe from date {Date}", date);

            await RefreshCommittedWeekAsync(monday, context, excludeConnectionId);
            try { await _publisher.PublishFillTheGapInvalidatedAsync(weekOffset, monday, excludeConnectionId); }
            catch (Exception ex) { _logger.LogWarning(ex, "Removal committed; suggestion publication failed for {Week}", monday); }
        }
    }

    public Task<SmartDefaultsDto> GetSmartDefaultsAsync(int weekOffset, DateOnly? referenceWeekStartDate = null) =>
        ReadSmartDefaultsAsync(weekOffset, _calendar.Capture(_clock.UtcNow, referenceWeekStartDate));

    private Task<SmartDefaultsDto> ReadSmartDefaultsAsync(int weekOffset, DeploymentCalendarContext context) =>
        new SmartDefaultsReader(_dbContext).ReadAsync(weekOffset, context);

    public async Task<bool> ValidateDayAsync(string dateStr, ValidationDto dto, string? excludeConnectionId = null)
    {
        var context = _calendar.Capture(_clock.UtcNow);
        var plan = dto.NonCooking;
        if (plan != null)
        {
            var label = plan.CustomLabel?.Trim();
            if (dto.Status != 3 || plan.Kind is not ("order_in" or "eating_out" or "mystery" or "custom") ||
                (plan.Kind == "mystery" ? plan.CustomLabel != null :
                    (plan.Kind == "custom" && string.IsNullOrWhiteSpace(label)) || (label?.EnumerateRunes().Count() ?? 0) > 80))
                throw new ArgumentException("Choose a valid non-cooking plan; messages must contain at most 80 characters and custom messages are required.");
            plan = plan with { CustomLabel = string.IsNullOrWhiteSpace(label) ? null : label };
        }
        // Ordinary legacy writes must inspect preparation under the same calendar lock as
        // guarded preparation. Keep typed non-cooking validation's existing Serializable policy.
        await using var transaction = dto.NonCooking is null
            ? await SupperServingsService.BeginAsync(_dbContext, CancellationToken.None)
            : _dbContext.Database.IsRelational()
                ? await _dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable)
                : null;
        async Task CommitPrimaryAsync()
        {
            if (transaction is null) return;
            await transaction.CommitAsync();
            await transaction.DisposeAsync();
        }
        var date = DateOnly.Parse(dateStr);
        var @event = await _dbContext.CalendarEvents
            .Include(e => e.Recipe)
            .FirstOrDefaultAsync(e => e.Date == date);

        if (plan != null && @event != null && (@event.RecipeId != null || @event.Status != CalendarEventStatus.Skipped))
            throw new NonCookingPlanConflictException("This day’s plan changed. Refresh it before marking it as non-cooking.");

        if (dto.Status == 2 && dto.RecipeId is { } cookedRecipeId)
        {
            var cookedRecipe = await _dbContext.Recipes.FirstOrDefaultAsync(r => r.Id == cookedRecipeId && r.DeletedAt == null)
                ?? throw new KeyNotFoundException("Recipe not found");
            // Cooking an unscheduled recipe must not complete another recipe's meal.
            if (@event?.RecipeId != cookedRecipeId)
            {
                await RecalculateLastCookedDateAsync(cookedRecipe.Id, CancellationToken.None, context.CapturedAtUtc);
                await _dbContext.SaveChangesAsync();
                await CommitPrimaryAsync();
                await _publisher.PublishFillTheGapInvalidatedAsync(GetWeekOffset(GetMonday(date), context), GetMonday(date), excludeConnectionId);
                return false;
            }
        }

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
                    NonCookingKind = plan?.Kind,
                    NonCookingLabel = plan?.CustomLabel,
                };
                _dbContext.CalendarEvents.Add(newEvent);
                try
                {
                    await _dbContext.SaveChangesAsync();
                    await CommitPrimaryAsync();
                }
                catch (DbUpdateException ex) when (plan != null && ex.InnerException is Npgsql.PostgresException { SqlState: "23505" or "40001" })
                {
                    _dbContext.Entry(newEvent).State = EntityState.Detached;
                    throw new NonCookingPlanConflictException("This day’s plan changed. Refresh it before retrying.");
                }
                _logger.LogInformation("Created ordered-in CalendarEvent for date {Date} with no recipe", date);

                await _publisher.PublishSlotUpdatedAsync(date, null, dto.Status, excludeConnectionId, GetNonCookingPlan(newEvent), newEvent.Id);
                return false;
            }
            throw new Exception("No meal planned for this date");
        }

        if (@event.PreparedAtUtc is not null)
        {
            if (dto.Status == 2 && (dto.RecipeId is null || dto.RecipeId == @event.RecipeId)) return true;
            throw new NonCookingPlanConflictException("An already prepared supper cannot be changed through legacy completion.");
        }
        var oldStatus = @event.Status;
        @event.Status = (CalendarEventStatus)dto.Status;
        if (plan != null)
        {
            @event.NonCookingKind = plan.Kind;
            @event.NonCookingLabel = plan.CustomLabel;
        }
        else if (dto.Status != 3)
        {
            @event.NonCookingKind = null;
            @event.NonCookingLabel = null;
        }

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
            await RecalculateLastCookedDateAsync(@event.Recipe.Id, CancellationToken.None, context.CapturedAtUtc);
            _logger.LogInformation("Updated LastCookedDate for recipe {RecipeId}", @event.RecipeId);
        }

        try
        {
            await _dbContext.SaveChangesAsync();
            await CommitPrimaryAsync();
        }
        catch (DbUpdateException ex) when (plan != null && ex.InnerException is Npgsql.PostgresException { SqlState: "40001" })
        {
            throw new NonCookingPlanConflictException("This day’s plan changed. Refresh it before retrying.");
        }

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

        await _publisher.PublishSlotUpdatedAsync(date, recipeDto, dto.Status, excludeConnectionId, GetNonCookingPlan(@event), @event.Id);
        return dto.Status == 2;
    }

    private static NonCookingPlanDto? GetNonCookingPlan(CalendarEvent? entry) =>
        entry is { Status: CalendarEventStatus.Skipped, RecipeId: null }
            ? new NonCookingPlanDto(entry.NonCookingKind ?? "order_in", entry.NonCookingLabel)
            : null;

    public Task<Dictionary<string, bool>> UpdateGroceryStateAsync(
        int weekOffset,
        Dictionary<string, bool> groceryState,
        string? excludeConnectionId = null,
        CancellationToken ct = default, DateOnly? referenceWeekStartDate = null) =>
        WriteGroceryStateAsync(weekOffset, _ => new Dictionary<string, bool>(groceryState), groceryState.Where(x => x.Value).Select(x => x.Key), excludeConnectionId, ct, referenceWeekStartDate);

    public async Task ToggleGroceryItemAsync(
        int weekOffset,
        string ingredientName,
        bool checked_,
        string? excludeConnectionId = null,
        CancellationToken ct = default, DateOnly? referenceWeekStartDate = null)
    {
        await WriteGroceryStateAsync(weekOffset, current =>
        {
            current[ingredientName] = checked_;
            return current;
        }, checked_ ? [ingredientName] : [], excludeConnectionId, ct, referenceWeekStartDate);
    }

    private Task<Dictionary<string, bool>> WriteGroceryStateAsync(int weekOffset,
        Func<Dictionary<string, bool>, Dictionary<string, bool>> update,
        IEnumerable<string> checkedNames, string? excludeConnectionId, CancellationToken ct, DateOnly? referenceWeekStartDate)
    {
        var monday = _calendar.Capture(_clock.UtcNow, referenceWeekStartDate).WeekStart(weekOffset);
        return groceryChecks.ProcessAsync(async db =>
        {
            var plan = await db.WeeklyPlans.FirstOrDefaultAsync(p => p.WeekStartDate == monday, ct)
                ?? throw new KeyNotFoundException($"Weekly plan for week starting {monday} not found.");
            var current = JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState ?? "{}") ?? [];
            var result = update(current);
            plan.GroceryState = JsonSerializer.Serialize(result);
            GroceryCheckCoordinator.ClearAcknowledgedReviews(plan, checkedNames);
            await db.SaveChangesAsync(ct);
            GroceryCheckCoordinator.SynchronizeTrackedPlan(_dbContext, monday, plan.GroceryState, plan.GroceryItems);
            await _publisher.PublishGroceryUpdatedAsync(weekOffset, result, monday, excludeConnectionId);
            return result;
        }, ct);
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
                CreatedAt = _clock.UtcNow,
                Id = Guid.NewGuid(),
                WeekStartDate = monday,
                Status = WeeklyPlanStatus.Draft
            });
            _logger.LogInformation("Created WeeklyPlan for week starting {Date}", monday);
            await _dbContext.SaveChangesAsync();
        }
    }

    private static DateOnly GetMonday(DateOnly date) => date.AddDays(-((int)date.DayOfWeek + 6) % 7);

    private int GetWeekOffset(DateOnly monday, DeploymentCalendarContext? context = null) =>
        (monday.DayNumber - (context ?? _calendar.Capture(_clock.UtcNow)).ReferenceWeekStartDate.DayNumber) / 7;
}
