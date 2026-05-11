using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using RecipeApi.Dto;
using RecipeApi.Utils;

namespace RecipeApi.Services;

public sealed record PantrySnapshot(
    Guid SnapshotId,
    IReadOnlyList<string> InferredIngredients,
    double Confidence);

/// <summary>
/// Processes pantry-photo submissions into a request-scoped in-memory PantrySnapshot.
/// Snapshots expire after 60 seconds via a background sweep. Temp photo files are
/// always deleted after processing (success, busy, or failure).
/// </summary>
public sealed class InventoryCaptureService : IDisposable
{
    private const int SnapshotTtlSeconds = 60;
    private const int BusyRetryAfterSeconds = 30;

    private static readonly string TempPhotosBaseDir =
        Path.Combine(Path.GetTempPath(), "pantry-captures");

    private readonly IChatClient _chatClient;
    private readonly ILogger<InventoryCaptureService> _logger;
    private readonly IConfiguration? _configuration;
    private readonly string _tempBase;
    private readonly ConcurrentDictionary<Guid, (PantrySnapshot Snapshot, DateTimeOffset Expires)> _snapshots = new();
    private readonly Timer _sweepTimer;

    public Action<string>? OnTempDirCreated;

    public InventoryCaptureService(IChatClient chatClient, ILogger<InventoryCaptureService> logger, string? tempBase = null, IConfiguration? configuration = null)
    {
        _chatClient = chatClient;
        _logger = logger;
        _configuration = configuration;
        _tempBase = tempBase ?? TempPhotosBaseDir;
        _sweepTimer = new Timer(_ => SweepExpired(), null, TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(30));
    }

    /// <summary>
    /// Writes photos to temp disk, calls vision model, builds snapshot, cleans up.
    /// Returns (snapshot, busy=false) on success, (null, busy=true) when model unavailable.
    /// </summary>
    public async Task<(PantrySnapshot? Snapshot, bool Busy)> ProcessAsync(
        IReadOnlyList<byte[]> photos,
        CancellationToken ct = default)
    {
        var (analysis, busy) = await AnalyzePhotosAsync(photos, BuildInventoryVisionPrompt(photos.Count), ct);
        if (busy || analysis.Ingredients.Count == 0) return (null, busy);

        var snapshot = StoreSnapshot(analysis.Ingredients, analysis.Confidence);
        return (snapshot, false);
    }

    /// <summary>
    /// Single-shot photo search classification. Images are sent to the vision model once;
    /// downstream recipe lookup/search is text/database-only.
    /// </summary>
    public async Task<(PhotoSearchResponseDto? Result, bool Busy)> ProcessPhotoSearchAsync(
        IReadOnlyList<byte[]> photos,
        CancellationToken ct = default)
    {
        var (analysis, busy) = await AnalyzePhotosAsync(photos, BuildPhotoSearchVisionPrompt(photos.Count), ct);
        if (busy) return (null, true);

        var intent = string.Equals(analysis.Intent, "recipe", StringComparison.OrdinalIgnoreCase)
            ? "recipe"
            : "inventory";

        Guid? pantrySnapshotId = null;
        if (intent == "inventory" && analysis.Ingredients.Count > 0)
        {
            pantrySnapshotId = StoreSnapshot(analysis.Ingredients, analysis.Confidence).SnapshotId;
        }

        return (new PhotoSearchResponseDto
        {
            Intent = intent,
            Query = intent == "recipe" ? analysis.Query : string.Empty,
            InferredIngredients = analysis.Ingredients,
            Confidence = analysis.Confidence,
            PantrySnapshotId = pantrySnapshotId
        }, false);
    }

