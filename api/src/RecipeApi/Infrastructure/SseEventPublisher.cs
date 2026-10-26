using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Infrastructure;

/// <summary>
/// Scoped wrapper around the singleton <see cref="SseConnectionManager"/>.
/// Translates domain events into SSE broadcasts with the correct event type
/// strings and serialised payloads.
/// </summary>
public class SseEventPublisher : IScheduleEventPublisher
{
    private readonly SseConnectionManager _manager;
    private readonly VotingSession? _session;

    public SseEventPublisher(SseConnectionManager manager, VotingSession? session = null)
    {
        _manager = manager;
        _session = session;
    }

    public Task PublishSlotUpdatedAsync(DateOnly date, ScheduleRecipeDto? recipe, int status, string? excludeConnectionId = null, NonCookingPlanDto? nonCooking = null)
        => PublishAndRefreshAsync("slot_updated", new
        {
            date = date.ToString("yyyy-MM-dd"),
            recipe,
            status,
            nonCooking
        }, excludeConnectionId, DeploymentCalendar.Monday(date));

    public Task PublishWeekUpdatedAsync(ScheduleDays schedule, string? excludeConnectionId = null, int? echoSeq = null)
        => PublishAndRefreshAsync(
            "week_updated",
            echoSeq.HasValue ? new { schedule, echoSeq } : new { schedule },
            excludeConnectionId, schedule.WeekStartDate);

    public Task PublishVotingSessionUpdatedAsync(VotingSessionSnapshot session)
        => _manager.BroadcastAsync("voting_session_updated", new { session });

    public Task PublishVoteUpdatedAsync(Guid recipeId, int voteCount, string? excludeConnectionId = null)
        => _manager.BroadcastAsync("vote_updated", new { recipeId, voteCount }, excludeConnectionId);

    public Task PublishSmartDefaultsUpdatedAsync(int weekOffset, SmartDefaultsDto defaults, string? excludeConnectionId = null)
        => _manager.BroadcastAsync("smart_defaults_updated", new { weekOffset, defaults }, excludeConnectionId);

    public Task PublishFillTheGapInvalidatedAsync(int weekOffset, DateOnly weekStartDate, string? excludeConnectionId = null)
        => _manager.BroadcastAsync("fill_the_gap_invalidated", new { weekOffset, weekStartDate }, excludeConnectionId);

    public Task PublishDemoResetAsync(Guid generation)
        => _manager.BroadcastAsync("demo_reset", new { generation });

    public Task PublishAllSuggestionsInvalidatedAsync()
        => PublishAndRefreshAsync("fill_the_gap_invalidated", new { allWeeks = true });

    public Task PublishRecipeReadyAsync(Guid recipeId, string name, string? imageUrl, string? excludeConnectionId = null)
        => PublishAndRefreshAsync("recipe_ready", new { recipeId, name, imageUrl }, excludeConnectionId);

    public Task PublishRecipeFailedAsync(Guid recipeId, Guid workflowInstanceId, string errorMessage, string failedStep, object? partialData, string? excludeConnectionId = null)
        => PublishAndRefreshAsync("recipe_failed", new
        {
            recipeId,
            workflowInstanceId,
            errorMessage,
            failedStep,
            partialData
        }, excludeConnectionId);

    public Task PublishGroceryUpdatedAsync(int weekOffset, Dictionary<string, bool> groceryState, DateOnly weekStartDate, string? excludeConnectionId = null)
        => _manager.BroadcastAsync("grocery_updated", new { weekOffset, weekStartDate, groceryState }, excludeConnectionId);

    public Task PublishGroceryExtrasUpdatedAsync(DateOnly weekStartDate, IReadOnlyList<GroceryExtraDto> groceryExtras, string? excludeConnectionId = null)
        => _manager.BroadcastAsync("grocery_extras_updated", new
        {
            weekStartDate,
            groceryExtras = groceryExtras.Select(x => new
            {
                id = x.Id,
                lineageId = x.LineageId,
                occurrenceWeekStartDate = x.OccurrenceWeekStartDate,
                name = x.Name,
                normalizedKey = x.NormalizedKey,
                grocerySection = x.GrocerySection,
                @checked = x.Checked,
                version = x.Version,
                source = x.Source,
                readOnly = x.ReadOnly
            })
        }, excludeConnectionId);
    private async Task PublishAndRefreshAsync(string eventType, object payload, string? excludeConnectionId = null, DateOnly? affectedWeek = null)
    {
        await _manager.BroadcastAsync(eventType, payload, excludeConnectionId);
        if (_session is not null) await _session.RefreshAfterMutationAsync(affectedWeek);
    }

}
