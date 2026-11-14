using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class CanonicalRecipeContentStore
{
    internal const string MigrationModelRevision = "canonical-v2/food-policy-1";

    private async Task RequireMigrationAdmissionAsync(RecipeDbContext observationDb, CanonicalMigrationInventory inventory,
        MaintenanceCommand expected, RecoverySnapshotService snapshots, RecipesRootResolver roots, CancellationToken ct)
    {
        static void Require(bool valid, string reason) => CanonicalRecipeMigrationManifest.Require(valid, "Migration admission: " + reason);
        Require(inventory.Request.ModelRevision == MigrationModelRevision, "executing model differs");
        Require(observationDb.Database.IsNpgsql(), "PostgreSQL required");
        var source = await snapshots.InspectSourceProtectionAsync(inventory.Request.SnapshotId, ct);
        var identity = await snapshots.InspectSnapshotIdentityAsync(inventory.Request.SnapshotId, ct);
        Require(source.ManifestSha256 == inventory.SourceSnapshot.ManifestSha256 && source.Generation == inventory.SourceSnapshot.Generation
            && identity.VocabularyIndexSha256 == inventory.SourceSnapshot.VocabularyIndexSha256
            && identity.References.SequenceEqual(inventory.SourceSnapshot.References), "protected snapshot binding differs");
        Require(roots.Generation == inventory.LiveGeneration, "live generation differs");
        // Prove the recorded baseline itself, including any ABA observation, equals
        // the validated source. Schema fingerprints retain their own table domains.
        foreach (var (name, rows) in source.Tables)
        {
            var recorded = inventory.Tables.Single(x => x.Name == name);
            Require(NormalizeJson(JsonSerializer.Serialize(CanonicalRecipeMigrationManifest.ObserveTable(name, recorded.KeyColumns, rows), Json))
                == NormalizeJson(JsonSerializer.Serialize(recorded, Json)), "baseline differs from source table " + name);
        }
        foreach (var file in source.Files)
        {
            var recorded = inventory.Files.SingleOrDefault(x => "recipes/" + x.Path == file.Path);
            Require(recorded is not null && recorded.Length == file.Length && string.Equals(recorded.Sha256, file.Sha256, StringComparison.OrdinalIgnoreCase), "source protected file differs");
        }
        var files = await ObserveMigrationFiles(roots.Root, ct);
        Require(inventory.Files.SequenceEqual(files), "live file membership or bytes differ");
        await using var read = await DatabaseReadConnection.RetainAsync(observationDb, ct);
        var connection = (NpgsqlConnection)observationDb.Database.GetDbConnection();
        var names = new List<string>();
        await using (var reader = await new NpgsqlCommand("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename", connection).ExecuteReaderAsync(ct))
            while (await reader.ReadAsync(ct)) names.Add(reader.GetString(0));
        Require(names.SequenceEqual(inventory.Tables.Select(x => x.Name)), "table membership differs");
        Require((await RecoverySnapshotService.SchemaAsync(connection, ct, names.ToArray())).ToLowerInvariant() == inventory.Request.SchemaSha256, "live schema differs");
        var raw = new Dictionary<string, JsonElement>(StringComparer.Ordinal);
        foreach (var table in inventory.Tables)
        {
            var quoted = new NpgsqlCommandBuilder().QuoteIdentifier(table.Name);
            var text = (string)(await new NpgsqlCommand("SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]')::text FROM public." + quoted + " t", connection).ExecuteScalarAsync(ct))!;
            using var json = JsonDocument.Parse(text);
            raw.Add(table.Name, json.RootElement.Clone());
        }
        var plan = await CanonicalRecipeMigrationReceipt.FindAsync(observationDb, expected.Id, ct);
        if (plan is not null) CanonicalRecipeMigrationReceipt.RequireBinding(plan, expected);
        var weeks = new Dictionary<DateOnly, (MaintenanceCommandObservation Receipt, CanonicalMigrationReceiptResult Result)>();
        foreach (var week in inventory.Weeks)
        {
            var receipt = await CanonicalRecipeMigrationReceipt.FindAsync(observationDb, CanonicalRecipeMigrationReceipt.WeekReceiptId(expected.Id, week.WeekStart), ct);
            if (receipt is null) continue;
            Require(plan is not null, "week without retained plan");
            CanonicalRecipeMigrationReceipt.RequireWeekBinding(receipt, plan!, week.WeekStart);
            var result = CanonicalRecipeMigrationReceipt.Read(receipt).Result;
            weeks.Add(week.WeekStart, (receipt, result));
        }
        var livePlans = await observationDb.WeeklyPlans.AsNoTracking().ToArrayAsync(ct);
        var allMutations = await observationDb.GroceryMutationOutcomes.AsNoTracking().ToArrayAsync(ct);
        var addedMutations = allMutations.Where(x => !inventory.Tables.Single(t => t.Name == "grocery_mutation_outcomes").Rows.Any(old => KeyId(old.Key) == x.Id)).ToArray();
        var presentation = await vocabulary.CapturePresentationAsync([], ct);
        foreach (var (monday, done) in weeks)
        {
            var state = livePlans.SingleOrDefault(x => x.Id == done.Result.PlanId && x.WeekStartDate == monday);
            Require(state is not null, "completed week plan identity differs");
            Require(done.Result.ProtectedWeekSha256 == MigrationProtectedWeekHash(inventory, inventory.Weeks.Single(x => x.WeekStart == monday), state!), "protected week digest differs");
            GroceryRowState.RequireMigrationCheckContinuity(state!, done.Result, addedMutations.Where(x => x.WeekStartDate == monday).ToArray(),
                presentation.Epoch, Microsoft.Extensions.Logging.Abstractions.NullLogger.Instance);
        }
        Require(addedMutations.All(x => weeks.ContainsKey(x.WeekStartDate)), "unowned human mutation receipt");
        var observedRecipes = await observationDb.Recipes.IgnoreQueryFilters().AsNoTracking().ToArrayAsync(ct);
        var operations = await observationDb.CanonicalRecipeOperations.AsNoTracking().ToArrayAsync(ct);
        var converted = new Dictionary<Guid, CanonicalRecipeOperation>();
        foreach (var item in inventory.Recipes)
        {
            var operation = operations.SingleOrDefault(x => x.RecipeId == item.RecipeId && x.OperationId == item.OperationId);
            if (operation is null)
            {
                var actual = ObserveMigrationRecipe(new(item.RecipeId, item.OperationId), observedRecipes.SingleOrDefault(x => x.Id == item.RecipeId), inventory.Files);
                Require(NormalizeJson(JsonSerializer.Serialize(actual, Json)) == NormalizeJson(JsonSerializer.Serialize(item, Json)),
                    "selected recipe facts differ before first write");
                continue;
            }
            Require(plan is not null, "conversion without retained plan");
            _ = ReadValidatedRetainedResult(operation);
            var request = ReadOriginal<OriginalRequestV2>(operation.OriginalRequest!);
            Require(request.Kind == "convert" && request.CallerInputHash == Hash(new { Kind = "convert", expectedContentRevision = item.ContentRevision, expectedSourceRevision = item.SourceRevision })
                && CanonicalRecipeMigrationManifest.Hash(JsonSerializer.Serialize(request.Baseline, Json)) == item.OriginalFieldsSha256,
                "converter receipt differs from selected baseline");
            var baselineRecipe = inventory.Tables.Single(x => x.Name == "recipes").Rows.Single(x => KeyId(x.Key) == item.RecipeId);
            Require(CanonicalRecipeMigrationManifest.Hash(request.PriorEvidence.Value ?? "null") == baselineRecipe.Columns.Single(x => x.Name == "food_mapping_evidence").Sha256,
                "converter prior mapping evidence differs");
            var actualRecipe = raw["recipes"].EnumerateArray().Single(x => x.GetProperty("id").GetGuid() == item.RecipeId);
            var output = ReadOriginal<CanonicalResultV2>(operation.Result);
            Require(NormalizeJson(actualRecipe.GetProperty("canonical_content").GetRawText()) == NormalizeJson(JsonSerializer.Serialize(output.Result.Content, Json))
                && NormalizeJson(actualRecipe.GetProperty("ingredients").GetRawText()) == (request.Baseline.CanonicalContent is null ? NormalizeJson(JsonSerializer.Serialize(output.Result.Content.IngredientLines.Select(Render), Json))
                    : NormalizeJson(request.Baseline.Ingredients))
                && NormalizeJson(actualRecipe.GetProperty("food_mapping_evidence").GetRawText()) == NormalizeJson(output.Evidence.Value), "recorded conversion output differs from actual recipe");
            converted.Add(item.RecipeId, operation);
        }
        // Every declared week is derived from the exact captured plan/event set.
        var observedWeeks = CanonicalRecipeMigrationManifest.ObserveWeeks(raw["weekly_plans"], raw["calendar_events"]);
        Require(observedWeeks.Select(x => x.WeekStart).SequenceEqual(inventory.Weeks.Select(x => x.WeekStart)), "complete week membership differs");
        foreach (var week in inventory.Weeks)
        {
            var actual = observedWeeks.Single(x => x.WeekStart == week.WeekStart);
            Require(actual.AssignmentIds.SequenceEqual(week.AssignmentIds), "assignment membership differs");
            var expectedIds = weeks.TryGetValue(week.WeekStart, out var done) ? new[] { done.Result.PlanId!.Value } : week.StoredPlanIds;
            Require(actual.StoredPlanIds.SequenceEqual(expectedIds), "stored plan membership differs");
            if (weeks.ContainsKey(week.WeekStart))
            {
                Require(converted.Count == inventory.Recipes.Count, "week committed before all selected conversion outputs");
                var row = raw["weekly_plans"].EnumerateArray().Single(x => x.GetProperty("id").GetGuid() == done.Result.PlanId);
                // Digests in the receipt are historical committed facts. Later
                // human checks also advance row versions; never compare them to
                // the reset's historical row/check digest or restore that state.
                Require(GroceryRowState.IsVersion(row.GetProperty("grocery_list_version").GetString())
                    && ulong.Parse(row.GetProperty("grocery_list_version").GetString()!) >= ulong.Parse(done.Result.ListVersion!), "list version regressed");
            }
        }
        var receipts = inventory.Weeks.Select(x => CanonicalRecipeMigrationReceipt.WeekReceiptId(expected.Id, x.WeekStart)).Append(expected.Id).ToHashSet();
        var retained = await observationDb.MaintenanceCommandLifecycleRecords.AsNoTracking().ToArrayAsync(ct);
        var workflows = await observationDb.WorkflowLifecycleRecords.AsNoTracking().ToArrayAsync(ct);
        var physical = await observationDb.RecipePhysicalDeletions.AsNoTracking().ToArrayAsync(ct);
        var allowedRetirements = new HashSet<(Guid, string)>();
        var liveCommands = raw["maintenance_commands"].EnumerateArray().Where(x => !receipts.Contains(x.GetProperty("id").GetGuid())).ToList();
        // Preserve exact terminal observations through the existing prune owner,
        // including preexisting commands. Pruning is not new migration authority.
        foreach (var record in retained)
        {
            var baseline = inventory.Tables.Single(x => x.Name == "maintenance_command_lifecycle_records");
            if (baseline.Rows.Any(x => JsonSerializer.Deserialize<JsonElement[]>(x.Key)![0].GetGuid() == record.Id
                && JsonSerializer.Deserialize<JsonElement[]>(x.Key)![1].GetString() == record.Disposition)) continue;
            var command = MaintenanceCommandLifecycle.ReadValidatedRetainedCommand(record, workflows, physical);
            if (receipts.Contains(record.Id))
            {
                _ = await CanonicalRecipeMigrationReceipt.FindAsync(observationDb, record.Id, ct);
                allowedRetirements.Add((record.Id, record.Disposition));
                continue;
            }
            var original = inventory.Tables.Single(x => x.Name == "maintenance_commands").Rows.SingleOrDefault(x => KeyId(x.Key) == record.Id);
            Require(original is not null, "unowned maintenance retirement");
            var restored = await MigrationCommandRowAsync(connection, command, ct);
            var proof = CanonicalRecipeMigrationManifest.ObserveTable("maintenance_commands", ["id"], JsonSerializer.SerializeToElement(new[] { restored }));
            Require(proof.Rows.Single().Sha256 == original!.Sha256, "pruned command differs from original");
            if (!liveCommands.Any(x => x.GetProperty("id").GetGuid() == command.Id)) liveCommands.Add(restored);
            allowedRetirements.Add((record.Id, record.Disposition));
        }
        foreach (var table in inventory.Tables)
        {
            var rows = raw[table.Name].EnumerateArray().ToArray();
            if (table.Name == "maintenance_commands") rows = liveCommands.ToArray();
            if (table.Name == "maintenance_command_lifecycle_records") rows = rows.Where(x => !allowedRetirements.Contains((x.GetProperty("id").GetGuid(), x.GetProperty("disposition").GetString()!))).ToArray();
            if (table.Name == "canonical_recipe_operations") rows = rows.Where(x => !converted.TryGetValue(x.GetProperty("recipe_id").GetGuid(), out var op) || x.GetProperty("operation_id").GetGuid() != op.OperationId
                || table.Rows.Any(old => old.Key == Key(table.KeyColumns, x))).ToArray();
            var current = CanonicalRecipeMigrationManifest.ObserveTable(table.Name, table.KeyColumns, JsonSerializer.SerializeToElement(rows));
            Require(table.Rows.Select(x => x.Key).Distinct(StringComparer.Ordinal).Count() == table.Rows.Count, "duplicate baseline row");
            foreach (var original in table.Rows)
            {
                Require(original.Columns.Select(x => x.Name).Distinct(StringComparer.Ordinal).Count() == original.Columns.Count, "duplicate baseline column");
                var actual = current.Rows.SingleOrDefault(x => x.Key == original.Key);
                Require(actual is not null, "missing protected row " + table.Name + "/" + original.Key);
                foreach (var column in original.Columns)
                {
                    var now = actual!.Columns.SingleOrDefault(x => x.Name == column.Name);
                    Require(now is not null, "missing column");
                    if (now!.Sha256 == column.Sha256) continue;
                    var row = rows.Single(x => Key(table.KeyColumns, x) == original.Key);
                    if (table.Name == "recipes" && converted.TryGetValue(KeyId(original.Key), out var operation)
                        && MigrationConvertedColumn(row, column.Name, operation)) continue;
                    if (table.Name == "weekly_plans" && CanonicalRecipeMigrationManifest.GroceryDerivedColumns.Contains(column.Name)
                        && weeks.Values.Any(x => x.Result.PlanId == KeyId(original.Key))) continue;
                    if (table.Name == "recipe_search_documents" && converted.ContainsKey(KeyId(original.Key))
                        && column.Name is "index_status" or "embedding_status" or "embedding_fingerprint" && MigrationSearchPending(row)) continue;
                    Require(false, "protected field differs " + table.Name + "/" + original.Key + "/" + column.Name);
                }
                Require(actual.Columns.Count == original.Columns.Count, "column membership differs");
            }
            foreach (var added in current.Rows.Where(x => !table.Rows.Any(old => old.Key == x.Key)))
            {
                var row = rows.Single(x => Key(table.KeyColumns, x) == added.Key);
                if (table.Name == "recipe_search_documents" && converted.ContainsKey(KeyId(added.Key)) && MigrationSearchPending(row)) continue;
                if (table.Name == "grocery_mutation_outcomes" && weeks.ContainsKey(DateOnly.ParseExact(row.GetProperty("week_start_date").GetString()!, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture))) continue;
                if (table.Name == "weekly_plans" && weeks.Values.Any(x => x.Result.PlanId == KeyId(added.Key)))
                {
                    Require(row.GetProperty("status").GetInt16() == (short)WeeklyPlanStatus.Draft
                        && row.GetProperty("voting_round_id").ValueKind == JsonValueKind.Null
                        && row.GetProperty("last_closed_round_id").ValueKind == JsonValueKind.Null
                        && !row.GetProperty("requires_round_identity").GetBoolean()
                        && row.GetProperty("notified_at").ValueKind == JsonValueKind.Null, "new derived plan contains protected intent");
                    continue;
                }
                Require(false, "unowned row " + table.Name + "/" + added.Key);
            }
        }
        // Typed owners independently validate current/retained history and authority.
        var required = FoodVocabularyInventoryQualification.RequiredReferences(await vocabulary.ObserveInventoryFactsAsync(ct))
            .Select(x => x.Reference).Distinct().OrderBy(x => x.Revision, StringComparer.Ordinal).ThenBy(x => x.Sha256, StringComparer.Ordinal).ToArray();
        Require(required.SequenceEqual(inventory.RequiredReferences), "vocabulary authority differs");
        Require(files.SequenceEqual(await ObserveMigrationFiles(roots.Root, ct)) && roots.Generation == inventory.LiveGeneration, "files changed during admission");
    }

    private static Guid KeyId(string key) => JsonSerializer.Deserialize<JsonElement[]>(key)![0].GetGuid();
    private static string Key(IReadOnlyList<string> columns, JsonElement row) => NormalizeJson(JsonSerializer.Serialize(columns.Select(x => row.GetProperty(x))));
    private static bool MigrationSearchPending(JsonElement row) => row.GetProperty("index_status").GetString() == "pending"
        && row.GetProperty("embedding_status").GetString() == "pending" && row.GetProperty("embedding_fingerprint").ValueKind == JsonValueKind.Null;

    private static bool MigrationConvertedColumn(JsonElement row, string column, CanonicalRecipeOperation operation)
    {
        var result = ReadOriginal<CanonicalResultV2>(operation.Result);
        var request = ReadOriginal<OriginalRequestV2>(operation.OriginalRequest!);
        if (request.Baseline.CanonicalContent is not null) return false;
        return column switch
        {
            "canonical_content" => NormalizeJson(row.GetProperty(column).GetRawText()) == NormalizeJson(JsonSerializer.Serialize(result.Result.Content, Json)),
            "ingredients" => NormalizeJson(row.GetProperty(column).GetRawText()) == NormalizeJson(JsonSerializer.Serialize(result.Result.Content.IngredientLines.Select(Render), Json)),
            "food_mapping_evidence" => NormalizeJson(row.GetProperty(column).GetRawText()) == NormalizeJson(result.Evidence.Value),
            "updated_at" => row.GetProperty(column).GetDateTimeOffset() == operation.CreatedAt,
            _ => false
        };
    }

    private static async Task<JsonElement> MigrationCommandRowAsync(NpgsqlConnection connection, MaintenanceCommandObservation command, CancellationToken ct)
    {
        var value = JsonSerializer.Serialize(new
        {
            id = command.Id,
            command_type = command.CommandType,
            status = command.Status,
            payload = JsonSerializer.Deserialize<JsonElement>(command.Payload),
            result = command.Result is null ? (JsonElement?)null : JsonSerializer.Deserialize<JsonElement>(command.Result),
            attempts = command.Attempts,
            requested_by = command.RequestedBy,
            created_at = command.CreatedAt,
            scheduled_for = command.ScheduledFor,
            started_at = command.StartedAt,
            completed_at = command.CompletedAt,
            last_error = command.LastError
        });
        await using var query = new NpgsqlCommand("SELECT to_jsonb(jsonb_populate_record(NULL::maintenance_commands, @value::jsonb))::text", connection);
        query.Parameters.AddWithValue("value", value);
        using var json = JsonDocument.Parse((string)(await query.ExecuteScalarAsync(ct))!);
        return json.RootElement.Clone();
    }
}
