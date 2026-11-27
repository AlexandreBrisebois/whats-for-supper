using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services.Recipes;

public sealed class RecipeLifecycleService(
    IClock clock,
    RecipeDbContext db,
    ImageService images,
    IWorkflowOrchestrator orchestrator,
    ILogger logger,
    RecipesRootResolver recipesRoot)
{
    /// <summary>Deletes a recipe from disk and database.</summary>
    public async Task DeleteRecipe(Guid id)
    {
        var outcome = await RecipePhysicalLifecycle.DeleteAsync(db, id, "delete", clock, recipesRoot,
            recipe => recipe.DeletedAt is null,
            async () => { await images.DeleteRecipeFiles(id); return null; });
        if (!outcome.Deleted) throw new KeyNotFoundException($"Recipe {id} not found.");
    }

    /// <summary>
    /// Soft-deletes a recipe. Returns the updated recipe with DeletedAt set.
    /// </summary>
    public async Task<(RecipeDetailResponseDto Recipe, List<string> AssignedDays)> SoftDeleteRecipe(Guid id, Guid deletedBy)
    {
        var recipe = await db.Recipes.FindAsync(id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");

        var today = DateOnly.FromDateTime(clock.UtcNow.UtcDateTime);
        var assignedDates = await db.CalendarEvents
            .Where(e => e.RecipeId == id && e.Date >= today)
            .Select(e => e.Date.ToString("yyyy-MM-dd"))
            .ToListAsync();

        if (assignedDates.Count > 0)
            return (null!, assignedDates);

        recipe.DeletedAt = clock.UtcNow;
        recipe.DeletedBy = deletedBy;

        var searchDoc = await db.RecipeSearchDocuments.FindAsync(id);
        if (searchDoc is not null)
            db.RecipeSearchDocuments.Remove(searchDoc);

        await db.SaveChangesAsync();

        return (RecipeMapper.MapToDetailResponse(clock, recipe), []);
    }

    /// <summary>Returns all soft-deleted recipes for the Recycle Bin.</summary>
    public async Task<List<RecipeTrashItemDto>> GetTrash()
    {
        return await db.Recipes
            .IgnoreQueryFilters()
            .Where(r => r.DeletedAt != null)
            .OrderByDescending(r => r.DeletedAt)
            .Select(r => new RecipeTrashItemDto
            {
                Id = r.Id,
                Name = r.Name,
                ImageUrl = $"/api/recipes/{r.Id}/hero",
                DeletedAt = r.DeletedAt!.Value,
                DeletedBy = r.DeletedBy
            })
            .ToListAsync();
    }

    /// <summary>Restores a soft-deleted recipe and re-includes it in all active surfaces.</summary>
    public async Task<RecipeDetailResponseDto> RestoreRecipe(Guid id)
    {
        var recipe = await db.Recipes
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");

        recipe.DeletedAt = null;
        recipe.DeletedBy = null;
        recipe.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync();

        // Re-enqueue search index when restored.
        // We wrap in try-catch because indexing is a non-critical side effect;
        // failure here should not revert the restoration.
        try
        {
            await orchestrator.TriggerAsync("index-recipe-search", new Dictionary<string, string>
            {
                ["recipeId"] = id.ToString(),
                ["fingerprint"] = SearchFingerprintService.ComputeSourceFingerprint(recipe)
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to trigger search index for restored recipe {RecipeId}", id);
        }

        return RecipeMapper.MapToDetailResponse(clock, recipe);
    }
}
