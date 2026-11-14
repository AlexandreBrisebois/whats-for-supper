using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientEditPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryDeclaredPackage_ClearOneSizePreservesCheckedOtherSizeAcrossFollowingSave()
    {
        await WithEditor(async (factory, before) =>
        {
            var current = await SaveDeclaredPackageRows(factory, before,
                Row(before.IngredientLines[0]), Row(before.IngredientLines[1]),
                DeclaredPackageRow("net400") with { Amount = LegacyGroceryQuantity.Parse("3"), AmountText = "3" },
                DeclaredPackageRow("net800", "800"));
            var smallId = current.IngredientLines[2].Id;
            var largeId = current.IngredientLines[3].Id;
            Assert.NotEqual(smallId, largeId);
            var largeOriginal = JsonSerializer.Serialize(current.IngredientLines[3], Json);
            var monday = new DateOnly(2026, 10, 12);
            Guid occurrence;
            string? metadata;
            string? sourceUrl;
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                occurrence = (await db.CalendarEvents.SingleAsync(row => row.Date == monday.AddDays(3)
                    && row.MealSlot == 0 && row.RecipeId == Id)).Id;
                db.SupperServings.Add(new SupperServing { Date = monday.AddDays(3), OverrideServings = 1 });
                await db.SaveChangesAsync();
                var recipe = await db.Recipes.AsNoTracking().SingleAsync(row => row.Id == Id);
                metadata = recipe.RawMetadata;
                sourceUrl = recipe.SourceUrl;
            }

            async Task<(WeeklyPlan Plan, GroceryLineItemDto[] Rows, JsonElement Checks, JsonElement Baselines,
                JsonElement Evidence)> Read(bool recompute = true)
            {
                using var scope = factory.Services.CreateScope();
                if (recompute) await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>()
                    .RecomputeForWeekAsync(monday, default);
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(row => row.WeekStartDate == monday);
                return (plan, JsonSerializer.Deserialize<GroceryLineItemDto[]>(plan.GroceryItems, Json)!,
                    JsonDocument.Parse(plan.GroceryState).RootElement.Clone(),
                    JsonDocument.Parse(plan.GroceryCheckedDemandBaselines).RootElement.Clone(),
                    JsonDocument.Parse(plan.GroceryDemandEvidence).RootElement.Clone());
            }
            static bool HasCapacity(GroceryLineItemDto row, string amount)
            {
                using var identity = JsonDocument.Parse(row.DemandIdentity!);
                return identity.RootElement.TryGetProperty("package", out var package)
                    && package.GetProperty("capacity").GetProperty("amount").Deserialize<GroceryQuantity>(Json)
                        == LegacyGroceryQuantity.Parse(amount);
            }
            using var client = factory.CreateAuthenticatedClient();
            var initial = await Read();
            var tomatoes = initial.Rows.Where(row => row.NormalizedKey == "tomato" && row.RecipeIds.Contains(Id)).ToArray();
            Assert.Equal(2, tomatoes.Length);
            var small = Assert.Single(tomatoes, row => HasCapacity(row, "400"));
            var large = Assert.Single(tomatoes, row => HasCapacity(row, "800"));
            Assert.Equal(LegacyGroceryQuantity.Parse("3/4"), small.ExactQuantity);
            Assert.Equal(LegacyGroceryQuantity.Parse("1/2"), large.ExactQuantity);
            Assert.NotEqual(small.DemandIdentity, large.DemandIdentity);
            foreach (var (row, ingredient) in new[] { (small, smallId), (large, largeId) })
            {
                Assert.Equal("cans", row.UnitText);
                var evidence = initial.Evidence.GetProperty(row.RowId!);
                var fingerprint = evidence.GetProperty("InputFingerprint").GetString()!;
                Assert.True(fingerprint.Length == 64 && fingerprint.All(Uri.IsHexDigit));
                var contributor = Assert.Single(evidence.GetProperty("Contributors").EnumerateArray());
                Assert.Equal(occurrence, contributor.GetProperty("OccurrenceId").GetGuid());
                Assert.Equal(Id, contributor.GetProperty("RecipeId").GetGuid());
                Assert.Equal(ingredient, contributor.GetProperty("IngredientLineId").GetGuid());
                var purchase = contributor.GetProperty("PurchaseIdentity").GetString()!;
                Assert.True(purchase.Length == 64 && purchase.All(Uri.IsHexDigit));
            }
            Assert.True(JsonElement.DeepEquals(initial.Evidence.GetProperty(small.RowId!).GetProperty("Members"),
                initial.Evidence.GetProperty(large.RowId!).GetProperty("Members")));

            // Both package rows have the same normalized key. Mutate each actual row identity,
            // rather than the unique-normalized-key convenience helper.
            foreach (var rowId in new[] { small.RowId!, large.RowId! })
            {
                var schedule = await GroceryTestRows.ReadAsync(client, monday);
                var row = Assert.Single(schedule.GetProperty("groceryItems").EnumerateArray(),
                    row => row.GetProperty("rowId").GetString() == rowId);
                using var response = await client.PatchAsJsonAsync($"/api/schedule/0/grocery/item?referenceWeekStartDate={monday:yyyy-MM-dd}", new
                {
                    rowId, weekStartDate = monday.ToString("yyyy-MM-dd"),
                    expectedRowVersion = row.GetProperty("rowVersion").GetString(),
                    @checked = true, clientMutationId = Guid.NewGuid()
                });
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            }
            var pastaId = await GroceryTestRows.CheckAsync(client, monday, "pasta");
            var sauceId = await GroceryTestRows.CheckAsync(client, monday, "sauce");
            var checkedState = await Read(false);
            large = Assert.Single(checkedState.Rows, row => row.RowId == large.RowId);
            var largeBaseline = checkedState.Baselines.GetProperty(large.RowId!).Clone();
            Assert.True(checkedState.Checks.GetProperty(large.RowId!).GetBoolean());
            Assert.True(checkedState.Checks.GetProperty(small.RowId!).GetBoolean());
            Assert.True(checkedState.Baselines.TryGetProperty(small.RowId!, out _));
            var operations = (await DeclaredPackageState(factory)).Operations;

            current = await SaveDeclaredPackageRows(factory, current, current.IngredientLines
                .Select(row => row.Id == smallId ? Row(row) with { Package = null } : Row(row)).ToArray());
            var cleared = await Read();
            var nextSmall = Assert.Single(cleared.Rows, row => row.NormalizedKey == "tomato" && !HasCapacity(row, "800"));
            var nextLarge = Assert.Single(cleared.Rows, row => HasCapacity(row, "800"));
            output.WriteLine(JsonSerializer.Serialize(new { phase = "clear400", before = checkedState.Plan, after = cleared.Plan,
                smallId, largeId, occurrence, old800 = large, current800 = nextLarge, current400 = nextSmall }, Json));
            Assert.NotEqual(small.RowId, nextSmall.RowId);
            Assert.NotEqual(small.DemandIdentity, nextSmall.DemandIdentity);
            using (var identity = JsonDocument.Parse(nextSmall.DemandIdentity!))
                Assert.False(identity.RootElement.TryGetProperty("package", out _));
            Assert.Equal(LegacyGroceryQuantity.Parse("3/4"), nextSmall.ExactQuantity);
            Assert.False(cleared.Checks.GetProperty(nextSmall.RowId!).GetBoolean());
            Assert.False(cleared.Baselines.TryGetProperty(nextSmall.RowId!, out _));
            Assert.False(cleared.Checks.TryGetProperty(small.RowId!, out _));
            Assert.False(cleared.Baselines.TryGetProperty(small.RowId!, out _));

            void AssertUnchangedLargeAndControls((WeeklyPlan Plan, GroceryLineItemDto[] Rows, JsonElement Checks,
                JsonElement Baselines, JsonElement Evidence) state)
            {
                var actual = Assert.Single(state.Rows, row => HasCapacity(row, "800"));
                Assert.Equal(large.RowId, actual.RowId); // Intended red: disjoint cleared400 must not retire800 lineage.
                Assert.Equal(large.RowVersion, actual.RowVersion);
                Assert.Equal(large.DemandIdentity, actual.DemandIdentity);
                Assert.Equal(LegacyGroceryQuantity.Parse("1/2"), actual.ExactQuantity);
                Assert.True(state.Checks.GetProperty(large.RowId!).GetBoolean());
                Assert.True(JsonElement.DeepEquals(largeBaseline, state.Baselines.GetProperty(large.RowId!)));
                Assert.True(JsonElement.DeepEquals(checkedState.Evidence.GetProperty(large.RowId!),
                    state.Evidence.GetProperty(large.RowId!)));
                foreach (var id in new[] { pastaId, sauceId })
                {
                    Assert.Equal(JsonSerializer.Serialize(Assert.Single(checkedState.Rows, row => row.RowId == id), Json),
                        JsonSerializer.Serialize(Assert.Single(state.Rows, row => row.RowId == id), Json));
                    Assert.True(state.Checks.GetProperty(id).GetBoolean());
                    Assert.True(JsonElement.DeepEquals(checkedState.Baselines.GetProperty(id), state.Baselines.GetProperty(id)));
                }
            }
            AssertUnchangedLargeAndControls(cleared);
            Assert.Equal(operations + 1, (await DeclaredPackageState(factory)).Operations);
            AssertDeclaredPackageUnrelatedFacts(before, current);
            Assert.Equal(largeOriginal, JsonSerializer.Serialize(current.IngredientLines.Single(row => row.Id == largeId), Json));

            current = await SaveDeclaredPackageRows(factory, current, current.IngredientLines
                .Select(row => row.Id == smallId ? Row(row, "4") : Row(row)).ToArray());
            Assert.Null(current.IngredientLines.Single(row => row.Id == smallId).Package);
            var following = await Read();
            var followingSmall = Assert.Single(following.Rows, row => row.RowId == nextSmall.RowId);
            Assert.Equal(LegacyGroceryQuantity.Parse("1"), followingSmall.ExactQuantity);
            Assert.Equal(nextSmall.DemandIdentity, followingSmall.DemandIdentity);
            Assert.False(following.Checks.GetProperty(followingSmall.RowId!).GetBoolean());
            Assert.False(following.Baselines.TryGetProperty(followingSmall.RowId!, out _));
            AssertUnchangedLargeAndControls(following);
            Assert.Equal(operations + 2, (await DeclaredPackageState(factory)).Operations);
            AssertDeclaredPackageUnrelatedFacts(before, current);
            Assert.Equal(largeOriginal, JsonSerializer.Serialize(current.IngredientLines.Single(row => row.Id == largeId), Json));
            using (var scope = factory.Services.CreateScope())
            {
                var saved = await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(row => row.Id == Id);
                Assert.Equal(metadata, saved.RawMetadata);
                Assert.Equal(sourceUrl, saved.SourceUrl);
            }
            var repeated = await Read();
            AssertUnchangedLargeAndControls(repeated);
            Assert.Equal(following.Plan.GroceryItems, repeated.Plan.GroceryItems);
            Assert.Equal(following.Plan.GroceryState, repeated.Plan.GroceryState);
            Assert.Equal(following.Plan.GroceryCheckedDemandBaselines, repeated.Plan.GroceryCheckedDemandBaselines);
            Assert.Equal(following.Plan.GroceryListVersion, repeated.Plan.GroceryListVersion);
        });
    }
}
