using System.Text;
using System.Text.Json;
using System.Security.Cryptography;
using Npgsql;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

internal sealed record V1SourceCoverageInspection(Guid CoverageOperationId, string CoverageGeneration,
    Guid SourceSnapshotId, string RequestSha256, DateTimeOffset CapturedAt, string CoverageSha256,
    string ProjectionSha256, int OriginalReceipts, int OriginalTables, int OriginalFiles);

public partial class RecoverySnapshotService
{
    private sealed record AttestedCoverageInspection(V1SourceCoverageInspection Identity, string RepositoryRoot,
        byte[] Request, string Root, IReadOnlyDictionary<string, byte[]> Artifacts);
    private static readonly string[] CoverageFiles = ["payload/coverage.json", "payload/source-protection.json",
        "authority/attempt.json", "authority/source-lineage.json", "authority/source-inventory.json",
        "authority/preparation-complete", "authority/complete.json"];

    private static void RequireCoverageLayout(string root, bool complete)
    {
        RejectLinks(root);
        var actual = new HashSet<string>(StringComparer.Ordinal);
        foreach (var entry in Directory.EnumerateFileSystemEntries(root))
        {
            RejectLinks(entry);
            var name = Path.GetFileName(entry);
            FoodVocabularyDefinitions.Require(name is "payload" or "authority" && Directory.Exists(entry));
            foreach (var file in Directory.EnumerateFileSystemEntries(entry))
            {
                RejectLinks(file);
                FoodVocabularyDefinitions.Require(File.Exists(file));
                actual.Add(name + "/" + Path.GetFileName(file));
            }
        }
        FoodVocabularyDefinitions.Require(complete ? actual.SetEquals(CoverageFiles)
            : actual.IsSubsetOf(CoverageFiles.Concat(CoverageFiles.Select(x => x + ".pending"))));
    }

    private static async Task RetainCoverageArtifactAsync(string root, string name, byte[] bytes, CancellationToken ct)
    {
        var path = Path.Combine(root, name);
        RejectLinks(path);
        RejectLinks(path + ".pending");
        // The shared durability writer may replace provisional bytes. Coverage
        // admits only the known same-byte provisional sibling, never foreign data.
        if (File.Exists(path + ".pending"))
            FoodVocabularyDefinitions.Require((await File.ReadAllBytesAsync(path + ".pending", ct)).AsSpan().SequenceEqual(bytes));
        await RetainHistoryArtifactAsync(path, bytes, ct);
    }

    private static async Task RequireRetainedCoverageAsync(AttestedCoverageInspection observation, CancellationToken ct)
    {
        _ = V1SourceCoveragePolicy.Load(observation.RepositoryRoot, observation.Request);
        RequireCoverageLayout(observation.Root, complete: true);
        await RequireRetainedHistoryArtifactsAsync(observation.Root, observation.Artifacts, ct);
    }

    private static byte[] CoverageCompletion(JsonElement request, DateTimeOffset capturedAt,
        IReadOnlyDictionary<string, byte[]> artifacts) => JsonSerializer.SerializeToUtf8Bytes(new
        {
            version = 1,
            requestSha256 = V1SourceCoveragePolicy.RequestSha256,
            coverageOperationId = request.GetProperty("coverageOperationId").GetGuid(),
            coverageGeneration = request.GetProperty("coverageGeneration").GetString(),
            capturedAt,
            source = request.GetProperty("source"),
            files = artifacts.OrderBy(x => x.Key, StringComparer.Ordinal)
                .Select(x => new RecoveryFile(x.Key, x.Value.LongLength, Convert.ToHexString(SHA256.HashData(x.Value)))).ToArray()
        }, Json);

    private static async Task<string> CoveragePublicSchemaAsync(NpgsqlConnection connection, CancellationToken ct)
    {
        var names = (await ScalarAsync(connection,
            "SELECT string_agg(table_name,',' ORDER BY table_name) FROM information_schema.tables WHERE table_schema='public'", ct)).Split(',');
        return (await SchemaAsync(connection, ct, names)).ToLowerInvariant();
    }

