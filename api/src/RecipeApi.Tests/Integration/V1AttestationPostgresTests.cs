using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed class V1AttestationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PostgresTextExtractionPreservesAttestedResultBytesAndStrictRejection()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        await using var admin = new NpgsqlConnection(settings.ConnectionString);
        await admin.OpenAsync();
        var database = "wfs_v1_text_" + Guid.NewGuid().ToString("N");
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        try
        {
            settings.Database = database;
            await using var connection = new NpgsqlConnection(settings.ConnectionString);
            await connection.OpenAsync();
            await new NpgsqlCommand("CREATE TABLE canonical_recipe_operations(recipe_id uuid,operation_id uuid,input_hash text,original_request text,result jsonb,created_at timestamptz)", connection).ExecuteNonQueryAsync();
            var original = V1AttestationTests.Original();
            await using (var insert = new NpgsqlCommand("INSERT INTO canonical_recipe_operations VALUES (@r,@o,@h,@q,@v::jsonb,@t)", connection))
            {
                insert.Parameters.AddWithValue("r", original.RecipeId); insert.Parameters.AddWithValue("o", original.OperationId);
                insert.Parameters.AddWithValue("h", original.InputHash); insert.Parameters.AddWithValue("q", original.OriginalRequest!);
                insert.Parameters.AddWithValue("v", original.Result); insert.Parameters.AddWithValue("t", original.CreatedAt);
                await insert.ExecuteNonQueryAsync();
            }
            await using var transaction = await connection.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead);
            await new NpgsqlCommand("SET TRANSACTION READ ONLY", connection).ExecuteNonQueryAsync();
            var method = typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1ExactSourceAdmission")!
                .GetMethod("ExtractOperationsAsync", BindingFlags.Static | BindingFlags.NonPublic)!;
            var operations = await (Task<CanonicalRecipeOperation[]>)method.Invoke(null, [connection, CancellationToken.None])!;
            var saved = Assert.Single(operations);
            Assert.Equal(original.OriginalRequest, saved.OriginalRequest);
            Assert.Equal(original.Result, saved.Result);
            Assert.Equal(original.CreatedAt, saved.CreatedAt);
            Assert.NotEqual(original.Result, JsonSerializer.Serialize(JsonSerializer.Deserialize<JsonElement>(original.Result)));
            Assert.NotNull(V1AttestationTests.Validate(saved, V1AttestationTests.Member(saved.OperationId)));
            Assert.Throws<InvalidDataException>(() => CanonicalRecipeContentStore.VocabularyReferences(saved));
            await transaction.CommitAsync();
        }
        finally { await new NpgsqlCommand($"DROP DATABASE {database} WITH (FORCE)", admin).ExecuteNonQueryAsync(); }
    }
}
