using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Models;
using Xunit;

namespace RecipeApi.Tests.Integration;

// Isolated disposable databases only; the supplied connection is used to create/drop them.
public class FamilyContrastPostgresTests
{
    [FamilyContrastPostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task InstallAndCompatibility_PersistContrastModeAndEnforceCheckConstraint(bool upgrade)
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        var database = $"wfs_contrast_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(settings.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        try
        {
            settings.Database = database;
            await using var connection = new NpgsqlConnection(settings.ConnectionString);
            await connection.OpenAsync();

            var schema = ReadSql("schema.sql");
            if (upgrade)
            {
                schema = string.Join('\n', schema.Split('\n').Where(line => !line.Contains("contrast_mode", StringComparison.OrdinalIgnoreCase)));
            }
            await new NpgsqlCommand(schema, connection).ExecuteNonQueryAsync();

            var existingId = Guid.NewGuid();
            await new NpgsqlCommand(
                $"INSERT INTO family_members (id, name) VALUES ('{existingId}', 'PreExistingMember')",
                connection).ExecuteNonQueryAsync();

            if (upgrade)
            {
                var compatibility = ReadSql("compatibility.sql");
                await new NpgsqlCommand(compatibility, connection).ExecuteNonQueryAsync();
                // Idempotent second run must succeed cleanly without altering constraint.
                await new NpgsqlCommand(compatibility, connection).ExecuteNonQueryAsync();
            }

            var initialContrast = await new NpgsqlCommand(
                $"SELECT contrast_mode FROM family_members WHERE id = '{existingId}'",
                connection).ExecuteScalarAsync();
            Assert.Equal(DBNull.Value, initialContrast);

            await new NpgsqlCommand(
                $"UPDATE family_members SET contrast_mode = 'standard' WHERE id = '{existingId}'",
                connection).ExecuteNonQueryAsync();
            Assert.Equal("standard", await new NpgsqlCommand(
                $"SELECT contrast_mode FROM family_members WHERE id = '{existingId}'",
                connection).ExecuteScalarAsync());

            await new NpgsqlCommand(
                $"UPDATE family_members SET contrast_mode = 'high' WHERE id = '{existingId}'",
                connection).ExecuteNonQueryAsync();
            Assert.Equal("high", await new NpgsqlCommand(
                $"SELECT contrast_mode FROM family_members WHERE id = '{existingId}'",
                connection).ExecuteScalarAsync());

            await new NpgsqlCommand(
                $"UPDATE family_members SET contrast_mode = NULL WHERE id = '{existingId}'",
                connection).ExecuteNonQueryAsync();
            Assert.Equal(DBNull.Value, await new NpgsqlCommand(
                $"SELECT contrast_mode FROM family_members WHERE id = '{existingId}'",
                connection).ExecuteScalarAsync());

            var failure = await Assert.ThrowsAsync<PostgresException>(() =>
                new NpgsqlCommand(
                    $"UPDATE family_members SET contrast_mode = 'ultra' WHERE id = '{existingId}'",
                    connection).ExecuteNonQueryAsync());
            Assert.Equal("23514", failure.SqlState);

            await using var db = new RecipeDbContext(
                new DbContextOptionsBuilder<RecipeDbContext>()
                    .UseNpgsql(settings.ConnectionString)
                    .Options);
            var efMemberId = Guid.NewGuid();
            db.FamilyMembers.Add(new FamilyMember
            {
                Id = efMemberId,
                Name = "EfContrastMember",
                ContrastMode = "high",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();

            var reloaded = await db.FamilyMembers.SingleAsync(m => m.Id == efMemberId);
            Assert.Equal("high", reloaded.ContrastMode);
            reloaded.ContrastMode = "standard";
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
            Assert.Equal("standard", (await db.FamilyMembers.SingleAsync(m => m.Id == efMemberId)).ContrastMode);
            reloaded = await db.FamilyMembers.SingleAsync(m => m.Id == efMemberId);
            reloaded.ContrastMode = null;
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
            Assert.Null((await db.FamilyMembers.SingleAsync(m => m.Id == efMemberId)).ContrastMode);
        }
        finally
        {
            await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync();
        }
    }

    private static string ReadSql(string name)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory != null)
        {
            var path = Path.Combine(directory.FullName, "api", "database", name);
            if (File.Exists(path)) return File.ReadAllText(path);
            directory = directory.Parent;
        }
        throw new FileNotFoundException(name);
    }

    public sealed class FamilyContrastPostgresTheoryAttribute : TheoryAttribute
    {
        public FamilyContrastPostgresTheoryAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")))
                Skip = "Set WFS_TEST_POSTGRES_CONNECTION to an isolated PostgreSQL test admin connection.";
        }
    }
}
