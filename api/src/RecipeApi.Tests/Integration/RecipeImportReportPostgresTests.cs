using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

// Opt in with WFS_TEST_POSTGRES_CONNECTION when running task test:api.
// Every test creates and drops its own database; never applies DDL to the supplied database.
public class RecipeImportReportPostgresTests : IAsyncLifetime
{
    private const string ConnectionVariable = "WFS_TEST_POSTGRES_CONNECTION";
    private readonly string _databaseName = $"wfs_report_test_{Guid.NewGuid():N}";
    private NpgsqlConnection _admin = null!;
    private RecipeDbContext _db = null!;

    public async Task InitializeAsync()
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable(ConnectionVariable))
        {
            Pooling = false
        };
        _admin = new NpgsqlConnection(connection.ConnectionString);
        await _admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {_databaseName}", _admin).ExecuteNonQueryAsync();
        connection.Database = _databaseName;
        _db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
            .UseNpgsql(connection.ConnectionString).Options);
        await using var schemaConnection = new NpgsqlConnection(connection.ConnectionString);
        await schemaConnection.OpenAsync();
        await new NpgsqlCommand(ReadDatabaseFile("schema.sql"), schemaConnection).ExecuteNonQueryAsync();
    }

    public async Task DisposeAsync()
    {
        if (_db is not null) await _db.DisposeAsync();
        if (_admin is not null)
        {
            if (_admin.State == System.Data.ConnectionState.Open)
                await new NpgsqlCommand($"DROP DATABASE IF EXISTS {_databaseName} WITH (FORCE)", _admin).ExecuteNonQueryAsync();
            await _admin.DisposeAsync();
        }
    }

    [PostgresFact]
    public async Task DuplicateOnly_AttemptStartPreservesEveryLifecycleField()
    {
        var report = await SeedAsync(["duplicate"]);
        report.LastWorkflowInstanceId = Guid.NewGuid();
        report.LastAttemptAt = DateTimeOffset.UtcNow.AddDays(-2);
        report.ReimportedAt = DateTimeOffset.UtcNow.AddDays(-1);
        report.LastError = "existing diagnostic";
        await _db.SaveChangesAsync();
        var before = await ReadAsync(report.RecipeId);

        await new RecipeImportReportService(_db).MarkAttemptStartedAsync(report.RecipeId, Guid.NewGuid());

        var after = await ReadAsync(report.RecipeId);
        Assert.Equal(before.Status, after.Status);
        Assert.Equal(before.Reasons, after.Reasons);
        Assert.Equal(before.LastWorkflowInstanceId, after.LastWorkflowInstanceId);
        Assert.Equal(before.LastAttemptAt, after.LastAttemptAt);
        Assert.Equal(before.ReimportedAt, after.ReimportedAt);
        Assert.Equal(before.LastError, after.LastError);
        Assert.Equal(before.UpdatedAt, after.UpdatedAt);
    }

    [PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ContentAndMixedReports_KeepMatchingAttemptGuardsAndSuccessStatus(bool mixed)
    {
        var reasons = mixed ? new[] { "ingredients", "steps", "duplicate" } : ["ingredients", "steps"];
        var report = await SeedAsync(reasons);
        var service = new RecipeImportReportService(_db);
        var stale = Guid.NewGuid();
        var current = Guid.NewGuid();
        await service.MarkAttemptStartedAsync(report.RecipeId, stale);
        await service.MarkAttemptStartedAsync(report.RecipeId, current);
        await service.MarkSucceededAsync(report.RecipeId, stale);
        await service.MarkFailedAsync(report.RecipeId, stale, "extract", "stale failure");
        var started = await ReadAsync(report.RecipeId);
        Assert.Equal(RecipeImportReportStatus.Reimporting, started.Status);
        Assert.Equal(current, started.LastWorkflowInstanceId);
        Assert.NotNull(started.LastAttemptAt);
        Assert.Null(started.LastError);
        Assert.Null(started.ReimportedAt);

        await service.MarkFailedAsync(report.RecipeId, current, "extract", "matching failure");
        var failed = await ReadAsync(report.RecipeId);
        Assert.Equal(RecipeImportReportStatus.ReimportFailed, failed.Status);
        Assert.Equal("reported", RecipeImportReportService.ToPublicDto(failed)!.Status);
        Assert.NotNull(failed.LastError);
        Assert.Equal(reasons, failed.Reasons);

        var retry = Guid.NewGuid();
        await service.MarkAttemptStartedAsync(report.RecipeId, retry);
        await service.MarkSucceededAsync(report.RecipeId, current);
        Assert.Equal(RecipeImportReportStatus.Reimporting, (await ReadAsync(report.RecipeId)).Status);
        await service.MarkSucceededAsync(report.RecipeId, retry);
        var succeeded = await ReadAsync(report.RecipeId);
        Assert.Equal(mixed ? RecipeImportReportStatus.Reported : RecipeImportReportStatus.ReadyToReview, succeeded.Status);
        Assert.Equal(mixed ? "reported" : "readyToReview", RecipeImportReportService.ToPublicDto(succeeded)!.Status);
        Assert.Equal(reasons, succeeded.Reasons);
        Assert.NotNull(succeeded.ReimportedAt);
        Assert.Null(succeeded.LastError);
    }

    [PostgresFact]
    public async Task MissingReport_LifecycleCallsDoNotCreateOne()
    {
        var service = new RecipeImportReportService(_db);
        var recipeId = Guid.NewGuid();
        var attempt = Guid.NewGuid();
        await service.MarkAttemptStartedAsync(recipeId, attempt);
        await service.MarkSucceededAsync(recipeId, attempt);
        await service.MarkFailedAsync(recipeId, attempt, "extract", "failure");
        Assert.Empty(await _db.RecipeImportReports.ToListAsync());
    }

    [PostgresFact]
    public async Task Compatibility_ReplacesInstalledTwoReasonConstraint_AndRemainsIdempotent()
    {
        await _db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE recipe_import_reports DROP CONSTRAINT recipe_import_reports_reasons_check;
            ALTER TABLE recipe_import_reports ADD CONSTRAINT recipe_import_reports_reasons_check CHECK (
                cardinality(reasons) > 0
                AND reasons <@ ARRAY['ingredients', 'steps']::text[]
                AND cardinality(array_positions(reasons, 'ingredients'::text)) <= 1
                AND cardinality(array_positions(reasons, 'steps'::text)) <= 1
            );
            """);
        var report = await SeedAsync(["ingredients"]);
        await Assert.ThrowsAsync<PostgresException>(() => _db.Database.ExecuteSqlAsync(
            $"UPDATE recipe_import_reports SET reasons = ARRAY['duplicate']::text[] WHERE recipe_id = {report.RecipeId}"));

        await _db.Database.ExecuteSqlRawAsync(ReadDatabaseFile("compatibility.sql"));
        await _db.Database.ExecuteSqlRawAsync(ReadDatabaseFile("compatibility.sql"));
        foreach (var reasons in new[] { new[] { "duplicate" }, ["ingredients", "steps", "duplicate"] })
        {
            await _db.Database.ExecuteSqlAsync(
                $"UPDATE recipe_import_reports SET reasons = {reasons} WHERE recipe_id = {report.RecipeId}");
            Assert.Equal(reasons, (await ReadAsync(report.RecipeId)).Reasons);
        }
        foreach (var reasons in new[] { Array.Empty<string>(), ["unknown"], ["duplicate", "duplicate"], ["ingredients", "ingredients"], ["steps", "steps"] })
        {
            var error = await Assert.ThrowsAsync<PostgresException>(() => _db.Database.ExecuteSqlAsync(
                $"UPDATE recipe_import_reports SET reasons = {reasons} WHERE recipe_id = {report.RecipeId}"));
            Assert.Equal(PostgresErrorCodes.CheckViolation, error.SqlState);
        }
    }

    private async Task<RecipeImportReport> SeedAsync(string[] reasons)
    {
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "PostgreSQL lifecycle recipe", IsReady = true };
        _db.Recipes.Add(recipe);
        var report = new RecipeImportReport { RecipeId = recipe.Id, Reasons = reasons };
        _db.RecipeImportReports.Add(report);
        await _db.SaveChangesAsync();
        return report;
    }

    private Task<RecipeImportReport> ReadAsync(Guid recipeId) =>
        _db.RecipeImportReports.AsNoTracking().SingleAsync(report => report.RecipeId == recipeId);

    private static string ReadDatabaseFile(string filename)
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "api", "database")))
            root = root.Parent;
        return File.ReadAllText(Path.Combine(root?.FullName ?? throw new DirectoryNotFoundException("Repository root not found."), "api", "database", filename));
    }

    public sealed class PostgresFactAttribute : FactAttribute
    {
        public PostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ConnectionVariable)))
                Skip = $"Set {ConnectionVariable} to run isolated PostgreSQL report verification.";
        }
    }

    public sealed class PostgresTheoryAttribute : TheoryAttribute
    {
        public PostgresTheoryAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ConnectionVariable)))
                Skip = $"Set {ConnectionVariable} to run isolated PostgreSQL report verification.";
        }
    }
}
