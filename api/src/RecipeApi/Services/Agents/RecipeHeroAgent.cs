using System.Text.Json;
using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.AI;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services.Agents;

public class RecipeHeroAgent(
    RecipesRootResolver recipesRoot,
    IConfiguration configuration,
    ILogger<RecipeHeroAgent> logger)
{
    private string RecipesRoot => recipesRoot.Root;

    // Resolved on demand; if missing the agent will fail with a warning when called.
    private string GetApiKey() =>
        System.Environment.GetEnvironmentVariable("GEMINI_API_KEY")
        ?? configuration["GEMINI_API_KEY"]
        ?? string.Empty;

    private const string ModelId = "models/gemini-3-pro-image-preview";

    public async Task CreateHeroImageAsync(Guid recipeId)
    {
        var recipeDir = Path.Combine(RecipesRoot, recipeId.ToString());
        var infoPath = Path.Combine(recipeDir, "recipe.info");
        var originalDir = Path.Combine(recipeDir, "original");

        if (!Directory.Exists(recipeDir))
        {
            throw new DirectoryNotFoundException($"Recipe directory not found: {recipeDir}");
        }

        var heroPath = Path.Combine(recipeDir, "hero.jpg");
        if (System.IO.File.Exists(heroPath))
        {
            logger.LogInformation("Hero image already exists for recipe {RecipeId}. Skipping.", recipeId);
            return;
        }

        logger.LogInformation("Creating hero image for recipe {RecipeId}", recipeId);

        // 1. Load recipe.info to see if a finished dish image is already selected
        int finishedDishIndex = -1;
        if (System.IO.File.Exists(infoPath))
        {
            try
            {
                var infoJson = await System.IO.File.ReadAllTextAsync(infoPath);
                var info = JsonSerializer.Deserialize<RecipeInfo>(infoJson, JsonDefaults.CaseInsensitive);
                finishedDishIndex = info?.FinishedDishImageIndex ?? -1;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to read recipe.info for {RecipeId}. Proceeding with default identification.", recipeId);
            }
        }

        // 2. Load available images
        var imageFiles = Directory.Exists(originalDir)
            ? Directory.GetFiles(originalDir)
                .Where(f => f.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                            f.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                            f.EndsWith(".webp", StringComparison.OrdinalIgnoreCase))
                .OrderBy(f => f)
                .ToList()
            : new List<string>();

        // 3. Prepare the Prompt and Content
        var apiKey = GetApiKey();
        if (string.IsNullOrEmpty(apiKey))
        {
            logger.LogWarning("GEMINI_API_KEY is not configured. Hero image generation for recipe {RecipeId} will be skipped.", recipeId);
            return;
        }

        var client = new Client(apiKey: apiKey);
        var content = new Content { Role = "user", Parts = new List<Part>() };

        string taskPrompt;
        bool useFinishedDish = finishedDishIndex >= 0 && finishedDishIndex < imageFiles.Count;

        if (useFinishedDish)
        {
            var imagePath = imageFiles[finishedDishIndex];
            taskPrompt = "Generate a high-quality 400x400 JPG hero image based on the provided finished dish image. Focus on a beautiful, plated presentation.";

            content.Parts.Add(new Part { Text = taskPrompt });
            var bytes = await System.IO.File.ReadAllBytesAsync(imagePath);
            content.Parts.Add(new Part
            {
                InlineData = new Blob
                {
                    Data = bytes,
                    MimeType = GetMimeType(imagePath)
                }
            });

            logger.LogInformation("Generating hero image using designated finished dish image at index {Index}", finishedDishIndex);
        }
        else
        {
            // Fallback: Generate image from raw recipe metadata
            logger.LogInformation("No designated finished dish image found for recipe {RecipeId}. Attempting to generate from raw metadata.", recipeId);

            var recipeJsonPath = Path.Combine(recipeDir, "recipe.json");
            if (System.IO.File.Exists(recipeJsonPath))
            {
                var recipeJson = await System.IO.File.ReadAllTextAsync(recipeJsonPath);
                taskPrompt = $"Generate a high-quality 400x400 JPG hero image of the finished dish for this recipe based on its raw metadata. Focus on a beautiful, plated presentation.\n\nRaw Metadata: \n{recipeJson}";
                content.Parts.Add(new Part { Text = taskPrompt });
            }
            else
            {
                logger.LogWarning("No recipe.json found for recipe {RecipeId}. Cannot generate fallback image.", recipeId);
                return;
            }
        }

        try
        {
            var response = await client.Models.GenerateContentAsync(ModelId, content);
            var candidate = response.Candidates?.FirstOrDefault();
            var part = candidate?.Content?.Parts?.FirstOrDefault(p => p.InlineData != null);

            if (part?.InlineData?.Data != null)
            {
                await System.IO.File.WriteAllBytesAsync(heroPath, part.InlineData.Data);
                logger.LogInformation("Successfully saved hero.jpg to {Path}", heroPath);
            }
            else
            {
                // If it didn't return an image, check if it returned text (maybe an error or explanation)
                var textResponse = candidate?.Content?.Parts?.FirstOrDefault(p => !string.IsNullOrEmpty(p.Text))?.Text;
                logger.LogWarning("Gemini did not return an image for recipe {RecipeId}. Response: {Text}", recipeId, textResponse);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to call Gemini for hero image generation for recipe {RecipeId}", recipeId);
            throw;
        }
    }

    private string GetMimeType(string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        return ext switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "image/jpeg"
        };
    }
}
