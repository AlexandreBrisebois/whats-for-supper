using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class GoToService(RecipeDbContext db, ILogger<GoToService> logger)
{
    private const string GoToKey = "family_goto";

    public async Task<GoToListDto> GetGoToListAsync()
    {
        var setting = await db.FamilySettings
            .FirstOrDefaultAsync(s => s.Key == GoToKey);

        if (setting == null)
            return new GoToListDto();

        try
        {
            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            return JsonSerializer.Deserialize<GoToListDto>(setting.Value.GetRawText(), options) ?? new GoToListDto();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to deserialize GOTO list from database.");
            return new GoToListDto();
        }
    }

    public async Task<GoToListDto> SaveGoToListAsync(GoToListDto dto)
    {
        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        var json = JsonSerializer.Serialize(dto, options);
        using var doc = JsonDocument.Parse(json);

        var existing = await db.FamilySettings
            .FirstOrDefaultAsync(s => s.Key == GoToKey);

        if (existing == null)
        {
            existing = new FamilySetting
            {
                Id = Guid.NewGuid(),
                Key = GoToKey,
                Value = doc.RootElement.Clone(),
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.FamilySettings.Add(existing);
        }
        else
        {
            existing.Value = doc.RootElement.Clone();
            existing.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync();
        return dto;
    }

    public async Task<GoToItemDto?> GetActiveGoToAsync()
    {
        var list = await GetGoToListAsync();
        if (list.Items.Count == 0)
            return null;

        var recipeIds = list.Items.Select(i => i.RecipeId).ToList();

        // Fetch all relevant recipes
        var recipes = await db.Recipes
            .Where(r => recipeIds.Contains(r.Id) && r.DeletedAt == null)
            .Select(r => new { r.Id, r.IsReady })
            .ToListAsync();

        var readyIds = recipes.Where(r => r.IsReady).Select(r => r.Id).ToList();

        Guid targetId;
        if (readyIds.Count > 0)
        {
            // Pick a random ready one
            targetId = readyIds[Random.Shared.Next(readyIds.Count)];
        }
        else
        {
            return null;
        }

        var item = list.Items.FirstOrDefault(i => i.RecipeId == targetId);
        if (item != null)
        {
            if (string.IsNullOrEmpty(item.ImageUrl))
            {
                item.ImageUrl = $"/api/recipes/{item.RecipeId}/hero";
            }
            item.Status = readyIds.Contains(targetId) ? "ready" : "pending";
        }
        return item;
    }
}
