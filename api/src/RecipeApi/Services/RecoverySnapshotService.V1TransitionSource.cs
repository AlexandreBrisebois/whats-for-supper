using System.Data;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public partial class RecoverySnapshotService
{
    private RecipeApi.Data.RecipeDbContext TransitionDb => db;
    private RecoveryBoundary TransitionBoundary => boundary;
    private FoodVocabularyStore TransitionVocabulary => vocabulary;
    private RecipesRootResolver TransitionRoots => recipes;
    private DataRootResolver TransitionData => data;

    internal sealed class V1TransitionSourceLease : IAsyncDisposable
    {
        private readonly RecoverySnapshotService owner;
        private readonly string repositoryRoot, copyDataRoot;
        private readonly byte[] request;
        private readonly IAsyncDisposable lease;
        private readonly IDbContextTransaction transaction;
        private readonly NpgsqlConnection admission, pristine;
        private readonly NpgsqlTransaction pristineTransaction;
        private readonly string pristineDataRoot;
        private readonly AttestedHistorySource source;
        private readonly AttestedSnapshotInspection package;
        private readonly AttestedCoverageInspection coverage;
        private readonly JsonElement schema;
        private readonly Dictionary<string, string> files;
        private V1TransitionSourceLease(RecoverySnapshotService owner, string repositoryRoot, string copyDataRoot,
            byte[] request, IAsyncDisposable lease, IDbContextTransaction transaction, NpgsqlConnection admission,
            AttestedHistorySource source, AttestedSnapshotInspection package, AttestedCoverageInspection coverage, JsonElement schema,
            NpgsqlConnection pristine, NpgsqlTransaction pristineTransaction, string pristineDataRoot)
        {
            this.owner = owner; this.repositoryRoot = repositoryRoot; this.copyDataRoot = copyDataRoot;
            this.request = request; this.lease = lease; this.transaction = transaction; this.admission = admission;
            this.pristine = pristine; this.pristineTransaction = pristineTransaction; this.pristineDataRoot = pristineDataRoot;
            this.source = source; this.package = package; this.coverage = coverage; this.schema = schema;
            files = TransitionRead<JsonElement>(package.AuthorityBytes["source-inventory.json"]).GetProperty("files").EnumerateArray()
                .ToDictionary(x => x.GetProperty("path").GetString()!, x => x.GetProperty("sha256").GetString()!, StringComparer.Ordinal);
        }
        internal V1ExactSourceAdmission Attestation => source.Attestation;
        internal V1RecoveryHistoryContext Authority => source.Authority;
        internal FoodVocabularyInventoryFacts Facts => source.Observation.Live;
        internal RecoverySourceProtection Protection => ProjectSourceProtection(package.Snapshot);
        internal InspectedRecoverySnapshotIdentity Identity => ProjectSnapshotIdentity(package.Snapshot);
        internal async Task RequireBeforeImagesAsync(CancellationToken ct)
        {
            await V1ExactSourceAdmission.RequireTransitionPristineAsync(repositoryRoot, request, pristine, pristineDataRoot, ct);
            FoodVocabularyDefinitions.Require(JsonElement.DeepEquals(schema, await V1ExactSourceAdmission.ObserveSchemaAsync(admission, ct)));
            var current = SafeFiles(copyDataRoot).ToDictionary(x => Path.GetRelativePath(copyDataRoot, x).Replace('\\', '/'), x => x, StringComparer.Ordinal);
            FoodVocabularyDefinitions.Require(current.Keys.ToHashSet(StringComparer.Ordinal).SetEquals(files.Keys));
            foreach (var (relative, sha) in files)
                FoodVocabularyDefinitions.Require(TransitionHash(await File.ReadAllBytesAsync(current[relative], ct)) == sha);
            await owner.RequireUnchangedSnapshotAsync(package.Snapshot, ct);
            await RequireRetainedHistoryArtifactsAsync(package.Envelope, package.AuthorityBytes, ct);
            await RequireRetainedCoverageAsync(coverage, ct);
        }
        internal async Task RevalidateAsync(CancellationToken ct)
        {
            await owner.RevalidateSnapshotSourceAsync(source, repositoryRoot, copyDataRoot, request, admission, ct);
            await owner.RequireUnchangedSnapshotAsync(package.Snapshot, ct);
            await RequireRetainedHistoryArtifactsAsync(package.Envelope, package.AuthorityBytes, ct);
            await RequireRetainedCoverageAsync(coverage, ct);
        }
        internal static async Task<V1TransitionSourceLease> OpenAsync(RecoverySnapshotService owner, string repositoryRoot, string copyDataRoot, V1TransitionRequest transitionRequest, CancellationToken ct)
        {
            owner.RequireAttestedHistoryConfiguration(copyDataRoot);
            var coverageRequestBytes = V1MigrationPrewritePolicy.CoverageRequest(repositoryRoot);
            var coverageRequest = V1SourceCoveragePolicy.Load(repositoryRoot, coverageRequestBytes);
            var request = V1SourceCoveragePolicy.SourceRequest(repositoryRoot, coverageRequest);
            var intent = V1ExactSourceAdmission.FullSnapshotPolicy(repositoryRoot, request);
            var lease = await owner.TransitionBoundary.EnterAsync(RecoveryAccess.Snapshot, ct);
            IDbContextTransaction? transaction = null;
            NpgsqlConnection? admission = null, pristine = null;
            NpgsqlTransaction? pristineTransaction = null;
            try
            {
                transaction = await owner.TransitionDb.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
                var connection = (NpgsqlConnection)owner.TransitionDb.Database.GetDbConnection();
                await ScalarAsync(connection, "SET LOCAL search_path = pg_catalog, public, pg_temp", ct);
                await LockAttestedSnapshotTablesAsync(repositoryRoot, intent, connection, ct);
                admission = await owner.OpenAsync(ct);
                var pristineConnection = new NpgsqlConnectionStringBuilder(owner.TransitionDb.Database.GetConnectionString())
                {
                    Database = transitionRequest.SourcePristineDatabase
                };
                pristine = new NpgsqlConnection(pristineConnection.ConnectionString);
                await pristine.OpenAsync(ct);
                await RequireTransitionReadOnlySourceRoleAsync(pristine, ct);
                pristineTransaction = await pristine.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
                await ScalarAsync(pristine, "SET LOCAL search_path = pg_catalog, public, pg_temp", ct);
                await V1ExactSourceAdmission.LockTransitionPristineAsync(repositoryRoot, request, pristine, ct);
                await V1ExactSourceAdmission.RequireTransitionPristineAsync(repositoryRoot, request, pristine, transitionRequest.SourcePristineDataRoot, ct);
                var source = await owner.ReconstructAttestedSnapshotSourceAsync(repositoryRoot, copyDataRoot, request, admission, ct);
                var predecessor = coverageRequest.GetProperty("source").GetProperty("package");
                var payload = Path.GetDirectoryName(SnapshotTaskPath(repositoryRoot, predecessor.GetProperty("manifest"), "path"))!;
                var envelope = Path.GetDirectoryName(SnapshotTaskPath(repositoryRoot, predecessor.GetProperty("lineage"), "path"))!;
                var package = await owner.InspectAttestedSnapshotAsync(payload, envelope, source, connection, request, true, ct);
                var coverage = await owner.ObserveSourceCoverageAsync(repositoryRoot, copyDataRoot, coverageRequestBytes,
                    File.ReadAllBytes(Path.Combine(repositoryRoot, ".task/v1-source-coverage-implementation/attempt-input.json")), coverageRequest,
                    Path.Combine(repositoryRoot, ".task/v1-source-coverage-implementation/final-coverage"), true, source, connection, package, ct);
                var result = new V1TransitionSourceLease(owner, repositoryRoot, copyDataRoot, request, lease, transaction, admission, source, package, coverage,
                    await V1ExactSourceAdmission.ObserveSchemaAsync(admission, ct), pristine, pristineTransaction, transitionRequest.SourcePristineDataRoot);
                await result.RevalidateAsync(ct);
                return result;
            }
            catch
            {
                if (pristineTransaction is not null) await pristineTransaction.DisposeAsync();
                if (pristine is not null) await pristine.DisposeAsync();
                if (transaction is not null) await transaction.DisposeAsync();
                if (admission is not null) await admission.DisposeAsync();
                await lease.DisposeAsync();
                throw;
            }
        }

        public async ValueTask DisposeAsync()
        {
            try { await transaction.RollbackAsync(); }
            finally
            {
                await transaction.DisposeAsync();
                await pristineTransaction.DisposeAsync();
                await pristine.DisposeAsync();
                await admission.DisposeAsync();
                await lease.DisposeAsync();
            }
        }
    }

    private Task<V1TransitionSourceLease> OpenTransitionSourceAsync(string repositoryRoot, string copyDataRoot, V1TransitionRequest request, CancellationToken ct)
        => V1TransitionSourceLease.OpenAsync(this, repositoryRoot, copyDataRoot, request, ct);

    private sealed record TransitionBuild(int Version, string CandidateCommit, string ApiAssemblySha256, string SourceKind,
        RecoveryFile SourceManifest, string RuntimeImageId, string DatabaseContainerId, string SdkContainerId);
    private sealed record TransitionSourceManifest(int Version, string BaseCommit, RecoveryFile[] Files);

    private static void RequireTransitionBuild(string root, V1TransitionRequest request, string? buildBundle = null)
    {
        buildBundle ??= V1AuthorityTransitionPolicy.Bundle(root);
        var build = TransitionRead<TransitionBuild>(V1AuthorityTransitionPolicy.BoundFile(root, request.BuildProvenance));
        FoodVocabularyDefinitions.Require(build.Version == 1 && build.CandidateCommit == request.CandidateCommit
            && build.ApiAssemblySha256 == request.ApiAssemblySha256 && build.SourceKind is "immutable-working-tree" or "git-commit"
            && build.RuntimeImageId == request.RuntimeImageId && build.DatabaseContainerId == request.DatabaseContainerId
            && System.Text.RegularExpressions.Regex.IsMatch(build.SdkContainerId, "^[a-f0-9]{64}$")
            && build.SourceManifest.Path == Path.GetRelativePath(root, Path.Combine(buildBundle, "caller/source-manifest.json")).Replace('\\', '/'));
        var manifest = TransitionRead<TransitionSourceManifest>(V1AuthorityTransitionPolicy.BoundFile(root, build.SourceManifest));
        FoodVocabularyDefinitions.Require(manifest.Version == 1 && manifest.BaseCommit == request.CandidateCommit
            && manifest.Files is { Length: > 0 } && manifest.Files.Select(x => x.Path).Distinct(StringComparer.Ordinal).Count() == manifest.Files.Length);
        var source = Path.Combine(buildBundle, "candidate-source");
        foreach (var file in manifest.Files)
        {
            // Empty tracked inputs are valid source files, unlike the nonempty
            // authority artifacts accepted by BoundFile.
            FoodVocabularyDefinitions.Require(file.Length >= 0);
            var bytes = V1AuthorityTransitionPolicy.Exact(source, file.Path, file.Sha256);
            FoodVocabularyDefinitions.Require(bytes.LongLength == file.Length);
        }
    }

    private async Task RequireTransitionGraphsAsync(V1TransitionRequest request, RecoverySnapshotService source,
        RecipesRootResolver executionRoots, CancellationToken ct)
    {
        FoodVocabularyDefinitions.Require(OperatingSystem.IsLinux() && !ReferenceEquals(this, source)
            && !ReferenceEquals(db, source.TransitionDb) && !ReferenceEquals(boundary, source.TransitionBoundary)
            && !ReferenceEquals(vocabulary, source.TransitionVocabulary) && !ReferenceEquals(recipes, source.TransitionRoots)
            && ReferenceEquals(recipes, executionRoots) && data.Root == request.ExecutionDataRoot
            && recipes.BaseRoot == Path.Combine(request.ExecutionDataRoot, "recipes") && recipes.Generation == request.ExecutionGeneration
            && source.TransitionData.Root == request.SourceDataRoot && source.TransitionRoots.BaseRoot == Path.Combine(request.SourceDataRoot, "recipes")
            && source.TransitionRoots.Generation == request.SourceGeneration);
        boundary.RequireMigrationTarget(db, executionRoots);
        source.TransitionBoundary.RequireMigrationTarget(source.TransitionDb, source.TransitionRoots);
        vocabulary.RequireMigrationTarget(db, recipes, boundary);
        source.TransitionVocabulary.RequireMigrationTarget(source.TransitionDb, source.TransitionRoots, source.TransitionBoundary);
        foreach (var (service, database, endpoint, role) in new[] {
            (this, request.ExecutionDatabase, request.ExecutionEndpoint, request.ExecutionRole),
            (source, request.SourceDatabase, request.SourceEndpoint, request.SourceRole) })
        {
            var configured = new NpgsqlConnectionStringBuilder(service.TransitionDb.Database.GetConnectionString());
            FoodVocabularyDefinitions.Require(configured.Database == database && configured.Host + ":" + configured.Port == endpoint
                && configured.Username == role);
            await using var connection = await service.OpenAsync(ct);
            FoodVocabularyDefinitions.Require((string)(await new NpgsqlCommand("SELECT current_database()", connection).ExecuteScalarAsync(ct))! == database
                && (string)(await new NpgsqlCommand("SELECT current_user", connection).ExecuteScalarAsync(ct))! == role
                && (string)(await new NpgsqlCommand("SHOW server_version", connection).ExecuteScalarAsync(ct))! == request.PostgresVersion);
            if (ReferenceEquals(service, source)) await RequireTransitionReadOnlySourceRoleAsync(connection, ct);
        }
    }

    private static async Task RequireTransitionReadOnlySourceRoleAsync(NpgsqlConnection connection, CancellationToken ct)
    {
        var permitted = (bool)(await new NpgsqlCommand("""
                    SELECT NOT (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls)
                      AND NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE member = r.oid)
                      AND NOT has_schema_privilege(current_user, 'public', 'CREATE')
                      AND NOT has_database_privilege(current_user, current_database(), 'CREATE')
                      AND NOT EXISTS (SELECT 1 FROM pg_database WHERE datname=current_database() AND datdba=r.oid)
                      AND NOT EXISTS (
                        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                        WHERE n.nspname='public' AND c.relkind IN ('r','p') AND
                          (c.relowner=r.oid OR NOT has_table_privilege(current_user,c.oid,'SELECT')
                           OR NOT has_table_privilege(current_user,c.oid,'MAINTAIN')
                           OR has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER')))
                    FROM pg_roles r WHERE rolname=current_user
                    """, connection).ExecuteScalarAsync(ct))!;
        FoodVocabularyDefinitions.Require(permitted);
    }
}
