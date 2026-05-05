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

    public Task PublishSlotUpdatedAsync(DateOnly date, ScheduleRecipeDto? recipe, int status)
        => _manager.BroadcastAsync("slot_updated", new
        {
            date = date.ToString("yyyy-MM-dd"),
            recipe,
            status
        });

    public Task PublishWeekUpdatedAsync(ScheduleDays schedule)
        => _manager.BroadcastAsync("week_updated", new { schedule });

    public Task PublishVoteUpdatedAsync(Guid recipeId, int voteCount)
        => _manager.BroadcastAsync("vote_updated", new { recipeId, voteCount });

    public Task PublishSmartDefaultsUpdatedAsync(int weekOffset, SmartDefaultsDto defaults)
        => _manager.BroadcastAsync("smart_defaults_updated", new { weekOffset, defaults });

    public Task PublishFillTheGapInvalidatedAsync(int weekOffset)
        => _manager.BroadcastAsync("fill_the_gap_invalidated", new { weekOffset });

    public Task PublishRecipeReadyAsync(Guid recipeId, string name, string? imageUrl)
        => _manager.BroadcastAsync("recipe_ready", new { recipeId, name, imageUrl });

    public Task PublishRecipeFailedAsync(Guid recipeId, string errorMessage, string failedStep, object? partialData)
        => _manager.BroadcastAsync("recipe_failed", new
        {
            recipeId,
            errorMessage,
            failedStep,
            partialData
        });

    public Task PublishGroceryUpdatedAsync(int weekOffset, Dictionary<string, bool> groceryState)
        => _manager.BroadcastAsync("grocery_updated", new { weekOffset, groceryState });
}
