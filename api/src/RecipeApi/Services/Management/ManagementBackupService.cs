using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services.Management;

internal sealed class ManagementBackupService(
    RecipeDbContext db,
    IRecipeStore recipeStore,
    DataRootResolver dataRoot,
    ManagementSearchService searchService,
    ILogger logger)
{
    private string DataRoot => dataRoot.Root;
    private string RecipeImportReportsBackupPath => Path.Combine(DataRoot, "recipe-import-reports.json");
    private string GroceryExtrasBackupPath => Path.Combine(DataRoot, "grocery-extras.json");

    public async Task<object> BackupAsync(
        Func<CancellationToken, Task> exportSupperServingsAsync,
        Func<string, CancellationToken, bool, Task> exportInterestAsync)
    {
        await using var snapshotTransaction = await VotingBoundary.BeginAsync(db);
        if (db.Database.IsRelational())
            // EXCLUSIVE also drains cooperating FOR UPDATE/SHARE file publishers.
            // SHARE alone excludes SQL updates but still permits their row-lock phase.
            // Ordinary SELECT reads remain available during this existing backup boundary.
            await db.Database.ExecuteSqlRawAsync("LOCK TABLE recipes IN EXCLUSIVE MODE");
        if (await db.RecipePhysicalDeletions.AsNoTracking().AnyAsync(x => x.CompletedAt == null))
            throw new RecoveryBusyException("Complete or reconcile pending recipe physical retirement before backing up live recipe files.");

        // 1. Refresh current member values and membership, including an empty household.
        var dbMembers = await db.FamilyMembers.AsNoTracking().ToListAsync();
        await ManagementSharedHelpers.WriteJsonAsync(Path.Combine(DataRoot, "family-members.json"), dbMembers, CancellationToken.None);

        // 2. Backup Recipes (Update notes/rating or create missing)
        var historyRecipeIds = await db.WeeklyHouseholdInterests.Select(h => h.RecipeId).Distinct().ToArrayAsync();
        var recipes = await db.Recipes.IgnoreQueryFilters().AsNoTracking().Where(r => r.DeletedAt == null || historyRecipeIds.Contains(r.Id)).ToListAsync();
        int backedUpCount = 0;
        foreach (var recipe in recipes)
        {
            await using var pdfSource = await recipeStore.ReadSourcePdfAsync(recipe.Id);
            // Skip if recipe is not ready and has no payload worth persisting
            var isReady = (!string.IsNullOrEmpty(recipe.Name) && recipe.ImageCount > 0)
                       || (!string.IsNullOrEmpty(recipe.Name) && recipe.IsSynthesized);
            if (!historyRecipeIds.Contains(recipe.Id) && pdfSource is null && !isReady &&
                string.IsNullOrEmpty(recipe.RawMetadata) &&
                recipe.StructuredContent is null &&
                string.IsNullOrEmpty(recipe.Notes) &&
                recipe.Rating == RecipeRating.Unknown)
            {
                continue;
            }

            // recipe.info — update if exists, create if missing
            var existing = await recipeStore.ReadInfoAsync(recipe.Id);
            if (existing != null)
            {
                if (recipe.StructuredContent is not null)
                {
                    existing.AddedBy = recipe.AddedBy;
                    existing.CreatedAt = recipe.CreatedAt;
                    existing.ImageCount = recipe.ImageCount;
                    existing.FinishedDishImageIndex = recipe.FinishedDishIndex;
                    existing.IsReady = recipe.IsReady;
                }
                existing.RotationVersion = 1;
                if (pdfSource is not null || historyRecipeIds.Contains(recipe.Id)) existing.IsReady = recipe.IsReady;
                existing.DeletedAt = recipe.DeletedAt;
                existing.Notes = recipe.Notes;
                existing.Rating = recipe.Rating;
                existing.Description = recipe.Description;
                existing.Name = recipe.Name;
                existing.Category = recipe.Category;
                existing.IsDiscoverable = recipe.IsDiscoverable;
                existing.RotationHumanOff = recipe.RotationHumanOff;
                existing.RotationSource = recipe.RotationSource;
                existing.CookedSuppressed = recipe.CookedSuppressed;
                existing.SupperSuitable = recipe.SupperSuitable;
                existing.IsVegetarian = recipe.IsVegetarian;
                existing.TotalTime = recipe.TotalTime;
                existing.LastCookedDate = recipe.LastCookedDate;
                existing.IsSynthesized = recipe.IsSynthesized;
                existing.SourceUrl = recipe.SourceUrl;
                existing.CuisineType = recipe.CuisineType;
                existing.MealTypes = recipe.MealTypes;

                await recipeStore.WriteInfoAsync(existing);
            }
            else
            {
                var info = new RecipeInfo
                {
                    IsReady = recipe.StructuredContent is not null || pdfSource is not null || historyRecipeIds.Contains(recipe.Id) ? recipe.IsReady : null,
                    DeletedAt = recipe.DeletedAt,
                    Id = recipe.Id,
                    Notes = recipe.Notes,
                    Rating = recipe.Rating,
                    Description = recipe.Description,
                    Name = recipe.Name,
                    AddedBy = recipe.AddedBy,
                    ImageCount = recipe.ImageCount,
                    FinishedDishImageIndex = recipe.FinishedDishIndex,
                    IsSynthesized = recipe.IsSynthesized,
                    CreatedAt = recipe.CreatedAt,
                    Category = recipe.Category,
                    IsDiscoverable = recipe.IsDiscoverable,
                    RotationVersion = 1,
                    RotationHumanOff = recipe.RotationHumanOff,
                    RotationSource = recipe.RotationSource,
                    CookedSuppressed = recipe.CookedSuppressed,
                    SupperSuitable = recipe.SupperSuitable,
                    IsVegetarian = recipe.IsVegetarian,
                    TotalTime = recipe.TotalTime,
                    LastCookedDate = recipe.LastCookedDate,
                    SourceUrl = recipe.SourceUrl,
                    CuisineType = recipe.CuisineType,
                    MealTypes = recipe.MealTypes
                };

                await recipeStore.WriteInfoAsync(info);
            }

            // Refresh supported content, including cleared values, without touching media.
            await recipeStore.WriteRecipeJsonAsync(recipe.Id, ManagementSharedHelpers.SerializeRecipeBackup(recipe));

            backedUpCount++;
        }

        // 3. Backup Weekly Plans
        var weeklyPlans = await db.WeeklyPlans.AsNoTracking().ToListAsync();
        foreach (var plan in weeklyPlans)
        {
            plan.VotingRoundId = null;
            plan.LastClosedRoundId = null;
        }
        {
            var plansPath = Path.Combine(DataRoot, "weekly-plans.json");
            var plansJson = JsonSerializer.Serialize(weeklyPlans, JsonDefaults.CamelCase);
            await File.WriteAllTextAsync(plansPath, plansJson);
            logger.LogInformation("Backed up {Count} weekly plans to {Path}", weeklyPlans.Count, plansPath);
        }

        // 4. Backup Calendar Events
        var calendarEvents = await db.CalendarEvents.AsNoTracking().ToListAsync();
        {
            var eventsPath = Path.Combine(DataRoot, "calendar-events.json");
            var eventsJson = JsonSerializer.Serialize(calendarEvents, JsonDefaults.CamelCase);
            await File.WriteAllTextAsync(eventsPath, eventsJson);
            logger.LogInformation("Backed up {Count} calendar events to {Path}", calendarEvents.Count, eventsPath);
        }

        // 5. Backup Ingredient Categories
        var ingredientCategories = await db.IngredientCategories.AsNoTracking().ToListAsync();
        var categoriesPath = Path.Combine(DataRoot, "ingredient-categories.csv");
        var csvLines = new List<string>(ingredientCategories.Count + 1)
        {
            "normalized_key,grocery_section,confidence,source,created_at"
        };
        foreach (var cat in ingredientCategories)
        {
            var createdAt = cat.CreatedAt.UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ssZ");
            csvLines.Add($"{ManagementSharedHelpers.EscapeCsvField(cat.NormalizedKey)},{ManagementSharedHelpers.EscapeCsvField(cat.GrocerySection)},{cat.Confidence.ToString(CultureInfo.InvariantCulture)},{ManagementSharedHelpers.EscapeCsvField(cat.Source)},{createdAt}");
        }
        await File.WriteAllLinesAsync(categoriesPath, csvLines);
        logger.LogInformation("Backed up {Count} ingredient categories to {Path}", ingredientCategories.Count, categoriesPath);

        // 6. Backup search index sidecars (only for recipes with index_status = 'ready')
        await searchService.ExportReadySidecarsAsync();

        // 7. Backup active recipe import reports. Always overwrite the artifact,
        // including with an empty array, so resolved reports cannot be resurrected
        // from a stale backup during disaster recovery.
        var importReports = (await db.RecipeImportReports
                .AsNoTracking()
                .OrderBy(report => report.RecipeId)
                .ToListAsync())
            .Select(RecipeImportReportBackup.FromEntity)
            .ToList();
        await ManagementSharedHelpers.WriteJsonAsync(RecipeImportReportsBackupPath, importReports, CancellationToken.None);
        logger.LogInformation(
            "Backed up {Count} recipe import reports to {Path}",
            importReports.Count,
            RecipeImportReportsBackupPath);

        var groceryExtras = await db.GroceryExtraOccurrences.AsNoTracking()
            .OrderBy(extra => extra.WeekStartDate)
            .ThenBy(extra => extra.Id)
            .ToListAsync();
        await ManagementSharedHelpers.WriteJsonAsync(GroceryExtrasBackupPath, new GroceryExtraBackup(1, groceryExtras), CancellationToken.None);
        logger.LogInformation("Backed up {Count} grocery extras to {Path}", groceryExtras.Count, GroceryExtrasBackupPath);

        await exportSupperServingsAsync(CancellationToken.None);
        await exportInterestAsync(Path.Combine(DataRoot, "weekly-household-interest.json"), CancellationToken.None, true);
        if (snapshotTransaction is not null) await snapshotTransaction.CommitAsync();
        logger.LogInformation("Backed up {Count} recipes", backedUpCount);
        return new { Message = $"Updated/Created {backedUpCount} metadata files. Weekly plans and calendar events also backed up.", FilesProcessed = backedUpCount };
    }
}
