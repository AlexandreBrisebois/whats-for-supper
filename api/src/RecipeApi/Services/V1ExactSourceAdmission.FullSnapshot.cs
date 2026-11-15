using System.Text.Json;

namespace RecipeApi.Services;

internal sealed partial class V1ExactSourceAdmission
{
    // The separately selected implementation retains the reviewed proposal bytes.
    // Neither a status flag nor a caller-provided digest can select another source.
    internal const string FullSnapshotContinuationSha256 = "8e4692096d14c4554622e6c6b3c9b659c985dbc2506651e6d3273124abbee299";
    private static bool IsFullSnapshotContinuation(byte[] bytes) => Sha(bytes) == FullSnapshotContinuationSha256;

    private static bool SameFullSnapshotCatalog(JsonElement observed, JsonElement expected)
    {
        if (observed.ValueKind != JsonValueKind.Object || expected.ValueKind != JsonValueKind.Object
            || !observed.EnumerateObject().Select(x => x.Name).ToHashSet(StringComparer.Ordinal)
                .SetEquals(expected.EnumerateObject().Select(x => x.Name))) return false;
        foreach (var property in expected.EnumerateObject())
        {
            var actual = observed.GetProperty(property.Name);
            if (property.Name != "triggers")
            {
                if (!JsonElement.DeepEquals(actual, property.Value)) return false;
                continue;
            }
            if (actual.ValueKind != JsonValueKind.Array || property.Value.ValueKind != JsonValueKind.Array) return false;
            // A self-FK's parent/child UPDATE triggers share the old query's
            // table/constraint/tgtype sort key. Compare complete tuples, retaining
            // duplicates; never drop trigger functions, state or other facts.
            var left = actual.EnumerateArray().OrderBy(x => JsonSerializer.Serialize(x), StringComparer.Ordinal).ToArray();
            var right = property.Value.EnumerateArray().OrderBy(x => JsonSerializer.Serialize(x), StringComparer.Ordinal).ToArray();
            if (left.Length != right.Length || !left.Zip(right).All(pair => JsonElement.DeepEquals(pair.First, pair.Second))) return false;
        }
        return true;
    }

    internal static JsonElement FullSnapshotPolicy(string root, byte[] request)
    {
        Require(IsFullSnapshotContinuation(request), "unreviewed full-snapshot request");
        _ = LoadAdmissionPolicy(root, request);
        return Document(request);
    }

    private sealed record SnapshotDisposition(string Disposition, string Owner, string Reason);

    private static SnapshotDisposition ClassifySnapshotTable(string table, bool captured) => captured
        ? new("snapshot-table", "RecoverySnapshotService.CurrentTables(false)", "Complete supported rows are captured; original projection remains bound separately.")
        : table switch
        {
            "workflow_instances" or "workflow_tasks" or "workflow_launch_intents" or "workflow_child_intents"
                or "workflow_reset_intents" or "workflow_processor_attempts" or "workflow_lifecycle_records"
                or "maintenance_command_lifecycle_records" or "maintenance_commands" or "recipe_physical_deletions"
                => new("typed-history-and-original-backup", "FoodVocabularyStore.ObserveInventoryFactsAsync / FoodVocabularyInventoryQualification.WriteHistoryObservations",
                    "Supported operation authority is captured in typed history; raw operational rows stay in the pinned original dump, not a v3 table restore."),
            "recipe_search_affinity_facts" or "recipe_search_documents" or "recipe_search_filter_state"
                => new("derived-excluded", "RecoverySnapshotService.Restore / QueueDerivedRepairAsync",
                    "Exact restore invalidates search projections and queues derived repair; original rows remain protected in the original dump."),
            "recipe_votes" or "voting_round_state"
                => new("transient-voting-excluded", "RecoverySnapshotService.RestoreFromAsync",
                    "Existing exact restore invalidates active voting; aggregate weekly history is captured separately. Original active votes/state remain in the pinned dump."),
            "recovery_publication" => new("coordinator-state-excluded", "RecoverySnapshotService.Restore / Journal",
                "A source publication coordinator cannot become a destination restore journal; original coordinator rows remain in the pinned dump."),
            _ => throw new InvalidDataException("Unexplained original table omission: " + table)
        };

