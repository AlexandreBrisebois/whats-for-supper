using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class RecipeShareService(
    RecipeDbContext db,
    ImageService images,
    ILogger<RecipeShareService> logger)
{
    public async Task<RecipeShareBundleDto> CreateBundleAsync(Guid recipeId)
    {
        var recipe = await db.Recipes.FindAsync(recipeId)
            ?? throw new KeyNotFoundException($"Recipe {recipeId} not found.");

        logger.LogInformation("Creating share bundle for recipe {RecipeId} ({RecipeName})", recipeId, recipe.Name);

        // 1. Map to DTO for the bundle
        var recipeDto = RecipeService.MapToDto(recipe);
        recipeDto.AddedBy = null;
        recipeDto.Rating = null;
        recipeDto.Notes = null;
        recipeDto.CreatedAt = DateTimeOffset.MinValue;
        recipeDto.DietaryProfile = null;
        // SourceUrl is preserved automatically as it's part of the DTO

        // 2. Read raw info and metadata if available
        var info = await images.ReadRecipeInfo(recipeId);
        if (info != null)
        {
            info.AddedBy = null;
            info.LastCookedDate = null;
            info.Rating = RecipeRating.Unknown;
            info.CreatedAt = DateTimeOffset.MinValue;
            info.DietaryProfile = null;
        }

        // 3. Encode Hero image
        string? heroBase64 = null;
        try
        {
            var (stream, contentType) = await images.GetHeroImage(recipeId);
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms);
            heroBase64 = $"data:{contentType};base64,{Convert.ToBase64String(ms.ToArray())}";
        }
        catch (FileNotFoundException)
        {
            logger.LogWarning("Hero image not found for recipe {RecipeId} during share bundle creation.", recipeId);
        }

        // 4. Encode Original images
        var originals = new List<string>();
        for (int i = 0; i < recipe.ImageCount; i++)
        {
            try
            {
                var (stream, contentType) = await images.GetImage(recipeId, i);
                using var ms = new MemoryStream();
                await stream.CopyToAsync(ms);
                originals.Add($"data:{contentType};base64,{Convert.ToBase64String(ms.ToArray())}");
            }
            catch (FileNotFoundException)
            {
                logger.LogWarning("Original image {Index} not found for recipe {RecipeId} during share bundle creation.", i, recipeId);
            }
        }

        return new RecipeShareBundleDto
        {
            Version = "1.0",
            Recipe = recipeDto,
            Info = info != null ? JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(info)) : default,
            Hero = heroBase64,
            Originals = originals
        };
    }
}
