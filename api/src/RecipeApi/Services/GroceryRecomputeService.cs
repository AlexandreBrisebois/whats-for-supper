using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Utils;

namespace RecipeApi.Services;

/// <summary>
/// Recomputes the pre-aggregated grocery list stored in <c>weekly_plans.grocery_items</c>
/// whenever the recipe assignments for a week change.
/// </summary>
public class GroceryRecomputeService(
    RecipeDbContext db,
    AisleMapper aisleMapper,
    ILogger<GroceryRecomputeService> logger)
{
    // Maps GrocerySection enum values to the display strings used in GroceryLineItemDto.
    private static readonly Dictionary<GrocerySection, string> SectionDisplayNames = new()
    {
        [GrocerySection.Produce] = "Produce",
        [GrocerySection.Meat] = "Meat",
        [GrocerySection.Seafood] = "Seafood",
        [GrocerySection.DairyAndEggs] = "Dairy & Eggs",
        [GrocerySection.Frozen] = "Frozen",
        [GrocerySection.Bakery] = "Bakery",
        [GrocerySection.Pantry] = "Pantry",
        [GrocerySection.Beverages] = "Beverages",
        [GrocerySection.Deli] = "Deli",
        [GrocerySection.Grocery] = "Grocery",
    };

    /// <summary>
    /// Recomputes <c>grocery_items</c> for the week starting on <paramref name="monday"/>.
    /// Creates the <c>weekly_plans</c> row if it does not yet exist.
    /// </summary>
    public async Task RecomputeForWeekAsync(DateOnly monday, CancellationToken ct)
    {
        var sunday = monday.AddDays(6);

        // 1. Load all CalendarEvents for the week, including Recipe.RawMetadata.
        var events = await db.CalendarEvents
            .Include(e => e.Recipe)
            .Where(e => e.Date >= monday && e.Date <= sunday && e.RecipeId != Guid.Empty)
            .ToListAsync(ct);

        // 2. Extract supply[] from each recipe's raw_metadata.
        var supplyEntries = new List<(string DisplayName, double? Quantity, string? UnitText, Guid RecipeId)>();

        foreach (var evt in events)
        {
            var recipe = evt.Recipe;
            if (recipe?.RawMetadata == null)
            {
                logger.LogDebug(
                    "Recipe {RecipeId} on {Date} has null raw_metadata — skipping supply extraction",
                    evt.RecipeId, evt.Date);
                continue;
            }

            var supplies = ExtractSupplies(recipe.RawMetadata, recipe.Id);
            supplyEntries.AddRange(supplies);
        }

        if (supplyEntries.Count == 0)
        {
            logger.LogDebug("No supply entries found for week starting {Monday} — writing empty grocery_items", monday);
        }

        // 3. Normalize names and look up sections.
        // Collect all distinct normalized keys so we can batch-query ingredient_categories.
        var normalizedKeys = supplyEntries
            .Select(s => IngredientNormalizer.Normalize(s.DisplayName))
            .Where(k => !string.IsNullOrEmpty(k))
            .Distinct()
            .ToList();

        Dictionary<string, string> categoryMap = new(StringComparer.Ordinal);
        if (normalizedKeys.Count > 0)
        {
            var dbCategories = await db.IngredientCategories
                .Where(ic => normalizedKeys.Contains(ic.NormalizedKey))
                .ToListAsync(ct);

            foreach (var cat in dbCategories)
                categoryMap[cat.NormalizedKey] = cat.GrocerySection;
        }

        // 4. Build intermediate items with section resolved.
        var intermediate = new List<(string DisplayName, string NormalizedKey, string Section, double? Quantity, string? UnitText, Guid RecipeId)>();

        foreach (var (displayName, quantity, unitText, recipeId) in supplyEntries)
        {
            var normalizedKey = IngredientNormalizer.Normalize(displayName);
            if (string.IsNullOrEmpty(normalizedKey))
                continue;

            string section;
            if (categoryMap.TryGetValue(normalizedKey, out var dbSection))
            {
                section = dbSection;
            }
            else
            {
                // Fallback to AisleMapper keyword matching.
                var grocerySection = aisleMapper.MapToSection(normalizedKey);
                section = SectionDisplayNames[grocerySection];
            }

            intermediate.Add((displayName, normalizedKey, section, quantity, unitText, recipeId));
        }

        // 5. Group by (normalizedKey, unitText): sum quantities for same-unit pairs,
        //    keep separate entries for different units.
        var grouped = intermediate
            .GroupBy(item => (item.NormalizedKey, item.UnitText))
            .Select(g =>
            {
                var first = g.First();

                // Sum quantities; if any entry has a null quantity, the aggregate is null.
                double? totalQuantity = null;
                bool hasAnyQuantity = g.Any(x => x.Quantity.HasValue);
                if (hasAnyQuantity)
                {
                    totalQuantity = g.Where(x => x.Quantity.HasValue).Sum(x => x.Quantity!.Value);
                }

                var recipeIds = g.Select(x => x.RecipeId).Distinct().ToList();

                return new GroceryLineItemDto(
                    DisplayName: first.DisplayName,
                    NormalizedKey: first.NormalizedKey,
                    Section: first.Section,
                    Quantity: totalQuantity,
                    UnitText: first.UnitText,
                    RecipeIds: recipeIds);
            })
            .ToList();

        // 6. Serialize and persist to weekly_plans.grocery_items.
        var groceryItemsJson = JsonSerializer.Serialize(grouped, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });

        var plan = await db.WeeklyPlans.FirstOrDefaultAsync(p => p.WeekStartDate == monday, ct);
        if (plan == null)
        {
            plan = new WeeklyPlan
            {
                Id = Guid.NewGuid(),
                WeekStartDate = monday,
                Status = WeeklyPlanStatus.Draft,
            };
            db.WeeklyPlans.Add(plan);
            logger.LogInformation("Created WeeklyPlan for week starting {Monday} during grocery recompute", monday);
        }

        plan.GroceryItems = groceryItemsJson;
        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "Recomputed grocery_items for week starting {Monday}: {Count} line items",
            monday, grouped.Count);
    }

    /// <summary>
    /// Finds all weeks that contain <paramref name="recipeId"/> and recomputes
    /// <c>grocery_items</c> for each affected week.
    /// </summary>
    public async Task RecomputeForRecipeAsync(Guid recipeId, CancellationToken ct)
    {
        var affectedDates = await db.CalendarEvents
            .Where(e => e.RecipeId == recipeId)
            .Select(e => e.Date)
            .ToListAsync(ct);

        if (affectedDates.Count == 0)
        {
            logger.LogDebug("Recipe {RecipeId} is not assigned to any calendar events — no recompute needed", recipeId);
            return;
        }

        // Collect distinct Mondays for each affected date.
        var mondays = affectedDates
            .Select(date => GetMonday(date))
            .Distinct()
            .ToList();

        logger.LogInformation(
            "Recipe {RecipeId} affects {WeekCount} week(s) — recomputing grocery_items",
            recipeId, mondays.Count);

        foreach (var monday in mondays)
        {
            await RecomputeForWeekAsync(monday, ct);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Extracts supply entries from a recipe's <c>raw_metadata</c> JSON string.
    /// Returns an empty list if <c>raw_metadata</c> is null, malformed, or has no <c>supply</c> array.
    /// </summary>
    private List<(string DisplayName, double? Quantity, string? UnitText, Guid RecipeId)> ExtractSupplies(
        string rawMetadata, Guid recipeId)
    {
        var results = new List<(string, double?, string?, Guid)>();

        JsonNode? root;
        try
        {
            root = JsonNode.Parse(rawMetadata);
        }
        catch (JsonException ex)
        {
            logger.LogDebug(ex, "Failed to parse raw_metadata for recipe {RecipeId}", recipeId);
            return results;
        }

        var supplyArray = root?["supply"]?.AsArray();
        if (supplyArray == null || supplyArray.Count == 0)
        {
            logger.LogDebug("Recipe {RecipeId} raw_metadata has no supply[] — skipping", recipeId);
            return results;
        }

        foreach (var item in supplyArray)
        {
            if (item == null) continue;

            var name = item["name"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(name))
                continue;

            double? quantity = null;
            var quantityNode = item["quantity"];
            if (quantityNode != null)
            {
                try
                {
                    quantity = quantityNode.GetValue<double>();
                }
                catch
                {
                    // quantity is not parseable as a number — set to null, still include the item.
                    logger.LogDebug(
                        "Recipe {RecipeId}: supply item '{Name}' has non-numeric quantity — setting to null",
                        recipeId, name);
                }
            }

            var unitText = item["unitText"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(unitText))
                unitText = null;

            results.Add((name, quantity, unitText, recipeId));
        }

        return results;
    }

    /// <summary>Returns the Monday of the week containing <paramref name="date"/>.</summary>
    private static DateOnly GetMonday(DateOnly date)
    {
        // DayOfWeek: Sunday=0, Monday=1, ..., Saturday=6
        var daysFromMonday = ((int)date.DayOfWeek - 1 + 7) % 7;
        return date.AddDays(-daysFromMonday);
    }
}
