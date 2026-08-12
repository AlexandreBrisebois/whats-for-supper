using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class RecipeService(
    RecipeDbContext db,
    IValidationService validation,
    ImageService images,
    IRecipeStore recipeStore,
    IWorkflowOrchestrator orchestrator,
    IHealthEventPublisher healthPublisher,
    ILogger<RecipeService> logger)
{
    private const string RecipeShareBundleVersion = "1.0";

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
            FinishedDishIndex = request.FinishedDishImageIndex,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();

        // Enqueue search index job for new recipe
        try
        {
            await orchestrator.TriggerAsync("index-recipe-search", new Dictionary<string, string>
            {
                ["recipeId"] = recipeId.ToString(),
                ["fingerprint"] = SearchFingerprintService.ComputeSourceFingerprint(recipe)
            });
        }
        catch (Exception ex) { logger.LogError(ex, "Failed to trigger search index for new recipe {RecipeId}", recipeId); }

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

        // Publish neutral health event (outbox pattern)
        await healthPublisher.PublishRecipeChangedAsync(recipeId, default);

        return recipeId;
    }

    /// <summary>Returns a paginated list of recipes, newest first (default) or oldest-cooked first (order=explore).</summary>
    public async Task<RecipeListResponseDto> GetRecipesList(
        int page,
        int limit,
        string? order = null,
        bool? discoverableOnly = null,
        Guid? id = null,
        string? name = null,
        string? url = null)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        var query = db.Recipes.Where(r =>
            r.DeletedAt == null &&
            r.IsReady);

        if (id.HasValue)
        {
            query = query.Where(r => r.Id == id.Value);
        }
        if (!string.IsNullOrWhiteSpace(name))
        {
            query = query.Where(r => r.Name != null && r.Name.ToLower() == name.Trim().ToLower());
        }
        if (!string.IsNullOrWhiteSpace(url))
        {
            query = query.Where(r => r.SourceUrl != null && r.SourceUrl.ToLower() == url.Trim().ToLower());
        }

        if (discoverableOnly == true)
        {
            query = query.Where(r => r.IsDiscoverable);
        }

        var total = await query.CountAsync();

        if (order == "explore")
        {
            query = query.OrderBy(r => r.LastCookedDate == null ? 0 : 1)
                         .ThenBy(r => r.LastCookedDate)
                         .ThenByDescending(r => r.CreatedAt);
        }
        else
        {
            query = query.OrderByDescending(r => r.CreatedAt);
        }

        var entities = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var recipes = entities.Select(MapToDto).ToList();

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

    /// <summary>
    /// Returns a paginated list of recipes ordered by Explore_Order:
    /// lastCookedDate ASC NULLS FIRST (never-cooked first, then oldest-cooked first).
    /// Soft-deleted recipes are excluded.
    /// </summary>

    /// <summary>
    /// Returns a lightweight summary of the recipe library:
    /// total count, never-cooked count, and per-rating counts.
    /// All counts exclude soft-deleted recipes.
    /// </summary>
    public async Task<RecipeLibrarySummaryDto> GetLibrarySummary()
    {
        var recipes = await db.Recipes
            .Where(r => r.DeletedAt == null && r.IsReady)
            .GroupBy(_ => 1)
            .Select(g => new RecipeLibrarySummaryDto
            {
                Total = g.Count(),
                NeverCooked = g.Count(r => r.LastCookedDate == null),
                Ratings = new RecipeLibraryRatingsDto
                {
                    Love = g.Count(r => r.Rating == RecipeRating.Love),
                    Like = g.Count(r => r.Rating == RecipeRating.Like),
                    Dislike = g.Count(r => r.Rating == RecipeRating.Dislike),
                    Unrated = g.Count(r => r.Rating == RecipeRating.Unknown),
                }
            })
            .FirstOrDefaultAsync();

        // If no recipes exist, return zeroed-out summary
        return recipes ?? new RecipeLibrarySummaryDto
        {
            Total = 0,
            NeverCooked = 0,
            Ratings = new RecipeLibraryRatingsDto()
        };
    }

    /// <summary>Returns the full detail for a single recipe.</summary>
    public async Task<RecipeDetailResponseDto> GetRecipeDetail(Guid id)
    {
        var recipe = await db.Recipes.FindAsync(id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");

        var report = await db.RecipeImportReports
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.RecipeId == id);

        var dto = MapToDto(recipe);
        dto.ImportIssue = RecipeImportReportService.ToPublicDto(report);

        return new RecipeDetailResponseDto
        {
            UpdatedAt = DateTimeOffset.UtcNow,
            Recipe = dto
        };
    }

    public async Task<RecipeShareBundleDto> ExportRecipeShareBundle(Guid id)
    {
        var recipe = await db.Recipes.FindAsync(id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");

        return new RecipeShareBundleDto
        {
            Version = RecipeShareBundleVersion,
            Recipe = new ImportedRecipeDto
            {
                Name = recipe.Name ?? string.Empty,
                Description = recipe.Description,
                Ingredients = DeserializeIngredients(recipe.Ingredients),
                Instructions = MapInstructionsToHowToSections(recipe.RawMetadata),
                TotalTimeMinutes = ParseTotalTimeMinutes(recipe.TotalTime),
                Servings = null,
                SourceUrl = recipe.SourceUrl,
                SourceName = ExtractSourceName(recipe.RawMetadata),
                Category = recipe.Category,
                CuisineType = recipe.CuisineType,
                MealTypes = recipe.MealTypes,
                IsSynthesized = recipe.IsSynthesized,
                Notes = null, // AC 2.3: Scrubbed for sharing
                Rating = null, // AC 2.3: Scrubbed for sharing
            },
            Info = new RecipeShareInfoDto
            {
                ExportedAtUtc = DateTimeOffset.UtcNow,
                BundleSource = "wfs-share",
                AppVersion = null,
                RecipeId = id,
            },
            Hero = await ReadSharedImageOrNull(async () => await images.GetHeroImage(id)),
            Originals = await ReadOriginalImages(id, recipe.ImageCount),
        };
    }

    public async Task<RecipeDto> ImportRecipeShareBundle(RecipeShareBundleDto bundle, Guid familyMemberId)
    {
        ValidateBundle(bundle);

        var now = DateTimeOffset.UtcNow;
        var recipeId = bundle.Info.RecipeId ?? Guid.NewGuid();

        if (await db.Recipes.AnyAsync(r => r.Id == recipeId))
        {
            recipeId = Guid.NewGuid();
        }

        var originalCount = Math.Min(bundle.Originals.Count, 5);

        var recipe = new Recipe
        {
            Id = recipeId,
            Name = bundle.Recipe.Name,
            Description = bundle.Recipe.Description,
            Ingredients = JsonSerializer.Serialize(bundle.Recipe.Ingredients),
            RawMetadata = BuildImportedRawMetadata(bundle.Recipe),
            SourceUrl = bundle.Recipe.SourceUrl,
            Category = bundle.Recipe.Category,
            CuisineType = bundle.Recipe.CuisineType,
            MealTypes = bundle.Recipe.MealTypes,
            AddedBy = familyMemberId,
            ImageCount = originalCount,
            IsSynthesized = bundle.Recipe.IsSynthesized,
            IsReady = true,
            TotalTime = FormatTotalTime(bundle.Recipe.TotalTimeMinutes),
            CreatedAt = now,
            UpdatedAt = now,
            Notes = bundle.Recipe.Notes,
            Rating = (RecipeRating)(bundle.Recipe.Rating ?? 0),
        };

        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();

        await images.CreateRecipeInfo(new RecipeInfo
        {
            Id = recipeId,
            Name = bundle.Recipe.Name,
            Description = bundle.Recipe.Description,
            ImageCount = originalCount,
            AddedBy = familyMemberId,
            SourceUrl = bundle.Recipe.SourceUrl,
            Category = bundle.Recipe.Category,
            CuisineType = bundle.Recipe.CuisineType,
            MealTypes = bundle.Recipe.MealTypes,
            TotalTime = recipe.TotalTime,
            IsSynthesized = bundle.Recipe.IsSynthesized,
            CreatedAt = now,
            Notes = bundle.Recipe.Notes,
            Rating = recipe.Rating,
        });

        if (bundle.Hero is not null)
        {
            await recipeStore.SaveHeroImageAsync(recipeId, DecodeBase64ToStream(bundle.Hero.Base64));
        }

        for (var index = 0; index < originalCount; index++)
        {
            var original = bundle.Originals[index];
            await recipeStore.SaveOriginalImageAsync(
                recipeId,
                index,
                original.MimeType,
                DecodeBase64ToStream(original.Base64));
        }

        // Publish neutral health event (outbox pattern)
        await healthPublisher.PublishRecipeChangedAsync(recipeId, default);

        return MapToDto(recipe);
    }

    /// <summary>
    /// Applies a partial update to a recipe's user-editable fields.
    /// Persists changes to both the database and the recipe.info file on disk.
    /// </summary>
    public async Task<RecipeDetailResponseDto> UpdateRecipe(Guid id, UpdateRecipeDto dto)
    {
        var recipe = await db.Recipes.FindAsync(id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");

        if (dto.Name is not null)
            recipe.Name = dto.Name;

        if (dto.Description is not null)
            recipe.Description = dto.Description;

        if (dto.Ingredients is not null)
            recipe.Ingredients = JsonSerializer.Serialize(dto.Ingredients);

        if (dto.Rating.HasValue)
        {
            validation.ValidateRating(dto.Rating.Value);
            recipe.Rating = (RecipeRating)dto.Rating.Value;
        }

        if (dto.Notes is not null)
            recipe.Notes = dto.Notes;

        if (dto.IsDiscoverable.HasValue)
            recipe.IsDiscoverable = dto.IsDiscoverable.Value;

        if (dto.CuisineType is not null)
            recipe.CuisineType = dto.CuisineType;

        if (dto.MealTypes is not null)
        {
            recipe.MealTypes = dto.MealTypes;
            if (dto.MealTypes.Length == 0)
            {
                recipe.Category = "Supper";
            }
        }

        if (dto.RecipeInstructions is not null)
        {
            var raw = string.IsNullOrWhiteSpace(recipe.RawMetadata)
                ? new Dictionary<string, object>()
                : JsonSerializer.Deserialize<Dictionary<string, object>>(recipe.RawMetadata) ?? new Dictionary<string, object>();

            raw["recipeInstructions"] = dto.RecipeInstructions;
            recipe.RawMetadata = JsonSerializer.Serialize(raw);
        }

        recipe.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        // Re-enqueue search index when search-relevant fields changed
        if (dto.Name is not null ||
            dto.Description is not null ||
            dto.Ingredients is not null ||
            dto.Notes is not null ||
            dto.Rating.HasValue ||
            dto.IsDiscoverable.HasValue ||
            dto.CuisineType is not null ||
            dto.MealTypes is not null ||
            dto.RecipeInstructions is not null)
        {
            try
            {
                await orchestrator.TriggerAsync("index-recipe-search", new Dictionary<string, string>
                {
                    ["recipeId"] = id.ToString(),
                    ["fingerprint"] = SearchFingerprintService.ComputeSourceFingerprint(recipe)
                });
            }
            catch (Exception ex) { logger.LogError(ex, "Failed to trigger search index for updated recipe {RecipeId}", id); }
        }

        // Keep recipe.info on disk in sync with the DB
        await images.UpdateRecipeInfo(
            id,
            dto.Notes is not null ? recipe.Notes : null,
            dto.Rating.HasValue ? recipe.Rating : null,
            dto.Name is not null ? recipe.Name : null,
            dto.Description is not null ? recipe.Description : null,
            dto.RecipeInstructions is not null ? dto.RecipeInstructions : null);

        // Publish neutral health event (outbox pattern) if relevant fields changed
        if (dto.Name is not null ||
            dto.Description is not null ||
            dto.Ingredients is not null ||
            dto.RecipeInstructions is not null)
        {
            await healthPublisher.PublishRecipeChangedAsync(id, default);
        }

        return new RecipeDetailResponseDto
        {
            UpdatedAt = recipe.UpdatedAt,
            Recipe = MapToDto(recipe)
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
                ["description"] = dto.Description ?? string.Empty
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to trigger goto-synthesis workflow for recipe {RecipeId}", recipeId);
        }

        // Publish neutral health event (outbox pattern)
        await healthPublisher.PublishRecipeChangedAsync(recipeId, default);

        return MapToDto(recipe);
    }

    /// <summary>
    /// Enqueues a URL for background acquisition and extraction.
    /// Triggers the url-import workflow.
    /// </summary>
    public async Task<Guid> CaptureUrl(CaptureUrlDto dto, Guid familyMemberId)
    {
        var recipeId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        var recipe = new Recipe
        {
            Id = recipeId,
            Name = "Captured Recipe", // Placeholder until extraction
            Notes = dto.Notes,
            SourceUrl = dto.Url,
            Rating = (RecipeRating)(dto.Rating ?? 0),
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
            Name = "Captured Recipe",
            Notes = dto.Notes,
            Rating = (RecipeRating)(dto.Rating ?? 0),
            ImageCount = 0,
            AddedBy = familyMemberId,
            SourceUrl = dto.Url,
            CreatedAt = now
        });
        logger.LogInformation("Wrote initial recipe.info for recipe {RecipeId} to disk.", recipeId);

        await db.SaveChangesAsync();

        // Trigger the url-import workflow
        try
        {
            await orchestrator.TriggerAsync("url-import", new Dictionary<string, string>
            {
                ["recipeId"] = recipeId.ToString(),
                ["url"] = dto.Url
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to trigger url-import workflow for recipe {RecipeId} (URL: {Url})", recipeId, dto.Url);
        }

        // Publish neutral health event (outbox pattern)
        await healthPublisher.PublishRecipeChangedAsync(recipeId, default);

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
    /// Soft-deletes a recipe. Returns the updated recipe with DeletedAt set.
    /// Throws <see cref="InvalidOperationException"/> if the recipe is assigned to a planner slot.
    /// </summary>
    public async Task<(RecipeDetailResponseDto Recipe, List<string> AssignedDays)> SoftDeleteRecipe(Guid id, Guid deletedBy)
    {
        var recipe = await db.Recipes.FindAsync(id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var assignedDates = await db.CalendarEvents
            .Where(e => e.RecipeId == id && e.Date >= today)
            .Select(e => e.Date.ToString("yyyy-MM-dd"))
            .ToListAsync();

        if (assignedDates.Count > 0)
            return (null!, assignedDates);

        recipe.DeletedAt = DateTimeOffset.UtcNow;
        recipe.DeletedBy = deletedBy;

        var searchDoc = await db.RecipeSearchDocuments.FindAsync(id);
        if (searchDoc is not null)
            db.RecipeSearchDocuments.Remove(searchDoc);

        await db.SaveChangesAsync();

        return (MapToDetailResponse(recipe), []);
    }

    /// <summary>Returns all soft-deleted recipes for the Recycle Bin.</summary>
    public async Task<List<RecipeTrashItemDto>> GetTrash()
    {
        return await db.Recipes
            .IgnoreQueryFilters()
            .Where(r => r.DeletedAt != null)
            .OrderByDescending(r => r.DeletedAt)
            .Select(r => new RecipeTrashItemDto
            {
                Id = r.Id,
                Name = r.Name,
                ImageUrl = $"/api/recipes/{r.Id}/hero",
                DeletedAt = r.DeletedAt!.Value,
                DeletedBy = r.DeletedBy
            })
            .ToListAsync();
    }

    /// <summary>Restores a soft-deleted recipe and re-includes it in all active surfaces.</summary>
    public async Task<RecipeDetailResponseDto> RestoreRecipe(Guid id)
    {
        var recipe = await db.Recipes
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");

        recipe.DeletedAt = null;
        recipe.DeletedBy = null;
        recipe.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        // Re-enqueue search index when restored. 
        // We wrap in try-catch because indexing is a non-critical side effect; 
        // failure here should not revert the restoration.
        try
        {
            await orchestrator.TriggerAsync("index-recipe-search", new Dictionary<string, string>
            {
                ["recipeId"] = id.ToString(),
                ["fingerprint"] = SearchFingerprintService.ComputeSourceFingerprint(recipe)
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to trigger search index for restored recipe {RecipeId}", id);
        }

        // Publish neutral health event (outbox pattern)
        await healthPublisher.PublishRecipeChangedAsync(id, default);

        return MapToDetailResponse(recipe);
    }


    private RecipeDetailResponseDto MapToDetailResponse(Recipe recipe) =>
        new()
        {
            UpdatedAt = DateTimeOffset.UtcNow,
            Recipe = MapToDto(recipe)
        };

    public static RecipeDto MapToDto(Recipe r)
    {
        var sourceType = !string.IsNullOrEmpty(r.SourceUrl) ? "url" : (r.ImageCount > 0 ? "photos" : "synthesized");

        return new RecipeDto
        {
            Id = r.Id,
            Rating = (int)r.Rating,
            Notes = r.Notes,
            AddedBy = r.AddedBy,
            Name = r.Name,
            TotalTime = r.TotalTime,
            SourceUrl = r.SourceUrl,
            Description = r.Description,
            Category = r.Category,
            CuisineType = r.CuisineType,
            MealTypes = r.MealTypes,
            DietaryProfile = DeserializeDietaryProfile(r.DietaryProfile),
            ImageUrl = $"/api/recipes/{r.Id}/hero",
            Images = Enumerable.Range(0, r.ImageCount).ToList(),
            Ingredients = DeserializeIngredients(r.Ingredients),
            RecipeInstructions = ExtractRecipeInstructions(r.RawMetadata),
            IsVegetarian = r.IsVegetarian,
            IsHealthyChoice = r.IsHealthyChoice,
            IsDiscoverable = r.IsDiscoverable,
            CreatedAt = r.CreatedAt,
            DeletedAt = r.DeletedAt,
            SourceType = sourceType,
            CanReimport = CanReimport(r),
            ImageCount = r.ImageCount,
            FinishedDishIndex = r.FinishedDishIndex,
            IsReady = r.IsReady
        };
    }

    public static bool CanReimport(Recipe recipe) =>
        !string.IsNullOrEmpty(recipe.SourceUrl) || recipe.ImageCount > 0;

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

    private static List<HowToSectionDto> MapInstructionsToHowToSections(string? rawMetadataJson)
    {
        if (string.IsNullOrWhiteSpace(rawMetadataJson)) return [];

        try
        {
            using var doc = JsonDocument.Parse(rawMetadataJson);
            if (!doc.RootElement.TryGetProperty("recipeInstructions", out var instructions) ||
                instructions.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            var result = new List<HowToSectionDto>();
            var looseSteps = new List<HowToStepDto>();

            foreach (var element in instructions.EnumerateArray())
            {
                if (element.ValueKind == JsonValueKind.String)
                {
                    looseSteps.Add(new HowToStepDto { Text = element.GetString() ?? "" });
                }
                else if (element.ValueKind == JsonValueKind.Object)
                {
                    if (element.TryGetProperty("@type", out var type) && type.GetString() == "HowToSection")
                    {
                        // Flush accumulated loose steps to a section
                        if (looseSteps.Count > 0)
                        {
                            result.Add(new HowToSectionDto
                            {
                                Name = result.Count == 0 ? "Instructions" : $"Section {result.Count + 1}",
                                ItemListElement = [.. looseSteps]
                            });
                            looseSteps.Clear();
                        }

                        try
                        {
                            var section = JsonSerializer.Deserialize<HowToSectionDto>(element.GetRawText());
                            if (section != null) result.Add(section);
                        }
                        catch { /* skip malformed section */ }
                    }
                    else if (element.TryGetProperty("@type", out var stepType) && stepType.GetString() == "HowToStep")
                    {
                        if (element.TryGetProperty("text", out var text))
                        {
                            looseSteps.Add(new HowToStepDto { Text = text.GetString() ?? "" });
                        }
                    }
                    else
                    {
                        // Fallback for objects that might just have 'text' or 'name'
                        if (element.TryGetProperty("text", out var t))
                        {
                            looseSteps.Add(new HowToStepDto { Text = t.GetString() ?? "" });
                        }
                        else if (element.TryGetProperty("name", out var n))
                        {
                            looseSteps.Add(new HowToStepDto { Text = n.GetString() ?? "" });
                        }
                    }
                }
            }

            // Flush remaining loose steps (AC 2.2 fallback)
            if (looseSteps.Count > 0)
            {
                result.Add(new HowToSectionDto
                {
                    Name = result.Count == 0 ? "Instructions" : "Additional Steps",
                    ItemListElement = [.. looseSteps]
                });
            }

            return result;
        }
        catch
        {
            return [];
        }
    }

    private static string? ExtractSourceName(string? rawMetadataJson)
    {
        if (string.IsNullOrWhiteSpace(rawMetadataJson))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(rawMetadataJson);
            if (doc.RootElement.TryGetProperty("sourceName", out var sourceName) &&
                sourceName.ValueKind == JsonValueKind.String)
            {
                return sourceName.GetString();
            }
        }
        catch
        {
            return null;
        }

        return null;
    }

    private static int? ParseTotalTimeMinutes(string? totalTime)
    {
        if (string.IsNullOrWhiteSpace(totalTime))
            return null;

        var isoMatch = Regex.Match(totalTime, @"^PT(?:(\d+)H)?(?:(\d+)M)?$", RegexOptions.IgnoreCase);
        if (isoMatch.Success)
        {
            var hours = isoMatch.Groups[1].Success ? int.Parse(isoMatch.Groups[1].Value) : 0;
            var minutes = isoMatch.Groups[2].Success ? int.Parse(isoMatch.Groups[2].Value) : 0;
            return (hours * 60) + minutes;
        }

        var plainMatch = Regex.Match(totalTime, @"(\d+)");
        if (plainMatch.Success && int.TryParse(plainMatch.Groups[1].Value, out var parsed))
            return parsed;

        return null;
    }

    private static string? FormatTotalTime(int? totalTimeMinutes)
        => totalTimeMinutes is > 0 ? $"PT{totalTimeMinutes}M" : null;

    private static string BuildImportedRawMetadata(ImportedRecipeDto recipe)
        => JsonSerializer.Serialize(new
        {
            sourceName = recipe.SourceName,
            recipeInstructions = recipe.Instructions,
        });

    private static void ValidateBundle(RecipeShareBundleDto bundle)
    {
        if (!string.Equals(bundle.Version, RecipeShareBundleVersion, StringComparison.Ordinal))
            throw new InvalidOperationException($"Unsupported recipe bundle version '{bundle.Version}'.");

        if (!string.Equals(bundle.Info.BundleSource, "wfs-share", StringComparison.Ordinal))
            throw new InvalidOperationException("Unsupported recipe bundle source.");

        if (bundle.Recipe is null ||
            string.IsNullOrWhiteSpace(bundle.Recipe.Name) ||
            bundle.Recipe.Ingredients.Count == 0 ||
            bundle.Recipe.Instructions.Count == 0)
        {
            throw new InvalidOperationException("Malformed recipe bundle payload.");
        }

        if (bundle.Originals.Count > 5)
            throw new InvalidOperationException("Recipe bundle cannot contain more than five original images.");

        if (bundle.Hero is not null)
            ValidateImagePayload(bundle.Hero);

        foreach (var original in bundle.Originals)
            ValidateImagePayload(original);
    }

    private static void ValidateImagePayload(SharedImageDto image)
    {
        if (string.IsNullOrWhiteSpace(image.MimeType) || string.IsNullOrWhiteSpace(image.Base64))
            throw new InvalidOperationException("Malformed shared image payload.");

        try
        {
            _ = Convert.FromBase64String(image.Base64);
        }
        catch (FormatException ex)
        {
            throw new FormatException("Shared image payload must be valid base64.", ex);
        }
    }

    private async Task<List<SharedImageDto>> ReadOriginalImages(Guid recipeId, int imageCount)
    {
        var originals = new List<SharedImageDto>();
        for (var index = 0; index < Math.Min(imageCount, 5); index++)
        {
            var original = await ReadSharedImageOrNull(async () => await images.GetImage(recipeId, index));
            if (original is not null)
                originals.Add(original);
        }

        return originals;
    }

    private static async Task<SharedImageDto?> ReadSharedImageOrNull(
        Func<Task<(Stream Stream, string ContentType)>> readImage)
    {
        try
        {
            var (stream, contentType) = await readImage();
            await using var disposableStream = stream;
            using var memory = new MemoryStream();
            await stream.CopyToAsync(memory);
            return new SharedImageDto
            {
                MimeType = contentType,
                Base64 = Convert.ToBase64String(memory.ToArray()),
            };
        }
        catch (KeyNotFoundException)
        {
            return null;
        }
    }

    private static MemoryStream DecodeBase64ToStream(string base64)
        => new(Convert.FromBase64String(base64));

    /// <summary>
    /// Deserializes the dietary_profile JSONB column to a RecipeDietaryProfileDto.
    /// Returns null if the column is null or unparseable.
    /// </summary>
    private static RecipeDietaryProfileDto? DeserializeDietaryProfile(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;

        try
        {
            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                ReferenceHandler = ReferenceHandler.IgnoreCycles,
                DefaultIgnoreCondition = JsonIgnoreCondition.Never,
                Converters = { new JsonStringEnumConverter() }
            };
            return JsonSerializer.Deserialize<RecipeDietaryProfileDto>(json, options);
        }
        catch
        {
            // Silently return null if parsing fails
            return null;
        }
    }

    /// <summary>
    /// Adds a single original image to an existing recipe.
    /// Updates both the database and the physical storage, then triggers hero regeneration.
    /// </summary>
    public async Task<int> AddOriginalImageAsync(Guid recipeId, IFormFile file)
    {
        var recipe = await db.Recipes.FindAsync(recipeId)
            ?? throw new KeyNotFoundException($"Recipe {recipeId} not found.");

        // 1. Add to storage
        var newIndex = await images.AddOriginalImageAsync(recipeId, file);

        // 2. Update DB
        recipe.ImageCount++;
        recipe.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        // 3. Trigger regeneration (forced)
        await TriggerHeroRegenerationAsync(recipeId);

        return newIndex;
    }

    /// <summary>
    /// Triggers the background hero regeneration workflow for a recipe.
    /// </summary>
    public async Task TriggerHeroRegenerationAsync(Guid recipeId)
    {
        try
        {
            await orchestrator.TriggerAsync("recipe-hero-regeneration", new Dictionary<string, string>
            {
                ["recipeId"] = recipeId.ToString()
            });
            logger.LogInformation("Triggered recipe-hero-regeneration for recipe {RecipeId}", recipeId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to trigger hero regeneration for recipe {RecipeId}", recipeId);
            throw;
        }
    }
}