    private static V1SnapshotAttempt RequireCoverageAttempt(byte[] expected, byte[] actual, byte[] request)
    {
        var attempt = RequireSnapshotAttempt(expected, request);
        FoodVocabularyDefinitions.Require(expected.AsSpan().SequenceEqual(actual));
        return attempt;
    }

    private async Task<AttestedCoverageInspection> ObserveSourceCoverageAsync(string repositoryRoot, string copyDataRoot,
        byte[] requestBytes, byte[] retainedAttemptBytes, JsonElement request, string root, bool readOnly, AttestedHistorySource source,
        NpgsqlConnection connection, AttestedSnapshotInspection package, CancellationToken ct)
    {
        var complete = File.Exists(Path.Combine(root, "authority/complete.json"));
        if (readOnly) FoodVocabularyDefinitions.Require(complete);
        if (!readOnly && !Directory.Exists(root)) Directory.CreateDirectory(root);
        RequireCoverageLayout(root, complete);
        var authorityRoot = Path.Combine(root, "authority");
        var attemptBytes = await File.ReadAllBytesAsync(Path.Combine(authorityRoot, "attempt.json"), ct);
        var attempt = RequireCoverageAttempt(retainedAttemptBytes, attemptBytes, requestBytes);
        // Existing full inspection compares all selected tables, typed history,
        // protected files and single original context. Reuse the projection owner.
        var projection = ProjectSourceProtection(package.Snapshot);
        var projectionBytes = JsonSerializer.SerializeToUtf8Bytes(projection, Json);
        var originalInventory = package.AuthorityBytes["source-inventory.json"];
        var inventory = FoodVocabularyDefinitions.ReadStrict<JsonElement>(SnapshotText(originalInventory));
        var originalFiles = new List<RecoveryFile>();
        foreach (var file in SafeFiles(copyDataRoot).Order(StringComparer.Ordinal))
            originalFiles.Add(await InventoryAsync(copyDataRoot, file, ct));
        var liveSchema = await CoveragePublicSchemaAsync(connection, ct);
        if (liveSchema != request.GetProperty("preparedAllPublicTableSchemaSha256").GetString())
            throw new InvalidDataException("Coverage all-public schema differs: " + liveSchema);
        if (projection.SchemaSha256 != await SchemaAsync(connection, ct, package.Snapshot.Manifest.Tables))
            throw new InvalidDataException("Coverage projected schema differs from the protected snapshot.");
        var coverageBytes = JsonSerializer.SerializeToUtf8Bytes(new
        {
            version = 1,
            kind = "attested-v1-source-coverage",
            request = requestBytes,
            requestSha256 = V1SourceCoveragePolicy.RequestSha256,
            coverageOperationId = request.GetProperty("coverageOperationId").GetGuid(),
            coverageGeneration = request.GetProperty("coverageGeneration").GetString(),
            capturedAt = attempt.CapturedAt,
            sourceSnapshotId = source.Authority.SnapshotId,
            sourceOperationId = source.Authority.OperationId,
            sourceGeneration = source.Authority.Generation,
            predecessor = request.GetProperty("source").GetProperty("package"),
            liveGeneration = recipes.Generation,
            liveAllPublicTableSchemaSha256 = liveSchema,
            projectedSchemaSha256 = projection.SchemaSha256,
            projectionSha256 = FoodVocabularyDefinitions.Sha256(projectionBytes),
            exactOriginalReceipts = source.Attestation.ReceiptCount,
            exactReceiptComparisonLineageSha256 = FoodVocabularyDefinitions.Sha256(source.Attestation.LineageBytes),
            originalTableProjections = inventory.GetProperty("tables"),
            originalSourceFiles = originalFiles,
            originalSourceFilesSha256 = FoodVocabularyDefinitions.Sha256(JsonSerializer.SerializeToUtf8Bytes(originalFiles, Json)),
            sourceInventorySha256 = FoodVocabularyDefinitions.Sha256(originalInventory)
        }, Json);
        var artifacts = new Dictionary<string, byte[]>(StringComparer.Ordinal)
        {
            ["payload/coverage.json"] = coverageBytes,
            ["payload/source-protection.json"] = projectionBytes,
            ["authority/attempt.json"] = attemptBytes,
            ["authority/source-lineage.json"] = package.AuthorityBytes["source-lineage.json"],
            ["authority/source-inventory.json"] = originalInventory,
            ["authority/preparation-complete"] = Encoding.UTF8.GetBytes(V1SourceCoveragePolicy.RequestSha256 + "\n")
        };
        var completion = CoverageCompletion(request, attempt.CapturedAt, artifacts);
        if (!readOnly && !complete)
        {
            foreach (var (name, bytes) in artifacts)
            {
                await RetainCoverageArtifactAsync(root, name, bytes, ct);
                if (checkpoint is not null) await checkpoint.ReachedAsync("v1-coverage-staged-" + name, ct);
            }
            RecoveryDurability.FlushTree(root, ct);
            // Completion cannot substitute for fresh source/package admission.
            await using var admission = await OpenAsync(ct);
            await RevalidateSnapshotSourceAsync(source, repositoryRoot, copyDataRoot,
                V1SourceCoveragePolicy.SourceRequest(repositoryRoot, request), admission, ct);
            _ = V1SourceCoveragePolicy.Load(repositoryRoot, requestBytes);
            await RequireUnchangedSnapshotAsync(package.Snapshot, ct);
            await RequireRetainedHistoryArtifactsAsync(package.Envelope, package.AuthorityBytes, ct);
            RequireCoverageLayout(root, complete: false);
            await RequireRetainedHistoryArtifactsAsync(root, artifacts, ct);
            if (checkpoint is not null) await checkpoint.ReachedAsync("v1-coverage-before-completion", ct);
            // Check the retained before-image after the checkpoint as well.
            await RequireRetainedHistoryArtifactsAsync(root, artifacts, ct);
            await RetainCoverageArtifactAsync(root, "authority/complete.json", completion, ct);
            RecoveryDurability.FlushTree(root, ct);
            if (checkpoint is not null) await checkpoint.ReachedAsync("v1-coverage-complete", ct);
        }
        artifacts.Add("authority/complete.json", completion);
        var identity = new V1SourceCoverageInspection(request.GetProperty("coverageOperationId").GetGuid(),
            request.GetProperty("coverageGeneration").GetString()!, source.Authority.SnapshotId,
            V1SourceCoveragePolicy.RequestSha256, attempt.CapturedAt, FoodVocabularyDefinitions.Sha256(coverageBytes),
            FoodVocabularyDefinitions.Sha256(projectionBytes), source.Attestation.ReceiptCount,
            inventory.GetProperty("tables").GetArrayLength(), originalFiles.Count);
        var result = new AttestedCoverageInspection(identity, repositoryRoot, requestBytes.ToArray(), root, artifacts);
        await RequireRetainedCoverageAsync(result, ct);
        if (checkpoint is not null) await checkpoint.ReachedAsync("v1-coverage-inspected", ct);
        return result;
    }

