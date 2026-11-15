using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

internal sealed record V1HistoryStageInspection(Guid SnapshotId, Guid OperationId, string Generation,
    int ReceiptCount, string HistorySha256, string IndexSha256, string LineageSha256);

public partial class RecoverySnapshotService
{
    private sealed record AttestedHistorySource(V1ExactSourceAdmission Attestation, V1RecoveryHistoryContext Authority,
        FoodVocabularyRecoveryObservation Observation);

    private void RequireAttestedHistoryConfiguration(string copyDataRoot)
    {
        if (!db.Database.IsNpgsql() || db.Database.CurrentTransaction is not null
            || Path.GetFullPath(data.Root) != Path.GetFullPath(copyDataRoot)
            || Path.GetFullPath(recipes.Root) != Path.GetFullPath(Path.Combine(copyDataRoot, "recipes"))
            || recipes.Generation is not null)
            throw new InvalidDataException("Attested history requires its own prepared source observation boundary.");
    }

    private async Task<AttestedHistorySource> ObserveAttestedHistoryAsync(string repositoryRoot, string copyDataRoot,
        byte[] request, CancellationToken ct)
    {
        RequireAttestedHistoryConfiguration(copyDataRoot);
        await using var connection = await OpenAsync(ct);
        var attestation = await V1ExactSourceAdmission.InspectAsync(repositoryRoot, connection, copyDataRoot, request, checkpoint, ct);
        var authority = attestation.RecoveryHistoryContext(request);
        FoodVocabularyRecoveryObservation observation;
        await using (var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead, ct))
        {
            await db.Database.ExecuteSqlRawAsync("SET TRANSACTION READ ONLY", ct);
            await db.Database.ExecuteSqlRawAsync("SET LOCAL search_path = pg_catalog, public, pg_temp", ct);
            observation = await vocabulary.ObserveRecoveryAsync("snapshot", authority.SnapshotId, authority.OperationId, ct, authority);
            if (checkpoint is not null) await checkpoint.ReachedAsync("v1-history-observed", ct);
            await transaction.CommitAsync(ct);
        }
        var final = await V1ExactSourceAdmission.InspectAsync(repositoryRoot, connection, copyDataRoot, request, checkpoint, ct);
        FoodVocabularyDefinitions.Require(attestation.LineageBytes.AsSpan().SequenceEqual(final.LineageBytes));
        return new(final, authority, observation);
    }

    private static string AttestedHistoryStage(string repositoryRoot, byte[] request)
    {
        // RecoveryHistoryContext has already required the exact pinned request.
        var intent = JsonDocument.Parse(request).RootElement;
        var stage = Path.GetFullPath(Path.Combine(repositoryRoot, intent.GetProperty("stagingRelativePath").GetString()!));
        RejectLinks(stage);
        return stage;
    }

    private static Dictionary<string, byte[]> AttestedHistoryArtifacts(AttestedHistorySource source)
    {
        var artifacts = VocabularyArtifacts(source.Observation, source.Authority.SnapshotId, source.Authority.Generation,
            "snapshot", source.Authority).ToDictionary(x => x.Key, x => x.Value, StringComparer.Ordinal);
        artifacts.Add("vocabulary/v1-source-lineage.json", source.Attestation.LineageBytes);
        return artifacts;
    }

    private static V1HistoryStageInspection HistoryStageIdentity(AttestedHistorySource source, IReadOnlyDictionary<string, byte[]> artifacts) =>
        new(source.Authority.SnapshotId, source.Authority.OperationId, source.Authority.Generation, source.Attestation.ReceiptCount,
            FoodVocabularyDefinitions.Sha256(artifacts["vocabulary/history-observations.json"]),
            FoodVocabularyDefinitions.Sha256(artifacts["vocabulary/index.json"]),
            FoodVocabularyDefinitions.Sha256(artifacts["vocabulary/v1-source-lineage.json"]));

    private static byte[] HistoryCompletion(byte[] request, V1HistoryStageInspection identity) =>
        JsonSerializer.SerializeToUtf8Bytes(new { version = 1, requestSha256 = FoodVocabularyDefinitions.Sha256(request), identity }, Json);

    private static void RequireHistoryStageFiles(string stage, IEnumerable<string> expected, bool complete)
    {
        var files = SafeFiles(stage).Select(x => Path.GetRelativePath(stage, x).Replace('\\', '/')).ToHashSet(StringComparer.Ordinal);
        var finals = expected.Append("vocabulary/v1-history-complete.json").ToHashSet(StringComparer.Ordinal);
        var allowed = finals.Concat(finals.Select(x => x + ".pending")).ToHashSet(StringComparer.Ordinal);
        FoodVocabularyDefinitions.Require(complete ? files.SetEquals(finals) : files.IsSubsetOf(allowed));
    }

    // A deterministic retry may fill missing artifacts, but never overwrite even
    // a semantically equal existing representation. Partial files confer no authority.
    private static async Task RetainHistoryArtifactAsync(string path, byte[] bytes, CancellationToken ct)
    {
        RejectLinks(path);
        var pending = path + ".pending";
        RejectLinks(pending);
        if (File.Exists(path))
        {
            var retained = await File.ReadAllBytesAsync(path, ct);
            FoodVocabularyDefinitions.Require(bytes.AsSpan().SequenceEqual(retained));
            // This exact task/request owns the known provisional filename. It
            // never carries authority and cannot supersede conflicting final bytes.
            if (File.Exists(pending)) File.Delete(pending);
            return;
        }
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        if (File.Exists(pending)) File.Delete(pending);
        await using (var stream = new FileStream(pending, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            await stream.WriteAsync(bytes, ct);
            stream.Flush(true);
        }
        ct.ThrowIfCancellationRequested();
        File.Move(pending, path, overwrite: false);
        RecoveryDurability.Flush(Path.GetDirectoryName(path)!);
    }

    private static async Task RequireRetainedHistoryArtifactsAsync(string stage, IReadOnlyDictionary<string, byte[]> artifacts,
        CancellationToken ct)
    {
        foreach (var (relative, bytes) in artifacts)
        {
            var path = Path.Combine(stage, relative);
            RejectLinks(path);
            var retained = await File.ReadAllBytesAsync(path, ct);
            FoodVocabularyDefinitions.Require(bytes.AsSpan().SequenceEqual(retained));
        }
    }

    internal async Task<V1HistoryStageInspection> StageAttestedV1HistoryAsync(string repositoryRoot, string copyDataRoot,
        byte[] request, CancellationToken ct)
    {
        if (!OperatingSystem.IsLinux())
            throw new PlatformNotSupportedException("History staging requires the existing Linux recovery durability owner.");
        RequireAttestedHistoryConfiguration(copyDataRoot);
        await using var lease = await boundary.EnterAsync(RecoveryAccess.Snapshot, ct);
        var source = await ObserveAttestedHistoryAsync(repositoryRoot, copyDataRoot, request, ct);
        var artifacts = AttestedHistoryArtifacts(source);
        var identity = HistoryStageIdentity(source, artifacts);
        var stage = AttestedHistoryStage(repositoryRoot, request);
        Directory.CreateDirectory(stage);
        RequireHistoryStageFiles(stage, artifacts.Keys, complete: false);
        var completionPath = Path.Combine(stage, "vocabulary/v1-history-complete.json");
        var completion = HistoryCompletion(request, identity);
        if (File.Exists(completionPath))
        {
            var retained = await File.ReadAllBytesAsync(completionPath, ct);
            FoodVocabularyDefinitions.Require(completion.AsSpan().SequenceEqual(retained));
        }
        foreach (var (path, bytes) in artifacts)
        {
            await RetainHistoryArtifactAsync(Path.Combine(stage, path), bytes, ct);
            if (checkpoint is not null) await checkpoint.ReachedAsync("v1-history-staged-" + path, ct);
        }
        // No captured admission or completion marker can replace re-admission.
        var final = await ObserveAttestedHistoryAsync(repositoryRoot, copyDataRoot, request, ct);
        var finalArtifacts = AttestedHistoryArtifacts(final);
        FoodVocabularyDefinitions.Require(artifacts.Count == finalArtifacts.Count
            && artifacts.All(x => finalArtifacts.TryGetValue(x.Key, out var bytes) && x.Value.AsSpan().SequenceEqual(bytes)));
        RecoveryDurability.FlushTree(stage, ct);
        if (checkpoint is not null) await checkpoint.ReachedAsync("v1-history-before-completion", ct);
        RequireHistoryStageFiles(stage, artifacts.Keys, complete: false);
        await RequireRetainedHistoryArtifactsAsync(stage, artifacts, ct);
        await RetainHistoryArtifactAsync(completionPath, completion, ct);
        RecoveryDurability.FlushTree(stage, ct);
        if (checkpoint is not null) await checkpoint.ReachedAsync("v1-history-complete", ct);
        artifacts.Add("vocabulary/v1-history-complete.json", completion);
        RequireHistoryStageFiles(stage, artifacts.Keys, complete: true);
        await RequireRetainedHistoryArtifactsAsync(stage, artifacts, ct);
        return identity;
    }

    internal async Task<V1HistoryStageInspection> ReadAttestedV1HistoryAsync(string repositoryRoot, string copyDataRoot,
        byte[] request, CancellationToken ct)
    {
        RequireAttestedHistoryConfiguration(copyDataRoot);
        await using var lease = await boundary.EnterAsync(RecoveryAccess.Snapshot, ct);
        // Fresh-process use reconstructs authority from pinned durable policy,
        // schema, original backup and live descendant; there is no cached admission.
        var source = await ObserveAttestedHistoryAsync(repositoryRoot, copyDataRoot, request, ct);
        var expected = AttestedHistoryArtifacts(source);
        var identity = HistoryStageIdentity(source, expected);
        var stage = AttestedHistoryStage(repositoryRoot, request);
        RequireHistoryStageFiles(stage, expected.Keys, complete: true);
        expected.Add("vocabulary/v1-history-complete.json", HistoryCompletion(request, identity));
        var observed = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        foreach (var (relative, bytes) in expected)
        {
            var path = Path.Combine(stage, relative);
            RejectLinks(path);
            var retained = await File.ReadAllBytesAsync(path, ct);
            FoodVocabularyDefinitions.Require(bytes.AsSpan().SequenceEqual(retained));
            observed.Add(relative, retained);
        }
        var history = observed["vocabulary/history-observations.json"];
        _ = FoodVocabularyInventoryQualification.ValidateRecoveryArtifacts(observed["vocabulary/index.json"], history,
            source.Observation.Documents, "snapshot", source.Authority);
        _ = FoodVocabularyInventoryQualification.MergeHistoryObservations(source.Authority, history, history);
        if (checkpoint is not null) await checkpoint.ReachedAsync("v1-history-read-back", ct);
        var final = await ObserveAttestedHistoryAsync(repositoryRoot, copyDataRoot, request, ct);
        var finalArtifacts = AttestedHistoryArtifacts(final);
        FoodVocabularyDefinitions.Require(finalArtifacts.All(x => observed.TryGetValue(x.Key, out var bytes) && x.Value.AsSpan().SequenceEqual(bytes)));
        // Detect artifact mutation during the source re-admission as well.
        RequireHistoryStageFiles(stage, finalArtifacts.Keys, complete: true);
        foreach (var (relative, bytes) in observed)
        {
            var path = Path.Combine(stage, relative);
            RejectLinks(path);
            var retained = await File.ReadAllBytesAsync(path, ct);
            FoodVocabularyDefinitions.Require(bytes.AsSpan().SequenceEqual(retained));
        }
        return identity;
    }
}
