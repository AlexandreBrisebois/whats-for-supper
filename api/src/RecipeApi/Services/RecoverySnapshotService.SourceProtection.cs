using System.Collections.ObjectModel;
using System.Data;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace RecipeApi.Services;

internal sealed record RecoverySourceProtection(Guid SnapshotId, string ManifestSha256, string SchemaSha256,
    string? Generation, IReadOnlyDictionary<string, JsonElement> Tables, byte[] HistoryBytes,
    IReadOnlyList<RecoveryFile> Files, IReadOnlyList<string> DerivedOmissions);

public partial class RecoverySnapshotService
{
    // Validated source facts support the caller's independently fenced admission.
    internal async Task<RecoverySourceProtection> InspectSourceProtectionAsync(Guid snapshotId, CancellationToken ct)
    {
        var source = await ReadCurrentSnapshotAsync(Path.Combine(BackupRoot, snapshotId.ToString("N")), snapshotId, false, ct);
        await ValidateCurrentSnapshotAsync(source, ct);
        return ProjectSourceProtection(source);
    }

    // Admission compares the protected content itself under the existing read
    // boundary. A later mutator must re-admit its inputs under its own write fence.
    internal async Task<RecoverySourceProtection> RequireSourceCoverageAsync(Guid snapshotId, CancellationToken ct)
    {
        if (!db.Database.IsNpgsql() || db.Database.CurrentTransaction is not null)
            throw new InvalidOperationException("Source coverage requires its own PostgreSQL observation boundary.");
        await using var lease = await boundary.EnterAsync(RecoveryAccess.Snapshot, ct);
        var source = await ReadCurrentSnapshotAsync(Path.Combine(BackupRoot, snapshotId.ToString("N")), snapshotId, false, ct);
        await ValidateCurrentSnapshotAsync(source, ct);
        var generation = recipes.Generation;
        var root = recipes.Root;
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();
        await using (var readOnly = new NpgsqlCommand("SET TRANSACTION READ ONLY", connection))
            await readOnly.ExecuteNonQueryAsync(ct);
        if (await SchemaAsync(connection, ct, source.Manifest.Tables) != source.Manifest.Schema)
            throw new InvalidDataException("Live schema differs from the protected source snapshot.");
        foreach (var table in source.Manifest.Tables)
        {
            var rows = await ScalarAsync(connection,
                $"SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]')::text FROM public.{table} t", ct);
            using var actual = JsonDocument.Parse(rows);
            if (!JsonElement.DeepEquals(source.Tables[table], actual.RootElement))
                throw new InvalidDataException($"Live {table} rows differ from the protected source snapshot.");
        }
        var history = await vocabulary.ObserveRecoveryAsync("snapshot", snapshotId, null, ct);
        if (!source.HistoryBytes.AsSpan().SequenceEqual(history.HistoryBytes))
            throw new InvalidDataException("Live typed history differs from the protected source snapshot.");
        var files = await ReadProtectedLiveFilesAsync(root, ct);
        var protectedSource = source.Manifest.Files.Where(x => IsProtectedSourceFile(x.Path))
            .ToDictionary(x => x.Path, StringComparer.Ordinal);
        RequireSameProtectedFiles(protectedSource, files);
        if (checkpoint is not null) await checkpoint.ReachedAsync("source-protection-observed", ct);
        RequireSameProtectedFiles(files, await ReadProtectedLiveFilesAsync(root, ct));
        var finalHistory = await vocabulary.ObserveRecoveryAsync("snapshot", snapshotId, null, ct);
        if (!history.HistoryBytes.AsSpan().SequenceEqual(finalHistory.HistoryBytes))
            throw new InvalidDataException("Retained history or publication journals changed during coverage inspection.");
        var finalSource = await ReadCurrentSnapshotAsync(source.Root, snapshotId, false, ct);
        if (generation != recipes.Generation || !source.ManifestBytes.AsSpan().SequenceEqual(finalSource.ManifestBytes))
            throw new InvalidDataException("The source snapshot or live generation changed during coverage inspection.");
        await transaction.CommitAsync(ct);
        return ProjectSourceProtection(source);
    }

    private static RecoverySourceProtection ProjectSourceProtection(CurrentSnapshotSource source)
    {
        var tables = source.Tables.ToDictionary(x => x.Key, x => x.Value.Clone(), StringComparer.Ordinal);
        var files = source.Manifest.Files.Where(x => IsProtectedSourceFile(x.Path)).OrderBy(x => x.Path, StringComparer.Ordinal).ToArray();
        return new(source.Manifest.Id, FoodVocabularyDefinitions.Sha256(source.ManifestBytes), source.Manifest.Schema,
            source.Index.Generation, new ReadOnlyDictionary<string, JsonElement>(tables), source.HistoryBytes.ToArray(),
            Array.AsReadOnly(files), Array.AsReadOnly(new[] { "recipe metadata and search sidecars" }));
    }

    private static bool IsProtectedSourceFile(string path)
    {
        const string vocabularyPrefix = "recipes/.household/food-vocabulary/";
        if (path.StartsWith(vocabularyPrefix, StringComparison.Ordinal))
            return path != "recipes/" + FoodVocabularyStore.RetainedHistoryPath;
        var parts = path.Split('/');
        return parts.Length >= 3 && parts[0] == "recipes" && Guid.TryParseExact(parts[1], "D", out _)
            && (parts.Length >= 4 && parts[2] == "original" || parts.Length == 3 && parts[2] == "hero.webp");
    }

    private static async Task<IReadOnlyDictionary<string, RecoveryFile>> ReadProtectedLiveFilesAsync(string root, CancellationToken ct)
    {
        RejectLinks(root);
        var files = new Dictionary<string, RecoveryFile>(StringComparer.Ordinal);
        foreach (var file in SafeFiles(root).Order(StringComparer.Ordinal))
        {
            var path = "recipes/" + Path.GetRelativePath(root, file).Replace('\\', '/');
            if (IsProtectedSourceFile(path)) files.Add(path, (await InventoryAsync(root, file, ct)) with { Path = path });
        }
        return files;
    }

    private static void RequireSameProtectedFiles(IReadOnlyDictionary<string, RecoveryFile> expected, IReadOnlyDictionary<string, RecoveryFile> actual)
    {
        if (!expected.Keys.ToHashSet(StringComparer.Ordinal).SetEquals(actual.Keys)
            || expected.Any(x => x.Value != actual[x.Key]))
            throw new InvalidDataException("Protected original, hero or vocabulary bytes differ from the captured source.");
    }
}
