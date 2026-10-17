using System.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public partial class ScheduleService
{
    private async Task<MoveScheduleResultDto> MoveTomorrowAsync(
        MoveScheduleDto dto, DeploymentCalendarContext context, string? excludeConnectionId, int? echoSeq, CancellationToken ct)
    {
        if (dto.FromIndex is not (>= 0 and <= 6) || dto.ToIndex is < 0 or > 6)
            throw new ArgumentException("Tomorrow requires an exact supper source.");
        var sourceDate = context.WeekStart(dto.WeekOffset).AddDays(dto.FromIndex.Value);
        var destination = sourceDate.AddDays(1);
        if (context.WeekStart(dto.TargetWeekOffset ?? dto.WeekOffset).AddDays(dto.ToIndex) != destination)
            throw new ArgumentException("Tomorrow must target the next calendar day.");
        var affected = new SortedSet<DateOnly> { GetMonday(sourceDate), GetMonday(destination) };
        await using var transaction = _dbContext.Database.IsRelational()
            ? await _dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct) : null;
        try
        {
            var source = await _dbContext.CalendarEvents.SingleOrDefaultAsync(e => e.Date == sourceDate && e.MealSlot == 0, ct);
            if (source is null || source.RecipeId != dto.RecipeId)
                throw new TomorrowMoveConflictException("That meal changed. Refresh your plan before moving it.");
            static void CheckMovable(CalendarEvent entry)
            {
                if (entry.Status == CalendarEventStatus.Cooked)
                    throw new TomorrowMoveConflictException("A cooked meal blocks this move. Your plan has not changed.");
                if (entry.Status == CalendarEventStatus.AwaitingConsensus)
                    throw new TomorrowMoveConflictException("A meal is still awaiting the family’s choice. Your plan has not changed.");
            }
            CheckMovable(source);
            var chain = new List<CalendarEvent>();
            var emptyDate = destination;
            while (true)
            {
                var entry = await _dbContext.CalendarEvents.SingleOrDefaultAsync(e => e.Date == emptyDate && e.MealSlot == 0, ct);
                if (entry is null) break;
                CheckMovable(entry);
                chain.Add(entry);
                emptyDate = emptyDate.AddDays(1);
            }
            // Validate the final week range before any write, including DateOnly's upper boundary.
            context.WeekStart(GetWeekOffset(GetMonday(emptyDate), context)).AddDays(6);
            foreach (var entry in chain)
            {
                affected.Add(GetMonday(entry.Date));
                affected.Add(GetMonday(entry.Date.AddDays(1)));
            }
            foreach (var monday in affected) await EnsureWeekPlanExistsAsync(monday);
            // Flush from the empty end so PostgreSQL's immediate date/slot uniqueness remains true.
            foreach (var entry in chain.AsEnumerable().Reverse())
            {
                ct.ThrowIfCancellationRequested();
                entry.Date = entry.Date.AddDays(1);
                await _dbContext.SaveChangesAsync(ct);
            }
            if (dto.SourceDisposition == "order_in" || source.Status == CalendarEventStatus.Skipped)
            {
                _dbContext.CalendarEvents.Add(new CalendarEvent
                {
                    Id = Guid.NewGuid(),
                    Date = destination,
                    RecipeId = source.RecipeId,
                    Status = CalendarEventStatus.Planned,
                    MealSlot = source.MealSlot,
                    VoteCount = source.VoteCount,
                });
                source.RecipeId = null;
                source.VoteCount = 0;
                source.Status = CalendarEventStatus.Skipped;
                if (dto.SourceDisposition == "order_in")
                { source.NonCookingKind = "order_in"; source.NonCookingLabel = null; }
            }
            else source.Date = destination;
            await _dbContext.SaveChangesAsync(ct);
            if (transaction is not null) await transaction.CommitAsync(ct);
        }
        catch (Exception ex) when (IsTomorrowConcurrencyConflict(ex))
        {
            if (transaction is not null) await transaction.RollbackAsync(CancellationToken.None);
            _dbContext.ChangeTracker.Clear();
            throw new TomorrowMoveConflictException("Your plan changed during this move. Refresh it before trying again.");
        }
        // Follow-ups cannot undo a committed movement. Dispose the transaction before starting them.
        if (transaction is not null) await transaction.DisposeAsync();
        var complete = true;
        foreach (var monday in affected)
        {
            var offset = GetWeekOffset(monday, context);
            try { await _groceryRecomputeService.RecomputeForWeekAsync(monday, CancellationToken.None, context); }
            catch (Exception ex) { complete = false; _logger.LogWarning(ex, "Tomorrow committed; grocery refresh failed for {Week}", monday); }
            try { await _publisher.PublishWeekUpdatedAsync(await ReadScheduleAsync(offset, context), excludeConnectionId, echoSeq); }
            catch (Exception ex) { complete = false; _logger.LogWarning(ex, "Tomorrow committed; schedule publication failed for {Week}", monday); }
            try { await _publisher.PublishFillTheGapInvalidatedAsync(offset, monday, excludeConnectionId); }
            catch (Exception ex) { complete = false; _logger.LogWarning(ex, "Tomorrow committed; suggestion publication failed for {Week}", monday); }
        }
        return new MoveScheduleResultDto("Recipe moved", true, sourceDate, destination, affected.ToArray(), complete);
    }

    private static bool IsTomorrowConcurrencyConflict(Exception ex) =>
        ex is PostgresException { SqlState: PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.UniqueViolation or PostgresErrorCodes.DeadlockDetected }
        || (ex.InnerException is not null && IsTomorrowConcurrencyConflict(ex.InnerException));
}
