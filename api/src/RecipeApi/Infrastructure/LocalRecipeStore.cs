using System.Text.Json;
using RecipeApi.Models;

namespace RecipeApi.Infrastructure;

/// <summary>
/// Disk-backed implementation of <see cref="IRecipeStore"/>.
/// Root is resolved via <see cref="RecipesRootResolver"/>.
/// </summary>
public sealed class LocalRecipeStore(RecipesRootResolver resolver, ILogger<LocalRecipeStore> logger) : IRecipeStore
{
    private static readonly Dictionary<string, string> MimeToExt = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
    };

    private static readonly string[] KnownImageExts = [".jpg", ".jpeg", ".png", ".webp"];

    private string Root => resolver.Root;

    private string RecipeDir(Guid id) => Path.Combine(Root, id.ToString());
    private string InfoPath(Guid id) => Path.Combine(RecipeDir(id), "recipe.info");
    private string JsonPath(Guid id) => Path.Combine(RecipeDir(id), "recipe.json");
    private string OriginalDir(Guid id) => Path.Combine(RecipeDir(id), "original");
    private string HeroPath(Guid id) => Path.Combine(RecipeDir(id), "hero.jpg");

    // ── recipe.info ──────────────────────────────────────────────────────────

    public async Task<RecipeInfo?> ReadInfoAsync(Guid recipeId, CancellationToken ct = default)
    {
        var path = InfoPath(recipeId);
        if (!File.Exists(path)) return null;
        var json = await File.ReadAllTextAsync(path, ct);
        return JsonSerializer.Deserialize<RecipeInfo>(json, JsonDefaults.CamelCase);
    }

    public async Task WriteInfoAsync(RecipeInfo info, CancellationToken ct = default)
    {
        var dir = RecipeDir(info.Id);
        Directory.CreateDirectory(dir);
        var json = JsonSerializer.Serialize(info, JsonDefaults.CamelCase);
        await File.WriteAllTextAsync(InfoPath(info.Id), json, ct);
        logger.LogDebug("Wrote recipe.info for {RecipeId}", info.Id);
    }

    public Task<bool> InfoExistsAsync(Guid recipeId, CancellationToken ct = default)
        => Task.FromResult(File.Exists(InfoPath(recipeId)));

    // ── recipe.json ──────────────────────────────────────────────────────────

    public async Task<string?> ReadRecipeJsonAsync(Guid recipeId, CancellationToken ct = default)
    {
        var path = JsonPath(recipeId);
        if (!File.Exists(path)) return null;
        return await File.ReadAllTextAsync(path, ct);
    }

    public async Task WriteRecipeJsonAsync(Guid recipeId, string json, CancellationToken ct = default)
    {
        var dir = RecipeDir(recipeId);
        Directory.CreateDirectory(dir);
        await File.WriteAllTextAsync(JsonPath(recipeId), json, ct);
    }

    public Task<bool> RecipeJsonExistsAsync(Guid recipeId, CancellationToken ct = default)
        => Task.FromResult(File.Exists(JsonPath(recipeId)));

    // ── images ───────────────────────────────────────────────────────────────

    public async Task SaveOriginalImageAsync(Guid recipeId, int index, string contentType, Stream source, CancellationToken ct = default)
    {
        var ext = MimeToExt.GetValueOrDefault(contentType.ToLowerInvariant(), ".jpg");
        var dir = OriginalDir(recipeId);
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, $"{index}{ext}");
        await using var dest = File.Create(path);
        await source.CopyToAsync(dest, ct);
        await dest.FlushAsync(ct);
        logger.LogInformation("Saved original image {Index} for recipe {RecipeId}", index, recipeId);
    }

    public Task<(Stream Stream, string ContentType)?> ReadOriginalImageAsync(Guid recipeId, int index, CancellationToken ct = default)
    {
        var dir = OriginalDir(recipeId);
        foreach (var (mime, ext) in MimeToExt)
        {
            var path = Path.Combine(dir, $"{index}{ext}");
            if (File.Exists(path))
                return Task.FromResult<(Stream, string)?>((File.OpenRead(path), mime));
        }
        return Task.FromResult<(Stream, string)?>(null);
    }

    public async Task SaveHeroImageAsync(Guid recipeId, Stream source, CancellationToken ct = default)
    {
        var dir = RecipeDir(recipeId);
        Directory.CreateDirectory(dir);
        var path = HeroPath(recipeId);
        await using var dest = File.Create(path);
        await source.CopyToAsync(dest, ct);
        await dest.FlushAsync(ct);
        logger.LogInformation("Saved hero image for recipe {RecipeId}", recipeId);
    }

    public Task<(Stream Stream, string ContentType)?> ReadHeroImageAsync(Guid recipeId, CancellationToken ct = default)
    {
        var path = HeroPath(recipeId);
        if (!File.Exists(path))
            return Task.FromResult<(Stream, string)?>(null);
        return Task.FromResult<(Stream, string)?>((File.OpenRead(path), "image/jpeg"));
    }

    public Task<bool> HasOriginalImagesAsync(Guid recipeId, CancellationToken ct = default)
    {
        var dir = OriginalDir(recipeId);
        var exists = Directory.Exists(dir) &&
                     Directory.GetFiles(dir).Any(f =>
                         KnownImageExts.Contains(Path.GetExtension(f).ToLowerInvariant()));
        return Task.FromResult(exists);
    }

    // ── lifecycle ────────────────────────────────────────────────────────────

    public Task DeleteAsync(Guid recipeId, CancellationToken ct = default)
    {
        var dir = RecipeDir(recipeId);
        if (Directory.Exists(dir))
        {
            logger.LogInformation("Deleting files for recipe {RecipeId} at {Directory}", recipeId, dir);
            Directory.Delete(dir, recursive: true);
        }
        else
        {
            logger.LogWarning("Delete requested for recipe {RecipeId} but directory does not exist", recipeId);
        }
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Guid>> ListRecipeIdsAsync(CancellationToken ct = default)
    {
        if (!Directory.Exists(Root))
            return Task.FromResult<IReadOnlyList<Guid>>([]);

        var ids = Directory.GetDirectories(Root)
            .Select(d => Path.GetFileName(d))
            .Where(name => Guid.TryParse(name, out _))
            .Select(Guid.Parse)
            .ToList();

        return Task.FromResult<IReadOnlyList<Guid>>(ids);
    }
}
