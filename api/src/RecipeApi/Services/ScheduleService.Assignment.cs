using System.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed class AssignmentConflictException(string message) : Exception(message);

public partial class ScheduleService
{
    private async Task AssignEmptySupperAsync(Guid recipeId, DateOnly date, DateOnly monday)
    {
        await using var transaction = _dbContext.Database.IsRelational()
            ? await _dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
        try
        {
            if (await _dbContext.CalendarEvents.AnyAsync(e => e.Date == date && e.MealSlot == 0))
                throw new AssignmentConflictException("That supper slot changed. Review your plan before saving.");
            await EnsureWeekPlanExistsAsync(monday);
            _dbContext.CalendarEvents.Add(new CalendarEvent
            {
                Id = Guid.NewGuid(),
                Date = date,
                MealSlot = 0,
                RecipeId = recipeId,
                Status = CalendarEventStatus.Planned,
            });
            await _dbContext.SaveChangesAsync();
            if (transaction is not null) await transaction.CommitAsync();
        }
        catch (Exception ex) when (IsAssignmentRace(ex))
        {
            // A failed PostgreSQL commit can already have completed the transaction.
            // Cleanup must preserve the supported conflict from the original database race.
            if (transaction is not null)
            {
                try { await transaction.RollbackAsync(); }
                catch (InvalidOperationException) { /* PostgreSQL already completed this failed transaction. */ }
            }
            _dbContext.ChangeTracker.Clear();
            throw new AssignmentConflictException("That supper slot changed. Review your plan before saving.");
        }
    }

    private static bool IsAssignmentRace(Exception ex)
    {
        var pg = ex as PostgresException;
        return pg is { SqlState: PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected }
            || pg is
            {
                SqlState: PostgresErrorCodes.UniqueViolation,
                ConstraintName: "calendar_events_date_slot_unique" or "weekly_plans_week_start_date_key"
            }
            || (ex.InnerException is not null && IsAssignmentRace(ex.InnerException));
    }
}
