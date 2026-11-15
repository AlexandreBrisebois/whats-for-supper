using System.Reflection;
using System.Text.Json;
using Npgsql;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed class V1SchemaLineagePostgresTests
{
    private static readonly Type Owner = typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1ExactSourceAdmission")!;
    private static Task<JsonElement> Catalog(NpgsqlConnection connection) => (Task<JsonElement>)Owner
        .GetMethod("ObserveSchemaAsync", BindingFlags.NonPublic | BindingFlags.Static)!.Invoke(null, [connection, CancellationToken.None])!;
    private static Task<string> Digest(NpgsqlConnection connection) => (Task<string>)Owner
        .GetMethod("ProjectedDigestAsync", BindingFlags.NonPublic | BindingFlags.Static)!.Invoke(null,
            [connection, "original_facts", new[] { "id", "human_note", "payload" }, CancellationToken.None])!;

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OriginalProjectionPreservesWholeRowsAcrossNullableAdditionAndDetectsOriginalChanges()
    {
        await WithDatabase(async connection =>
        {
            await new NpgsqlCommand("CREATE TABLE original_facts(id uuid PRIMARY KEY,human_note text,payload jsonb); INSERT INTO original_facts VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','human fact','{\"b\":2,\"a\":1}'),('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',NULL,NULL)", connection).ExecuteNonQueryAsync();
            var original = await Digest(connection);
            var wholeRow = (string)(await new NpgsqlCommand("SELECT count(*)::text||'|'||md5(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text) FROM original_facts t", connection).ExecuteScalarAsync())!;
            Assert.Equal(wholeRow, original);
            await new NpgsqlCommand("ALTER TABLE original_facts ADD COLUMN food_mapping_evidence jsonb", connection).ExecuteNonQueryAsync();
            Assert.Equal(original, await Digest(connection));
            Assert.Equal(2L, await new NpgsqlCommand("SELECT count(*) FROM original_facts WHERE food_mapping_evidence IS NULL", connection).ExecuteScalarAsync());
            await new NpgsqlCommand("UPDATE original_facts SET human_note='changed' WHERE human_note IS NOT NULL", connection).ExecuteNonQueryAsync();
            Assert.NotEqual(original, await Digest(connection));
            await new NpgsqlCommand("UPDATE original_facts SET human_note='human fact' WHERE human_note='changed'; DELETE FROM original_facts WHERE human_note IS NULL", connection).ExecuteNonQueryAsync();
            Assert.NotEqual(original, await Digest(connection));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CatalogRetainsOldConstraintAndDetectsColumnIndexAndFunctionChanges()
    {
        await WithDatabase(async connection =>
        {
            await new NpgsqlCommand("CREATE TABLE parent_facts(id uuid PRIMARY KEY); CREATE TABLE original_facts(id uuid PRIMARY KEY REFERENCES parent_facts(id),human_note text,payload jsonb,CONSTRAINT original_check CHECK(human_note IS NULL OR length(human_note)>0))", connection).ExecuteNonQueryAsync();
            var original = await Catalog(connection);
            foreach (var sql in new[] {
                "ALTER TABLE original_facts ADD COLUMN extra text",
                "CREATE INDEX unreviewed_index ON original_facts(human_note)",
                "ALTER TABLE original_facts DROP CONSTRAINT original_check",
                "CREATE FUNCTION unreviewed_function() RETURNS integer LANGUAGE sql AS 'SELECT 1'",
                "CREATE SCHEMA unreviewed_schema",
                "CREATE TYPE public.unreviewed_type AS ENUM ('x')",
                "ALTER TABLE original_facts DISABLE TRIGGER ALL"
            })
            {
                await using var transaction = await connection.BeginTransactionAsync();
                await new NpgsqlCommand(sql, connection).ExecuteNonQueryAsync();
                Assert.False(JsonElement.DeepEquals(original, await Catalog(connection)));
                await transaction.RollbackAsync();
                Assert.True(JsonElement.DeepEquals(original, await Catalog(connection)));
            }
        });
    }

    private static async Task WithDatabase(Func<NpgsqlConnection, Task> action)
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        await using var admin = new NpgsqlConnection(settings.ConnectionString);
        await admin.OpenAsync();
        var database = "wfs_v1_schema_test_" + Guid.NewGuid().ToString("N");
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        try
        {
            settings.Database = database;
            await using var connection = new NpgsqlConnection(settings.ConnectionString);
            await connection.OpenAsync();
            await action(connection);
        }
        finally { await new NpgsqlCommand($"DROP DATABASE {database} WITH (FORCE)", admin).ExecuteNonQueryAsync(); }
    }
}
