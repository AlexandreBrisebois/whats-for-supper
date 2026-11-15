using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Npgsql;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed class V1FullSnapshotPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task InitialPendingAttemptResumesDurablyWithoutChangingItsRetainedIdentity()
    {
        var root = Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(), ".task", "snapshot-attempt-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            // This tests only the provisional-file protocol. Finite admission is
            // tested independently; these bytes cannot confer source authority.
            var request = Encoding.UTF8.GetBytes("isolated snapshot attempt control");
            var bytes = JsonSerializer.SerializeToUtf8Bytes(new { version = 1,
                requestSha256 = Convert.ToHexStringLower(SHA256.HashData(request)),
                capturedAt = DateTimeOffset.Parse("2026-11-15T00:00:00Z") });
            File.WriteAllBytes(Path.Combine(root, "attempt.json.pending"), bytes);
            var snapshot = new RecoverySnapshotService(null!, null!, null!, new ConfigurationBuilder().Build(),
                new SystemClock(), null!, null!, null!);
            var method = typeof(RecoverySnapshotService).GetMethod("SnapshotAttemptAsync", BindingFlags.Instance | BindingFlags.NonPublic)!;
            await (Task)method.Invoke(snapshot, [root, request, CancellationToken.None])!;
            Assert.Equal(bytes, File.ReadAllBytes(Path.Combine(root, "attempt.json")));
            Assert.False(File.Exists(Path.Combine(root, "attempt.json.pending")));
        }
        finally { Directory.Delete(root, true); }
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RolledBackTemporarySnapshotValidationPreservesTheObservedSourceCatalog()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        await using var admin = new NpgsqlConnection(settings.ConnectionString);
        await admin.OpenAsync();
        var database = "wfs_snapshot_catalog_" + Guid.NewGuid().ToString("N");
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        try
        {
            settings.Database = database;
            await using var source = new NpgsqlConnection(settings.ConnectionString);
            await source.OpenAsync();
            await new NpgsqlCommand("CREATE TABLE parent_facts(id uuid PRIMARY KEY); CREATE TABLE child_facts(id uuid PRIMARY KEY,parent_id uuid REFERENCES parent_facts(id));", source).ExecuteNonQueryAsync();
            await using var observation = await source.BeginTransactionAsync();
            await new NpgsqlCommand("SET LOCAL search_path = pg_catalog, public, pg_temp; LOCK TABLE public.parent_facts,public.child_facts IN SHARE MODE", source).ExecuteNonQueryAsync();
            var expected = await Catalog(source);
            await using (var validation = new NpgsqlConnection(settings.ConnectionString))
            {
                await validation.OpenAsync();
                await using var transaction = await validation.BeginTransactionAsync();
                await new NpgsqlCommand("CREATE TEMP TABLE recovery_parent_facts(LIKE public.parent_facts INCLUDING ALL) ON COMMIT DROP; CREATE TEMP TABLE recovery_child_facts(LIKE public.child_facts INCLUDING ALL) ON COMMIT DROP; ALTER TABLE pg_temp.recovery_child_facts ADD FOREIGN KEY(parent_id) REFERENCES pg_temp.recovery_parent_facts(id)", validation).ExecuteNonQueryAsync();
                Assert.True(JsonElement.DeepEquals(expected, await Catalog(source)));
                await transaction.RollbackAsync();
            }
            Assert.True(JsonElement.DeepEquals(expected, await Catalog(source)));
            await observation.RollbackAsync();
        }
        finally { await new NpgsqlCommand($"DROP DATABASE {database} WITH (FORCE)", admin).ExecuteNonQueryAsync(); }
    }

    private static Task<JsonElement> Catalog(NpgsqlConnection connection) => (Task<JsonElement>)typeof(CanonicalRecipeContentStore).Assembly
        .GetType("RecipeApi.Services.V1ExactSourceAdmission")!.GetMethod("ObserveSchemaAsync", BindingFlags.NonPublic | BindingFlags.Static)!
        .Invoke(null, [connection, CancellationToken.None])!;
}
