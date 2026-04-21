using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class ManagementService(
    RecipeDbContext db,
    RecipesRootResolver recipesRoot,
    ILogger<ManagementService> logger)
{
    private string RecipesRoot => recipesRoot.Root;

    public async Task BackupAsync()
    {
        var root = RecipesRoot;
        if (!Directory.Exists(root)) Directory.CreateDirectory(root);

        // 1. Merge Family Members (Append only)
        var dbMembers = await db.FamilyMembers.ToListAsync();
        await MergeFamilyMembersAsync(dbMembers);

        // 2. Backup Recipes (Update notes/rating or create missing)
        var recipes = await db.Recipes.ToListAsync();
        int backedUpCount = 0;
        foreach (var recipe in recipes)
        {
            // Skip if no payload (not yet imported, no notes, and no rating)
            if (string.IsNullOrEmpty(recipe.RawMetadata) &&
                string.IsNullOrEmpty(recipe.Notes) &&
                recipe.Rating == RecipeRating.Unknown)
            {
                continue;
            }

            var recipeDir = Path.Combine(root, recipe.Id.ToString());
            if (!Directory.Exists(recipeDir)) Directory.CreateDirectory(recipeDir);

            var recipeJsonPath = Path.Combine(recipeDir, "recipe.json");
            var recipeInfoPath = Path.Combine(recipeDir, "recipe.info");

            // 1. Metadata always goes to recipe.info
            if (File.Exists(recipeInfoPath))
            {
                var json = await File.ReadAllTextAsync(recipeInfoPath);
                var existing = JsonSerializer.Deserialize<RecipeInfo>(json, JsonDefaults.CamelCase);
                if (existing != null)
                {
                    existing.Notes = recipe.Notes;
                    existing.Rating = recipe.Rating;
                    var updatedJson = JsonSerializer.Serialize(existing, JsonDefaults.CamelCase);
                    await File.WriteAllTextAsync(recipeInfoPath, updatedJson);
                }
            }
            else
            {
                // Create missing recipe.info
                var info = new RecipeInfo
                {
                    Id = recipe.Id,
                    Notes = recipe.Notes,
                    Rating = recipe.Rating,
                    AddedBy = recipe.AddedBy,
                    ImageCount = recipe.ImageCount,
                    CreatedAt = recipe.CreatedAt
                };
                var json2 = JsonSerializer.Serialize(info, JsonDefaults.CamelCase);
                await File.WriteAllTextAsync(recipeInfoPath, json2);
            }

            // 2. Actual recipe content goes to recipe.json (AI metadata, ingredients)
            if (File.Exists(recipeJsonPath))
            {
                // We don't overwrite recipe.json if it exists, as it contains AI extracted data.
                // Since Notes/Rating are [JsonIgnore] in Recipe model, they won't be written here
                // if we were to serialize, but we just leave it alone during backup unless it's missing.
            }
            else if (!string.IsNullOrEmpty(recipe.RawMetadata) || !string.IsNullOrEmpty(recipe.Ingredients))
            {
                var recipeJson2 = JsonSerializer.Serialize(recipe, JsonDefaults.CamelCase);
                await File.WriteAllTextAsync(recipeJsonPath, recipeJson2);
            }

            backedUpCount++;
        }
        logger.LogInformation("Updated/Created {Count} metadata files in {Root}", backedUpCount, root);
    }

    public async Task<SeedResult> RestoreAsync(CancellationToken ct = default)
    {
        var root = RecipesRoot;
        var result = new SeedResult();

        if (!Directory.Exists(root))
        {
            logger.LogWarning("Restore requested but RecipesRoot {Root} does not exist.", root);
            return result;
        }

        // 1. Restore Family Members
        var membersPath = Path.Combine(root, "family-members.json");
        if (File.Exists(membersPath))
        {
            var json3 = await File.ReadAllTextAsync(membersPath, ct);
            var members = JsonSerializer.Deserialize<List<FamilyMember>>(json3, JsonDefaults.CamelCase) ?? [];
            foreach (var member in members)
            {
                if (ct.IsCancellationRequested) break;
                var existing = await db.FamilyMembers.FindAsync(new object[] { member.Id }, ct);
                if (existing == null)
                {
                    db.FamilyMembers.Add(member);
                    result.MembersAdded++;
                }
                else
                {
                    existing.Name = member.Name;
                    existing.UpdatedAt = DateTimeOffset.UtcNow;
                    result.MembersUpdated++;
                }
            }
            await db.SaveChangesAsync(ct);
        }

        // 2. Restore Recipes
        var recipeDirs = Directory.GetDirectories(root);
        foreach (var dir in recipeDirs)
        {
            if (ct.IsCancellationRequested) break;

            var infoPath = Path.Combine(dir, "recipe.info");
            var jsonPath = Path.Combine(dir, "recipe.json");

            bool hasInfo = File.Exists(infoPath);
            bool hasJson = File.Exists(jsonPath);

            if (!hasInfo && !hasJson) continue;

            try
            {
                Recipe? recipe = null;

                // Load primary metadata from recipe.info if available
                if (hasInfo)
                {
                    var json4 = await File.ReadAllTextAsync(infoPath, ct);
                    var info = JsonSerializer.Deserialize<RecipeInfo>(json4, JsonDefaults.CamelCase);
                    if (info != null)
                    {
                        // Validate/Clamp Rating to prevent CK_recipes_rating violation
                        if (!Enum.IsDefined(typeof(RecipeRating), info.Rating))
                        {
                            info.Rating = RecipeRating.Unknown;
                        }

                        recipe = new Recipe
                        {
                            Id = info.Id,
                            AddedBy = info.AddedBy,
                            Notes = info.Notes,
                            Rating = info.Rating,
                            ImageCount = info.ImageCount,
                            CreatedAt = info.CreatedAt == default ? DateTimeOffset.UtcNow : info.CreatedAt,
                            UpdatedAt = DateTimeOffset.UtcNow
                        };
                    }
                }

                // Augment from recipe.json if available
                if (hasJson)
                {
                    var json5 = await File.ReadAllTextAsync(jsonPath, ct);

                    // We avoid deserializing directly into the 'Recipe' model because properties like 'Ingredients' 
                    // in local files are often arrays/objects, whereas in the EF model they are raw JSON strings (mapped to JSONB).
                    // This mismatch causes JsonException.

                    using var doc = JsonDocument.Parse(json5);
                    var rootElement = doc.RootElement;

                    if (recipe == null)
                    {
                        recipe = new Recipe { Id = Guid.Parse(Path.GetFileName(dir)) };
                    }

                    // Map AI data (RawMetadata is the entire file for fidelity)
                    recipe.RawMetadata = json5;

                    // Extract ingredients from various possible keys (Schema.org vs older custom formats)
                    if (rootElement.TryGetProperty("recipeIngredient", out var ingProp) && ingProp.ValueKind == JsonValueKind.Array)
                    {
                        recipe.Ingredients = ingProp.GetRawText();
                    }
                    else if (rootElement.TryGetProperty("ingredients", out var legacyIngProp) && legacyIngProp.ValueKind == JsonValueKind.Array)
                    {
                        recipe.Ingredients = legacyIngProp.GetRawText();
                    }

                    // Map Category and Difficulty if present
                    if (string.IsNullOrEmpty(recipe.Category) && rootElement.TryGetProperty("category", out var catProp))
                    {
                        recipe.Category = catProp.GetString();
                    }
                    if (string.IsNullOrEmpty(recipe.Difficulty) && rootElement.TryGetProperty("difficulty", out var diffProp))
                    {
                        recipe.Difficulty = diffProp.GetString();
                    }
                    if (recipe.ImageCount == 0 && rootElement.TryGetProperty("image_count", out var imgProp))
                    {
                        recipe.ImageCount = imgProp.GetInt32();
                    }
                }

                if (recipe == null) continue;

                // Verify Images (case-insensitive check)
                var originalDir = Path.Combine(dir, "original");
                var validExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };

                bool hasImages = Directory.Exists(originalDir) &&
                                 Directory.GetFiles(originalDir).Any(f =>
                                     validExtensions.Contains(Path.GetExtension(f).ToLowerInvariant()));

                if (!hasImages)
                {
                    logger.LogWarning("Skipping recipe {Id} - no images found in {Dir}", recipe.Id, originalDir);
                    result.RecipesSkipped++;
                    continue;
                }

                var existing = await db.Recipes.FindAsync(new object[] { recipe.Id }, ct);
                if (existing == null)
                {
                    db.Recipes.Add(recipe);
                    result.RecipesAdded++;
                    logger.LogInformation("Restored recipe {Id} from {Source}", recipe.Id, hasInfo ? "recipe.info" : "recipe.json");
                }
                else
                {
                    // Update metadata
                    existing.Rating = recipe.Rating;
                    existing.Notes = recipe.Notes;
                    existing.Ingredients = recipe.Ingredients;
                    existing.RawMetadata = recipe.RawMetadata;
                    existing.ImageCount = recipe.ImageCount;
                    existing.UpdatedAt = DateTimeOffset.UtcNow;
                    result.RecipesUpdated++;
                    logger.LogInformation("Updated metadata for recipe {Id}", recipe.Id);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error restoring recipe from {Dir}", dir);
                result.Errors++;
            }
        }

        await db.SaveChangesAsync(ct);
        return result;
    }

    public async Task<SeedResult> DisasterRecoveryAsync()
    {
        var root = RecipesRoot;
        var result = new SeedResult();

        if (!Directory.Exists(root)) return result;

        var membersPath = Path.Combine(root, "family-members.json");
        List<FamilyMember> existingMembers = [];
        if (File.Exists(membersPath))
        {
            var json6 = await File.ReadAllTextAsync(membersPath);
            existingMembers = JsonSerializer.Deserialize<List<FamilyMember>>(json6, JsonDefaults.CamelCase) ?? [];
        }

        var recipeDirs = Directory.GetDirectories(root);
        var missingIds = new HashSet<Guid>();

        foreach (var dir in recipeDirs)
        {
            var recipeJsonPath = Path.Combine(dir, "recipe.json");
            var recipeInfoPath = Path.Combine(dir, "recipe.info");

            Guid? addedBy = null;

            if (File.Exists(recipeJsonPath))
            {
                var json7 = await File.ReadAllTextAsync(recipeJsonPath);
                var recipe = JsonSerializer.Deserialize<Recipe>(json7, JsonDefaults.CamelCase);
                addedBy = recipe?.AddedBy;
            }
            else if (File.Exists(recipeInfoPath))
            {
                var json8 = await File.ReadAllTextAsync(recipeInfoPath);
                var info = JsonSerializer.Deserialize<RecipeInfo>(json8, JsonDefaults.CamelCase);
                addedBy = info?.AddedBy;
            }

            if (addedBy.HasValue && !existingMembers.Any(m => m.Id == addedBy.Value))
            {
                missingIds.Add(addedBy.Value);
            }
        }

        var placeholders = missingIds.Select(id => new FamilyMember
        {
            Id = id,
            Name = $"Recovered Member {id.ToString()[..4]}",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        }).ToList();

        result.MembersAdded = await MergeFamilyMembersAsync(placeholders);
        return result;
    }

    private async Task<int> MergeFamilyMembersAsync(List<FamilyMember> sourceMembers)
    {
        var root = RecipesRoot;
        if (!Directory.Exists(root)) Directory.CreateDirectory(root);

        var membersPath = Path.Combine(root, "family-members.json");
        List<FamilyMember> existingMembers = [];
        if (File.Exists(membersPath))
        {
            var json9 = await File.ReadAllTextAsync(membersPath);
            existingMembers = JsonSerializer.Deserialize<List<FamilyMember>>(json9, JsonDefaults.CamelCase) ?? [];
        }

        int addedCount = 0;
        foreach (var member in sourceMembers)
        {
            if (!existingMembers.Any(m => m.Id == member.Id))
            {
                existingMembers.Add(member);
                addedCount++;
            }
        }

        if (addedCount > 0)
        {
            var updatedJson2 = JsonSerializer.Serialize(existingMembers, JsonDefaults.CamelCase);
            await File.WriteAllTextAsync(membersPath, updatedJson2);
            logger.LogInformation("Merged {Count} family members into {Path}", addedCount, membersPath);
        }
        return addedCount;
    }
}
