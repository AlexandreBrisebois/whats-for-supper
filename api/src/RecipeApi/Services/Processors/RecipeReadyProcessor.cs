using System.Text.Json;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>
/// Validates that a recipe can transition to "ready" by the domain status logic.
///
/// A recipe is "ready" when:
///   - Photo-upload path: Name != null AND ImageCount > 0
///   - Describe path:     Name != null AND IsSynthesized = true (set by RecipeAgent)
///
/// This processor does NOT mutate ImageCount or IsSynthesized — those are set
/// by the upstream processors (ImageService and RecipeAgent respectively).
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

        // For synthesized recipes, IsSynthesized is set by RecipeAgent — nothing to do here.
        // For photo-upload recipes, ImageCount is already > 0. No field manipulation needed.
        var isReady = (!string.IsNullOrWhiteSpace(recipe.Name) && recipe.ImageCount > 0)
                   || (!string.IsNullOrWhiteSpace(recipe.Name) && recipe.IsSynthesized);

        if (!isReady)
        {
            logger.LogWarning("RecipeReady: recipe {RecipeId} is not ready — Name={Name}, ImageCount={ImageCount}, IsSynthesized={IsSynthesized}",
                recipeId, recipe.Name, recipe.ImageCount, recipe.IsSynthesized);
        }

        return new { Message = $"Processed recipe {recipeId} readiness check." };
    }
}
