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
    RecipeRepository recipeRepository,
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

        await ProcessUrlAsync(recipeId, url, ct);

        return new { Message = $"Fetched and processed content from {url}" };
    }

    private async Task ProcessUrlAsync(Guid recipeId, string url, CancellationToken ct)
    {
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
            context.Name = "Recipe from " + new Uri(url).Host;
        }

        // 3. Update recipe info
        RecipeInfo info;
        try { info = await recipeRepository.GetInfoAsync(recipeId, ct); }
        catch { info = new RecipeInfo { Id = recipeId }; }

        info.Name = context.Name;
        await recipeRepository.SaveInfoAsync(info, ct);

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
                await recipeRepository.SaveOriginalImageAsync(recipeId, 0, contentType, imageBytes, ct);

                info.ImageCount = 1;
                info.FinishedDishImageIndex = 0;
                await recipeRepository.SaveInfoAsync(info, ct);
                logger.LogInformation("Successfully downloaded and saved hero image for {RecipeId}", recipeId);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to download hero image from {ImageUrl} for recipe {RecipeId}", context.HeroImageUrl, recipeId);
            }
        }

        // 5. Save HTML as a first-class artifact
        await recipeRepository.SaveContentHtmlAsync(recipeId, html ?? string.Empty, ct);

        // 6. Persist SourceUrl in recipe.info
        info.SourceUrl = url;
        await recipeRepository.SaveInfoAsync(info, ct);

        logger.LogInformation("Finished web acquisition for {RecipeId}", recipeId);
    }

    private class WebContext
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("heroImageUrl")]
        public string? HeroImageUrl { get; set; }
    }
}
