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
    public async Task SupperServings_UnknownCheckedBaselineSurvivesKnownDemandReadsRecomputeAndRecovery()
    {
        await WithLifecycle(async (app, root) => {
            ((DeploymentCalendarIntegrationTests.CalendarClock)app.Services.GetRequiredService<IClock>()).UtcNow = DateTimeOffset.Parse("2026-10-12T12:00:00Z");
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = CorrectionRecipe(); recipe.Ingredients = "[\"pasta\"]"; recipe.RawMetadata = "{\"recipeIngredient\":[\"pasta\"],\"supply\":[{\"name\":\"pasta\",\"unitText\":\"g\"}]}";
            db.Recipes.Add(recipe); db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id });
            db.SupperServings.Add(Serving(Wednesday,6)); await db.SaveChangesAsync();
            var recompute = scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>();
            var monday = new DateOnly(2026,10,12);
            await recompute.RecomputeForWeekAsync(monday,default);
            using var client = app.CreateAuthenticatedClient();
            var rowId = await GroceryTestRows.CheckAsync(client,monday);
            db.ChangeTracker.Clear(); var original = CorrectionRecipe();
            recipe = await db.Recipes.SingleAsync(); recipe.Ingredients = original.Ingredients; recipe.RawMetadata = original.RawMetadata; await db.SaveChangesAsync();
            await recompute.RecomputeForWeekAsync(monday,default);
            async Task AssertOrdinaryCheck(bool expected = true) {
                var schedule = await GroceryTestRows.ReadAsync(client,monday);
                var line = Assert.Single(schedule.GetProperty("groceryItems").EnumerateArray());
                Assert.Equal(rowId,line.GetProperty("rowId").GetString()); Assert.Equal(600,line.GetProperty("quantity").ExactScalar());
                Assert.True(line.GetProperty("quantityComplete").GetBoolean()); Assert.False(line.TryGetProperty("checkReviewReason",out _));
                Assert.Equal(expected,GroceryTestRows.Checked(schedule,"pasta"));
                Assert.Equal(JsonValueKind.Null,schedule.GetProperty("groceryRefresh").GetProperty("resetSummaryVersion").ValueKind);
            }
            await AssertOrdinaryCheck(); await recompute.RecomputeForWeekAsync(monday,default); await AssertOrdinaryCheck();
            var management = scope.ServiceProvider.GetRequiredService<ManagementService>(); await management.BackupAsync();
            db.ChangeTracker.Clear(); (await db.WeeklyPlans.SingleAsync()).GroceryItems = "[]"; await db.SaveChangesAsync();
            Assert.Equal(0,(await management.RestoreAsync()).Errors); db.ChangeTracker.Clear(); await AssertOrdinaryCheck();
            var recovery = scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>(); var capture = await recovery.CaptureAsync(default);
            (await db.WeeklyPlans.SingleAsync()).GroceryItems = "[]"; await db.SaveChangesAsync();
            await recovery.RestoreExactAsync(capture.SnapshotId!.Value,default); db.ChangeTracker.Clear(); await AssertOrdinaryCheck();
            var extraId = Guid.NewGuid();
            (await client.PostAsJsonAsync("/api/grocery-extras",new {clientId=extraId,weekStartDate="2026-10-12",name="Coffee"})).EnsureSuccessStatusCode();
            (await client.PatchAsJsonAsync($"/api/grocery-extras/{extraId}",new {weekStartDate="2026-10-12",expectedVersion=1,@checked=true})).EnsureSuccessStatusCode();
            await AssertOrdinaryCheck();
            await GroceryTestRows.CheckAsync(client,monday,value:false); await AssertOrdinaryCheck(false);
            await GroceryTestRows.CheckAsync(client,monday); await recompute.RecomputeForWeekAsync(monday,default); await AssertOrdinaryCheck();
            db.ChangeTracker.Clear(); Assert.True((await db.GroceryExtraOccurrences.SingleAsync()).Checked); Assert.Equal(2,(await db.Recipes.SingleAsync()).Servings);
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
            async Task Check() => await GroceryTestRows.CheckAsync(client,new(2026,10,12));
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
            await GroceryTestRows.CheckAsync(client,new(2026,10,12),value:false); await Check();
            var second = await Change(6);
            Assert.Equal(first.GetProperty("version").GetString(), second.GetProperty("version").GetString());
            Assert.NotEqual(firstSummary, second.GetProperty("resetSummaryVersion").GetString());
            var tomato = new Recipe { Name = "Tomato", Servings = 2, Ingredients = "[\"100 g tomato\"]", RawMetadata = "{\"recipeIngredient\":[\"100 g tomato\"],\"supply\":[{\"name\":\"tomato\",\"quantity\":100,\"unitText\":\"g\"}]}" };
            db.Recipes.Add(tomato); db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday.AddDays(1), RecipeId = tomato.Id }); await db.SaveChangesAsync();
            await recompute.RecomputeForWeekAsync(new(2026, 10, 12), default);
            Assert.Equal(JsonValueKind.Null, (await Read(client)).GetProperty("groceryRefresh").GetProperty("resetSummaryVersion").ValueKind);
            db.ChangeTracker.Clear();
            Assert.False(GroceryTestRows.Checked(await db.WeeklyPlans.SingleAsync(),"pasta"));
        });
    }

}
