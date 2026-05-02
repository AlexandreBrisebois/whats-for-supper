using System.Text.Json;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>
/// Ensures a recipe is marked as "ready" by the domain status logic.
///
/// A recipe is "ready" when:
///   1. Its Name is not null/empty.
///   2. Its ImageCount is greater than 0.
///
/// This processor:
///   1. Sets recipe.image_count = 1 if it is 0 (required for status "ready").
///   2. Logs a warning if Name is still missing (as it can't be "ready" without a name).
///
/// It no longer touches family_settings.
/// </summary>
public class RecipeReadyProcessor(
    RecipeDbContext db,
    ILogger<RecipeReadyProcessor> logger) : IWorkflowProcessor
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

        bool changed = false;

        // 1. Ensure ImageCount > 0
        if (recipe.ImageCount == 0)
        {
            recipe.ImageCount = 1;
            recipe.UpdatedAt = DateTimeOffset.UtcNow;
            changed = true;
            logger.LogInformation("RecipeReady: bumped image_count to 1 for recipe {RecipeId}", recipeId);
        }

        // 2. Validate Name presence (warning only, don't throw)
        if (string.IsNullOrWhiteSpace(recipe.Name))
        {
            logger.LogWarning("RecipeReady: recipe {RecipeId} still has no name — it will remain 'pending' in the UI", recipeId);
        }

        if (changed)
        {
            await db.SaveChangesAsync(ct);
        }

        return new { Message = $"Processed recipe {recipeId} readiness check." };
    }
}
