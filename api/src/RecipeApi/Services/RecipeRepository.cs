namespace RecipeApi.Services;

using System;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

/// <summary>
/// Domain-specific repository for managing recipe files, ported and adapted from the agent-framework experiment.
/// Uses <see cref="IStorageProvider"/> for the underlying persistence.
/// </summary>
public class RecipeRepository(IStorageProvider storage)
{
    private const string Partition = "recipes";

    internal Task<byte[]?> ReadPublicationFileAsync(Guid id, string path) => storage.LoadAsync(Partition, $"{id}/{path}");
    internal Task DeliverPublicationFileAsync(Guid id, string path, byte[]? bytes) => bytes is null
        ? storage.DeleteAtomicallyAsync(Partition, $"{id}/{path}")
        : storage.SaveAtomicallyAsync(Partition, $"{id}/{path}", bytes);

    internal async Task<IReadOnlyDictionary<string, byte[]?>> CapturePublicationFilesAsync(Guid id, CancellationToken ct, bool allowMissingInfo = false)
    {
        var files = new SortedDictionary<string, byte[]?>(StringComparer.Ordinal);
        foreach (var path in new[] { "recipe.info", "recipe.json", "original/content.html", "original/source.pdf", "hero.webp", "hero.jpg" })
        {
            ct.ThrowIfCancellationRequested();
            files[path] = await ReadPublicationFileAsync(id, path);
        }
        if (files["recipe.info"] is { } infoBytes)
        {
            var info = JsonSerializer.Deserialize<RecipeInfo>(infoBytes, JsonDefaults.CamelCase)
                ?? throw new InvalidDataException("Recipe info is invalid.");
            if (info.Id != id || info.ImageCount is < 0 or > 20) throw new InvalidDataException("Recipe media membership is invalid.");
        }
        else if (!allowMissingInfo) throw new FileNotFoundException("Recipe info is missing.");
        // Include absent extension alternatives: adding a preferred image must
        // conflict too, rather than silently changing the evidence selected.
        for (var index = 0; index < 20; index++)
            foreach (var extension in new[] { ".jpg", ".jpeg", ".png", ".webp" })
            {
                var path = $"original/{index}{extension}";
                files[path] = await ReadPublicationFileAsync(id, path);
            }
        return files;
    }

    public async Task<RecipeInfo> GetInfoAsync(Guid recipeId, CancellationToken ct)
    {
        var data = await storage.LoadAsync(Partition, $"{recipeId}/recipe.info");
        if (data == null)
        {
            throw new FileNotFoundException($"Recipe info file not found for recipe {recipeId}");
        }

        var json = Encoding.UTF8.GetString(data);
        return JsonSerializer.Deserialize<RecipeInfo>(json, JsonDefaults.CamelCase)
               ?? throw new InvalidDataException($"Failed to deserialize recipe.info for {recipeId}");
    }

    public async Task SaveInfoAsync(RecipeInfo info, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(info, JsonDefaults.CamelCase);
        await storage.SaveAsync(Partition, $"{info.Id}/recipe.info", json);
    }

    public async Task<string> GetRecipeJsonAsync(Guid recipeId, CancellationToken ct)
    {
        var data = await storage.LoadAsync(Partition, $"{recipeId}/recipe.json");
        if (data == null)
        {
            throw new FileNotFoundException($"Recipe JSON file not found for recipe {recipeId}");
        }

        return Encoding.UTF8.GetString(data);
    }

    public async Task SaveRecipeJsonAsync(Guid recipeId, string json, CancellationToken ct)
    {
        await storage.SaveAsync(Partition, $"{recipeId}/recipe.json", json);
    }

    public async Task<byte[]> GetOriginalImageAsync(Guid recipeId, int index, CancellationToken ct)
    {
        // Supporting common extensions as per ImageService logic
        var extensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        foreach (var ext in extensions)
        {
            var data = await storage.LoadAsync(Partition, $"{recipeId}/original/{index}{ext}");
            if (data != null) return data;
        }

        throw new FileNotFoundException($"Original image {index} not found for recipe {recipeId}");
    }

    public async Task SaveOriginalImageAsync(Guid recipeId, int index, string contentType, byte[] data, CancellationToken ct)
    {
        var ext = contentType.ToLowerInvariant() switch
        {
            "image/png" => ".png",
            "image/webp" => ".webp",
            _ => ".jpg"
        };
        await storage.SaveAsync(Partition, $"{recipeId}/original/{index}{ext}", data);
    }

    /// <summary>
    /// Persists the raw HTML of a recipe webpage to original/content.html using UTF-8 encoding (no BOM).
    /// </summary>
    public async Task SaveContentHtmlAsync(Guid recipeId, string html, CancellationToken ct)
    {
        var encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);
        var bytes = encoding.GetBytes(html);
        await storage.SaveAsync(Partition, $"{recipeId}/original/content.html", bytes);
    }

    /// <summary>
    /// Returns the HTML string from original/content.html, or null if the file does not exist.
    /// </summary>
    public async Task<string?> GetContentHtmlAsync(Guid recipeId, CancellationToken ct)
    {
        var data = await storage.LoadAsync(Partition, $"{recipeId}/original/content.html");
        if (data == null) return null;

        var encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);
        return encoding.GetString(data);
    }

    public async Task<bool> ExistsAsync(Guid recipeId, string relativePath)
    {
        var data = await storage.LoadAsync(Partition, $"{recipeId}/{relativePath}");
        return data != null;
    }
}
