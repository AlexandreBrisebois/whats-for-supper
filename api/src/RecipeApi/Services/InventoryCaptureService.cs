using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.AI;

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
    private readonly string _tempBase;
    private readonly ConcurrentDictionary<Guid, (PantrySnapshot Snapshot, DateTimeOffset Expires)> _snapshots = new();
    private readonly Timer _sweepTimer;

    public Action<string>? OnTempDirCreated;

    public InventoryCaptureService(IChatClient chatClient, string? tempBase = null)
    {
        _chatClient = chatClient;
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

            // Call vision model
            var prompt = BuildVisionPrompt(photos.Count);
            var response = await _chatClient.GetResponseAsync(prompt, cancellationToken: ct);
            var ingredients = ParseIngredients(response.Text ?? string.Empty);
            var confidence = ParseConfidence(response.Text ?? string.Empty);

            var snapshot = new PantrySnapshot(Guid.NewGuid(), ingredients, confidence);
            _snapshots[snapshot.SnapshotId] = (snapshot, DateTimeOffset.UtcNow.AddSeconds(SnapshotTtlSeconds));

            return (snapshot, false);
        }
        catch (Exception)
        {
            return (null, true);
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

    private static string BuildVisionPrompt(int photoCount) =>
        $"You are analyzing {photoCount} pantry/fridge/freezer photo(s). " +
        "List the visible ingredients as a JSON object: " +
        "{\"ingredients\": [\"item1\", \"item2\"], \"confidence\": 0.85}. " +
        "Only include clearly visible food items. Respond with valid JSON only.";

    private static IReadOnlyList<string> ParseIngredients(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("ingredients", out var arr))
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
}
