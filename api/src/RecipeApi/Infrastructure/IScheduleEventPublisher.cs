using RecipeApi.Dto;

namespace RecipeApi.Infrastructure;

public interface IScheduleEventPublisher
{
    Task PublishSlotUpdatedAsync(DateOnly date, ScheduleRecipeDto? recipe, int status, string? excludeConnectionId = null);
    Task PublishWeekUpdatedAsync(ScheduleDays schedule, string? excludeConnectionId = null, int? echoSeq = null);
    Task PublishVoteUpdatedAsync(Guid recipeId, int voteCount, string? excludeConnectionId = null);
    Task PublishSmartDefaultsUpdatedAsync(int weekOffset, SmartDefaultsDto defaults, string? excludeConnectionId = null);
    Task PublishFillTheGapInvalidatedAsync(int weekOffset, string? excludeConnectionId = null);
    Task PublishRecipeReadyAsync(Guid recipeId, string name, string? imageUrl, string? excludeConnectionId = null);

    /// <summary>
    /// Published when a workflow instance reaches <see cref="RecipeApi.Models.WorkflowStatus.Failed"/>
    /// (all retries exhausted). NOT published on individual task failures or retry paths.
    /// </summary>
    Task PublishRecipeFailedAsync(Guid recipeId, Guid workflowInstanceId, string errorMessage, string failedStep, object? partialData, string? excludeConnectionId = null);

    Task PublishGroceryUpdatedAsync(int weekOffset, Dictionary<string, bool> groceryState, string? excludeConnectionId = null);
}
