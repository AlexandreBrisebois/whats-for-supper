using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>
/// Service to handle manual recipe import triggers and status checks.
/// </summary>
public class RecipeImportService(RecipeDbContext db)
{
    /// <summary>
    /// Triggers a new import for a recipe by creating a record in the recipe_imports table.
    /// </summary>
    /// <param name="recipeId">The ID of the recipe to import.</param>
    /// <returns>The ID of the newly created import task.</returns>
    /// <exception cref="KeyNotFoundException">Thrown if the recipe does not exist.</exception>
    public async Task<Guid> TriggerImport(Guid recipeId)
    {
        var recipeExists = await db.Recipes.AnyAsync(r => r.Id == recipeId);
        if (!recipeExists)
        {
            throw new KeyNotFoundException($"Recipe {recipeId} not found.");
        }

        var importTask = new RecipeImport
        {
            RecipeId = recipeId,
            Status = RecipeImportStatus.Pending,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        db.RecipeImports.Add(importTask);
        await db.SaveChangesAsync();

        return importTask.Id;
    }

    /// <summary>
    /// Checks the status of a recipe import.
    /// Prioritizes the main Recipe table's RawMetadata, then the recipe_imports table.
    /// </summary>
    /// <param name="recipeId">The ID of the recipe.</param>
    /// <returns>A status DTO if a status is found, otherwise null.</returns>
    public async Task<RecipeImportStatusResponseDto?> GetImportStatus(Guid recipeId)
    {
        // 1. Check if the recipe exists and already has RawMetadata
        var recipe = await db.Recipes.FindAsync(recipeId);
        if (recipe == null) return null;

        if (!string.IsNullOrWhiteSpace(recipe.RawMetadata))
        {
            return new RecipeImportStatusResponseDto
            {
                Status = "Completed"
            };
        }

        // 2. Check for the most recent import record
        var latestImport = await db.RecipeImports
            .Where(ri => ri.RecipeId == recipeId)
            .OrderByDescending(ri => ri.CreatedAt)
            .FirstOrDefaultAsync();

        if (latestImport == null)
        {
            return null;
        }

        return new RecipeImportStatusResponseDto
        {
            Status = latestImport.Status.ToString(),
            ErrorMessage = latestImport.Status == RecipeImportStatus.Failed ? latestImport.ErrorMessage : null
        };
    }
}
