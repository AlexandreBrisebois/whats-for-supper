using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public interface ISupperProjectionPublisher
{
    Task PublishAsync(IReadOnlyList<DateOnly> weeks);
}

/// <summary>Postcommit schedule hints; publication failure never replays the confirmed write.</summary>
public sealed class SupperProjectionPublisher(ScheduleService schedule, IScheduleEventPublisher publisher, ILogger<SupperProjectionPublisher> logger) : ISupperProjectionPublisher
{
    public async Task PublishAsync(IReadOnlyList<DateOnly> weeks)
    {
        // A corrected unassigned recipe still changes an already-open proposed projection.
        // Reuse a current-week hint even when no persisted grocery inputs need work.
        if (weeks.Count == 0)
        {
            try { await publisher.PublishWeekUpdatedAsync(await schedule.GetScheduleAsync(0)); }
            catch (Exception ex) { logger.LogWarning(ex, "Recipe correction committed; could not publish ingredient-read hint"); }
            return;
        }
        foreach (var monday in weeks)
        {
            try { await publisher.PublishWeekUpdatedAsync(await schedule.GetScheduleAsync(0, monday)); }
            catch (Exception ex) { logger.LogWarning(ex, "Recipe correction committed; could not publish week {Week}", monday); }
        }
    }
}
