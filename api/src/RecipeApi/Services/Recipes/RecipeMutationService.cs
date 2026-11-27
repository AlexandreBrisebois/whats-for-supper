using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services.Recipes;

public sealed class RecipeMutationService(
    IClock clock,
    RecipeDbContext db,
    IValidationService validation,
    ImageService images,
    IRecipeStore recipeStore,
    IWorkflowOrchestrator orchestrator,
    ILogger logger,
    SupperProjectionInvalidation projectionInvalidation,
    ISupperProjectionPublisher projectionPublisher,
    IScheduleEventPublisher? publisher = null,
    StructuredRecipeContentStore? structuredEditor = null)
{
    /// <summary>
    /// Applies a partial update to a recipe's user-editable fields.
    /// Persists changes to both the database and the recipe.info file on disk.
    /// </summary>
    public async Task<RecipeDetailResponseDto> UpdateRecipe(Guid id, UpdateRecipeDto dto)
    {
        if (dto.HasServings && (dto.Servings is null || dto.Servings <= 0))
            throw new ArgumentException("Servings must be a whole number from 1 to 2147483647.");
        // Only explicitly converted recipes enter the guarded canonical owner.
        // An ordinary edit never converts legacy content or allocates saved IDs.
        if (structuredEditor is not null && (dto.HasStructuredContent ||
            dto.HasServings && dto.Ingredients is null && dto.RecipeInstructions is null))
        {
            var baseline = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id)
                ?? throw new KeyNotFoundException($"Recipe {id} not found.");
            if (baseline.StructuredContent is not null)
            {
                var result = await structuredEditor.EditAsync(id,
                    StructuredRecipeContentStore.InspectSourceRevision(baseline), Guid.NewGuid(), dto);
                var saved = await db.Recipes.SingleAsync(x => x.Id == id);
                if (dto.HasServings || dto.IngredientLines.ValueKind != JsonValueKind.Undefined)
                    await projectionPublisher.PublishAsync(await projectionInvalidation.AffectedWeeksAsync(id));
                // Capture the operation's authoritative snapshot before metadata
                // synchronization reloads the row under its own coordination.
                var response = new RecipeDetailResponseDto
                {
                    UpdatedAt = saved.UpdatedAt,
                    Recipe = await RecipeMapper.MapDetailDtoAsync(db, saved),
                    CreatedIds = result.CreatedIds
                };
                await SynchronizeDetailMetadata(id, dto, saved);
                return response;
            }
        }
        await using var rotationTransaction = await RecipeRotation.LockAsync(db, id, lockSupperInputs: true);
        var recipe = await db.Recipes.FindAsync(id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");

        // Legacy content requires explicit conversion; legacy payloads cannot
        // replace canonical facts. Check before mutating ANY tracked or disk field.
        RecipeContentInput.Validate(dto);
        if (dto.HasStructuredContent || recipe.StructuredContent is not null &&
            (dto.HasServings || dto.Ingredients is not null || dto.RecipeInstructions is not null))
            throw new RecipeContentConflictException(StructuredRecipeContentStore.InspectContentRevision(recipe), upgradeRequired: true);

        if (dto.HasServings) recipe.Servings = dto.Servings;
        ApplyEditableDetailFields(recipe, dto, validation);
        if (dto.Ingredients is not null)
            recipe.Ingredients = JsonSerializer.Serialize(dto.Ingredients);

        if (dto.RecipeInstructions is not null)
        {
            var raw = string.IsNullOrWhiteSpace(recipe.RawMetadata)
                ? new Dictionary<string, object>()
                : JsonSerializer.Deserialize<Dictionary<string, object>>(recipe.RawMetadata) ?? new Dictionary<string, object>();

            raw["recipeInstructions"] = dto.RecipeInstructions;
            recipe.RawMetadata = JsonSerializer.Serialize(raw);
        }

        var searchRelevantChanged = dto.Name is not null ||
            dto.Description is not null ||
            dto.Ingredients is not null ||
            dto.Notes is not null ||
            dto.HasTotalTime ||
            dto.Rating.HasValue ||
            dto.IsDiscoverable.HasValue ||
            dto.CuisineType is not null ||
            dto.MealTypes is not null ||
            dto.RecipeInstructions is not null;

        recipe.UpdatedAt = clock.UtcNow;
        if (searchRelevantChanged)
        {
            var sidecar = await db.RecipeSearchDocuments.FindAsync(id);
            if (sidecar is null)
            {
                db.RecipeSearchDocuments.Add(new RecipeSearchDocument
                {
                    RecipeId = id,
                    DocumentText = string.Empty,
                    SearchMetadata = "{}",
                    IndexStatus = "pending",
                    EmbeddingStatus = "pending",
                    EmbeddingModel = GeminiEmbeddingProvider.ResolveModelId(),
                    SchemaVersion = RecipeSearchDocumentBuilder.CurrentSchemaVersion
                });
            }
            else
            {
                sidecar.IndexStatus = "pending";
                sidecar.EmbeddingStatus = "pending";
                sidecar.EmbeddingFingerprint = null;
            }
        }
        await db.SaveChangesAsync();
        var affectedWeeks = dto.HasServings || dto.Ingredients is not null
            ? await projectionInvalidation.EnlistRecipeAsync(id, CancellationToken.None) : [];

        if (rotationTransaction is not null)
        {
            await rotationTransaction.CommitAsync();
            await rotationTransaction.DisposeAsync();
        }

        if (dto.HasServings || dto.Ingredients is not null)
            await projectionPublisher.PublishAsync(affectedWeeks);

        // Re-enqueue search index after the recipe and pending sidecar commit.
        if (searchRelevantChanged)
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

        await SynchronizeDetailMetadata(id, dto, recipe);

        return new RecipeDetailResponseDto
        {
            UpdatedAt = recipe.UpdatedAt,
            Recipe = await RecipeMapper.MapDetailDtoAsync(db, recipe)
        };
    }

    // Shared ordinary field semantics for legacy and isolated canonical transactions.
    internal static void ApplyEditableDetailFields(Recipe recipe, UpdateRecipeDto dto, IValidationService validation)
    {
        if (dto.Rating.HasValue) validation.ValidateRating(dto.Rating.Value);
        var suitable = dto.MealTypes is null ? RecipeRotation.Suitable(recipe) :
            dto.MealTypes.Length == 0 || dto.MealTypes.Contains("Supper");
        if (dto.IsDiscoverable == true && !suitable)
            throw new ArgumentException("Choose Supper in this recipe's meal types before turning on Ask the Family.");

        if (dto.Name is not null)
            recipe.Name = dto.Name;

        if (dto.Description is not null)
            recipe.Description = dto.Description;

        if (dto.Rating.HasValue)
        {
            recipe.Rating = (RecipeRating)dto.Rating.Value;
        }

        if (dto.Notes is not null)
            recipe.Notes = dto.Notes;

        if (dto.HasTotalTime)
            recipe.TotalTime = string.IsNullOrWhiteSpace(dto.TotalTime) ? null : dto.TotalTime.Trim();

        if (dto.IsDiscoverable.HasValue)
        {
            recipe.IsDiscoverable = dto.IsDiscoverable.Value;
            recipe.RotationHumanOff = !dto.IsDiscoverable.Value;
            recipe.RotationSource = "Human";
            if (dto.IsDiscoverable.Value) recipe.CookedSuppressed = false;
        }

        if (dto.CuisineType is not null)
            recipe.CuisineType = dto.CuisineType;

        if (dto.MealTypes is not null)
        {
            recipe.MealTypes = dto.MealTypes;
            recipe.SupperSuitable = suitable;
            if (!suitable) recipe.IsDiscoverable = false;
            if (dto.MealTypes.Length == 0)
            {
                recipe.Category = "Supper";
            }
        }
    }

    private async Task SynchronizeDetailMetadata(Guid id, UpdateRecipeDto dto, Recipe recipe)
    {
        // Keep recipe.info on disk in sync with the DB
        await using var metadataTransaction = await RecipeRotation.LockAsync(db, id);
        await images.UpdateRecipeInfo(
            id,
            dto.Notes is not null ? recipe.Notes : null,
            dto.Rating.HasValue ? recipe.Rating : null,
            dto.Name is not null ? recipe.Name : null,
            dto.Description is not null ? recipe.Description : null,
            dto.RecipeInstructions is not null ? dto.RecipeInstructions : null,
            hasTotalTime: dto.HasTotalTime,
            totalTime: recipe.TotalTime);

        if (dto.IsDiscoverable.HasValue || dto.MealTypes is not null)
        {
            // The lock reloads the current row; an older request must not replace newer intent on disk.
            var info = await recipeStore.ReadInfoAsync(id) ?? new RecipeInfo { Id = id };
            info.IsDiscoverable = recipe.IsDiscoverable;
            info.RotationVersion = 1;
            info.RotationHumanOff = recipe.RotationHumanOff;
            info.RotationSource = recipe.RotationSource;
            info.CookedSuppressed = recipe.CookedSuppressed;
            info.SupperSuitable = recipe.SupperSuitable;
            info.MealTypes = recipe.MealTypes;
            info.Category = recipe.Category;
            await recipeStore.WriteInfoAsync(info);
        }
        if (recipe.StructuredContent is not null && StructuredRecipeContentStore.Read(recipe) is { } structuredContent)
        {
            var existingDiskJson = await recipeStore.ReadRecipeJsonAsync(id) ?? recipe.RawMetadata;
            var schemaOrgJson = StructuredRecipeContentStore.ToSchemaOrgJson(
                structuredContent,
                existingDiskJson,
                recipe.Name,
                recipe.Description,
                syncTotalTime: dto.HasTotalTime,
                totalTime: recipe.TotalTime);
            await recipeStore.WriteRecipeJsonAsync(id, schemaOrgJson);
        }

        if (metadataTransaction is not null) await metadataTransaction.CommitAsync();
        if (publisher is not null && (dto.IsDiscoverable.HasValue || dto.MealTypes is not null))
            await publisher.PublishAllSuggestionsInvalidatedAsync();
    }
}
