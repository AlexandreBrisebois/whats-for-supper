using Agent.Utils;

namespace Agent.Models;

public class RecipeRepository(IStorageProvider storage)
{
    public async Task<string> CreateAsync(List<byte[]> images)
    {
        var recipeInfo = new RecipeInfo();
        
        for (var index = 0; index < images.Count; index++)
        {
            var image = images[index];
            var imageKey = recipeInfo.Id + "/original-"+index+".jpg";
            
            recipeInfo.OriginalImages.Add(imageKey);
            await storage.SaveAsync("recipes", imageKey, image);
        }
        
        await SaveInfo(recipeInfo);
        
        return recipeInfo.Id;
    }

    private async Task SaveInfo(RecipeInfo recipeInfo)
    {
        await storage.SaveAsync("recipes", recipeInfo.Id + "/info.json",
            System.Text.Json.JsonSerializer.Serialize(recipeInfo));
    }

    public List<string> List()
    {
        return storage.List("recipes");
    }
    
    public async Task<List<KeyValuePair<string, string>>> FindAsync(string id, string partialKey)
    {
        return await storage.FindAsync("recipes", id + "/" + partialKey);
    }

    public async Task<RecipeInfo> LoadInfoAsync(string id)
    {
        var data = await storage.LoadAsync("recipes", id + "/info.json");
        if (data != null)        {
            var json = System.Text.Encoding.UTF8.GetString(data);
            return System.Text.Json.JsonSerializer.Deserialize<RecipeInfo>(json) ?? throw new InvalidOperationException("Failed to deserialize recipe info.");
        }
        throw new InvalidOperationException($"Recipe with id {id} not found.");
    }

    public async Task<List<ReadOnlyMemory<byte>>> GetOriginals(RecipeInfo recipeInfo)
    {
        var originals = new List<ReadOnlyMemory<byte>>();
        foreach (var imageKey in recipeInfo.OriginalImages)
        {
            var data = await storage.LoadAsync("recipes", imageKey);
            if (data != null)
            {
                originals.Add(data);
            }
        }
        return originals;
    }

    public async Task SetRecipeAsync(string recipeId, Recipe recipe)
    {
        var recipeInfo = await LoadInfoAsync(recipeId);
        recipeInfo.Name = recipe.Name;

        if (!string.IsNullOrEmpty(recipe.Description))
            recipeInfo.Description = recipe.Description;
        
        await SaveInfo(recipeInfo);
        
        await storage.SaveAsync("recipes", recipeInfo.Id + "/recipe.json",
            System.Text.Json.JsonSerializer.Serialize(recipe));
    }
    
    public async Task<Recipe> GetRecipeAsync(string recipeId)
    {
        var data = await storage.LoadAsync("recipes", recipeId + "/recipe.json");
        if (data != null)        {
            var json = System.Text.Encoding.UTF8.GetString(data);
            return System.Text.Json.JsonSerializer.Deserialize<Recipe>(json) ?? throw new InvalidOperationException("Failed to deserialize recipe.");
        }
        throw new InvalidOperationException($"Recipe with id {recipeId} not found.");
    }
    
    public async Task<byte[]?> GetThumbnailAsync(string recipeId)
    {
        var data = await storage.LoadAsync("recipes", recipeId + "/thumbnail.jpg");
        return data;
    }
    
    public async Task SetThumbnailAsync(string recipeId, byte[] thumbnailData)
    {
        var path = recipeId + "/thumbnail.jpg";
        
        await storage.SaveAsync("recipes", path, thumbnailData);
        
        var info = await LoadInfoAsync(recipeId);
        info.Thumbnail = path;
        await SaveInfo(info);
    }
}