    private static SnapshotDisposition ClassifySnapshotFile(string path, bool copied)
    {
        if (copied) return new("exact-payload-file", path == "weekly-household-interest.json"
            ? "RecoverySnapshotService.CaptureSnapshotContentAsync"
            : "RecoverySnapshotService.CopyRecipeAsync / VocabularyArtifacts",
            "Payload bytes match the immutable original file hash.");
        var parts = path.Split('/');
        if (parts[^1] == ".DS_Store") return new("filesystem-metadata-excluded", "RecoverySnapshotService.CopyRecipeAsync",
            "OS directory metadata has no snapshot artifact role; exact bytes remain in the pinned data archive.");
        if (parts.Length == 3 && parts[0] == "recipes" && Guid.TryParseExact(parts[1], "D", out _))
        {
            if (parts[2] is "recipe.info" or "recipe.json") return new("derived-recipe-export-excluded", "RecoverySnapshotService.CopyRecipeAsync",
                "Snapshot recovery-row.json is regenerated from captured authoritative DB rows; original export envelope bytes remain in the pinned data archive.");
            if (parts[2] == "search.index.json") return new("derived-search-sidecar-excluded", "RecoverySnapshotService.CopyRecipeAsync / QueueDerivedRepairAsync",
                "Search sidecars are derived rather than authoritative media; exact original bytes remain in the pinned data archive.");
        }
        if (parts.Length == 5 && parts[0] == "recipes" && Guid.TryParseExact(parts[1], "D", out _)
            && parts[2] == ".publications" && Guid.TryParseExact(parts[3], "N", out _)
            && parts[4].Length == 69 && parts[4].EndsWith(".json", StringComparison.Ordinal)
            && parts[4][..64].All(Uri.IsHexDigit))
            return new("publication-stage-excluded", "RecipeFilePublicationStore.StageAsync / FoodVocabularyStore.Inventory",
                "Supported publication authority is in captured table/history facts; raw delivery-stage files remain in the pinned archive, not live source rewrites.");
        if (parts.Length == 2 && parts[0] == "reports" && parts[1].StartsWith("dreaming-", StringComparison.Ordinal)
            && parts[1].EndsWith(".md", StringComparison.Ordinal)
            && DateOnly.TryParseExact(parts[1][9..^3], "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out _))
            return new("operational-report-excluded", "ManagementService.GenerateDreamingReportAsync / RecoverySnapshotService.CurrentTables",
                "Historical report files are outside the existing snapshot format; their exact bytes remain preserved by the original data archive.");
        if (parts.Length == 2 && parts[0] == "workflows" && parts[1].EndsWith(".yaml", StringComparison.Ordinal))
            return new("workflow-definition-excluded", "WorkflowRepository.GetWorkflowYamlAsync",
                "Workflow YAML is deployment/configuration input, not a v3 household artifact; original definitions remain unchanged in the pinned archive.");
        if (path == "recipes/.maintenance-hold.json") return new("operator-hold-excluded", "RecoveryBoundary.MaintenanceHeld",
            "Operator hold is outside generation folders and is not activated by snapshot restore; original hold bytes remain untouched and archived.");
        if (path == "canonical-backup.json") return new("management-inventory-excluded", "ManagementService.CanonicalBackup",
            "Management export integrity inventory is distinct from the v3 manifest; original bytes remain in the pinned archive.");
        var table = path switch
        {
            "family-members.json" => "family_members",
            "weekly-plans.json" => "weekly_plans",
            "calendar-events.json" => "calendar_events",
            "ingredient-categories.csv" => "ingredient_categories",
            "recipe-import-reports.json" => "recipe_import_reports",
            "grocery-extras.json" => "grocery_extra_occurrences",
            "supper-servings.json" => "supper_servings",
            _ => null
        };
        if (table is not null) return new("legacy-household-export-excluded", "ManagementService.BackupAsync / RecoverySnapshotService.CurrentTables",
            "The supported authoritative facts are captured in tables/" + table + ".json; legacy export bytes remain untouched in the pinned archive.");
        throw new InvalidDataException("Unexplained original file omission: " + path);
    }

    internal byte[] SnapshotSourceInventory(string[] snapshotTables, IReadOnlyList<RecoveryFile> snapshotFiles)
    {
        var backup = _set.GetProperty("backup").GetProperty("files");
        var readback = Document(BoundArtifact(_repositoryRoot, backup[3]));
        var payload = snapshotFiles.ToDictionary(x => x.Path, StringComparer.Ordinal);
        var files = Utf8.GetString(BoundArtifact(_repositoryRoot, backup[2]))
            .Split('\n', StringSplitOptions.RemoveEmptyEntries).Select(line =>
            {
                var path = line[72..];
                var copied = payload.TryGetValue(path, out var actual);
                Require(!copied || actual!.Sha256.Equals(line[..64], StringComparison.OrdinalIgnoreCase), "copied source file hash differs: " + path);
                var disposition = ClassifySnapshotFile(path, copied);
                return new { path, sha256 = line[..64], disposition = disposition.Disposition, owner = disposition.Owner, reason = disposition.Reason };
            }).ToArray();
        return JsonSerializer.SerializeToUtf8Bytes(new
        {
            version = 2,
            requestSha256 = Sha(_intent),
            tables = readback.GetProperty("tables").EnumerateObject().Select(table =>
            {
                var disposition = ClassifySnapshotTable(table.Name, snapshotTables.Contains(table.Name));
                return new
                {
                    name = table.Name,
                    originalProjectionDigest = table.Value.GetString(),
                    disposition = disposition.Disposition,
                    owner = disposition.Owner,
                    reason = disposition.Reason
                };
            }).ToArray(),
            files,
            backupArtifacts = backup
        });
    }

    private static void LoadFullSnapshotBindings(string root, JsonElement request)
    {
        _ = ExactFile(Path.Combine(root, PolicyDirectory, "V1-FULL-SNAPSHOT-CONTINUATION.json"), FullSnapshotContinuationSha256);
        _ = BoundArtifact(root, request.GetProperty("historyContinuation"));
        _ = BoundArtifact(root, request.GetProperty("historyDelivery"));
        _ = BoundArtifact(root, request.GetProperty("chromiumDisposition"));
        foreach (var artifact in request.GetProperty("authorityBindings").EnumerateArray()) _ = BoundArtifact(root, artifact);
        Require(request.GetProperty("version").GetInt32() == 4
            && request.GetProperty("schemaContinuationSha256").GetString() == SchemaContinuationSha256
            && request.GetProperty("historyContinuation").GetProperty("sha256").GetString() == HistoryContinuationSha256,
            "foreign full-snapshot predecessor");
    }
}
