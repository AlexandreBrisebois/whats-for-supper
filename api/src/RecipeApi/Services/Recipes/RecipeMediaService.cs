using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services.Recipes;

public sealed class RecipeMediaService(
    IClock clock,
    RecipeDbContext db,
    IValidationService validation,
    IRecipeStore recipeStore,
    IWorkflowOrchestrator orchestrator,
    ILogger logger)
{
    /// <summary>
    /// Adds a single original image to an existing recipe.
    /// Updates both the database and the physical storage, then triggers hero regeneration.
    /// </summary>
    public async Task<int> AddOriginalImageAsync(Guid recipeId, IFormFile file)
    {
        validation.ValidateImage(file);
        await using var source = file.OpenReadStream();
        using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await source.ReadAsync(chunk)) != 0)
        {
            if (buffer.Length + read > 20 * 1024 * 1024)
                throw new ArgumentException("Image exceeds the 20 MB size limit.");
            await buffer.WriteAsync(chunk.AsMemory(0, read));
        }
        if (buffer.Length == 0) throw new ArgumentException("Image file must not be empty.");

        int newIndex;
        await using (var transaction = await RecipeRotation.LockAsync(db, recipeId))
        {
            var recipe = await db.Recipes.SingleOrDefaultAsync(r => r.Id == recipeId)
                ?? throw new KeyNotFoundException($"Recipe {recipeId} not found.");
            newIndex = recipe.ImageCount;
            validation.ValidateImageCount(newIndex + 1);

            buffer.Position = 0;
            await recipeStore.SaveOriginalImageAsync(recipeId, newIndex, file.ContentType, buffer);

            var info = await recipeStore.ReadInfoAsync(recipeId) ?? new RecipeInfo { Id = recipeId };
            info.ImageCount = newIndex + 1;
            await recipeStore.WriteInfoAsync(info);

            recipe.ImageCount = newIndex + 1;
            recipe.UpdatedAt = clock.UtcNow;
            await db.SaveChangesAsync();
            if (transaction is not null) await transaction.CommitAsync();
        }

        await TriggerHeroRegenerationAsync(recipeId);
        return newIndex;
    }

    /// <summary>
    /// Triggers the background hero regeneration workflow for a recipe.
    /// </summary>
    public async Task TriggerHeroRegenerationAsync(Guid recipeId)
    {
        try
        {
            await orchestrator.TriggerAsync("recipe-hero-regeneration", new Dictionary<string, string>
            {
                ["recipeId"] = recipeId.ToString()
            });
            logger.LogInformation("Triggered recipe-hero-regeneration for recipe {RecipeId}", recipeId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to trigger hero regeneration for recipe {RecipeId}", recipeId);
            throw;
        }
    }

    internal static Task<SharedImageDto?> ReadHeroImageAsync(ImageService images, Guid recipeId) =>
        ReadSharedImageOrNull(() => images.GetHeroImage(recipeId));

    internal static async Task<List<SharedImageDto>> ReadOriginalImagesAsync(ImageService images, Guid recipeId, int imageCount)
    {
        var originals = new List<SharedImageDto>();
        for (var index = 0; index < Math.Min(imageCount, 5); index++)
        {
            var original = await ReadSharedImageOrNull(() => images.GetImage(recipeId, index));
            if (original is not null)
                originals.Add(original);
        }

        return originals;
    }

    private static async Task<SharedImageDto?> ReadSharedImageOrNull(
        Func<Task<(Stream Stream, string ContentType)>> readImage)
    {
        try
        {
            var (stream, contentType) = await readImage();
            await using var disposableStream = stream;
            using var memory = new MemoryStream();
            await stream.CopyToAsync(memory);
            return new SharedImageDto
            {
                MimeType = contentType,
                Base64 = Convert.ToBase64String(memory.ToArray()),
            };
        }
        catch (KeyNotFoundException)
        {
            return null;
        }
    }
}
