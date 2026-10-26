using System.Text.Json;
using System.Text.Json.Nodes;
using Npgsql;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public sealed record DemoBaselineInspection(bool Ready, Guid? BaselineId, string[] Missing, string? ErrorCode, string RecoveryState);

public partial class RecoverySnapshotService
{
    internal static readonly string[] DemoTables = [.. Tables, "recipe_search_documents"];
    internal static readonly IReadOnlyDictionary<string, string> DemoDispositions = new SortedDictionary<string, string>(StringComparer.Ordinal)
    {
        ["family_members"] = "restore",
        ["recipes"] = "restore-clear-cooking-history",
        ["recipe_search_documents"] = "restore-compatible-rebuild-lexical",
        ["feature_flag_overrides"] = "restore",
        ["family_settings"] = "restore-declared-keys",
        ["ingredient_categories"] = "restore",
        ["recipe_import_reports"] = "clear",
        ["weekly_plans"] = "clear",
        ["calendar_events"] = "clear",
        ["grocery_extra_occurrences"] = "clear",
        ["recipe_votes"] = "clear",
        ["weekly_household_interest"] = "clear",
        ["voting_round_state"] = "fresh-current-round",
        ["recipe_search_filter_state"] = "rebuild",
        ["recipe_search_affinity_facts"] = "rebuild",
        ["workflow_instances"] = "fence-except-reset-and-qualified-future-dreaming",
        ["workflow_tasks"] = "fence-except-reset-and-qualified-future-dreaming",
        ["maintenance_commands"] = "invalidate",
        ["recovery_publication"] = "fresh-publication"
    };
    private static readonly HashSet<string> DemoClearTables = ["recipe_import_reports", "weekly_plans", "calendar_events", "weekly_household_interest", "grocery_extra_occurrences"];
    internal string DemoBaselineRoot
    {
        get
        {
            var root = Path.GetFullPath(Path.Combine(data.Root, "demo"));
            RejectLinks(root);
            if (Contains(root, recipes.BaseRoot) || Contains(recipes.BaseRoot, root))
                throw new InvalidOperationException("Demo baseline storage must be outside the active recipe root.");
            return root;
        }
    }
    private string DemoSelection => Path.Combine(DemoBaselineRoot, "current");

