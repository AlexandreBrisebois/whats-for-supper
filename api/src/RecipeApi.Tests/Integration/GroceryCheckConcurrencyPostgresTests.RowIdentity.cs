using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class GroceryCheckConcurrencyPostgresTests
{
    private const string TomatoRow = "05000000-0000-4000-8000-000000000001";
    private const string LettuceRow = "05000000-0000-4000-8000-000000000002";

    private static async Task SeedRowPlan(RecipeApi.Tests.Infrastructure.TestWebApplicationFactory factory, bool tomato = false, bool lettuce = false, string tomatoLabel = "Tomato")
    {
        await SeedPlan(factory, JsonSerializer.Serialize(new Dictionary<string, bool> { [TomatoRow] = tomato, [LettuceRow] = lettuce }));
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var rows = new List<RecipeApi.Dto.GroceryLineItemDto>();
        foreach (var (name, id, offset) in new[] { (tomatoLabel, TomatoRow, 0), ("Lettuce", LettuceRow, 1) })
        {
            var normalized = offset == 0 ? "tomato" : "lettuce";
            var recipe = new Recipe { Name = name, Servings = 4, Ingredients = JsonSerializer.Serialize(new[] { normalized }),
                RawMetadata = JsonSerializer.Serialize(new { recipeIngredient = new[] { normalized }, supply = new[] { new { name = normalized, quantity = 1 } } }) };
            db.Recipes.Add(recipe);
            db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), Date = Monday.AddDays(offset), RecipeId = recipe.Id });
            rows.Add(new(name, normalized, "Produce", 1, null, [recipe.Id], true)
            {
                RowId = id, RowVersion = "1", WeekStartDate = Monday,
                DemandIdentity = JsonSerializer.Serialize(new { fallback = normalized, bucket = "" }),
            });
        }
        (await db.WeeklyPlans.SingleAsync(plan => plan.WeekStartDate == Monday)).GroceryItems = JsonSerializer.Serialize(rows);
        await db.SaveChangesAsync();
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task WaterBucketsHaveIndependentPersistedIdentitiesAndGuardedConcurrentWrites()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await Factory(settings.ConnectionString);
            var extraId = Guid.NewGuid();
            using (var seed = factory.Services.CreateScope())
            {
                var db = seed.ServiceProvider.GetRequiredService<RecipeDbContext>();
                db.WeeklyPlans.Add(new WeeklyPlan
                {
                    WeekStartDate = Monday.AddDays(-7), GroceryState = "{\"Water\":true}",
                    GroceryItems = "[{\"displayName\":\"Water\",\"normalizedKey\":\"water\",\"section\":\"Grocery\",\"quantity\":2,\"unitText\":\"cup\",\"recipeIds\":[]}]",
                });
                var units = new[] { "g", "ml", "bottle" };
                for (var index = 0; index < units.Length; index++)
                {
                    var recipe = new Recipe
                    {
                        Id = Guid.NewGuid(), Name = $"Water fixture {index}", Ingredients = "[\"Water\"]",
                        RawMetadata = JsonSerializer.Serialize(new { recipeIngredient = new[] { "Water" }, supply = new[] { new { name = "Water", unitText = units[index] } } }),
                    };
                    db.Recipes.Add(recipe);
                    db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), RecipeId = recipe.Id, Date = Monday.AddDays(index) });
                }
                db.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(extraId, Guid.NewGuid(), Monday, "Water", "water", "Grocery", DateTimeOffset.UtcNow));
                await db.SaveChangesAsync();
                await seed.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, default);
            }
            using var client = factory.CreateAuthenticatedClient();
            var snapshot = Data(await client.GetFromJsonAsync<JsonElement>("/api/schedule?weekOffset=0"));
            var rows = snapshot.GetProperty("groceryItems").EnumerateArray().ToArray();
            Assert.Equal(3, rows.Length);
            Assert.All(snapshot.GetProperty("groceryState").EnumerateObject(), entry => Assert.False(entry.Value.GetBoolean()));
            Assert.All(rows, row => Assert.True(row.TryGetProperty("rowId", out var id) && Guid.TryParse(id.GetString(), out _), "Each water bucket needs a persisted opaque ID."));
            var ids = rows.Select(row => row.GetProperty("rowId").GetString()!).ToArray();
            Assert.Equal(3, ids.Distinct().Count());
            var initialListVersion = snapshot.GetProperty("groceryListVersion").GetString();
            var mutationId = Guid.NewGuid();
            var firstBody = new { rowId = ids[0], weekStartDate = Monday.ToString("yyyy-MM-dd"), expectedRowVersion = rows[0].GetProperty("rowVersion").GetString(), @checked = true, clientMutationId = mutationId };
            var writes = await Task.WhenAll(
                client.PatchAsJsonAsync("/api/schedule/0/grocery/item", firstBody),
                client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new { rowId = ids[1], weekStartDate = Monday.ToString("yyyy-MM-dd"), expectedRowVersion = rows[1].GetProperty("rowVersion").GetString(), @checked = true, clientMutationId = Guid.NewGuid() }));
            Assert.All(writes, response => Assert.Equal(HttpStatusCode.OK, response.StatusCode));
            var stale = await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", firstBody with { clientMutationId = Guid.NewGuid() });
            Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
            var replay = await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", firstBody);
            Assert.Equal(HttpStatusCode.OK, replay.StatusCode);
            var firstOutcome = Data(await writes[0].Content.ReadFromJsonAsync<JsonElement>());
            var replayOutcome = Data(await replay.Content.ReadFromJsonAsync<JsonElement>());
            Assert.Equal(firstOutcome.GetProperty("rowVersion").GetString(), replayOutcome.GetProperty("rowVersion").GetString());
            Assert.Equal(HttpStatusCode.Conflict, (await client.PatchAsJsonAsync("/api/schedule/0/grocery", new { weekStartDate = Monday.ToString("yyyy-MM-dd"), expectedListVersion = initialListVersion, checks = new Dictionary<string, bool>(), clientMutationId = Guid.NewGuid() })).StatusCode);
            using var fresh = factory.Services.CreateScope();
            var persisted = await fresh.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync(p => p.WeekStartDate == Monday);
            var checks = JsonSerializer.Deserialize<Dictionary<string, bool>>(persisted.GroceryState)!;
            Assert.True(checks[ids[0]]);
            Assert.True(checks[ids[1]]);
            Assert.False(checks.GetValueOrDefault(ids[2]));
            Assert.False((await fresh.ServiceProvider.GetRequiredService<RecipeDbContext>().GroceryExtraOccurrences.AsNoTracking().SingleAsync(e => e.Id == extraId)).Checked);
            var historical = await fresh.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync(p => p.WeekStartDate == Monday.AddDays(-7));
            Assert.True(JsonDocument.Parse(historical.GroceryState).RootElement.GetProperty("Water").GetBoolean());
            Assert.Equal(2, JsonDocument.Parse(historical.GroceryItems).RootElement[0].GetProperty("quantity").GetInt32());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SeparateReplicasAndRestartRetainDifferentRowWritesAndReplaySavedOutcome()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var barrier = new WeeklyPlanReadBarrier();
            var secondEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            await using var first = await Factory(settings.ConnectionString, services => services.AddDbContext<RecipeDbContext>(options => options.AddInterceptors(barrier)));
            await SeedRowPlan(first);
            await using var second = await RecipeApi.Tests.Infrastructure.TestWebApplicationFactory.CreateWithAuthAsync(
                new DeploymentCalendarIntegrationTests.CalendarClock(), new() { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString },
                configureApplication: app => app.Use(async (context, next) => { secondEntered.TrySetResult(); await next(context); }));
            using var a = first.CreateAuthenticatedClient();
            using var b = second.CreateAuthenticatedClient();
            var body = new { rowId = TomatoRow, weekStartDate = "2026-10-05", expectedRowVersion = "1", @checked = true, clientMutationId = Guid.NewGuid() };
            barrier.Enabled = true;
            var one = a.PatchAsJsonAsync("/api/schedule/0/grocery/item", body);
            try
            {
                await barrier.FirstRead.Task.WaitAsync(TimeSpan.FromSeconds(15));
                var two = b.PatchAsJsonAsync("/api/schedule/0/grocery/item", new { rowId = LettuceRow, weekStartDate = "2026-10-05", expectedRowVersion = "1", @checked = true, clientMutationId = Guid.NewGuid() });
                await secondEntered.Task.WaitAsync(TimeSpan.FromSeconds(15));
                // The providers have distinct coordinators. This observes database
                // contention while the first provider is held before its save.
                await using var connection = new Npgsql.NpgsqlConnection(settings.ConnectionString);
                await connection.OpenAsync();
                var waiting = false;
                var deadline = DateTime.UtcNow.AddSeconds(10);
                while (DateTime.UtcNow < deadline)
                {
                    waiting = (long)(await new Npgsql.NpgsqlCommand("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND NOT granted", connection).ExecuteScalarAsync())! > 0;
                    if (waiting) break;
                    await Task.Delay(10);
                }
                Assert.True(waiting, "The second replica must coordinate through PostgreSQL, not a shared in-process semaphore.");
                barrier.Release.TrySetResult();
                Assert.Equal(HttpStatusCode.OK, (await two).StatusCode);
                var initial = await one;
                Assert.Equal(HttpStatusCode.OK, initial.StatusCode);
                var saved = Data(await initial.Content.ReadFromJsonAsync<JsonElement>());
                barrier.Enabled = false;
                await first.DisposeAsync();
                await second.DisposeAsync();
                await using var restarted = await Factory(settings.ConnectionString);
                using var c = restarted.CreateAuthenticatedClient();
                var duplicate = await c.PatchAsJsonAsync("/api/schedule/0/grocery/item", body);
                Assert.Equal(HttpStatusCode.OK, duplicate.StatusCode);
                var replay = Data(await duplicate.Content.ReadFromJsonAsync<JsonElement>());
                Assert.Equal(saved.GetProperty("listVersion").GetString(), replay.GetProperty("listVersion").GetString());
                Assert.Equal(saved.GetProperty("rowVersion").GetString(), replay.GetProperty("rowVersion").GetString());
                Assert.Equal(HttpStatusCode.Conflict, (await c.PatchAsJsonAsync("/api/schedule/0/grocery/item", body with { @checked = false })).StatusCode);
                Assert.Equal(HttpStatusCode.Conflict, (await c.PatchAsJsonAsync("/api/schedule/0/grocery/item", body with { weekStartDate = "2026-10-12", clientMutationId = Guid.NewGuid() })).StatusCode);
                var checks = await ReadChecks(restarted);
                Assert.True(checks[TomatoRow]);
                Assert.True(checks[LettuceRow]);
                using var fresh = restarted.Services.CreateScope();
                Assert.Equal(2, await fresh.ServiceProvider.GetRequiredService<RecipeDbContext>().GroceryMutationOutcomes.CountAsync());
            }
            finally { barrier.Enabled = false; barrier.Release.TrySetResult(); }
        });
    }

    private static JsonElement Data(JsonElement value) => value.TryGetProperty("data", out var data) ? data : value;

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task NameOnlyItemWriteConflictsWithoutChangingPersistedChecks()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await Factory(settings.ConnectionString);
            await SeedPlan(factory);
            using var client = factory.CreateAuthenticatedClient();
            var before = await ReadChecks(factory);

            var response = await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new { ingredientName = "Water", @checked = true });

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("upgrade_required", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
            Assert.Equal(before.OrderBy(x => x.Key), (await ReadChecks(factory)).OrderBy(x => x.Key));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task NameOnlyBulkReplacementConflictsWithoutClearingCurrentChecks()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await Factory(settings.ConnectionString);
            await SeedPlan(factory);
            using var client = factory.CreateAuthenticatedClient();
            var before = await ReadChecks(factory);

            var response = await client.PatchAsJsonAsync("/api/schedule/0/grocery", new Dictionary<string, bool> { ["Water"] = true });

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("upgrade_required", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
            Assert.Equal(before.OrderBy(x => x.Key), (await ReadChecks(factory)).OrderBy(x => x.Key));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task AbsentRowWriteConflictsAndDoesNotCreatePhantomChecks()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await Factory(settings.ConnectionString);
            await SeedPlan(factory);
            using var client = factory.CreateAuthenticatedClient();
            var before = await ReadChecks(factory);

            var response = await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new
            {
                rowId = "04000000-0000-4000-8000-000000000001",
                weekStartDate = "2026-10-05",
                expectedRowVersion = "1",
                @checked = true,
                clientMutationId = "04000000-0000-4000-8000-000000000006",
            });

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal(before.OrderBy(x => x.Key), (await ReadChecks(factory)).OrderBy(x => x.Key));
            using var fresh = factory.Services.CreateScope();
            Assert.Equal("[]", (await fresh.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync(p => p.WeekStartDate == Monday)).GroceryItems);
        });
    }
}
