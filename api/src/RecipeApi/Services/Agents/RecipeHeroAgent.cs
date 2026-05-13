using System.Text.Json;
using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.AI;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

using RecipeApi.Workflow;

namespace RecipeApi.Services.Agents;

public class RecipeHeroAgent(
    RecipesRootResolver recipesRoot,
    IConfiguration configuration,
    ILogger<RecipeHeroAgent> logger) : IWorkflowProcessor
{
    public string ProcessorName => "GenerateHero";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(task.Payload))
        {
            throw new ArgumentException("Task payload is empty.");
        }

        using var doc = JsonDocument.Parse(task.Payload);
        if (!doc.RootElement.TryGetProperty("recipeId", out var idProp) && !doc.RootElement.TryGetProperty("RecipeId", out idProp))
        {
            throw new ArgumentException("Task payload does not contain recipeId.");
        }

        var recipeId = idProp.GetGuid();

        bool force = false;
        if (doc.RootElement.TryGetProperty("force", out var forceProp) || doc.RootElement.TryGetProperty("Force", out forceProp))
        {
            force = forceProp.ValueKind == JsonValueKind.True || (forceProp.ValueKind == JsonValueKind.String && string.Equals(forceProp.GetString(), "true", StringComparison.OrdinalIgnoreCase));
        }

        // Strict check: recipe.info must exist
        var recipeDir = Path.Combine(RecipesRoot, recipeId.ToString());
        var infoPath = Path.Combine(recipeDir, "recipe.info");
        if (!System.IO.File.Exists(infoPath))
        {
            throw new FileNotFoundException($"Recipe info file not found: {infoPath}");
        }

        await CreateHeroImageAsync(recipeId, force, ct);
        return new { Message = $"Generated hero image for {recipeId} (Force={force})" };
    }
    private string RecipesRoot => recipesRoot.Root;

    // Resolved on demand; if missing the agent will fail with a warning when called.
    private string GetApiKey() =>
        System.Environment.GetEnvironmentVariable("GEMINI_API_KEY")
        ?? configuration["GEMINI_API_KEY"]
        ?? string.Empty;

    private string GetModelId() =>
        System.Environment.GetEnvironmentVariable("GEMINI_MODEL_ID_HERO")
        ?? configuration["GEMINI_MODEL_ID_HERO"]
        ?? "models/gemini-3-pro-image-preview";

    public async Task CreateHeroImageAsync(Guid recipeId, bool force = false, CancellationToken ct = default)
    {
        var modelId = GetModelId();
        var recipeDir = Path.Combine(RecipesRoot, recipeId.ToString());
        var infoPath = Path.Combine(recipeDir, "recipe.info");
        var originalDir = Path.Combine(recipeDir, "original");

        if (!Directory.Exists(recipeDir))
        {
            throw new DirectoryNotFoundException($"Recipe directory not found: {recipeDir}");
        }

        var heroPath = Path.Combine(recipeDir, "hero.jpg");
        if (!force && System.IO.File.Exists(heroPath))
        {
            logger.LogInformation("Hero image already exists for recipe {RecipeId}. Skipping.", recipeId);
            return;
        }

        logger.LogInformation("Creating hero image for recipe {RecipeId} (Force={Force})", recipeId, force);

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

        var httpOptions = new HttpOptions
        {
            Timeout = 300000 // 5 minutes
        };
        var client = new Client(apiKey: apiKey, httpOptions: httpOptions);
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
            var response = await client.Models.GenerateContentAsync(modelId, content, new GenerateContentConfig
            {
                ThinkingConfig = new ThinkingConfig
                {
                    IncludeThoughts = true,
                    ThinkingBudget = 16000
                },
                MaxOutputTokens = 2048
            }, cancellationToken: ct);
            var candidate = response.Candidates?.FirstOrDefault();
            var part = candidate?.Content?.Parts?.FirstOrDefault(p => p.InlineData != null);

            if (part?.InlineData?.Data != null)
            {
                // Task 7: Generate to temp file first, then replace hero.jpg
                var tempPath = Path.Combine(recipeDir, $"hero.tmp_{Guid.NewGuid()}.jpg");
                await System.IO.File.WriteAllBytesAsync(tempPath, part.InlineData.Data);

                if (System.IO.File.Exists(heroPath))
                {
                    System.IO.File.Delete(heroPath);
                }
                System.IO.File.Move(tempPath, heroPath);

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
