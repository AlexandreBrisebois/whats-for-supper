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
        ["image/png"]  = ".png",
        ["image/webp"] = ".webp"
    };

    /// <summary>
    /// Saves uploaded image files to disk at {recipesRoot}/{recipeId}/original/{index}{ext}.
    /// Returns the number of files saved.
    /// </summary>
    public async Task<int> SaveImages(Guid recipeId, IFormFileCollection files)
    {
        var dir = Path.Combine(RecipesRoot, recipeId.ToString(), "original");
        Directory.CreateDirectory(dir);

        for (int i = 0; i < files.Count; i++)
        {
            var file = files[i];
            var ext = MimeToExtension.GetValueOrDefault(
                file.ContentType.ToLowerInvariant(), ".jpg");
            var path = Path.Combine(dir, $"{i}{ext}");

            await using var dest = File.Create(path);
            await file.CopyToAsync(dest);
            logger.LogDebug("Saved image {Index} for recipe {RecipeId} → {Path}", i, recipeId, path);
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
}
