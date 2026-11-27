using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services.Management;

internal sealed record LoadedRecipeBatch(
    List<Recipe> RecipesToRestore,
    HashSet<Guid> MissingMemberIds,
    HashSet<Guid> PendingPdfIds,
    Dictionary<Guid, bool> ExplicitReadiness);

internal sealed class ManagementSeedService(
    RecipeDbContext db,
    IRecipeStore recipeStore,
    IClock clock,
    ILogger logger)
{
    public async Task<LoadedRecipeBatch> LoadRecipesFromStoreAsync(
        FoodVocabularyAuthority? vocabularyAuthority,
        SeedResult result,
        CancellationToken ct)
    {
        var recipeIds = await recipeStore.ListRecipeIdsAsync(ct);
        logger.LogInformation("Found {Count} recipes in store", recipeIds.Count);
        var missingMemberIds = new HashSet<Guid>();
        var recipesToRestore = new List<Recipe>();
        var pendingPdfIds = new HashSet<Guid>();
        var explicitReadiness = new Dictionary<Guid, bool>();

        foreach (var recipeId in recipeIds)
        {
            if (ct.IsCancellationRequested) break;

            var hasInfo = await recipeStore.InfoExistsAsync(recipeId, ct);
            var hasJson = await recipeStore.RecipeJsonExistsAsync(recipeId, ct);

            logger.LogDebug("Processing recipe {RecipeId}: hasInfo={HasInfo}, hasJson={HasJson}", recipeId, hasInfo, hasJson);

            if (!hasInfo && !hasJson)
            {
                logger.LogDebug("Skipping recipe {RecipeId} - no recipe.info or recipe.json found", recipeId);
                continue;
            }

            try
            {
                Recipe? recipe = null;

                if (hasInfo)
                {
                    var info = await recipeStore.ReadInfoAsync(recipeId, ct);
                    if (info != null)
                    {
                        if (info.RotationVersion is < 0 or > 1 ||
                            (info.RotationVersion == 1 &&
                             (info.RotationSource is not ("Unknown" or "Human" or "AI" or "Dreaming") ||
                              (info.RotationHumanOff && info.RotationSource != "Human"))))
                            throw new InvalidDataException($"Unsupported or inconsistent rotation metadata for {recipeId}.");
                        await using var pdfSource = await recipeStore.ReadSourcePdfAsync(recipeId, ct);
                        var pendingPdf = pdfSource is not null && info.IsReady != true;
                        if (pendingPdf) pendingPdfIds.Add(recipeId);
                        if (info.IsReady is { } ready) explicitReadiness[recipeId] = ready;
                        if (info.Id != recipeId || (string.IsNullOrWhiteSpace(info.Name) && !pendingPdf && info.IsReady != false))
                            throw new InvalidDataException($"Recipe info for {recipeId} is missing its required current id or name.");

                        logger.LogDebug("Loaded recipe.info for {RecipeId}: name={Name}", recipeId, info.Name);
                        if (!Enum.IsDefined(typeof(RecipeRating), info.Rating))
                            info.Rating = RecipeRating.Unknown;

                        recipe = new Recipe
                        {
                            Id = info.Id,
                            AddedBy = info.AddedBy,
                            Notes = info.Notes,
                            Rating = info.Rating,
                            Description = info.Description,
                            Name = info.Name,
                            ImageCount = info.ImageCount,
                            FinishedDishIndex = info.FinishedDishImageIndex,
                            IsSynthesized = info.IsSynthesized,
                            CreatedAt = info.CreatedAt == default ? clock.UtcNow : info.CreatedAt,
                            UpdatedAt = clock.UtcNow,
                            Category = info.Category,
                            CuisineType = info.CuisineType,
                            MealTypes = info.MealTypes,
                            IsDiscoverable = info.IsDiscoverable,
                            RotationHumanOff = info.RotationVersion == 1 && info.RotationHumanOff,
                            RotationSource = info.RotationVersion == 1 ? info.RotationSource : "Unknown",
                            CookedSuppressed = info.RotationVersion == 1 && info.CookedSuppressed,
                            SupperSuitable = info.RotationVersion == 1 ? info.SupperSuitable : null,
                            IsVegetarian = info.IsVegetarian,
                            TotalTime = info.TotalTime,
                            LastCookedDate = info.LastCookedDate,
                            DeletedAt = info.DeletedAt,
                            SourceUrl = info.SourceUrl,
                            IsReady = info.IsReady ?? !pendingPdf
                        };
                    }
                }

                if (hasJson)
                {
                    var rawJson = await recipeStore.ReadRecipeJsonAsync(recipeId, ct);
                    if (rawJson != null)
                    {
                        var currentJson = ManagementSharedHelpers.RemoveRetiredRecipeFields(rawJson);
                        using var doc = JsonDocument.Parse(currentJson);
                        var rootElement = doc.RootElement;

                        StructuredRecipeContentStore.RejectRetiredRecipeWrapper(rootElement);

                        recipe ??= new Recipe { Id = recipeId, CreatedAt = clock.UtcNow, UpdatedAt = clock.UtcNow };

                        logger.LogDebug("Loaded recipe.json for {RecipeId}", recipeId);

                        recipe.RawMetadata = currentJson;
                        recipe.Servings = RecipeServings.FromMetadata(recipe.RawMetadata);

                        if (rootElement.TryGetProperty("recipeIngredient", out var ingProp) && ingProp.ValueKind == JsonValueKind.Array)
                            recipe.Ingredients = ingProp.GetRawText().Contains('\n') ? JsonSerializer.Serialize(ingProp) : ingProp.GetRawText();
                        else if (rootElement.TryGetProperty("ingredients", out var legacyIngProp) && legacyIngProp.ValueKind == JsonValueKind.Array)
                            recipe.Ingredients = legacyIngProp.GetRawText();
                        else if (rootElement.TryGetProperty("ingredients", out var serializedIngredients)
                            && serializedIngredients.ValueKind == JsonValueKind.String
                            && ManagementSharedHelpers.IsJsonArray(serializedIngredients.GetString()))
                            recipe.Ingredients = serializedIngredients.GetString();

                        if (!string.IsNullOrWhiteSpace(recipe.RawMetadata))
                        {
                            try
                            {
                                var (derived, evidence) = StructuredRecipeContentStore.FromSchemaOrg(
                                    recipeId, recipe.RawMetadata, recipe.SourceUrl, vocabularyAuthority, Guid.NewGuid(), "source");
                                if (recipe.Servings is > 0 && derived.Servings is null)
                                    derived = derived with { Servings = recipe.Servings };
                                recipe.StructuredContent = JsonSerializer.Serialize(derived, new JsonSerializerOptions(JsonSerializerDefaults.Web));
                                recipe.FoodMappingEvidence = evidence;
                                recipe.Servings = derived.Servings;
                                if (string.IsNullOrWhiteSpace(recipe.Ingredients) && derived.IngredientLines.Count > 0)
                                    recipe.Ingredients = JsonSerializer.Serialize(derived.IngredientLines.Select(StructuredRecipeContentStore.Render), new JsonSerializerOptions(JsonSerializerDefaults.Web));
                            }
                            catch (Exception ex) when (ex is JsonException or InvalidDataException)
                            {
                                logger.LogWarning(ex, "Could not derive structured content during restore for {RecipeId}", recipeId);
                            }
                        }

                        if (string.IsNullOrEmpty(recipe.Category) && rootElement.TryGetProperty("category", out var catProp))
                            recipe.Category = catProp.GetString();
                        if (string.IsNullOrEmpty(recipe.Name) && rootElement.TryGetProperty("name", out var nameProp))
                            recipe.Name = nameProp.GetString();
                        if (string.IsNullOrEmpty(recipe.TotalTime) && rootElement.TryGetProperty("totalTime", out var timeProp))
                            recipe.TotalTime = timeProp.GetString();
                        if (string.IsNullOrEmpty(recipe.SourceUrl) && rootElement.TryGetProperty("sourceUrl", out var sourceUrlProp))
                            recipe.SourceUrl = sourceUrlProp.GetString();
                        if (recipe.ImageCount == 0 && rootElement.TryGetProperty("image_count", out var imgProp))
                            recipe.ImageCount = imgProp.GetInt32();
                    }
                }

                if (recipe == null)
                {
                    logger.LogDebug("Recipe object is null for {RecipeId}, skipping", recipeId);
                    continue;
                }

                if (recipe.AddedBy.HasValue)
                {
                    var memberExists = await db.FamilyMembers.AnyAsync(m => m.Id == recipe.AddedBy.Value, ct);
                    if (!memberExists)
                        missingMemberIds.Add(recipe.AddedBy.Value);
                }

                logger.LogInformation("Queued recipe for restore: {RecipeId} ({Name})", recipeId, recipe.Name ?? "unknown");
                recipesToRestore.Add(recipe);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error loading recipe {RecipeId}", recipeId);
                result.Errors++;
            }
        }

        logger.LogInformation("Recipe loading complete - queued {Count} recipes for restore, missing members: {MissingCount}", recipesToRestore.Count, missingMemberIds.Count);
        return new LoadedRecipeBatch(recipesToRestore, missingMemberIds, pendingPdfIds, explicitReadiness);
    }

    public async Task SaveRestoredRecipesAsync(LoadedRecipeBatch batch, SeedResult result, CancellationToken ct)
    {
        logger.LogInformation("Starting save phase for {Count} recipes", batch.RecipesToRestore.Count);
        foreach (var recipe in batch.RecipesToRestore)
        {
            try
            {
                await using var rotationTransaction = await RecipeRotation.LockAsync(db, recipe.Id, ct);
                var existing = await db.Recipes.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.Id == recipe.Id, ct);
                if (existing == null)
                {
                    logger.LogDebug("Adding new recipe: {Id} ({Name})", recipe.Id, recipe.Name ?? "unknown");
                    db.Recipes.Add(recipe);
                    result.RecipesAdded++;
                }
                else
                {
                    logger.LogDebug("Updating existing recipe: {Id} ({Name}) (deleted={IsDeleted})",
                        recipe.Id, recipe.Name ?? "unknown", existing.DeletedAt.HasValue);

                    // Update metadata and structured content cleanly (respecting guard_canonical_recipe_content trigger).
                    existing.Rating = recipe.Rating;
                    existing.Notes = recipe.Notes;
                    existing.Description = recipe.Description;
                    existing.Name = recipe.Name;
                    existing.TotalTime = recipe.TotalTime;
                    existing.Ingredients = recipe.Ingredients;
                    existing.RawMetadata = recipe.RawMetadata;
                    existing.StructuredContent = recipe.StructuredContent ?? existing.StructuredContent;
                    existing.FoodMappingEvidence = recipe.FoodMappingEvidence ?? existing.FoodMappingEvidence;
                    existing.Servings = recipe.Servings;
                    existing.ImageCount = recipe.ImageCount;
                    existing.FinishedDishIndex = recipe.FinishedDishIndex;
                    existing.IsSynthesized = recipe.IsSynthesized;
                    existing.Category = recipe.Category;
                    existing.IsDiscoverable = recipe.IsDiscoverable;
                    existing.RotationHumanOff = recipe.RotationHumanOff;
                    existing.RotationSource = recipe.RotationSource;
                    existing.CookedSuppressed = recipe.CookedSuppressed;
                    existing.SupperSuitable = recipe.SupperSuitable;
                    existing.IsVegetarian = recipe.IsVegetarian;
                    existing.LastCookedDate = recipe.LastCookedDate;
                    existing.SourceUrl = recipe.SourceUrl;
                    existing.CuisineType = recipe.CuisineType;
                    existing.MealTypes = recipe.MealTypes;
                    existing.IsReady = batch.ExplicitReadiness.GetValueOrDefault(recipe.Id, !batch.PendingPdfIds.Contains(recipe.Id));
                    if (recipe.DeletedAt.HasValue) existing.DeletedAt = recipe.DeletedAt;
                    existing.UpdatedAt = clock.UtcNow;
                    result.RecipesUpdated++;
                }
                await db.SaveChangesAsync(ct);
                if (rotationTransaction is not null) await rotationTransaction.CommitAsync(ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error saving recipe {Id}", recipe.Id);
                // A later SaveChanges must not retry this failed row outside its lock.
                foreach (var entry in db.ChangeTracker.Entries<Recipe>().Where(e => e.Entity.Id == recipe.Id).ToList())
                    entry.State = EntityState.Detached;
                result.Errors++;
            }
        }

        await db.SaveChangesAsync(ct);
    }
}
