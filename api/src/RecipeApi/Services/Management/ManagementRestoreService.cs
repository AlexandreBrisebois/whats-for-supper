using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services.Management;

internal sealed class ManagementRestoreService(
    RecipeDbContext db,
    IRecipeStore recipeStore,
    DataRootResolver dataRoot,
    IClock clock,
    DemoModeOptions demoMode,
    FoodVocabularyStore? vocabulary,
    ManagementMemberRecoveryService memberRecoveryService,
    ManagementSeedService seedService,
    ManagementSearchService searchService,
    ManagementArtifactRestoreService artifactRestoreService,
    ILogger logger)
{
    private string DataRoot => dataRoot.Root;

    public async Task<SeedResult> RestoreAsync(
        Func<CancellationToken, Task> readSupperServingsAsync,
        Func<CancellationToken, Task> restoreSupperServingsAsync,
        Func<string, bool, CancellationToken, Task> restoreInterestAsync,
        Func<string, CancellationToken, Task<List<CalendarEvent>>> readCalendarEventsAsync,
        CancellationToken ct = default)
    {
        demoMode.EnsureManagementAvailable();
        var result = new SeedResult();
        FoodVocabularyAuthority? vocabularyAuthority = null;
        if (vocabulary is not null)
        {
            try { vocabularyAuthority = await vocabulary.CaptureAuthorityAsync(null, ct); }
            catch (Exception ex) { logger.LogWarning(ex, "Food vocabulary unavailable during restore; restoring without food IDs."); }
        }
        try { await readSupperServingsAsync(ct); }
        catch (Exception ex) when (ex is JsonException or InvalidDataException or IOException or UnauthorizedAccessException or FormatException)
        {
            result.Errors++;
            logger.LogWarning("Skipping invalid supper-servings backup artifact: {Reason}", ex.Message);
        }
        GroceryExtraBackup? groceryExtraBackup = null;
        try
        {
            groceryExtraBackup = await artifactRestoreService.ReadGroceryExtraBackupAsync(ct);
        }
        catch (Exception ex) when (ex is JsonException or InvalidDataException or IOException or UnauthorizedAccessException)
        {
            result.Errors++;
            logger.LogWarning("Skipping invalid grocery-extras backup artifact: {Reason}", ex.Message);
        }

        logger.LogInformation("Starting restore");

        // 1. Restore Family Members
        await memberRecoveryService.RestoreFamilyMembersAsync(result, ct);

        // 2. Scan Recipes for missing family members and restore recipes
        var batch = await seedService.LoadRecipesFromStoreAsync(vocabularyAuthority, result, ct);

        // 3. Create placeholder family members for referential integrity
        await memberRecoveryService.CreatePlaceholderMembersAsync(batch.MissingMemberIds, result, ct);

        // 4. Save Recipes
        await seedService.SaveRestoredRecipesAsync(batch, result, ct);

        // 4a. Restore active recipe import reports after their recipe and member
        // dependencies exist. Workflow rows are intentionally not backed up, so an
        // interrupted re-import returns to the actionable Reported state.
        await artifactRestoreService.RestoreRecipeImportReportsAsync(ct);

        // 4b. Restore search index sidecars
        await searchService.RestoreSidecarsAsync(batch.RecipesToRestore, ct);

        // 5. Restore Weekly Plans
        await RestoreWeeklyPlansAsync(result, ct);

        // 6. Restore Calendar Events
        await RestoreCalendarEventsAsync(result, readCalendarEventsAsync, ct);

        // 7. Forward compatibility - initialize WeeklyPlans if missing
        await InitializeMissingWeeklyPlansAsync(ct);

        // 8. Restore Ingredient Categories
        await artifactRestoreService.RestoreIngredientCategoriesAsync(ct);

        // 9. Backfill Finished Dish Indices from disk metadata
        result.FinishedDishIndicesBackfilled = await BackfillFinishedDishIndicesAsync(ct);
        await restoreInterestAsync(Path.Combine(DataRoot, "weekly-household-interest.json"), false, ct);
        if (groceryExtraBackup is not null)
        {
            try { await artifactRestoreService.MergeGroceryExtraBackupAsync(groceryExtraBackup, ct); }
            catch (InvalidDataException ex)
            {
                result.Errors++;
                logger.LogWarning("Skipping incompatible grocery-extras backup artifact: {Reason}", ex.Message);
            }
        }

        await restoreSupperServingsAsync(ct);

        logger.LogInformation(
            "Restore complete - Added: {Added}, Updated: {Updated}, Skipped: {Skipped}, WeeklyPlans: {WeeklyPlans}, CalendarEvents: {CalendarEvents}, Backfilled: {Backfilled}, Errors: {Errors}",
            result.RecipesAdded,
            result.RecipesUpdated,
            result.RecipesSkipped,
            result.WeeklyPlansRestored,
            result.CalendarEventsRestored,
            result.FinishedDishIndicesBackfilled,
            result.Errors);
        return result;
    }

    private async Task RestoreWeeklyPlansAsync(SeedResult result, CancellationToken ct)
    {
        var plansPath = Path.Combine(DataRoot, "weekly-plans.json");
        if (!File.Exists(plansPath)) return;

        var plansJson = await File.ReadAllTextAsync(plansPath, ct);
        var plans = JsonSerializer.Deserialize<List<WeeklyPlan>>(plansJson, JsonDefaults.CamelCase) ?? [];
        foreach (var plan in plans)
        {
            if (ct.IsCancellationRequested) break;
            if (plan.CreatedAt == default) plan.CreatedAt = clock.UtcNow;
            var existing = await db.WeeklyPlans.FindAsync(new object[] { plan.Id }, ct);
            if (existing == null) db.WeeklyPlans.Add(plan);
            else db.Entry(existing).CurrentValues.SetValues(plan);
            result.WeeklyPlansRestored++;
        }
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Restored {Count} weekly plans.", result.WeeklyPlansRestored);
    }

    private async Task RestoreCalendarEventsAsync(
        SeedResult result,
        Func<string, CancellationToken, Task<List<CalendarEvent>>> readCalendarEventsAsync,
        CancellationToken ct)
    {
        var eventsPath = Path.Combine(DataRoot, "calendar-events.json");
        if (File.Exists(eventsPath))
        {
            List<CalendarEvent> events;
            try { events = await readCalendarEventsAsync(eventsPath, ct); }
            catch (Exception ex) when (ex is JsonException or InvalidDataException or FormatException)
            {
                result.Errors++;
                logger.LogWarning("Skipping invalid calendar preparation artifact: {Reason}", ex.Message);
                events = [];
            }
            foreach (var @event in events)
            {
                if (ct.IsCancellationRequested) break;
                if (@event.RecipeId == null)
                {
                    var existingOrderedIn = await db.CalendarEvents.FindAsync(new object[] { @event.Id }, ct);
                    if (existingOrderedIn == null) db.CalendarEvents.Add(@event);
                    else db.Entry(existingOrderedIn).CurrentValues.SetValues(@event);
                    result.CalendarEventsRestored++;
                    continue;
                }

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
    }

    private async Task InitializeMissingWeeklyPlansAsync(CancellationToken ct)
    {
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
                    CreatedAt = clock.UtcNow
                });
                initializedPlans++;
            }
        }
        if (initializedPlans > 0)
        {
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Initialized {Count} missing weekly plans for forward compatibility.", initializedPlans);
        }
    }

    private async Task<int> BackfillFinishedDishIndicesAsync(CancellationToken ct)
    {
        try
        {
            // Canonical metadata was already staged with its recipe. This legacy
            // repair must not reapply old disk choices after a guarded seed defers.
            var recipes = await db.Recipes.IgnoreQueryFilters().Where(x => x.StructuredContent == null).ToListAsync(ct);
            int updated = 0;
            foreach (var recipe in recipes)
            {
                if (ct.IsCancellationRequested) break;
                var info = await recipeStore.ReadInfoAsync(recipe.Id, ct);
                if (info != null && info.FinishedDishImageIndex >= 0)
                {
                    recipe.FinishedDishIndex = info.FinishedDishImageIndex;
                    updated++;
                }
            }
            if (updated > 0)
            {
                await db.SaveChangesAsync(ct);
            }
            logger.LogInformation("Successfully backfilled finished_dish_index for {Count} recipes.", updated);
            return updated;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Finished dish backfill failed.");
            return 0;
        }
    }

    private static DateOnly GetMonday(DateOnly date)
    {
        var daysToMonday = ((int)date.DayOfWeek - 1 + 7) % 7;
        return date.AddDays(-daysToMonday);
    }
}
