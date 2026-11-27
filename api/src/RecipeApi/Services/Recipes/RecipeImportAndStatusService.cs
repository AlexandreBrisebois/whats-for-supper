using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services.Recipes;

public sealed class RecipeImportAndStatusService(
    IClock clock,
    RecipeDbContext db,
    IValidationService validation,
    IRecipeStore recipeStore,
    IWorkflowOrchestrator orchestrator,
    ILogger logger)
{
    /// <summary>
    /// Creates a new recipe from a multipart upload.
    /// Validates images and form fields, saves to disk and DB, writes recipe.info.
    /// </summary>
    public async Task<Guid> CreateRecipe(
        Guid familyMemberId,
        IFormFileCollection files,
        CreateRecipeDto request)
    {
        // 1. Verify family member exists (prevent FK violation and 500 error)
        var memberExists = await db.FamilyMembers.AnyAsync(m => m.Id == familyMemberId);
        if (!memberExists)
        {
            throw new KeyNotFoundException($"Family member with ID {familyMemberId} not found. Your session may be stale.");
        }

        // 2. Validate inputs
        validation.ValidateImageCount(files.Count);
        foreach (var file in files)
            validation.ValidateImage(file);
        validation.ValidateRating(request.Rating);
        validation.ValidateFinishedDishImageIndex(request.FinishedDishImageIndex, files.Count);

        var recipeId = Guid.NewGuid();
        var now = clock.UtcNow;

        for (var index = 0; index < files.Count; index++)
        {
            var file = files[index];
            await using var source = file.OpenReadStream();
            using var buffer = new MemoryStream();
            var chunk = new byte[81920];
            int read;
            while ((read = await source.ReadAsync(chunk)) != 0)
            {
                if (buffer.Length + read > 20 * 1024 * 1024) throw new ArgumentException("Image exceeds the 20 MB size limit.");
                await buffer.WriteAsync(chunk.AsMemory(0, read));
            }
            if (buffer.Length == 0) throw new ArgumentException("Image file must not be empty.");
            buffer.Position = 0;
            await recipeStore.SaveOriginalImageAsync(recipeId, index, file.ContentType, buffer);
        }

        var info = new RecipeInfo
        {
            Id = recipeId,
            FinishedDishImageIndex = request.FinishedDishImageIndex,
            ImageCount = files.Count,
            Rating = (RecipeRating)request.Rating,
            Notes = request.Notes,
            AddedBy = familyMemberId,
            CreatedAt = now
        };
        await recipeStore.WriteInfoAsync(info);

        db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            FinishedDishIndex = request.FinishedDishImageIndex,
            ImageCount = files.Count,
            Rating = (RecipeRating)request.Rating,
            Notes = request.Notes,
            AddedBy = familyMemberId,
            IsReady = false,
            CreatedAt = now,
            UpdatedAt = now
        });
        db.RecipeSearchDocuments.Add(new RecipeSearchDocument { RecipeId = recipeId });
        await db.SaveChangesAsync();

        // Trigger the recipe-import workflow asynchronously.
        // This queues the background extraction (OCR/AI) of the recipe content from photos.
        try
        {
            await orchestrator.TriggerAsync("recipe-import", new Dictionary<string, string>
            {
                ["recipeId"] = recipeId.ToString()
            });
            logger.LogInformation("Triggered recipe-import workflow for recipe {RecipeId}", recipeId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to trigger recipe-import workflow for recipe {RecipeId}", recipeId);
        }

        return recipeId;
    }

    /// <summary>
    /// Creates a stub recipe from a text description.
    /// Sets ImageCount = 0, IsDiscoverable = false.
    /// Triggers the goto-synthesis workflow to synthesise the full recipe via AI.
    /// </summary>
    public async Task<RecipeDto> DescribeRecipe(DescribeRecipeDto dto, Guid? familyMemberId = null)
    {
        var recipeId = Guid.NewGuid();
        var now = clock.UtcNow;

        var recipe = new Recipe
        {
            Id = recipeId,
            Name = dto.Name,
            Description = dto.Description,
            ImageCount = 0,
            FinishedDishIndex = -1,
            IsSynthesized = false,
            IsReady = false,
            IsDiscoverable = false,
            AddedBy = familyMemberId,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();

        await recipeStore.WriteInfoAsync(new RecipeInfo
        {
            Id = recipeId,
            Name = dto.Name,
            Description = dto.Description,
            ImageCount = 0,
            FinishedDishImageIndex = -1,
            AddedBy = familyMemberId,
            CreatedAt = now
        });

        // Trigger the goto-synthesis workflow asynchronously.
        // Failure to trigger is non-fatal — the recipe row exists and status stays "pending".
        try
        {
            await orchestrator.TriggerAsync("goto-synthesis", new Dictionary<string, string>
            {
                ["recipeId"] = recipeId.ToString(),
                ["description"] = dto.Description ?? string.Empty
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to trigger goto-synthesis workflow for recipe {RecipeId}", recipeId);
        }

        return RecipeMapper.MapToDto(recipe);
    }

    /// <summary>
    /// Enqueues a URL for background acquisition and extraction.
    /// Triggers the url-import workflow.
    /// </summary>
    public async Task<Guid> CaptureUrl(CaptureUrlDto dto, Guid familyMemberId)
    {
        var recipeId = Guid.NewGuid();
        var now = clock.UtcNow;

        var info = new RecipeInfo
        {
            Id = recipeId,
            Name = "Captured Recipe",
            Notes = dto.Notes,
            SourceUrl = dto.Url,
            Rating = (RecipeRating)(dto.Rating ?? 0),
            ImageCount = 0,
            AddedBy = familyMemberId,
            CreatedAt = now
        };
        await recipeStore.WriteInfoAsync(info);

        var initialization = UrlCaptureInitialization.Create(recipeId, dto.Url, now);
        db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Captured Recipe",
            Notes = dto.Notes,
            SourceUrl = dto.Url,
            Rating = (RecipeRating)(dto.Rating ?? 0),
            ImageCount = 0,
            AddedBy = familyMemberId,
            IsReady = false,
            CreatedAt = now,
            UpdatedAt = now
        });
        db.WorkflowInstances.Add(initialization);
        db.RecipeSearchDocuments.Add(new RecipeSearchDocument { RecipeId = recipeId });
        await db.SaveChangesAsync();

        // Trigger the url-import workflow
        try
        {
            await orchestrator.InitializeUrlCaptureAsync(initialization.Id);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to trigger url-import workflow for recipe {RecipeId} (URL: {Url})", recipeId, dto.Url);
        }

        return recipeId;
    }

    /// <summary>
    /// Returns the synthesis status of a recipe.
    /// "ready" when Name is set and ImageCount > 0; "pending" otherwise.
    /// </summary>
    public async Task<RecipeStatusDto> GetRecipeStatus(Guid id)
    {
        var recipe = await db.Recipes.FindAsync(id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");

        var status = recipe.IsReady ? "ready" : "pending";

        return new RecipeStatusDto
        {
            Id = recipe.Id,
            Name = recipe.Name,
            Status = status,
            ImageCount = recipe.ImageCount,
            IsSynthesized = recipe.IsSynthesized
        };
    }
}
