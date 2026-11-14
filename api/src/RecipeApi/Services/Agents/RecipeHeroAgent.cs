using System.Text.Json;
using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.AI;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

using RecipeApi.Workflow;

namespace RecipeApi.Services.Agents;

public class RecipeHeroAgent(
    RecipeFilePublicationStore publications,
    IConfiguration configuration,
    ILogger<RecipeHeroAgent> logger,
    IHttpClientFactory? httpClientFactory = null) : IWorkflowProcessor
{
    private readonly DemoModeOptions _demoMode = new(configuration);
    public string ProcessorName => "GenerateHero";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        _demoMode.EnsureAiAvailable();
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

        var force = ReadForce(doc.RootElement);

        var operation = task.TaskId == Guid.Empty ? Guid.NewGuid() : task.TaskId;
        var input = ProcessorName + "\n" + CanonicalRecipeContentStore.NormalizeJson(task.Payload);
        if (!await publications.TryResumeAsync(recipeId, operation, input, ct))
            await CreateCandidateAsync(await publications.CaptureForTaskAsync(task, recipeId, ct), force, operation, input, ct);
        return new { Message = ReturnedMessage(recipeId, force) };
    }

    private static string ReturnedMessage(Guid recipeId, bool force) => $"Generated hero image for {recipeId} (Force={force})";

    private static bool ReadForce(JsonElement input) =>
        (input.TryGetProperty("force", out var value) || input.TryGetProperty("Force", out value))
        && (value.ValueKind == JsonValueKind.True || value.ValueKind == JsonValueKind.String
            && string.Equals(value.GetString(), "true", StringComparison.OrdinalIgnoreCase));

    private static string? FinishedDish(RecipePublicationCapture capture, RecipeInfo info) =>
        info.FinishedDishImageIndex >= 0 && info.FinishedDishImageIndex < info.ImageCount
            ? new[] { ".jpg", ".jpeg", ".png", ".webp" }.Select(extension => $"original/{info.FinishedDishImageIndex}{extension}")
                .FirstOrDefault(path => capture.Files.GetValueOrDefault(path) is not null)
            : null;

    // This is original publication/receipt association, not provider authenticity
    // or evidence that the returned message represents a generated physical image.
    internal static Guid ValidateOriginalHistory(string? payload, string? returned, RecipeFilePublication[] publications)
    {
        static void Require(bool valid)
        {
            if (!valid) throw new InvalidDataException("Original hero processor differs from its publication.");
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
        // Existing hero, absent API key/source and a response without an image all
        // emit the same receipt. No invocation snapshot records these skip reasons;
        // launch/current files cannot supply that missing historical authority.
        if (publications.Length == 0) return recipeId;
        Require(publications.Length == 1 && publications[0].RecipeId == recipeId);
        var (capture, candidate) = RecipeFilePublicationStore.ReadOriginalPublication(publications[0]);
        var info = JsonSerializer.Deserialize<RecipeInfo>(capture.Files["recipe.info"]!, JsonDefaults.CamelCase)
            ?? throw new InvalidDataException("Captured recipe metadata is invalid.");
        Require(candidate.RecipeJson is null && candidate.SourceKind == "hero" && candidate.SourceContext is null
            && candidate.SourceFiles is { Count: 1 } && candidate.SourceFiles.TryGetValue("hero.webp", out var hero) && hero is not null);
        Require(force || capture.Files["hero.webp"] is null);
        Require(FinishedDish(capture, info) is not null || capture.Files["recipe.json"] is not null);
        // Hero generation owns only the selected image; all captured metadata,
        // including private fields, must survive without a second metadata writer.
        Require(CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(info, JsonDefaults.CamelCase))
            == CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(candidate.Info, JsonDefaults.CamelCase)));
        return recipeId;
    }

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
        _demoMode.EnsureAiAvailable();
        await CreateCandidateAsync(await publications.CaptureAsync(recipeId, ct), force, Guid.NewGuid(), null, ct);
    }

    private async Task CreateCandidateAsync(RecipePublicationCapture capture, bool force, Guid operation, string? input, CancellationToken ct)
    {
        var recipeId = capture.RecipeId;
        var modelId = GetModelId();
        if (!force && capture.Files["hero.webp"] is not null)
        {
            logger.LogInformation("Hero image already exists for recipe {RecipeId}. Skipping.", recipeId);
            return;
        }
        var info = JsonSerializer.Deserialize<RecipeInfo>(capture.Files["recipe.info"]!, JsonDefaults.CamelCase)
            ?? throw new InvalidDataException("Captured recipe metadata is invalid.");
        var finishedDishIndex = info.FinishedDishImageIndex;
        var image = FinishedDish(capture, info);

        // 3. Prepare the Prompt and Content
        var apiKey = GetApiKey();
        if (string.IsNullOrEmpty(apiKey))
        {
            logger.LogWarning("GEMINI_API_KEY is not configured. Hero image generation for recipe {RecipeId} will be skipped.", recipeId);
            return;
        }

        var httpOptions = new HttpOptions
        {
            Timeout = 600000 // 10 minutes
        };
        using var client = new Client(apiKey: apiKey, httpOptions: httpOptions,
            clientOptions: httpClientFactory is null ? null : new ClientOptions
            {
                HttpClientFactory = () =>
                {
                    var httpClient = httpClientFactory.CreateClient("recipe-hero");
                    // Preserve the SDK's explicit per-attempt timeout above.
                    httpClient.Timeout = System.Threading.Timeout.InfiniteTimeSpan;
                    return httpClient;
                }
            });
        var content = new Content { Role = "user", Parts = new List<Part>() };

        string taskPrompt;
        bool useFinishedDish = image is not null;

        if (useFinishedDish)
        {
            var imagePath = image!;
            taskPrompt = "Generate a high-quality 400x400 WebP hero image based on the provided finished dish image. Focus on a beautiful, plated presentation. Do not include any text, logos, or recipe names in the image.";

            content.Parts.Add(new Part { Text = taskPrompt });
            var bytes = capture.Files[imagePath]!;
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

            if (capture.Files["recipe.json"] is { } recipeBytes)
            {
                var recipeJson = System.Text.Encoding.UTF8.GetString(recipeBytes);
                taskPrompt = $"Generate a high-quality 400x400 WebP hero image of the finished dish for this recipe based on its raw metadata. Focus on a beautiful, plated presentation. Do not include any text, logos, or recipe names in the image.\n\nRaw Metadata: \n{recipeJson}";
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
                await publications.PublishAsync(capture,
                    new(null, info, input, new Dictionary<string, byte[]?> { ["hero.webp"] = part.InlineData.Data }, SourceKind: "hero"), operation, ct);
                logger.LogInformation("Published hero image for recipe {RecipeId}", recipeId);
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
