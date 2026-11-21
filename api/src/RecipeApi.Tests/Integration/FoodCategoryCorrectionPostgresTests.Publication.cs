using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using static RecipeApi.Tests.Integration.BilingualGroceryPostgresTests;

namespace RecipeApi.Tests.Integration;

public sealed partial class FoodCategoryCorrectionPostgresTests
{
    private static readonly Guid Onion = BoundedVocabularyInput.Onion;
    private static readonly DateOnly Monday = new(2026, 10, 12);

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public Task OrdinaryPublication_CategoryScopesRetainManualProvenanceChecksAndAtomicRevisionWinners(bool conflicting) =>
        new BilingualGroceryPostgresTests(output).WithHousehold(async factory =>
        {
            using (var time = factory.Services.CreateScope())
                ((DeploymentCalendarIntegrationTests.CalendarClock)time.ServiceProvider.GetRequiredService<IClock>()).UtcNow = DateTimeOffset.Parse("2026-10-12T16:00:00Z");
            var en = await PublishSource(factory, "en", new SourceLine("onion, diced", "25"));
            var fr = await PublishSource(factory, "fr", new SourceLine("oignon émincé", "75"));
            var fallback = await PublishSource(factory, "fr", new SourceLine("échalote", "3"));
            await Assign(factory, en, 0); await Assign(factory, fr, 1); await Assign(factory, fallback, 2);
            var future = Monday.AddDays(7);
            Guid extra;
            using (var setup = factory.Services.CreateScope())
            {
                var db = setup.ServiceProvider.GetRequiredService<RecipeDbContext>();
                db.IngredientCategories.AddRange(
                    new IngredientCategory { NormalizedKey = "onion diced", GrocerySection = "Pantry", Source = "manual" },
                    new IngredientCategory { NormalizedKey = "oignon emince", GrocerySection = conflicting ? "Produce" : "Pantry", Source = "manual" });
                extra = Guid.NewGuid();
                db.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(extra, extra, Monday, "onion, diced", "onion, diced", "Frozen", setup.ServiceProvider.GetRequiredService<IClock>().UtcNow));
                await db.SaveChangesAsync();
                await setup.ServiceProvider.GetRequiredService<ScheduleService>().AssignRecipeAsync(new(1, 0, en), referenceWeekStartDate: Monday);
                await setup.ServiceProvider.GetRequiredService<ScheduleService>().AssignRecipeAsync(new(1, 1, fallback), referenceWeekStartDate: Monday);
                await setup.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, default);
            }
            using var client = factory.CreateAuthenticatedClient();
            async Task<JsonElement> Read(DateOnly week) => await GroceryTestRows.ReadAsync(client, week);
            var before = await Read(Monday);
            var row = Assert.Single(before.GetProperty("groceryItems").EnumerateArray(), x => x.TryGetProperty("foodId", out var food) && food.ValueKind == JsonValueKind.String && food.GetGuid() == Onion);
            Assert.Equal(conflicting ? "conflict" : "resolved", row.GetProperty("categoryStatus").GetString());
            Assert.Equal(conflicting ? "Grocery" : "Pantry", row.GetProperty("section").GetString());
            Assert.All(row.GetProperty("categoryChoices").EnumerateArray(), x => Assert.Equal("manual", x.GetProperty("source").GetString()));
            var saved = await Plan(factory);
            await Check(factory, Assert.Single(Rows(saved), x => x.FoodId == Onion));
            using (var check = await client.PatchAsJsonAsync($"/api/grocery-extras/{extra}", new { weekStartDate = Monday, expectedVersion = 1, @checked = true }))
                Assert.True(check.IsSuccessStatusCode, await check.Content.ReadAsStringAsync());
            var acknowledged = await Plan(factory);
            var vocabulary = await VocabularyState(factory);
            async Task<string> State()
            {
                using var scope = factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                return JsonSerializer.Serialize(new
                {
                    corrections = await db.HouseholdFoodOverrides.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync(),
                    recipes = await db.Recipes.AsNoTracking().OrderBy(x => x.Id).Select(x => new { x.Id, x.CanonicalContent, x.FoodMappingEvidence }).ToArrayAsync(),
                    plans = await db.WeeklyPlans.AsNoTracking().OrderBy(x => x.WeekStartDate).ToArrayAsync(),
                    categories = await db.IngredientCategories.AsNoTracking().OrderBy(x => x.NormalizedKey).ToArrayAsync(),
                    extras = await db.GroceryExtraOccurrences.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync()
                });
            }
            async Task Reject(string target, object body, string code)
            {
                var previous = await State();
                using var result = await client.PatchAsJsonAsync($"/api/foods/{target}/category", body);
                Assert.Equal(HttpStatusCode.Conflict, result.StatusCode);
                Assert.Equal(code, JsonDocument.Parse(await result.Content.ReadAsStringAsync()).RootElement.GetProperty("code").GetString());
                Assert.Equal(previous, await State());
            }
            await Reject(Onion.ToString(), new { grocerySection = "Bakery" }, "upgrade_required");
            await Reject(Onion.ToString(), new { grocerySection = "Bakery", expectedCategoryRevision = "foreign" }, "food_category_conflict");
            await Reject(Guid.NewGuid().ToString(), new { grocerySection = "Bakery", expectedCategoryRevision = (string?)null }, "food_identity_conflict");
            using (var first = await client.PatchAsJsonAsync($"/api/foods/{Onion}/category", new { grocerySection = "Bakery", expectedCategoryRevision = (string?)null }))
                Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
            var revision = Assert.Single((await Read(Monday)).GetProperty("groceryItems").EnumerateArray(), x => x.TryGetProperty("foodId", out var food) && food.ValueKind == JsonValueKind.String && food.GetGuid() == Onion).GetProperty("categoryRevision").GetString();
            Assert.False(string.IsNullOrWhiteSpace(revision));
            await Reject(Onion.ToString(), new { grocerySection = "Deli", expectedCategoryRevision = (string?)null }, "food_category_conflict");
            await Reject(Onion.ToString(), new { grocerySection = "Deli", expectedCategoryRevision = "stale" }, "food_category_conflict");
            using var second = factory.CreateAuthenticatedClient();
            var results = await Task.WhenAll(client.PatchAsJsonAsync($"/api/foods/{Onion}/category", new { grocerySection = "Deli", expectedCategoryRevision = revision }),
                second.PatchAsJsonAsync($"/api/foods/{Onion}/category", new { grocerySection = "Beverages", expectedCategoryRevision = revision }));
            Assert.Single(results, x => x.StatusCode == HttpStatusCode.NoContent);
            Assert.Single(results, x => x.StatusCode == HttpStatusCode.Conflict);
            foreach (var result in results) result.Dispose();
            using var final = factory.Services.CreateScope();
            var stored = final.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var correction = await stored.HouseholdFoodOverrides.AsNoTracking().SingleAsync();
            Assert.Equal("2", correction.PresentationSequence);
            Assert.Contains(correction.GrocerySection, new[] { "Deli", "Beverages" });
            foreach (var week in new[] { Monday, future })
            {
                var current = await stored.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == week);
                Assert.Equal(correction.GrocerySection, Assert.Single(Rows(current), x => x.FoodId == Onion).Section);
            }
            var after = await Plan(factory);
            var oldOnion = Assert.Single(Rows(acknowledged), x => x.FoodId == Onion);
            var nextOnion = Assert.Single(Rows(after), x => x.FoodId == Onion);
            Assert.Equal((oldOnion.RowId, oldOnion.DemandIdentity, oldOnion.ExactQuantity), (nextOnion.RowId, nextOnion.DemandIdentity, nextOnion.ExactQuantity));
            Assert.Equal(acknowledged.GroceryState, after.GroceryState);
            Assert.Equal(acknowledged.GroceryCheckedDemandBaselines, after.GroceryCheckedDemandBaselines);
            var originalExtra = await stored.GroceryExtraOccurrences.AsNoTracking().SingleAsync(x => x.Id == extra);
            Assert.Equal("Frozen", originalExtra.GrocerySection);
            Assert.True(originalExtra.Checked);
            Assert.Equal(2, await stored.IngredientCategories.CountAsync(x => x.Source == "manual"));
            using (var changeFallback = await client.PatchAsJsonAsync("/api/ingredients/echalote/category", new { grocerySection = "Produce" }))
                Assert.Equal(HttpStatusCode.NoContent, changeFallback.StatusCode);
            Assert.Equal("Produce", Assert.Single(Rows(await Plan(factory)), x => x.RecipeIds.Contains(fallback)).Section);
            var futurePlan = await stored.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == future);
            Assert.Equal("Produce", Assert.Single(Rows(futurePlan), x => x.RecipeIds.Contains(fallback)).Section);
            Assert.Equal(vocabulary, await VocabularyState(factory));
        }, seedPlans: false);
}
