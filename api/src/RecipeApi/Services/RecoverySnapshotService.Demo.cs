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
        ["canonical_recipe_operations"] = "restore",
        ["recipe_file_publications"] = "restore",
        ["recipe_search_documents"] = "restore-compatible-rebuild-lexical",
        ["feature_flag_overrides"] = "restore",
        ["family_settings"] = "restore-declared-keys",
        ["ingredient_categories"] = "restore",
        ["recipe_import_reports"] = "clear",
        ["recipe_repair_intents"] = "clear",
        ["workflow_child_intents"] = "retain-original-commands",
        ["workflow_reset_intents"] = "retain-original-commands",
        ["workflow_processor_attempts"] = "retain-original-observations",
        ["workflow_launch_intents"] = "retain-original-commands",
        ["workflow_lifecycle_records"] = "retain-inert-history",
        ["maintenance_command_lifecycle_records"] = "retain-inert-history",
        ["recipe_physical_deletions"] = "retain-physical-lifecycle",
        ["weekly_plans"] = "clear",
        ["calendar_events"] = "clear",
        ["grocery_extra_occurrences"] = "clear",
        ["grocery_mutation_outcomes"] = "clear",
        ["supper_servings"] = "clear",
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
    private static readonly IReadOnlyDictionary<string, string> CurrentDemoDispositions =
        new SortedDictionary<string, string>(DemoDispositions.ToDictionary(x => x.Key, x => x.Value), StringComparer.Ordinal)
        { ["household_food_overrides"] = "restore" };
    private static readonly HashSet<string> DemoClearTables = ["recipe_repair_intents", "recipe_import_reports", "weekly_plans", "calendar_events", "weekly_household_interest", "grocery_extra_occurrences", "supper_servings", "grocery_mutation_outcomes"];
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

    private static string NormalizeDemoRows(string table, string rows, bool currentFormat = false)
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
        if (table == "family_settings" && values.Any(row => row!["key"]!.GetValue<string>() is not ("family_goto" or SupperServingsService.DefaultKey)
            && !(currentFormat && row["key"]!.GetValue<string>() == "food_vocabulary_publication")))
            throw new InvalidDataException("Unclassified household setting; declare ownership before demo capture/reset.");
        return values.ToJsonString();
    }

    private async Task ValidateDemoInventoryAsync(NpgsqlConnection connection, CancellationToken ct, bool currentFormat = false, bool prospectiveDemoInvalidation = false)
    {
        var names = await ScalarAsync(connection, "SELECT string_agg(tablename,',' ORDER BY tablename) FROM pg_tables WHERE schemaname='public'", ct);
        var actual = names.Split(',');
        if (!actual.SequenceEqual(DemoDispositions.Keys.Append("household_food_overrides").Order()))
            throw new InvalidDataException("Household schema has unclassified state; recapture requires an explicit disposition for every table.");
        if (!currentFormat) await RequireLegacyDemoFoodFreeAsync(ct, prospectiveDemoInvalidation);
    }
    private async Task RequireLegacyDemoFoodFreeAsync(CancellationToken ct, bool prospectiveDemoInvalidation)
    {
        var facts = await vocabulary.ObserveInventoryFactsAsync(ct);
        if (facts.Membership.RawJson is not null || facts.Overrides.Coverage != FoodVocabularyOverrideCoverage.CapturedV1
            || facts.Overrides.Rows is not { Count: 0 } || facts.Recipes.Any(x => x.FoodMappingEvidence is not null)
            || (prospectiveDemoInvalidation
                ? FoodVocabularyInventoryQualification.RequiredReferencesForDemoInvalidation(facts)
                : FoodVocabularyInventoryQualification.RequiredReferences(facts)).Count != 0)
            throw new InvalidDataException("Legacy demo format 2 cannot represent food vocabulary authority or private food overrides; capture format 4 is required.");
        foreach (var operation in facts.CanonicalOperations)
        {
            if (operation.OriginalRequest is null) continue;
            using var request = JsonDocument.Parse(operation.OriginalRequest);
            if (request.RootElement.GetProperty("version").GetInt32() == 2)
                throw new InvalidDataException("Legacy demo format 2 cannot represent current canonical operation authority; capture format 4 is required.");
        }
    }

    private async Task ValidateLegacyTableAuthorityAsync(NpgsqlConnection connection, CancellationToken ct)
    {
        if (await ScalarAsync(connection, "SELECT count(*)::text FROM pg_temp.recovery_family_settings WHERE key='food_vocabulary_publication'", ct) != "0"
            || await ScalarAsync(connection, "SELECT count(*)::text FROM pg_temp.recovery_recipes WHERE food_mapping_evidence IS NOT NULL", ct) != "0"
            || await ScalarAsync(connection, "SELECT count(*)::text FROM pg_temp.recovery_canonical_recipe_operations WHERE original_request::jsonb->>'version'='2'", ct) != "0")
            throw new InvalidDataException("Legacy demo format 2 contains unsupported food vocabulary authority.");
        await using (var command = new NpgsqlCommand("SELECT id,canonical_content::text,food_mapping_evidence::text FROM pg_temp.recovery_recipes", connection))
        await using (var reader = await command.ExecuteReaderAsync(ct))
            while (await reader.ReadAsync(ct))
            {
                var recipe = new FoodVocabularyRecipeObservation(reader.GetGuid(0), reader.IsDBNull(1) ? null : reader.GetString(1),
                    reader.IsDBNull(2) ? null : reader.GetString(2));
                if (FoodVocabularyInventoryQualification.RecipeReferences(recipe).Length != 0)
                    throw new InvalidDataException("Historical snapshots contain unsupported ingredient food authority.");
            }
        await using (var command = new NpgsqlCommand("SELECT recipe_id,operation_id,input_hash,payload::text,result_hash,delivered,created_at FROM pg_temp.recovery_recipe_file_publications", connection))
        await using (var reader = await command.ExecuteReaderAsync(ct))
            while (await reader.ReadAsync(ct))
            {
                var publication = new RecipeFilePublication
                {
                    RecipeId = reader.GetGuid(0),
                    OperationId = reader.GetGuid(1),
                    InputHash = reader.GetString(2),
                    Payload = reader.GetString(3),
                    ResultHash = reader.GetString(4),
                    Delivered = reader.GetBoolean(5),
                    CreatedAt = reader.GetFieldValue<DateTimeOffset>(6)
                };
                if (RecipeFilePublicationStore.VocabularyReferences(publication).Length != 0)
                    throw new InvalidDataException("Historical snapshots contain unsupported retained publication food authority.");
            }
        await using (var command = new NpgsqlCommand("SELECT id,recipe_id,input_hash,payload::text,created_at FROM pg_temp.recovery_recipe_repair_intents", connection))
        await using (var reader = await command.ExecuteReaderAsync(ct))
            while (await reader.ReadAsync(ct))
            {
                var repair = new RecipeRepairIntent
                {
                    Id = reader.GetGuid(0),
                    RecipeId = reader.GetGuid(1),
                    InputHash = reader.GetString(2),
                    Payload = reader.GetString(3),
                    CreatedAt = reader.GetFieldValue<DateTimeOffset>(4)
                };
                if (RecipeReportRepairIntent.VocabularyReferences(repair).Length != 0)
                    throw new InvalidDataException("Historical snapshots contain unsupported retained repair food authority.");
            }
    }

    private static void ValidateDemoSettingReferences(string settingRows, string recipeRows, bool currentFormat = false)
    {
        using var recipes = JsonDocument.Parse(recipeRows);
        var ids = recipes.RootElement.EnumerateArray().Select(r => r.GetProperty("id").GetGuid()).ToHashSet();
        using var settings = JsonDocument.Parse(settingRows);
        foreach (var row in settings.RootElement.EnumerateArray())
        {
            var value = row.GetProperty("value");
            if (currentFormat && row.GetProperty("key").GetString() == "food_vocabulary_publication")
            {
                _ = FoodVocabularyStore.InspectMembership(value.GetRawText());
                continue;
            }
            if (row.GetProperty("key").GetString() == SupperServingsService.DefaultKey)
            {
                SupperServingsService.ValidateDefaultSetting(value);
                continue;
            }
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
        await ScalarAsync(connection, $"UPDATE workflow_tasks SET child_launch_intent_id=NULL WHERE instance_id NOT IN ({preserve}); UPDATE workflow_tasks SET status=4,error_message='Invalidated by demo reset' WHERE status IN (0,1,2) AND instance_id NOT IN ({preserve}); UPDATE workflow_instances SET status=3,updated_at='{clock.UtcNow:O}'::timestamptz WHERE status IN (0,1,4) AND id NOT IN ({preserve}); UPDATE maintenance_commands SET status='skipped',completed_at='{clock.UtcNow:O}'::timestamptz,last_error='Invalidated by demo reset' WHERE status IN ('pending','processing')", ct);
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
        var roots = instance.Tasks.Where(t => t.DependsOn.Length == 0).ToArray();
        return roots.Length != 0 && roots.All(t => t.Status == Models.TaskStatus.Pending && t.ScheduledAt > now)
            && instance.Tasks.All(t => t.Status is Models.TaskStatus.Waiting or Models.TaskStatus.Pending && t.RetryCount == 0)
            && IsReviewedDemoMaintenanceGraph(instance);
    }

    internal static bool IsReviewedDemoMaintenanceGraph(WorkflowInstance instance)
    {
        try
        {
            using var parameters = JsonDocument.Parse(instance.Parameters ?? "{}");
            if (parameters.RootElement.ValueKind != JsonValueKind.Object || parameters.RootElement.EnumerateObject().Any()) return false;
            foreach (var task in instance.Tasks)
            {
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
