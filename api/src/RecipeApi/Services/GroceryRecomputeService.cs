using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Utils;

namespace RecipeApi.Services;

/// <summary>
/// Recomputes the pre-aggregated grocery list stored in <c>weekly_plans.grocery_items</c>
/// whenever the recipe assignments for a week change.
/// </summary>
public partial class GroceryRecomputeService(
    RecipeDbContext db,
    AisleMapper aisleMapper,
    ILogger<GroceryRecomputeService> logger,
    IClock clock,
    DeploymentCalendar calendar,
    GroceryCheckCoordinator groceryChecks,
    IScheduleEventPublisher? publisher = null,
    FoodVocabularyStore? vocabulary = null)
{
    private sealed record IntermediateItem(
        string DisplayName,
        string NormalizedKey,
        string LegacyNormalizedKey,
        string Section,
        int CategoryMatchPriority,
        string? CategorySource,
        double? Quantity,
        string? UnitText,
        Guid RecipeId,
        bool QuantityComplete,
        GroceryQuantity? ExactQuantity,
        string Member,
        string InputFingerprint,
        GroceryContributor? Contributor,
        RecipePackageDto? Package,
        Guid? FoodId);

    private sealed record RecomputedGroup(
        GroceryLineItemDto Line,
        IReadOnlySet<string> LegacyNormalizedKeys,
        string BucketUnit,
        RecipePackageDto? Package,
        GroceryDemandEvidence Evidence);

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
    public Task RecomputeForWeekAsync(DateOnly monday, CancellationToken ct, DeploymentCalendarContext? context = null, bool presentationChanged = false)
    {
        context ??= calendar.Capture(clock.UtcNow);
        return groceryChecks.ProcessWeekAsync(monday, async fresh =>
        {
            var (plan, groceryState, changedState) = await RecomputeOwnedAsync(fresh, monday, ct);
            GroceryCheckCoordinator.SynchronizeTrackedPlan(db, monday, plan.GroceryState, plan.GroceryItems, plan.GroceryListVersion, plan);
            return (plan, groceryState, changedState);
        }, ct, async result =>
        {
            if ((result.changedState || presentationChanged) && publisher is not null)
                await publisher.PublishGroceryRowsUpdatedAsync(GetWeekOffset(monday, context), GroceryRowState.Snapshot(result.plan, clock.UtcNow));
        });
    }

    private async Task<(WeeklyPlan Plan, Dictionary<string, bool> Checks, bool Changed)> RecomputeOwnedAsync(
        RecipeDbContext db, DateOnly monday, CancellationToken ct, bool migrationReset = false, DateOnly? evaluationDate = null)
    {
        var inputs = await SupperProjectionInputs.ReadWeekAsync(db, monday, evaluationDate ?? calendar.Capture(clock.UtcNow).Today, ct);
        // A saved UUID is usable only with its exact retained mapping authority.
        // Validate before any grocery row/check/baseline write; never rematch aliases.
        var savedRecipes = inputs.Select(input => input.Event.Recipe!).DistinctBy(recipe => recipe.Id).ToArray();
        var presentation = vocabulary is null ? null : await vocabulary.CapturePresentationAsync(savedRecipes.Select(recipe => recipe.FoodMappingEvidence), ct);
        foreach (var recipe in savedRecipes)
        {
            if (CanonicalRecipeContentStore.Read(recipe) is not { } content) continue;
            var hasMapping = content.IngredientLines.Any(line => line.Shopping.FoodId is not null);
            var authority = hasMapping
                ? presentation?.Authority ?? throw new InvalidDataException("Mapped groceries require retained vocabulary authority.")
                : new FoodVocabularyAuthority(null, []);
            FoodMappingQualification.Validate(content, recipe.FoodMappingEvidence, authority, recipe.Id);
        }
        var supplyEntries = new List<(string DisplayName, double? Quantity, string? UnitText, Guid RecipeId, bool QuantityComplete, GroceryQuantity? ExactQuantity, string Member, string InputFingerprint, GroceryContributor? Contributor, RecipePackageDto? Package, Guid? FoodId)>();
        foreach (var input in inputs)
        {
            var supplies = input.Lines.Select(line => (DisplayName: line.Name, line.Quantity, line.UnitText, RecipeId: input.Event.RecipeId!.Value,
                // Canonical null is an independently unknown amount, including
                // when it shares a bucket with a measured contribution. Legacy
                // qualitative classification retains its existing compatibility.
                QuantityComplete: line.GroceryObservation.Quantity is not null || line.Status == "unquantified" && line.SavedIngredientLineId is null,
                ExactQuantity: line.GroceryObservation.Quantity,
                Member: $"{input.Event.Id:D}:{input.Event.RecipeId:D}:{IngredientNormalizer.Normalize(line.Name)}",
                InputFingerprint: GroceryDemandEvidence.Fingerprint(new
                {
                    input.Event.Id,
                    input.Event.RecipeId,
                    input.Basis,
                    input.Target,
                    line.OriginalText,
                    line.Name,
                    line.UnitText,
                    line.GroceryRecordedNumberToken
                }),
                Contributor: line.SavedIngredientLineId is { } lineId && line.GroceryPurchaseIdentity is { } purchase
                    ? new GroceryContributor(input.Event.Id, input.Event.RecipeId!.Value, lineId, purchase) : null,
                Package: line.GroceryPackage,
                FoodId: line.GroceryFoodId));
            supplyEntries.AddRange(supplies
                .OrderBy(s => s.DisplayName, StringComparer.Ordinal)
                .ThenBy(s => s.UnitText, StringComparer.Ordinal)
                .ThenBy(s => s.Quantity)
                .ThenBy(s => s.RecipeId));
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
            .Distinct(StringComparer.Ordinal)
            .OrderBy(k => k, StringComparer.Ordinal)
            .ToList();
        var legacyNormalizedKeys = supplyEntries
            .Select(s => LegacyNormalize(s.DisplayName))
            .Where(k => !string.IsNullOrEmpty(k))
            .Distinct(StringComparer.Ordinal)
            .OrderBy(k => k, StringComparer.Ordinal)
            .ToList();
        var categoryLookupKeys = normalizedKeys
            .Concat(legacyNormalizedKeys)
            .Distinct(StringComparer.Ordinal)
            .ToList();

        Dictionary<string, IngredientCategory> categoryMap = new(StringComparer.Ordinal);
        if (categoryLookupKeys.Count > 0)
        {
            var dbCategories = await db.IngredientCategories
                .Where(ic => categoryLookupKeys.Contains(ic.NormalizedKey))
                .OrderBy(ic => ic.NormalizedKey)
                .ToListAsync(ct);

            foreach (var cat in dbCategories)
                categoryMap[cat.NormalizedKey] = cat;
        }

        // 4. Build intermediate items with section resolved.
        var intermediate = new List<IntermediateItem>();

        foreach (var (displayName, quantity, unitText, recipeId, quantityComplete, exactQuantity, member, inputFingerprint, contributor, package, foodId) in supplyEntries)
        {
            var normalizedKey = IngredientNormalizer.Normalize(displayName);
            if (string.IsNullOrEmpty(normalizedKey))
                continue;
            var legacyNormalizedKey = LegacyNormalize(displayName);

            string section;
            var categoryMatchPriority = 0;
            string? categorySource = null;
            if (categoryMap.TryGetValue(normalizedKey, out var dbSection))
            {
                section = dbSection.GrocerySection;
                categorySource = dbSection.Source;
                categoryMatchPriority = 2;
            }
            else if (categoryMap.TryGetValue(legacyNormalizedKey, out var legacyDbSection))
            {
                section = legacyDbSection.GrocerySection;
                categorySource = legacyDbSection.Source;
                categoryMatchPriority = 1;
            }
            else
            {
                // Fallback to AisleMapper keyword matching.
                var grocerySection = aisleMapper.MapToSection(normalizedKey);
                section = SectionDisplayNames[grocerySection];
            }

            intermediate.Add(new IntermediateItem(displayName, normalizedKey, legacyNormalizedKey, section, categoryMatchPriority, categorySource, quantity, unitText, recipeId, quantityComplete, exactQuantity, member, inputFingerprint, contributor, package, foodId));
        }

        // 5. Group compatible counts by name/unit and exact declared purchase.
        // Package capacity/count label/basis remain fixed, never a conversion.
        //    Entries with unknown units stay in their own bucket keyed by the raw unitText.
        var grouped = intermediate
            .OrderBy(item => item.NormalizedKey, StringComparer.Ordinal)
            .ThenBy(item => GroceryUnit.Read(item.UnitText).Bucket, StringComparer.Ordinal)
            .ThenBy(item => item.DisplayName, StringComparer.Ordinal)
            .ThenBy(item => item.Section, StringComparer.Ordinal)
            .ThenBy(item => item.UnitText, StringComparer.Ordinal)
            .ThenBy(item => item.Quantity)
            .ThenBy(item => item.RecipeId)
            .GroupBy(item =>
            {
                var bucketUnit = GroceryUnit.Read(item.UnitText).Bucket;
                return (Identity: item.FoodId is { } food ? "food:" + food.ToString("D") : "fallback:" + item.NormalizedKey, BucketUnit: bucketUnit, PackageKey: DeclaredPackagePresentation.Key(item.Package));
            })
            .Select(g =>
            {
                var first = g.First();
                var section = g
                    .Where(item => item.CategoryMatchPriority > 0)
                    .OrderByDescending(item => item.CategoryMatchPriority)
                    .ThenBy(item => item.LegacyNormalizedKey, StringComparer.Ordinal)
                    .ThenBy(item => item.Section, StringComparer.Ordinal)
                    .Select(item => item.Section)
                    .FirstOrDefault() ?? first.Section;

                if (first.FoodId is not null)
                {
                    var manual = g.SelectMany(item => CategoryKeys(item.DisplayName)).Distinct(StringComparer.Ordinal)
                        .Select(key => categoryMap.GetValueOrDefault(key)).Where(category => category?.Source == "manual")
                        .Select(category => category!.GrocerySection).Distinct(StringComparer.Ordinal).ToArray();
                    if (manual.Length > 0) section = manual.Length == 1 ? manual[0] : "Grocery";
                    var correction = presentation?.Overrides.SingleOrDefault(row => row.FoodId == first.FoodId);
                    if (correction?.ProtectedFields.Contains("grocerySection") == true) section = correction.GrocerySection ?? "Grocery";
                }
                var unit = GroceryUnit.Read(first.UnitText);

                // Invalid conversions and overflow remain unresolved, never JSON numbers.
                GroceryQuantity? exactTotal = null;
                var bounded = true;
                foreach (var item in g.Where(item => item.ExactQuantity is not null))
                {
                    var definition = GroceryUnit.Read(item.UnitText);
                    var converted = LegacyGroceryQuantity.Scale(item.ExactQuantity, definition.Numerator, definition.Denominator);
                    if (converted is null) { bounded = false; break; }
                    exactTotal = LegacyGroceryQuantity.Add(exactTotal, converted);
                    if (exactTotal is null) { bounded = false; break; }
                }
                if (!bounded) exactTotal = null;
                double? totalQuantity = exactTotal?.Value is { } scalar
                    ? double.Parse(scalar.N, CultureInfo.InvariantCulture) / double.Parse(scalar.D, CultureInfo.InvariantCulture) : null;
                var quantityComplete = g.All(item => item.QuantityComplete) && bounded;

                // Emit canonical unit for known families; raw unit for unknowns.
                var emittedUnit = unit.Text;

                var recipeIds = g.Select(x => x.RecipeId).Distinct().OrderBy(id => id).ToList();

                return new RecomputedGroup(
                    new GroceryLineItemDto(
                        DisplayName: DeclaredPackagePresentation.Append(first.NormalizedKey, first.Package),
                        NormalizedKey: first.NormalizedKey,
                        Section: section,
                        Quantity: totalQuantity,
                        UnitText: emittedUnit,
                        RecipeIds: recipeIds,
                        QuantityComplete: quantityComplete)
                    { ExactQuantity = exactTotal, FoodId = first.FoodId },
                    g.Select(item => item.LegacyNormalizedKey).ToHashSet(StringComparer.Ordinal),
                    g.Key.BucketUnit,
                    first.Package,
                    new GroceryDemandEvidence(GroceryDemandEvidence.Fingerprint(g.Select(item => item.InputFingerprint).Order(StringComparer.Ordinal)),
                        g.Select(item => item.Member).Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray(),
                        g.All(item => item.Contributor is not null)
                            ? g.Select(item => item.Contributor!).OrderBy(x => x.OccurrenceId).ThenBy(x => x.RecipeId).ThenBy(x => x.IngredientLineId).ToArray() : null));
            })
            .OrderBy(group => group.Line.NormalizedKey, StringComparer.Ordinal)
            .ThenBy(group => group.BucketUnit, StringComparer.Ordinal)
            .ThenBy(group => DeclaredPackagePresentation.Key(group.Package), StringComparer.Ordinal)
            .ThenBy(group => group.Line.DisplayName, StringComparer.Ordinal)
            .ToList();

        // 6. Persist demand and retained acknowledgements at the same coordinated position.
        var plan = await db.WeeklyPlans.FirstOrDefaultAsync(p => p.WeekStartDate == monday, ct);
        var initialized = plan is null;
        if (plan == null)
        {
            plan = new WeeklyPlan
            {
                CreatedAt = clock.UtcNow,
                Id = Guid.NewGuid(),
                WeekStartDate = monday,
                Status = WeeklyPlanStatus.Draft,
            };
            db.WeeklyPlans.Add(plan);
            logger.LogInformation("Created WeeklyPlan for week starting {Monday} during grocery recompute", monday);
        }

        plan.ServingInputVersion = SupperProjectionInputs.WeekVersion(inputs);
        var previousItems = GroceryRowState.Rows(plan);
        if (migrationReset)
        {
            try { GroceryRowState.RequireCurrent(plan, previousItems); }
            catch (GroceryMutationConflictException) { previousItems = []; }
        }
        else GroceryRowState.RequireCurrent(plan, previousItems);
        var priorChecks = migrationReset ? new Dictionary<string, bool>(StringComparer.Ordinal) : GroceryRowState.Checks(plan);
        var baselines = migrationReset ? GroceryCheckedDemand.Read(new WeeklyPlan(), logger) : GroceryCheckedDemand.Read(plan, logger);
        var previousEvidence = GroceryDemandEvidence.Read(plan, logger);
        var nextEvidence = new Dictionary<string, GroceryDemandEvidence>(StringComparer.Ordinal);
        // Keep the exact pre-package JSON bytes when no package is declared.
        // A serialized null member would change existing acknowledgement identity.
        var identities = grouped.Select(group => group.Line.FoodId is { } foodId
            ? group.Package is null
                ? JsonSerializer.Serialize(new { foodId, bucket = group.BucketUnit })
                : JsonSerializer.Serialize(new { foodId, bucket = group.BucketUnit, package = group.Package })
            : group.Package is null
            ? JsonSerializer.Serialize(new { fallback = group.Line.NormalizedKey, bucket = group.BucketUnit })
            : JsonSerializer.Serialize(new { fallback = group.Line.NormalizedKey, bucket = group.BucketUnit, package = group.Package })).ToArray();
        // Exact identity continues unless observed membership demonstrates a split
        // or merge. Legacy Members remain negative-only. A cross-bucket continuation
        // additionally needs exact saved contributor/purchase proof with unique edges.
        var edges = grouped.Select((group, index) => previousItems.Where(row =>
            row.DemandIdentity == identities[index] ||
            (row.NormalizedKey == group.Line.NormalizedKey
                && (!identities.Contains(row.DemandIdentity, StringComparer.Ordinal) || !previousItems.Any(prior => prior.DemandIdentity == identities[index]))
                && previousEvidence.TryGetValue(row.RowId, out var evidence)
                && evidence.Members.Intersect(group.Evidence.Members, StringComparer.Ordinal).Any()
                // Same-name package lines can share a legacy Member while their
                // saved occurrence/recipe/line contributors prove they are disjoint.
                && !(evidence.HasLineage && group.Evidence.HasLineage
                    && !evidence.SharesSavedContributor(group.Evidence)
                    && IsKnownPackageTransition(row.DemandIdentity, group.Package)))
            || previousEvidence.TryGetValue(row.RowId, out var lineage) && lineage.SharesSavedContributor(group.Evidence)).ToArray()).ToArray();
        var nextBaselines = new Dictionary<string, GroceryCheckedDemand?>(StringComparer.Ordinal);
        var reset = false;
        var groceryState = new Dictionary<string, bool>(StringComparer.Ordinal);
        for (var index = 0; index < grouped.Count; index++)
        {
            var group = grouped[index];
            var identity = identities[index];
            var candidate = edges[index].Length == 1 ? edges[index][0] : null;
            var priorEvidence = candidate is not null ? previousEvidence.GetValueOrDefault(candidate.RowId) : null;
            var previous = candidate is not null && edges.Count(matches => matches.Contains(candidate)) == 1
                && priorEvidence?.ChangesPurchaseMeaning(group.Evidence) != true
                && (candidate.DemandIdentity == identity || priorEvidence?.SameLineage(group.Evidence) == true) ? candidate : null;
            var rowId = previous?.RowId ?? Guid.NewGuid().ToString("D");
            nextEvidence[rowId] = group.Evidence;
            var comparisonChanged = previous is not null && (previous.ExactQuantity != group.Line.ExactQuantity || previous.QuantityComplete != group.Line.QuantityComplete
                || previous.DemandIdentity != identity || previous.UnitText != group.Line.UnitText);
            grouped[index] = group with
            {
                Line = group.Line with
                {
                    RowId = rowId,
                    RowVersion = previous is null ? "1" : comparisonChanged ? GroceryRowState.Next(previous.RowVersion) : previous.RowVersion,
                    WeekStartDate = monday,
                    DemandIdentity = identity,
                }
            };
            var isChecked = previous is not null && priorChecks.GetValueOrDefault(rowId!);
            if (isChecked)
            {
                var baseline = baselines.GetValueOrDefault(rowId!);
                if (baseline is null || !baseline.IsValid)
                    logger.LogWarning("Missing or invalid checked-demand baseline for grocery row {RowId}", rowId);
                if (baseline?.ProvesIncrease(grouped[index].Line, previous!.RowVersion, group.Evidence.InputFingerprint) == true)
                {
                    isChecked = false;
                    reset = true;
                    if (!comparisonChanged)
                        grouped[index] = grouped[index] with { Line = grouped[index].Line with { RowVersion = GroceryRowState.Next(previous!.RowVersion) } };
                }
                else nextBaselines[rowId!] = baseline;
            }
            groceryState[rowId!] = isChecked;
        }
        var nextItems = JsonSerializer.Serialize(grouped.Select(group => group.Line));
        var nextChecks = JsonSerializer.Serialize(groceryState);
        using var previousRowsJson = JsonDocument.Parse(plan.GroceryItems);
        using var nextRowsJson = JsonDocument.Parse(nextItems);
        using var previousChecksJson = JsonDocument.Parse(plan.GroceryState);
        using var nextChecksJson = JsonDocument.Parse(nextChecks);
        // PostgreSQL jsonb reorders object properties. Storage spelling is not a demand change.
        var changedState = !JsonElement.DeepEquals(previousRowsJson.RootElement, nextRowsJson.RootElement)
            || !JsonElement.DeepEquals(previousChecksJson.RootElement, nextChecksJson.RootElement);
        if (changedState && !initialized) plan.GroceryListVersion = GroceryRowState.Next(plan.GroceryListVersion);
        if (reset) plan.GroceryResetSummaryVersion = Guid.NewGuid().ToString("N");
        else if (changedState) plan.GroceryResetSummaryVersion = null;
        plan.GroceryCheckedDemandBaselines = JsonSerializer.Serialize(nextBaselines);
        plan.GroceryDemandEvidence = JsonSerializer.Serialize(nextEvidence);
        plan.ServingAppliedVersion = plan.ServingInputVersion;
        plan.ServingRefreshStatus = "current";
        plan.GroceryItems = nextItems;
        plan.GroceryState = nextChecks;
        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "Recomputed grocery_items for week starting {Monday}: {Count} line items",
            monday, grouped.Count);
        return (plan, groceryState, changedState);
    }

    /// <summary>
    /// Finds all weeks whose pre-computed grocery list contains <paramref name="normalizedKey"/>
    /// and recomputes each affected week.
    /// Called after a human reclassification to propagate the corrected section.
    /// </summary>
    public virtual async Task RecomputeForIngredientAsync(string normalizedKey, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(normalizedKey))
        {
            logger.LogDebug("Skipping ingredient recompute because normalizedKey is empty");
            return;
        }

        List<DateOnly> affectedMondays;

        // EF InMemory provider does not support JsonContains. Use string contains fallback in tests.
        if ((db.Database.ProviderName?.Contains("InMemory", StringComparison.OrdinalIgnoreCase)).GetValueOrDefault())
        {
            affectedMondays = await db.WeeklyPlans
                .Where(p => p.GroceryItems != null && p.GroceryItems.Contains(normalizedKey))
                .Select(p => p.WeekStartDate)
                .Distinct()
                .ToListAsync(ct);
        }
        else
        {
            var containsPayload = JsonSerializer.Serialize(new[] { new { normalizedKey } });
            affectedMondays = await db.WeeklyPlans
                .Where(p => p.GroceryItems != null && EF.Functions.JsonContains(p.GroceryItems, containsPayload))
                .Select(p => p.WeekStartDate)
                .Distinct()
                .ToListAsync(ct);
        }

        if (affectedMondays.Count == 0)
        {
            logger.LogDebug(
                "Ingredient '{Key}' is not in any weekly grocery list - no recompute needed",
                normalizedKey);
            return;
        }

        logger.LogInformation(
            "Reclassifying ingredient '{Key}' - recomputing {Count} affected week(s)",
            normalizedKey, affectedMondays.Count);

        foreach (var monday in affectedMondays)
        {
            await RecomputeForWeekAsync(monday, ct);
        }
    }

    public async Task RecomputeForFoodAsync(Guid foodId, CancellationToken ct)
    {
        var recipes = await db.Recipes.AsNoTracking().Where(recipe => recipe.CanonicalContent != null).ToArrayAsync(ct);
        var ids = recipes.Where(recipe => CanonicalRecipeContentStore.Read(recipe)!.IngredientLines.Any(line => line.Shopping.FoodId == foodId))
            .Select(recipe => recipe.Id).ToArray();
        var dates = await db.CalendarEvents.AsNoTracking().Where(occurrence => occurrence.RecipeId != null && ids.Contains(occurrence.RecipeId.Value))
            .Select(occurrence => occurrence.Date).ToArrayAsync(ct);
        var plans = await db.WeeklyPlans.AsNoTracking().ToArrayAsync(ct);
        var weeks = dates.Select(DeploymentCalendar.Monday)
            .Concat(plans.Where(plan => GroceryRowState.Rows(plan).Any(row => row.FoodId == foodId)).Select(plan => plan.WeekStartDate))
            .Distinct().Order().ToArray();
        foreach (var week in weeks) await RecomputeForWeekAsync(week, ct, presentationChanged: true);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>Returns the Monday of the week containing <paramref name="date"/>.</summary>
    private static DateOnly GetMonday(DateOnly date)
    {
        // DayOfWeek: Sunday=0, Monday=1, ..., Saturday=6
        var daysFromMonday = ((int)date.DayOfWeek - 1 + 7) % 7;
        return date.AddDays(-daysFromMonday);
    }

    internal static string[] CategoryKeys(string name) => new[] { IngredientNormalizer.Normalize(name), LegacyNormalize(name) }
        .Where(key => !string.IsNullOrWhiteSpace(key)).Distinct(StringComparer.Ordinal).ToArray();

    private static string LegacyNormalize(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return string.Empty;

        var decomposed = raw.Normalize(NormalizationForm.FormD);
        var stripped = new StringBuilder(decomposed.Length);
        foreach (var character in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                stripped.Append(character);
        }

        return string.Join(' ', stripped.ToString().ToLowerInvariant().Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
    }

    private static List<GroceryLineItemDto> DeserializeGroceryItems(string? json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<GroceryLineItemDto>>(json ?? "[]") ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static Dictionary<string, bool> DeserializeGroceryState(string? json)
    {
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, bool>>(json ?? "{}") ?? new(StringComparer.Ordinal);
        }
        catch (JsonException)
        {
            return new(StringComparer.Ordinal);
        }
    }

    private static bool ApplyMergedStateTransitions(
        IReadOnlyList<GroceryLineItemDto> previousItems,
        IReadOnlyList<RecomputedGroup> recomputedGroups,
        Dictionary<string, bool> groceryState)
    {
        var changed = false;
        foreach (var group in recomputedGroups)
        {
            var predecessors = previousItems
                .Where(item => group.LegacyNormalizedKeys.Contains(item.NormalizedKey)
                    && (UnitNormalizer.Normalize(item.UnitText)?.CanonicalUnit ?? item.UnitText ?? string.Empty) == group.BucketUnit)
                .OrderBy(item => item.DisplayName, StringComparer.Ordinal)
                .ToList();
            if (predecessors.Count == 0)
                continue;

            var isNewMerge = predecessors.Count > 1;
            var isDisplayNameRename = predecessors.Count == 1
                && !string.Equals(predecessors[0].DisplayName, group.Line.DisplayName, StringComparison.Ordinal);
            if (!isNewMerge && !isDisplayNameRename)
                continue;

            var isChecked = isNewMerge
                ? predecessors.All(item => groceryState.TryGetValue(item.DisplayName, out var checked_) && checked_)
                : groceryState.TryGetValue(predecessors[0].DisplayName, out var priorChecked) && priorChecked;
            foreach (var predecessor in predecessors)
                groceryState.Remove(predecessor.DisplayName);
            groceryState[group.Line.DisplayName] = isChecked;
            changed = true;
        }

        return changed;
    }

    private static bool IsKnownPackageTransition(string previousIdentity, RecipePackageDto? currentPackage)
    {
        try
        {
            using var document = JsonDocument.Parse(previousIdentity);
            var identity = document.RootElement;
            if (identity.ValueKind != JsonValueKind.Object
                || !identity.TryGetProperty("fallback", out var name) || name.ValueKind != JsonValueKind.String
                || !identity.TryGetProperty("bucket", out var bucket) || bucket.ValueKind != JsonValueKind.String)
                return false;
            if (!identity.TryGetProperty("package", out var package)) return currentPackage is not null;
            return package.ValueKind == JsonValueKind.Object
                && package.TryGetProperty("countUnit", out var count) && count.ValueKind == JsonValueKind.Object
                && count.TryGetProperty("text", out var countText) && countText.ValueKind == JsonValueKind.String
                && package.TryGetProperty("capacity", out var capacity) && capacity.ValueKind == JsonValueKind.Object
                && capacity.TryGetProperty("amount", out var amount) && amount.ValueKind == JsonValueKind.Object
                && LegacyGroceryQuantity.IsCanonical(amount.Deserialize<GroceryQuantity>())
                && capacity.TryGetProperty("unit", out var unit) && unit.ValueKind == JsonValueKind.Object
                && unit.TryGetProperty("text", out var unitText) && unitText.ValueKind == JsonValueKind.String
                && package.TryGetProperty("basis", out var basis) && basis.ValueKind == JsonValueKind.String
                && basis.GetString() is ("net" or "drained" or "unspecified");
        }
        catch (JsonException) { return false; }
    }

    private static int GetWeekOffset(DateOnly monday, DeploymentCalendarContext context) =>
        (monday.DayNumber - context.ReferenceWeekStartDate.DayNumber) / 7;
}
