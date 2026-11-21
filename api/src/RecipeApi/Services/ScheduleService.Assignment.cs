using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed class AssignmentConflictException(string message) : Exception(message);

public partial class ScheduleService
{
    private async Task AssignEmptySupperAsync(Guid recipeId, DateOnly date, DateOnly monday)
    {
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
        }
        catch (Exception ex) when (IsAssignmentRace(ex))
        {
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
