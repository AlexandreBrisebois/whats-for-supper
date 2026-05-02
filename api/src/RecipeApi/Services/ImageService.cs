using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class ImageService(IRecipeStore recipeStore, ILogger<ImageService> logger)
{
    /// <summary>
    /// Saves uploaded image files for a recipe. Returns the number of files saved.
    /// </summary>
    public async Task<int> SaveImages(Guid recipeId, IFormFileCollection files)
    {
        logger.LogInformation("Saving {Count} images for recipe {RecipeId}", files.Count, recipeId);

        try
        {
            for (int i = 0; i < files.Count; i++)
            {
                var file = files[i];
                await using var stream = file.OpenReadStream();
                await recipeStore.SaveOriginalImageAsync(recipeId, i, file.ContentType, stream);
                logger.LogInformation("Saved image {Index} for recipe {RecipeId}", i, recipeId);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to save images for recipe {RecipeId}", recipeId);
            throw;
        }

        return files.Count;
    }

    /// <summary>
    /// Returns a stream for the requested original photo.
    /// Throws <see cref="KeyNotFoundException"/> if the image does not exist.
    /// </summary>
    public async Task<(Stream Stream, string ContentType)> GetImage(Guid recipeId, int photoIndex)
    {
        var result = await recipeStore.ReadOriginalImageAsync(recipeId, photoIndex);
        if (result is null)
            throw new KeyNotFoundException($"Image {photoIndex} not found for recipe {recipeId}.");
        return result.Value;
    }

    /// <summary>
    /// Returns a stream for the AI-generated hero image.
    /// Throws <see cref="KeyNotFoundException"/> if not yet generated.
    /// </summary>
    public async Task<(Stream Stream, string ContentType)> GetHeroImage(Guid recipeId)
    {
        var result = await recipeStore.ReadHeroImageAsync(recipeId);
        if (result is null)
            throw new KeyNotFoundException($"Hero image not yet generated for recipe {recipeId}. Trigger an import first.");
        return result.Value;
    }

    /// <summary>Writes the recipe.info metadata file for a new recipe.</summary>
    public Task CreateRecipeInfo(RecipeInfo info)
        => recipeStore.WriteInfoAsync(info);

    /// <summary>
    /// Updates notes and rating in recipe.info, creating the file if it does not exist.
    /// </summary>
    public async Task UpdateRecipeInfo(Guid recipeId, string? notes, RecipeRating? rating)
    {
        var info = await recipeStore.ReadInfoAsync(recipeId) ?? new RecipeInfo { Id = recipeId };

        if (notes is not null) info.Notes = notes;
        if (rating.HasValue) info.Rating = rating.Value;

        await recipeStore.WriteInfoAsync(info);
        logger.LogDebug("Updated recipe.info for {RecipeId}", recipeId);
    }

    /// <summary>Deletes all files for the specified recipe.</summary>
    public Task DeleteRecipeFiles(Guid recipeId)
        => recipeStore.DeleteAsync(recipeId);
}
