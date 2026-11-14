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
using PostgresTheory = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresTheoryAttribute;

namespace RecipeApi.Tests.Integration;

public sealed partial class GroceryCheckConcurrencyPostgresTests
{
    [PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task MeasuredIncreaseAndLateCheckUseCoordinatedDemand_ThenRecheckSurvivesRetry(bool recomputeFirst)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var barrier = new WeeklyPlanReadBarrier();
            await using var factory = await Factory(settings.ConnectionString,
                services => services.AddDbContext<RecipeDbContext>(options => options.AddInterceptors(barrier)));
            var recipeId = Guid.NewGuid();
            async Task SetAmount(int amount)
            {
                using var scope = factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.SingleOrDefaultAsync(r => r.Id == recipeId);
                if (recipe is null)
                {
                    recipe = new() { Id = recipeId, Name = "Measured race" };
                    db.Recipes.Add(recipe);
                    db.CalendarEvents.Add(new() { Date = Monday, RecipeId = recipeId });
                }
                recipe.Ingredients = "[\"pasta\",\"sauce\"]";
                recipe.RawMetadata = JsonSerializer.Serialize(new { recipeIngredient = new[] { "pasta", "sauce" }, supply = new[] { new { name = "pasta", quantity = amount, unitText = "g" }, new { name = "sauce", quantity = 100, unitText = "ml" } } });
                await db.SaveChangesAsync();
            }
            async Task Recompute()
            {
                using var scope = factory.Services.CreateScope();
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, default);
            }
            using var client = factory.CreateAuthenticatedClient();
            async Task<JsonElement> Snapshot() => Data(await client.GetFromJsonAsync<JsonElement>("/api/schedule?weekOffset=0"));
            Task<HttpResponseMessage> Check(JsonElement row) => client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new
            {
                rowId = row.GetProperty("rowId").GetString(), weekStartDate = Monday.ToString("yyyy-MM-dd"),
                expectedRowVersion = row.GetProperty("rowVersion").GetString(), @checked = true, clientMutationId = Guid.NewGuid()
            });
            await SetAmount(400);
            await Recompute();
            var initial = (await Snapshot()).GetProperty("groceryItems").EnumerateArray().ToArray();
            var pasta = initial.Single(row => row.GetProperty("normalizedKey").GetString() == "pasta");
            var sauce = initial.Single(row => row.GetProperty("normalizedKey").GetString() == "sauce");
            Assert.Equal(HttpStatusCode.OK, (await Check(sauce)).StatusCode);
            await SetAmount(600);
            barrier.Enabled = true;
            Task first = recomputeFirst ? Recompute() : Check(pasta);
            Task<HttpResponseMessage>? item = first as Task<HttpResponseMessage>;
            Task? second = null;
            try
            {
                await barrier.FirstRead.Task.WaitAsync(TimeSpan.FromSeconds(15));
                if (recomputeFirst) second = item = Check(pasta);
                else second = Recompute();
                Assert.False(second.IsCompleted);
            }
            finally { barrier.Release.TrySetResult(); }
            await first.WaitAsync(TimeSpan.FromSeconds(15));
            await second!.WaitAsync(TimeSpan.FromSeconds(15));
            Assert.Equal(recomputeFirst ? HttpStatusCode.Conflict : HttpStatusCode.OK, (await item!).StatusCode);
            var after = await Snapshot();
            var pastaId = pasta.GetProperty("rowId").GetString()!;
            var sauceId = sauce.GetProperty("rowId").GetString()!;
            Assert.False(after.GetProperty("groceryState").GetProperty(pastaId).GetBoolean());
            Assert.True(after.GetProperty("groceryState").GetProperty(sauceId).GetBoolean());
            var current = after.GetProperty("groceryItems").EnumerateArray().Single(row => row.GetProperty("rowId").GetString() == pastaId);
            Assert.Equal("600", current.GetProperty("quantity").GetProperty("value").GetProperty("n").GetString());
            Assert.Equal(HttpStatusCode.OK, (await Check(current)).StatusCode);
            await Recompute();
            Assert.True((await Snapshot()).GetProperty("groceryState").GetProperty(pastaId).GetBoolean());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CategoryWritesPreserveNormalIngredientScopeAndOneExtraOccurrenceScope()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await Factory(settings.ConnectionString);
            var extras = new[] { Guid.NewGuid(), Guid.NewGuid() };
            using (var seed = factory.Services.CreateScope())
            {
                var db = seed.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var dateOffset = 0;
                foreach (var unit in new[] { "g", "cup" })
                {
                    var recipe = new Recipe { Name = "Category fixture", Ingredients = "[\"pasta\"]", RawMetadata = JsonSerializer.Serialize(new { recipeIngredient = new[] { "pasta" }, supply = new[] { new { name = "pasta", quantity = 2, unitText = unit } } }) };
                    db.Recipes.Add(recipe);
                    db.CalendarEvents.Add(new() { Date = Monday.AddDays(dateOffset++), RecipeId = recipe.Id });
                }
                foreach (var id in extras) db.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(id, Guid.NewGuid(), Monday, "pasta", "pasta", "Pantry", DateTimeOffset.UtcNow));
                await db.SaveChangesAsync();
                await seed.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, default);
            }
            using var client = factory.CreateAuthenticatedClient();
            Assert.Equal(HttpStatusCode.NoContent, (await client.PatchAsJsonAsync("/api/ingredients/pasta/category", new { grocerySection = "Produce" })).StatusCode);
            using (var fresh = factory.Services.CreateScope())
            {
                var db = fresh.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var rows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>((await db.WeeklyPlans.SingleAsync()).GroceryItems)!;
                Assert.Equal(2, rows.Count);
                Assert.All(rows, row => Assert.Equal("Produce", row.Section));
                Assert.All(await db.GroceryExtraOccurrences.ToListAsync(), extra => Assert.Equal("Pantry", extra.GrocerySection));
            }
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/grocery-extras/{extras[0]}", new { weekStartDate = Monday.ToString("yyyy-MM-dd"), expectedVersion = 1, grocerySection = "Bakery" })).StatusCode);
            using var final = factory.Services.CreateScope();
            var finalDb = final.ServiceProvider.GetRequiredService<RecipeDbContext>();
            Assert.Equal("Bakery", (await finalDb.GroceryExtraOccurrences.SingleAsync(extra => extra.Id == extras[0])).GrocerySection);
            Assert.Equal("Pantry", (await finalDb.GroceryExtraOccurrences.SingleAsync(extra => extra.Id == extras[1])).GrocerySection);
            Assert.All(JsonSerializer.Deserialize<List<GroceryLineItemDto>>((await finalDb.WeeklyPlans.SingleAsync()).GroceryItems)!, row => Assert.Equal("Produce", row.Section));
            Assert.Equal("Produce", (await finalDb.IngredientCategories.SingleAsync(category => category.NormalizedKey == "pasta")).GrocerySection);
        });
    }

    [PostgresTheory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ObservedSplitAndMergeRetireChecksAcrossFreshScopesAndRetry(bool split)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await Factory(settings.ConnectionString);
            var ids = new[] { Guid.NewGuid(), Guid.NewGuid() };
            async Task Change(int index, string unit)
            {
                using var scope = factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.SingleOrDefaultAsync(r => r.Id == ids[index]);
                if (recipe is null)
                {
                    recipe = new() { Id = ids[index], Name = "Membership fixture" };
                    db.Recipes.Add(recipe);
                    db.CalendarEvents.Add(new() { Date = Monday.AddDays(index), RecipeId = recipe.Id });
                }
                var text = $"2 {unit} pasta";
                recipe.Ingredients = JsonSerializer.Serialize(new[] { text });
                recipe.RawMetadata = JsonSerializer.Serialize(new { recipeIngredient = new[] { text }, supply = new[] { new { name = "pasta", quantity = 2, unitText = unit } } });
                await db.SaveChangesAsync();
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, default);
            }
            using var client = factory.CreateAuthenticatedClient();
            async Task<JsonElement> Snapshot() => Data(await client.GetFromJsonAsync<JsonElement>("/api/schedule?weekOffset=0"));
            await Change(0, "g");
            await Change(1, split ? "g" : "cup");
            var before = (await Snapshot()).GetProperty("groceryItems").EnumerateArray().ToArray();
            foreach (var row in before)
                Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new
                {
                    rowId = row.GetProperty("rowId").GetString(), weekStartDate = Monday.ToString("yyyy-MM-dd"),
                    expectedRowVersion = row.GetProperty("rowVersion").GetString(), @checked = true, clientMutationId = Guid.NewGuid()
                })).StatusCode);
            await Change(1, split ? "cup" : "g");
            var after = await Snapshot();
            var rows = after.GetProperty("groceryItems").EnumerateArray().ToArray();
            Assert.Equal(split ? 2 : 1, rows.Length);
            Assert.All(rows, row => Assert.DoesNotContain(before, prior => prior.GetProperty("rowId").GetString() == row.GetProperty("rowId").GetString()));
            Assert.All(after.GetProperty("groceryState").EnumerateObject(), check => Assert.False(check.Value.GetBoolean()));
            using (var fresh = factory.Services.CreateScope())
            {
                var plan = await fresh.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync();
                Assert.Empty(JsonDocument.Parse(plan.GroceryCheckedDemandBaselines).RootElement.EnumerateObject());
                Assert.Equal(rows.Length, JsonDocument.Parse(plan.GroceryDemandEvidence).RootElement.EnumerateObject().Count());
            }
            await Change(1, split ? "cup" : "g");
            var retry = await Snapshot();
            Assert.Equal(after.GetProperty("groceryListVersion").GetString(), retry.GetProperty("groceryListVersion").GetString());
            Assert.Equal(rows.Select(r => r.GetProperty("rowId").GetString()), retry.GetProperty("groceryItems").EnumerateArray().Select(r => r.GetProperty("rowId").GetString()));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task IdenticalOriginalInputsRetainDecimalAcknowledgementAfterExactSourceRefinement()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await Factory(settings.ConnectionString);
            var id = Guid.NewGuid();
            using (var seed = factory.Services.CreateScope())
            {
                var db = seed.ServiceProvider.GetRequiredService<RecipeDbContext>();
                db.Recipes.Add(new() { Id = id, Name = "Source fixture", Ingredients = "[\"1/3 cup pasta\"]",
                    RawMetadata = "{\"recipeIngredient\":[\"1/3 cup pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":0.33,\"unitText\":\"cup\"}]}" });
                db.CalendarEvents.Add(new() { Date = Monday, RecipeId = id });
                await db.SaveChangesAsync();
                await seed.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, default);
                db.ChangeTracker.Clear();
                var plan = await db.WeeklyPlans.SingleAsync();
                var row = Assert.Single(JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!);
                plan.GroceryItems = JsonSerializer.Serialize(new[] { row with { ExactQuantity = new("scalar", new("33", "100")), Quantity = 0.33 } });
                await db.SaveChangesAsync();
            }
            using var client = factory.CreateAuthenticatedClient();
            var snapshot = Data(await client.GetFromJsonAsync<JsonElement>("/api/schedule?weekOffset=0"));
            var original = snapshot.GetProperty("groceryItems")[0];
            var rowId = original.GetProperty("rowId").GetString()!;
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync("/api/schedule/0/grocery/item", new
            {
                rowId, weekStartDate = Monday.ToString("yyyy-MM-dd"), expectedRowVersion = original.GetProperty("rowVersion").GetString(),
                @checked = true, clientMutationId = Guid.NewGuid()
            })).StatusCode);
            using (var recompute = factory.Services.CreateScope())
                await recompute.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, default);
            using var fresh = factory.Services.CreateScope();
            var persisted = await fresh.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync();
            Assert.True(JsonDocument.Parse(persisted.GroceryState).RootElement.GetProperty(rowId).GetBoolean());
            var baseline = JsonDocument.Parse(persisted.GroceryCheckedDemandBaselines).RootElement.GetProperty(rowId);
            Assert.Equal("33", baseline.GetProperty("Quantity").GetProperty("value").GetProperty("n").GetString());
            Assert.Equal("100", baseline.GetProperty("Quantity").GetProperty("value").GetProperty("d").GetString());
            Assert.Equal(64, baseline.GetProperty("InputFingerprint").GetString()!.Length);
            var current = Assert.Single(JsonSerializer.Deserialize<List<GroceryLineItemDto>>(persisted.GroceryItems)!);
            Assert.Equal(new("scalar", new GroceryRational("1", "3")), current.ExactQuantity);
            Assert.Null(persisted.GroceryResetSummaryVersion);
        });
    }
}
