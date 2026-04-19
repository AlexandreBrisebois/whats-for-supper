using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class ManagementService(
    RecipeDbContext db,
    IConfiguration configuration,
    ILogger<ManagementService> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private string RecipesRoot =>
        Environment.GetEnvironmentVariable("RECIPES_ROOT")
        ?? configuration["RecipesRoot"]
        ?? "/data/recipes";

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
            // Skip if no payload (not yet imported or having notes)
            if (string.IsNullOrEmpty(recipe.RawMetadata) && string.IsNullOrEmpty(recipe.Notes))
            {
                continue;
            }

            var recipeDir = Path.Combine(root, recipe.Id.ToString());
            if (!Directory.Exists(recipeDir)) Directory.CreateDirectory(recipeDir);

            var recipeJsonPath = Path.Combine(recipeDir, "recipe.json");
            var recipeInfoPath = Path.Combine(recipeDir, "recipe.info");

            if (File.Exists(recipeJsonPath))
            {
                // Update only Notes/Rating
                var json = await File.ReadAllTextAsync(recipeJsonPath);
                var existing = JsonSerializer.Deserialize<Recipe>(json, JsonOptions);
                if (existing != null)
                {
                    existing.Notes = recipe.Notes;
                    existing.Rating = recipe.Rating;
                    var updatedJson = JsonSerializer.Serialize(existing, JsonOptions);
                    await File.WriteAllTextAsync(recipeJsonPath, updatedJson);
                    backedUpCount++;
                }
            }
            else if (File.Exists(recipeInfoPath))
            {
                // Update Notes/Rating in legacy .info
                var json = await File.ReadAllTextAsync(recipeInfoPath);
                var existing = JsonSerializer.Deserialize<RecipeInfo>(json, JsonOptions);
                if (existing != null)
                {
                    existing.Notes = recipe.Notes;
                    existing.Rating = recipe.Rating;
                    var updatedJson = JsonSerializer.Serialize(existing, JsonOptions);
                    await File.WriteAllTextAsync(recipeInfoPath, updatedJson);
                    backedUpCount++;
                }
            }
            else
            {
                // Create new recipe.json
                var recipeJson = JsonSerializer.Serialize(recipe, JsonOptions);
                await File.WriteAllTextAsync(recipeJsonPath, recipeJson);
                backedUpCount++;
            }
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
            var json = await File.ReadAllTextAsync(membersPath, ct);
            var members = JsonSerializer.Deserialize<List<FamilyMember>>(json, JsonOptions) ?? [];
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
                    var json = await File.ReadAllTextAsync(infoPath, ct);
                    var info = JsonSerializer.Deserialize<RecipeInfo>(json, JsonOptions);
                    if (info != null)
                    {
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

                // Augment or Load from recipe.json
                if (hasJson)
                {
                    var json = await File.ReadAllTextAsync(jsonPath, ct);
                    var extracted = JsonSerializer.Deserialize<Recipe>(json, JsonOptions);
                    if (extracted != null)
                    {
                        if (recipe == null)
                        {
                            recipe = extracted;
                        }
                        else
                        {
                            // Augment with AI extracted data
                            recipe.RawMetadata = extracted.RawMetadata;
                            recipe.Ingredients = extracted.Ingredients;

                            // If info was missing image count but json has it, use it
                            if (recipe.ImageCount == 0 && extracted.ImageCount > 0)
                            {
                                recipe.ImageCount = extracted.ImageCount;
                            }
                        }
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
            var json = await File.ReadAllTextAsync(membersPath);
            existingMembers = JsonSerializer.Deserialize<List<FamilyMember>>(json, JsonOptions) ?? [];
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
                var json = await File.ReadAllTextAsync(recipeJsonPath);
                var recipe = JsonSerializer.Deserialize<Recipe>(json, JsonOptions);
                addedBy = recipe?.AddedBy;
            }
            else if (File.Exists(recipeInfoPath))
            {
                var json = await File.ReadAllTextAsync(recipeInfoPath);
                var info = JsonSerializer.Deserialize<RecipeInfo>(json, JsonOptions);
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
            var json = await File.ReadAllTextAsync(membersPath);
            existingMembers = JsonSerializer.Deserialize<List<FamilyMember>>(json, JsonOptions) ?? [];
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
            var updatedJson = JsonSerializer.Serialize(existingMembers, JsonOptions);
            await File.WriteAllTextAsync(membersPath, updatedJson);
            logger.LogInformation("Merged {Count} family members into {Path}", addedCount, membersPath);
        }

        return addedCount;
    }
}

public class SeedResult
{
    public int MembersAdded { get; set; }
    public int MembersUpdated { get; set; }
    public int RecipesAdded { get; set; }
    public int RecipesUpdated { get; set; }
    public int RecipesSkipped { get; set; }
    public int Errors { get; set; }
}
