using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using PostgresTheory = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresTheoryAttribute;

namespace RecipeApi.Tests.Integration;

public sealed partial class GroceryCheckConcurrencyPostgresTests
{
    [PostgresTheory]
    [InlineData("missing")]
    [InlineData("null")]
    [InlineData("malformed-entry")]
    [InlineData("unicode-numerator")]
    [InlineData("unicode-denominator")]
    [InlineData("unreduced")]
    [InlineData("null-numerator")]
    [InlineData("future-version")]
    [InlineData("incomplete")]
    [InlineData("unknown")]
    public async Task UntrustedBaselineCannotCrashOrRebaselineAndUnrelatedProvenIncreaseStillResets(string condition)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await Factory(settings.ConnectionString);
            var recipes = new[] { Guid.NewGuid(), Guid.NewGuid() };
            var names = new[] { "pasta", "sauce" };
            async Task SetAmounts(int amount)
            {
                using var scope = factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                for (var i = 0; i < recipes.Length; i++)
                {
                    var recipe = await db.Recipes.FindAsync(recipes[i]);
                    if (recipe is null)
                    {
                        recipe = new Recipe { Id = recipes[i], Name = names[i] };
                        db.Recipes.Add(recipe);
                        db.CalendarEvents.Add(new() { Date = Monday.AddDays(i), RecipeId = recipes[i] });
                    }
                    recipe.Ingredients = JsonSerializer.Serialize(new[] { names[i] });
                    recipe.RawMetadata = JsonSerializer.Serialize(new
                    {
                        recipeIngredient = new[] { names[i] },
                        supply = new[] { new { name = names[i], quantity = amount, unitText = "g" } }
                    });
                }
                await db.SaveChangesAsync();
            }
            async Task Recompute()
            {
                using var scope = factory.Services.CreateScope();
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, default);
            }
            async Task<WeeklyPlan> Persisted()
            {
                using var scope = factory.Services.CreateScope();
                return await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync();
            }
            using var client = factory.CreateAuthenticatedClient();
            async Task<JsonElement> Snapshot() => Data(await client.GetFromJsonAsync<JsonElement>("/api/schedule?weekOffset=0"));
            await SetAmounts(200);
            await Recompute();
            var rows = (await Snapshot()).GetProperty("groceryItems").EnumerateArray().ToArray();
            foreach (var row in rows)
                Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new
                {
                    rowId = row.GetProperty("rowId").GetString(), weekStartDate = Monday.ToString("yyyy-MM-dd"),
                    expectedRowVersion = row.GetProperty("rowVersion").GetString(), @checked = true, clientMutationId = Guid.NewGuid()
                })).StatusCode);
            var untrustedId = rows.Single(row => row.GetProperty("normalizedKey").GetString() == "pasta").GetProperty("rowId").GetString()!;
            var unrelatedId = rows.Single(row => row.GetProperty("normalizedKey").GetString() == "sauce").GetProperty("rowId").GetString()!;
            JsonNode? expectedBaseline;
            using (var corrupt = factory.Services.CreateScope())
            {
                var db = corrupt.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var plan = await db.WeeklyPlans.SingleAsync();
                var baselines = JsonNode.Parse(plan.GroceryCheckedDemandBaselines)!.AsObject();
                var baseline = baselines[untrustedId]!.AsObject();
                switch (condition)
                {
                    case "missing": baselines.Remove(untrustedId); break;
                    case "null": baselines[untrustedId] = null; break;
                    case "malformed-entry": baselines[untrustedId] = "invalid"; break;
                    case "unicode-numerator": baseline["Quantity"]!["value"]!["n"] = "٢٠٠"; break;
                    case "unicode-denominator": baseline["Quantity"]!["value"]!["d"] = "١"; break;
                    case "unreduced": baseline["Quantity"]!["value"]!["n"] = "400"; baseline["Quantity"]!["value"]!["d"] = "2"; break;
                    case "null-numerator": baseline["Quantity"]!["value"]!["n"] = null; break;
                    case "future-version": baseline["AcknowledgedAtRowVersion"] = "18446744073709551615"; break;
                    case "incomplete": baseline["QuantityComplete"] = false; break;
                    case "unknown": baseline["Quantity"] = null; break;
                }
                // A malformed entry has no deserializable acknowledgement. Missing
                // or malformed records may become null, never current demand.
                expectedBaseline = condition is "missing" or "malformed-entry" ? null : baselines[untrustedId]?.DeepClone();
                plan.GroceryCheckedDemandBaselines = baselines.ToJsonString();
                await db.SaveChangesAsync();
            }
            await SetAmounts(300);
            await Recompute();
            var after = await Persisted();
            var checks = JsonDocument.Parse(after.GroceryState).RootElement;
            Assert.True(checks.GetProperty(untrustedId).GetBoolean());
            Assert.False(checks.GetProperty(unrelatedId).GetBoolean());
            Assert.NotNull(after.GroceryResetSummaryVersion);
            Assert.True(JsonNode.DeepEquals(expectedBaseline, JsonNode.Parse(after.GroceryCheckedDemandBaselines)![untrustedId]));
            var version = after.GroceryListVersion;
            await Recompute();
            var retry = await Persisted();
            Assert.Equal(version, retry.GroceryListVersion);
            Assert.Equal(after.GroceryResetSummaryVersion, retry.GroceryResetSummaryVersion);
            Assert.True(JsonNode.DeepEquals(expectedBaseline, JsonNode.Parse(retry.GroceryCheckedDemandBaselines)![untrustedId]));
            var snapshot = await Snapshot();
            Assert.True(snapshot.GetProperty("groceryState").GetProperty(untrustedId).GetBoolean());
            Assert.All(snapshot.GetProperty("groceryItems").EnumerateArray(), row => Assert.False(row.TryGetProperty("checkReviewReason", out _)));
        });
    }
}
