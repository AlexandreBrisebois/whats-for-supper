using System.Data;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

internal sealed record V1MigrationPrewriteObservation(Guid OperationId, string CandidateCommit, string AssemblySha256,
    string InventorySha256, DateOnly EvaluationDate, DateTimeOffset CapturedAt, string HoldSha256,
    string Boundary = "tested-prewrite-only-no-reusable-mutator-authority");

public partial class RecoverySnapshotService
{
    private enum MigrationObservation { Capture, Read, Prewrite }
    private sealed record MigrationHold(int Version, Guid OperationId, string Candidate, DateTimeOffset CreatedAt,
        string ApiImage, string DatabaseContainer);
    private static readonly string[] MigrationBundleFiles = ["request.json", "attempt.json", "inventory.json", "complete.json"];

    internal Task<CanonicalMigrationInventory> CaptureAttestedV1MigrationInventoryAsync(string repositoryRoot, string copyDataRoot,
        byte[] request, byte[] attempt, string bundle, CanonicalRecipeContentStore store, RecipesRootResolver executionRoots,
        CancellationToken ct) => WithAttestedMigrationAsync(repositoryRoot, copyDataRoot, request, attempt, bundle, store, executionRoots, MigrationObservation.Capture, ct);

    internal Task<CanonicalMigrationInventory> ReadAttestedV1MigrationInventoryAsync(string repositoryRoot, string copyDataRoot,
        byte[] request, byte[] attempt, string bundle, CanonicalRecipeContentStore store, RecipesRootResolver executionRoots,
        CancellationToken ct) => WithAttestedMigrationAsync(repositoryRoot, copyDataRoot, request, attempt, bundle, store, executionRoots, MigrationObservation.Read, ct);

    internal async Task<V1MigrationPrewriteObservation> AdmitAttestedV1MigrationPrewriteAsync(string repositoryRoot, string copyDataRoot,
        byte[] request, byte[] attempt, string bundle, CanonicalRecipeContentStore store, RecipesRootResolver executionRoots, CancellationToken ct)
    {
        request = request.ToArray(); attempt = attempt.ToArray();
        var selected = V1MigrationPrewritePolicy.Request(repositoryRoot, request, db.Database.GetDbConnection().Database, copyDataRoot,
            Path.GetDirectoryName(executionRoots.BaseRoot)!);
        var inventory = await boundary.RunMaintenanceAsync(selected.Migration.OperationId, selected.CandidateCommit,
            FoodVocabularyDefinitions.Sha256(selected.HoldBytes), token => WithAttestedMigrationAsync(repositoryRoot, copyDataRoot,
                request, attempt, bundle, store, executionRoots, MigrationObservation.Prewrite, token), ct);
        var retained = V1MigrationPrewritePolicy.Attempt(request, attempt, new DeploymentCalendar(configuration));
        return new(selected.Migration.OperationId, selected.CandidateCommit, selected.Migration.CandidateSha256,
            inventory.ObservationSha256, inventory.EvaluationDate, retained.CapturedAt, FoodVocabularyDefinitions.Sha256(selected.HoldBytes));
    }

