using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;
using RecipeApi.Dto;

namespace RecipeApi.Services;

public partial class ScheduleService
{
    private async Task EnlistSupperWeeksAsync(IEnumerable<DateOnly> weeks, CancellationToken ct)
    {
        var mondays = weeks.Distinct().Order().ToArray();
        var usual = await SupperServingsService.ReadUsualAsync(_dbContext, ct);
        await SupperServingsService.MaterializeInheritedAsync(_dbContext, _clock, _calendar, usual.Count, ct, mondays, preserveOverrides: false);
        await projectionInvalidation.EnlistWeeksAsync(mondays, ct);
    }

    // Existing movement responses retain their immediate best-effort follow-ups.
    // The enlisted job and stale metadata survive failure without replaying movement.
    private async Task<bool> RefreshCommittedWeekAsync(DateOnly monday, DeploymentCalendarContext context, string? excludeConnectionId, int? echoSeq = null)
    {
        var complete = true;
        var workflowId = _dbContext.WeeklyPlans.Local.SingleOrDefault(x => x.WeekStartDate == monday)?.ServingRefreshWorkflowId;
        try { await _groceryRecomputeService.RecomputeForWeekAsync(monday, CancellationToken.None, context); }
        catch (Exception ex)
        {
            complete = false;
            try
            {
                if (workflowId is { } ownedJob) await projectionInvalidation.MarkFailedAsync(monday, ownedJob, CancellationToken.None);
            }
            catch (Exception statusEx) { _logger.LogWarning(statusEx, "Plan committed; refresh failure status could not be persisted for {Week}", monday); }
            _logger.LogWarning(ex, "Plan committed; grocery refresh failed for {Week}", monday);
        }
        try { await _publisher.PublishWeekUpdatedAsync(await ReadScheduleAsync(GetWeekOffset(monday, context), context), excludeConnectionId, echoSeq); }
        catch (Exception ex) { complete = false; _logger.LogWarning(ex, "Plan committed; schedule publication failed for {Week}", monday); }
        return complete;
    }
}
