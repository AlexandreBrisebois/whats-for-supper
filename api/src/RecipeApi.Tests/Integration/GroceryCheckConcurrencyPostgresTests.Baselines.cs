using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class GroceryCheckConcurrencyPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RetainedBaseline_SurvivesFreshScopesBulkReplayAndOverlaps_ThenResetsOnce()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await Factory(settings.ConnectionString);
            var recipeId = Guid.NewGuid();
            async Task Change(string amount)
            {
                using var scope = factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.SingleOrDefaultAsync(r => r.Id == recipeId);
                if (recipe is null)
                {
                    recipe = new Recipe { Id = recipeId, Name = "Range fixture" };
                    db.Recipes.Add(recipe);
                    db.CalendarEvents.Add(new CalendarEvent { Date = Monday, RecipeId = recipeId });
                }
                var text = amount + " g pasta";
                recipe.Ingredients = JsonSerializer.Serialize(new[] { text });
                recipe.RawMetadata = JsonSerializer.Serialize(new { recipeIngredient = new[] { text }, supply = new[] { new { name = "pasta", quantity = int.Parse(amount.Split('–')[0]), unitText = "g" } } });
                await db.SaveChangesAsync();
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, default);
            }
            async Task<WeeklyPlan> Persisted()
            {
                using var scope = factory.Services.CreateScope();
                return await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync();
            }
            using var client = factory.CreateAuthenticatedClient();
            async Task<JsonElement> Snapshot() => Data(await client.GetFromJsonAsync<JsonElement>("/api/schedule?weekOffset=0"));
            async Task<object> Check(bool value)
            {
                var row = (await Snapshot()).GetProperty("groceryItems")[0];
                var body = new { rowId = row.GetProperty("rowId").GetString(), weekStartDate = "2026-10-05", expectedRowVersion = row.GetProperty("rowVersion").GetString(), @checked = value, clientMutationId = Guid.NewGuid() };
                Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", body)).StatusCode);
                return body;
            }
            await Change("2–3");
            var original = (await Snapshot()).GetProperty("groceryItems")[0];
            var id = original.GetProperty("rowId").GetString()!;
            var checkedBody = await Check(true);
            var baseline = JsonDocument.Parse((await Persisted()).GroceryCheckedDemandBaselines).RootElement.Clone();
            Assert.Equal("3", baseline.GetProperty(id).GetProperty("Quantity").GetProperty("max").GetProperty("n").GetString());
            await Change("3–4");
            await Check(true);
            var snapshot = await Snapshot();
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync("/api/schedule/0/grocery", new { weekStartDate = "2026-10-05", expectedListVersion = snapshot.GetProperty("groceryListVersion").GetString(), checks = new Dictionary<string, bool> { [id] = true }, clientMutationId = Guid.NewGuid() })).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", checkedBody)).StatusCode);
            var retained = await Persisted();
            Assert.True(JsonElement.DeepEquals(baseline, JsonDocument.Parse(retained.GroceryCheckedDemandBaselines).RootElement));
            Assert.True(JsonDocument.Parse(retained.GroceryState).RootElement.GetProperty(id).GetBoolean());
            await Change("4–5");
            var reset = await Persisted();
            Assert.False(JsonDocument.Parse(reset.GroceryState).RootElement.GetProperty(id).GetBoolean());
            Assert.Empty(JsonDocument.Parse(reset.GroceryCheckedDemandBaselines).RootElement.EnumerateObject());
            Assert.NotNull(reset.GroceryResetSummaryVersion);
            var version = reset.GroceryListVersion;
            await Change("4–5");
            Assert.Equal(version, (await Persisted()).GroceryListVersion);
            await Check(true);
            await Change("4–5");
            var rechecked = await Persisted();
            Assert.True(JsonDocument.Parse(rechecked.GroceryState).RootElement.GetProperty(id).GetBoolean());
            Assert.Equal("5", JsonDocument.Parse(rechecked.GroceryCheckedDemandBaselines).RootElement.GetProperty(id).GetProperty("Quantity").GetProperty("max").GetProperty("n").GetString());
            Assert.Equal(id, (await Snapshot()).GetProperty("groceryItems")[0].GetProperty("rowId").GetString());
            Assert.False((await Snapshot()).GetProperty("groceryItems")[0].TryGetProperty("checkReviewReason", out _));
        });
    }
}
