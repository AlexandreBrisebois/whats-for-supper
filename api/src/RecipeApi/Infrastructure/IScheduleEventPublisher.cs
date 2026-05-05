using RecipeApi.Dto;

namespace RecipeApi.Infrastructure;

public interface IScheduleEventPublisher
{
    Task PublishSlotUpdatedAsync(DateOnly date, ScheduleRecipeDto? recipe, int status);
    Task PublishWeekUpdatedAsync(ScheduleDays schedule);
    Task PublishVoteUpdatedAsync(Guid recipeId, int voteCount);
    Task PublishSmartDefaultsUpdatedAsync(int weekOffset, SmartDefaultsDto defaults);
    Task PublishFillTheGapInvalidatedAsync(int weekOffset);
    Task PublishRecipeReadyAsync(Guid recipeId, string name, string? imageUrl);

    /// <summary>
    /// Published when a workflow instance reaches <see cref="RecipeApi.Models.WorkflowStatus.Failed"/>
    /// (all retries exhausted). NOT published on individual task failures or retry paths.
    /// </summary>
    Task PublishRecipeFailedAsync(Guid recipeId, string errorMessage, string failedStep, object? partialData);

    Task PublishGroceryUpdatedAsync(int weekOffset, Dictionary<string, bool> groceryState);
}