    private async Task<CanonicalMigrationInventory> WithAttestedMigrationAsync(string repositoryRoot, string copyDataRoot,
        byte[] requestBytes, byte[] attemptBytes, string bundle, CanonicalRecipeContentStore store, RecipesRootResolver executionRoots,
        MigrationObservation operation, CancellationToken ct)
    {
        requestBytes = requestBytes.ToArray(); attemptBytes = attemptBytes.ToArray();
        if (!OperatingSystem.IsLinux()) throw new PlatformNotSupportedException("Attested migration requires Linux durability.");
        RequireAttestedHistoryConfiguration(copyDataRoot);
        boundary.RequireMigrationTarget(db, executionRoots);
        var request = V1MigrationPrewritePolicy.Request(repositoryRoot, requestBytes, db.Database.GetDbConnection().Database,
            copyDataRoot, Path.GetDirectoryName(executionRoots.BaseRoot)!);
        var calendar = new DeploymentCalendar(configuration);
        var attempt = V1MigrationPrewritePolicy.Attempt(requestBytes, attemptBytes, calendar);
        FoodVocabularyDefinitions.Require(Path.GetFullPath(bundle) == Path.GetFullPath(V1MigrationPrewritePolicy.Bundle(repositoryRoot, request))
            && executionRoots.Generation is null && Path.GetFullPath(executionRoots.Root) == Path.Combine(request.ExecutionDataRoot, "recipes"));
        RequireMigrationCallerInputs(repositoryRoot, request, requestBytes, attemptBytes);
        if (operation == MigrationObservation.Prewrite)
        {
            boundary.ValidateMaintenanceInvocation(request.Migration.OperationId, request.CandidateCommit, request.Migration.CandidateSha256);
            FoodVocabularyDefinitions.Require(calendar.Capture(clock.UtcNow).Today == attempt.EvaluationDate);
        }
        var completed = File.Exists(Path.Combine(bundle, "complete.json"));
        if (operation != MigrationObservation.Capture) FoodVocabularyDefinitions.Require(completed);
        if (!Directory.Exists(bundle)) Directory.CreateDirectory(bundle);
        RequireMigrationBundle(bundle, completed);
        if (operation == MigrationObservation.Capture && !completed)
        {
            await RetainCoverageArtifactAsync(bundle, "request.json", requestBytes, ct);
            await RetainCoverageArtifactAsync(bundle, "attempt.json", attemptBytes, ct);
            if (checkpoint is not null) await checkpoint.ReachedAsync("v1-migration-attempt-retained", ct);
        }
        else
        {
            await RequireRetainedHistoryArtifactsAsync(bundle, new Dictionary<string, byte[]> { ["request.json"] = requestBytes, ["attempt.json"] = attemptBytes }, ct);
        }
        using var duration = CancellationTokenSource.CreateLinkedTokenSource(ct);
        duration.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Recovery:MaxFreezeSeconds", 30), 1, 3600)));
        ct = duration.Token;
        await using var lease = await boundary.EnterAsync(operation == MigrationObservation.Prewrite ? RecoveryAccess.Write : RecoveryAccess.Snapshot, ct);
        using var binding = boundary.BindLease(lease);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        store.RequireMigrationTarget(db, executionRoots, boundary);
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();
        await ScalarAsync(connection, "SET LOCAL search_path = pg_catalog, public, pg_temp", ct);
        var coverageRequestBytes = V1MigrationPrewritePolicy.CoverageRequest(repositoryRoot);
        var coverageRequest = V1SourceCoveragePolicy.Load(repositoryRoot, coverageRequestBytes);
        var fullRequest = V1SourceCoveragePolicy.SourceRequest(repositoryRoot, coverageRequest);
        var intent = V1ExactSourceAdmission.FullSnapshotPolicy(repositoryRoot, fullRequest);
        await LockAttestedSnapshotTablesAsync(repositoryRoot, intent, connection, ct);
        await using var admission = await OpenAsync(ct);
        var source = await ReconstructAttestedSnapshotSourceAsync(repositoryRoot, copyDataRoot, fullRequest, admission, ct);
        var predecessor = coverageRequest.GetProperty("source").GetProperty("package");
        var payload = Path.GetDirectoryName(SnapshotTaskPath(repositoryRoot, predecessor.GetProperty("manifest"), "path"))!;
        var envelope = Path.GetDirectoryName(SnapshotTaskPath(repositoryRoot, predecessor.GetProperty("lineage"), "path"))!;
        var package = await InspectAttestedSnapshotAsync(payload, envelope, source, connection, fullRequest, true, ct);
        var coverage = await ObserveSourceCoverageAsync(repositoryRoot, copyDataRoot, coverageRequestBytes,
            File.ReadAllBytes(Path.Combine(repositoryRoot, ".task/v1-source-coverage-implementation/attempt-input.json")), coverageRequest,
            Path.Combine(repositoryRoot, ".task/v1-source-coverage-implementation/final-coverage"), true, source, connection, package, ct);
        await RequireExecutionDescendantAsync(copyDataRoot, request, attempt, package.AuthorityBytes["source-inventory.json"], ct);
        using var continuation = new V1MigrationSource(ProjectSourceProtection(package.Snapshot), ProjectSnapshotIdentity(package.Snapshot), source.Attestation, db, executionRoots);
        var inventory = await store.ObserveAttestedMigrationManifestAsync(request.Migration, executionRoots, continuation, attempt.EvaluationDate, ct);
        var inventoryBytes = JsonSerializer.SerializeToUtf8Bytes(inventory, Json);
        var artifacts = new Dictionary<string, byte[]> { ["request.json"] = requestBytes, ["attempt.json"] = attemptBytes, ["inventory.json"] = inventoryBytes };
        if (operation == MigrationObservation.Capture && !completed)
            await RetainCoverageArtifactAsync(bundle, "inventory.json", inventoryBytes, ct);
        await RequireRetainedHistoryArtifactsAsync(bundle, artifacts, ct);
        if (checkpoint is not null) await checkpoint.ReachedAsync("v1-migration-inventory-observed", ct);
        if (operation == MigrationObservation.Prewrite)
        {
            await store.RequireAttestedMigrationPrewriteAsync(inventory, request.CandidateCommit, this, boundary,
                executionRoots, continuation, attempt.CapturedAt, ct);
            if (checkpoint is not null) await checkpoint.ReachedAsync("v1-migration-prewrite-admitted", ct);
        }
        var completion = JsonSerializer.SerializeToUtf8Bytes(new
        {
            version = 1,
            requestSha256 = FoodVocabularyDefinitions.Sha256(requestBytes),
            attemptSha256 = FoodVocabularyDefinitions.Sha256(attemptBytes),
            files = artifacts.OrderBy(x => x.Key, StringComparer.Ordinal).Select(x => new RecoveryFile(x.Key, x.Value.LongLength, FoodVocabularyDefinitions.Sha256(x.Value))).ToArray()
        }, Json);
        if (completed) artifacts.Add("complete.json", completion);
        await RevalidateSnapshotSourceAsync(source, repositoryRoot, copyDataRoot, fullRequest, admission, ct);
        await RequireExecutionDescendantAsync(copyDataRoot, request, attempt, package.AuthorityBytes["source-inventory.json"], ct);
        // Reconstruct the complete inventory again, rather than allowing the
        // executor's post-write resume differences into this pre-write boundary.
        var finalInventory = await store.ObserveAttestedMigrationManifestAsync(request.Migration, executionRoots, continuation, attempt.EvaluationDate, ct);
        FoodVocabularyDefinitions.Require(inventoryBytes.AsSpan().SequenceEqual(JsonSerializer.SerializeToUtf8Bytes(finalInventory, Json)));
        if (checkpoint is not null) await checkpoint.ReachedAsync("v1-migration-final-source-validated", ct);
        await RequireExecutionDescendantAsync(copyDataRoot, request, attempt, package.AuthorityBytes["source-inventory.json"], ct);
        _ = V1MigrationPrewritePolicy.Load(repositoryRoot);
        RequireMigrationCallerInputs(repositoryRoot, request, requestBytes, attemptBytes);
        await RequireUnchangedSnapshotAsync(package.Snapshot, ct);
        await RequireRetainedHistoryArtifactsAsync(package.Envelope, package.AuthorityBytes, ct);
        await RequireRetainedCoverageAsync(coverage, ct);
        RequireMigrationBundle(bundle, completed);
        await RequireRetainedHistoryArtifactsAsync(bundle, artifacts, ct);
        if (operation == MigrationObservation.Prewrite)
        {
            FoodVocabularyDefinitions.Require(calendar.Capture(clock.UtcNow).Today == attempt.EvaluationDate);
            boundary.ValidateMaintenanceInvocation(request.Migration.OperationId, request.CandidateCommit, request.Migration.CandidateSha256);
        }
        if (!completed)
        {
            if (checkpoint is not null) await checkpoint.ReachedAsync("v1-migration-before-completion", ct);
            await RequireRetainedHistoryArtifactsAsync(bundle, artifacts, ct);
            await RetainCoverageArtifactAsync(bundle, "complete.json", completion, ct);
            RecoveryDurability.FlushTree(bundle, ct);
            artifacts.Add("complete.json", completion);
            if (checkpoint is not null) await checkpoint.ReachedAsync("v1-migration-complete", ct);
            // Completion is task evidence only. Revalidate after its publication.
            await RevalidateSnapshotSourceAsync(source, repositoryRoot, copyDataRoot, fullRequest, admission, ct);
            await RequireExecutionDescendantAsync(copyDataRoot, request, attempt, package.AuthorityBytes["source-inventory.json"], ct);
            RequireMigrationCallerInputs(repositoryRoot, request, requestBytes, attemptBytes);
            _ = V1MigrationPrewritePolicy.Load(repositoryRoot);
            await RequireUnchangedSnapshotAsync(package.Snapshot, ct);
            await RequireRetainedHistoryArtifactsAsync(package.Envelope, package.AuthorityBytes, ct);
            await RequireRetainedCoverageAsync(coverage, ct);
        }
        RequireMigrationBundle(bundle, true);
        await RequireRetainedHistoryArtifactsAsync(bundle, artifacts, ct);
        await transaction.RollbackAsync(ct);
        return inventory;
    }