    public async Task<RecoveryResult> CaptureDemoAsync(CancellationToken ct)
    {
        _demoPolicy.EnsureManagementAvailable();
        if (!db.Database.IsNpgsql()) throw new InvalidOperationException("Demo baseline publication requires PostgreSQL.");
        var root = DemoBaselineRoot;
        // Persist coordination before taking the first capture lease, including private preparation mode.
        Directory.CreateDirectory(recipes.BaseRoot);
        var marker = Path.Combine(recipes.BaseRoot, ".demo-coordination");
        if (!File.Exists(marker)) await File.WriteAllTextAsync(marker, "2", ct);
        RecoveryDurability.Flush(marker);
        RecoveryDurability.Flush(recipes.BaseRoot);
        var captured = await CaptureToAsync(root, true, ct);
        var id = captured.SnapshotId!.Value;
        var source = Path.Combine(root, id.ToString("N"));
        var validation = Path.Combine(root, ".validate-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(validation);
        try
        {
            var manifest = await ValidateAndStageAsync(source, validation, id, ct, true);
            await using var connection = await OpenAsync(ct);
            await using var transaction = await connection.BeginTransactionAsync(ct);
            await ValidateTablesAsync(connection, validation, manifest, ct, true);
            await SelectDemoAsync(id, ct);
            return new("completed", "Complete demo baseline selected; calendar, plans, groceries and voting/cooking activity will reset empty.", id);
        }
        finally { if (Directory.Exists(validation)) Directory.Delete(validation, true); }
    }

    private async Task SelectDemoAsync(Guid id, CancellationToken ct)
    {
        var temporary = DemoSelection + "." + Guid.NewGuid().ToString("N");
        try
        {
            await using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                await stream.WriteAsync(System.Text.Encoding.UTF8.GetBytes(id.ToString("N")), ct);
                stream.Flush(true);
            }
            ct.ThrowIfCancellationRequested();
            File.Move(temporary, DemoSelection, true);
            RecoveryDurability.Flush(DemoBaselineRoot);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }

    public Task<RecoveryResult> RestoreDemoAsync(Guid? workflowInstanceId, CancellationToken ct)
    {
        if (!db.Database.IsNpgsql()) throw new InvalidOperationException("Demo baseline publication requires PostgreSQL.");
        RejectLinks(DemoSelection);
        if (!File.Exists(DemoSelection) || !Guid.TryParseExact(File.ReadAllText(DemoSelection).Trim(), "N", out var id))
            throw new InvalidDataException("Complete version-2 demo baseline required. Disable demo mode and recapture the prepared household.");
        return RestoreFromAsync(Path.Combine(DemoBaselineRoot, id.ToString("N")), id, ct, true, workflowInstanceId);
    }

    public async Task<DemoBaselineInspection> InspectDemoAsync(CancellationToken ct)
    {
        var state = File.Exists(JournalPath) ? "reconciliation-required" : "available";
        if (!File.Exists(Path.Combine(data.Root, "demo", "current")))
            return new(false, null, ["current"], "RECAPTURE_REQUIRED", state);
        string? stage = null;
        Guid? selected = null;
        try
        {
            RejectLinks(DemoSelection);
            if (!Guid.TryParseExact(File.ReadAllText(DemoSelection).Trim(), "N", out var id))
                return new(false, null, ["current"], "RECAPTURE_REQUIRED", state);
            selected = id;
            var source = Path.Combine(DemoBaselineRoot, id.ToString("N"));
            stage = Path.Combine(DemoBaselineRoot, ".inspect-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(stage);
            var manifest = await ValidateAndStageAsync(source, stage, id, ct, true);
            await using var connection = await OpenAsync(ct);
            await using var transaction = await connection.BeginTransactionAsync(ct);
            await ValidateTablesAsync(connection, stage, manifest, ct, true);
            return new(true, id, [], null, state);
        }
        catch (Exception ex) when (ex is InvalidDataException or IOException or JsonException or InvalidOperationException or NpgsqlException)
        {
            return new(false, selected, [], "BASELINE_INVALID", state);
        }
        finally { if (stage is not null && Directory.Exists(stage)) Directory.Delete(stage, true); }
    }

    private static string NormalizeDemoRows(string table, string rows)
    {
        if (DemoClearTables.Contains(table)) return "[]";
        var values = JsonNode.Parse(rows)!.AsArray();
        if (table == "recipe_search_documents")
            foreach (var row in values) row!.AsObject().Remove("embedding");
        if (table == "recipes")
            foreach (var row in values)
            {
                row!["last_cooked_date"] = null;
                if (row["cooked_suppressed"]!.GetValue<bool>())
                {
                    var recipe = new Recipe
                    {
                        SupperSuitable = row["supper_suitable"]?.GetValue<bool>(),
                        Category = row["category"]?.GetValue<string>(),
                        MealTypes = row["meal_types"]?.Deserialize<string[]>(),
                        RotationHumanOff = row["rotation_human_off"]!.GetValue<bool>()
                    };
                    row["cooked_suppressed"] = false;
                    row["is_discoverable"] = row["is_ready"]!.GetValue<bool>() && RecipeRotation.Suitable(recipe) && !recipe.RotationHumanOff;
                }
            }
        if (table == "family_settings" && values.Any(row => row!["key"]!.GetValue<string>() != "family_goto"))
            throw new InvalidDataException("Unclassified household setting; declare ownership before demo capture/reset.");
        return values.ToJsonString();
    }

    private static async Task ValidateDemoInventoryAsync(NpgsqlConnection connection, CancellationToken ct)
    {
        var names = await ScalarAsync(connection, "SELECT string_agg(tablename,',' ORDER BY tablename) FROM pg_tables WHERE schemaname='public'", ct);
        if (!names.Split(',').SequenceEqual(DemoDispositions.Keys.Order()))
            throw new InvalidDataException("Household schema has unclassified state; recapture requires an explicit disposition for every table.");
    }
    private static void ValidateDemoSettingReferences(string settingRows, string recipeRows)
    {
        using var recipes = JsonDocument.Parse(recipeRows);
        var ids = recipes.RootElement.EnumerateArray().Select(r => r.GetProperty("id").GetGuid()).ToHashSet();
        using var settings = JsonDocument.Parse(settingRows);
        foreach (var row in settings.RootElement.EnumerateArray())
        {
            var value = row.GetProperty("value");
            if (value.ValueKind != JsonValueKind.Object || !value.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array)
                throw new InvalidDataException("Declared family_goto setting must contain an explicit items array.");
            foreach (var item in items.EnumerateArray())
                if (item.ValueKind != JsonValueKind.Object || !item.TryGetProperty("recipeId", out var reference)
                    || reference.ValueKind != JsonValueKind.String || !reference.TryGetGuid(out var id) || !ids.Contains(id))
                    throw new InvalidDataException("Declared family_goto setting references a recipe outside the baseline.");
        }
    }

    private async Task ResetDemoActivityAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid? workflowInstanceId, CancellationToken ct)
    {
        var anchor = new DeploymentCalendar(configuration).Capture(clock.UtcNow).CurrentWeekStartDate;
        await ScalarAsync(connection, "DELETE FROM recipe_votes; DELETE FROM voting_round_state; DELETE FROM recipe_search_filter_state; DELETE FROM recipe_search_affinity_facts", ct);
        var round = Guid.NewGuid();
        await ScalarAsync(connection, $"INSERT INTO voting_round_state(id,round_id,history_generation,requires_round_identity,week_start_date) VALUES(1,'{round}','{Guid.NewGuid()}',true,'{anchor:yyyy-MM-dd}')", ct);
        await using var restored = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(connection).Options);
        await restored.Database.UseTransactionAsync(transaction, ct);
        restored.WeeklyPlans.Add(new WeeklyPlan
        {
            WeekStartDate = anchor,
            Status = WeeklyPlanStatus.VotingOpen,
            VotingRoundId = round,
            RequiresRoundIdentity = true,
            CreatedAt = clock.UtcNow,
            GroceryState = "{}",
            GroceryItems = "[]"
        });
        var futureMaintenance = await restored.WorkflowInstances.AsNoTracking().Include(i => i.Tasks)
            .Where(i => i.WorkflowId == "dreaming" && i.Status == WorkflowStatus.Pending).ToListAsync(ct);
        var preserved = futureMaintenance.Where(i => IsSafeFutureDemoMaintenance(i, clock.UtcNow)).Select(i => i.Id).ToHashSet();
        preserved.Add(workflowInstanceId ?? Guid.Empty);
        var preserve = string.Join(',', preserved.Select(id => $"'{id}'"));
        await ScalarAsync(connection, $"UPDATE workflow_tasks SET status=4,error_message='Invalidated by demo reset' WHERE status IN (0,1,2) AND instance_id NOT IN ({preserve}); UPDATE workflow_instances SET status=3,updated_at='{clock.UtcNow:O}'::timestamptz WHERE status IN (0,1,4) AND id NOT IN ({preserve}); UPDATE maintenance_commands SET status='skipped',completed_at='{clock.UtcNow:O}'::timestamptz,last_error='Invalidated by demo reset' WHERE status IN ('pending','processing')", ct);
        var builder = new RecipeSearchDocumentBuilder();
        var documents = await restored.RecipeSearchDocuments.ToDictionaryAsync(d => d.RecipeId, ct);
        foreach (var recipe in await restored.Recipes.AsNoTracking().ToListAsync(ct))
        {
            var content = builder.Build(recipe);
            var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe, content);
            if (!documents.TryGetValue(recipe.Id, out var document))
            {
                document = new RecipeSearchDocument { RecipeId = recipe.Id };
                restored.RecipeSearchDocuments.Add(document);
            }
            var compatible = document.EmbeddingJson is not null && document.EmbeddingFingerprint == fingerprint;
            if (!compatible) { document.Embedding = null; document.EmbeddingFingerprint = null; }
            document.EmbeddingStatus = compatible ? "ready" : "pending";
            document.DocumentText = content.DocumentText;
            document.SearchMetadata = content.SearchMetadata;
            document.SchemaVersion = content.SchemaVersion;
            document.SourceFingerprint = fingerprint;
            document.IndexStatus = "ready";
            document.LastIndexedAt = clock.UtcNow;
        }
        await restored.SaveChangesAsync(ct);
        await new RecipeSearchFilterMaterializer(restored, clock).MaterializeAsync(ct);
    }

    private static bool IsSafeFutureDemoMaintenance(WorkflowInstance instance, DateTimeOffset now)
    {
        try
        {
            using var parameters = JsonDocument.Parse(instance.Parameters ?? "{}");
            if (parameters.RootElement.ValueKind != JsonValueKind.Object || parameters.RootElement.EnumerateObject().Any()) return false;
            var roots = instance.Tasks.Where(t => t.DependsOn.Length == 0).ToArray();
            if (roots.Length == 0 || roots.Any(t => t.Status != Models.TaskStatus.Pending || t.ScheduledAt is null || t.ScheduledAt <= now)) return false;
            foreach (var task in instance.Tasks)
            {
                if (task.Status is not (Models.TaskStatus.Waiting or Models.TaskStatus.Pending) || task.RetryCount != 0) return false;
                if (task.ProcessorName is "PruneWorkflows" or "ProcessMaintenanceCommands" or "PruneMaintenanceCommands"
                    or "FinalizeOverdueMeals" or "RolloverGroceryExtras" or "ReconcileRecipeRotation"
                    or "MaterializeRecipeSearchFilters" or "GenerateDreamingReport") continue;
                if (task.ProcessorName != "StartWorkflow") return false;
                using var payload = JsonDocument.Parse(task.Payload ?? "{}");
                if (!payload.RootElement.TryGetProperty("workflowId", out var target)
                    || target.GetString() is not ("db-backup" or "search-reconciliation" or "dreaming")) return false;
            }
            return true;
        }
        catch (JsonException) { return false; }
        catch (InvalidOperationException) { return false; }
    }

}
