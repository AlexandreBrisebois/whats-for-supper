using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using RecipeApi.Infrastructure;
using Npgsql;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed class V1SourceCoveragePostgresTests
{
    private static readonly byte[] Request = Encoding.UTF8.GetBytes("isolated coverage durability control; no source authority");
    private static readonly DateTimeOffset Time = DateTimeOffset.Parse("2026-11-15T12:34:56.1234567Z");
    private static byte[] Attempt(string hash) => JsonSerializer.SerializeToUtf8Bytes(new
        { version = 1, requestSha256 = hash, capturedAt = Time });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CoverageAttemptResumesExactPendingBytesAndTimeWithoutReadingClock()
    {
        var root = NewRoot();
        try
        {
            var bytes = Attempt(Convert.ToHexStringLower(SHA256.HashData(Request)));
            File.WriteAllBytes(Path.Combine(root, "attempt.json.pending"), bytes);
            var snapshot = new RecoverySnapshotService(null!, null!, null!, new ConfigurationBuilder().Build(),
                new UnavailableClock(), null!, null!, null!);
            await (Task)typeof(RecoverySnapshotService).GetMethod("SnapshotAttemptAsync", BindingFlags.NonPublic | BindingFlags.Instance)!
                .Invoke(snapshot, [root, Request, CancellationToken.None])!;
            Assert.Equal(bytes, File.ReadAllBytes(Path.Combine(root, "attempt.json")));
            Assert.False(File.Exists(Path.Combine(root, "attempt.json.pending")));
        }
        finally { Directory.Delete(root, true); }
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task DivergentPendingOrCompletedCoverageBytesAreNeverOverwritten()
    {
        var root = NewRoot();
        try
        {
            var path = Path.Combine(root, "payload/coverage.json");
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            var expected = Encoding.UTF8.GetBytes("expected coverage bytes");
            var foreign = Encoding.UTF8.GetBytes("foreign coverage bytes");
            File.WriteAllBytes(path + ".pending", foreign);
            await Assert.ThrowsAsync<InvalidDataException>(() => Retain(root, expected));
            Assert.Equal(foreign, File.ReadAllBytes(path + ".pending"));
            Assert.False(File.Exists(path));
            File.Delete(path + ".pending");
            File.WriteAllBytes(path, foreign);
            await Assert.ThrowsAsync<InvalidDataException>(() => Retain(root, expected));
            Assert.Equal(foreign, File.ReadAllBytes(path));
            File.WriteAllBytes(path, expected);
            File.WriteAllBytes(path + ".pending", expected);
            await Retain(root, expected);
            Assert.Equal(expected, File.ReadAllBytes(path));
            Assert.False(File.Exists(path + ".pending"));
        }
        finally { Directory.Delete(root, true); }
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ForeignOrCorruptAttemptPendingFailsWithoutReplacement()
    {
        var root = NewRoot();
        try
        {
            foreach (var bytes in new[] { Attempt(new string('0', 64)), Encoding.UTF8.GetBytes("{\"version\":1"),
                Encoding.UTF8.GetBytes("{\"version\":1,\"version\":1}") })
            {
                var path = Path.Combine(root, "attempt.json.pending");
                File.WriteAllBytes(path, bytes);
                var snapshot = new RecoverySnapshotService(null!, null!, null!, new ConfigurationBuilder().Build(),
                    new UnavailableClock(), null!, null!, null!);
                await Assert.ThrowsAsync<InvalidDataException>(async () => await (Task)typeof(RecoverySnapshotService)
                    .GetMethod("SnapshotAttemptAsync", BindingFlags.NonPublic | BindingFlags.Instance)!
                    .Invoke(snapshot, [root, Request, CancellationToken.None])!);
                Assert.Equal(bytes, File.ReadAllBytes(path));
                Assert.False(File.Exists(Path.Combine(root, "attempt.json")));
            }
        }
        finally { Directory.Delete(root, true); }
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task AllPublicCoverageSchemaIncludesProtectedViewColumns()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        await using var admin = new NpgsqlConnection(settings.ConnectionString);
        await admin.OpenAsync();
        var name = "wfs_coverage_schema_" + Guid.NewGuid().ToString("N");
        await new NpgsqlCommand($"CREATE DATABASE {name}", admin).ExecuteNonQueryAsync();
        try
        {
            settings.Database = name;
            await using var connection = new NpgsqlConnection(settings.ConnectionString);
            await connection.OpenAsync();
            await new NpgsqlCommand("CREATE TABLE protected_facts(id uuid PRIMARY KEY); CREATE VIEW protected_view AS SELECT id FROM protected_facts", connection).ExecuteNonQueryAsync();
            var expected = await (Task<string>)typeof(RecoverySnapshotService).GetMethod("SchemaAsync", BindingFlags.NonPublic | BindingFlags.Static)!
                .Invoke(null, [connection, CancellationToken.None, new[] { "protected_facts", "protected_view" }])!;
            var observed = await (Task<string>)typeof(RecoverySnapshotService).GetMethod("CoveragePublicSchemaAsync", BindingFlags.NonPublic | BindingFlags.Static)!
                .Invoke(null, [connection, CancellationToken.None])!;
            Assert.Equal(expected.ToLowerInvariant(), observed);
        }
        finally { await new NpgsqlCommand($"DROP DATABASE {name} WITH (FORCE)", admin).ExecuteNonQueryAsync(); }
    }

    private static Task Retain(string root, byte[] bytes) => (Task)typeof(RecoverySnapshotService)
        .GetMethod("RetainCoverageArtifactAsync", BindingFlags.NonPublic | BindingFlags.Static)!
        .Invoke(null, [root, "payload/coverage.json", bytes, CancellationToken.None])!;

    private static string NewRoot()
    {
        var root = Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(), ".task", "coverage-durability-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        return root;
    }

    private sealed class UnavailableClock : IClock
    {
        public DateTimeOffset UtcNow => throw new InvalidOperationException("Retry must retain the original time.");
    }
}
