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
    DataRootResolver dataRoot,
    ILogger<ManagementService> logger)
{
    private string RecipesRoot => recipesRoot.Root;
    private string DataRoot => dataRoot.Root;

    public async Task<object> BackupAsync()
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
            // Skip if recipe is not ready and has no payload worth persisting
            var isReady = !string.IsNullOrEmpty(recipe.Name) && recipe.ImageCount > 0;
            if (!isReady &&
                string.IsNullOrEmpty(recipe.RawMetadata) &&
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
                    existing.Description = recipe.Description;
                    existing.Name = recipe.Name;
                    existing.Category = recipe.Category;
                    existing.IsDiscoverable = recipe.IsDiscoverable;
                    existing.IsHealthyChoice = recipe.IsHealthyChoice;
                    existing.IsVegetarian = recipe.IsVegetarian;
                    existing.Difficulty = recipe.Difficulty;
                    existing.TotalTime = recipe.TotalTime;
                    existing.LastCookedDate = recipe.LastCookedDate;
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
                    Description = recipe.Description,
                    Name = recipe.Name,
                    AddedBy = recipe.AddedBy,
                    ImageCount = recipe.ImageCount,
                    CreatedAt = recipe.CreatedAt,
                    Category = recipe.Category,
                    IsDiscoverable = recipe.IsDiscoverable,
                    IsHealthyChoice = recipe.IsHealthyChoice,
                    IsVegetarian = recipe.IsVegetarian,
                    Difficulty = recipe.Difficulty,
                    TotalTime = recipe.TotalTime,
                    LastCookedDate = recipe.LastCookedDate
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
        // 3. Backup Weekly Plans
        var weeklyPlans = await db.WeeklyPlans.AsNoTracking().ToListAsync();
        if (weeklyPlans.Count > 0)
        {
            var plansPath = Path.Combine(DataRoot, "weekly-plans.json");
            var plansJson = JsonSerializer.Serialize(weeklyPlans, JsonDefaults.CamelCase);
            await File.WriteAllTextAsync(plansPath, plansJson);
            logger.LogInformation("Backed up {Count} weekly plans to {Path}", weeklyPlans.Count, plansPath);
        }

        // 4. Backup Calendar Events
        var calendarEvents = await db.CalendarEvents.AsNoTracking().ToListAsync();
        if (calendarEvents.Count > 0)
        {
            var eventsPath = Path.Combine(DataRoot, "calendar-events.json");
            var eventsJson = JsonSerializer.Serialize(calendarEvents, JsonDefaults.CamelCase);
            await File.WriteAllTextAsync(eventsPath, eventsJson);
            logger.LogInformation("Backed up {Count} calendar events to {Path}", calendarEvents.Count, eventsPath);
        }

        logger.LogInformation("Updated/Created {Count} metadata files in {Root}", backedUpCount, root);
        return new { Message = $"Updated/Created {backedUpCount} metadata files. Weekly plans and calendar events also backed up.", FilesProcessed = backedUpCount };
    }

    public async Task<SeedResult> RestoreAsync(CancellationToken ct = default)
    {
        var root = RecipesRoot;
        var result = new SeedResult();

        logger.LogInformation("Starting restore from RecipesRoot: {Root}", root);

        if (!Directory.Exists(root))
        {
            logger.LogWarning("Restore requested but RecipesRoot {Root} does not exist.", root);
            return result;
        }

        // 1. Restore Family Members
        var membersPath = Path.Combine(DataRoot, "family-members.json");
        logger.LogInformation("Looking for family members at: {Path}", membersPath);
        if (File.Exists(membersPath))
        {
            var json3 = await File.ReadAllTextAsync(membersPath, ct);
            var members = JsonSerializer.Deserialize<List<FamilyMember>>(json3, JsonDefaults.CamelCase) ?? [];
            logger.LogInformation("Found {Count} family members to restore", members.Count);
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
            logger.LogInformation("Family members restore complete - Added: {Added}, Updated: {Updated}", result.MembersAdded, result.MembersUpdated);
        }
        else
        {
            logger.LogWarning("Family members file not found at {Path}", membersPath);
        }

        // 2. Scan Recipes for missing family members and restore recipes
        var recipeDirs = Directory.GetDirectories(root);
        logger.LogInformation("Found {Count} recipe directories in {Root}", recipeDirs.Length, root);
        var missingMemberIds = new HashSet<Guid>();
        var recipesToRestore = new List<Recipe>();

        foreach (var dir in recipeDirs)
        {
            if (ct.IsCancellationRequested) break;

            var recipeName = Path.GetFileName(dir);
            var infoPath = Path.Combine(dir, "recipe.info");
            var jsonPath = Path.Combine(dir, "recipe.json");

            bool hasInfo = File.Exists(infoPath);
            bool hasJson = File.Exists(jsonPath);

            logger.LogDebug("Processing recipe directory {RecipeId}: hasInfo={HasInfo}, hasJson={HasJson}", recipeName, hasInfo, hasJson);

            if (!hasInfo && !hasJson)
            {
                logger.LogDebug("Skipping recipe {RecipeId} - no recipe.info or recipe.json found", recipeName);
                continue;
            }

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
                        logger.LogDebug("Loaded recipe.info for {RecipeId}: name={Name}", recipeName, info.Name);
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
                            Description = info.Description,
                            Name = info.Name,
                            ImageCount = info.ImageCount,
                            CreatedAt = info.CreatedAt == default ? DateTimeOffset.UtcNow : info.CreatedAt,
                            UpdatedAt = DateTimeOffset.UtcNow,
                            Category = info.Category,
                            IsDiscoverable = info.IsDiscoverable,
                            IsHealthyChoice = info.IsHealthyChoice,
                            IsVegetarian = info.IsVegetarian,
                            Difficulty = info.Difficulty,
                            TotalTime = info.TotalTime,
                            LastCookedDate = info.LastCookedDate
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

                    logger.LogDebug("Loaded recipe.json for {RecipeId}", recipeName);

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
                    if (string.IsNullOrEmpty(recipe.Name) && rootElement.TryGetProperty("name", out var nameProp))
                    {
                        recipe.Name = nameProp.GetString();
                    }
                    if (string.IsNullOrEmpty(recipe.TotalTime) && rootElement.TryGetProperty("totalTime", out var timeProp))
                    {
                        recipe.TotalTime = timeProp.GetString();
                    }
                    if (recipe.ImageCount == 0 && rootElement.TryGetProperty("image_count", out var imgProp))
                    {
                        recipe.ImageCount = imgProp.GetInt32();
                    }
                }

                if (recipe == null)
                {
                    logger.LogDebug("Recipe object is null for {RecipeId}, skipping", recipeName);
                    continue;
                }

                if (recipe.AddedBy.HasValue)
                {
                    var memberExists = await db.FamilyMembers.AnyAsync(m => m.Id == recipe.AddedBy.Value, ct);
                    if (!memberExists)
                    {
                        missingMemberIds.Add(recipe.AddedBy.Value);
                    }
                }

                logger.LogInformation("Queued recipe for restore: {RecipeId} ({Name})", recipeName, recipe.Name ?? "unknown");
                recipesToRestore.Add(recipe);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error loading recipe from {Dir}", dir);
                result.Errors++;
            }
        }

        logger.LogInformation("Recipe loading complete - queued {Count} recipes for restore, missing members: {MissingCount}", recipesToRestore.Count, missingMemberIds.Count);

        // 3. Create placeholder family members for referential integrity
        if (missingMemberIds.Count > 0)
        {
            logger.LogInformation("Creating {Count} placeholder family members for referential integrity.", missingMemberIds.Count);
            foreach (var memberId in missingMemberIds)
            {
                db.FamilyMembers.Add(new FamilyMember
                {
                    Id = memberId,
                    Name = $"Recovered Member {memberId.ToString()[..4]}",
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                });
                result.MembersAdded++;
            }
            await db.SaveChangesAsync(ct);
        }

        // 4. Save Recipes
        logger.LogInformation("Starting save phase for {Count} recipes", recipesToRestore.Count);
        foreach (var recipe in recipesToRestore)
        {
            try
            {
                // Verify Images (case-insensitive check)
                var recipeDir = Path.Combine(root, recipe.Id.ToString());
                var originalDir = Path.Combine(recipeDir, "original");
                var validExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };

                bool hasImages = Directory.Exists(originalDir) &&
                                 Directory.GetFiles(originalDir).Any(f =>
                                     validExtensions.Contains(Path.GetExtension(f).ToLowerInvariant()));

                if (!hasImages)
                {
                    logger.LogWarning("Skipping recipe {Id} ({Name}) - no images found in {Dir}", recipe.Id, recipe.Name ?? "unknown", originalDir);
                    result.RecipesSkipped++;
                    continue;
                }

                var existing = await db.Recipes.FindAsync(new object[] { recipe.Id }, ct);
                if (existing == null)
                {
                    logger.LogDebug("Adding new recipe: {Id} ({Name})", recipe.Id, recipe.Name ?? "unknown");
                    db.Recipes.Add(recipe);
                    result.RecipesAdded++;
                }
                else
                {
                    logger.LogDebug("Updating existing recipe: {Id} ({Name})", recipe.Id, recipe.Name ?? "unknown");
                    // Update metadata
                    existing.Rating = recipe.Rating;
                    existing.Notes = recipe.Notes;
                    existing.Description = recipe.Description;
                    existing.Name = recipe.Name;
                    existing.TotalTime = recipe.TotalTime;
                    existing.Ingredients = recipe.Ingredients;
                    existing.RawMetadata = recipe.RawMetadata;
                    existing.ImageCount = recipe.ImageCount;
                    existing.Category = recipe.Category;
                    existing.IsDiscoverable = recipe.IsDiscoverable;
                    existing.IsHealthyChoice = recipe.IsHealthyChoice;
                    existing.IsVegetarian = recipe.IsVegetarian;
                    existing.Difficulty = recipe.Difficulty;
                    existing.LastCookedDate = recipe.LastCookedDate;
                    existing.UpdatedAt = DateTimeOffset.UtcNow;
                    result.RecipesUpdated++;
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error saving recipe {Id}", recipe.Id);
                result.Errors++;
            }
        }

        await db.SaveChangesAsync(ct);

        // 5. Restore Weekly Plans
        var plansPath = Path.Combine(DataRoot, "weekly-plans.json");
        if (File.Exists(plansPath))
        {
            var plansJson = await File.ReadAllTextAsync(plansPath, ct);
            var plans = JsonSerializer.Deserialize<List<WeeklyPlan>>(plansJson, JsonDefaults.CamelCase) ?? [];
            foreach (var plan in plans)
            {
                if (ct.IsCancellationRequested) break;
                var existing = await db.WeeklyPlans.FindAsync(new object[] { plan.Id }, ct);
                if (existing == null) db.WeeklyPlans.Add(plan);
                else db.Entry(existing).CurrentValues.SetValues(plan);
                result.WeeklyPlansRestored++;
            }
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Restored {Count} weekly plans.", result.WeeklyPlansRestored);
        }

        // 6. Restore Calendar Events
        var eventsPath = Path.Combine(DataRoot, "calendar-events.json");
        if (File.Exists(eventsPath))
        {
            var eventsJson = await File.ReadAllTextAsync(eventsPath, ct);
            var events = JsonSerializer.Deserialize<List<CalendarEvent>>(eventsJson, JsonDefaults.CamelCase) ?? [];
            foreach (var @event in events)
            {
                if (ct.IsCancellationRequested) break;
                // Verify recipe exists before adding event
                var recipeExists = await db.Recipes.AnyAsync(r => r.Id == @event.RecipeId, ct);
                if (!recipeExists)
                {
                    logger.LogWarning("Skipping calendar event {EventId} because recipe {RecipeId} is missing.", @event.Id, @event.RecipeId);
                    continue;
                }

                var existing = await db.CalendarEvents.FindAsync(new object[] { @event.Id }, ct);
                if (existing == null) db.CalendarEvents.Add(@event);
                else db.Entry(existing).CurrentValues.SetValues(@event);
                result.CalendarEventsRestored++;
            }
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Restored {Count} calendar events.", result.CalendarEventsRestored);
        }

        logger.LogInformation("Restored {Count} calendar events.", result.CalendarEventsRestored);

        // 7. Forward compatibility - initialize WeeklyPlans if missing
        var allEvents = await db.CalendarEvents.AsNoTracking().ToListAsync(ct);
        var uniqueMondays = allEvents.Select(e => GetMonday(e.Date)).Distinct().ToList();

        int initializedPlans = 0;
        foreach (var monday in uniqueMondays)
        {
            var exists = await db.WeeklyPlans.AnyAsync(p => p.WeekStartDate == monday, ct);
            if (!exists)
            {
                db.WeeklyPlans.Add(new WeeklyPlan
                {
                    Id = Guid.NewGuid(),
                    WeekStartDate = monday,
                    Status = WeeklyPlanStatus.Locked, // Historical data is assumed Locked
                    CreatedAt = DateTimeOffset.UtcNow
                });
                initializedPlans++;
            }
        }
        if (initializedPlans > 0)
        {
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Initialized {Count} missing weekly plans for forward compatibility.", initializedPlans);
        }

        logger.LogInformation("Restore complete - Added: {Added}, Updated: {Updated}, Skipped: {Skipped}, WeeklyPlans: {WeeklyPlans}, CalendarEvents: {CalendarEvents}, Errors: {Errors}",
            result.RecipesAdded, result.RecipesUpdated, result.RecipesSkipped, result.WeeklyPlansRestored, result.CalendarEventsRestored, result.Errors);
        return result;
    }

    private static DateOnly GetMonday(DateOnly date)
    {
        var daysToMonday = ((int)date.DayOfWeek - 1 + 7) % 7;
        return date.AddDays(-daysToMonday);
    }

    public async Task<SeedResult> DisasterRecoveryAsync()
    {
        var root = RecipesRoot;
        var result = new SeedResult();

        if (!Directory.Exists(root)) return result;

        var membersPath = Path.Combine(DataRoot, "family-members.json");
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

        var membersPath = Path.Combine(DataRoot, "family-members.json");
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
