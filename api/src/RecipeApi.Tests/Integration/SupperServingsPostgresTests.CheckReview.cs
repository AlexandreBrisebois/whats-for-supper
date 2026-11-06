using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class SupperServingsPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_CheckReview_PersistsThroughReadsRecomputeAndRecoveryUntilAffectedCheck()
    {
        await WithLifecycle(async (app, root) => {
            // This review tracer uses the current week; captured-reference rollover is a separate case.
            ((DeploymentCalendarIntegrationTests.CalendarClock)app.Services.GetRequiredService<IClock>()).UtcNow = DateTimeOffset.Parse("2026-10-12T12:00:00Z");
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = CorrectionRecipe(); db.Recipes.Add(recipe);
            db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id });
            db.SupperServings.Add(Serving(Wednesday, 6));
            db.WeeklyPlans.Add(new WeeklyPlan { WeekStartDate = new(2026, 10, 12),
                GroceryItems = JsonSerializer.Serialize(new[] { new { displayName = "pasta", normalizedKey = "pasta", section = "Pantry", quantity = 200, unitText = "g", recipeIds = new[] { recipe.Id } } }),
                GroceryState = "{\"pasta\":true,\"unrelated\":true}" });
            await db.SaveChangesAsync();
            var recompute = scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>();
            await recompute.RecomputeForWeekAsync(new(2026, 10, 12), default);
            using var client = app.CreateAuthenticatedClient();
            async Task AssertReview(bool expected = true) {
                var response = await client.GetAsync("/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-12"); response.EnsureSuccessStatusCode();
                var schedule = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("data");
                var line = Assert.Single(schedule.GetProperty("groceryItems").EnumerateArray());
                Assert.Equal(600, line.GetProperty("quantity").GetDouble());
                Assert.True(line.GetProperty("quantityComplete").GetBoolean());
                Assert.True(line.TryGetProperty("checkReviewReason", out var reason), "Prior unknown check review must persist in the actual schedule response.");
                Assert.Equal(expected ? "prior_amount_unknown" : null, reason.GetString());
                Assert.Equal(JsonValueKind.Null, schedule.GetProperty("groceryRefresh").GetProperty("resetSummaryVersion").ValueKind);
            }
            db.ChangeTracker.Clear();
            var reviewedItems = (await db.WeeklyPlans.SingleAsync()).GroceryItems;
            await AssertReview(); await recompute.RecomputeForWeekAsync(new(2026, 10, 12), default); await AssertReview();
            var management = scope.ServiceProvider.GetRequiredService<ManagementService>();
            await management.BackupAsync();
            db.ChangeTracker.Clear(); (await db.WeeklyPlans.SingleAsync()).GroceryItems = "[]"; await db.SaveChangesAsync();
            Assert.Equal(0, (await management.RestoreAsync()).Errors); db.ChangeTracker.Clear(); await AssertReview();
            var recovery = scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>();
            var capture = await recovery.CaptureAsync(default);
            (await db.WeeklyPlans.SingleAsync()).GroceryItems = "[]"; await db.SaveChangesAsync();
            await recovery.RestoreExactAsync(capture.SnapshotId!.Value, default); db.ChangeTracker.Clear(); await AssertReview();
            var extraId = Guid.NewGuid();
            var extra = await client.PostAsJsonAsync("/api/grocery-extras", new { clientId = extraId, weekStartDate = "2026-10-12", name = "Coffee" }); extra.EnsureSuccessStatusCode();
            (await client.PatchAsJsonAsync($"/api/grocery-extras/{extraId}", new { weekStartDate = "2026-10-12", expectedVersion = 1, @checked = true })).EnsureSuccessStatusCode();
            await AssertReview();
            // Neither replacing unrelated checks nor an explicit unchecked value proves review.
            (await client.PatchAsJsonAsync("/api/schedule/0/grocery", new Dictionary<string, bool> { ["unrelated"] = true })).EnsureSuccessStatusCode();
            (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new { ingredientName = "pasta", @checked = false })).EnsureSuccessStatusCode();
            await recompute.RecomputeForWeekAsync(new(2026, 10, 12), default); await AssertReview();
            Assert.Equal(HttpStatusCode.NoContent, (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new { ingredientName = "pasta", @checked = true })).StatusCode);
            await AssertReview(false); await recompute.RecomputeForWeekAsync(new(2026, 10, 12), default); await AssertReview(false);
            db.ChangeTracker.Clear();
            Assert.True(JsonSerializer.Deserialize<Dictionary<string, bool>>((await db.WeeklyPlans.SingleAsync()).GroceryState)!["pasta"]);
            Assert.True(JsonSerializer.Deserialize<Dictionary<string, bool>>((await db.WeeklyPlans.SingleAsync()).GroceryState)!["unrelated"]);
            Assert.True((await db.GroceryExtraOccurrences.SingleAsync()).Checked);
            // Full-map clients also explicitly acknowledge the affected checked name.
            (await db.WeeklyPlans.SingleAsync()).GroceryItems = reviewedItems; await db.SaveChangesAsync();
            (await client.PatchAsJsonAsync("/api/schedule/0/grocery", new Dictionary<string, bool> { ["pasta"] = true, ["unrelated"] = true })).EnsureSuccessStatusCode();
            await AssertReview(false);
            Assert.Equal(2, (await db.Recipes.SingleAsync()).Servings);
        });
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_ResetSummary_InputCycleIsDistinctAndNonResetUpdateRetiresNotice()
    {
        await WithLifecycle(async (app, root) => {
            ((DeploymentCalendarIntegrationTests.CalendarClock)app.Services.GetRequiredService<IClock>()).UtcNow = DateTimeOffset.Parse("2026-10-12T12:00:00Z");
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = CorrectionRecipe(); db.Recipes.Add(recipe);
            db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id });
            db.SupperServings.Add(Serving(Wednesday, 2)); await db.SaveChangesAsync();
            var recompute = scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>();
            await recompute.RecomputeForWeekAsync(new(2026, 10, 12), default);
            using var client = app.CreateAuthenticatedClient();
            async Task Check() => Assert.Equal(HttpStatusCode.NoContent, (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new { ingredientName = "pasta", @checked = true })).StatusCode);
            async Task<JsonElement> Change(int count) {
                (await Put(client, await Read(client), null, new[] { new { date = "2026-10-14", servings = count } }, false)).EnsureSuccessStatusCode();
                await recompute.RecomputeForWeekAsync(new(2026, 10, 12), default);
                return (await Read(client)).GetProperty("groceryRefresh");
            }
            await Check(); var first = await Change(6);
            var firstSummary = first.GetProperty("resetSummaryVersion").GetString(); Assert.NotNull(firstSummary);
            await Check(); await recompute.RecomputeForWeekAsync(new(2026, 10, 12), default);
            Assert.Equal(firstSummary, (await Read(client)).GetProperty("groceryRefresh").GetProperty("resetSummaryVersion").GetString());
            var decrease = await Change(2); Assert.Equal(JsonValueKind.Null, decrease.GetProperty("resetSummaryVersion").ValueKind);
            var second = await Change(6);
            Assert.Equal(first.GetProperty("version").GetString(), second.GetProperty("version").GetString());
            Assert.NotEqual(firstSummary, second.GetProperty("resetSummaryVersion").GetString());
            var tomato = new Recipe { Name = "Tomato", Servings = 2, Ingredients = "[\"100 g tomato\"]", RawMetadata = "{\"recipeIngredient\":[\"100 g tomato\"],\"supply\":[{\"name\":\"tomato\",\"quantity\":100,\"unitText\":\"g\"}]}" };
            db.Recipes.Add(tomato); db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday.AddDays(1), RecipeId = tomato.Id }); await db.SaveChangesAsync();
            await recompute.RecomputeForWeekAsync(new(2026, 10, 12), default);
            Assert.Equal(JsonValueKind.Null, (await Read(client)).GetProperty("groceryRefresh").GetProperty("resetSummaryVersion").ValueKind);
            db.ChangeTracker.Clear();
            Assert.False(JsonSerializer.Deserialize<Dictionary<string, bool>>((await db.WeeklyPlans.SingleAsync()).GroceryState)!["pasta"]);
        });
    }

}
