using System.Text.Json;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class ImageService(IConfiguration configuration, ILogger<ImageService> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private string RecipesRoot =>
        Environment.GetEnvironmentVariable("RECIPES_ROOT")
        ?? configuration["RecipesRoot"]
        ?? "/data/recipes";

    private static readonly Dictionary<string, string> MimeToExtension = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp"
    };

    /// <summary>
    /// Saves uploaded image files to disk at {recipesRoot}/{recipeId}/original/{index}{ext}.
    /// Returns the number of files saved.
    /// </summary>
    public async Task<int> SaveImages(Guid recipeId, IFormFileCollection files)
    {
        var root = RecipesRoot;
        var dir = Path.Combine(root, recipeId.ToString(), "original");

        logger.LogInformation("Saving {Count} images for recipe {RecipeId} to {Directory}. Root: {RecipesRoot}",
            files.Count, recipeId, dir, root);

        try
        {
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
                logger.LogDebug("Created directory: {Directory}", dir);
            }

            for (int i = 0; i < files.Count; i++)
            {
                var file = files[i];
                var ext = MimeToExtension.GetValueOrDefault(
                    file.ContentType.ToLowerInvariant(), ".jpg");
                var path = Path.Combine(dir, $"{i}{ext}");

                logger.LogDebug("Writing image {Index} (size: {Size} bytes) to {Path}", i, file.Length, path);

                await using var dest = File.Create(path);
                await file.CopyToAsync(dest);

                // Flush to ensure it's written to disk before logging success
                await dest.FlushAsync();

                logger.LogInformation("Successfully saved image {Index} for recipe {RecipeId}", i, recipeId);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to save images for recipe {RecipeId} in {Directory}", recipeId, dir);
            throw; // Re-throw to be caught by middleware
        }

        return files.Count;
    }


    /// <summary>
    /// Opens a stream for the requested photo. Returns (stream, contentType).
    /// Throws KeyNotFoundException if the image does not exist.
    /// </summary>
    public (Stream Stream, string ContentType) GetImage(Guid recipeId, int photoIndex)
    {
        var dir = Path.Combine(RecipesRoot, recipeId.ToString(), "original");

        foreach (var (mime, ext) in MimeToExtension)
        {
            var path = Path.Combine(dir, $"{photoIndex}{ext}");
            if (File.Exists(path))
                return (File.OpenRead(path), mime);
        }

        throw new KeyNotFoundException(
            $"Image {photoIndex} not found for recipe {recipeId}.");
    }

    /// <summary>Writes the recipe.info metadata file to {recipesRoot}/{id}/recipe.info.</summary>
    public async Task CreateRecipeInfo(RecipeInfo info)
    {
        var dir = Path.Combine(RecipesRoot, info.Id.ToString());
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, "recipe.info");
        var json = JsonSerializer.Serialize(info, JsonOptions);
        await File.WriteAllTextAsync(path, json);
        logger.LogDebug("Wrote recipe.info for {RecipeId}", info.Id);
    }

    /// <summary>Deletes the entire directory for the specified recipe.</summary>
    public void DeleteRecipeFiles(Guid recipeId)
    {
        var dir = Path.Combine(RecipesRoot, recipeId.ToString());
        if (Directory.Exists(dir))
        {
            logger.LogInformation("Deleting physical files for recipe {RecipeId} at {Directory}", recipeId, dir);
            Directory.Delete(dir, recursive: true);
            logger.LogInformation("Successfully deleted physical files for recipe {RecipeId}", recipeId);
        }
        else
        {
            logger.LogWarning("Delete requested for recipe {RecipeId}, but directory {Directory} does not exist.", recipeId, dir);
        }
    }
}
