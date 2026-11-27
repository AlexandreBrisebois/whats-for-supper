using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services.Recipes;

public sealed class RecipeShareBundleService(
    IClock clock,
    RecipeDbContext db,
    ImageService images,
    IRecipeStore recipeStore,
    FoodVocabularyStore? vocabulary = null)
{
    private const string RecipeShareBundleVersion = "1.0";

    public async Task<RecipeShareBundleDto> ExportRecipeShareBundle(Guid id)
    {
        // Keep the committed facts and selected media under the same recipe
        // coordination used by publication/delivery. Reads neither resume pending
        // work nor use a potentially older entity already tracked by this context.
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync() : null;
        if (transaction is not null)
            await db.Database.ExecuteSqlAsync($"SELECT id FROM recipes WHERE id = {id} FOR SHARE");
        var recipe = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException($"Recipe {id} not found.");
        var content = StructuredRecipeContentStore.Read(recipe);
        var hero = await RecipeMediaService.ReadHeroImageAsync(images, id)
            ?? throw new InvalidOperationException("Recipe must have a hero image before it can be shared.");

        var result = new RecipeShareBundleDto
        {
            Version = RecipeShareBundleVersion,
            Recipe = new ImportedRecipeDto
            {
                Name = recipe.Name ?? string.Empty,
                Description = recipe.Description,
                Ingredients = content is null
                    ? RecipeMapper.DeserializeIngredients(recipe.Ingredients)
                    : content.IngredientLines.Select(StructuredRecipeContentStore.Render).ToList(),
                Instructions = content is null
                    ? MapInstructionsToHowToSections(recipe.RawMetadata)
                    : content.InstructionSections.Select(section => new HowToSectionDto
                    {
                        Name = section.Name,
                        ItemListElement = section.Steps.Select(step => new HowToStepDto { Text = step.Text }).ToList()
                    }).ToList(),
                TotalTimeMinutes = ParseTotalTimeMinutes(recipe.TotalTime),
                Servings = recipe.Servings,
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
                ExportedAtUtc = clock.UtcNow,
                BundleSource = "wfs-share",
                AppVersion = null,
                RecipeId = id,
            },
            Hero = hero,
            Originals = await RecipeMediaService.ReadOriginalImagesAsync(images, id, recipe.ImageCount),
        };
        if (transaction is not null) await transaction.CommitAsync();
        return result;
    }

    public async Task<RecipeDto> ImportRecipeShareBundle(RecipeShareBundleDto bundle, Guid familyMemberId)
    {
        ValidateBundle(bundle);

        var now = clock.UtcNow;
        var recipeId = bundle.Info.RecipeId ?? Guid.NewGuid();

        if (await db.Recipes.AnyAsync(r => r.Id == recipeId))
        {
            recipeId = Guid.NewGuid();
        }

        var originalCount = Math.Min(bundle.Originals.Count, 5);

        var info = new RecipeInfo
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
            TotalTime = FormatTotalTime(bundle.Recipe.TotalTimeMinutes),
            IsSynthesized = bundle.Recipe.IsSynthesized,
            IsReady = true,
            CreatedAt = now,
            Notes = bundle.Recipe.Notes,
            Rating = (RecipeRating)(bundle.Recipe.Rating ?? 0)
        };
        if (bundle.Hero is not null)
        {
            using var heroStream = new MemoryStream(Convert.FromBase64String(bundle.Hero.Base64));
            await recipeStore.SaveHeroImageAsync(recipeId, heroStream);
        }
        for (var index = 0; index < originalCount; index++)
        {
            var original = bundle.Originals[index];
            using var origStream = new MemoryStream(Convert.FromBase64String(original.Base64));
            await recipeStore.SaveOriginalImageAsync(recipeId, index, original.MimeType, origStream);
        }

        var operation = Guid.NewGuid();
        var rawMetadata = BuildImportedRawMetadata(bundle.Recipe);
        var authority = vocabulary is not null ? await vocabulary.CaptureAuthorityAsync(null) : null;
        var (content, evidence) = StructuredRecipeContentStore.FromSchemaOrg(
            recipeId, rawMetadata, info.SourceUrl, authority, operation, origin: "source");
        if (bundle.Recipe.Servings is > 0 && content.Servings is null)
        {
            content = content with { Servings = bundle.Recipe.Servings };
        }
        var schemaOrgJson = StructuredRecipeContentStore.ToSchemaOrgJson(content, rawMetadata, info.Name, info.Description);

        await recipeStore.WriteRecipeJsonAsync(recipeId, schemaOrgJson);
        await recipeStore.WriteInfoAsync(info);

        var webJson = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        var entity = new Recipe
        {
            Id = recipeId,
            Name = info.Name,
            Description = info.Description,
            SourceUrl = info.SourceUrl,
            Category = info.Category,
            CuisineType = info.CuisineType,
            MealTypes = info.MealTypes,
            IsVegetarian = info.IsVegetarian,
            TotalTime = info.TotalTime,
            FinishedDishIndex = info.FinishedDishImageIndex,
            ImageCount = info.ImageCount,
            IsSynthesized = info.IsSynthesized,
            IsReady = info.IsReady ?? true,
            AddedBy = info.AddedBy,
            Notes = info.Notes,
            Rating = info.Rating,
            RawMetadata = schemaOrgJson,
            StructuredContent = JsonSerializer.Serialize(content, webJson),
            FoodMappingEvidence = evidence,
            Servings = content.Servings,
            Ingredients = JsonSerializer.Serialize(content.IngredientLines.Select(StructuredRecipeContentStore.Render), webJson),
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Recipes.Add(entity);
        db.RecipeSearchDocuments.Add(new RecipeSearchDocument { RecipeId = recipeId });
        await db.SaveChangesAsync();

        var reports = new RecipeImportReportService(clock, db);
        await reports.FlagSuspectedDuplicateIfNoneAsync(recipeId);
        return await RecipeMapper.MapDetailDtoAsync(db, entity);
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
                    else if (element.TryGetProperty("text", out var t))
                    {
                        looseSteps.Add(new HowToStepDto { Text = t.GetString() ?? "" });
                    }
                    else if (element.TryGetProperty("name", out var n))
                    {
                        looseSteps.Add(new HowToStepDto { Text = n.GetString() ?? "" });
                    }
                }
            }

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
        => JsonSerializer.Serialize(new Dictionary<string, object?>
        {
            ["@context"] = "https://schema.org/",
            ["@type"] = "Recipe",
            ["name"] = recipe.Name,
            ["description"] = recipe.Description,
            ["recipeYield"] = recipe.Servings is > 0 ? $"{recipe.Servings} portions" : null,
            ["sourceName"] = recipe.SourceName,
            ["recipeIngredient"] = recipe.Ingredients,
            ["recipeInstructions"] = recipe.Instructions,
        }, JsonDefaults.CamelCase);

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

        if (bundle.Recipe.Servings is <= 0)
            throw new InvalidOperationException("Shared recipe servings must be positive when supplied.");

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
}
