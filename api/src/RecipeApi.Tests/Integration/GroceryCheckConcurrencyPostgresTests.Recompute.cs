using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using PostgresTheory = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresTheoryAttribute;

namespace RecipeApi.Tests.Integration;

public sealed partial class GroceryCheckConcurrencyPostgresTests
{
    private static readonly DateOnly Monday = new(2026, 10, 5);

    private static Task<TestWebApplicationFactory> Factory(string connection, Action<IServiceCollection>? configure = null) =>
        TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(), new()
        {
            ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = connection,
        }, configureServices: configure);

    private static async Task SeedPlan(TestWebApplicationFactory factory, string state = "{\"unrelated\":true}")
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        db.WeeklyPlans.AddRange(new WeeklyPlan { WeekStartDate = Monday, GroceryState = state },
            new WeeklyPlan { WeekStartDate = Monday.AddDays(7), GroceryState = "{\"other-week\":true}" });
        await db.SaveChangesAsync();
    }

    private static async Task<Dictionary<string, bool>> ReadChecks(TestWebApplicationFactory factory)
    {
        using var fresh = factory.Services.CreateScope();
        var db = fresh.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.Equal("{\"other-week\": true}", (await db.WeeklyPlans.AsNoTracking().SingleAsync(p => p.WeekStartDate == Monday.AddDays(7))).GroceryState);
        return JsonSerializer.Deserialize<Dictionary<string, bool>>((await db.WeeklyPlans.AsNoTracking().SingleAsync(p => p.WeekStartDate == Monday)).GroceryState)!;
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task IntendedValuesReplacementAndClearFollowProcessingOrder()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await Factory(settings.ConnectionString);
            await SeedRowPlan(factory, lettuce: true);
            using var client = factory.CreateAuthenticatedClient();
            async Task<JsonElement> Snapshot() => Data(await client.GetFromJsonAsync<JsonElement>("/api/schedule?weekOffset=0"));
            async Task Item(string id, bool value)
            {
                var row = (await Snapshot()).GetProperty("groceryItems").EnumerateArray().Single(row => row.GetProperty("rowId").GetString() == id);
                Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new
                {
                    rowId = id, weekStartDate = "2026-10-05", expectedRowVersion = row.GetProperty("rowVersion").GetString(),
                    @checked = value, clientMutationId = Guid.NewGuid(),
                })).StatusCode);
            }
            async Task Replace(Dictionary<string, bool> map)
            {
                var version = (await Snapshot()).GetProperty("groceryListVersion").GetString();
                var response = await client.PatchAsJsonAsync("/api/schedule/0/grocery", new
                {
                    weekStartDate = "2026-10-05", expectedListVersion = version, checks = map, clientMutationId = Guid.NewGuid(),
                });
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                var expected = new Dictionary<string, bool> { [TomatoRow] = map.GetValueOrDefault(TomatoRow), [LettuceRow] = map.GetValueOrDefault(LettuceRow) };
                Assert.Equal(expected.OrderBy(pair => pair.Key), (await ReadChecks(factory)).OrderBy(pair => pair.Key));
            }
            await Item(TomatoRow, true);
            await Item(TomatoRow, true);
            Assert.True((await ReadChecks(factory))[TomatoRow]);
            await Item(TomatoRow, false);
            Assert.False((await ReadChecks(factory))[TomatoRow]);
            Assert.True((await ReadChecks(factory))[LettuceRow]);
            await Replace(new() { [TomatoRow] = true });
            await Replace([]);
            await Item(LettuceRow, true);
            Assert.True((await ReadChecks(factory))[LettuceRow]);

        });
    }

    [PostgresTheory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task PretrackedRecomputeUsesCurrentPredecessorsAndPreservesPendingFields(bool otherChecked)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await Factory(settings.ConnectionString);
            await SeedPlan(factory, JsonSerializer.Serialize(new Dictionary<string, bool> { ["huile d'olive"] = false, ["huile d’olive"] = otherChecked, ["unrelated"] = true }));
            using var stale = factory.Services.CreateScope();
            var db = stale.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var plan = await db.WeeklyPlans.SingleAsync(p => p.WeekStartDate == Monday);
            plan.GroceryItems = JsonSerializer.Serialize(new List<GroceryLineItemDto>
            {
                new("huile d'olive", "huile d'olive", "Pantry", 1, "ml", []),
                new("huile d’olive", "huile d’olive", "Pantry", 1, "ml", []),
            });
            var recipe = new Recipe { Name = "Oil", Ingredients = "[\"1 ml huile d'olive\",\"1 ml huile d’olive\"]", RawMetadata = """{"recipeIngredient":["1 ml huile d'olive","1 ml huile d’olive"],"supply":[{"name":"huile d'olive","quantity":1,"unitText":"ml"},{"name":"huile d’olive","quantity":1,"unitText":"ml"}]}""" };
            db.Recipes.Add(recipe);
            db.CalendarEvents.Add(new CalendarEvent { Date = Monday, RecipeId = recipe.Id });
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            Assert.Equal(HttpStatusCode.Conflict, (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new { ingredientName = "huile d'olive", @checked = true })).StatusCode);
            plan.Status = WeeklyPlanStatus.Locked;
            var before = (await db.WeeklyPlans.AsNoTracking().SingleAsync(p => p.WeekStartDate == Monday)).GroceryState;
            var itemsBefore = plan.GroceryItems;
            var error = await Assert.ThrowsAsync<GroceryMutationConflictException>(() => stale.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, default));
            Assert.Equal("active_legacy_list", error.Code);
            var after = await db.WeeklyPlans.AsNoTracking().SingleAsync(p => p.WeekStartDate == Monday);
            Assert.Equal(before, after.GroceryState);
            Assert.True(JsonElement.DeepEquals(JsonDocument.Parse(itemsBefore).RootElement, JsonDocument.Parse(after.GroceryItems).RootElement));
            Assert.Equal(WeeklyPlanStatus.Locked, plan.Status);
            Assert.True(db.Entry(plan).Property(p => p.Status).IsModified);

        });
    }

    [PostgresTheory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task PretrackedRenameAndUnchangedNamePreserveCurrentChecks(bool rename)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await Factory(settings.ConnectionString);
            var prior = rename ? "Eau label for tomato" : "tomato";
            await SeedRowPlan(factory, lettuce: true, tomatoLabel: prior);
            using var stale = factory.Services.CreateScope();
            var db = stale.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var plan = await db.WeeklyPlans.SingleAsync(p => p.WeekStartDate == Monday);
            using var client = factory.CreateAuthenticatedClient();
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new
            {
                rowId = TomatoRow, weekStartDate = "2026-10-05", expectedRowVersion = "1", @checked = true, clientMutationId = Guid.NewGuid(),
            })).StatusCode);
            await stale.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, default);
            var checks = await ReadChecks(factory);
            Assert.True(checks[TomatoRow]);
            Assert.True(checks[LettuceRow]);
            Assert.Equal(2, checks.Count);
            Assert.True(JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)![TomatoRow]);
            Assert.Contains(JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!, row => row.RowId == TomatoRow && row.DisplayName == "tomato");

        });
    }
}
