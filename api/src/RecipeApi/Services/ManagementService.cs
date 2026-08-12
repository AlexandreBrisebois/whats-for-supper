using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public record WorkflowPruneResult(int PrunedInstances, int PrunedTasks);

public record MaintenanceCommandBatchResult(int PendingAtStart, int Completed, int Skipped, int Failed, List<MaintenanceCommandReportItem> Items);

public record MaintenanceCommandReportItem(Guid CommandId, string CommandType, string Status, Guid? RecipeId, Guid? WorkflowInstanceId, string? Reason);

public record DreamingReportResult(string Path, int FailedWorkflows, int StuckWorkflows);

public record DemoStateResult(string Message, int FamilyMembers, int Recipes, int SearchDocuments);

public class ManagementService(
    RecipeDbContext db,
    IRecipeStore recipeStore,
    RecipesRootResolver recipesRoot,
    DataRootResolver dataRoot,
    IClock clock,
    ILogger<ManagementService> logger)
{
    private string DataRoot => dataRoot.Root;

    private static readonly JsonSerializerOptions _cycleIgnoreOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles
    };

    private string DemoRoot => Path.Combine(DataRoot, "demo");
    private string ActiveRecipesRoot => recipesRoot.Root;
    private string RecipeImportReportsBackupPath => Path.Combine(DataRoot, "recipe-import-reports.json");

    public async Task<object> BackupAsync()
    {
        // 1. Merge Family Members (Append only)
        var dbMembers = await db.FamilyMembers.ToListAsync();
        await MergeFamilyMembersAsync(dbMembers);

        // 2. Backup Recipes (Update notes/rating or create missing)
        var recipes = await db.Recipes.ToListAsync();
        int backedUpCount = 0;
        foreach (var recipe in recipes)
        {
            // Skip if recipe is not ready and has no payload worth persisting
            var isReady = (!string.IsNullOrEmpty(recipe.Name) && recipe.ImageCount > 0)
                       || (!string.IsNullOrEmpty(recipe.Name) && recipe.IsSynthesized);
            if (!isReady &&
                string.IsNullOrEmpty(recipe.RawMetadata) &&
                string.IsNullOrEmpty(recipe.Notes) &&
                recipe.Rating == RecipeRating.Unknown)
            {
                continue;
            }

            // recipe.info — update if exists, create if missing
            var existing = await recipeStore.ReadInfoAsync(recipe.Id);
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
                existing.TotalTime = recipe.TotalTime;
                existing.LastCookedDate = recipe.LastCookedDate;
                existing.IsSynthesized = recipe.IsSynthesized;
                existing.SourceUrl = recipe.SourceUrl;
                existing.CuisineType = recipe.CuisineType;
                existing.MealTypes = recipe.MealTypes;

                if (!string.IsNullOrEmpty(recipe.DietaryProfile))
                {
                    existing.DietaryProfile = JsonSerializer.Deserialize<RecipeDietaryProfile>(recipe.DietaryProfile, JsonDefaults.CamelCase);
                }

                await recipeStore.WriteInfoAsync(existing);
            }
            else
            {
                var info = new RecipeInfo
                {
                    Id = recipe.Id,
                    Notes = recipe.Notes,
                    Rating = recipe.Rating,
                    Description = recipe.Description,
                    Name = recipe.Name,
                    AddedBy = recipe.AddedBy,
                    ImageCount = recipe.ImageCount,
                    IsSynthesized = recipe.IsSynthesized,
                    CreatedAt = recipe.CreatedAt,
                    Category = recipe.Category,
                    IsDiscoverable = recipe.IsDiscoverable,
                    IsHealthyChoice = recipe.IsHealthyChoice,
                    IsVegetarian = recipe.IsVegetarian,
                    TotalTime = recipe.TotalTime,
                    LastCookedDate = recipe.LastCookedDate,
                    SourceUrl = recipe.SourceUrl,
                    CuisineType = recipe.CuisineType,
                    MealTypes = recipe.MealTypes
                };

                if (!string.IsNullOrEmpty(recipe.DietaryProfile))
                {
                    info.DietaryProfile = JsonSerializer.Deserialize<RecipeDietaryProfile>(recipe.DietaryProfile, JsonDefaults.CamelCase);
                }

                await recipeStore.WriteInfoAsync(info);
            }

            // recipe.json — never overwrite; only write if missing and there is content
            if (!await recipeStore.RecipeJsonExistsAsync(recipe.Id) &&
                (!string.IsNullOrEmpty(recipe.RawMetadata) || !string.IsNullOrEmpty(recipe.Ingredients)))
            {
                var recipeJson = JsonSerializer.Serialize(recipe, _cycleIgnoreOptions);
                await recipeStore.WriteRecipeJsonAsync(recipe.Id, recipeJson);
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
            csvLines.Add($"{EscapeCsvField(cat.NormalizedKey)},{EscapeCsvField(cat.GrocerySection)},{cat.Confidence},{EscapeCsvField(cat.Source)},{createdAt}");
        }
        await File.WriteAllLinesAsync(categoriesPath, csvLines);
        logger.LogInformation("Backed up {Count} ingredient categories to {Path}", ingredientCategories.Count, categoriesPath);

        // 6. Backup search index sidecars (only for recipes with index_status = 'ready')
        var readyDocs = await db.RecipeSearchDocuments
            .AsNoTracking()
            .Where(d => d.IndexStatus == "ready")
            .ToListAsync();

        int sidecarCount = 0;
        foreach (var doc in readyDocs)
        {
            try
            {
                // Build sidecar manually to avoid EF navigation cycle issues
                var sidecarDict = new Dictionary<string, object?>
                {
                    ["schemaVersion"] = doc.SchemaVersion,
                    ["recipeId"] = doc.RecipeId.ToString(),
                    ["documentText"] = doc.DocumentText,
                    ["searchMetadata"] = doc.SearchMetadata ?? "{}",
                    ["embeddingModel"] = doc.EmbeddingModel,
                    ["embeddingVersion"] = (object?)doc.EmbeddingVersion,
                    ["sourceFingerprint"] = doc.SourceFingerprint,
                    ["exportedAt"] = DateTimeOffset.UtcNow.ToString("O")
                };

                // Embed the raw float array if present
                if (doc.EmbeddingJson is not null)
                {
                    sidecarDict["embedding"] = JsonSerializer.Deserialize<float[]>(doc.EmbeddingJson);
                }
                else
                {
                    sidecarDict["embedding"] = null;
                }

                var sidecarJson = JsonSerializer.Serialize(sidecarDict, JsonDefaults.CamelCase);
                var sidecarPath = GetSearchIndexSidecarPath(doc.RecipeId);
                Directory.CreateDirectory(Path.GetDirectoryName(sidecarPath)!);
                await File.WriteAllTextAsync(sidecarPath, sidecarJson);
                sidecarCount++;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to write search.index.json for recipe {RecipeId}", doc.RecipeId);
            }
        }

        logger.LogInformation("Backed up {Count} search index sidecars", sidecarCount);

        // 7. Backup active recipe import reports. Always overwrite the artifact,
        // including with an empty array, so resolved reports cannot be resurrected
        // from a stale backup during disaster recovery.
        var importReports = (await db.RecipeImportReports
                .AsNoTracking()
                .OrderBy(report => report.RecipeId)
                .ToListAsync())
            .Select(RecipeImportReportBackup.FromEntity)
            .ToList();
        await WriteJsonAsync(RecipeImportReportsBackupPath, importReports, CancellationToken.None);
        logger.LogInformation(
            "Backed up {Count} recipe import reports to {Path}",
            importReports.Count,
            RecipeImportReportsBackupPath);

        logger.LogInformation("Backed up {Count} recipes", backedUpCount);
        return new { Message = $"Updated/Created {backedUpCount} metadata files. Weekly plans and calendar events also backed up.", FilesProcessed = backedUpCount };
    }

    public async Task<DemoStateResult> CaptureDemoStateAsync(CancellationToken ct = default)
    {
        Directory.CreateDirectory(DemoRoot);

        var familyMembers = await db.FamilyMembers.AsNoTracking().ToListAsync(ct);
        var recipes = await db.Recipes.AsNoTracking().ToListAsync(ct);
        var searchDocuments = await db.RecipeSearchDocuments.AsNoTracking().ToListAsync(ct);

        await WriteJsonAsync(Path.Combine(DemoRoot, "family-members.json"), familyMembers, ct);
        await WriteJsonAsync(Path.Combine(DemoRoot, "recipes.json"), recipes, ct);
        await WriteJsonAsync(Path.Combine(DemoRoot, "recipe-search-documents.json"), searchDocuments, ct);

        var demoRecipesRoot = Path.Combine(DemoRoot, "recipes");
        ReplaceDirectory(ActiveRecipesRoot, demoRecipesRoot);

        var manifest = new
        {
            capturedAt = clock.UtcNow,
            schemaVersion = 1,
            familyMembers = familyMembers.Count,
            recipes = recipes.Count,
            searchDocuments = searchDocuments.Count,
            recipeFiles = Directory.Exists(demoRecipesRoot)
                ? Directory.EnumerateFiles(demoRecipesRoot, "*", SearchOption.AllDirectories).Count()
                : 0
        };
        await WriteJsonAsync(Path.Combine(DemoRoot, "manifest.json"), manifest, ct);

        logger.LogInformation(
            "Captured demo state to {DemoRoot}: members={Members}, recipes={Recipes}, searchDocuments={SearchDocuments}",
            DemoRoot,
            familyMembers.Count,
            recipes.Count,
            searchDocuments.Count);

        return new DemoStateResult("Demo state captured.", familyMembers.Count, recipes.Count, searchDocuments.Count);
    }

    public async Task<DemoStateResult> RestoreDemoStateAsync(CancellationToken ct = default)
    {
        EnsureDemoSnapshotExists();

        var familyMembers = await ReadJsonAsync<List<FamilyMember>>(Path.Combine(DemoRoot, "family-members.json"), ct) ?? [];
        var recipes = await ReadJsonAsync<List<Recipe>>(Path.Combine(DemoRoot, "recipes.json"), ct) ?? [];
        var searchDocuments = await ReadJsonAsync<List<RecipeSearchDocument>>(Path.Combine(DemoRoot, "recipe-search-documents.json"), ct) ?? [];

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        try
        {
            db.RecipeImportReports.RemoveRange(db.RecipeImportReports);
            db.RecipeVotes.RemoveRange(db.RecipeVotes);
            db.WeeklyPlans.RemoveRange(db.WeeklyPlans);
            db.CalendarEvents.RemoveRange(db.CalendarEvents);
            db.RecipeSearchDocuments.RemoveRange(db.RecipeSearchDocuments);
            db.Recipes.RemoveRange(db.Recipes);
            db.FamilyMembers.RemoveRange(db.FamilyMembers);

            var staleWorkflows = await db.WorkflowInstances
                .Include(i => i.Tasks)
                .Where(i => i.Status != WorkflowStatus.Pending && i.Status != WorkflowStatus.Processing)
                .ToListAsync(ct);
            db.WorkflowInstances.RemoveRange(staleWorkflows);

            await db.SaveChangesAsync(ct);

            db.FamilyMembers.AddRange(familyMembers);
            db.Recipes.AddRange(recipes);
            db.RecipeSearchDocuments.AddRange(searchDocuments);
            await db.SaveChangesAsync(ct);

            await transaction.CommitAsync(ct);
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            throw;
        }

        ReplaceDirectory(Path.Combine(DemoRoot, "recipes"), ActiveRecipesRoot);

        logger.LogInformation(
            "Restored demo state from {DemoRoot}: members={Members}, recipes={Recipes}, searchDocuments={SearchDocuments}",
            DemoRoot,
            familyMembers.Count,
            recipes.Count,
            searchDocuments.Count);

        return new DemoStateResult("Demo state restored.", familyMembers.Count, recipes.Count, searchDocuments.Count);
    }

    public async Task<WorkflowPruneResult> PruneWorkflowsAsync(int retentionDays, CancellationToken ct = default)
    {
        var cutoff = clock.UtcNow.AddDays(-retentionDays);
        var instances = await db.WorkflowInstances
            .Include(i => i.Tasks)
            .Where(i =>
                (i.Status == WorkflowStatus.Completed || i.Status == WorkflowStatus.Failed)
                && i.UpdatedAt < cutoff)
            .ToListAsync(ct);

        var taskCount = instances.Sum(i => i.Tasks.Count);
        db.WorkflowInstances.RemoveRange(instances);
        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "Pruned {InstanceCount} workflow instances and {TaskCount} workflow tasks older than {Cutoff}",
            instances.Count,
            taskCount,
            cutoff);

        return new WorkflowPruneResult(instances.Count, taskCount);
    }

    public async Task<MaintenanceCommandBatchResult> ProcessMaintenanceCommandsAsync(CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var commands = await db.MaintenanceCommands
            .Where(c => c.Status == "pending" && (c.ScheduledFor == null || c.ScheduledFor <= now))
            .OrderBy(c => c.CreatedAt)
            .Take(50)
            .ToListAsync(ct);

        var items = new List<MaintenanceCommandReportItem>();

        foreach (var command in commands)
        {
            command.Status = "processing";
            command.Attempts++;
            command.StartedAt = now;
            command.LastError = null;
            await db.SaveChangesAsync(ct);

            try
            {
                var item = command.CommandType switch
                {
                    CaptureFailureService.DeleteFailedCaptureResidueCommand => await ProcessDeleteFailedCaptureResidueAsync(command, ct),
                    _ => await SkipUnsupportedCommandAsync(command, ct),
                };
                items.Add(item);
            }
            catch (Exception ex)
            {
                command.Status = "failed";
                command.LastError = ex.Message;
                command.CompletedAt = clock.UtcNow;
                command.Result = JsonSerializer.Serialize(new { error = ex.Message }, JsonDefaults.CamelCase);
                await db.SaveChangesAsync(ct);

                items.Add(new(command.Id, command.CommandType, "failed", null, null, ex.Message));
                logger.LogError(ex, "Maintenance command {CommandId} ({CommandType}) failed", command.Id, command.CommandType);
            }
        }

        return new MaintenanceCommandBatchResult(
            PendingAtStart: commands.Count,
            Completed: items.Count(i => i.Status == "completed"),
            Skipped: items.Count(i => i.Status == "skipped"),
            Failed: items.Count(i => i.Status == "failed"),
            Items: items);
    }

    private async Task<MaintenanceCommandReportItem> ProcessDeleteFailedCaptureResidueAsync(MaintenanceCommand command, CancellationToken ct)
    {
        var payload = JsonSerializer.Deserialize<DeleteFailedCaptureResiduePayload>(command.Payload, JsonDefaults.CamelCase)
            ?? new DeleteFailedCaptureResiduePayload();

        if (payload.WorkflowInstanceId is Guid workflowInstanceId)
        {
            var workflow = await db.WorkflowInstances.FirstOrDefaultAsync(w => w.Id == workflowInstanceId, ct);
            if (workflow is not null)
                db.WorkflowInstances.Remove(workflow);
        }

        var status = "completed";
        var reason = "deleted";
        var filesDeleted = false;
        var recipeDeleted = false;

        if (payload.RecipeId is Guid recipeId)
        {
            var recipe = await db.Recipes
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r => r.Id == recipeId, ct);

            if (recipe is null)
            {
                reason = "recipe-not-found";
            }
            else if (RecipeIsReadyOrDiscoverable(recipe))
            {
                status = "skipped";
                reason = "recipe-became-ready-or-discoverable";
            }
            else
            {
                var dir = Path.Combine(ActiveRecipesRoot, recipeId.ToString());
                if (Directory.Exists(dir))
                {
                    Directory.Delete(dir, recursive: true);
                    filesDeleted = true;
                }

                db.Recipes.Remove(recipe);
                recipeDeleted = true;
            }
        }
        else
        {
            reason = "no-recipe-id";
        }

        command.Status = status;
        command.CompletedAt = clock.UtcNow;
        command.Result = JsonSerializer.Serialize(new
        {
            payload.RecipeId,
            payload.WorkflowInstanceId,
            payload.SourceWorkflowId,
            payload.Reason,
            filesDeleted,
            recipeDeleted,
            outcome = reason,
        }, JsonDefaults.CamelCase);

        await db.SaveChangesAsync(ct);
        return new(command.Id, command.CommandType, status, payload.RecipeId, payload.WorkflowInstanceId, reason);
    }

    private async Task<MaintenanceCommandReportItem> SkipUnsupportedCommandAsync(MaintenanceCommand command, CancellationToken ct)
    {
        command.Status = "skipped";
        command.CompletedAt = clock.UtcNow;
        command.Result = JsonSerializer.Serialize(new { outcome = "unsupported-command-type" }, JsonDefaults.CamelCase);
        await db.SaveChangesAsync(ct);
        return new(command.Id, command.CommandType, "skipped", null, null, "unsupported-command-type");
    }

    public async Task<DreamingReportResult> GenerateDreamingReportAsync(
        WorkflowPruneResult? pruneResult = null,
        MaintenanceCommandBatchResult? maintenanceResult = null,
        CancellationToken ct = default)
    {
        pruneResult ??= new WorkflowPruneResult(0, 0);
        maintenanceResult ??= new MaintenanceCommandBatchResult(0, 0, 0, 0, []);
        var now = clock.UtcNow;
        var since = now.AddHours(-24);
        var stuckCutoff = now.AddHours(-1);

        var recentFailures = await db.WorkflowInstances
            .AsNoTracking()
            .Include(i => i.Tasks)
            .Where(i => i.Status == WorkflowStatus.Failed && i.UpdatedAt >= since)
            .OrderByDescending(i => i.UpdatedAt)
            .ToListAsync(ct);

        var stuckWorkflows = await db.WorkflowInstances
            .AsNoTracking()
            .Include(i => i.Tasks)
            .Where(i =>
                (i.Status == WorkflowStatus.Processing || i.Status == WorkflowStatus.Pending)
                && i.UpdatedAt < stuckCutoff)
            .OrderBy(i => i.UpdatedAt)
            .ToListAsync(ct);

        var latestBackup = await db.WorkflowInstances
            .AsNoTracking()
            .Where(i => i.WorkflowId == "db-backup")
            .OrderByDescending(i => i.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        var reportsRoot = Path.Combine(DataRoot, "reports");
        Directory.CreateDirectory(reportsRoot);
        var reportPath = Path.Combine(reportsRoot, $"dreaming-{now:yyyy-MM-dd}.md");

        var pendingMaintenanceCommands = await db.MaintenanceCommands
            .AsNoTracking()
            .Where(c => c.Status == "pending" || c.Status == "failed")
            .OrderBy(c => c.CreatedAt)
            .Take(20)
            .ToListAsync(ct);

        var markdown = BuildDreamingReport(now, pruneResult, maintenanceResult, pendingMaintenanceCommands, latestBackup, recentFailures, stuckWorkflows);
        await File.WriteAllTextAsync(reportPath, markdown, ct);

        logger.LogInformation(
            "Generated Dreaming report at {Path}; failures={Failures}; stuck={Stuck}",
            reportPath,
            recentFailures.Count,
            stuckWorkflows.Count);

        return new DreamingReportResult(reportPath, recentFailures.Count, stuckWorkflows.Count);
    }

    private static string BuildDreamingReport(
        DateTimeOffset now,
        WorkflowPruneResult pruneResult,
        MaintenanceCommandBatchResult maintenanceResult,
        List<MaintenanceCommand> pendingMaintenanceCommands,
        WorkflowInstance? latestBackup,
        List<WorkflowInstance> recentFailures,
        List<WorkflowInstance> stuckWorkflows)
    {
        var report = new StringBuilder();
        report.AppendLine("# Dreaming Report");
        report.AppendLine();
        report.AppendLine($"Generated: {now:O}");
        report.AppendLine();
        report.AppendLine("## Summary");
        report.AppendLine();
        report.AppendLine($"- Pruned workflow instances: {pruneResult.PrunedInstances}");
        report.AppendLine($"- Pruned workflow tasks: {pruneResult.PrunedTasks}");
        report.AppendLine($"- Maintenance commands completed: {maintenanceResult.Completed}");
        report.AppendLine($"- Maintenance commands skipped: {maintenanceResult.Skipped}");
        report.AppendLine($"- Maintenance commands failed: {maintenanceResult.Failed}");
        report.AppendLine($"- Failed workflows in last 24h: {recentFailures.Count}");
        report.AppendLine($"- Stuck workflows: {stuckWorkflows.Count}");
        report.AppendLine();
        report.AppendLine("## Maintenance Commands");
        report.AppendLine();
        report.AppendLine($"- Pending at start: {maintenanceResult.PendingAtStart}");
        report.AppendLine($"- Completed: {maintenanceResult.Completed}");
        report.AppendLine($"- Skipped: {maintenanceResult.Skipped}");
        report.AppendLine($"- Failed: {maintenanceResult.Failed}");
        report.AppendLine($"- Pending/failed after run: {pendingMaintenanceCommands.Count}");
        report.AppendLine();
        if (maintenanceResult.Items.Count == 0)
        {
            report.AppendLine("- No maintenance commands processed.");
        }
        else
        {
            foreach (var item in maintenanceResult.Items)
            {
                report.AppendLine($"- {item.Status}: {item.CommandType} command={item.CommandId} recipe={item.RecipeId?.ToString() ?? "n/a"} workflow={item.WorkflowInstanceId?.ToString() ?? "n/a"} reason={item.Reason ?? "n/a"}");
            }
        }
        if (pendingMaintenanceCommands.Count > 0)
        {
            report.AppendLine();
            report.AppendLine("### Pending Or Failed Commands");
            foreach (var command in pendingMaintenanceCommands)
            {
                report.AppendLine($"- {command.Status}: {command.CommandType} command={command.Id} attempts={command.Attempts} error={command.LastError ?? "n/a"}");
            }
        }
        report.AppendLine();
        report.AppendLine("## Backup Status");
        report.AppendLine();
        if (latestBackup == null)
        {
            report.AppendLine("- No db-backup workflow history found.");
        }
        else
        {
            report.AppendLine($"- db-backup: {latestBackup.Status} at {latestBackup.UpdatedAt:O}");
        }

        report.AppendLine();
        report.AppendLine("## Failed Workflows");
        report.AppendLine();
        if (recentFailures.Count == 0)
        {
            report.AppendLine("- None.");
        }
        else
        {
            foreach (var failure in recentFailures)
            {
                var errors = failure.Tasks
                    .Where(t => !string.IsNullOrWhiteSpace(t.ErrorMessage))
                    .Select(t => $"{t.TaskName}: {t.ErrorMessage}");
                report.AppendLine($"- {failure.WorkflowId} ({failure.Id}) at {failure.UpdatedAt:O}");
                foreach (var error in errors)
                {
                    report.AppendLine($"  - {error}");
                }
            }
        }

        report.AppendLine();
        report.AppendLine("## Keep an eye on these");
        report.AppendLine();
        if (stuckWorkflows.Count == 0)
        {
            report.AppendLine("- None.");
        }
        else
        {
            foreach (var stuck in stuckWorkflows)
            {
                report.AppendLine($"- {stuck.WorkflowId} ({stuck.Id}) has been {stuck.Status} since {stuck.UpdatedAt:O}");
            }
        }

        return report.ToString();
    }

    private static bool RecipeIsReadyOrDiscoverable(Recipe recipe) =>
        recipe.IsDiscoverable
        || (!string.IsNullOrWhiteSpace(recipe.Name) && (recipe.ImageCount > 0 || recipe.IsSynthesized));

    private sealed class DeleteFailedCaptureResiduePayload
    {
        public Guid? RecipeId { get; set; }
        public Guid? WorkflowInstanceId { get; set; }
        public string? SourceWorkflowId { get; set; }
        public string? Reason { get; set; }
    }

    private void EnsureDemoSnapshotExists()
    {
        var requiredFiles = new[]
        {
            "manifest.json",
            "family-members.json",
            "recipes.json",
            "recipe-search-documents.json"
        };

        var missing = requiredFiles
            .Select(file => Path.Combine(DemoRoot, file))
            .Where(path => !File.Exists(path))
            .ToList();

        if (missing.Count > 0)
        {
            throw new InvalidOperationException(
                $"Demo snapshot is missing or incomplete at {DemoRoot}. Missing: {string.Join(", ", missing.Select(Path.GetFileName))}");
        }
    }

    private static async Task WriteJsonAsync<T>(string path, T value, CancellationToken ct)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var json = JsonSerializer.Serialize(value, JsonDefaults.CamelCase);
        await File.WriteAllTextAsync(path, json, ct);
    }

    private static async Task<T?> ReadJsonAsync<T>(string path, CancellationToken ct)
    {
        var json = await File.ReadAllTextAsync(path, ct);
        return JsonSerializer.Deserialize<T>(json, JsonDefaults.CamelCase);
    }

    private static void ReplaceDirectory(string source, string destination)
    {
        if (Directory.Exists(destination))
        {
            Directory.Delete(destination, recursive: true);
        }

        Directory.CreateDirectory(destination);

        if (!Directory.Exists(source))
        {
            return;
        }

        foreach (var sourceFile in Directory.EnumerateFiles(source, "*", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(source, sourceFile);
            var destinationFile = Path.Combine(destination, relativePath);
            Directory.CreateDirectory(Path.GetDirectoryName(destinationFile)!);
            File.Copy(sourceFile, destinationFile, overwrite: true);
        }
    }

    public async Task<SeedResult> RestoreAsync(CancellationToken ct = default)
    {
        var result = new SeedResult();

        logger.LogInformation("Starting restore");

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
                    existing.BrowseViewMode = member.BrowseViewMode;
                    existing.PreferredLanguage = member.PreferredLanguage;
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
        var recipeIds = await recipeStore.ListRecipeIdsAsync(ct);
        logger.LogInformation("Found {Count} recipes in store", recipeIds.Count);
        var missingMemberIds = new HashSet<Guid>();
        var recipesToRestore = new List<Recipe>();

        foreach (var recipeId in recipeIds)
        {
            if (ct.IsCancellationRequested) break;

            var hasInfo = await recipeStore.InfoExistsAsync(recipeId, ct);
            var hasJson = await recipeStore.RecipeJsonExistsAsync(recipeId, ct);

            logger.LogDebug("Processing recipe {RecipeId}: hasInfo={HasInfo}, hasJson={HasJson}", recipeId, hasInfo, hasJson);

            if (!hasInfo && !hasJson)
            {
                logger.LogDebug("Skipping recipe {RecipeId} - no recipe.info or recipe.json found", recipeId);
                continue;
            }

            try
            {
                Recipe? recipe = null;

                if (hasInfo)
                {
                    var info = await recipeStore.ReadInfoAsync(recipeId, ct);
                    if (info != null)
                    {
                        logger.LogDebug("Loaded recipe.info for {RecipeId}: name={Name}", recipeId, info.Name);
                        if (!Enum.IsDefined(typeof(RecipeRating), info.Rating))
                            info.Rating = RecipeRating.Unknown;

                        recipe = new Recipe
                        {
                            Id = info.Id,
                            AddedBy = info.AddedBy,
                            Notes = info.Notes,
                            Rating = info.Rating,
                            Description = info.Description,
                            Name = info.Name,
                            ImageCount = info.ImageCount,
                            IsSynthesized = info.IsSynthesized,
                            CreatedAt = info.CreatedAt == default ? DateTimeOffset.UtcNow : info.CreatedAt,
                            UpdatedAt = DateTimeOffset.UtcNow,
                            Category = info.DietaryProfile?.PrimaryFoodGroup ?? info.Category,
                            CuisineType = info.CuisineType ?? info.DietaryProfile?.CuisineType,
                            MealTypes = info.MealTypes ?? info.DietaryProfile?.MealTypes?.Select(MapMealType).Where(x => x != null).Cast<string>().Distinct().ToArray(),
                            IsDiscoverable = info.IsDiscoverable,
                            IsHealthyChoice = info.IsHealthyChoice,
                            IsVegetarian = info.IsVegetarian,
                            TotalTime = info.TotalTime,
                            LastCookedDate = info.LastCookedDate,
                            SourceUrl = info.SourceUrl,
                            IsReady = true,
                            DietaryProfile = info.DietaryProfile != null
                                ? JsonSerializer.Serialize(info.DietaryProfile, JsonDefaults.CamelCase)
                                : null
                        };
                    }
                }

                if (hasJson)
                {
                    var json5 = await recipeStore.ReadRecipeJsonAsync(recipeId, ct);

                    // We avoid deserializing directly into the 'Recipe' model because properties like 'Ingredients'
                    // in local files are often arrays/objects, whereas in the EF model they are raw JSON strings (mapped to JSONB).
                    // This mismatch causes JsonException.
                    if (json5 != null)
                    {
                        using var doc = JsonDocument.Parse(json5);
                        var rootElement = doc.RootElement;

                        recipe ??= new Recipe { Id = recipeId };

                        logger.LogDebug("Loaded recipe.json for {RecipeId}", recipeId);

                        recipe.RawMetadata = json5;

                        if (rootElement.TryGetProperty("recipeIngredient", out var ingProp) && ingProp.ValueKind == JsonValueKind.Array)
                            recipe.Ingredients = ingProp.GetRawText();
                        else if (rootElement.TryGetProperty("ingredients", out var legacyIngProp) && legacyIngProp.ValueKind == JsonValueKind.Array)
                            recipe.Ingredients = legacyIngProp.GetRawText();

                        if (string.IsNullOrEmpty(recipe.Category) && rootElement.TryGetProperty("category", out var catProp))
                            recipe.Category = catProp.GetString();
                        if (string.IsNullOrEmpty(recipe.Name) && rootElement.TryGetProperty("name", out var nameProp))
                            recipe.Name = nameProp.GetString();
                        if (string.IsNullOrEmpty(recipe.TotalTime) && rootElement.TryGetProperty("totalTime", out var timeProp))
                            recipe.TotalTime = timeProp.GetString();
                        if (recipe.ImageCount == 0 && rootElement.TryGetProperty("image_count", out var imgProp))
                            recipe.ImageCount = imgProp.GetInt32();
                    }
                }

                if (recipe == null)
                {
                    logger.LogDebug("Recipe object is null for {RecipeId}, skipping", recipeId);
                    continue;
                }

                if (recipe.AddedBy.HasValue)
                {
                    var memberExists = await db.FamilyMembers.AnyAsync(m => m.Id == recipe.AddedBy.Value, ct);
                    if (!memberExists)
                        missingMemberIds.Add(recipe.AddedBy.Value);
                }

                logger.LogInformation("Queued recipe for restore: {RecipeId} ({Name})", recipeId, recipe.Name ?? "unknown");
                recipesToRestore.Add(recipe);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error loading recipe {RecipeId}", recipeId);
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
                var existing = await db.Recipes.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.Id == recipe.Id, ct);
                if (existing == null)
                {
                    logger.LogDebug("Adding new recipe: {Id} ({Name})", recipe.Id, recipe.Name ?? "unknown");
                    db.Recipes.Add(recipe);
                    result.RecipesAdded++;
                }
                else
                {
                    logger.LogDebug("Updating existing recipe: {Id} ({Name}) (deleted={IsDeleted})",
                        recipe.Id, recipe.Name ?? "unknown", existing.DeletedAt.HasValue);

                    // Update metadata
                    existing.Rating = recipe.Rating;
                    existing.Notes = recipe.Notes;
                    existing.Description = recipe.Description;
                    existing.Name = recipe.Name;
                    existing.TotalTime = recipe.TotalTime;
                    existing.Ingredients = recipe.Ingredients;
                    existing.RawMetadata = recipe.RawMetadata;
                    existing.ImageCount = recipe.ImageCount;
                    existing.IsSynthesized = recipe.IsSynthesized;
                    existing.Category = recipe.Category;
                    existing.IsDiscoverable = recipe.IsDiscoverable;
                    existing.IsHealthyChoice = recipe.IsHealthyChoice;
                    existing.IsVegetarian = recipe.IsVegetarian;
                    existing.LastCookedDate = recipe.LastCookedDate;
                    existing.SourceUrl = recipe.SourceUrl;
                    existing.DietaryProfile = recipe.DietaryProfile;
                    existing.CuisineType = recipe.CuisineType;
                    existing.MealTypes = recipe.MealTypes;
                    existing.IsReady = true;
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

        // 4a. Restore active recipe import reports after their recipe and member
        // dependencies exist. Workflow rows are intentionally not backed up, so an
        // interrupted re-import returns to the actionable Reported state.
        await RestoreRecipeImportReportsAsync(ct);

        // 4b. Restore search index sidecars
        var configuredModel = Environment.GetEnvironmentVariable("EMBEDDING_MODEL_ID") ?? "text-embedding-3-small";
        foreach (var recipe in recipesToRestore)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                var sidecarPath = GetSearchIndexSidecarPath(recipe.Id);
                if (!File.Exists(sidecarPath))
                {
                    // No sidecar — mark pending so background job re-indexes
                    await UpsertSearchDocumentPendingAsync(recipe.Id, ct);
                    logger.LogInformation("recipe_index_restore_marked_pending recipeId={RecipeId} reason=missing", recipe.Id);
                    continue;
                }

                var sidecarJson = await File.ReadAllTextAsync(sidecarPath, ct);
                using var sidecarDoc = JsonDocument.Parse(sidecarJson);
                var root = sidecarDoc.RootElement;

                var schemaVersion = root.TryGetProperty("schemaVersion", out var sv) ? sv.GetInt32() : 0;
                var embeddingModel = root.TryGetProperty("embeddingModel", out var em) ? em.GetString() : null;

                if (schemaVersion != 1 || embeddingModel != configuredModel)
                {
                    await UpsertSearchDocumentPendingAsync(recipe.Id, ct);
                    logger.LogInformation("recipe_index_restore_marked_pending recipeId={RecipeId} reason=incompatible schemaVersion={SchemaVersion} model={Model}",
                        recipe.Id, schemaVersion, embeddingModel);
                    continue;
                }

                var documentText = root.TryGetProperty("documentText", out var dt) ? dt.GetString() ?? string.Empty : string.Empty;
                var sourceFingerprint = root.TryGetProperty("sourceFingerprint", out var fp) ? fp.GetString() : null;
                var embeddingVersion = root.TryGetProperty("embeddingVersion", out var ev) ? ev.GetString() : null;
                string? embeddingJson = null;
                if (root.TryGetProperty("embedding", out var embProp) && embProp.ValueKind == JsonValueKind.Array)
                    embeddingJson = embProp.GetRawText();

                var existing = await db.RecipeSearchDocuments.FindAsync(new object[] { recipe.Id }, ct);
                if (existing is null)
                {
                    db.RecipeSearchDocuments.Add(new RecipeSearchDocument
                    {
                        RecipeId = recipe.Id,
                        DocumentText = documentText,
                        SearchMetadata = "{}",
                        IndexStatus = "ready",
                        EmbeddingJson = embeddingJson,
                        EmbeddingModel = embeddingModel!,
                        EmbeddingVersion = embeddingVersion,
                        SourceFingerprint = sourceFingerprint,
                        LastIndexedAt = DateTimeOffset.UtcNow,
                        SchemaVersion = 1
                    });
                }
                else
                {
                    existing.DocumentText = documentText;
                    existing.IndexStatus = "ready";
                    existing.EmbeddingJson = embeddingJson;
                    existing.EmbeddingModel = embeddingModel!;
                    existing.EmbeddingVersion = embeddingVersion;
                    existing.SourceFingerprint = sourceFingerprint;
                    existing.LastIndexedAt = DateTimeOffset.UtcNow;
                    existing.SchemaVersion = 1;
                }

                await db.SaveChangesAsync(ct);
                logger.LogInformation("recipe_index_restore_rehydrated recipeId={RecipeId}", recipe.Id);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to restore search index for recipe {RecipeId}", recipe.Id);
            }
        }

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

        // 8. Restore Ingredient Categories
        var categoriesPath = Path.Combine(DataRoot, "ingredient-categories.csv");
        if (File.Exists(categoriesPath))
        {
            var lines = await File.ReadAllLinesAsync(categoriesPath, ct);
            int categoriesUpserted = 0;
            // Skip header row (index 0)
            for (int i = 1; i < lines.Length; i++)
            {
                if (ct.IsCancellationRequested) break;
                var line = lines[i];
                if (string.IsNullOrWhiteSpace(line)) continue;

                try
                {
                    var fields = ParseCsvLine(line);
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

                    if (!double.TryParse(confidenceStr, System.Globalization.NumberStyles.Float,
                            System.Globalization.CultureInfo.InvariantCulture, out var confidence))
                    {
                        logger.LogError("Malformed row at line {Line} in ingredient-categories.csv (invalid confidence '{Confidence}'): {Row}",
                            i + 1, confidenceStr, line);
                        continue;
                    }

                    if (!DateTimeOffset.TryParse(createdAtStr, null,
                            System.Globalization.DateTimeStyles.RoundtripKind, out var createdAt))
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
                            UpdatedAt = DateTimeOffset.UtcNow
                        });
                    }
                    else
                    {
                        existing.GrocerySection = grocerySection;
                        existing.Confidence = confidence;
                        existing.Source = source;
                        existing.UpdatedAt = DateTimeOffset.UtcNow;
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
        else
        {
            logger.LogWarning("Ingredient categories file not found at {Path}, skipping", categoriesPath);
        }

        // 9. Backfill Finished Dish Indices from disk metadata
        result.FinishedDishIndicesBackfilled = await BackfillFinishedDishIndicesAsync(ct);

        logger.LogInformation("Restore complete - Added: {Added}, Updated: {Updated}, Skipped: {Skipped}, WeeklyPlans: {WeeklyPlans}, CalendarEvents: {CalendarEvents}, Backfilled: {Backfilled}, Errors: {Errors}",
            result.RecipesAdded, result.RecipesUpdated, result.RecipesSkipped, result.WeeklyPlansRestored, result.CalendarEventsRestored, result.FinishedDishIndicesBackfilled, result.Errors);
        return result;
    }

    private async Task<int> BackfillFinishedDishIndicesAsync(CancellationToken ct)
    {
        try
        {
            var recipes = await db.Recipes.IgnoreQueryFilters().ToListAsync(ct);
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

    /// <summary>
    /// Parses a single CSV line, handling quoted fields (RFC 4180).
    /// Returns an array of unescaped field values.
    /// </summary>
    private static string[] ParseCsvLine(string line)
    {
        var fields = new List<string>();
        int pos = 0;
        while (pos <= line.Length)
        {
            if (pos == line.Length)
            {
                fields.Add(string.Empty);
                break;
            }

            if (line[pos] == '"')
            {
                // Quoted field
                pos++; // skip opening quote
                var sb = new System.Text.StringBuilder();
                while (pos < line.Length)
                {
                    if (line[pos] == '"')
                    {
                        if (pos + 1 < line.Length && line[pos + 1] == '"')
                        {
                            // Escaped double-quote
                            sb.Append('"');
                            pos += 2;
                        }
                        else
                        {
                            pos++; // skip closing quote
                            break;
                        }
                    }
                    else
                    {
                        sb.Append(line[pos]);
                        pos++;
                    }
                }
                fields.Add(sb.ToString());
                // Skip comma separator
                if (pos < line.Length && line[pos] == ',')
                    pos++;
            }
            else
            {
                // Unquoted field — read until comma or end
                int start = pos;
                while (pos < line.Length && line[pos] != ',')
                    pos++;
                fields.Add(line[start..pos]);
                if (pos < line.Length)
                    pos++; // skip comma
                else
                    break;
            }
        }
        return fields.ToArray();
    }

    private static DateOnly GetMonday(DateOnly date)
    {
        var daysToMonday = ((int)date.DayOfWeek - 1 + 7) % 7;
        return date.AddDays(-daysToMonday);
    }

    public async Task<SeedResult> DisasterRecoveryAsync()
    {
        var result = new SeedResult();

        var membersPath = Path.Combine(DataRoot, "family-members.json");
        List<FamilyMember> existingMembers = [];
        if (File.Exists(membersPath))
        {
            var json6 = await File.ReadAllTextAsync(membersPath);
            existingMembers = JsonSerializer.Deserialize<List<FamilyMember>>(json6, JsonDefaults.CamelCase) ?? [];
        }

        var recipeIds = await recipeStore.ListRecipeIdsAsync();
        if (recipeIds.Count == 0) return result;

        var missingIds = new HashSet<Guid>();

        foreach (var recipeId in recipeIds)
        {
            Guid? addedBy = null;

            var recipeJson = await recipeStore.ReadRecipeJsonAsync(recipeId);
            if (recipeJson != null)
            {
                var recipe = JsonSerializer.Deserialize<Recipe>(recipeJson, JsonDefaults.CamelCase);
                addedBy = recipe?.AddedBy;
            }
            else
            {
                var info = await recipeStore.ReadInfoAsync(recipeId);
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

    /// <summary>
    /// Escapes a CSV field value. If the value contains a comma, double-quote, or newline,
    /// it is wrapped in double-quotes with any internal double-quotes doubled.
    /// </summary>
    private static string EscapeCsvField(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    private static string? MapMealType(string? mealType) =>
        mealType switch
        {
            null => null,
            "Dinner" => "Supper",
            _ => mealType
        };

    private string GetSearchIndexSidecarPath(Guid recipeId)
    {
        return Path.Combine(recipesRoot.Root, recipeId.ToString(), "search.index.json");
    }

    private async Task UpsertSearchDocumentPendingAsync(Guid recipeId, CancellationToken ct)
    {
        var existing = await db.RecipeSearchDocuments.FindAsync(new object[] { recipeId }, ct);
        if (existing is null)
        {
            db.RecipeSearchDocuments.Add(new RecipeSearchDocument
            {
                RecipeId = recipeId,
                DocumentText = string.Empty,
                SearchMetadata = "{}",
                IndexStatus = "pending",
                EmbeddingModel = Environment.GetEnvironmentVariable("EMBEDDING_MODEL_ID") ?? "text-embedding-3-small",
                SchemaVersion = 1
            });
        }
        else if (existing.IndexStatus != "ready")
        {
            existing.IndexStatus = "pending";
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task RestoreRecipeImportReportsAsync(CancellationToken ct)
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
            reports = await ReadJsonAsync<List<RecipeImportReportBackup>>(
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

    private async Task<int> MergeFamilyMembersAsync(List<FamilyMember> sourceMembers)
    {
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
            var updatedJson2 = JsonSerializer.Serialize(existingMembers, _cycleIgnoreOptions);
            await File.WriteAllTextAsync(membersPath, updatedJson2);
            logger.LogInformation("Merged {Count} family members into {Path}", addedCount, membersPath);
        }
        return addedCount;
    }

    private sealed record RecipeImportReportBackup(
        Guid RecipeId,
        string[] Reasons,
        string? Note,
        RecipeImportReportStatus Status,
        Guid? ReportedBy,
        Guid? UpdatedBy,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt,
        Guid? LastWorkflowInstanceId,
        DateTimeOffset? LastAttemptAt,
        DateTimeOffset? ReimportedAt,
        string? LastError)
    {
        public static RecipeImportReportBackup FromEntity(RecipeImportReport report) => new(
            report.RecipeId,
            report.Reasons,
            report.Note,
            report.Status,
            report.ReportedBy,
            report.UpdatedBy,
            report.CreatedAt,
            report.UpdatedAt,
            report.LastWorkflowInstanceId,
            report.LastAttemptAt,
            report.ReimportedAt,
            report.LastError);
    }
}
