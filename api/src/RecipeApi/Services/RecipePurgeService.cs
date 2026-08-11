using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class RecipePurgeService(
    RecipeDbContext db,
    RecipesRootResolver recipesRoot,
    ILogger<RecipePurgeService> logger)
{
    /// <summary>
    /// Hard-delete a soft-deleted recipe. Filesystem cleanup runs first; DB deletion follows.
    /// Returns null when the recipe does not exist.
    /// </summary>
    public async Task<PurgeResult> PurgeAsync(Guid recipeId, string? elevatedPin)
    {
        // Use Environment.GetEnvironmentVariable directly to support live changes 
        // and match existing integration test expectations.
        var rawConfiguredPin = Environment.GetEnvironmentVariable("ELEVATED_ACTIONS_PIN");

        var configuredPin = rawConfiguredPin?.Trim();

        // Strip literal quotes if present (common issue with .env files)
        if (!string.IsNullOrEmpty(configuredPin) && configuredPin.Length >= 2 && configuredPin.StartsWith("\"") && configuredPin.EndsWith("\""))
        {
            configuredPin = configuredPin[1..^1].Trim();
        }

        elevatedPin = elevatedPin?.Trim();

        if (string.IsNullOrWhiteSpace(configuredPin))
        {
            logger.LogWarning("Purge attempt for recipe {RecipeId} failed: ELEVATED_ACTIONS_PIN is not configured.", recipeId);
            return PurgeResult.PinNotConfigured;
        }

        if (string.IsNullOrWhiteSpace(elevatedPin))
        {
            logger.LogWarning("Purge attempt for recipe {RecipeId} failed: Provided PIN is empty.", recipeId);
            return PurgeResult.Forbidden;
        }

        if (elevatedPin != configuredPin)
        {
            logger.LogWarning("Purge attempt for recipe {RecipeId} failed: PIN mismatch. Provided length: {ProvidedLength}, Configured length: {ConfiguredLength}",
                recipeId, elevatedPin.Length, configuredPin.Length);
            return PurgeResult.Forbidden;
        }

        logger.LogInformation("Purge authorized for recipe {RecipeId}.", recipeId);

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
        List<WorkflowInstance> pendingJobs;

        // PostgreSQL cannot use LIKE (~~) on jsonb columns without a cast.
        // We use parameterized FromSql for Postgres and fall back to LINQ for InMemory/SQLite.
        if (db.Database.IsRelational())
        {
            pendingJobs = await db.WorkflowInstances
                .FromSql($"SELECT * FROM workflow_instances WHERE parameters::text LIKE {"%" + recipeIdStr + "%"} AND status = {(int)WorkflowStatus.Pending}")
                .ToListAsync();
        }
        else
        {
            pendingJobs = await db.WorkflowInstances
                .Where(w => w.Parameters != null
                            && w.Parameters.Contains(recipeIdStr)
                            && w.Status == WorkflowStatus.Pending)
                .ToListAsync();
        }

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
