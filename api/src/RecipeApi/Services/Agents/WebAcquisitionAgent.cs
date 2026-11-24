using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Agents.AI;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using RecipeApi.Data;
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
    ILogger<WebAcquisitionAgent> logger,
    RecipeDbContext? db = null,
    IClock? clock = null) : IWorkflowProcessor
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

        if (db is not null)
        {
            var existing = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == recipeId, ct);
            if (existing?.CanonicalContent is not null) return new { skipped = true };
        }

        await ProcessUrlAsync(recipeId, url, ct);
        return new { Message = CompletionMessage(url) };
    }

    private static string CompletionMessage(string url) => $"Fetched and processed content from {url}";

    private static string ContextName(WebContext context, string url) =>
        string.IsNullOrWhiteSpace(context.Name) ? "Recipe from " + new Uri(url).Host : context.Name;

    internal static Guid ValidateOriginalHistory(string? payload, string? returned)
    {
        using var input = JsonDocument.Parse(payload ?? "null");
        if (input.RootElement.ValueKind != JsonValueKind.Object)
            throw new InvalidDataException("Original web acquisition payload is invalid.");
        var hasId = input.RootElement.TryGetProperty("recipeId", out var id)
            || input.RootElement.TryGetProperty("RecipeId", out id);
        if (!hasId || id.ValueKind != JsonValueKind.String || !id.TryGetGuid(out var recipeId) || recipeId == Guid.Empty)
            throw new InvalidDataException("Original web acquisition recipeId is invalid.");
        return recipeId;
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
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch HTML content from {Url}.", url);
            throw;
        }

        var prompt = promptRepository.GetPrompt(PromptType.WebContextExtraction);
        var agent = chatClient.AsAIAgent(name: "WebExtractor", instructions: prompt);

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

        RecipeInfo info;
        try
        {
            info = await recipeRepository.GetInfoAsync(recipeId, ct);
        }
        catch (FileNotFoundException)
        {
            info = new RecipeInfo { Id = recipeId };
        }

        info.Name = context.Name;
        info.SourceUrl = url;
        await recipeRepository.SaveContentHtmlAsync(recipeId, html ?? string.Empty, ct);

        if (!string.IsNullOrWhiteSpace(context.HeroImageUrl))
        {
            try
            {
                logger.LogInformation("Downloading hero image from {ImageUrl}", context.HeroImageUrl);
                using var imageResponse = await httpClient.GetAsync(context.HeroImageUrl, ct);
                imageResponse.EnsureSuccessStatusCode();

                var imageBytes = await imageResponse.Content.ReadAsByteArrayAsync(ct);
                var contentType = imageResponse.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
                var extension = contentType.ToLowerInvariant() switch { "image/png" => ".png", "image/webp" => ".webp", _ => ".jpg" };

                foreach (var alternative in new[] { ".jpg", ".jpeg", ".png", ".webp" })
                {
                    if (alternative != extension)
                        await recipeRepository.DeliverPublicationFileAsync(recipeId, $"original/0{alternative}", null);
                }
                await recipeRepository.SaveOriginalImageAsync(recipeId, 0, contentType, imageBytes, ct);

                info.ImageCount = 1;
                info.FinishedDishImageIndex = 0;
                logger.LogInformation("Downloaded hero image for {RecipeId}", recipeId);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to download hero image from {ImageUrl} for recipe {RecipeId}", context.HeroImageUrl, recipeId);
            }
        }

        await recipeRepository.SaveInfoAsync(info, ct);

        if (db is not null)
        {
            await using var transaction = await RecipeRotation.LockAsync(db, recipeId, ct);
            var entity = await db.Recipes.SingleOrDefaultAsync(x => x.Id == recipeId, ct);
            if (entity is not null && entity.CanonicalContent is null)
            {
                entity.Name = info.Name;
                entity.SourceUrl = info.SourceUrl;
                entity.ImageCount = info.ImageCount;
                entity.FinishedDishIndex = info.FinishedDishImageIndex;
                entity.UpdatedAt = (clock ?? new SystemClock()).UtcNow;
                await db.SaveChangesAsync(ct);
            }
            if (transaction is not null) await transaction.CommitAsync(ct);
        }

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