    private static void RequireMigrationCallerInputs(string root, V1MigrationRequest request, byte[] requestBytes, byte[] attemptBytes)
    {
        var input = Path.Combine(root, ".task/v1-migration-prewrite-20261115/inputs", request.Migration.CandidateSha256);
        foreach (var (name, expected) in new[] { ("request.json", requestBytes), ("attempt.json", attemptBytes) })
        {
            var path = Path.Combine(input, name); RejectLinks(path);
            FoodVocabularyDefinitions.Require(File.ReadAllBytes(path).AsSpan().SequenceEqual(expected));
        }
    }

    private static void RequireMigrationBundle(string root, bool complete)
    {
        RejectLinks(root);
        var names = Directory.EnumerateFileSystemEntries(root).Select(path =>
        {
            RejectLinks(path); FoodVocabularyDefinitions.Require(File.Exists(path)); return Path.GetFileName(path);
        }).ToHashSet(StringComparer.Ordinal);
        FoodVocabularyDefinitions.Require(complete ? names.SetEquals(MigrationBundleFiles)
            : names.IsSubsetOf(MigrationBundleFiles.Concat(MigrationBundleFiles.Select(x => x + ".pending"))));
    }

    private static async Task RequireExecutionDescendantAsync(string sourceRoot, V1MigrationRequest request, V1MigrationAttempt attempt, byte[] inventoryBytes, CancellationToken ct)
    {
        var originals = FoodVocabularyDefinitions.ReadStrict<JsonElement>(SnapshotText(inventoryBytes)).GetProperty("files").EnumerateArray()
            .ToDictionary(x => x.GetProperty("path").GetString()!, x => x.GetProperty("sha256").GetString()!, StringComparer.Ordinal);
        var sourceFiles = SafeFiles(sourceRoot).Order(StringComparer.Ordinal).ToArray();
        var executionFiles = SafeFiles(request.ExecutionDataRoot).Order(StringComparer.Ordinal).ToArray();
        FoodVocabularyDefinitions.Require(originals.Count == 1576 && sourceFiles.Length == originals.Count && executionFiles.Length == sourceFiles.Length);
        var expected = sourceFiles.Select(x => Path.GetRelativePath(sourceRoot, x)).ToArray();
        FoodVocabularyDefinitions.Require(expected.SequenceEqual(executionFiles.Select(x => Path.GetRelativePath(request.ExecutionDataRoot, x))));
        foreach (var relative in expected)
        {
            var before = await File.ReadAllBytesAsync(Path.Combine(sourceRoot, relative), ct);
            var actual = await File.ReadAllBytesAsync(Path.Combine(request.ExecutionDataRoot, relative), ct);
            FoodVocabularyDefinitions.Require(originals.TryGetValue(relative.Replace('\\', '/'), out var originalSha)
                && FoodVocabularyDefinitions.Sha256(before) == originalSha);
            if (relative.Replace('\\', '/') == "recipes/.maintenance-hold.json")
            {
                FoodVocabularyDefinitions.Require(FoodVocabularyDefinitions.Sha256(before) == "93198cda23ad116f1b6880d9333537295e6118e7cdc373016dc81953ac6d473d"
                    && actual.AsSpan().SequenceEqual(request.HoldBytes));
                var hold = FoodVocabularyDefinitions.ReadStrict<MigrationHold>(new UTF8Encoding(false, true).GetString(actual));
                FoodVocabularyDefinitions.Require(hold.Version == 1 && hold.OperationId == request.Migration.OperationId && hold.Candidate == request.CandidateCommit
                    && hold.CreatedAt == attempt.CapturedAt && hold.ApiImage == request.RuntimeImage && hold.DatabaseContainer == request.DatabaseContainer);
            }
            else FoodVocabularyDefinitions.Require(before.AsSpan().SequenceEqual(actual));
        }
    }
}
