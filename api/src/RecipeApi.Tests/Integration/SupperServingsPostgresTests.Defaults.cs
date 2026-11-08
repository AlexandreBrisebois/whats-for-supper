using System.Data.Common;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class SupperServingsPostgresTests
{
    private static async Task<HttpResponseMessage> Put(HttpClient client, JsonElement baseline, object? usual, object[] days, bool includeDefault = true) =>
        await client.PutAsJsonAsync("/api/schedule/servings", includeDefault
            ? new { referenceWeekStartDate = "2026-10-12", weekOffset = 0, expectedVersion = baseline.GetProperty("version").GetString(), defaultServings = usual, days } as object
            : new { referenceWeekStartDate = "2026-10-12", weekOffset = 0, expectedVersion = baseline.GetProperty("version").GetString(), days });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_DefaultBatchPreservesExceptionsHistory_AndRefreshesOnlyAffectedMaterialisedWeeks()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = new Recipe { Name = "Original", Servings = 2, Ingredients = "[\"200 g pasta\"]" }; db.Recipes.Add(recipe);
            db.FamilySettings.Add(new() { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 4 }) });
            foreach (var date in new[] { new DateOnly(2026,10,10), Wednesday, new DateOnly(2026,10,15), new DateOnly(2026,10,21), new DateOnly(2026,10,28) })
                db.CalendarEvents.Add(new() { Date = date, RecipeId = recipe.Id, Status = date.Day == 15 ? CalendarEventStatus.Cooked : CalendarEventStatus.Planned });
            db.SupperServings.AddRange(new SupperServing { Date = new(2026,10,10), InheritedServings = 3 }, new SupperServing { Date = new(2026,10,15), InheritedServings = 4 }, new SupperServing { Date = new(2026,10,28), OverrideServings = 8 });
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            (await Put(client, await Read(client), 5, [new { date = "2026-10-14", servings = 6 }, new { date = "2026-10-17", servings = 2 }])).EnsureSuccessStatusCode();
            db.ChangeTracker.Clear();
            Assert.Equal(5, (await db.SupperServings.SingleAsync(x => x.Date == new DateOnly(2026,10,21))).InheritedServings);
            Assert.Equal(3, (await db.SupperServings.SingleAsync(x => x.Date == new DateOnly(2026,10,10))).InheritedServings);
            Assert.Equal(4, (await db.SupperServings.SingleAsync(x => x.Date == new DateOnly(2026,10,15))).InheritedServings);
            Assert.Equal(8, (await db.SupperServings.SingleAsync(x => x.Date == new DateOnly(2026,10,28))).OverrideServings);
            Assert.Equal(new[] { new DateOnly(2026,10,12), new DateOnly(2026,10,19) }, await db.WeeklyPlans.OrderBy(x => x.WeekStartDate).Select(x => x.WeekStartDate).ToArrayAsync());
            var saved = await Read(client);
            Assert.Equal(6, saved.GetProperty("days")[2].GetProperty("servings").GetInt32());
            (await Put(client, saved, null, [new { date = "2026-10-14", servings = (int?)null }], false)).EnsureSuccessStatusCode();
            Assert.Equal(5, (await Read(client)).GetProperty("days")[2].GetProperty("servings").GetInt32());
            (await Put(client, await Read(client), null, [])).EnsureSuccessStatusCode();
            var unset = await Read(client);
            Assert.Equal(1, unset.GetProperty("days")[2].GetProperty("servings").GetInt32());
            Assert.Equal("family", unset.GetProperty("defaultServingsSource").GetString());
            db.ChangeTracker.Clear();
            Assert.Equal(1, (await db.SupperServings.SingleAsync(x => x.Date == new DateOnly(2026,10,21))).InheritedServings);
            Assert.Equal(4, unset.GetProperty("days")[3].GetProperty("servings").GetInt32());
            Assert.Equal(2, (await db.Recipes.SingleAsync()).Servings);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_InvalidBatchConflictAndReadOnlyRejectWithoutAnyMutation()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var client = factory.CreateAuthenticatedClient(); var before = await Read(client);
            foreach (var bad in new object[] { 0, -1, 1.5, "six", 2147483648L }) {
                Assert.Equal(HttpStatusCode.BadRequest, (await Put(client, before, 4, [new { date = "2026-10-14", servings = 6 }, new { date = "2026-10-17", servings = bad }])).StatusCode);
                Assert.Equal(before.GetProperty("version").GetString(), (await Read(client)).GetProperty("version").GetString());
            }
            (await Put(client, before, null, [new { date = "2026-10-17", servings = 6 }], false)).EnsureSuccessStatusCode();
            Assert.Equal(HttpStatusCode.Conflict, (await Put(client, before, 4, [])).StatusCode);
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.CalendarEvents.Add(new() { Date = Wednesday, Status = CalendarEventStatus.Cooked }); await db.SaveChangesAsync();
            Assert.Equal(HttpStatusCode.BadRequest, (await Put(client, await Read(client), 4, [new { date = "2026-10-14", servings = 8 }])).StatusCode);
            Assert.Single(await db.SupperServings.ToListAsync()); Assert.Empty(await db.FamilySettings.ToListAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_ReadCannotMixTwoCommittedBatches()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var race = new BetweenServingQueries();
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(),
                new() { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString },
                configureServices: services => services.AddDbContext<RecipeDbContext>(options => options.AddInterceptors(race)));
            using var client = factory.CreateAuthenticatedClient();
            (await Put(client, await Read(client), 4, [new { date = "2026-10-14", servings = 6 }])).EnsureSuccessStatusCode();
            var before = await Read(client);
            race.Commit = async () => (await Put(client, before, 5, [new { date = "2026-10-14", servings = 8 }])).EnsureSuccessStatusCode();
            var during = await Read(client);
            Assert.True(race.Ran);
            Assert.Equal(4, during.GetProperty("defaultServings").GetInt32());
            Assert.Equal(6, during.GetProperty("days")[2].GetProperty("servings").GetInt32());
            Assert.Equal(before.GetProperty("version").GetString(), during.GetProperty("version").GetString());
            var after = await Read(client); Assert.Equal(5, after.GetProperty("defaultServings").GetInt32()); Assert.Equal(8, after.GetProperty("days")[2].GetProperty("servings").GetInt32());
        });
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_DateResetPersistsNull_CancelRetainsFive_EqualNumberInheritsLaterUsualAndGroceries()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = new Recipe { Name = "Reset pasta", Servings = 2, Ingredients = "[\"200 g pasta\"]", RawMetadata = "{\"recipeIngredient\":[\"200 g pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"}]}" };
            db.Recipes.Add(recipe);
            db.FamilySettings.Add(new() { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 4 }) });
            db.CalendarEvents.Add(new() { Date = Wednesday, RecipeId = recipe.Id });
            db.SupperServings.Add(new() { Date = Wednesday, OverrideServings = 5 });
            await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026, 10, 12), default);
            using var client = factory.CreateAuthenticatedClient();
            var before = await Read(client);
            // Cancel has no PUT: fresh independent read and persisted provenance both retain five.
            var afterCancel = await Read(client);
            Assert.Equal(before.GetProperty("version").GetString(), afterCancel.GetProperty("version").GetString());
            Assert.Equal(5, afterCancel.GetProperty("days")[2].GetProperty("overrideServings").GetInt32());
            db.ChangeTracker.Clear(); Assert.Equal(5, (await db.SupperServings.SingleAsync()).OverrideServings);
            async Task AssertCurrentQuantity(double quantity) {
                db.ChangeTracker.Clear();
                var processors = scope.ServiceProvider.GetServices<RecipeApi.Workflow.IWorkflowProcessor>();
                foreach (var task in await db.WorkflowTasks.Where(x => x.ProcessorName == "RefreshSupperGroceries").ToListAsync())
                    await processors.Single(x => x.ProcessorName == task.ProcessorName).ExecuteAsync(task, default);
                using var result = JsonDocument.Parse(await client.GetStringAsync("/api/schedule?referenceWeekStartDate=2026-10-12"));
                Assert.Equal(quantity, result.RootElement.GetProperty("data").GetProperty("groceryItems")[0].GetProperty("quantity").ExactScalar());
                Assert.Equal("current", (await Read(client)).GetProperty("groceryRefresh").GetProperty("status").GetString());
            }
            (await Put(client, afterCancel, null, [new { date = "2026-10-14", servings = (int?)null }], false)).EnsureSuccessStatusCode();
            var reset = await Read(client);
            Assert.Equal(4, reset.GetProperty("defaultServings").GetInt32());
            Assert.Equal(JsonValueKind.Null, reset.GetProperty("days")[2].GetProperty("overrideServings").ValueKind);
            db.ChangeTracker.Clear(); Assert.Null((await db.SupperServings.SingleAsync()).OverrideServings);
            await AssertCurrentQuantity(400);
            (await Put(client, await Read(client), null, [new { date = "2026-10-14", servings = 4 }], false)).EnsureSuccessStatusCode();
            var equal = await Read(client);
            Assert.Equal(4, equal.GetProperty("days")[2].GetProperty("overrideServings").GetInt32());
            (await Put(client, equal, null, [new { date = "2026-10-14", servings = (int?)null }], false)).EnsureSuccessStatusCode();
            var inherited = await Read(client);
            Assert.Equal(4, inherited.GetProperty("days")[2].GetProperty("servings").GetInt32());
            Assert.Equal(JsonValueKind.Null, inherited.GetProperty("days")[2].GetProperty("overrideServings").ValueKind);
            Assert.NotEqual(equal.GetProperty("version").GetString(), inherited.GetProperty("version").GetString());
            (await Put(client, inherited, 7, [])).EnsureSuccessStatusCode();
            Assert.Equal(7, (await Read(client)).GetProperty("days")[2].GetProperty("servings").GetInt32());
            await AssertCurrentQuantity(700);
            db.ChangeTracker.Clear(); Assert.Null((await db.SupperServings.SingleAsync()).OverrideServings);
            Assert.Equal(2, (await db.Recipes.SingleAsync()).Servings);
        });
    }

    private sealed class BetweenServingQueries : DbCommandInterceptor
    {
        public Func<Task>? Commit; public bool Ran;
        public override async ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            if (!Ran && Commit is not null && command.CommandText.Contains("FROM family_settings", StringComparison.Ordinal)) { Ran = true; await Commit(); }
            return result;
        }
    }
}
