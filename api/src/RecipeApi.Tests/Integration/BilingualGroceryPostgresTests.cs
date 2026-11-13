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
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

// Controlled saved mappings qualify consumers; real producer proof is the
// separately executed BilingualGroceries_ActualEnFrImports... tracer.
public sealed class BilingualGroceryPostgresTests(ITestOutputHelper output)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly Guid Onion = Guid.Parse("ac9818ee-4c30-4f91-a4ea-0aa4fc7265ee");
    private static readonly DateOnly Monday = new(2026, 10, 12);

    private Task WithHousehold(Func<TestWebApplicationFactory, Task> check) => new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(), new()
        { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString, ["Tests:LocalRecipeStore"] = "true" });
        await TomorrowPushPostgresTests.Seed(factory);
        using (var scope = factory.Services.CreateScope())
        {
            var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
            await scope.ServiceProvider.GetRequiredService<FoodVocabularyStore>().PublishReviewedAsync(bytes, null, Guid.NewGuid(), "test-review:native-grocery-consumers");
        }
        await check(factory);
    });

    private static async Task<Guid> SeedMapped(TestWebApplicationFactory factory, string name, string amount = "1", string unit = "g", RecipePackageDto? package = null)
    {
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var id = Guid.NewGuid();
        var revision = Guid.NewGuid().ToString("N");
        var row = new RecipeIngredientLineDto { Id = Guid.NewGuid(), Description = name, Amount = LegacyGroceryQuantity.Parse(amount), AmountText = amount,
            Unit = new(unit, null), Scaling = "proportional", Package = package, Shopping = new(name, null, null), Provenance = new("source", revision, []) };
        var source = JsonSerializer.Serialize(new { name, recipeYield = "4 servings", recipeIngredient = new[] { CanonicalRecipeContentStore.Render(row) },
            supply = new[] { new { name, requiredQuantity = new { value = double.Parse(amount, System.Globalization.CultureInfo.InvariantCulture), unitText = unit } } } }, Json);
        var content = new CanonicalRecipeContent(2, Guid.NewGuid().ToString("N"), revision, 4, [row], []);
        var mapped = FoodMappingQualification.Prepare(new(id, content, source), await services.GetRequiredService<FoodVocabularyStore>().CaptureAuthorityAsync(null), Guid.NewGuid());
        Assert.NotNull(Assert.Single(mapped.Export.Content.IngredientLines).Shopping.FoodId);
        db.Recipes.Add(new() { Id = id, Name = name, Servings = 4, IsReady = true, CanonicalContent = JsonSerializer.Serialize(mapped.Export.Content, Json),
            FoodMappingEvidence = mapped.Evidence, RawMetadata = source, Ingredients = JsonSerializer.Serialize(new[] { CanonicalRecipeContentStore.Render(row) }),
            CreatedAt = services.GetRequiredService<IClock>().UtcNow, UpdatedAt = services.GetRequiredService<IClock>().UtcNow });
        await db.SaveChangesAsync();
        return id;
    }

    private static async Task Assign(TestWebApplicationFactory factory, Guid id, int day)
    {
        using var client = factory.CreateAuthenticatedClient();
        using var response = await client.PostAsJsonAsync($"/api/schedule/assign?referenceWeekStartDate={Monday:yyyy-MM-dd}", new { weekOffset = 0, dayIndex = day, recipeId = id });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task<WeeklyPlan> Plan(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == Monday);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Mapped400Package_OrdinarySaveClearPreservesUntouchedChecked800IdentityAndBaseline() => WithHousehold(async factory =>
    {
        RecipePackageDto Package(string size) => new(new("cans", null), new(LegacyGroceryQuantity.Parse(size)!, new("g", null)), "net");
        var smallId = await SeedMapped(factory, "canned tomatoes", "3", "cans", Package("400"));
        var largeId = await SeedMapped(factory, "canned tomatoes", "2", "cans", Package("800"));
        await Assign(factory, smallId, 0); await Assign(factory, largeId, 1);
        var plan = await Plan(factory);
        var rows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems, Json)!;
        var small = Assert.Single(rows, row => row.RecipeIds.Contains(smallId));
        var large = Assert.Single(rows, row => row.RecipeIds.Contains(largeId));
        using var client = factory.CreateAuthenticatedClient();
        foreach (var row in new[] { small, large })
        {
            using var check = await client.PatchAsJsonAsync($"/api/schedule/0/grocery/item?referenceWeekStartDate={Monday:yyyy-MM-dd}", new
            { rowId = row.RowId, weekStartDate = Monday, expectedRowVersion = row.RowVersion, @checked = true, clientMutationId = Guid.NewGuid() });
            Assert.Equal(HttpStatusCode.OK, check.StatusCode);
        }
        var checkedPlan = await Plan(factory);
        var baseline = JsonDocument.Parse(checkedPlan.GroceryCheckedDemandBaselines).RootElement.GetProperty(large.RowId).GetRawText();
        CanonicalRecipeContent content;
        using (var read = factory.Services.CreateScope()) content = CanonicalRecipeContentStore.Read(await read.ServiceProvider.GetRequiredService<RecipeDbContext>()
            .Recipes.AsNoTracking().SingleAsync(x => x.Id == smallId))!;
        var line = content.IngredientLines[0];
        using var save = await client.PatchAsJsonAsync($"/api/recipes/{smallId}", new
        { expectedContentRevision = content.ContentRevision, ingredientLines = new[] { new { id = line.Id, description = line.Description, amount = line.Amount,
            amountText = line.AmountText, unit = line.Unit, scaling = line.Scaling, package = (RecipePackageDto?)null, shopping = line.Shopping } } });
        Assert.Equal(HttpStatusCode.OK, save.StatusCode);
        using (var refresh = factory.Services.CreateScope()) await refresh.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, default);
        var after = await Plan(factory);
        var current = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(after.GroceryItems, Json)!;
        var nextLarge = Assert.Single(current, row => row.RecipeIds.Contains(largeId));
        var nextSmall = Assert.Single(current, row => row.RecipeIds.Contains(smallId));
        Assert.Equal(large.RowId, nextLarge.RowId);
        Assert.Equal(large.DemandIdentity, nextLarge.DemandIdentity);
        Assert.Equal(baseline, JsonDocument.Parse(after.GroceryCheckedDemandBaselines).RootElement.GetProperty(large.RowId).GetRawText());
        Assert.True(JsonDocument.Parse(after.GroceryState).RootElement.GetProperty(large.RowId).GetBoolean());
        Assert.NotEqual(small.RowId, nextSmall.RowId);
        Assert.False(JsonDocument.Parse(after.GroceryState).RootElement.GetProperty(nextSmall.RowId).GetBoolean());
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task FoodCategoryCorrection_RevisionRaceKeepsOneWinnerPrivateAliasesAndExtraOccurrence() => WithHousehold(async factory =>
    {
        var en = await SeedMapped(factory, "onion"); var fr = await SeedMapped(factory, "oignon");
        await Assign(factory, en, 0); await Assign(factory, fr, 1);
        Guid extraId;
        using (var setup = factory.Services.CreateScope())
        {
            var db = setup.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.IngredientCategories.AddRange(new IngredientCategory { NormalizedKey = "onion", GrocerySection = "Pantry", Source = "manual" },
                new IngredientCategory { NormalizedKey = "oignon", GrocerySection = "Produce", Source = "manual" });
            extraId = Guid.NewGuid();
            db.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(extraId, extraId, Monday, "onion", "onion", "Frozen", setup.ServiceProvider.GetRequiredService<IClock>().UtcNow));
            await db.SaveChangesAsync();
            await setup.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, default);
        }
        using var first = factory.CreateAuthenticatedClient(); using var second = factory.CreateAuthenticatedClient();
        using var initial = await first.PatchAsJsonAsync($"/api/foods/{Onion}/category", new { grocerySection = "Bakery", expectedCategoryRevision = (string?)null });
        Assert.Equal(HttpStatusCode.NoContent, initial.StatusCode);
        string revision;
        using (var read = factory.Services.CreateScope()) revision = (await read.ServiceProvider.GetRequiredService<RecipeDbContext>().HouseholdFoodOverrides.AsNoTracking().SingleAsync()).Revision;
        var results = await Task.WhenAll(first.PatchAsJsonAsync($"/api/foods/{Onion}/category", new { grocerySection = "Deli", expectedCategoryRevision = revision }),
            second.PatchAsJsonAsync($"/api/foods/{Onion}/category", new { grocerySection = "Beverages", expectedCategoryRevision = revision }));
        Assert.Single(results, result => result.StatusCode == HttpStatusCode.NoContent);
        Assert.Single(results, result => result.StatusCode == HttpStatusCode.Conflict);
        foreach (var result in results) result.Dispose();
        using var final = factory.Services.CreateScope();
        var stored = final.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var correction = await stored.HouseholdFoodOverrides.AsNoTracking().SingleAsync();
        Assert.Contains(correction.GrocerySection, new[] { "Deli", "Beverages" });
        Assert.Equal("2", correction.PresentationSequence);
        Assert.Equal("Pantry", (await stored.IngredientCategories.AsNoTracking().SingleAsync(x => x.NormalizedKey == "onion")).GrocerySection);
        Assert.Equal("Produce", (await stored.IngredientCategories.AsNoTracking().SingleAsync(x => x.NormalizedKey == "oignon")).GrocerySection);
        Assert.Equal("Frozen", (await stored.GroceryExtraOccurrences.AsNoTracking().SingleAsync(x => x.Id == extraId)).GrocerySection);
        var feed = await final.ServiceProvider.GetRequiredService<HouseholdFoodOverrideStore>().ReadRecoveryFeedAsync(Guid.Parse("0ab45f44-78d8-4322-a96e-678ff29abe73"));
        var captured = Assert.Single(feed.Overrides);
        Assert.Equal(correction.Revision, captured.Revision);
        Assert.Equal(correction.DocumentSha256, captured.Document!.Sha256);
        Assert.Equal("2", captured.PresentationSequence);
    });
}
