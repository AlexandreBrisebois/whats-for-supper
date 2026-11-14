using System.Text;
using System.Text.Json;
using RecipeApi.Models;

namespace RecipeApi.Services;

internal sealed record InspectedRecoverySnapshotIdentity(Guid SnapshotId, string ManifestSha256, string? Generation,
    string VocabularyIndexSha256, IReadOnlyList<FoodVocabularyReference> References);

public partial class RecoverySnapshotService
{
    private sealed record CurrentSnapshotSource(string Root, RecoveryManifest Manifest, byte[] ManifestBytes,
        byte[] IndexBytes, byte[] HistoryBytes, FoodVocabularyRecoveryIndex Index,
        IReadOnlyList<FoodVocabularyContextFacts> Contexts, FoodVocabularyCapture[] Documents,
        IReadOnlyDictionary<string, JsonElement> Tables, IReadOnlyDictionary<string, byte[]> Artifacts);

    private static string[] CurrentTables(bool demo) => (demo ? DemoTables : Tables).Concat(["household_food_overrides"]).ToArray();
    private static bool IsCurrentFormat(int version, bool demo) => demo ? version == 4 : version == 3;
    private static string[] FormatTables(int version, bool demo) => (version, demo) switch
    {
        (1, false) => Tables,
        (2, true) => DemoTables,
        (3, false) => CurrentTables(false),
        (4, true) => CurrentTables(true),
        _ => throw new InvalidDataException("Unsupported snapshot format.")
    };

    internal async Task<InspectedRecoverySnapshotIdentity> InspectSnapshotIdentityAsync(Guid snapshotId, CancellationToken ct)
    {
        var source = await ReadCurrentSnapshotAsync(Path.Combine(BackupRoot, snapshotId.ToString("N")), snapshotId, false, ct);
        return new(snapshotId, FoodVocabularyDefinitions.Sha256(source.ManifestBytes), source.Index.Generation,
            FoodVocabularyDefinitions.Sha256(source.IndexBytes), Array.AsReadOnly(source.Documents.Select(x => x.Reference).ToArray()));
    }

    private static bool IsSnapshotMedia(string path)
    {
        var parts = path.Split('/');
        return parts.Length >= 3 && parts[0] == "recipes"
            && (parts[2] == "original" || parts.Length == 3 && parts[2] == "hero.webp");
    }

    private static string SnapshotText(byte[] bytes)
    {
        try { return new UTF8Encoding(false, true).GetString(bytes); }
        catch (DecoderFallbackException error) { throw new InvalidDataException("Snapshot artifact is not valid UTF-8.", error); }
    }

    private async Task<CurrentSnapshotSource> ReadCurrentSnapshotAsync(string root, Guid snapshotId, bool demo, CancellationToken ct)
    {
        try { return await ReadCurrentSnapshotCoreAsync(root, snapshotId, demo, ct); }
        catch (Exception error) when (error is JsonException or KeyNotFoundException or FormatException or InvalidOperationException or OverflowException)
        { throw new InvalidDataException("Snapshot artifacts have an invalid content shape.", error); }
    }

