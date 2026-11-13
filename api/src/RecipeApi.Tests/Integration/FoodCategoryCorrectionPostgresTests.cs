using Npgsql;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class FoodCategoryCorrectionPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Compatibility_CreatesRetainedOverrideStoreIdempotentlyAndRejectsIncompleteReferences() => new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
    {
        await using var connection = new NpgsqlConnection(settings.ConnectionString);
        await connection.OpenAsync();
        await new NpgsqlCommand("INSERT INTO ingredient_categories(normalized_key,grocery_section,source) VALUES ('onion','Produce','manual'); DROP TABLE household_food_overrides", connection).ExecuteNonQueryAsync();
        var sql = await File.ReadAllTextAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(), "api/database/compatibility.sql"));
        var start = sql.IndexOf("-- Retained private food decisions;", StringComparison.Ordinal);
        var end = sql.IndexOf("CREATE UNIQUE INDEX IF NOT EXISTS household_food_overrides_sequence_idx", start, StringComparison.Ordinal);
        Assert.True(start >= 0 && end > start);
        var migration = sql[start..(sql.IndexOf(';', end) + 1)];
        await new NpgsqlCommand(migration, connection).ExecuteNonQueryAsync();
        await new NpgsqlCommand(migration, connection).ExecuteNonQueryAsync();
        Assert.Equal(0L, await new NpgsqlCommand("SELECT count(*) FROM household_food_overrides", connection).ExecuteScalarAsync());
        Assert.Equal("Produce/manual", await new NpgsqlCommand("SELECT grocery_section || '/' || source FROM ingredient_categories WHERE normalized_key='onion'", connection).ExecuteScalarAsync());
        var incomplete = await Assert.ThrowsAsync<PostgresException>(() => new NpgsqlCommand("""
            INSERT INTO household_food_overrides(id,revision,food_id,dictionary_revision,document_revision,document_sha256,presentation_sequence,protected_fields,created_at,updated_at)
            VALUES ('40b0020d-04b4-4ad3-83da-d81e883275bb','opaque','ac9818ee-4c30-4f91-a4ea-0aa4fc7265ee','release','document',NULL,'1',ARRAY['grocerySection'],now(),now())
            """, connection).ExecuteNonQueryAsync());
        Assert.Equal("household_food_overrides_target_check", incomplete.ConstraintName);
        await new NpgsqlCommand("""
            INSERT INTO household_food_overrides(id,revision,fallback_key,shopping_name,presentation_sequence,protected_fields,created_at,updated_at)
            VALUES ('6e4433b3-c783-4c9c-ac97-46104897744b','legacy-opaque-revision','onion',NULL,'1',ARRAY['shoppingName'],now(),now())
            """, connection).ExecuteNonQueryAsync();
        var invalidSequence = await Assert.ThrowsAsync<PostgresException>(() => new NpgsqlCommand("""
            INSERT INTO household_food_overrides(id,revision,fallback_key,presentation_sequence,protected_fields,created_at,updated_at)
            VALUES ('9ee8eb6d-a1f0-4bde-b83e-6532def3623b','opaque','oignon','0',ARRAY['shoppingName'],now(),now())
            """, connection).ExecuteNonQueryAsync());
        Assert.Equal("household_food_overrides_sequence_check", invalidSequence.ConstraintName);
        Assert.Equal("legacy-opaque-revision", await new NpgsqlCommand("SELECT revision FROM household_food_overrides", connection).ExecuteScalarAsync());
    });
}
