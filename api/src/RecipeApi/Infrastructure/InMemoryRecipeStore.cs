using System.Collections.Concurrent;
using System.Text.Json;
using RecipeApi.Models;

namespace RecipeApi.Infrastructure;

/// <summary>
/// Thread-safe in-memory implementation of <see cref="IRecipeStore"/> for testing.
/// </summary>
public sealed class InMemoryRecipeStore : IRecipeStore
{
    private readonly ConcurrentDictionary<Guid, RecipeInfo> _info = new();
    private readonly ConcurrentDictionary<Guid, string> _json = new();
    private readonly ConcurrentDictionary<string, (byte[] Data, string ContentType)> _images = new();

    private static string ImageKey(Guid id, string slot) => $"{id}/{slot}";

    // ── recipe.info ──────────────────────────────────────────────────────────

    public Task<RecipeInfo?> ReadInfoAsync(Guid recipeId, CancellationToken ct = default)
        => Task.FromResult(_info.TryGetValue(recipeId, out var info) ? info : null);

    public Task WriteInfoAsync(RecipeInfo info, CancellationToken ct = default)
    {
        _info[info.Id] = info;
        return Task.CompletedTask;
    }

    public Task<bool> InfoExistsAsync(Guid recipeId, CancellationToken ct = default)
        => Task.FromResult(_info.ContainsKey(recipeId));

    // ── recipe.json ──────────────────────────────────────────────────────────

    public Task<string?> ReadRecipeJsonAsync(Guid recipeId, CancellationToken ct = default)
        => Task.FromResult(_json.TryGetValue(recipeId, out var json) ? json : null);

    public Task WriteRecipeJsonAsync(Guid recipeId, string json, CancellationToken ct = default)
    {
        _json[recipeId] = json;
        return Task.CompletedTask;
    }

    public Task<bool> RecipeJsonExistsAsync(Guid recipeId, CancellationToken ct = default)
        => Task.FromResult(_json.ContainsKey(recipeId));

    // ── images ───────────────────────────────────────────────────────────────

    private static readonly Dictionary<string, string> MimeToExt = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
    };

    public async Task SaveOriginalImageAsync(Guid recipeId, int index, string contentType, Stream source, CancellationToken ct = default)
    {
        var ext = MimeToExt.GetValueOrDefault(contentType.ToLowerInvariant(), ".jpg");
        using var ms = new MemoryStream();
        await source.CopyToAsync(ms, ct);
        _images[ImageKey(recipeId, $"original/{index}{ext}")] = (ms.ToArray(), contentType);
    }

    public Task<(Stream Stream, string ContentType)?> ReadOriginalImageAsync(Guid recipeId, int index, CancellationToken ct = default)
    {
        foreach (var (mime, ext) in MimeToExt)
        {
            var key = ImageKey(recipeId, $"original/{index}{ext}");
            if (_images.TryGetValue(key, out var entry))
                return Task.FromResult<(Stream, string)?>((new MemoryStream(entry.Data), entry.ContentType));
        }
        return Task.FromResult<(Stream, string)?>(null);
    }

    public async Task SaveHeroImageAsync(Guid recipeId, Stream source, CancellationToken ct = default)
    {
        using var ms = new MemoryStream();
        await source.CopyToAsync(ms, ct);
        _images[ImageKey(recipeId, "hero.jpg")] = (ms.ToArray(), "image/jpeg");
    }

    public Task<(Stream Stream, string ContentType)?> ReadHeroImageAsync(Guid recipeId, CancellationToken ct = default)
    {
        var key = ImageKey(recipeId, "hero.jpg");
        if (_images.TryGetValue(key, out var entry))
            return Task.FromResult<(Stream, string)?>((new MemoryStream(entry.Data), entry.ContentType));
        return Task.FromResult<(Stream, string)?>(null);
    }

    public Task<bool> HasOriginalImagesAsync(Guid recipeId, CancellationToken ct = default)
    {
        var prefix = $"{recipeId}/original/";
        var has = _images.Keys.Any(k => k.StartsWith(prefix));
        return Task.FromResult(has);
    }

    // ── lifecycle ────────────────────────────────────────────────────────────

    public Task DeleteAsync(Guid recipeId, CancellationToken ct = default)
    {
        _info.TryRemove(recipeId, out _);
        _json.TryRemove(recipeId, out _);
        var imageKeys = _images.Keys.Where(k => k.StartsWith($"{recipeId}/")).ToList();
        foreach (var key in imageKeys) _images.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Guid>> ListRecipeIdsAsync(CancellationToken ct = default)
    {
        var ids = _info.Keys
            .Union(_json.Keys)
            .Union(_images.Keys.Select(k => Guid.TryParse(k.Split('/')[0], out var g) ? g : Guid.Empty).Where(g => g != Guid.Empty))
            .Distinct()
            .ToList();
        return Task.FromResult<IReadOnlyList<Guid>>(ids);
    }
}