    private async Task<CurrentSnapshotSource> ReadCurrentSnapshotCoreAsync(string root, Guid snapshotId, bool demo, CancellationToken ct)
    {
        RejectLinks(root);
        if (demo && !Directory.Exists(Path.Combine(root, "recipes")))
            throw new InvalidDataException("Demo asset directory is missing; recapture the prepared baseline.");
        var manifestPath = Path.Combine(root, "manifest.json");
        RejectLinks(manifestPath);
        if (!File.Exists(manifestPath)) throw new InvalidDataException("Snapshot manifest is missing.");
        var manifestBytes = await File.ReadAllBytesAsync(manifestPath, ct);
        var manifest = FoodVocabularyDefinitions.ReadStrict<RecoveryManifest>(SnapshotText(manifestBytes));
        FoodVocabularyDefinitions.Require(IsCurrentFormat(manifest.Version, demo) && manifest.Id == snapshotId && snapshotId != Guid.Empty
            && manifest.CapturedAt != default && manifest.Schema is { Length: 64 } && manifest.Files is not null
            && manifest.Tables is not null && manifest.Tables.SequenceEqual(CurrentTables(demo)));
        var entries = new Dictionary<string, RecoveryFile>(StringComparer.Ordinal);
        var artifacts = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        foreach (var file in manifest.Files)
        {
            FoodVocabularyDefinitions.Require(file is not null && file.Path is not null && !file.Path.Contains('\\')
                && !Path.IsPathRooted(file.Path) && !file.Path.Split('/').Any(x => x is "" or "." or "..")
                && file.Path != "manifest.json" && file.Length >= 0 && entries.TryAdd(file.Path, file));
            var path = Path.Combine(root, file.Path);
            RejectLinks(path);
            if (!File.Exists(path)) throw new InvalidDataException("A required snapshot artifact is missing.");
            if (IsSnapshotMedia(file.Path))
                FoodVocabularyDefinitions.Require(await InventoryAsync(root, path, ct) == file);
            else
            {
                var bytes = await File.ReadAllBytesAsync(path, ct);
                FoodVocabularyDefinitions.Require(bytes.LongLength == file.Length
                    && Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(bytes)) == file.Sha256);
                artifacts.Add(file.Path, bytes);
            }
        }
        FoodVocabularyDefinitions.Require(SafeFiles(root).Select(x => Path.GetRelativePath(root, x).Replace('\\', '/'))
            .Where(x => x != "manifest.json").ToHashSet(StringComparer.Ordinal).SetEquals(entries.Keys));
        byte[] ReadArtifact(string name)
        {
            FoodVocabularyDefinitions.Require(artifacts.TryGetValue(name, out var bytes));
            return bytes;
        }
        var indexBytes = ReadArtifact("vocabulary/index.json");
        var index = FoodVocabularyInventoryQualification.ReadRecoveryIndex(indexBytes);
        FoodVocabularyDefinitions.Require(index.SnapshotId == snapshotId);
        var historyBytes = ReadArtifact("vocabulary/history-observations.json");
        var documents = new List<FoodVocabularyCapture>();
        foreach (var document in index.Documents)
            documents.Add(new(document.Reference, 1, ReadArtifact(document.Path)));
        var contexts = FoodVocabularyInventoryQualification.ValidateRecoveryArtifacts(indexBytes, historyBytes, documents, demo ? "demo" : "snapshot");
        var current = contexts.Single(x => x.Context.Kind == (demo ? "demo" : "snapshot") && x.Context.SnapshotId == snapshotId && x.Context.Generation == index.Generation).Facts;
        var tables = new Dictionary<string, JsonElement>(StringComparer.Ordinal);
        foreach (var table in manifest.Tables)
        {
            var bytes = ReadArtifact("tables/" + table + ".json");
            var rows = FoodVocabularyDefinitions.ReadStrict<JsonElement>(SnapshotText(bytes));
            FoodVocabularyDefinitions.Require(rows.ValueKind == JsonValueKind.Array);
            tables.Add(table, rows);
        }
        ValidateSnapshotVocabularyRows(tables, current, demo);
        var recipeRows = tables["recipes"].EnumerateArray().ToArray();
        var ids = recipeRows.Select(x => x.GetProperty("id").GetGuid().ToString("D")).ToHashSet(StringComparer.Ordinal);
        FoodVocabularyDefinitions.Require(ids.Count == recipeRows.Length && !ids.Contains(Guid.Empty.ToString("D")));
        var allowed = manifest.Tables.Select(x => "tables/" + x + ".json").Concat(index.Documents.Select(x => x.Path))
            .Concat(["vocabulary/index.json", "vocabulary/history-observations.json", "weekly-household-interest.json"]).ToHashSet(StringComparer.Ordinal);
        if (demo)
        {
            allowed.Add("dispositions.json");
            var dispositions = FoodVocabularyDefinitions.ReadStrict<Dictionary<string, string>>(SnapshotText(ReadArtifact("dispositions.json")));
            FoodVocabularyDefinitions.Require(dispositions.OrderBy(x => x.Key).SequenceEqual(CurrentDemoDispositions.OrderBy(x => x.Key)));
        }
        foreach (var name in entries.Keys)
        {
            if (allowed.Contains(name)) continue;
            var parts = name.Split('/');
            FoodVocabularyDefinitions.Require(parts.Length >= 3 && parts[0] == "recipes" && ids.Contains(parts[1])
                && (parts[2] == "original" && parts.Length >= 4 || parts.Length == 3 && parts[2] is "hero.webp" or "recovery-row.json"));
        }
        FoodVocabularyDefinitions.Require(allowed.All(entries.ContainsKey));
        foreach (var row in recipeRows)
        {
            var id = row.GetProperty("id").GetGuid().ToString("D");
            var count = row.GetProperty("image_count").GetInt32();
            FoodVocabularyDefinitions.Require(count >= 0);
            for (var image = 0; image < count; image++)
                FoodVocabularyDefinitions.Require(ImageExtensions.Count(ext => entries.ContainsKey($"recipes/{id}/original/{image}{ext}")) == 1);
            var metadata = FoodVocabularyDefinitions.ReadStrict<JsonElement>(SnapshotText(ReadArtifact($"recipes/{id}/recovery-row.json")));
            FoodVocabularyDefinitions.Require(JsonElement.DeepEquals(row, metadata));
        }
        return new(root, manifest, manifestBytes, indexBytes, historyBytes, index, contexts, documents.ToArray(), tables, artifacts);
    }

    // The same schema, closed rows, foreign keys and weekly-history validation
    // serves restore, operator preflight and migration source admission. Only
    // transaction-local tables are created; accepted bytes never require a stage.
    private async Task ValidateCurrentSnapshotAsync(CurrentSnapshotSource source, CancellationToken ct)
    {
        await using var connection = await OpenAsync(ct);
        await using var transaction = await connection.BeginTransactionAsync(ct);
        try { await ValidateTablesAsync(connection, string.Empty, source.Manifest, ct, source.Manifest.Version == 4, source.Artifacts); }
        catch (Npgsql.PostgresException error) when (error.SqlState.StartsWith("22", StringComparison.Ordinal)
            || error.SqlState.StartsWith("23", StringComparison.Ordinal))
        { throw new InvalidDataException("Snapshot database validation failed: " + error.MessageText, error); }
    }

    private async Task RequireUnchangedSnapshotAsync(CurrentSnapshotSource source, CancellationToken ct)
    {
        RejectLinks(source.Root);
        var manifestPath = Path.Combine(source.Root, "manifest.json");
        RejectLinks(manifestPath);
        if (!File.Exists(manifestPath) || !(await File.ReadAllBytesAsync(manifestPath, ct)).AsSpan().SequenceEqual(source.ManifestBytes))
            throw new InvalidDataException("Snapshot source changed during restore staging.");
        var actual = SafeFiles(source.Root).Select(x => Path.GetRelativePath(source.Root, x).Replace('\\', '/'))
            .Where(x => x != "manifest.json").ToHashSet(StringComparer.Ordinal);
        if (!actual.SetEquals(source.Manifest.Files.Select(x => x.Path))
            || source.Manifest.Version == 4 && !Directory.Exists(Path.Combine(source.Root, "recipes")))
            throw new InvalidDataException("Snapshot source inventory changed during restore staging.");
        foreach (var file in source.Manifest.Files)
        {
            var path = Path.Combine(source.Root, file.Path);
            RejectLinks(path);
            if (!File.Exists(path)) throw new InvalidDataException("Snapshot source artifact disappeared during restore staging.");
            if (source.Artifacts.TryGetValue(file.Path, out var bytes))
            {
                if (!(await File.ReadAllBytesAsync(path, ct)).AsSpan().SequenceEqual(bytes))
                    throw new InvalidDataException("Snapshot source bytes changed during restore staging.");
            }
            else if (await InventoryAsync(source.Root, path, ct) != file)
                throw new InvalidDataException("Snapshot source media changed during restore staging.");
        }
    }

    private static void ValidateSnapshotVocabularyRows(IReadOnlyDictionary<string, JsonElement> tables,
        FoodVocabularyInventoryFacts current, bool demo)
    {
        static string? JsonColumn(JsonElement row, string name) => row.GetProperty(name).ValueKind == JsonValueKind.Null
            ? null : CanonicalRecipeContentStore.NormalizeJson(row.GetProperty(name).GetRawText());
        static string? Normal(string? raw) => raw is null ? null : CanonicalRecipeContentStore.NormalizeJson(raw);
        static void Same<T, TKey>(IEnumerable<T> left, IEnumerable<T> right, Func<T, TKey> key) where TKey : IComparable<TKey> =>
            FoodVocabularyDefinitions.Require(left.OrderBy(key).SequenceEqual(right.OrderBy(key)));
        var membership = tables["family_settings"].EnumerateArray().Where(x => x.GetProperty("key").GetString() == "food_vocabulary_publication").ToArray();
        FoodVocabularyDefinitions.Require(membership.Length <= 1 && (membership.Length == 0 ? current.Membership.RawJson is null
            : JsonColumn(membership[0], "value") == Normal(current.Membership.RawJson)));
        Same(tables["recipes"].EnumerateArray().Select(x => (Id: x.GetProperty("id").GetGuid(), Content: JsonColumn(x, "canonical_content"), Evidence: JsonColumn(x, "food_mapping_evidence"))),
            current.Recipes.Select(x => (Id: x.RecipeId, Content: Normal(x.CanonicalContent), Evidence: Normal(x.FoodMappingEvidence))), x => x.Id);
        Same(tables["canonical_recipe_operations"].EnumerateArray().Select(x => (Recipe: x.GetProperty("recipe_id").GetGuid(), Operation: x.GetProperty("operation_id").GetGuid(),
                Hash: x.GetProperty("input_hash").GetString(), Original: Normal(x.GetProperty("original_request").GetString()), Result: JsonColumn(x, "result"), At: x.GetProperty("created_at").GetDateTimeOffset())),
            current.CanonicalOperations.Select(x => (Recipe: x.RecipeId, Operation: x.OperationId, Hash: (string?)x.InputHash,
                Original: Normal(x.OriginalRequest), Result: Normal(x.Result), At: x.CreatedAt)), x => (x.Recipe, x.Operation));
        Same(tables["recipe_file_publications"].EnumerateArray().Select(x => (Recipe: x.GetProperty("recipe_id").GetGuid(), Operation: x.GetProperty("operation_id").GetGuid(),
                Hash: x.GetProperty("input_hash").GetString(), Payload: JsonColumn(x, "payload"), Result: x.GetProperty("result_hash").GetString(), Delivered: x.GetProperty("delivered").GetBoolean(), At: x.GetProperty("created_at").GetDateTimeOffset())),
            current.Publications.Select(x => (Recipe: x.RecipeId, Operation: x.OperationId, Hash: (string?)x.InputHash,
                Payload: Normal(x.Payload), Result: (string?)x.ResultHash, Delivered: x.Delivered, At: x.CreatedAt)), x => (x.Recipe, x.Operation));
        var overrides = tables["household_food_overrides"].EnumerateArray().Select(x => new FoodVocabularyScopedOverrideObservation(
            x.GetProperty("id").GetGuid(), x.GetProperty("revision").GetString()!, x.GetProperty("food_id").Deserialize<Guid?>(),
            x.GetProperty("dictionary_revision").GetString(), x.GetProperty("document_revision").ValueKind == JsonValueKind.Null
                && x.GetProperty("document_sha256").ValueKind == JsonValueKind.Null ? null : new(x.GetProperty("document_revision").GetString()!, x.GetProperty("document_sha256").GetString()!),
            x.GetProperty("fallback_key").GetString(), x.GetProperty("shopping_name").GetString(), x.GetProperty("grocery_section").GetString(),
            x.GetProperty("protected_fields").Deserialize<string[]>()!, x.GetProperty("presentation_sequence").GetString()!,
            x.GetProperty("created_at").GetDateTimeOffset(), x.GetProperty("updated_at").GetDateTimeOffset())).ToArray();
        FoodVocabularyDefinitions.Require(JsonSerializer.Serialize(overrides.OrderBy(x => x.Id), Json)
            == JsonSerializer.Serialize(current.Overrides.Rows!.OrderBy(x => x.Id), Json));
        if (!demo)
            Same(tables["recipe_repair_intents"].EnumerateArray().Select(x => (Id: x.GetProperty("id").GetGuid(), Recipe: x.GetProperty("recipe_id").GetGuid(),
                    Payload: JsonColumn(x, "payload"), Hash: x.GetProperty("input_hash").GetString(), At: x.GetProperty("created_at").GetDateTimeOffset())),
                current.History.Repairs.Select(x => (Id: x.Id, Recipe: x.RecipeId, Payload: Normal(x.Payload), Hash: (string?)x.InputHash, At: x.CreatedAt)), x => x.Id);
    }
}
