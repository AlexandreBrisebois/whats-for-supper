using Microsoft.EntityFrameworkCore;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public partial class ScheduleService
{
    private async Task<MoveScheduleResultDto> MoveDeferAsync(
        MoveScheduleDto dto,
        DeploymentCalendarContext context,
        string? excludeConnectionId,
        int? echoSeq,
        CancellationToken ct)
    {
        if (dto.CookedDisposition is not (null or "reset" or "preserve"))
            throw new ArgumentException("cookedDisposition must be 'reset' or 'preserve'.");

        var sourceNonCooking = dto.SourceNonCooking is not null
            ? NormalizeNonCookingPlan(dto.SourceNonCooking, allowMystery: false)
            : null;

        DateOnly sourceDate;
        if (dto.SourceDate is { } explicitSourceDate)
        {
            sourceDate = explicitSourceDate;
        }
        else if (dto.FromIndex is >= 0 and <= 6)
        {
            sourceDate = context.WeekStart(dto.WeekOffset).AddDays(dto.FromIndex.Value);
        }
        else
        {
            throw new ArgumentException("Defer requires an exact sourceDate or fromIndex in 0..6.");
        }

        var targetWeekOffset = dto.TargetWeekOffset ?? 1;
        var nextWeekStart = context.WeekStart(targetWeekOffset);

        DateOnly sourceMonday;
        DateOnly destinationDate;
        DateOnly destinationMonday;
        DateOnly[] mondays;
        string recipeName;

        await using (var transaction = await SupperServingsService.BeginAsync(_dbContext, ct))
        {
            var source = await _dbContext.CalendarEvents
                .Include(e => e.Recipe)
                .SingleOrDefaultAsync(e => e.Date == sourceDate && e.RecipeId == dto.RecipeId, ct)
                ?? throw new KeyNotFoundException("The scheduled recipe was not found on the requested source date.");

            if (source.Status == CalendarEventStatus.AwaitingConsensus)
                throw new DeferScheduleConflictException("Meals awaiting consensus cannot be deferred.");

            sourceMonday = GetMonday(source.Date);
            destinationDate = await FindFirstAvailableDateAsync(nextWeekStart, ct);
            destinationMonday = GetMonday(destinationDate);
            // Validate destination week range before any write.
            context.WeekStart(GetWeekOffset(destinationMonday, context)).AddDays(6);

            var voteCount = source.VoteCount;
            var wasCooked = source.Status == CalendarEventStatus.Cooked;
            var preserveCooked = wasCooked && dto.CookedDisposition == "preserve";
            recipeName = source.Recipe?.Name ?? "meal";

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

            if (sourceNonCooking is not null || source.Status == CalendarEventStatus.Skipped)
            {
                var destinationEvent = new CalendarEvent
                {
                    Id = Guid.NewGuid(),
                    RecipeId = dto.RecipeId,
                    Date = destinationDate,
                    Status = preserveCooked ? CalendarEventStatus.Cooked : CalendarEventStatus.Planned,
                    VoteCount = voteCount
                };
                if (preserveCooked) CopyPreparation(source, destinationEvent);

                source.RecipeId = null;
                source.Status = CalendarEventStatus.Skipped;
                ClearPreparation(source);
                if (sourceNonCooking is not null)
                {
                    source.VoteCount = 0;
                    source.NonCookingKind = sourceNonCooking.Kind;
                    source.NonCookingLabel = sourceNonCooking.CustomLabel;
                }
                _dbContext.CalendarEvents.Add(destinationEvent);
            }
            else
            {
                source.Date = destinationDate;
                if (!preserveCooked)
                {
                    source.Status = CalendarEventStatus.Planned;
                    ClearPreparation(source);
                }
            }

            await SaveChangesAndRecalculateLastCookedDatesAsync(wasCooked && !preserveCooked ? [dto.RecipeId] : [], ct);

            mondays = new[] { sourceMonday, destinationMonday }.Distinct().ToArray();
            await EnlistSupperWeeksAsync(mondays, ct);
            if (transaction is not null) await transaction.CommitAsync(ct);
        }

        // Follow-ups cannot undo a committed deferral. Run them independently after transaction disposal.
        var complete = true;
        foreach (var monday in mondays)
            complete &= await RefreshCommittedWeekAsync(monday, context, excludeConnectionId, echoSeq);

        var offsetFromCurrent = GetWeekOffset(destinationMonday, context);
        var spillPrefix = destinationMonday > nextWeekStart ? "Next week is full. " : string.Empty;
        return new MoveScheduleResultDto(
            $"{spillPrefix}Moved {recipeName} to {destinationDate:dddd, MMMM d}.",
            Moved: true,
            SourceDate: sourceDate,
            DestinationDate: destinationDate,
            AffectedWeekStartDates: mondays,
            RefreshComplete: complete,
            ScheduledWeekOffset: offsetFromCurrent);
    }
}
