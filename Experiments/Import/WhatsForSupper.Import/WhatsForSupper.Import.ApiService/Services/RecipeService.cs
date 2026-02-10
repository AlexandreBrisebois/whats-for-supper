using System.Text.Json;
using WhatsForSupper.Import.ApiService.Models;

namespace WhatsForSupper.Import.ApiService.Services;

public class RecipeService
{
    private readonly string _recipesBasePath;
    private readonly ILogger<RecipeService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public RecipeService(
        ILogger<RecipeService> logger,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;

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
            var imageFileNames = new List<string>();

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
                imageFileNames.Add(imageFileName);
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

            await TriggerWebhookAsync(recipeId, imageFileNames);

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

    private async Task TriggerWebhookAsync(string recipeId, List<string> imageFileNames)
    {
        try
        {
            var webhookUrl = _configuration["N8N_WEBHOOK_URL"];
            
            if (string.IsNullOrWhiteSpace(webhookUrl))
            {
                _logger.LogWarning("N8N_WEBHOOK_URL not configured. Skipping webhook trigger for recipe {RecipeId}", recipeId);
                return;
            }
            
            var baseUrl = _configuration["API_BASE_URL"];
            
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                _logger.LogWarning("API_BASE_URL not configured. Skipping webhook trigger for recipe {RecipeId}", recipeId);
                return;
            }

            var imageUrls = imageFileNames.Select((fileName, index) => 
                $"{baseUrl}/recipe/{recipeId}/original/{index}").ToList();

            var payload = new
            {
                recipeId = recipeId,
                imageUrls = imageUrls
            };

            var httpClient = _httpClientFactory.CreateClient();
            var response = await httpClient.PostAsJsonAsync(webhookUrl, payload);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation($"Webhook triggered successfully for recipe {recipeId}");
            }
            else
            {
                _logger.LogWarning($"Webhook returned status {response.StatusCode} for recipe {recipeId}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to trigger webhook for recipe {recipeId}");
        }
    }

    public string? GetImagePath(string recipeId, string photoId)
    {
        var recipePath = Path.Combine(_recipesBasePath, recipeId);
        var originalPath = Path.Combine(recipePath, "original");
        
        var pattern = $"{recipeId}_{photoId}.*";
        var matchingFiles = Directory.GetFiles(originalPath, pattern);
        
        if (matchingFiles.Length > 0)
        {
            return matchingFiles[0];
        }

        return null;
    }
}
