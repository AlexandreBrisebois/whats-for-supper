using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services.Management;

internal sealed class ManagementArtifactRestoreService(
    RecipeDbContext db,
    DataRootResolver dataRoot,
    IClock clock,
    ILogger logger)
{
    private string DataRoot => dataRoot.Root;
    private string RecipeImportReportsBackupPath => Path.Combine(DataRoot, "recipe-import-reports.json");
    private string GroceryExtrasBackupPath => Path.Combine(DataRoot, "grocery-extras.json");

    public async Task RestoreRecipeImportReportsAsync(CancellationToken ct)
    {
        if (!File.Exists(RecipeImportReportsBackupPath))
        {
            logger.LogInformation(
                "Recipe import report backup not found at {Path}; skipping for legacy backup compatibility",
                RecipeImportReportsBackupPath);
            return;
        }

        List<RecipeImportReportBackup> reports;
        try
        {
            reports = await ManagementSharedHelpers.ReadJsonAsync<List<RecipeImportReportBackup>>(
                RecipeImportReportsBackupPath,
                ct) ?? [];
        }
        catch (Exception ex) when (ex is JsonException or IOException)
        {
            logger.LogError(
                ex,
                "Failed to read recipe import report backup at {Path}; skipping",
                RecipeImportReportsBackupPath);
            return;
        }

        var recipeIds = await db.Recipes
            .IgnoreQueryFilters()
            .Select(recipe => recipe.Id)
            .ToHashSetAsync(ct);
        var memberIds = await db.FamilyMembers
            .Select(member => member.Id)
            .ToHashSetAsync(ct);

        var restoredCount = 0;
        foreach (var backup in reports)
        {
            if (ct.IsCancellationRequested) break;
            if (!recipeIds.Contains(backup.RecipeId))
            {
                logger.LogWarning(
                    "Skipping recipe import report for missing recipe {RecipeId}",
                    backup.RecipeId);
                continue;
            }

            var interrupted = backup.Status == RecipeImportReportStatus.Reimporting;
            var existing = await db.RecipeImportReports.FindAsync([backup.RecipeId], ct);
            if (existing is null)
            {
                existing = new RecipeImportReport { RecipeId = backup.RecipeId };
                db.RecipeImportReports.Add(existing);
            }

            existing.Reasons = backup.Reasons;
            existing.Note = backup.Note;
            existing.Status = interrupted ? RecipeImportReportStatus.Reported : backup.Status;
            existing.ReportedBy = backup.ReportedBy is Guid reportedBy && memberIds.Contains(reportedBy)
                ? reportedBy
                : null;
            existing.UpdatedBy = backup.UpdatedBy is Guid updatedBy && memberIds.Contains(updatedBy)
                ? updatedBy
                : null;
            existing.CreatedAt = backup.CreatedAt;
            existing.UpdatedAt = backup.UpdatedAt;
            existing.LastWorkflowInstanceId = interrupted ? null : backup.LastWorkflowInstanceId;
            existing.LastAttemptAt = interrupted ? null : backup.LastAttemptAt;
            existing.ReimportedAt = interrupted ? null : backup.ReimportedAt;
            existing.LastError = interrupted ? null : backup.LastError;
            restoredCount++;
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation(
            "Restored {Count} recipe import reports from {Path}",
            restoredCount,
            RecipeImportReportsBackupPath);
    }

    public async Task RestoreIngredientCategoriesAsync(CancellationToken ct)
    {
        var categoriesPath = Path.Combine(DataRoot, "ingredient-categories.csv");
        if (!File.Exists(categoriesPath))
        {
            logger.LogWarning("Ingredient categories file not found at {Path}, skipping", categoriesPath);
            return;
        }

        var lines = await ManagementSharedHelpers.ReadCsvRecordsAsync(categoriesPath, ct);
        int categoriesUpserted = 0;
        // Skip header row (index 0)
        for (int i = 1; i < lines.Count; i++)
        {
            if (ct.IsCancellationRequested) break;
            var fields = lines[i];
            var line = string.Join(",", fields);
            if (string.IsNullOrWhiteSpace(line)) continue;

            try
            {
                if (fields.Length < 5)
                {
                    logger.LogError("Malformed row at line {Line} in ingredient-categories.csv (expected 5 fields, got {Count}): {Row}",
                        i + 1, fields.Length, line);
                    continue;
                }

                var normalizedKey = fields[0];
                var grocerySection = fields[1];
                var confidenceStr = fields[2];
                var source = fields[3];
                var createdAtStr = fields[4];

                if (string.IsNullOrWhiteSpace(normalizedKey) || string.IsNullOrWhiteSpace(grocerySection))
                {
                    logger.LogError("Malformed row at line {Line} in ingredient-categories.csv (empty required field): {Row}",
                        i + 1, line);
                    continue;
                }

                if (!double.TryParse(confidenceStr, NumberStyles.Float, CultureInfo.InvariantCulture, out var confidence))
                {
                    logger.LogError("Malformed row at line {Line} in ingredient-categories.csv (invalid confidence '{Confidence}'): {Row}",
                        i + 1, confidenceStr, line);
                    continue;
                }

                if (!DateTimeOffset.TryParse(createdAtStr, null, DateTimeStyles.RoundtripKind, out var createdAt))
                {
                    logger.LogError("Malformed row at line {Line} in ingredient-categories.csv (invalid created_at '{CreatedAt}'): {Row}",
                        i + 1, createdAtStr, line);
                    continue;
                }

                var existing = await db.IngredientCategories.FindAsync(new object[] { normalizedKey }, ct);
                if (existing == null)
                {
                    db.IngredientCategories.Add(new IngredientCategory
                    {
                        NormalizedKey = normalizedKey,
                        GrocerySection = grocerySection,
                        Confidence = confidence,
                        Source = source,
                        CreatedAt = createdAt,
                        UpdatedAt = clock.UtcNow
                    });
                }
                else
                {
                    existing.GrocerySection = grocerySection;
                    existing.Confidence = confidence;
                    existing.Source = source;
                    existing.UpdatedAt = clock.UtcNow;
                }
                categoriesUpserted++;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing row at line {Line} in ingredient-categories.csv: {Row}", i + 1, line);
            }
        }
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Restored {Count} ingredient categories from {Path}", categoriesUpserted, categoriesPath);
    }

    public async Task<GroceryExtraBackup?> ReadGroceryExtraBackupAsync(CancellationToken ct)
    {
        if (!File.Exists(GroceryExtrasBackupPath)) return null;
        var backup = JsonSerializer.Deserialize<GroceryExtraBackup>(
            await File.ReadAllTextAsync(GroceryExtrasBackupPath, ct), JsonDefaults.CamelCase)
            ?? throw new InvalidDataException("grocery-extras.json is invalid.");
        if (backup.Version != 1 || backup.Occurrences is null)
            throw new InvalidDataException("grocery-extras.json has an unsupported or incomplete envelope.");

        ValidateGroceryExtraHistory(backup.Occurrences);
        return backup;
    }

    internal static void ValidateGroceryExtraHistory(IReadOnlyList<GroceryExtraOccurrence> rows)
    {
        if (rows.Any(row => row.Id == Guid.Empty || row.LineageId == Guid.Empty || row.Version < 1
            || row.WeekStartDate.DayOfWeek != DayOfWeek.Monday || string.IsNullOrWhiteSpace(row.Name) || row.Name.Length > 200
            || string.IsNullOrWhiteSpace(row.NormalizedKey) || !GrocerySections.IsCanonicalName(row.GrocerySection))
            || rows.Select(row => row.Id).Distinct().Count() != rows.Count
            || rows.GroupBy(row => (row.LineageId, row.WeekStartDate)).Any(group => group.Count() != 1)
            || rows.Where(row => row.PredecessorId is not null).GroupBy(row => row.PredecessorId).Any(group => group.Count() != 1))
            throw new InvalidDataException("grocery-extras.json contains invalid identities or occurrence values.");

        foreach (var lineage in rows.GroupBy(row => row.LineageId))
        {
            var ordered = lineage.OrderBy(row => row.WeekStartDate).ToArray();
            if (ordered[0].PredecessorId is not null)
                throw new InvalidDataException("grocery-extras.json contains an invalid lineage root.");
            for (var index = 1; index < ordered.Length; index++)
            {
                var predecessor = ordered[index - 1];
                var row = ordered[index];
                if (row.PredecessorId != predecessor.Id
                    || predecessor.WeekStartDate.AddDays(7) != row.WeekStartDate
                    || predecessor.Checked
                    || predecessor.RemovedAt is not null)
                    throw new InvalidDataException("grocery-extras.json contains an invalid lineage.");
            }
        }
    }

    public async Task MergeGroceryExtraBackupAsync(GroceryExtraBackup backup, CancellationToken ct)
    {
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        if (db.Database.IsNpgsql())
            await db.Database.ExecuteSqlRawAsync("LOCK TABLE grocery_extra_occurrences IN SHARE ROW EXCLUSIVE MODE", ct);
        var representedIds = backup.Occurrences.Select(row => row.Id).ToHashSet();
        var destination = await db.GroceryExtraOccurrences.AsNoTracking().ToListAsync(ct);
        ValidateGroceryExtraHistory(destination.Where(row => !representedIds.Contains(row.Id))
            .Concat(backup.Occurrences).ToArray());
        foreach (var source in backup.Occurrences)
        {
            var target = await db.GroceryExtraOccurrences.SingleOrDefaultAsync(row => row.Id == source.Id, ct);
            if (target is null)
            {
                db.GroceryExtraOccurrences.Add(new GroceryExtraOccurrence
                {
                    Id = source.Id,
                    LineageId = source.LineageId,
                    PredecessorId = source.PredecessorId,
                    WeekStartDate = source.WeekStartDate,
                    Name = source.Name,
                    CreationName = source.CreationName,
                    NormalizedKey = source.NormalizedKey,
                    GrocerySection = source.GrocerySection,
                    Checked = source.Checked,
                    RemovedAt = source.RemovedAt,
                    Version = source.Version,
                    CreatedAt = source.CreatedAt,
                    UpdatedAt = source.UpdatedAt
                });
            }
            else
            {
                target.LineageId = source.LineageId;
                target.PredecessorId = source.PredecessorId;
                target.WeekStartDate = source.WeekStartDate;
                target.Name = source.Name;
                target.CreationName = source.CreationName ?? target.CreationName;
                target.NormalizedKey = source.NormalizedKey;
                target.GrocerySection = source.GrocerySection;
                target.Checked = source.Checked;
                target.RemovedAt = source.RemovedAt;
                target.Version = source.Version;
                target.CreatedAt = source.CreatedAt;
                target.UpdatedAt = source.UpdatedAt;
            }
        }
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
    }
}
