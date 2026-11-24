using System.Text.Json;
using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Agents;

public class RecipeHeroAgent : IWorkflowProcessor
{
    private readonly IRecipeStore recipeStore;
    private readonly IConfiguration configuration;
    private readonly ILogger<RecipeHeroAgent> logger;
    private readonly IHttpClientFactory? httpClientFactory;
    private readonly DemoModeOptions _demoMode;

    [ActivatorUtilitiesConstructor]
    public RecipeHeroAgent(
        IRecipeStore recipeStore,
        IConfiguration configuration,
        ILogger<RecipeHeroAgent> logger,
        IHttpClientFactory? httpClientFactory = null)
    {
        this.recipeStore = recipeStore;
        this.configuration = configuration;
        this.logger = logger;
        this.httpClientFactory = httpClientFactory;
        _demoMode = new(configuration);
    }

    public string ProcessorName => "GenerateHero";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        _demoMode.EnsureAiAvailable();
        if (string.IsNullOrEmpty(task.Payload))
            throw new ArgumentException("Task payload is empty.");

        using var doc = JsonDocument.Parse(task.Payload);
        if (!doc.RootElement.TryGetProperty("recipeId", out var idProp) && !doc.RootElement.TryGetProperty("RecipeId", out idProp))
            throw new ArgumentException("Task payload does not contain recipeId.");

        var recipeId = idProp.GetGuid();
        var force = ReadForce(doc.RootElement);

        await CreateHeroImageAsync(recipeId, force, ct);
        return new { Message = ReturnedMessage(recipeId, force) };
    }

    private static string ReturnedMessage(Guid recipeId, bool force) => $"Generated hero image for {recipeId} (Force={force})";

    private static bool ReadForce(JsonElement input) =>
        (input.TryGetProperty("force", out var value) || input.TryGetProperty("Force", out value))
        && (value.ValueKind == JsonValueKind.True || value.ValueKind == JsonValueKind.String
            && string.Equals(value.GetString(), "true", StringComparison.OrdinalIgnoreCase));

    internal static Guid ValidateOriginalHistory(string? payload, string? returned, RecipeFilePublication[] publications)
    {
        static void Require(bool valid)
        {
            if (!valid) throw new InvalidDataException("Original hero processor differs from its invocation.");
        }
        static void UniqueObject(JsonElement value)
        {
            Require(value.ValueKind == JsonValueKind.Object);
            var names = value.EnumerateObject().Select(x => x.Name).ToArray();
            Require(names.Distinct(StringComparer.Ordinal).Count() == names.Length);
        }
        using var input = JsonDocument.Parse(payload ?? "null");
        UniqueObject(input.RootElement);
        var hasId = input.RootElement.TryGetProperty("recipeId", out var id)
            || input.RootElement.TryGetProperty("RecipeId", out id);
        Guid recipeId = default;
        Require(hasId && id.ValueKind == JsonValueKind.String && id.TryGetGuid(out recipeId) && recipeId != Guid.Empty);
        var force = ReadForce(input.RootElement);
        using var receipt = JsonDocument.Parse(returned ?? "null");
        UniqueObject(receipt.RootElement);
        Require(receipt.RootElement.TryGetProperty("message", out var message) && message.ValueKind == JsonValueKind.String
            && message.GetString() == ReturnedMessage(recipeId, force));
        return recipeId;
    }

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
        _demoMode.EnsureAiAvailable();
        var modelId = GetModelId();
        if (!force && await recipeStore.HasHeroImageAsync(recipeId, ct))
        {
            logger.LogInformation("Hero image already exists for recipe {RecipeId}. Skipping.", recipeId);
            return;
        }

        var info = await recipeStore.ReadInfoAsync(recipeId, ct)
            ?? throw new InvalidDataException($"Recipe metadata is missing for {recipeId}.");

        var apiKey = GetApiKey();
        if (string.IsNullOrEmpty(apiKey))
        {
            logger.LogWarning("GEMINI_API_KEY is not configured. Hero image generation for recipe {RecipeId} will be skipped.", recipeId);
            return;
        }

        var httpOptions = new HttpOptions { Timeout = 600000 };
        using var client = new Client(apiKey: apiKey, httpOptions: httpOptions,
            clientOptions: httpClientFactory is null ? null : new ClientOptions
            {
                HttpClientFactory = () =>
                {
                    var httpClient = httpClientFactory.CreateClient("recipe-hero");
                    httpClient.Timeout = Timeout.InfiniteTimeSpan;
                    return httpClient;
                }
            });
        var content = new Content { Role = "user", Parts = new List<Part>() };

        (Stream Stream, string ContentType)? finishedDish = null;
        if (info.FinishedDishImageIndex >= 0 && info.FinishedDishImageIndex < info.ImageCount)
        {
            finishedDish = await recipeStore.ReadOriginalImageAsync(recipeId, info.FinishedDishImageIndex, ct);
        }

        if (finishedDish is not null)
        {
            const string taskPrompt = "Generate a high-quality 400x400 WebP hero image based on the provided finished dish image. Focus on a beautiful, plated presentation. Do not include any text, logos, or recipe names in the image.";
            content.Parts.Add(new Part { Text = taskPrompt });
            await using (finishedDish.Value.Stream)
            {
                using var ms = new MemoryStream();
                await finishedDish.Value.Stream.CopyToAsync(ms, ct);
                content.Parts.Add(new Part
                {
                    InlineData = new Blob
                    {
                        Data = ms.ToArray(),
                        MimeType = finishedDish.Value.ContentType
                    }
                });
            }
            logger.LogInformation("Generating hero image using designated finished dish image at index {Index}", info.FinishedDishImageIndex);
        }
        else
        {
            logger.LogInformation("No designated finished dish image found for recipe {RecipeId}. Attempting to generate from raw metadata.", recipeId);
            var recipeJson = await recipeStore.ReadRecipeJsonAsync(recipeId, ct);
            if (!string.IsNullOrWhiteSpace(recipeJson))
            {
                var taskPrompt = $"Generate a high-quality 400x400 WebP hero image of the finished dish for this recipe based on its raw metadata. Focus on a beautiful, plated presentation. Do not include any text, logos, or recipe names in the image.\n\nRaw Metadata: \n{recipeJson}";
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
                    ThinkingBudget = 4000
                },
                MaxOutputTokens = 2048
            }, cancellationToken: ct);
            var candidate = response.Candidates?.FirstOrDefault();
            var part = candidate?.Content?.Parts?.FirstOrDefault(p => p.InlineData != null);

            if (part?.InlineData?.Data != null)
            {
                await using var heroStream = new MemoryStream(part.InlineData.Data);
                await recipeStore.SaveHeroImageAsync(recipeId, heroStream, ct);
                logger.LogInformation("Saved hero image for recipe {RecipeId}", recipeId);
            }
            else
            {
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
}
