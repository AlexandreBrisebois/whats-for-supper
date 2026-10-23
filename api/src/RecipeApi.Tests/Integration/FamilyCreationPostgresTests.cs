using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Npgsql;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed class FamilyCreationPostgresTests
{
    [PostgresFact]
    public async Task Create_Returns201_AndIsRetrievableFromPostgres()
    {
        // The configured connection is administrative only. Never write household data.
        var settings = new NpgsqlConnectionStringBuilder(
            Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        var database = $"wfs_family_creation_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(settings.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        try
        {
            settings.Database = database;
            await using (var connection = new NpgsqlConnection(settings.ConnectionString))
            {
                await connection.OpenAsync();
                var root = new DirectoryInfo(AppContext.BaseDirectory);
                while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "api", "database")))
                    root = root.Parent;
                var sql = await File.ReadAllTextAsync(Path.Combine(root!.FullName, "api", "database", "schema.sql"));
                await new NpgsqlCommand(sql, connection).ExecuteNonQueryAsync();
            }
            await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
            {
                ["Tests:PostgresConnectionString"] = settings.ConnectionString
            });
            using var client = factory.CreateClient();
            var response = await client.PostAsJsonAsync("/api/family", new { name = " cAsEy " });
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            using var created = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var member = created.RootElement.GetProperty("data");
            var id = member.GetProperty("id").GetGuid();
            Assert.NotEqual(Guid.Empty, id);
            Assert.Equal("cAsEy", member.GetProperty("name").GetString());
            Assert.Equal("stack", member.GetProperty("browseViewMode").GetString());
            Assert.Equal(JsonValueKind.Null, member.GetProperty("cookingViewMode").ValueKind);
            Assert.Equal(JsonValueKind.Null, member.GetProperty("preferredLanguage").ValueKind);
            Assert.True(member.GetProperty("createdAt").TryGetDateTimeOffset(out _));
            Assert.True(member.GetProperty("updatedAt").TryGetDateTimeOffset(out _));

            var listResponse = await client.GetAsync("/api/family");
            Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
            using var listed = JsonDocument.Parse(await listResponse.Content.ReadAsStringAsync());
            Assert.Contains(listed.RootElement.GetProperty("data").EnumerateArray(),
                item => item.GetProperty("id").GetGuid() == id
                    && item.GetProperty("name").GetString() == "cAsEy");

            // Independent connection confirms the row outlives the request's DbContext.
            await using var persisted = new NpgsqlConnection(settings.ConnectionString);
            await persisted.OpenAsync();
            await using var query = new NpgsqlCommand("SELECT name FROM family_members WHERE id = @id", persisted);
            query.Parameters.AddWithValue("id", id);
            Assert.Equal("cAsEy", await query.ExecuteScalarAsync());
        }
        finally
        {
            await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync();
        }
    }

    [PostgresFact]
    public async Task Create_Duplicate_RejectsWith409_AndEnforcesUniquenessInPostgres()
    {
        var settings = new NpgsqlConnectionStringBuilder(
            Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
        var database = $"wfs_family_dupe_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(settings.ConnectionString);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE DATABASE {database}", admin).ExecuteNonQueryAsync();
        try
        {
            settings.Database = database;
            await using (var connection = new NpgsqlConnection(settings.ConnectionString))
            {
                await connection.OpenAsync();
                var root = new DirectoryInfo(AppContext.BaseDirectory);
                while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "api", "database")))
                    root = root.Parent;
                var sql = await File.ReadAllTextAsync(Path.Combine(root!.FullName, "api", "database", "schema.sql"));
                await new NpgsqlCommand(sql, connection).ExecuteNonQueryAsync();
            }
            await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
            {
                ["Tests:PostgresConnectionString"] = settings.ConnectionString
            });
            using var client = factory.CreateClient();

            // 1. Initial creation succeeds
            var response1 = await client.PostAsJsonAsync("/api/family", new { name = "Alex" });
            Assert.Equal(HttpStatusCode.Created, response1.StatusCode);

            // 2. Exact duplicate rejected with 409
            var responseExact = await client.PostAsJsonAsync("/api/family", new { name = "Alex" });
            Assert.Equal(HttpStatusCode.Conflict, responseExact.StatusCode);
            using var docExact = JsonDocument.Parse(await responseExact.Content.ReadAsStringAsync());
            Assert.Equal(409, docExact.RootElement.GetProperty("status").GetInt32());

            // 3. Case variant rejected with 409
            var responseCase = await client.PostAsJsonAsync("/api/family", new { name = "alex" });
            Assert.Equal(HttpStatusCode.Conflict, responseCase.StatusCode);

            // 4. Whitespace variant rejected with 409
            var responseWs = await client.PostAsJsonAsync("/api/family", new { name = "  Alex  " });
            Assert.Equal(HttpStatusCode.Conflict, responseWs.StatusCode);

            // 5. Concurrent creation with equivalent names only creates at most one
            var t1 = client.PostAsJsonAsync("/api/family", new { name = "Sam" });
            var t2 = client.PostAsJsonAsync("/api/family", new { name = " sam " });
            var results = await Task.WhenAll(t1, t2);
            var statusCodes = results.Select(r => r.StatusCode).ToList();
            Assert.Contains(HttpStatusCode.Created, statusCodes);
            Assert.Contains(HttpStatusCode.Conflict, statusCodes);

            // Independent connection confirms the database state
            await using var persisted = new NpgsqlConnection(settings.ConnectionString);
            await persisted.OpenAsync();
            await using var qAlex = new NpgsqlCommand("SELECT count(*) FROM family_members WHERE lower(trim(name)) = 'alex'", persisted);
            Assert.Equal(1L, Convert.ToInt64(await qAlex.ExecuteScalarAsync()));
            await using var qSam = new NpgsqlCommand("SELECT count(*) FROM family_members WHERE lower(trim(name)) = 'sam'", persisted);
            Assert.Equal(1L, Convert.ToInt64(await qSam.ExecuteScalarAsync()));
        }
        finally
        {
            await new NpgsqlCommand($"DROP DATABASE IF EXISTS {database} WITH (FORCE)", admin).ExecuteNonQueryAsync();
        }
    }

    private sealed class PostgresFactAttribute : FactAttribute
    {
        public PostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")))
                Skip = "Set WFS_TEST_POSTGRES_CONNECTION to run disposable PostgreSQL family creation.";
        }
    }
}
