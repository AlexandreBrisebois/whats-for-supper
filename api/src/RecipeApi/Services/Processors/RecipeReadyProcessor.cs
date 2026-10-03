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
    IScheduleEventPublisher publisher,
    IRecipeStore? recipeStore = null) : IWorkflowProcessor
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
            // Repair metadata if an earlier attempt committed the DB before its file write failed.
            await RecordPdfReadinessAsync(recipeId, ct);
            logger.LogInformation("Recipe {RecipeId} is already finalized — skipping", recipeId);
            return new { Status = "AlreadyReady", RecipeId = recipeId };
        }

        recipe.IsDiscoverable = true;
        recipe.IsReady = true;
        recipe.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        await RecordPdfReadinessAsync(recipeId, ct);

        logger.LogInformation("Recipe {RecipeId} marked as READY and DISCOVERABLE", recipeId);

        // Publish event for real-time UI updates (e.g. Planner assignments)
        var name = recipe.Name ?? string.Empty;
        var imageUrl = recipe.ImageCount > 0 ? $"/api/recipes/{recipe.Id}/hero" : null;
        await publisher.PublishRecipeReadyAsync(recipeId, name, imageUrl);

        return new { Status = "Ready", RecipeId = recipeId };
    }

    private async Task RecordPdfReadinessAsync(Guid recipeId, CancellationToken ct)
    {
        if (recipeStore is null) return;
        await using var source = await recipeStore.ReadSourcePdfAsync(recipeId, ct);
        if (source is null) return;
        var info = await recipeStore.ReadInfoAsync(recipeId, ct)
            ?? throw new InvalidDataException("Retained PDF is missing its recipe metadata.");
        if (info.IsReady == true) return;
        info.IsReady = true;
        await recipeStore.WriteInfoAsync(info, ct);
    }
}
