using System.Data;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

internal sealed record V1SnapshotStageInspection(Guid SnapshotId, Guid OperationId, string Generation,
    string RequestSha256, string ManifestSha256, string HistorySha256, string IndexSha256,
    string LineageSha256, string SourceInventorySha256, int Tables, int Files, int Receipts);

public partial class RecoverySnapshotService
{
    private sealed record AttestedSnapshotInspection(V1SnapshotStageInspection Identity, CurrentSnapshotSource Snapshot,
        string Envelope, IReadOnlyDictionary<string, byte[]> AuthorityBytes, AttestedCoverageInspection? Coverage = null);
    private sealed record V1SnapshotAttempt(int Version, string RequestSha256, DateTimeOffset CapturedAt);
    private static readonly string[] SnapshotAuthorityFiles = ["attempt.json", "source-lineage.json", "source-inventory.json", "preparation-complete"];

    private static string SnapshotTaskPath(string repositoryRoot, JsonElement request, string property)
    {
        var path = Path.GetFullPath(Path.Combine(repositoryRoot, request.GetProperty(property).GetString()!));
        RejectLinks(path);
        return path;
    }

    // All row/history reads share this transaction. Its SHARE locks also protect
    // the separate, independently read-only admission connection's observations.
    private async Task<V1SnapshotStageInspection> WithAttestedSnapshotSourceAsync(string repositoryRoot, string copyDataRoot, byte[] request,
        Func<AttestedHistorySource, NpgsqlConnection, JsonElement, CancellationToken, Task<AttestedSnapshotInspection>> inspect, CancellationToken ct)
    {
        using var duration = CancellationTokenSource.CreateLinkedTokenSource(ct);
        duration.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Recovery:MaxFreezeSeconds", 30), 1, 3600)));
        ct = duration.Token;
        RequireAttestedHistoryConfiguration(copyDataRoot);
        var observedRoot = recipes.Root;
        var observedGeneration = recipes.Generation;
        var intent = V1ExactSourceAdmission.FullSnapshotPolicy(repositoryRoot, request);
        await using var lease = await boundary.EnterAsync(RecoveryAccess.Snapshot, ct);
        using var binding = boundary.BindLease(lease);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();
        await ScalarAsync(connection, "SET LOCAL search_path = pg_catalog, public, pg_temp", ct);
        using var catalog = JsonDocument.Parse(await File.ReadAllBytesAsync(Path.Combine(repositoryRoot,
            intent.GetProperty("sourceSchema").GetProperty("path").GetString()!), ct));
        var tables = catalog.RootElement.GetProperty("tables").EnumerateArray().Select(x => x[0].GetString()!)
            .Concat(CurrentTables(false)).Concat(VocabularyObservationTables).Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal);
        var quoted = tables.Select(x => "public." + new NpgsqlCommandBuilder().QuoteIdentifier(x));
        await ScalarAsync(connection, "LOCK TABLE " + string.Join(',', quoted) + " IN SHARE MODE", ct);
        await using var admission = await OpenAsync(ct);
        var attestation = await V1ExactSourceAdmission.InspectAsync(repositoryRoot, admission, copyDataRoot, request, checkpoint, ct);
        var authority = attestation.RecoveryHistoryContext(request);
        var observation = await vocabulary.ObserveRecoveryAsync("snapshot", authority.SnapshotId, authority.OperationId, ct, authority);
        var source = new AttestedHistorySource(attestation, authority, observation);
        if (checkpoint is not null) await checkpoint.ReachedAsync("v1-snapshot-locked", ct);
        var result = await inspect(source, connection, intent, ct);
        await RevalidateSnapshotSourceAsync(source, repositoryRoot, copyDataRoot, request, admission, ct);
        // Preserve the inspected bytes across final source re-admission. Reopening
        // files into a new "expected" observation here would trust the mutation.
        await RequireUnchangedSnapshotAsync(result.Snapshot, ct);
        RequireSnapshotEnvelope(result.Envelope, complete: true);
        await RequireRetainedHistoryArtifactsAsync(result.Envelope, result.AuthorityBytes, ct);
        if (result.Coverage is not null)
            await RequireRetainedCoverageAsync(result.Coverage, ct);
        FoodVocabularyDefinitions.Require(observedRoot == recipes.Root && observedGeneration == recipes.Generation);
        await transaction.RollbackAsync(ct);
        return result.Identity;
    }

    private async Task RevalidateSnapshotSourceAsync(AttestedHistorySource source, string repositoryRoot,
        string copyDataRoot, byte[] request, NpgsqlConnection admission, CancellationToken ct)
    {
        var final = await V1ExactSourceAdmission.InspectAsync(repositoryRoot, admission, copyDataRoot, request, checkpoint, ct);
        FoodVocabularyDefinitions.Require(source.Attestation.LineageBytes.AsSpan().SequenceEqual(final.LineageBytes));
        var observation = await vocabulary.ObserveRecoveryAsync("snapshot", source.Authority.SnapshotId,
            source.Authority.OperationId, ct, source.Authority);
        FoodVocabularyDefinitions.Require(source.Observation.HistoryBytes.AsSpan().SequenceEqual(observation.HistoryBytes));
        _ = V1ExactSourceAdmission.FullSnapshotPolicy(repositoryRoot, request);
    }

    private static void RequireSnapshotFiles(string root, IEnumerable<string> expected, bool complete)
    {
        var actual = SafeFiles(root).Select(x => Path.GetRelativePath(root, x).Replace('\\', '/')).ToHashSet(StringComparer.Ordinal);
        var final = expected.ToHashSet(StringComparer.Ordinal);
        FoodVocabularyDefinitions.Require(complete ? actual.SetEquals(final)
            : actual.IsSubsetOf(final.Concat(final.Select(x => x + ".pending"))));
    }

    private static void RequireSnapshotEnvelope(string root, bool complete)
    {
        var actual = SafeFiles(root).Select(x => Path.GetRelativePath(root, x).Replace('\\', '/')).ToArray();
        var final = SnapshotAuthorityFiles.Append("complete.json").ToHashSet(StringComparer.Ordinal);
        FoodVocabularyDefinitions.Require(complete ? actual.ToHashSet(StringComparer.Ordinal).SetEquals(final)
            : actual.All(x => final.Contains(x) || x.EndsWith(".pending", StringComparison.Ordinal) && final.Contains(x[..^8])
                || x.StartsWith("capture.pending/", StringComparison.Ordinal)));
    }

    private async Task<V1SnapshotAttempt> SnapshotAttemptAsync(string root, byte[] request, CancellationToken ct)
    {
        var path = Path.Combine(root, "attempt.json");
        RejectLinks(path);
        if (!File.Exists(path))
        {
            var pending = path + ".pending";
            RejectLinks(pending);
            FoodVocabularyDefinitions.Require(Directory.EnumerateFileSystemEntries(root).All(x => x == pending));
            byte[] bytes;
            if (File.Exists(pending))
            {
                bytes = await File.ReadAllBytesAsync(pending, ct);
                RequireSnapshotAttempt(bytes, request);
            }
            else bytes = JsonSerializer.SerializeToUtf8Bytes(new V1SnapshotAttempt(1,
                FoodVocabularyDefinitions.Sha256(request), clock.UtcNow), Json);
            await RetainHistoryArtifactAsync(path, bytes, ct);
        }
        return await ReadSnapshotAttemptAsync(root, request, ct);
    }

    private static async Task<V1SnapshotAttempt> ReadSnapshotAttemptAsync(string root, byte[] request, CancellationToken ct)
    {
        var path = Path.Combine(root, "attempt.json");
        RejectLinks(path);
        return RequireSnapshotAttempt(await File.ReadAllBytesAsync(path, ct), request);
    }

    private static V1SnapshotAttempt RequireSnapshotAttempt(byte[] bytes, byte[] request)
    {
        var attempt = FoodVocabularyDefinitions.ReadStrict<V1SnapshotAttempt>(SnapshotText(bytes));
        FoodVocabularyDefinitions.Require(attempt.Version == 1 && attempt.RequestSha256 == FoodVocabularyDefinitions.Sha256(request)
            && attempt.CapturedAt != default);
        return attempt;
    }

    private async Task RequireSnapshotMatchesSourceAsync(CurrentSnapshotSource snapshot, AttestedHistorySource source,
        NpgsqlConnection connection, CancellationToken ct)
    {
        FoodVocabularyDefinitions.Require(snapshot.Index.Generation == source.Authority.Generation
            && snapshot.HistoryBytes.AsSpan().SequenceEqual(source.Observation.HistoryBytes));
        foreach (var table in snapshot.Manifest.Tables)
        {
            var rows = await ScalarAsync(connection,
                $"SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]')::text FROM public.{table} t", ct);
            FoodVocabularyDefinitions.Require(SnapshotText(snapshot.Artifacts["tables/" + table + ".json"]) == rows);
        }
        var originals = await ReadProtectedLiveFilesAsync(recipes.Root, ct);
        RequireSameProtectedFiles(originals, snapshot.Manifest.Files.Where(x => IsProtectedSourceFile(x.Path))
            .ToDictionary(x => x.Path, StringComparer.Ordinal));
        source.Authority.RequireSingleContext(snapshot.Contexts);
    }

    private static V1SnapshotStageInspection SnapshotStageIdentity(CurrentSnapshotSource snapshot,
        AttestedHistorySource source, byte[] request, byte[] inventory) => new(source.Authority.SnapshotId,
            source.Authority.OperationId, source.Authority.Generation, FoodVocabularyDefinitions.Sha256(request),
            FoodVocabularyDefinitions.Sha256(snapshot.ManifestBytes), FoodVocabularyDefinitions.Sha256(snapshot.HistoryBytes),
            FoodVocabularyDefinitions.Sha256(snapshot.IndexBytes), FoodVocabularyDefinitions.Sha256(source.Attestation.LineageBytes),
            FoodVocabularyDefinitions.Sha256(inventory), snapshot.Manifest.Tables.Length, snapshot.Manifest.Files.Length,
            source.Attestation.ReceiptCount);

    private static async Task<byte[]> SnapshotCompletionAsync(CurrentSnapshotSource snapshot, string envelope,
        V1SnapshotStageInspection identity, CancellationToken ct)
    {
        var authority = new List<RecoveryFile>();
        foreach (var name in SnapshotAuthorityFiles) authority.Add(await InventoryAsync(envelope, Path.Combine(envelope, name), ct));
        return JsonSerializer.SerializeToUtf8Bytes(new
        {
            version = 1,
            identity,
            snapshot.Manifest.CapturedAt,
            snapshot.Manifest.Schema,
            payloadFiles = snapshot.Manifest.Files.Append(await InventoryAsync(snapshot.Root, Path.Combine(snapshot.Root, "manifest.json"), ct)).ToArray(),
            authorityFiles = authority.ToArray()
        }, Json);
    }

    private async Task<AttestedSnapshotInspection> InspectAttestedSnapshotAsync(string stage, string envelope,
        AttestedHistorySource source, NpgsqlConnection connection, byte[] request, bool requireCompletion, CancellationToken ct)
    {
        RequireSnapshotEnvelope(envelope, complete: requireCompletion);
        var attempt = await ReadSnapshotAttemptAsync(envelope, request, ct);
        var snapshot = await ReadCurrentSnapshotAsync(stage, source.Authority.SnapshotId, false, ct, source.Authority);
        FoodVocabularyDefinitions.Require(snapshot.Manifest.CapturedAt == attempt.CapturedAt);
        await ValidateCurrentSnapshotAsync(snapshot, ct);
        await RequireSnapshotMatchesSourceAsync(snapshot, source, connection, ct);
        var inventory = source.Attestation.SnapshotSourceInventory(snapshot.Manifest.Tables, snapshot.Manifest.Files);
        var expected = new Dictionary<string, byte[]>(StringComparer.Ordinal)
        {
            ["source-lineage.json"] = source.Attestation.LineageBytes,
            ["source-inventory.json"] = inventory,
            ["preparation-complete"] = Encoding.UTF8.GetBytes(V1ExactSourceAdmission.FullSnapshotContinuationSha256 + "\n")
        };
        await RequireRetainedHistoryArtifactsAsync(envelope, expected, ct);
        var identity = SnapshotStageIdentity(snapshot, source, request, inventory);
        if (requireCompletion)
            await RequireRetainedHistoryArtifactsAsync(envelope, new Dictionary<string, byte[]>
            { ["complete.json"] = await SnapshotCompletionAsync(snapshot, envelope, identity, ct) }, ct);
        if (checkpoint is not null) await checkpoint.ReachedAsync("v1-snapshot-inspected", ct);
        await RequireUnchangedSnapshotAsync(snapshot, ct);
        await RequireRetainedHistoryArtifactsAsync(envelope, expected, ct);
        FoodVocabularyDefinitions.Require(attempt == await ReadSnapshotAttemptAsync(envelope, request, ct));
        if (requireCompletion)
        {
            RequireSnapshotEnvelope(envelope, complete: true);
            await RequireRetainedHistoryArtifactsAsync(envelope, new Dictionary<string, byte[]>
            { ["complete.json"] = await SnapshotCompletionAsync(snapshot, envelope, identity, ct) }, ct);
        }
        var frozenAuthority = expected.ToDictionary(x => x.Key, x => x.Value.ToArray(), StringComparer.Ordinal);
        frozenAuthority.Add("attempt.json", await File.ReadAllBytesAsync(Path.Combine(envelope, "attempt.json"), ct));
        if (requireCompletion) frozenAuthority.Add("complete.json", await SnapshotCompletionAsync(snapshot, envelope, identity, ct));
        return new(identity, snapshot, envelope, frozenAuthority);
    }

    internal Task<V1SnapshotStageInspection> StageAttestedV1SnapshotAsync(string repositoryRoot, string copyDataRoot,
        byte[] request, CancellationToken ct)
    {
        if (!OperatingSystem.IsLinux()) throw new PlatformNotSupportedException("Snapshot staging requires Linux recovery durability.");
        return WithAttestedSnapshotSourceAsync(repositoryRoot, copyDataRoot, request, async (source, connection, intent, token) =>
        {
            var stage = SnapshotTaskPath(repositoryRoot, intent, "stagingRelativePath");
            var envelope = SnapshotTaskPath(repositoryRoot, intent, "authorityRelativePath");
            Directory.CreateDirectory(envelope);
            RequireSnapshotEnvelope(envelope, complete: false);
            var attempt = await SnapshotAttemptAsync(envelope, request, token);
            if (File.Exists(Path.Combine(envelope, "complete.json")))
                return await InspectAttestedSnapshotAsync(stage, envelope, source, connection, request, true, token);
            var scratch = Path.Combine(envelope, "capture.pending");
            if (Directory.Exists(scratch))
            {
                var allowed = CurrentTables(false).Select(x => "tables/" + x + ".json")
                    .Concat(source.Observation.Live.Recipes.Select(x => "recipes/" + x.RecipeId.ToString("D") + "/recovery-row.json"))
                    .Concat((await ReadProtectedLiveFilesAsync(recipes.Root, token)).Keys)
                    .Concat(["manifest.json", "weekly-household-interest.json", "vocabulary/index.json", "vocabulary/history-observations.json"]);
                RequireSnapshotFiles(scratch, allowed, complete: false);
                Directory.Delete(scratch, true);
            }
            Directory.CreateDirectory(scratch);
            try
            {
                if (await db.RecipePhysicalDeletions.AsNoTracking().AnyAsync(x => x.CompletedAt == null, token)
                    || await db.RecipeFilePublications.AsNoTracking().AnyAsync(x => !x.Delivered, token))
                    throw new RecoveryBusyException("Reconcile pending physical retirement or file publication before capture.");
                await CaptureSnapshotContentAsync(connection, scratch, CurrentTables(false), false, Guid.Parse(source.Authority.Generation), token);
                foreach (var artifact in VocabularyArtifacts(source.Observation, source.Authority.SnapshotId,
                    source.Authority.Generation, "snapshot", source.Authority))
                {
                    var target = Path.Combine(scratch, artifact.Key);
                    Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                    await File.WriteAllBytesAsync(target, artifact.Value, token);
                }
                var files = new List<RecoveryFile>();
                foreach (var file in SafeFiles(scratch).Order(StringComparer.Ordinal)) files.Add(await InventoryAsync(scratch, file, token));
                await WriteAsync(Path.Combine(scratch, "manifest.json"), new RecoveryManifest(3, source.Authority.SnapshotId,
                    attempt.CapturedAt, await SchemaAsync(connection, token, CurrentTables(false)), CurrentTables(false), files.ToArray()), token);
                if (checkpoint is not null) await checkpoint.ReachedAsync("v1-snapshot-captured", token);
                Directory.CreateDirectory(stage);
                var names = files.Select(x => x.Path).Append("manifest.json").ToArray();
                RequireSnapshotFiles(stage, names, complete: false);
                foreach (var name in names)
                {
                    await RetainHistoryArtifactAsync(Path.Combine(stage, name), await File.ReadAllBytesAsync(Path.Combine(scratch, name), token), token);
                    if (checkpoint is not null) await checkpoint.ReachedAsync("v1-snapshot-staged-" + name, token);
                }
                RequireSnapshotFiles(stage, names, complete: true);
                await RetainHistoryArtifactAsync(Path.Combine(envelope, "source-lineage.json"), source.Attestation.LineageBytes, token);
                await RetainHistoryArtifactAsync(Path.Combine(envelope, "source-inventory.json"),
                    source.Attestation.SnapshotSourceInventory(CurrentTables(false), files), token);
                await RetainHistoryArtifactAsync(Path.Combine(envelope, "preparation-complete"),
                    await File.ReadAllBytesAsync(SnapshotTaskPath(repositoryRoot, intent, "preparationReceiptRelativePath"), token), token);
            }
            finally { if (Directory.Exists(scratch)) Directory.Delete(scratch, true); }
            RecoveryDurability.FlushTree(stage, token);
            RecoveryDurability.FlushTree(envelope, token);
            await using var admission = await OpenAsync(token);
            await RevalidateSnapshotSourceAsync(source, repositoryRoot, copyDataRoot, request, admission, token);
            if (checkpoint is not null) await checkpoint.ReachedAsync("v1-snapshot-before-completion", token);
            var identity = await InspectAttestedSnapshotAsync(stage, envelope, source, connection, request, false, token);
            var snapshot = await ReadCurrentSnapshotAsync(stage, source.Authority.SnapshotId, false, token, source.Authority);
            await RetainHistoryArtifactAsync(Path.Combine(envelope, "complete.json"), await SnapshotCompletionAsync(snapshot, envelope, identity.Identity, token), token);
            RecoveryDurability.FlushTree(envelope, token);
            if (checkpoint is not null) await checkpoint.ReachedAsync("v1-snapshot-complete", token);
            return await InspectAttestedSnapshotAsync(stage, envelope, source, connection, request, true, token);
        }, ct);
    }

    internal Task<V1SnapshotStageInspection> ReadAttestedV1SnapshotAsync(string repositoryRoot, string copyDataRoot,
        byte[] request, CancellationToken ct) => WithAttestedSnapshotSourceAsync(repositoryRoot, copyDataRoot, request,
        async (source, connection, intent, token) =>
        {
            var copy = SnapshotTaskPath(repositoryRoot, intent, "independentCopyRelativePath");
            RejectLinks(copy);
            FoodVocabularyDefinitions.Require(Directory.EnumerateFileSystemEntries(copy).Select(Path.GetFileName)
                .ToHashSet(StringComparer.Ordinal).SetEquals(new[] { "payload", "authority" }));
            var stage = Path.Combine(copy, "payload");
            var envelope = Path.Combine(copy, "authority");
            var identity = await InspectAttestedSnapshotAsync(stage, envelope, source, connection, request, true, token);
            await using var admission = await OpenAsync(token);
            await RevalidateSnapshotSourceAsync(source, repositoryRoot, copyDataRoot, request, admission, token);
            var final = await InspectAttestedSnapshotAsync(stage, envelope, source, connection, request, true, token);
            FoodVocabularyDefinitions.Require(identity.Identity == final.Identity);
            return final;
        }, ct);
}
