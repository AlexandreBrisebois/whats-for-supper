using RecipeApi.Dto;

namespace RecipeApi.Infrastructure;

/// <summary>
/// Scoped wrapper around the singleton <see cref="SseConnectionManager"/>.
/// Translates domain events into SSE broadcasts with the correct event type
/// strings and serialised payloads.
/// </summary>
public class SseEventPublisher : IScheduleEventPublisher
{
    private readonly SseConnectionManager _manager;

    public SseEventPublisher(SseConnectionManager manager)
    {
        _manager = manager;
    }

    public Task PublishSlotUpdatedAsync(DateOnly date, ScheduleRecipeDto? recipe, int status, string? excludeConnectionId = null)
        => _manager.BroadcastAsync("slot_updated", new
        {
            date = date.ToString("yyyy-MM-dd"),
            recipe,
            status
        }, excludeConnectionId);

    public Task PublishWeekUpdatedAsync(ScheduleDays schedule, string? excludeConnectionId = null, int? echoSeq = null)
        => _manager.BroadcastAsync(
            "week_updated",
            echoSeq.HasValue ? new { schedule, echoSeq } : new { schedule },
            excludeConnectionId);

    public Task PublishVoteUpdatedAsync(Guid recipeId, int voteCount, string? excludeConnectionId = null)
        => _manager.BroadcastAsync("vote_updated", new { recipeId, voteCount }, excludeConnectionId);

    public Task PublishSmartDefaultsUpdatedAsync(int weekOffset, SmartDefaultsDto defaults, string? excludeConnectionId = null)
        => _manager.BroadcastAsync("smart_defaults_updated", new { weekOffset, defaults }, excludeConnectionId);

    public Task PublishFillTheGapInvalidatedAsync(int weekOffset, string? excludeConnectionId = null)
        => _manager.BroadcastAsync("fill_the_gap_invalidated", new { weekOffset }, excludeConnectionId);

    public Task PublishRecipeReadyAsync(Guid recipeId, string name, string? imageUrl, string? excludeConnectionId = null)
        => _manager.BroadcastAsync("recipe_ready", new { recipeId, name, imageUrl }, excludeConnectionId);

    public Task PublishRecipeFailedAsync(Guid recipeId, Guid workflowInstanceId, string errorMessage, string failedStep, object? partialData, string? excludeConnectionId = null)
        => _manager.BroadcastAsync("recipe_failed", new
        {
            recipeId,
            workflowInstanceId,
            errorMessage,
            failedStep,
            partialData
        }, excludeConnectionId);

    public Task PublishGroceryUpdatedAsync(int weekOffset, Dictionary<string, bool> groceryState, string? excludeConnectionId = null)
        => _manager.BroadcastAsync("grocery_updated", new { weekOffset, groceryState }, excludeConnectionId);
}
