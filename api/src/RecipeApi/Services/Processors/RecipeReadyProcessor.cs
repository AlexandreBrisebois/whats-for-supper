using System.Text.Json;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>
/// Finalizes the recipe state to mark it as ready for discovery.
/// This processor runs as the final step in recipe import/describe workflows.
/// </summary>
public class RecipeReadyProcessor(
    RecipeDbContext db,
    ILogger<RecipeReadyProcessor> logger,
    IScheduleEventPublisher publisher) : IWorkflowProcessor
{
    public string ProcessorName => "RecipeReady";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(task.Payload))
            throw new ArgumentException("Task payload is empty.");

        using var doc = JsonDocument.Parse(task.Payload);
        if (!doc.RootElement.TryGetProperty("recipeId", out var idProp) &&
            !doc.RootElement.TryGetProperty("RecipeId", out idProp))
            throw new ArgumentException("Task payload does not contain recipeId.");

        var recipeId = idProp.GetGuid();

        var recipe = await db.Recipes.FindAsync([recipeId], ct);
        if (recipe is null)
        {
            logger.LogWarning("RecipeReady: recipe {RecipeId} not found — no-op", recipeId);
            return new { Message = $"Recipe {recipeId} not found — no-op" };
        }

        // If already finalized, this is a no-op to avoid unnecessary DB writes and 
        // to maintain the integrity of UpdatedAt (fixes integration tests).
        if (recipe.IsReady && recipe.IsDiscoverable)
        {
            logger.LogInformation("Recipe {RecipeId} is already finalized — skipping", recipeId);
            return new { Status = "AlreadyReady", RecipeId = recipeId };
        }

        recipe.IsDiscoverable = true;
        recipe.IsReady = true;
        recipe.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);

        logger.LogInformation("Recipe {RecipeId} marked as READY and DISCOVERABLE", recipeId);

        // Publish event for real-time UI updates (e.g. Planner assignments)
        var name = recipe.Name ?? string.Empty;
        var imageUrl = recipe.ImageCount > 0 ? $"/api/recipes/{recipe.Id}/hero" : null;
        await publisher.PublishRecipeReadyAsync(recipeId, name, imageUrl);

        return new { Status = "Ready", RecipeId = recipeId };
    }
}
