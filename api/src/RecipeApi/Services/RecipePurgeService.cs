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
        var configuredPin = Environment.GetEnvironmentVariable("ELEVATED_ACTIONS_PIN")?.Trim();
        elevatedPin = elevatedPin?.Trim();

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

        await using var transaction = await db.Database.BeginTransactionAsync();

        // Cancel pending index jobs before destructive work.
        await CancelPendingIndexJobsAsync(recipeId);

        var searchDocs = await db.RecipeSearchDocuments
            .IgnoreQueryFilters()
            .Where(d => d.RecipeId == recipeId)
            .ToListAsync();
        db.RecipeSearchDocuments.RemoveRange(searchDocs);

        var votes = await db.RecipeVotes
            .Where(v => v.RecipeId == recipeId)
            .ToListAsync();
        db.RecipeVotes.RemoveRange(votes);

        var calendarEvents = await db.CalendarEvents
            .Where(e => e.RecipeId == recipeId)
            .ToListAsync();
        db.CalendarEvents.RemoveRange(calendarEvents);

        // Filesystem first: if this fails, pending DB changes are not saved.
        DeleteRecipeDirectory(recipeId);

        db.Recipes.Remove(recipe);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

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

        // The caller persists these status changes with the rest of the purge.
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
