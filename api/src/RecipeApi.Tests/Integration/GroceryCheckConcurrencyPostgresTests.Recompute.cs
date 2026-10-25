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
            await SeedPlan(factory);
            using var client = factory.CreateAuthenticatedClient();
            async Task Item(string name, bool value) => Assert.Equal(HttpStatusCode.NoContent,
                (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new { ingredientName = name, @checked = value })).StatusCode);
            async Task Replace(Dictionary<string, bool> map)
            {
                var response = await client.PatchAsJsonAsync("/api/schedule/0/grocery", map);
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                var json = await response.Content.ReadFromJsonAsync<JsonElement>();
                Assert.Equal(map.OrderBy(p => p.Key), JsonSerializer.Deserialize<Dictionary<string, bool>>(json.GetProperty("data"))!.OrderBy(p => p.Key));
            }
            await Item("Tomato", true);
            await Item("Tomato", true);
            Assert.True((await ReadChecks(factory))["Tomato"]);
            await Item("Tomato", false);
            Assert.False((await ReadChecks(factory))["Tomato"]);
            Assert.True((await ReadChecks(factory))["unrelated"]);
            var staleBody = new Dictionary<string, bool> { ["Tomato"] = false };
            await Item("Lettuce", true);
            await Replace(staleBody);
            Assert.Equal(staleBody, await ReadChecks(factory));
            await Item("Lettuce", true);
            Assert.True((await ReadChecks(factory))["Lettuce"]);
            await Replace([]);
            Assert.Empty(await ReadChecks(factory));
            await Item("Lettuce", true);
            Assert.Equal(new Dictionary<string, bool> { ["Lettuce"] = true }, await ReadChecks(factory));
            await Replace([]);
            Assert.Empty(await ReadChecks(factory));
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
            var recipe = new Recipe { Name = "Oil", RawMetadata = """{"supply":[{"name":"huile d'olive","quantity":1,"unitText":"ml"},{"name":"huile d’olive","quantity":1,"unitText":"ml"}]}""" };
            db.Recipes.Add(recipe);
            db.CalendarEvents.Add(new CalendarEvent { Date = Monday, RecipeId = recipe.Id });
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            Assert.Equal(HttpStatusCode.NoContent, (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item",
                new { ingredientName = "huile d'olive", @checked = true })).StatusCode);
            // A pending non-grocery field belongs to the original scope and must survive.
            plan.Status = WeeklyPlanStatus.Locked;
            await stale.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, CancellationToken.None);
            var checks = await ReadChecks(factory);
            output.WriteLine($"Recompute from pretracked scope: {JsonSerializer.Serialize(checks)}");
            Assert.Equal(otherChecked, checks["huile d'olive"]);
            Assert.DoesNotContain("huile d’olive", checks.Keys);
            Assert.True(checks["unrelated"]);
            Assert.Equal(WeeklyPlanStatus.Locked, plan.Status);
            Assert.True(db.Entry(plan).Property(p => p.Status).IsModified);
            Assert.False(db.Entry(plan).Property(p => p.GroceryState).IsModified);
            Assert.Contains(JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!, item => item.DisplayName == "huile d'olive");
            await db.SaveChangesAsync();
            Assert.Equal(otherChecked, (await ReadChecks(factory))["huile d'olive"]);
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
            var prior = rename ? "Tomato" : "tomato";
            await SeedPlan(factory, JsonSerializer.Serialize(new Dictionary<string, bool> { [prior] = false, ["unrelated"] = true }));
            using var stale = factory.Services.CreateScope();
            var db = stale.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var plan = await db.WeeklyPlans.SingleAsync(p => p.WeekStartDate == Monday);
            plan.GroceryItems = JsonSerializer.Serialize(new List<GroceryLineItemDto> { new(prior, "tomato", "Produce", 1, null, []) });
            var recipe = new Recipe { Name = "Tomato", RawMetadata = """{"supply":[{"name":"Tomato","quantity":1}]}""" };
            db.Recipes.Add(recipe);
            db.CalendarEvents.Add(new CalendarEvent { Date = Monday, RecipeId = recipe.Id });
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new { ingredientName = prior, @checked = true })).EnsureSuccessStatusCode();
            await stale.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, CancellationToken.None);
            var checks = await ReadChecks(factory);
            Assert.True(checks["tomato"]);
            Assert.True(checks["unrelated"]);
            if (rename) Assert.DoesNotContain("Tomato", checks.Keys);
            Assert.True(JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!["tomato"]);
            Assert.Single(JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!);
        });
    }
}
