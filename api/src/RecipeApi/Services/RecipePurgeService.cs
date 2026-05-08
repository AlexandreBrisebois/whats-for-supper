using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class RecipePurgeService(RecipeDbContext db, RecipesRootResolver recipesRoot)
{
    /// <summary>
    /// Hard-delete a soft-deleted recipe. Filesystem cleanup runs first; DB deletion follows.
    /// Returns null when the recipe does not exist.
    /// </summary>
    public async Task<PurgeResult> PurgeAsync(Guid recipeId, string? elevatedPin)
    {
        var configuredPin = Environment.GetEnvironmentVariable("ELEVATED_ACTIONS_PIN");

        if (string.IsNullOrWhiteSpace(configuredPin))
            return PurgeResult.PinNotConfigured;

        if (string.IsNullOrWhiteSpace(elevatedPin) || elevatedPin != configuredPin)
            return PurgeResult.Forbidden;

        var recipe = await db.Recipes
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.Id == recipeId);

        if (recipe is null)
            return PurgeResult.NotFound;

        if (recipe.DeletedAt is null)
            return PurgeResult.NotInTrash;

        // Cancel pending index jobs before touching the DB
        await CancelPendingIndexJobsAsync(recipeId);

        // Filesystem first — if this fails, we do not delete the DB row
        DeleteRecipeDirectory(recipeId);

        // Remove search document (cascades via FK if the recipe row were deleted, but we
        // remove it explicitly here so the order is guaranteed and observable in tests)
        var searchDoc = await db.RecipeSearchDocuments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(d => d.RecipeId == recipeId);
        if (searchDoc is not null)
            db.RecipeSearchDocuments.Remove(searchDoc);

        db.Recipes.Remove(recipe);
        await db.SaveChangesAsync();

        return PurgeResult.Success;
    }

    private async Task CancelPendingIndexJobsAsync(Guid recipeId)
    {
        var recipeIdStr = recipeId.ToString();
        var pendingJobs = await db.WorkflowInstances
            .Where(w => w.Parameters != null
                        && w.Parameters.Contains(recipeIdStr)
                        && w.Status == WorkflowStatus.Pending)
            .ToListAsync();

        foreach (var job in pendingJobs)
            job.Status = WorkflowStatus.Failed;

        if (pendingJobs.Count > 0)
            await db.SaveChangesAsync();
    }

    private void DeleteRecipeDirectory(Guid recipeId)
    {
        var dir = Path.Combine(recipesRoot.Root, recipeId.ToString());
        if (Directory.Exists(dir))
            Directory.Delete(dir, recursive: true);
    }
}

public enum PurgeResult
{
    Success,
    NotFound,
    NotInTrash,
    Forbidden,
    PinNotConfigured,
}
