using System.Net;
using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Moq;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Infrastructure;
using Npgsql;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Tests.Services;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public partial class RecipeServingsPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RecipeServings_ManualEditingAndRecoveryKeepAuthoritativeCount()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var backup = Path.Combine(Path.GetTempPath(), "wfs-edit-recovery-" + Guid.NewGuid().ToString("N"));
            try {
                await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new() {
                    ["Tests:PostgresConnectionString"] = settings.ConnectionString, ["Tests:LocalRecipeStore"] = "true", ["Recovery:BackupRoot"] = backup,
                });
                using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipes = new[] { new Recipe { Name = "Known", Servings = 4, IsSynthesized = true }, new Recipe { Name = "Unknown", Servings = null, IsSynthesized = true } };
                foreach (var row in recipes) { row.RawMetadata = "{\"recipeYield\":\"4 portions\"}"; row.Ingredients = "[\"510 g beef\",\"340 g pasta\"]"; }
                db.Recipes.AddRange(recipes); await db.SaveChangesAsync(); using var client = factory.CreateAuthenticatedClient();
                foreach (var row in recipes) {
                    Assert.Equal(HttpStatusCode.OK, (await client.PatchAsync($"/api/recipes/{row.Id}", new StringContent("{}", System.Text.Encoding.UTF8, "application/json"))).StatusCode);
                    var original = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{row.Id}")).RootElement.GetProperty("recipe").GetProperty("servings");
                    Assert.Equal(row.Servings, original.ValueKind == JsonValueKind.Null ? (int?)null : original.GetInt32());
                }
                foreach (var (row, count) in recipes.Zip(new[] {3, 2})) {
                    var response = await client.PatchAsync($"/api/recipes/{row.Id}", new StringContent($"{{\"servings\":{count}}}", System.Text.Encoding.UTF8, "application/json")); Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                    Assert.Equal(HttpStatusCode.OK, (await client.PatchAsync($"/api/recipes/{row.Id}", new StringContent("{}", System.Text.Encoding.UTF8, "application/json"))).StatusCode);
                    foreach (var invalid in new[] {"null", "0", "-1", "1.5", "2147483648", "\"3\"", "true"})
                        Assert.Equal(HttpStatusCode.BadRequest, (await client.PatchAsync($"/api/recipes/{row.Id}", new StringContent("{\"servings\":" + invalid + "}", System.Text.Encoding.UTF8, "application/json"))).StatusCode);
                    var json = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{row.Id}")); Assert.Equal(count, json.RootElement.GetProperty("recipe").GetProperty("servings").GetInt32());
                }
                db.ChangeTracker.Clear(); var management = scope.ServiceProvider.GetRequiredService<ManagementService>();
                await management.BackupAsync();
                var snapshot = await scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>().CaptureAsync(CancellationToken.None);
                for (var attempt = 0; attempt < 2; attempt++) {
                    await db.Database.ExecuteSqlRawAsync("UPDATE recipes SET servings=7"); db.ChangeTracker.Clear();
                    Assert.Equal(0, (await management.RestoreAsync()).Errors);
                    foreach (var row in recipes) {
                        await RecipeServingsTests.Sync(db, new RecipeRepository(scope.ServiceProvider.GetRequiredService<IStorageProvider>()), new WorkflowTask { Payload = JsonSerializer.Serialize(new { recipeId = row.Id }) });
                        var saved = await db.Recipes.SingleAsync(r => r.Id == row.Id); Assert.Equal(row.Id == recipes[0].Id ? 3 : 2, saved.Servings); Assert.True(System.Text.Json.JsonElement.DeepEquals(JsonDocument.Parse(row.RawMetadata!).RootElement, JsonDocument.Parse(saved.RawMetadata!).RootElement)); Assert.Equal(RecipeService.DeserializeIngredients(row.Ingredients), RecipeService.DeserializeIngredients(saved.Ingredients));
                        var info = JsonSerializer.Serialize(await scope.ServiceProvider.GetRequiredService<IRecipeStore>().ReadInfoAsync(row.Id), JsonDefaults.CamelCase); Assert.DoesNotContain("servings", info); Assert.DoesNotContain("recipeYield", info);
                    }
                    Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/management/recovery/restore/{snapshot.SnapshotId}", null)).StatusCode);
                    db.ChangeTracker.Clear(); Assert.Equal(3, (await db.Recipes.SingleAsync(r => r.Id == recipes[0].Id)).Servings); Assert.Equal(2, (await db.Recipes.SingleAsync(r => r.Id == recipes[1].Id)).Servings);
                }
            } finally { if (Directory.Exists(backup)) Directory.Delete(backup, true); }
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RecipeServings_FreshSnapshotRestoresAfterAdditiveUpgradeWithUnchangedPreflight()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var backup = Path.Combine(Path.GetTempPath(), "wfs-servings-schema-" + Guid.NewGuid().ToString("N"));
            try {
                await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new() {
                    ["Tests:PostgresConnectionString"] = settings.ConnectionString, ["Tests:LocalRecipeStore"] = "true", ["Recovery:BackupRoot"] = backup,
                });
                using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var known = new Recipe { Name = "Known", Servings = 4, RawMetadata = "{\"recipeYield\":\"2 portions\"}" };
                var unknown = new Recipe { Name = "Unknown", Servings = null, RawMetadata = "{\"recipeYield\":\"4 portions\"}" };
                db.Recipes.AddRange(known, unknown); await db.SaveChangesAsync();
                var snapshot = await scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>().CaptureAsync(CancellationToken.None);
                await db.Database.ExecuteSqlRawAsync("DROP VIEW vw_discovery_recipes; ALTER TABLE recipes DROP COLUMN servings");
                await db.Database.ExecuteSqlRawAsync(await File.ReadAllTextAsync(Path.Combine(TomorrowPushPostgresTests.Root(), "api/database/compatibility.sql")));
                await db.Database.ExecuteSqlRawAsync(DiscoveryViewDdl());
                using var client = factory.CreateAuthenticatedClient();
                var response = await client.PostAsync($"/api/management/recovery/restore/{snapshot.SnapshotId}", null);
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                db.ChangeTracker.Clear();
                Assert.Equal(4, (await db.Recipes.SingleAsync(r => r.Id == known.Id)).Servings);
                Assert.Null((await db.Recipes.SingleAsync(r => r.Id == unknown.Id)).Servings);
            } finally { if (Directory.Exists(backup)) Directory.Delete(backup, true); }
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RecipeServings_SharedDiscoveryDtoReadsThePersistedCount()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var known = new Recipe { Name = "Known", Servings = 4, IsReady = true, IsDiscoverable = true };
            var unknown = new Recipe { Name = "Unknown", Servings = null, IsReady = true, IsDiscoverable = true };
            db.Recipes.AddRange(known, unknown); await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient(); client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
            var response = await client.GetAsync("/api/discovery"); Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var rows = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("data").EnumerateArray().ToList();
            var count = rows.Single(r => r.GetProperty("id").GetGuid() == known.Id).GetProperty("servings");
            Assert.Equal(JsonValueKind.Number, count.ValueKind);
            Assert.Equal(4, count.GetInt32());
            Assert.Equal(JsonValueKind.Null, rows.Single(r => r.GetProperty("id").GetGuid() == unknown.Id).GetProperty("servings").ValueKind);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RecipeServings_ContentSyncSerializesOverlappingBackfillWithoutReintroducingOldCount()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var race = new BeforeContentSave();
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new() { ["Tests:PostgresConnectionString"] = settings.ConnectionString },
                configureServices: services => services.AddDbContext<RecipeDbContext>(options => options.AddInterceptors(race)));
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = new Recipe { Name = "Previous", Servings = null, RawMetadata = "{\"recipeYield\":\"2 portions\"}", Ingredients = "[\"old\"]" };
            db.Recipes.Add(recipe); await db.SaveChangesAsync();

            var storage = scope.ServiceProvider.GetRequiredService<IStorageProvider>();
            await storage.SaveAsync("recipes", $"{recipe.Id}/recipe.info", JsonSerializer.Serialize(new RecipeInfo { Id = recipe.Id }, JsonDefaults.CamelCase));
            await storage.SaveAsync("recipes", $"{recipe.Id}/recipe.json", "{\"recipeYield\":\"unknown\",\"recipeIngredient\":[\"340 g new pasta\"]}");
            race.Armed = true;
            var sync = RecipeServingsTests.Sync(db, new RecipeRepository(storage), new WorkflowTask { Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id }) });
            await using var other = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).Options);
            Task<object?>? backfill = null;
            try {
                await race.Entered.Task.WaitAsync(TimeSpan.FromSeconds(15));
                var owner = ((NpgsqlConnection)db.Database.GetDbConnection()).ProcessID;
                await other.Database.OpenConnectionAsync();
                var waiter = ((NpgsqlConnection)other.Database.GetDbConnection()).ProcessID;
                backfill = new BackfillRecipeServingsProcessor(other, Mock.Of<IWorkflowOrchestrator>(), new SystemClock()).ExecuteAsync(new WorkflowTask(), CancellationToken.None);
                await using var observer = new NpgsqlConnection(settings.ConnectionString); await observer.OpenAsync();
                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
                var blocked = false;
                while (!backfill.IsCompleted && !blocked) {
                    await using var query = new NpgsqlCommand("SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE pid=@waiter AND datname=current_database() AND wait_event_type='Lock' AND @owner=ANY(pg_blocking_pids(pid)))", observer);
                    query.Parameters.AddWithValue("waiter", waiter); query.Parameters.AddWithValue("owner", owner);
                    blocked = (bool)(await query.ExecuteScalarAsync(timeout.Token))!;
                    if (!blocked) await Task.WhenAny(backfill, Task.Delay(20, timeout.Token)).WaitAsync(timeout.Token);
                }
                Assert.True(blocked, "Backfill must actually wait on the content sync's held PostgreSQL recipe lock.");
                Assert.False(backfill.IsCompleted);
                output.WriteLine($"Positive PostgreSQL lock wait: backfill pid {waiter} blocked by sync pid {owner}.");
                race.Release.TrySetResult();
                await sync.WaitAsync(TimeSpan.FromSeconds(15));
                var result = JsonSerializer.SerializeToElement(await backfill.WaitAsync(TimeSpan.FromSeconds(15)));
                Assert.Equal(1, result.GetProperty("Examined").GetInt32());
                Assert.Equal(0, result.GetProperty("Unresolved").GetInt32());
                Assert.Equal(0, result.GetProperty("Updated").GetInt32());
                Assert.Equal(1, result.GetProperty("Changed").GetInt32());
            } finally {
                race.Release.TrySetResult();
                await sync.WaitAsync(TimeSpan.FromSeconds(15));
                if (backfill is not null) await backfill.WaitAsync(TimeSpan.FromSeconds(15));
            }
            Assert.True(race.Ran);
            db.ChangeTracker.Clear(); var saved = await db.Recipes.SingleAsync(r => r.Id == recipe.Id);
            Assert.Null(saved.Servings); Assert.Contains("340 g new pasta", saved.Ingredients);
            Assert.Contains("unknown", saved.RawMetadata);
        });
    }

    private sealed class BeforeContentSave : DbCommandInterceptor
    {
        public bool Armed { get; set; }
        public bool Ran { get; private set; }
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override async ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            if (Armed && !Ran && command.CommandText.Contains("UPDATE recipes", StringComparison.Ordinal)) { Ran = true; Entered.TrySetResult(); await Release.Task.WaitAsync(TimeSpan.FromSeconds(15), cancellationToken); }
            return result;
        }
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RecipeServings_FreshPopulatedAndRepeatedSchemaConstraint()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var connection = new NpgsqlConnection(settings.ConnectionString);
            await connection.OpenAsync();
            var hasColumn = await new NpgsqlCommand("SELECT count(*) FROM information_schema.columns WHERE table_name='recipes' AND column_name='servings'", connection).ExecuteScalarAsync();
            Assert.Equal(1L, hasColumn);
            async Task RejectNonPositive()
            {
                foreach (var count in new[] { 0, -1 }) {
                    var ex = await Assert.ThrowsAsync<PostgresException>(() => new NpgsqlCommand($"INSERT INTO recipes (id,rating,is_discoverable,servings) VALUES ('{Guid.NewGuid()}',0,false,{count})", connection).ExecuteNonQueryAsync());
                    Assert.Equal(PostgresErrorCodes.CheckViolation, ex.SqlState);
                }
            }
            await RejectNonPositive();
            await new NpgsqlCommand("INSERT INTO recipes (id,rating,is_discoverable,is_ready,ingredients) VALUES ('11111111-1111-1111-1111-111111111111',0,true,true,'[\"340 g pasta\"]'); DROP VIEW vw_discovery_recipes; ALTER TABLE recipes DROP COLUMN servings", connection).ExecuteNonQueryAsync();
            var compatibility = await File.ReadAllTextAsync(Path.Combine(TomorrowPushPostgresTests.Root(), "api/database/compatibility.sql"));
            for (var attempt = 0; attempt < 2; attempt++) {
                await new NpgsqlCommand(compatibility, connection).ExecuteNonQueryAsync();
                await new NpgsqlCommand(DiscoveryViewDdl(), connection).ExecuteNonQueryAsync();
                Assert.Equal(DBNull.Value, await new NpgsqlCommand("SELECT servings FROM vw_discovery_recipes WHERE id='11111111-1111-1111-1111-111111111111'", connection).ExecuteScalarAsync());
                Assert.Equal(DBNull.Value, await new NpgsqlCommand("SELECT servings FROM recipes WHERE id='11111111-1111-1111-1111-111111111111'", connection).ExecuteScalarAsync());
                await RejectNonPositive();
            }
            Assert.Contains("340 g pasta", (string)(await new NpgsqlCommand("SELECT ingredients::text FROM recipes WHERE id='11111111-1111-1111-1111-111111111111'", connection).ExecuteScalarAsync())!);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RecipeServings_ProviderBoundaryThroughPostgresToHttpDetail()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var id = await RecipeServingsTests.ExtractAndSync(db);
            using var client = factory.CreateAuthenticatedClient();
            var response = await client.GetAsync($"/api/recipes/{id}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
            Assert.Equal(4, body.GetProperty("recipe").GetProperty("servings").GetInt32());
            Assert.True(body.TryGetProperty("updatedAt", out _));
            output.WriteLine("HTTP 200 recipe.servings=4; persisted 510 g beef/340 g pasta; provider boundary double only.");
        });
    }
    internal static string DiscoveryViewDdl()
    {
        var schema = File.ReadAllText(Path.Combine(TomorrowPushPostgresTests.Root(), "api/database/schema.sql"));
        var start = schema.IndexOf("CREATE OR REPLACE VIEW vw_discovery_recipes AS", StringComparison.Ordinal);
        return schema[start..(schema.IndexOf(';', start) + 1)];
    }

}