    // Integrity preflight rejects damaged detached envelopes before expensive
    // source reconstruction. It grants no authority: all contents are regenerated
    // from the freshly admitted source below, including self-consistent rehashes.
    private static async Task PreflightCoverageAsync(string root, byte[] requestBytes, byte[] retainedAttemptBytes, JsonElement request, CancellationToken ct)
    {
        RequireCoverageLayout(root, complete: true);
        var attempt = RequireCoverageAttempt(retainedAttemptBytes,
            await File.ReadAllBytesAsync(Path.Combine(root, "authority/attempt.json"), ct), requestBytes);
        var artifacts = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        foreach (var name in CoverageFiles.Where(x => x != "authority/complete.json"))
            artifacts.Add(name, await File.ReadAllBytesAsync(Path.Combine(root, name), ct));
        var expected = CoverageCompletion(request, attempt.CapturedAt, artifacts);
        var retained = await File.ReadAllBytesAsync(Path.Combine(root, "authority/complete.json"), ct);
        FoodVocabularyDefinitions.Require(expected.AsSpan().SequenceEqual(retained));
    }

    private async Task<V1SourceCoverageInspection> WithAttestedSourceCoverageAsync(string repositoryRoot, string copyDataRoot,
        byte[] requestBytes, byte[] retainedAttemptBytes, bool readOnly, CancellationToken ct)
    {
        if (!OperatingSystem.IsLinux()) throw new PlatformNotSupportedException("Coverage requires Linux recovery durability.");
        var request = V1SourceCoveragePolicy.Load(repositoryRoot, requestBytes);
        var fullRequest = V1SourceCoveragePolicy.SourceRequest(repositoryRoot, request);
        var coverageRoot = readOnly ? SnapshotTaskPath(repositoryRoot, request, "requiredIndependentCopyRelativePath")
            : Path.Combine(SnapshotTaskPath(repositoryRoot, request, "taskOutputRelativePath"), "coverage-stage");
        ct.ThrowIfCancellationRequested();
        _ = RequireSnapshotAttempt(retainedAttemptBytes, requestBytes);
        if (readOnly || File.Exists(Path.Combine(coverageRoot, "authority/complete.json")))
            await PreflightCoverageAsync(coverageRoot, requestBytes, retainedAttemptBytes, request, ct);
        else
        {
            RequireAttestedHistoryConfiguration(copyDataRoot);
            Directory.CreateDirectory(coverageRoot);
            RequireCoverageLayout(coverageRoot, complete: false);
            var attemptPath = Path.Combine(coverageRoot, "authority/attempt.json");
            if (!File.Exists(attemptPath))
                FoodVocabularyDefinitions.Require(SafeFiles(coverageRoot).All(x => x == attemptPath + ".pending"));
            // The caller durably retains this invocation input before starting.
            // Choose/retain time before any source, typed-history or projection
            // observation; a provisional attempt grants no completion authority.
            await RetainCoverageArtifactAsync(coverageRoot, "authority/attempt.json", retainedAttemptBytes, ct);
            if (checkpoint is not null) await checkpoint.ReachedAsync("v1-coverage-attempt-retained", ct);
        }
        AttestedCoverageInspection? result = null;
        await WithAttestedSnapshotSourceAsync(repositoryRoot, copyDataRoot, fullRequest, async (source, connection, intent, token) =>
        {
            var predecessor = request.GetProperty("source").GetProperty("package");
            var payload = Path.GetDirectoryName(SnapshotTaskPath(repositoryRoot, predecessor.GetProperty("manifest"), "path"))!;
            var authority = Path.GetDirectoryName(SnapshotTaskPath(repositoryRoot, predecessor.GetProperty("lineage"), "path"))!;
            var package = await InspectAttestedSnapshotAsync(payload, authority, source, connection, fullRequest, true, token);
            if (checkpoint is not null) await checkpoint.ReachedAsync("v1-coverage-source-protection-observed", token);
            result = await ObserveSourceCoverageAsync(repositoryRoot, copyDataRoot, requestBytes, retainedAttemptBytes, request, coverageRoot,
                readOnly, source, connection, package, token);
            return package with { Coverage = result };
        }, ct);
        return result!.Identity;
    }

    internal Task<V1SourceCoverageInspection> StageAttestedV1SourceCoverageAsync(string repositoryRoot, string copyDataRoot,
        byte[] request, byte[] retainedAttemptBytes, CancellationToken ct)
        => WithAttestedSourceCoverageAsync(repositoryRoot, copyDataRoot, request, retainedAttemptBytes, false, ct);

    internal Task<V1SourceCoverageInspection> ReadAttestedV1SourceCoverageAsync(string repositoryRoot, string copyDataRoot,
        byte[] request, byte[] retainedAttemptBytes, CancellationToken ct)
        => WithAttestedSourceCoverageAsync(repositoryRoot, copyDataRoot, request, retainedAttemptBytes, true, ct);
}
