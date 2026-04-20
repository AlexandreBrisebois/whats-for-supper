using System.Text.Json;
using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.AI;
using RecipeApi.Models;

namespace RecipeApi.Services.Agents;

public class RecipeHeroAgent(
    IConfiguration configuration,
    ILogger<RecipeHeroAgent> logger)
{
    private string RecipesRoot =>
        System.Environment.GetEnvironmentVariable("RECIPES_ROOT")
        ?? configuration["RecipesRoot"]
        ?? "/data/recipes";

    private string GeminiApiKey =>
        System.Environment.GetEnvironmentVariable("GEMINI_API_KEY")
        ?? configuration["GEMINI_API_KEY"]
        ?? throw new InvalidOperationException("GEMINI_API_KEY not configured.");

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

        logger.LogInformation("Creating hero image for recipe {RecipeId}", recipeId);

        // 1. Load recipe.info to see if a finished dish image is already selected
        int finishedDishIndex = -1;
        if (System.IO.File.Exists(infoPath))
        {
            try
            {
                var infoJson = await System.IO.File.ReadAllTextAsync(infoPath);
                var info = JsonSerializer.Deserialize<RecipeInfo>(infoJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
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
        var client = new Client(apiKey: GeminiApiKey);
        var content = new Content { Role = "user", Parts = new List<Part>() };

        string taskPrompt = "Generate 400x400 JPG thumbnail of the finished dish from these images. Focus on the plated meal.";

        bool hasImages = imageFiles.Count > 0;

        if (hasImages)
        {
            content.Parts.Add(new Part { Text = taskPrompt });

            // If we have a specific image designated as the finished dish, prioritize it by adding it first or ONLY adding it.
            // But the prompt says "from these images", so maybe we send all but note the favorite?
            // Actually, if an index is specified, let's just send THAT one if we want high precision,
            // OR send all and let Gemini decide if it sees something better.
            // The requirement says "Identify the 'dish' photo", so let's send all images.

            foreach (var imagePath in imageFiles)
            {
                var bytes = await System.IO.File.ReadAllBytesAsync(imagePath);
                content.Parts.Add(new Part
                {
                    InlineData = new Blob
                    {
                        Data = bytes,
                        MimeType = GetMimeType(imagePath)
                    }
                });
            }
        }
        else
        {
            // Fallback: Generate image from recipe description
            logger.LogInformation("No images found for recipe {RecipeId}. Attempting to generate from description.", recipeId);

            var recipeJsonPath = Path.Combine(recipeDir, "recipe.json");
            if (System.IO.File.Exists(recipeJsonPath))
            {
                var recipeJson = await System.IO.File.ReadAllTextAsync(recipeJsonPath);
                // We don't necessarily need to deserialize the whole thing, Gemini can handle JSON in prompt
                taskPrompt = $"Generate a high-quality 400x400 JPG hero image of the finished dish for this recipe: \n\n{recipeJson}\n\nFocus on a beautiful, plated presentation.";
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
            var candidate = response.Candidates.FirstOrDefault();
            var part = candidate?.Content?.Parts?.FirstOrDefault(p => p.InlineData != null);

            if (part?.InlineData?.Data != null)
            {
                var heroPath = Path.Combine(recipeDir, "hero.jpg");
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
