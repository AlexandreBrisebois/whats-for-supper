using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public partial class RecoverySnapshotService
{
    private sealed record Journal(Guid Operation, Guid Snapshot, string? Previous, string Next);
    private string JournalPath => Path.Combine(recipes.BaseRoot, ".recovery-journal.json");
    private string PointerPath => Path.Combine(recipes.BaseRoot, ".recovery-active");
    public async Task<RecoveryResult> StatusAsync(CancellationToken ct)
    {
        if (!boundary.Enabled) return new("disabled", "Configure Recovery:BackupRoot to enable exact recovery.");
        if (File.Exists(JournalPath)) return new("reconciliation-required", "Household operations wait for interrupted publication reconciliation.");
        var publication = await db.RecoveryPublications.AsNoTracking().SingleOrDefaultAsync(ct);
        return publication is null ? new("available", "Online recovery configured; no exact restore has committed.")
            : new("available", "Last committed exact restore is identified by snapshotId.", publication.SnapshotId);
    }

    public async Task<RecoveryResult> RestoreExactAsync(Guid snapshotId, CancellationToken ct)
    {
        var source = Path.Combine(BackupRoot, snapshotId.ToString("N"));
        var operation = Guid.NewGuid();
        var stage = Path.Combine(recipes.BaseRoot, ".recovery-generations", operation.ToString("N"));
        RejectLinks(stage);
        RejectLinks(JournalPath);
        RejectLinks(PointerPath);
        Directory.CreateDirectory(stage);
        var journalWritten = false;
        try
        {
            RecoveryManifest manifest;
            try { manifest = await ValidateAndStageAsync(source, stage, snapshotId, ct); }
            catch (InvalidOperationException ex) { throw new InvalidDataException("Snapshot JSON has an invalid content shape.", ex); }
            await using var connection = await OpenAsync(ct);
            await using var transaction = await connection.BeginTransactionAsync(ct);
            try { await ValidateTablesAsync(connection, stage, manifest, ct); }
            catch (PostgresException ex) { throw new InvalidDataException("Snapshot database validation failed: " + ex.MessageText, ex); }
            Directory.Delete(Path.Combine(stage, ".snapshot"), true);
            RecoveryDurability.FlushTree(stage, ct);
            RecoveryDurability.Flush(recipes.BaseRoot);
            if (checkpoint is not null) await checkpoint.ReachedAsync("staged", ct);
            // No live changes above this line. Existing users can continue reading/writing during preflight.
            await using var lease = await boundary.EnterAsync(RecoveryAccess.Publish, ct);
            if (File.Exists(JournalPath)) throw new RecoveryBusyException("Resume the interrupted restore before starting another.");
            using var duration = CancellationTokenSource.CreateLinkedTokenSource(ct);
            duration.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Recovery:MaxFreezeSeconds", 30), 1, 3600)));
            ct = duration.Token;
            ct.ThrowIfCancellationRequested();
            var journal = new Journal(operation, snapshotId, recipes.Generation, operation.ToString("N"));
            var pendingJournal = JournalPath + "." + operation.ToString("N");
            try
            {
                await WriteAsync(pendingJournal, journal, CancellationToken.None);
                File.Move(pendingJournal, JournalPath);
                journalWritten = true;
                RecoveryDurability.Flush(recipes.BaseRoot);
            }
            finally { if (File.Exists(pendingJournal)) File.Delete(pendingJournal); }
            try
            {
                if (checkpoint is not null) await checkpoint.ReachedAsync("journal", ct);
                foreach (var table in Tables.Reverse()) await ScalarAsync(connection, $"DELETE FROM public.{table}", ct);
                foreach (var table in Tables) await ScalarAsync(connection, $"INSERT INTO public.{table} SELECT * FROM pg_temp.recovery_{table}", ct);
                await ScalarAsync(connection, "DELETE FROM recipe_votes; DELETE FROM voting_round_state; DELETE FROM recipe_search_filter_state; DELETE FROM recipe_search_affinity_facts; DELETE FROM recipe_search_documents", ct);
                var round = Guid.NewGuid();
                await ScalarAsync(connection, $"INSERT INTO voting_round_state(id,round_id,history_generation,requires_round_identity,week_start_date) VALUES(1,'{round}','{Guid.NewGuid()}',true,(SELECT CASE WHEN count(*)=1 THEN min(week_start_date) END FROM weekly_plans WHERE status=1)); UPDATE weekly_plans SET requires_round_identity=true,last_closed_round_id=NULL,voting_round_id=CASE WHEN status=1 AND (SELECT count(*) FROM weekly_plans WHERE status=1)=1 THEN '{round}'::uuid ELSE NULL END", ct);
                await ScalarAsync(connection, $"UPDATE workflow_tasks SET status=4,error_message='Invalidated by exact recovery' WHERE status IN (0,1,2) AND instance_id IN (SELECT id FROM workflow_instances WHERE workflow_id NOT IN ('dreaming','demo-restore')); UPDATE workflow_instances SET status=3 WHERE status IN (0,1,4) AND workflow_id NOT IN ('dreaming','demo-restore'); UPDATE maintenance_commands SET status='skipped',completed_at='{clock.UtcNow:O}'::timestamptz,last_error='Invalidated by exact recovery' WHERE status IN ('pending','processing')", ct);
                await using (var restored = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(connection).Options))
                {
                    await restored.Database.UseTransactionAsync(transaction, ct);
                    await new RecipeApi.Services.RecipeSearchFilterMaterializer(restored, clock).MaterializeAsync(ct);
                }
                await ScalarAsync(connection, "UPDATE recipe_import_reports SET last_workflow_instance_id=NULL,last_error=CASE WHEN status='reimporting' THEN 'Exact recovery invalidated the unfinished import; retry reimport.' ELSE last_error END,status=CASE WHEN status='reimporting' THEN 'reimport_failed' ELSE status END", ct);
                await QueueDerivedRepairAsync(connection, ct);
                await ScalarAsync(connection, $"INSERT INTO recovery_publication(id,operation_id,snapshot_id) VALUES(1,'{operation}','{snapshotId}') ON CONFLICT(id) DO UPDATE SET operation_id=excluded.operation_id,snapshot_id=excluded.snapshot_id", ct);
                await ActivateAsync(journal.Next);
                if (checkpoint is not null) await checkpoint.ReachedAsync("pointer", ct);
                // Once publication starts, request cancellation must not leave an unclassified outcome.
                await transaction.CommitAsync(CancellationToken.None);
                if (checkpoint is not null) await checkpoint.ReachedAsync("committed", CancellationToken.None);
                CleanupPrevious(journal);
                File.Delete(JournalPath);
                RecoveryDurability.Flush(recipes.BaseRoot);
                return new("completed", "Exact state restored. Old workflow/round identities invalidated; derived search is pending reconciliation.", snapshotId);
            }
            catch
            {
                await transaction.DisposeAsync();
                await ReconcileCoreAsync(CancellationToken.None);
                throw;
            }
        }
        finally
        {
            // Never delete a generation that might be active or awaiting commit reconciliation.
            if (!journalWritten && Directory.Exists(stage)) Directory.Delete(stage, true);
        }
    }

    public async Task<RecoveryResult> ResumeAsync(CancellationToken ct)
    {
        _ = BackupRoot;
        await using var lease = await boundary.EnterAsync(RecoveryAccess.Publish, ct);
        return await ReconcileCoreAsync(ct);
    }
    private async Task<RecoveryResult> ReconcileCoreAsync(CancellationToken ct)
    {
        if (!File.Exists(JournalPath)) return new("available", "No interrupted restore.");
        var journal = JsonSerializer.Deserialize<Journal>(await File.ReadAllTextAsync(JournalPath, ct), Json)
            ?? throw new InvalidDataException("Recovery journal is invalid; household access remains blocked.");
        if (journal.Next != journal.Operation.ToString("N") || journal.Next == journal.Previous || journal.Snapshot == Guid.Empty || !Guid.TryParseExact(journal.Next, "N", out _) || journal.Previous is not null && !Guid.TryParseExact(journal.Previous, "N", out _))
            throw new InvalidDataException("Recovery journal has invalid generations.");
        await using var connection = await OpenAsync(ct);
        var committed = await ScalarAsync(connection, "SELECT operation_id::text FROM recovery_publication WHERE id=1", ct);
        var didCommit = committed == journal.Operation.ToString();
        await ActivateAsync(didCommit ? journal.Next : journal.Previous);
        if (didCommit) CleanupPrevious(journal);
        else
        {
            var abandoned = Path.Combine(recipes.BaseRoot, ".recovery-generations", journal.Next);
            if (Directory.Exists(abandoned)) Directory.Delete(abandoned, true);
        }
        File.Delete(JournalPath);
        RecoveryDurability.Flush(recipes.BaseRoot);
        return new("reconciled", committed == journal.Operation.ToString() ? "Committed generation recovered." : "Prior generation recovered; database transaction did not commit.", journal.Snapshot);
    }
    private void CleanupPrevious(Journal journal)
    {
        if (journal.Previous is not null)
        {
            var old = Path.Combine(recipes.BaseRoot, ".recovery-generations", journal.Previous);
            if (Directory.Exists(old)) Directory.Delete(old, true);
        }
        else
        {
            foreach (var directory in Directory.EnumerateDirectories(recipes.BaseRoot))
                if (Guid.TryParse(Path.GetFileName(directory), out _)) Directory.Delete(directory, true);
        }
    }

    private async Task ActivateAsync(string? generation)
    {
        if (generation is null) { File.Delete(PointerPath); RecoveryDurability.Flush(recipes.BaseRoot); return; }
        if (!Directory.Exists(Path.Combine(recipes.BaseRoot, ".recovery-generations", generation)))
            throw new InvalidDataException("Recovery generation is missing; access remains blocked.");
        var temporary = PointerPath + "." + Guid.NewGuid().ToString("N");
        try
        {
            await using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                await stream.WriteAsync(System.Text.Encoding.UTF8.GetBytes(generation));
                stream.Flush(true);
            }
            File.Move(temporary, PointerPath, true);
            RecoveryDurability.Flush(recipes.BaseRoot);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }

    private async Task<RecoveryManifest> ValidateAndStageAsync(string source, string stage, Guid id, CancellationToken ct)
    {
        RejectLinks(source);
        var manifestPath = Path.Combine(source, "manifest.json");
        if (!File.Exists(manifestPath)) throw new InvalidDataException("Snapshot manifest is missing; legacy exports support merge only.");
        RejectLinks(manifestPath);
        var manifest = JsonSerializer.Deserialize<RecoveryManifest>(await File.ReadAllTextAsync(manifestPath, ct), Json)
            ?? throw new InvalidDataException("Invalid manifest.");
        if (manifest.Version != 1 || manifest.Id != id || manifest.Tables is null || !manifest.Tables.SequenceEqual(Tables) || manifest.Files is null)
            throw new InvalidDataException("Unsupported or incomplete snapshot format.");
        var names = new HashSet<string>(StringComparer.Ordinal);
        foreach (var file in manifest.Files)
        {
            if (file is null || file.Path is null || file.Path.Contains('\\') || Path.IsPathRooted(file.Path) || file.Path.Split('/').Any(p => p is "" or "." or "..") || !names.Add(file.Path) || file.Length < 0)
                throw new InvalidDataException("Unsafe or duplicate inventory path.");
            var original = Path.Combine(source, file.Path);
            if (!File.Exists(original)) throw new InvalidDataException($"Missing required artifact: {file.Path}");
            RejectLinks(original);
            var copied = Path.Combine(stage, file.Path.StartsWith("recipes/", StringComparison.Ordinal) ? file.Path[8..] : ".snapshot/" + file.Path);
            Directory.CreateDirectory(Path.GetDirectoryName(copied)!);
            await CopyFileAsync(original, copied, ct);
            var actual = await InventoryAsync(stage, copied, ct);
            if (actual.Length != file.Length || actual.Sha256 != file.Sha256) throw new InvalidDataException($"Integrity failure: {file.Path}");
        }
        var actualNames = SafeFiles(source).Select(p => Path.GetRelativePath(source, p).Replace('\\', '/')).Where(p => p != "manifest.json").ToHashSet(StringComparer.Ordinal);
        if (!actualNames.SetEquals(names)) throw new InvalidDataException("Snapshot contains unlisted artifacts.");
        foreach (var required in Tables.Select(t => "tables/" + t + ".json").Append("weekly-household-interest.json"))
            if (!names.Contains(required)) throw new InvalidDataException($"Missing required artifact: {required}");
        using var household = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(stage, ".snapshot/tables/recipes.json"), ct));
        var ids = household.RootElement.EnumerateArray().Select(r => r.GetProperty("id").GetGuid().ToString()).ToHashSet();
        foreach (var name in names)
        {
            if (name.StartsWith("recipes/", StringComparison.Ordinal))
            {
                var parts = name.Split('/');
                if (parts.Length < 3 || !ids.Contains(parts[1]) || (parts[2] != "original" && name != $"recipes/{parts[1]}/hero.webp" && name != $"recipes/{parts[1]}/recovery-row.json"))
                    throw new InvalidDataException("Media inventory references an unknown recipe or artifact.");
            }
            else if (name != "weekly-household-interest.json" && !Tables.Any(t => name == "tables/" + t + ".json")) throw new InvalidDataException("Unknown snapshot artifact.");
        }
        foreach (var row in household.RootElement.EnumerateArray())
        {
            var recipeId = row.GetProperty("id").GetGuid().ToString();
            var folder = Path.Combine(stage, recipeId);
            if (row.GetProperty("image_count").GetInt32() < 0) throw new InvalidDataException("Negative image count.");
            for (var i = 0; i < row.GetProperty("image_count").GetInt32(); i++)
                if (ImageExtensions.Count(ext => names.Contains($"recipes/{recipeId}/original/{i}{ext}")) != 1)
                    throw new InvalidDataException($"Recipe {recipeId}: original/page {i} missing or ambiguous.");
            if (!names.Contains($"recipes/{recipeId}/recovery-row.json")) throw new InvalidDataException("Recipe metadata missing.");
            using var metadata = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(folder, "recovery-row.json"), ct));
            if (!JsonElement.DeepEquals(row, metadata.RootElement)) throw new InvalidDataException("Recipe metadata differs from authoritative row.");
            await WriteRecipeMetadataAsync(row, folder, ct);
        }
        return manifest;
    }

    internal static IEnumerable<string> SafeFiles(string directory)
    {
        RejectLinks(directory);
        foreach (var entry in Directory.EnumerateFileSystemEntries(directory))
        {
            RejectLinks(entry);
            if (Directory.Exists(entry)) { foreach (var file in SafeFiles(entry)) yield return file; }
            else yield return entry;
        }
    }
    private async Task WriteRecipeMetadataAsync(JsonElement row, string folder, CancellationToken ct)
    {
        var content = new JsonObject();
        foreach (var property in db.Model.FindEntityType(typeof(Recipe))!.GetProperties())
        {
            if (!row.TryGetProperty(property.GetColumnName(), out var value)) continue;
            var name = JsonNamingPolicy.CamelCase.ConvertName(property.Name);
            content[name] = JsonNode.Parse(value.GetRawText());
        }
        content["finishedDishImageIndex"] = row.GetProperty("finished_dish_index").GetInt32();
        await File.WriteAllTextAsync(Path.Combine(folder, "recipe.info"), content.ToJsonString(), ct);
        content["backupContentVersion"] = 1;
        foreach (var name in new[] { "rawMetadata", "ingredients" })
            if (content[name] is { } value) content[name] = value.ToJsonString();
        await File.WriteAllTextAsync(Path.Combine(folder, "recipe.json"), content.ToJsonString(), ct);
    }

    private async Task QueueDerivedRepairAsync(NpgsqlConnection connection, CancellationToken ct)
    {
        var instance = Guid.NewGuid();
        await using var command = new NpgsqlCommand("""
            INSERT INTO workflow_instances(id,workflow_id,status,parameters,created_at,updated_at)
            VALUES(@instance,'search-reconciliation',0,'{}',@now,@now);
            INSERT INTO workflow_tasks(task_id,instance_id,task_name,processor_name,payload,status,depends_on,created_at,updated_at)
            VALUES(@task,@instance,'reconcile','ReconcileRecipeSearch','{}',1,'{}',@now,@now);
            """, connection);
        command.Parameters.AddWithValue("instance", instance);
        command.Parameters.AddWithValue("task", Guid.NewGuid());
        command.Parameters.AddWithValue("now", clock.UtcNow);
        await command.ExecuteNonQueryAsync(ct);
    }

    private async Task ValidateTablesAsync(NpgsqlConnection connection, string stage, RecoveryManifest manifest, CancellationToken ct)
    {
        if (manifest.Schema != await SchemaAsync(connection, ct)) throw new InvalidDataException("Snapshot schema is incompatible; use the matching application version or migrate a separate copy.");
        foreach (var table in Tables)
        {
            var text = await File.ReadAllTextAsync(Path.Combine(stage, ".snapshot/tables", table + ".json"), ct);
            using var parsed = JsonDocument.Parse(text);
            if (parsed.RootElement.ValueKind != JsonValueKind.Array) throw new InvalidDataException($"{table} must be an explicit array.");
            var columns = (await ScalarAsync(connection, $"SELECT string_agg(column_name,',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='{table}'", ct)).Split(',').ToHashSet();
            foreach (var row in parsed.RootElement.EnumerateArray())
                if (row.ValueKind != JsonValueKind.Object || !columns.SetEquals(row.EnumerateObject().Select(p => p.Name)) || row.EnumerateObject().Count() != columns.Count)
                    throw new InvalidDataException($"{table} row has missing, duplicate or unknown fields.");
            await ScalarAsync(connection, $"CREATE TEMP TABLE recovery_{table} (LIKE public.{table} INCLUDING ALL) ON COMMIT DROP; INSERT INTO pg_temp.recovery_{table} SELECT * FROM jsonb_populate_recordset(NULL::public.{table}, @json)", ct, text);
        }
        var foreignKeys = new List<(string Table, string Definition)>();
        await using (var command = new NpgsqlCommand("SELECT c.conrelid::regclass::text,pg_get_constraintdef(c.oid) FROM pg_constraint c WHERE c.contype='f'", connection))
        await using (var reader = await command.ExecuteReaderAsync(ct))
            while (await reader.ReadAsync(ct)) if (Tables.Contains(reader.GetString(0))) foreignKeys.Add((reader.GetString(0), reader.GetString(1)));
        foreach (var (table, definition) in foreignKeys)
        {
            var rewritten = definition;
            foreach (var referenced in Tables) rewritten = rewritten.Replace("REFERENCES " + referenced + "(", "REFERENCES pg_temp.recovery_" + referenced + "(", StringComparison.Ordinal);
            await ScalarAsync(connection, $"ALTER TABLE pg_temp.recovery_{table} ADD {rewritten}", ct);
        }
        using var history = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(stage, ".snapshot/weekly-household-interest.json"), ct));
        if (history.RootElement.GetProperty("version").GetInt32() != 1 || history.RootElement.GetProperty("generation").GetGuid() == Guid.Empty)
            throw new InvalidDataException("Invalid history sidecar version or generation.");
        var rows = history.RootElement.GetProperty("rows").Deserialize<List<WeeklyHouseholdInterest>>(Json) ?? throw new InvalidDataException("Missing history rows.");
        using var expected = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(stage, ".snapshot/tables/weekly_household_interest.json"), ct));
        if (rows.Count != expected.RootElement.GetArrayLength() || rows.Select(r => (r.WeekStartDate, r.RecipeId)).Distinct().Count() != rows.Count)
            throw new InvalidDataException("History membership mismatch.");
        foreach (var row in expected.RootElement.EnumerateArray())
        {
            var match = rows.SingleOrDefault(r => r.RecipeId == row.GetProperty("recipe_id").GetGuid() && r.WeekStartDate.ToString("yyyy-MM-dd") == row.GetProperty("week_start_date").GetString());
            if (match is null || match.PositiveCount != row.GetProperty("positive_count").GetInt32() || match.Selected != row.GetProperty("selected").GetBoolean() || match.CloseId != row.GetProperty("close_id").GetGuid() || match.CapturedAt != row.GetProperty("captured_at").GetDateTimeOffset())
                throw new InvalidDataException("History content mismatch.");
        }
    }
}
