using System.Text.Json;
using WhatsForSupper.Import.ApiService.Models;

namespace WhatsForSupper.Import.ApiService.Services;

public class RecipeStorageService
{
    private readonly string _recipesBasePath;
    private readonly ILogger<RecipeStorageService> _logger;

    public RecipeStorageService(ILogger<RecipeStorageService> logger)
    {
        _logger = logger;

        // Allow overriding the recipes base path via environment variable so containers
        // can mount a volume and provide the path. Env var name: RECIPES_ROOT
        var envPath = Environment.GetEnvironmentVariable("RECIPES_ROOT");
        if (!string.IsNullOrWhiteSpace(envPath))
        {
            // If a relative path was provided, make it relative to the current directory
            _recipesBasePath = Path.IsPathRooted(envPath)
                ? envPath
                : Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), envPath));
            _logger.LogInformation("Using recipes base path from RECIPES_ROOT: {Path}", _recipesBasePath);
        }
        else
        {
            _recipesBasePath = Path.Combine(Directory.GetCurrentDirectory(), "recipes");
            _logger.LogInformation("Using default recipes base path: {Path}", _recipesBasePath);
        }

        Directory.CreateDirectory(_recipesBasePath);
    }

    public async Task<string> SaveRecipeAsync(UploadRecipeRequest request)
    {
        var recipeId = Guid.NewGuid().ToString("N");
        var recipePath = Path.Combine(_recipesBasePath, recipeId);
        var originalPath = Path.Combine(recipePath, "original");

        Directory.CreateDirectory(originalPath);

        try
        {
            // Save images
            for (int i = 0; i < request.Images.Count; i++)
            {
                var image = request.Images[i];
                var ext = Path.GetExtension(image.FileName);
                if (string.IsNullOrEmpty(ext))
                {
                    ext = image.ContentType switch
                    {
                        "image/jpeg" or "image/jpg" => ".jpg",
                        "image/png" => ".png",
                        "image/gif" => ".gif",
                        "image/webp" => ".webp",
                        _ => ".jpg"
                    };
                }

                var imageFileName = $"{recipeId}_{i}{ext}";
                var imagePath = Path.Combine(originalPath, imageFileName);
                await File.WriteAllBytesAsync(imagePath, image.Data);
            }

            // Save recipe info
            var recipeInfo = new RecipeInfo
            {
                Rating = request.Rating,
                RatingType = request.Rating switch
                {
                    0 => "unknown",
                    1 => "dislike",
                    2 => "like",
                    3 => "love",
                    _ => "unknown"
                },
                AddedDate = DateTime.UtcNow,
                ImageCount = request.Images.Count
            };

            var infoPath = Path.Combine(recipePath, "info.json");
            var json = JsonSerializer.Serialize(recipeInfo, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(infoPath, json);

            _logger.LogInformation($"Recipe {recipeId} saved successfully with {request.Images.Count} images");
            return recipeId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error saving recipe {recipeId}");
            // Cleanup on failure
            try
            {
                if (Directory.Exists(recipePath))
                    Directory.Delete(recipePath, true);
            }
            catch { }
            throw;
        }
    }
}
