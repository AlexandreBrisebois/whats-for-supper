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
        var extensions = new[] { ".jpg", ".png", ".webp" };
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

    public async Task<bool> ExistsAsync(Guid recipeId, string relativePath)
    {
        var data = await storage.LoadAsync(Partition, $"{recipeId}/{relativePath}");
        return data != null;
    }
}