    private async Task<(VisionAnalysis Analysis, bool Busy)> AnalyzePhotosAsync(
        IReadOnlyList<byte[]> photos,
        string prompt,
        CancellationToken ct)
    {
        var requestId = Guid.NewGuid();
        var tempDir = Path.Combine(_tempBase, requestId.ToString("N"));
        Directory.CreateDirectory(tempDir);
        OnTempDirCreated?.Invoke(tempDir);

        try
        {
            // Write photos to temp dir
            for (var i = 0; i < photos.Count; i++)
            {
                var path = Path.Combine(tempDir, $"{i}.jpg");
                await File.WriteAllBytesAsync(path, photos[i], ct);
            }

            // Call vision model once through the same agent path used by recipe extraction.
            var message = new ChatMessage(ChatRole.User, prompt);
            for (var i = 0; i < photos.Count; i++)
            {
                message.Contents.Add(new DataContent(photos[i], "image/jpeg"));
            }

            var agent = _chatClient.AsAIAgent(
                name: "InventoryCapture",
                instructions: "You identify visible food inventory from pantry, fridge, and freezer photos.");
            var response = await agent.RunAsync(
                messages: [message],
                options: GetChatOptions(),
                cancellationToken: ct);
            var responseText = response.Text ?? string.Empty;

            _logger.LogInformation("Vision model response: {Response}", responseText);

            var sanitizedResponse = JsonUtils.SanitizeJson(responseText);
            return (ParseAnalysis(sanitizedResponse), false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing inventory capture");
            return (new VisionAnalysis("inventory", string.Empty, [], 0.5), true);
        }
        finally
        {
            // Always delete temp photos
            if (Directory.Exists(tempDir))
                Directory.Delete(tempDir, recursive: true);
        }
    }

    public PantrySnapshot? GetSnapshot(Guid snapshotId)
    {
        if (_snapshots.TryGetValue(snapshotId, out var entry) && entry.Expires > DateTimeOffset.UtcNow)
            return entry.Snapshot;
        return null;
    }

    private PantrySnapshot StoreSnapshot(IReadOnlyList<string> ingredients, double confidence)
    {
        var snapshot = new PantrySnapshot(Guid.NewGuid(), ingredients, confidence);
        _snapshots[snapshot.SnapshotId] = (snapshot, DateTimeOffset.UtcNow.AddSeconds(SnapshotTtlSeconds));
        return snapshot;
    }

    private static string BuildInventoryVisionPrompt(int photoCount) =>
        $"You are analyzing {photoCount} pantry/fridge/freezer photo(s). " +
        "List the visible ingredients as a JSON object: " +
        "{\"ingredients\": [\"item1\", \"item2\"], \"confidence\": 0.85}. " +
        "Only include clearly visible food items. Respond with valid JSON only.";

    private static string BuildPhotoSearchVisionPrompt(int photoCount) =>
        $"You are analyzing {photoCount} food-related photo(s) for a recipe library search. " +
        "Classify the photos as exactly one intent: " +
        "\"recipe\" when the images show a recipe card, handwritten recipe, typed recipe, cookbook page, meal kit card, or recipe screenshot; " +
        "\"inventory\" when the images show fridge, pantry, freezer, counter, table, or loose food items. " +
        "For recipe intent, extract the visible recipe title/name and the most useful visible ingredients or dish words for matching an existing library recipe. " +
        "For inventory intent, list only clearly visible food items. Do not invent hidden items. " +
        "Respond with valid JSON only in this exact shape: " +
        "{\"intent\":\"recipe\",\"query\":\"recipe title and key ingredients\",\"ingredients\":[\"item1\"],\"confidence\":0.85}.";

    private ChatClientAgentRunOptions GetChatOptions()
    {
        return new ChatClientAgentRunOptions
        {
            ChatOptions = new ChatOptions
            {
                Temperature = 0.1f,
                MaxOutputTokens = _configuration?.GetValue<int?>("GEMINI_MAX_OUTPUT_TOKENS") ?? 8192
            }
        };
    }

    private static VisionAnalysis ParseAnalysis(string json)
    {
        var intent = ParseString(json, "intent");
        var query = ParseString(json, "query");
        var ingredients = ParseIngredients(json);
        var confidence = ParseConfidence(json);

        if (string.IsNullOrWhiteSpace(query) && ingredients.Count > 0)
            query = string.Join(" ", ingredients.Take(5));

        return new VisionAnalysis(intent, query, ingredients, confidence);
    }

    private static string ParseString(string json, string propertyName)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty(propertyName, out var value))
                return value.GetString() ?? string.Empty;
        }
        catch (JsonException) { }
        return string.Empty;
    }

    private static IReadOnlyList<string> ParseIngredients(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("ingredients", out var arr) ||
                doc.RootElement.TryGetProperty("inferredIngredients", out arr))
            {
                return arr.EnumerateArray()
                    .Select(e => e.GetString() ?? string.Empty)
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .ToList();
            }
        }
        catch (JsonException) { }
        return [];
    }

    private static double ParseConfidence(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("confidence", out var conf))
                return conf.GetDouble();
        }
        catch (JsonException) { }
        return 0.5;
    }

    private void SweepExpired()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var key in _snapshots.Keys)
        {
            if (_snapshots.TryGetValue(key, out var entry) && entry.Expires <= now)
                _snapshots.TryRemove(key, out _);
        }
    }

    public void Dispose() => _sweepTimer.Dispose();

    private sealed record VisionAnalysis(
        string Intent,
        string Query,
        IReadOnlyList<string> Ingredients,
        double Confidence);
}
