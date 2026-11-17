using System.Diagnostics;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed record RecipeStartupMigrationResult(int MigratedRecipes, int RecomputedWeeks, long ElapsedMilliseconds);

/// <summary>
/// Upgrades legacy recipes (<c>content_schema_version != 2</c> or null <c>canonical_content</c>)
/// in a single transaction on startup and recomputes affected planner grocery lists.
/// </summary>
public sealed partial class RecipeStartupMigrator(
    RecipeDbContext db,
    FoodVocabularyStore vocabulary,
    GroceryRecomputeService groceries,
    DeploymentCalendar calendar,
    IClock clock,
    ILogger<RecipeStartupMigrator>? logger = null)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private const string ScalarPattern =
        @"(?:[0-9]+\s+[0-9]+/[0-9]+|[0-9]+\s*[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|[0-9]+/[0-9]+|[0-9]+(?:[.,][0-9]+)?|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])";

    private const string UnitPattern =
        @"cuillères?\s+à\s+(?:soupe|thé|café)|cuillerées?\s+à\s+(?:soupe|thé|café)|" +
        @"c\.\s*à\s*(?:soupe|thé|café|s\.?|t\.?)|c\s+à\s+(?:soupe|thé|café|s|t)|" +
        @"tablespoons?|teaspoons?|tbsp\.?|tbsps|tsp\.?|tsps|tasses?|tasse\(s\)|cups?|cup\(s\)|" +
        @"millilit(?:er|re)s?|kilogram(?:me)?s?|milligram(?:me)?s?|decilit(?:er|re)s?|centilit(?:er|re)s?|" +
        @"gram(?:me)?s?|lit(?:er|re)s?|ounces?|pounds?|kg|mg|ml|cl|dl|oz|lbs?|g|l|" +
        @"boîtes?|cans?|sachets?|packets?|pincées?|pinche?s?|units?";

    [GeneratedRegex(
        @"^\s*(?<amt>" + ScalarPattern + @"(?:\s*(?:[-–]|à|to)\s*" + ScalarPattern + @")?)" +
        @"(?:\s*(?<unit>" + UnitPattern + @")(?![\p{L}\p{M}])(?:\s*\([^)]*\))?)?" +
        @"\s*(?:(?:of|de|du|des)\s+|d['’]\s*)?(?<rest>.+?)\s*$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex IngredientLineRegex();

    [GeneratedRegex(@"\s+(?:à|to)\s+", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex RangeConnectorRegex();

    [GeneratedRegex(@"^\s*([1-9][0-9]*)\s*(?:portion\(s\)|serving\(s\))?\s*$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex NumericOrParenthesizedYieldRegex();

    [GeneratedRegex(@"\s+", RegexOptions.CultureInvariant)]
    private static partial Regex WhitespaceRegex();

    private sealed record PreparedRecipeUpgrade(
        string CanonicalContent,
        string? FoodMappingEvidence,
        int? Servings,
        string Ingredients);

    private readonly ILogger<RecipeStartupMigrator> _logger = logger ?? NullLogger<RecipeStartupMigrator>.Instance;

    public async Task<RecipeStartupMigrationResult> MigrateAsync(CancellationToken ct = default)
    {
        var stopwatch = Stopwatch.StartNew();

        var allRecipes = await db.Recipes.IgnoreQueryFilters().ToListAsync(ct);
        var toMigrate = allRecipes.Where(NeedsMigration).ToList();

        var plans = await db.WeeklyPlans.ToListAsync(ct);
        var legacyPlans = plans.Where(IsLegacyGroceryPlan).ToList();

        if (toMigrate.Count == 0 && legacyPlans.Count == 0)
        {
            stopwatch.Stop();
            return new RecipeStartupMigrationResult(0, 0, stopwatch.ElapsedMilliseconds);
        }

        var authority = await vocabulary.CaptureAuthorityAsync(null, ct);
        authority.Validate();
        var now = clock.UtcNow;

        var upgrades = toMigrate.Count > 1
            ? toMigrate.AsParallel().AsOrdered().Select(recipe => ComputeRecipeUpgrade(recipe, authority)).ToArray()
            : toMigrate.Select(recipe => ComputeRecipeUpgrade(recipe, authority)).ToArray();

        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(ct)
            : null;

        for (var i = 0; i < toMigrate.Count; i++)
        {
            ApplyRecipeUpgrade(toMigrate[i], upgrades[i], now);
        }

        foreach (var plan in legacyPlans)
        {
            ResetLegacyPlanGroceries(plan);
        }

        await db.SaveChangesAsync(ct);
        if (transaction is not null)
        {
            await transaction.CommitAsync(ct);
        }

        var eventDates = await db.CalendarEvents
            .AsNoTracking()
            .Where(x => x.RecipeId != null && x.Status != CalendarEventStatus.Skipped)
            .Select(x => x.Date)
            .ToListAsync(ct);

        var weeksToRecompute = plans.Select(x => x.WeekStartDate)
            .Concat(eventDates.Select(DeploymentCalendar.Monday))
            .Distinct()
            .Order()
            .ToArray();

        var calendarContext = calendar.Capture(now);
        foreach (var monday in weeksToRecompute)
        {
            await groceries.RecomputeForWeekAsync(monday, ct, calendarContext);
        }

        stopwatch.Stop();
        _logger.LogInformation(
            "Startup migration upgraded {MigratedCount} recipe(s) and recomputed {WeekCount} week(s) in {ElapsedMs} ms",
            toMigrate.Count, weeksToRecompute.Length, stopwatch.ElapsedMilliseconds);

        return new RecipeStartupMigrationResult(toMigrate.Count, weeksToRecompute.Length, stopwatch.ElapsedMilliseconds);
    }

    private static bool NeedsMigration(Recipe recipe)
    {
        if (!recipe.IsReady && string.IsNullOrWhiteSpace(recipe.Ingredients) && string.IsNullOrWhiteSpace(recipe.RawMetadata))
            return false;

        if (string.IsNullOrWhiteSpace(recipe.CanonicalContent))
            return true;

        try
        {
            var existing = CanonicalRecipeContentStore.Read(recipe);
            return existing is null || existing.ContentSchemaVersion != 2;
        }
        catch (Exception ex) when (ex is JsonException or InvalidDataException)
        {
            return true;
        }
    }

    private static bool IsLegacyGroceryPlan(WeeklyPlan plan)
    {
        try
        {
            var rows = GroceryRowState.Rows(plan);
            GroceryRowState.RequireCurrent(plan, rows);
            return false;
        }
        catch (Exception ex) when (ex is JsonException or GroceryMutationConflictException)
        {
            return true;
        }
    }

    private static void ResetLegacyPlanGroceries(WeeklyPlan plan)
    {
        plan.GroceryItems = "[]";
        plan.GroceryState = "{}";
        plan.GroceryCheckedDemandBaselines = "{}";
        plan.GroceryDemandEvidence = "{}";
        if (!GroceryRowState.IsVersion(plan.GroceryListVersion))
            plan.GroceryListVersion = "1";
        plan.ServingInputVersion = null;
        plan.ServingAppliedVersion = null;
        plan.ServingRefreshStatus = null;
        plan.ServingRefreshWorkflowId = null;
        plan.GroceryResetSummaryVersion = null;
    }

    private static PreparedRecipeUpgrade ComputeRecipeUpgrade(Recipe recipe, FoodVocabularyAuthority authority)
    {
        var sourceRevision = CanonicalRecipeContentStore.InspectSourceRevision(new Recipe
        {
            Id = recipe.Id,
            SourceUrl = recipe.SourceUrl,
            RawMetadata = recipe.RawMetadata
        });

        var servings = recipe.Servings is > 0 ? recipe.Servings : ResolveServings(recipe.RawMetadata);
        var ingredientTexts = ReadIngredientTexts(recipe);
        var lines = ingredientTexts
            .Where(text => !string.IsNullOrWhiteSpace(text))
            .Select(text => ParseIngredientLine(text, sourceRevision))
            .ToArray();
        var sections = ParseInstructionSections(recipe.RawMetadata);

        var initialContent = new CanonicalRecipeContent(
            2,
            Guid.NewGuid().ToString("N"),
            sourceRevision,
            servings,
            lines,
            sections);

        var discoveredContent = CookingStepRelationshipProducer.Discover(initialContent);
        var alignedMetadata = JsonSerializer.Serialize(new
        {
            recipeIngredient = discoveredContent.IngredientLines.Select(CanonicalRecipeContentStore.Render).ToArray()
        }, Json);

        var operationId = ComputeDeterministicOperationId(recipe.Id, sourceRevision);
        var mapped = FoodMappingQualification.Prepare(
            new CanonicalRecipeExport(recipe.Id, discoveredContent, alignedMetadata),
            authority,
            operationId);

        _ = RecipeExportContent.WriteCurrent(new CanonicalRecipeExport(recipe.Id, mapped.Export.Content, null));

        return new PreparedRecipeUpgrade(
            JsonSerializer.Serialize(mapped.Export.Content, Json),
            mapped.Evidence,
            mapped.Export.Content.Servings,
            JsonSerializer.Serialize(mapped.Export.Content.IngredientLines.Select(CanonicalRecipeContentStore.Render), Json));
    }

    private static void ApplyRecipeUpgrade(Recipe recipe, PreparedRecipeUpgrade upgrade, DateTimeOffset now)
    {
        recipe.CanonicalContent = upgrade.CanonicalContent;
        recipe.FoodMappingEvidence = upgrade.FoodMappingEvidence;
        recipe.Servings = upgrade.Servings;
        recipe.Ingredients = upgrade.Ingredients;
        recipe.UpdatedAt = now;
    }

    private static List<string> ReadIngredientTexts(Recipe recipe)
    {
        var fromColumn = RecipeService.DeserializeIngredients(recipe.Ingredients);
        if (fromColumn.Count > 0 || recipe.Ingredients is not null)
            return fromColumn;

        if (string.IsNullOrWhiteSpace(recipe.RawMetadata))
            return [];

        try
        {
            using var doc = JsonDocument.Parse(recipe.RawMetadata);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
                return [];

            if ((doc.RootElement.TryGetProperty("recipeIngredient", out var raw) || doc.RootElement.TryGetProperty("ingredients", out raw))
                && raw.ValueKind == JsonValueKind.Array)
            {
                return raw.EnumerateArray()
                    .Where(x => x.ValueKind == JsonValueKind.String)
                    .Select(x => x.GetString() ?? string.Empty)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .ToList();
            }

            if (doc.RootElement.TryGetProperty("supply", out var supply) && supply.ValueKind == JsonValueKind.Array)
            {
                return supply.EnumerateArray()
                    .Where(x => x.ValueKind == JsonValueKind.Object && x.TryGetProperty("name", out var name) && name.ValueKind == JsonValueKind.String)
                    .Select(x => x.GetProperty("name").GetString() ?? string.Empty)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .ToList();
            }
        }
        catch (JsonException)
        {
            return [];
        }

        return [];
    }

    private static RecipeIngredientLineDto ParseIngredientLine(string rawText, string sourceRevision)
    {
        var trimmed = rawText.Trim();
        var match = IngredientLineRegex().Match(trimmed);
        if (match.Success)
        {
            var rawAmount = match.Groups["amt"].Value.Trim();
            var normalizedAmount = RangeConnectorRegex().Replace(rawAmount, "–");
            var amount = QuantityMath.Parse(normalizedAmount);
            var description = match.Groups["rest"].Value.Trim();
            if (amount is not null && QuantityMath.IsCanonical(amount) && !string.IsNullOrWhiteSpace(description))
            {
                var unit = NormalizeUnit(match.Groups["unit"].Success ? match.Groups["unit"].Value : null);
                var rawMatches = string.Equals(normalizedAmount, rawAmount, StringComparison.Ordinal)
                    || QuantityMath.Parse(rawAmount) == amount;
                var amountText = rawMatches ? rawAmount : null;
                return new RecipeIngredientLineDto
                {
                    Id = Guid.NewGuid(),
                    Description = description,
                    Amount = amount,
                    AmountText = amountText,
                    Unit = unit,
                    Scaling = "proportional",
                    Package = null,
                    Shopping = new RecipeShoppingAssociationDto(description, null, null),
                    Provenance = new RecipeIngredientProvenanceDto("source", sourceRevision, [])
                };
            }
        }

        return new RecipeIngredientLineDto
        {
            Id = Guid.NewGuid(),
            Description = trimmed,
            Amount = null,
            AmountText = null,
            Unit = null,
            Scaling = "proportional",
            Package = null,
            Shopping = new RecipeShoppingAssociationDto(trimmed, null, null),
            Provenance = new RecipeIngredientProvenanceDto("source", sourceRevision, [])
        };
    }

    private static RecipeUnitDto? NormalizeUnit(string? rawUnit)
    {
        if (string.IsNullOrWhiteSpace(rawUnit))
            return null;

        var key = WhitespaceRegex().Replace(rawUnit.Normalize(NormalizationForm.FormC).Trim().ToLowerInvariant(), " ");
        return key switch
        {
            "unit" or "units" => null,
            "c. à s." or "c. à s" or "c à s" or "c. à soupe" or "c à soupe" => new("c. à soupe", null),
            "c. à t." or "c. à t" or "c à t" or "c. à thé" or "c à thé" or "cuillère à café" or "cuillères à café" => new("c. à thé", null),
            "cup(s)" => new("cup", null),
            "tasse(s)" => new("tasse", null),
            _ => new(rawUnit.Trim(), null)
        };
    }

    private static IReadOnlyList<RecipeInstructionSectionDto> ParseInstructionSections(string? rawMetadata)
    {
        if (string.IsNullOrWhiteSpace(rawMetadata))
            return [];

        try
        {
            var parsed = RecipeExtractionParser.ParseAndNormalize(rawMetadata);
            if (parsed.Recipe?.RecipeInstructions is { Count: > 0 } sections)
            {
                return sections
                    .Select(section =>
                    {
                        var steps = (section.ItemListElement ?? [])
                            .Where(step => !string.IsNullOrWhiteSpace(step.Text))
                            .Select(step => new RecipeInstructionStepDto(Guid.NewGuid(), step.Text!, Guid.NewGuid().ToString("N"), []))
                            .ToArray();
                        return steps.Length == 0
                            ? null
                            : new RecipeInstructionSectionDto(Guid.NewGuid(), string.IsNullOrWhiteSpace(section.Name) ? null : section.Name, steps);
                    })
                    .Where(section => section is not null)
                    .Cast<RecipeInstructionSectionDto>()
                    .ToArray();
            }

            using var doc = JsonDocument.Parse(rawMetadata);
            if (doc.RootElement.ValueKind == JsonValueKind.Object && doc.RootElement.TryGetProperty("recipeInstructions", out var instructions))
            {
                if (instructions.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(instructions.GetString()))
                {
                    return
                    [
                        new RecipeInstructionSectionDto(
                            Guid.NewGuid(),
                            null,
                            [new RecipeInstructionStepDto(Guid.NewGuid(), instructions.GetString()!, Guid.NewGuid().ToString("N"), [])])
                    ];
                }

                if (instructions.ValueKind == JsonValueKind.Object
                    && instructions.TryGetProperty("text", out var stepText)
                    && stepText.ValueKind == JsonValueKind.String
                    && !string.IsNullOrWhiteSpace(stepText.GetString()))
                {
                    return
                    [
                        new RecipeInstructionSectionDto(
                            Guid.NewGuid(),
                            null,
                            [new RecipeInstructionStepDto(Guid.NewGuid(), stepText.GetString()!, Guid.NewGuid().ToString("N"), [])])
                    ];
                }
            }
        }
        catch (JsonException)
        {
            return [];
        }

        return [];
    }

    private static int? ResolveServings(string? rawMetadata)
    {
        var parsed = RecipeServings.FromMetadata(rawMetadata);
        if (parsed is > 0)
            return parsed;

        if (string.IsNullOrWhiteSpace(rawMetadata))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(rawMetadata);
            if (doc.RootElement.ValueKind != JsonValueKind.Object
                || !doc.RootElement.TryGetProperty("recipeYield", out var yieldProp)
                || yieldProp.ValueKind != JsonValueKind.String)
                return null;

            var text = yieldProp.GetString();
            if (string.IsNullOrWhiteSpace(text))
                return null;

            var match = NumericOrParenthesizedYieldRegex().Match(text);
            return match.Success && int.TryParse(match.Groups[1].Value, NumberStyles.None, CultureInfo.InvariantCulture, out var count) && count > 0
                ? count
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static Guid ComputeDeterministicOperationId(Guid recipeId, string sourceRevision)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes($"wfs-startup-migration:{recipeId:D}:{sourceRevision}"));
        Span<byte> guidBytes = stackalloc byte[16];
        hash.AsSpan(0, 16).CopyTo(guidBytes);
        guidBytes[6] = (byte)((guidBytes[6] & 0x0F) | 0x50);
        guidBytes[8] = (byte)((guidBytes[8] & 0x3F) | 0x80);
        var id = new Guid(guidBytes, bigEndian: true);
        return id == Guid.Empty ? Guid.NewGuid() : id;
    }
}
