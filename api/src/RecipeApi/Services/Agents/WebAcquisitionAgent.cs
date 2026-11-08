using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Utils;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Agents;

public class WebAcquisitionAgent(
    IChatClient chatClient,
    RecipeFilePublicationStore publications,
    IPromptRepository promptRepository,
    HttpClient httpClient,
    ILogger<WebAcquisitionAgent> logger) : IWorkflowProcessor
{
    public string ProcessorName => "FetchUrlContent";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(task.Payload))
            throw new ArgumentException("Task payload is empty.");

        using var doc = JsonDocument.Parse(task.Payload);
        if (!doc.RootElement.TryGetProperty("recipeId", out var idProp) && !doc.RootElement.TryGetProperty("RecipeId", out idProp))
        {
            throw new ArgumentException("Task payload does not contain recipeId.");
        }

        if (!doc.RootElement.TryGetProperty("url", out var urlProp) && !doc.RootElement.TryGetProperty("Url", out urlProp))
        {
            throw new ArgumentException("Task payload does not contain url.");
        }

        var recipeId = idProp.GetGuid();
        var url = urlProp.GetString() ?? throw new ArgumentException("URL is null.");

        var operation = task.TaskId == Guid.Empty ? Guid.NewGuid() : task.TaskId;
        var input = ProcessorName + "\n" + CanonicalRecipeContentStore.NormalizeJson(task.Payload);
        if (!await publications.TryResumeAsync(recipeId, operation, input, ct))
        {
            var capture = await publications.CaptureForTaskAsync(task, recipeId, ct);
            await ProcessUrlAsync(capture, url, operation, input, ct);
        }

        return new { Message = CompletionMessage(url) };
    }

    private static string CompletionMessage(string url) => $"Fetched and processed content from {url}";

    private static string ContextName(WebContext context, string url) =>
        string.IsNullOrWhiteSpace(context.Name) ? "Recipe from " + new Uri(url).Host : context.Name;

    // Qualifies the original invocation/publication relationship only. Retained
    // HTML, image bytes and context are observations, not authenticated web facts
    // or proof that extraction, hero generation or notification completed.
    internal static Guid ValidateOriginalHistory(string? payload, string? returned, RecipeFilePublication[] publications)
    {
        static void Require(bool valid)
        {
            if (!valid) throw new InvalidDataException("Original web acquisition differs from its publication.");
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
        var hasUrl = input.RootElement.TryGetProperty("url", out var urlValue)
            || input.RootElement.TryGetProperty("Url", out urlValue);
        Require(hasUrl && urlValue.ValueKind == JsonValueKind.String);
        var url = urlValue.GetString()!;
        using var receipt = JsonDocument.Parse(returned ?? "null");
        UniqueObject(receipt.RootElement);
        Require(receipt.RootElement.TryGetProperty("message", out var message) && message.ValueKind == JsonValueKind.String
            && message.GetString() == CompletionMessage(url) && publications.Length == 1 && publications[0].RecipeId == recipeId);
        var (capture, candidate) = RecipeFilePublicationStore.ReadOriginalPublication(publications[0]);
        Require(candidate.SourceKind == "web" && candidate.RecipeJson is null && candidate.SourceContext is not null);
        var context = JsonSerializer.Deserialize<WebContext>(candidate.SourceContext!, JsonDefaults.CaseInsensitive) ?? new();
        var info = JsonSerializer.Deserialize<RecipeInfo>(capture.Files["recipe.info"]!, JsonDefaults.CamelCase)
            ?? throw new InvalidDataException("Original web acquisition metadata is absent.");
        info.Name = ContextName(context, url);
        info.SourceUrl = url;
        var files = candidate.SourceFiles ?? throw new InvalidDataException("Original web acquisition files are absent.");
        Require(files.TryGetValue("original/content.html", out var html) && html is not null);
        if (files.Count != 1)
        {
            var slots = new[] { "original/0.jpg", "original/0.jpeg", "original/0.png", "original/0.webp" };
            Require(!string.IsNullOrWhiteSpace(context.HeroImageUrl) && files.Count == 5
                && slots.All(files.ContainsKey) && slots.Count(path => files[path] is not null) == 1);
            info.ImageCount = 1;
            info.FinishedDishImageIndex = 0;
        }
        Require(CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(info, JsonDefaults.CamelCase))
            == CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(candidate.Info, JsonDefaults.CamelCase)));
        return recipeId;
    }

    private async Task ProcessUrlAsync(RecipePublicationCapture capture, string url, Guid operation, string input, CancellationToken ct)
    {
        var recipeId = capture.RecipeId;
        logger.LogInformation("Fetching content from {Url} for recipe {RecipeId}", url, recipeId);

        string? html = null;
        try
        {
            html = await httpClient.GetStringAsync(url, ct);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Forbidden)
        {
            logger.LogWarning(ex, "Access Forbidden (403) to {Url}. This site might be blocking our scraper. Extraction will continue with limited metadata.", url);
            // Non-fatal: we might have a name already or can fallback to URL
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch HTML content from {Url}.", url);
            throw; // Re-throw to be caught by WorkflowWorker
        }

        // 2. Extract context (Name and Hero Image URL)
        var prompt = promptRepository.GetPrompt(PromptType.WebContextExtraction);
        var agent = chatClient.AsAIAgent(name: "WebExtractor", instructions: prompt);

        // We send a truncated version of HTML if it's too long, or just the first 50k chars
        var contentToAnalyze = html?.Length > 50000 ? html[..50000] : html ?? string.Empty;
        var response = await agent.RunAsync(
            messages: new[] { new ChatMessage(ChatRole.User, $"Extract from this HTML:\n\n{contentToAnalyze}") },
            cancellationToken: ct);

        var jsonResponse = JsonUtils.SanitizeJson(response.Text ?? "{}");
        var context = JsonSerializer.Deserialize<WebContext>(jsonResponse, JsonDefaults.CaseInsensitive) ?? new();

        if (string.IsNullOrWhiteSpace(context.Name))
        {
            logger.LogWarning("Failed to extract recipe name from {Url}. Using URL host as fallback.", url);
        }
        context.Name = ContextName(context, url);

        var info = JsonSerializer.Deserialize<RecipeInfo>(capture.Files["recipe.info"]!, JsonDefaults.CamelCase)
            ?? throw new InvalidDataException("Captured metadata is invalid.");
        info.Name = context.Name;
        // Acquired notes are source evidence, never a replacement for private notes.
        var files = new Dictionary<string, byte[]?>(StringComparer.Ordinal)
        {
            ["original/content.html"] = System.Text.Encoding.UTF8.GetBytes(html ?? string.Empty)
        };

        // 4. Download Hero Image if found
        if (!string.IsNullOrWhiteSpace(context.HeroImageUrl))
        {
            try
            {
                logger.LogInformation("Downloading hero image from {ImageUrl}", context.HeroImageUrl);
                using var imageResponse = await httpClient.GetAsync(context.HeroImageUrl, ct);
                imageResponse.EnsureSuccessStatusCode();

                var imageBytes = await imageResponse.Content.ReadAsByteArrayAsync(ct);
                var contentType = imageResponse.Content.Headers.ContentType?.MediaType ?? "image/jpeg";

                // Save as the first original image (0.jpg/png/webp)
                var extension = contentType.ToLowerInvariant() switch { "image/png" => ".png", "image/webp" => ".webp", _ => ".jpg" };
                foreach (var alternative in new[] { ".jpg", ".jpeg", ".png", ".webp" })
                    files[$"original/0{alternative}"] = alternative == extension ? imageBytes : null;

                info.ImageCount = 1;
                info.FinishedDishImageIndex = 0;
                logger.LogInformation("Downloaded and staged hero image for {RecipeId}", recipeId);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to download hero image from {ImageUrl} for recipe {RecipeId}", context.HeroImageUrl, recipeId);
            }
        }

        info.SourceUrl = url;
        await publications.PublishAsync(capture, new(null, info, input, files, jsonResponse, SourceKind: "web"), operation, ct);

        logger.LogInformation("Finished web acquisition for {RecipeId}", recipeId);
    }

    private class WebContext
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("heroImageUrl")]
        public string? HeroImageUrl { get; set; }

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }
    }
}
