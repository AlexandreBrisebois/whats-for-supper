using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class RecipeService(
    RecipeDbContext db,
    IValidationService validation,
    ImageService images,
    IWorkflowOrchestrator orchestrator)
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
        var now = DateTimeOffset.UtcNow;

        // Save images to disk first — fail fast before writing to DB.
        // NOTE: If the DB save below fails, orphaned image files are left on disk.
        // The DisasterRecovery service is the intended cleanup path for this scenario.
        await images.SaveImages(recipeId, files);

        // Write recipe.info metadata file
        await images.CreateRecipeInfo(new RecipeInfo
        {
            Id = recipeId,
            FinishedDishImageIndex = request.FinishedDishImageIndex,
            ImageCount = files.Count,
            Rating = (RecipeRating)request.Rating,
            Notes = request.Notes,
            AddedBy = familyMemberId,
            CreatedAt = now
        });

        // Persist DB record
        var recipe = new Recipe
        {
            Id = recipeId,
            Rating = (RecipeRating)request.Rating,
            Notes = request.Notes,
            AddedBy = familyMemberId,
            ImageCount = files.Count,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();

        return recipeId;
    }

    /// <summary>Returns a paginated list of recipes, newest first.</summary>
    public async Task<RecipeListResponseDto> GetRecipesList(int page, int limit)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        var total = await db.Recipes.CountAsync();

        var entities = await db.Recipes
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var recipes = entities.Select(r => new RecipeDto
        {
            Id = r.Id,
            Rating = (int)r.Rating,
            AddedBy = r.AddedBy,
            Name = r.Name,
            TotalTime = r.TotalTime,
            Description = r.Description,
            Category = r.Category,
            Difficulty = r.Difficulty,
            ImageUrl = $"/api/recipes/{r.Id}/hero",
            Images = Enumerable.Range(0, r.ImageCount).ToList(),
            Ingredients = DeserializeIngredients(r.Ingredients),
            RecipeInstructions = ExtractRecipeInstructions(r.RawMetadata),
            IsVegetarian = r.IsVegetarian,
            IsHealthyChoice = r.IsHealthyChoice,
            CreatedAt = r.CreatedAt
        }).ToList();

        return new RecipeListResponseDto
        {
            UpdatedAt = DateTimeOffset.UtcNow,
            Recipes = recipes,
            Pagination = new PaginationDto
            {
                Page = page,
                Limit = limit,
                Total = total
            }
        };
    }

    /// <summary>Returns the full detail for a single recipe.</summary>
    public async Task<RecipeDetailResponseDto> GetRecipeDetail(Guid id)
    {
        var recipe = await db.Recipes.FindAsync(id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");

        return new RecipeDetailResponseDto
        {
            UpdatedAt = DateTimeOffset.UtcNow,
            Recipe = new RecipeDto
            {
                Id = recipe.Id,
                Rating = (int)recipe.Rating,
                AddedBy = recipe.AddedBy,
                Name = recipe.Name,
                TotalTime = recipe.TotalTime,
                Description = recipe.Description,
                Category = recipe.Category,
                Difficulty = recipe.Difficulty,
                ImageUrl = $"/api/recipes/{recipe.Id}/hero",
                Images = Enumerable.Range(0, recipe.ImageCount).ToList(),
                Ingredients = DeserializeIngredients(recipe.Ingredients),
                CreatedAt = recipe.CreatedAt
            }
        };
    }

    /// <summary>
    /// Applies a partial update to a recipe's Notes and/or Rating.
    /// Persists changes to both the database and the recipe.info file on disk.
    /// </summary>
    public async Task<RecipeDetailResponseDto> UpdateRecipe(Guid id, UpdateRecipeDto dto)
    {
        var recipe = await db.Recipes.FindAsync(id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");

        if (dto.Rating.HasValue)
        {
            validation.ValidateRating(dto.Rating.Value);
            recipe.Rating = (RecipeRating)dto.Rating.Value;
        }

        if (dto.Notes is not null)
            recipe.Notes = dto.Notes;

        recipe.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        // Keep recipe.info on disk in sync with the DB
        await images.UpdateRecipeInfo(
            id,
            dto.Notes is not null ? recipe.Notes : null,
            dto.Rating.HasValue ? recipe.Rating : null);

        return new RecipeDetailResponseDto
        {
            UpdatedAt = recipe.UpdatedAt,
            Recipe = new RecipeDto
            {
                Id = recipe.Id,
                Rating = (int)recipe.Rating,
                AddedBy = recipe.AddedBy,
                Name = recipe.Name,
                TotalTime = recipe.TotalTime,
                Description = recipe.Description,
                Category = recipe.Category,
                Difficulty = recipe.Difficulty,
                ImageUrl = $"/api/recipes/{recipe.Id}/hero",
                Images = Enumerable.Range(0, recipe.ImageCount).ToList(),
                Ingredients = DeserializeIngredients(recipe.Ingredients),
                CreatedAt = recipe.CreatedAt
            }
        };
    }

    /// <summary>
    /// Creates a stub recipe from a text description.
    /// Sets ImageCount = 0, IsDiscoverable = false.
    /// Triggers the goto-synthesis workflow to synthesise the full recipe via AI.
    /// </summary>
    public async Task<RecipeDto> DescribeRecipe(DescribeRecipeDto dto, Guid? familyMemberId = null)
    {
        var recipeId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        var recipe = new Recipe
        {
            Id = recipeId,
            Name = dto.Name,
            Description = dto.Description,
            ImageCount = 0,
            IsDiscoverable = false,
            AddedBy = familyMemberId,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Recipes.Add(recipe);
        await images.CreateRecipeInfo(new RecipeInfo
        {
            Id = recipeId,
            Name = dto.Name,
            Description = dto.Description,
            ImageCount = 0,
            AddedBy = familyMemberId,
            CreatedAt = now
        });
        await db.SaveChangesAsync();

        // Trigger the goto-synthesis workflow asynchronously.
        // Failure to trigger is non-fatal — the recipe row exists and status stays "pending".
        try
        {
            await orchestrator.TriggerAsync("goto-synthesis", new Dictionary<string, string>
            {
                ["recipeId"] = recipeId.ToString(),
                ["description"] = dto.Description
            });
        }
        catch (Exception ex)
        {
            // Log but don't fail the request — the caller can poll GET /status
            // and the workflow can be re-triggered manually if needed.
            _ = ex; // suppress unused-variable warning; real apps would log here
        }

        return new RecipeDto
        {
            Id = recipe.Id,
            Name = recipe.Name,
            Description = recipe.Description,
            ImageUrl = null,
            Images = [],
            Rating = (int)recipe.Rating,
            CreatedAt = recipe.CreatedAt
        };
    }

    /// <summary>
    /// Returns the synthesis status of a recipe.
    /// "ready" when Name is set and ImageCount > 0; "pending" otherwise.
    /// </summary>
    public async Task<RecipeStatusDto> GetRecipeStatus(Guid id)
    {
        var recipe = await db.Recipes.FindAsync(id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");

        var isReady = (!string.IsNullOrWhiteSpace(recipe.Name) && recipe.ImageCount > 0)
                   || (!string.IsNullOrWhiteSpace(recipe.Name) && recipe.IsSynthesized);
        var status = isReady ? "ready" : "pending";

        return new RecipeStatusDto
        {
            Id = recipe.Id,
            Name = recipe.Name,
            Status = status,
            ImageCount = recipe.ImageCount,
            IsSynthesized = recipe.IsSynthesized
        };
    }

    /// <summary>Deletes a recipe from disk and database.</summary>
    public async Task DeleteRecipe(Guid id)
    {
        var recipe = await db.Recipes.FindAsync(id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");

        // 1. Delete physical files
        await images.DeleteRecipeFiles(id);

        // 2. Remove from DB (cascades to recipe_imports)
        db.Recipes.Remove(recipe);
        await db.SaveChangesAsync();
    }
    /// <summary>
    /// Deserializes the ingredients JSON column, tolerating both string arrays
    /// (["flour", "eggs"]) and object arrays ([{"name":"flour",...}]) from legacy data.
    /// </summary>
    public static List<string> DeserializeIngredients(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];

        var trimmed = json.Trim();
        if (!trimmed.StartsWith('[') || !trimmed.EndsWith(']'))
        {
            // Not an array? Return as single element if not empty, or empty list
            return string.IsNullOrEmpty(trimmed) ? [] : [trimmed];
        }

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (JsonException)
        {
            try
            {
                // Fallback: ingredients stored as objects — serialize each element back to a string
                // This handles the "StartObject" error when the list contains objects instead of strings
                var elements = JsonSerializer.Deserialize<List<JsonElement>>(json) ?? [];
                return elements.Select(e =>
                {
                    if (e.ValueKind == JsonValueKind.String) return e.GetString() ?? "";
                    if (e.ValueKind == JsonValueKind.Object && e.TryGetProperty("name", out var nameProp))
                    {
                        return nameProp.GetString() ?? e.GetRawText();
                    }
                    return e.GetRawText();
                })
                .Where(s => !string.IsNullOrEmpty(s))
                .ToList();
            }
            catch
            {
                return [json]; // Total failure? Return raw JSON as single string
            }
        }
    }

    private static object? ExtractRecipeInstructions(string? rawMetadataJson)
    {
        if (string.IsNullOrWhiteSpace(rawMetadataJson)) return null;

        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(rawMetadataJson);
            if (doc.RootElement.TryGetProperty("recipeInstructions", out var instructions))
            {
                return System.Text.Json.JsonSerializer.Deserialize<object>(instructions.GetRawText());
            }
        }
        catch
        {
            // Silently return null if parsing fails
        }

        return null;
    }
}
