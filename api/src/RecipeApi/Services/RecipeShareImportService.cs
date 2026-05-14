using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class RecipeShareImportService(
    RecipeDbContext db,
    ImageService images,
    SearchIndexWorkflow searchIndex,
    IWorkflowOrchestrator orchestrator,
    ILogger<RecipeShareImportService> logger)
{
    public async Task<Guid> ImportBundleAsync(Guid familyMemberId, RecipeShareBundleDto bundle)
    {
        var recipeId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        logger.LogInformation("Importing shared recipe bundle. Original Name: {Name}, New ID: {RecipeId}",
            bundle.Recipe.Name, recipeId);

        // 1. Save Hero Image
        if (!string.IsNullOrEmpty(bundle.Hero))
        {
            var (bytes, contentType) = ParseDataUrl(bundle.Hero);
            using var ms = new MemoryStream(bytes);
            await images.SaveHeroImage(recipeId, ms);
        }

        // 2. Save Originals
        for (int i = 0; i < bundle.Originals.Count; i++)
        {
            var (bytes, contentType) = ParseDataUrl(bundle.Originals[i]);
            using var ms = new MemoryStream(bytes);
            await images.SaveOriginalImage(recipeId, i, contentType, ms);
        }

        // 3. Reconstruct Recipe Entity
        var recipe = new Recipe
        {
            Id = recipeId,
            Name = bundle.Recipe.Name,
            Description = bundle.Recipe.Description,
            Notes = null, // Always start clean on import
            Rating = RecipeRating.Unknown,
            Ingredients = bundle.Recipe.Ingredients != null ? JsonSerializer.Serialize(bundle.Recipe.Ingredients) : null,
            RawMetadata = JsonSerializer.Serialize(new
            {
                recipeInstructions = bundle.Recipe.RecipeInstructions,
                language = bundle.Recipe.Language
            }),
            ImageCount = bundle.Originals.Count,
            FinishedDishIndex = bundle.Recipe.FinishedDishIndex,
            Category = bundle.Recipe.Category,
            TotalTime = bundle.Recipe.TotalTime,
            IsVegetarian = bundle.Recipe.IsVegetarian ?? false,
            IsHealthyChoice = bundle.Recipe.IsHealthyChoice ?? false,
            IsDiscoverable = bundle.Recipe.IsDiscoverable ?? false,
            IsSynthesized = bundle.Recipe.IsSynthesized || bundle.Originals.Count == 0,
            SourceUrl = bundle.Recipe.SourceUrl,
            AddedBy = familyMemberId,
            CreatedAt = now,
            UpdatedAt = now,
            IsReady = true // Imported recipes are already processed
        };

        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();

        // 4. Save recipe.info
        var info = new RecipeInfo
        {
            Id = recipeId,
            Name = recipe.Name,
            Description = recipe.Description,
            Notes = recipe.Notes,
            Rating = recipe.Rating,
            Category = recipe.Category,
            TotalTime = recipe.TotalTime,
            IsVegetarian = recipe.IsVegetarian,
            IsHealthyChoice = recipe.IsHealthyChoice,
            IsDiscoverable = recipe.IsDiscoverable,
            SourceUrl = recipe.SourceUrl,
            ImageCount = recipe.ImageCount,
            FinishedDishImageIndex = recipe.FinishedDishIndex,
            AddedBy = familyMemberId,
            CreatedAt = now
        };
        await images.CreateRecipeInfo(info);

        // 5. Trigger Search Indexing
        try
        {
            await orchestrator.TriggerAsync("index-recipe-search", new Dictionary<string, string>
            {
                ["recipeId"] = recipeId.ToString(),
                ["fingerprint"] = SearchFingerprintService.ComputeSourceFingerprint(recipe)
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to trigger search index for imported recipe {RecipeId}", recipeId);
        }

        return recipeId;
    }

    private (byte[] Bytes, string ContentType) ParseDataUrl(string dataUrl)
    {
        // data:image/jpeg;base64,...
        var parts = dataUrl.Split(',');
        if (parts.Length < 2) throw new ArgumentException("Invalid Data URL format.");

        var header = parts[0];
        var base64 = parts[1];

        var contentType = header.Split(';')[0].Split(':')[1];
        var bytes = Convert.FromBase64String(base64);

        return (bytes, contentType);
    }
}
