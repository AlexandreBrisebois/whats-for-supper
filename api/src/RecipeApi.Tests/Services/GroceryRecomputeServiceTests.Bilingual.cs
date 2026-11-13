using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Integration;
using RecipeApi.Utils;
using Xunit;

namespace RecipeApi.Tests.Services;

public partial class GroceryRecomputeServiceTests
{
    private static readonly Guid OnionFood = Guid.Parse("ac9818ee-4c30-4f91-a4ea-0aa4fc7265ee");
    private static readonly Guid FreshTomatoFood = Guid.Parse("d9940182-48c9-4823-a820-1c7c54869d5f");
    private static readonly Guid CannedTomatoFood = Guid.Parse("031a0c4b-2d73-4a70-88aa-8ad3dd680ebb");

    private async Task InstallBilingualConsumerVocabulary()
    {
        var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
        await _scope.ServiceProvider.GetRequiredService<FoodVocabularyStore>()
            .PublishReviewedAsync(bytes, null, Guid.NewGuid(), "test-review:grocery-consumers");
        _service = _scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>();
    }

    // Pure consumer qualification uses the real pure mapping owner with controlled
    // source input. Actual import/Save/assignment producer proof is a separate PG fact.
    private async Task<Guid> SeedQualifiedFood(DateOnly date, string name, string amount = "1", string unit = "g", RecipePackageDto? package = null)
    {
        var id = await SeedRecipeWithSupplyAsync(date, [], basis: 4);
        var source = JsonSerializer.Serialize(new { recipeIngredient = new[] { amount + " " + unit + " " + name },
            supply = new[] { new { name, requiredQuantity = new { value = double.Parse(amount, System.Globalization.CultureInfo.InvariantCulture), unitText = unit } } } });
        var revision = "source-" + id.ToString("N");
        var line = new RecipeIngredientLineDto { Id = Guid.NewGuid(), Description = name, AmountText = amount,
            Amount = LegacyGroceryQuantity.Parse(amount), Unit = new(unit, null), Scaling = "proportional", Package = package,
            Shopping = new(name, null, null), Provenance = new("source", revision, []) };
        source = JsonSerializer.Serialize(new { recipeIngredient = new[] { CanonicalRecipeContentStore.Render(line) },
            supply = new[] { new { name, requiredQuantity = new { value = double.Parse(amount, System.Globalization.CultureInfo.InvariantCulture), unitText = unit } } } });
        var content = new CanonicalRecipeContent(2, "content-" + id.ToString("N"), revision, 4, [line], []);
        var authority = await _scope.ServiceProvider.GetRequiredService<FoodVocabularyStore>().CaptureAuthorityAsync(null);
        var mapped = FoodMappingQualification.Prepare(new(id, content, source), authority, Guid.NewGuid());
        var recipe = await _db.Recipes.SingleAsync(x => x.Id == id);
        recipe.RawMetadata = source;
        recipe.CanonicalContent = JsonSerializer.Serialize(mapped.Export.Content, PackageJson);
        recipe.FoodMappingEvidence = mapped.Evidence;
        await _db.SaveChangesAsync();
        return id;
    }

    [Fact]
    public async Task BilingualSavedIdentity_CompatibleExactAmountsGroupOnceWithoutChangingMechanicalNormalizer()
    {
        await InstallBilingualConsumerVocabulary();
        await SeedQualifiedFood(TestMonday, "onion", "0.5", "kg");
        await SeedQualifiedFood(TestMonday.AddDays(1), "oignon", "250", "g");
        Assert.NotEqual(IngredientNormalizer.Normalize("onion"), IngredientNormalizer.Normalize("oignon"));
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var row = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        Assert.Equal(LegacyGroceryQuantity.Parse("750"), row.ExactQuantity);
        using var identity = JsonDocument.Parse(row.DemandIdentity);
        Assert.Equal(OnionFood, identity.RootElement.GetProperty("foodId").GetGuid());
        Assert.Equal("g", row.UnitText);
    }

    [Fact]
    public async Task BilingualSavedIdentity_PurchaseUnitAndAmbiguityBoundariesRemainSeparate()
    {
        await InstallBilingualConsumerVocabulary();
        await SeedQualifiedFood(TestMonday, "tomato");
        await SeedQualifiedFood(TestMonday, "tomates en conserve");
        await SeedQualifiedFood(TestMonday, "onion", unit: "g");
        await SeedQualifiedFood(TestMonday, "oignon", unit: "ml");
        await SeedQualifiedFood(TestMonday, "onion", unit: "pinch");
        await SeedQualifiedFood(TestMonday, "oignon", unit: "handful");
        await SeedQualifiedFood(TestMonday, "échalote");
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var rows = await GetGroceryItemsAsync(TestMonday);
        Assert.Equal(7, rows.Count);
        Assert.Equal(4, rows.Count(row => row.DemandIdentity.Contains(OnionFood.ToString(), StringComparison.Ordinal)));
        Assert.Contains(rows, row => row.DemandIdentity.Contains(FreshTomatoFood.ToString(), StringComparison.Ordinal));
        Assert.Contains(rows, row => row.DemandIdentity.Contains(CannedTomatoFood.ToString(), StringComparison.Ordinal));
        Assert.Contains(rows, row => row.NormalizedKey == IngredientNormalizer.Normalize("échalote")
            && !row.DemandIdentity.Contains("foodId", StringComparison.Ordinal));
    }

    [Fact]
    public async Task BilingualSavedIdentity_UnqualifiedSavedIdRejectsBeforeReplacingGroceryState()
    {
        await InstallBilingualConsumerVocabulary();
        var id = await SeedQualifiedFood(TestMonday, "onion");
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var before = await _db.WeeklyPlans.AsNoTracking().SingleAsync();
        var recipe = await _db.Recipes.SingleAsync(x => x.Id == id);
        recipe.FoodMappingEvidence = null;
        await _db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidDataException>(() => _service.RecomputeForWeekAsync(TestMonday, default));
        var after = await _db.WeeklyPlans.AsNoTracking().SingleAsync();
        Assert.Equal(before.GroceryItems, after.GroceryItems);
        Assert.Equal(before.GroceryState, after.GroceryState);
        Assert.Equal(before.GroceryCheckedDemandBaselines, after.GroceryCheckedDemandBaselines);
    }

    [Fact]
    public async Task BilingualPresentation_BothLocalesUseCurrentSavedFoodLabelsWithoutPersistingOrChangingShoppingState()
    {
        await InstallBilingualConsumerVocabulary();
        await SeedQualifiedFood(TestMonday, "onion", "25");
        await SeedQualifiedFood(TestMonday.AddDays(1), "oignon", "50");
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var row = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        await _scope.ServiceProvider.GetRequiredService<ScheduleService>().MutateGroceryItemAsync(0,
            new(Guid.Parse(row.RowId), TestMonday, row.RowVersion, true, Guid.NewGuid()), reference: TestMonday);
        var before = await _db.WeeklyPlans.AsNoTracking().SingleAsync();
        var response = await _scope.ServiceProvider.GetRequiredService<ScheduleService>().GetScheduleAsync(0, TestMonday);
        var wire = JsonSerializer.SerializeToElement(response, PackageJson);
        var shown = Assert.Single(wire.GetProperty("groceryItems").EnumerateArray());
        Assert.Equal("Fresh bulb onion", shown.GetProperty("displayLabels").GetProperty("en").GetString());
        Assert.Equal("Oignon frais", shown.GetProperty("displayLabels").GetProperty("fr").GetString());
        Assert.Equal("resolved", shown.GetProperty("labelStatus").GetString());
        Assert.Equal("1", wire.GetProperty("presentationVersion").GetString());
        Assert.NotEqual(Guid.Empty, wire.GetProperty("presentationEpoch").GetGuid());
        Assert.Equal(row.RowId, shown.GetProperty("rowId").GetString());
        var again = await _scope.ServiceProvider.GetRequiredService<ScheduleService>().GetScheduleAsync(0, TestMonday);
        Assert.Equal(JsonSerializer.Serialize(response.GroceryItems, PackageJson), JsonSerializer.Serialize(again.GroceryItems, PackageJson));
        Assert.Equal(wire.GetProperty("presentationVersion").GetString(), JsonSerializer.SerializeToElement(again, PackageJson).GetProperty("presentationVersion").GetString());
        var after = await _db.WeeklyPlans.AsNoTracking().SingleAsync();
        Assert.Equal(before.GroceryItems, after.GroceryItems);
        Assert.Equal(before.GroceryState, after.GroceryState);
        Assert.Equal(before.GroceryCheckedDemandBaselines, after.GroceryCheckedDemandBaselines);
        Assert.Equal(before.GroceryListVersion, after.GroceryListVersion);
        Assert.DoesNotContain("displayLabels", after.GroceryItems, StringComparison.Ordinal);
    }

    [Fact]
    public async Task BilingualPresentation_ConflictingManualAliasCategoriesRemainVisibleWithoutChoosingSourceOrder()
    {
        await InstallBilingualConsumerVocabulary();
        await SeedQualifiedFood(TestMonday, "onion");
        await SeedQualifiedFood(TestMonday.AddDays(1), "oignon");
        _db.IngredientCategories.AddRange(new IngredientCategory { NormalizedKey = "onion", GrocerySection = "Pantry", Source = "manual" },
            new IngredientCategory { NormalizedKey = "oignon", GrocerySection = "Produce", Source = "manual" });
        await _db.SaveChangesAsync();
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var response = await _scope.ServiceProvider.GetRequiredService<ScheduleService>().GetScheduleAsync(0, TestMonday);
        var shown = Assert.Single(JsonSerializer.SerializeToElement(response, PackageJson).GetProperty("groceryItems").EnumerateArray());
        Assert.Equal("food", shown.GetProperty("categoryScope").GetString());
        Assert.Equal("conflict", shown.GetProperty("categoryStatus").GetString());
        Assert.Equal(2, shown.GetProperty("categoryChoices").GetArrayLength());
        Assert.Equal("Grocery", shown.GetProperty("section").GetString());
        Assert.Equal(LegacyGroceryQuantity.Parse("2"), response.GroceryItems![0].ExactQuantity);
    }


    [Fact]
    public async Task BilingualFoodCategory_OrdinaryHttpCorrectionUsesRevisionAndLeavesFallbackChoicesPrivate()
    {
        await InstallBilingualConsumerVocabulary();
        await SeedQualifiedFood(TestMonday, "onion");
        await SeedQualifiedFood(TestMonday.AddDays(1), "oignon");
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var original = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        await _scope.ServiceProvider.GetRequiredService<ScheduleService>().MutateGroceryItemAsync(0,
            new(Guid.Parse(original.RowId), TestMonday, original.RowVersion, true, Guid.NewGuid()), reference: TestMonday);
        var checkedBefore = await _db.WeeklyPlans.AsNoTracking().SingleAsync();
        using var client = _factory.CreateClient();
        using var initial = await client.SendAsync(new HttpRequestMessage(HttpMethod.Patch, $"/api/foods/{OnionFood}/category")
            { Content = System.Net.Http.Json.JsonContent.Create(new { grocerySection = "Pantry", expectedCategoryRevision = (string?)null }) });
        Assert.Equal(System.Net.HttpStatusCode.NoContent, initial.StatusCode);
        var response = await _scope.ServiceProvider.GetRequiredService<ScheduleService>().GetScheduleAsync(0, TestMonday);
        var row = Assert.Single(JsonSerializer.SerializeToElement(response, PackageJson).GetProperty("groceryItems").EnumerateArray());
        Assert.Equal("Pantry", row.GetProperty("section").GetString());
        var revision = row.GetProperty("categoryRevision").GetString();
        Assert.False(string.IsNullOrWhiteSpace(revision));
        using var stale = await client.SendAsync(new HttpRequestMessage(HttpMethod.Patch, $"/api/foods/{OnionFood}/category")
            { Content = System.Net.Http.Json.JsonContent.Create(new { grocerySection = "Produce", expectedCategoryRevision = (string?)null }) });
        Assert.Equal(System.Net.HttpStatusCode.Conflict, stale.StatusCode);
        using var missing = await client.SendAsync(new HttpRequestMessage(HttpMethod.Patch, $"/api/foods/{OnionFood}/category")
            { Content = System.Net.Http.Json.JsonContent.Create(new { grocerySection = "Produce" }) });
        Assert.Equal(System.Net.HttpStatusCode.Conflict, missing.StatusCode);
        using var latest = await client.SendAsync(new HttpRequestMessage(HttpMethod.Patch, $"/api/foods/{OnionFood}/category")
            { Content = System.Net.Http.Json.JsonContent.Create(new { grocerySection = "Deli", expectedCategoryRevision = revision }) });
        Assert.Equal(System.Net.HttpStatusCode.NoContent, latest.StatusCode);
        Assert.Empty(await _db.IngredientCategories.ToArrayAsync());
        Assert.Empty(await _db.GroceryExtraOccurrences.ToArrayAsync());
        var final = await _db.WeeklyPlans.AsNoTracking().SingleAsync();
        Assert.Equal(checkedBefore.GroceryState, final.GroceryState);
        Assert.Equal(checkedBefore.GroceryCheckedDemandBaselines, final.GroceryCheckedDemandBaselines);
        Assert.Equal(original.RowId, Assert.Single(JsonSerializer.Deserialize<List<GroceryLineItemDto>>(final.GroceryItems)!).RowId);
        var feed = await _scope.ServiceProvider.GetRequiredService<HouseholdFoodOverrideStore>().ReadRecoveryFeedAsync(Guid.Parse("390d96cb-9c9b-462d-a7fe-54fcb5724425"));
        var correction = Assert.Single(feed.Overrides);
        Assert.Equal(OnionFood, correction.FoodId);
        Assert.Equal("Deli", correction.GrocerySection);
        Assert.NotNull(correction.Document);
        Assert.Equal("2", correction.PresentationSequence);
        Assert.NotEqual(revision, correction.Revision);
        Assert.Equal(new[] { "grocerySection" }, correction.ProtectedFields);
        Assert.Equal("3", (await _scope.ServiceProvider.GetRequiredService<FoodVocabularyStore>().CapturePresentationAsync([])).Version);
    }

    [Fact]
    public async Task BilingualSavedIdentity_Mapped400PackageClearKeepsUntouchedChecked800ExactBaselineThroughOrdinarySave()
    {
        await InstallBilingualConsumerVocabulary();
        var smallId = await SeedQualifiedFood(TestMonday, "canned tomatoes", "3", "cans", DeclaredPackage());
        var largeId = await SeedQualifiedFood(TestMonday.AddDays(1), "canned tomatoes", "2", "cans", DeclaredPackage("800"));
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var rows = await GetGroceryItemsAsync(TestMonday);
        var small = Assert.Single(rows, row => row.RecipeIds.Contains(smallId));
        var large = Assert.Single(rows, row => row.RecipeIds.Contains(largeId));
        Assert.Equal(CannedTomatoFood, small.FoodId);
        Assert.Equal(CannedTomatoFood, large.FoodId);
        foreach (var row in rows) await _scope.ServiceProvider.GetRequiredService<ScheduleService>().MutateGroceryItemAsync(0,
            new(Guid.Parse(row.RowId), TestMonday, row.RowVersion, true, Guid.NewGuid()), reference: TestMonday);
        var before = await _db.WeeklyPlans.AsNoTracking().SingleAsync();
        var baseline = JsonDocument.Parse(before.GroceryCheckedDemandBaselines).RootElement.GetProperty(large.RowId).GetRawText();
        var recipe = await _db.Recipes.AsNoTracking().SingleAsync(x => x.Id == smallId);
        var current = CanonicalRecipeContentStore.Read(recipe)!;
        var line = current.IngredientLines[0];
        await _scope.ServiceProvider.GetRequiredService<CanonicalRecipeContentStore>().EditAsync(smallId, current.SourceRevision, Guid.NewGuid(), new()
        {
            ExpectedContentRevision = current.ContentRevision,
            IngredientLines = JsonSerializer.SerializeToElement(new[] { new { id = line.Id, description = line.Description, amount = line.Amount,
                amountText = line.AmountText, unit = line.Unit, scaling = line.Scaling, package = (RecipePackageDto?)null, shopping = line.Shopping } }, PackageJson)
        });
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var after = await _db.WeeklyPlans.AsNoTracking().SingleAsync();
        var nextRows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(after.GroceryItems)!;
        var nextLarge = Assert.Single(nextRows, row => row.RecipeIds.Contains(largeId));
        var nextSmall = Assert.Single(nextRows, row => row.RecipeIds.Contains(smallId));
        Assert.Equal(large.RowId, nextLarge.RowId);
        Assert.Equal(large.DemandIdentity, nextLarge.DemandIdentity);
        Assert.True(JsonDocument.Parse(after.GroceryState).RootElement.GetProperty(large.RowId).GetBoolean());
        Assert.Equal(baseline, JsonDocument.Parse(after.GroceryCheckedDemandBaselines).RootElement.GetProperty(large.RowId).GetRawText());
        Assert.NotEqual(small.RowId, nextSmall.RowId);
        Assert.False(JsonDocument.Parse(after.GroceryState).RootElement.GetProperty(nextSmall.RowId).GetBoolean());
        Assert.False(JsonDocument.Parse(after.GroceryCheckedDemandBaselines).RootElement.TryGetProperty(small.RowId, out _));
    }

    [Fact]
    public async Task BilingualPresentation_PrivateSavedNameKeepsMappedCheckAndExposesAllContributorVariants()
    {
        await InstallBilingualConsumerVocabulary();
        var id = await SeedQualifiedFood(TestMonday, "onion");
        await SeedQualifiedFood(TestMonday.AddDays(1), "oignon");
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var before = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        await _scope.ServiceProvider.GetRequiredService<ScheduleService>().MutateGroceryItemAsync(0,
            new(Guid.Parse(before.RowId), TestMonday, before.RowVersion, true, Guid.NewGuid()), reference: TestMonday);
        var recipe = await _db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        var content = CanonicalRecipeContentStore.Read(recipe)!;
        var line = content.IngredientLines[0];
        await _scope.ServiceProvider.GetRequiredService<CanonicalRecipeContentStore>().EditAsync(id, content.SourceRevision, Guid.NewGuid(), new()
        {
            ExpectedContentRevision = content.ContentRevision,
            IngredientLines = JsonSerializer.SerializeToElement(new[] { new { id = line.Id, description = line.Description, amount = line.Amount,
                amountText = line.AmountText, unit = line.Unit, scaling = line.Scaling, package = line.Package,
                shopping = new RecipeShoppingAssociationDto("onion, diced", line.Shopping.FoodId, line.Shopping.MappingRevision) } }, PackageJson)
        });
        var pending = await _scope.ServiceProvider.GetRequiredService<ScheduleService>().GetScheduleAsync(0, TestMonday);
        Assert.Equal("fallback", Assert.Single(pending.GroceryItems!).Presentation!.LabelStatus);
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var shown = Assert.Single((await _scope.ServiceProvider.GetRequiredService<ScheduleService>().GetScheduleAsync(0, TestMonday)).GroceryItems!);
        Assert.Equal(before.RowId, shown.RowId);
        Assert.Equal("conflict", shown.Presentation!.LabelStatus);
        Assert.Contains(shown.Presentation.DisplayNameVariants.En, variant => variant.Text == "onion, diced");
        Assert.Contains(shown.Presentation.DisplayNameVariants.Fr, variant => variant.Text == "onion, diced");
        Assert.Equal(2, shown.Presentation.DisplayNameVariants.En.Sum(variant => variant.Contributors.Count));
        var plan = await _db.WeeklyPlans.AsNoTracking().SingleAsync();
        Assert.True(JsonDocument.Parse(plan.GroceryState).RootElement.GetProperty(before.RowId).GetBoolean());
    }

    [Fact]
    public async Task BilingualSavedIdentity_OrdinaryMappingClearEnlistsFutureDemandRefreshWithoutNameOrQuantityChange()
    {
        await InstallBilingualConsumerVocabulary();
        var future = DeploymentCalendar.Monday(DateOnly.FromDateTime(DateTime.UtcNow)).AddDays(14);
        var id = await SeedQualifiedFood(future, "onion");
        await _service.RecomputeForWeekAsync(future, default);
        var before = await _db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == future);
        var recipe = await _db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        var current = CanonicalRecipeContentStore.Read(recipe)!;
        var line = current.IngredientLines[0];
        var saved = await _scope.ServiceProvider.GetRequiredService<CanonicalRecipeContentStore>().EditAsync(id, current.SourceRevision, Guid.NewGuid(), new()
        {
            ExpectedContentRevision = current.ContentRevision,
            IngredientLines = JsonSerializer.SerializeToElement(new[] { new { id = line.Id, description = line.Description, amount = line.Amount,
                amountText = line.AmountText, unit = line.Unit, scaling = line.Scaling, package = line.Package,
                shopping = new RecipeShoppingAssociationDto(line.Shopping.Name, null, null) } }, PackageJson)
        });
        Assert.Null(saved.Content.IngredientLines[0].Shopping.FoodId);
        var after = await _db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == future);
        Assert.NotEqual(before.ServingInputVersion, after.ServingInputVersion);
        Assert.Equal("updating", after.ServingRefreshStatus);
        Assert.NotNull(after.ServingRefreshWorkflowId);
        Assert.Equal(before.GroceryItems, after.GroceryItems); // old demand remains until the owned refresh runs.
    }

    [Fact]
    public async Task BilingualPresentation_LabelOnlyReleaseAndStoredMutationReplayUseCurrentLabelsWithoutTouchingDemand()
    {
        await InstallBilingualConsumerVocabulary();
        await SeedQualifiedFood(TestMonday, "onion");
        await SeedQualifiedFood(TestMonday.AddDays(1), "oignon");
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var row = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        var mutationId = Guid.NewGuid();
        var request = new GroceryItemMutationDto(Guid.Parse(row.RowId), TestMonday, row.RowVersion, true, mutationId);
        var checkedResponse = await _scope.ServiceProvider.GetRequiredService<ScheduleService>().MutateGroceryItemAsync(0, request, reference: TestMonday);
        var before = await _db.WeeklyPlans.AsNoTracking().SingleAsync();
        var savedOutcome = await _db.GroceryMutationOutcomes.AsNoTracking().SingleAsync(x => x.Id == mutationId);
        Assert.DoesNotContain("displayLabels", savedOutcome.Outcome, StringComparison.Ordinal);
        Assert.DoesNotContain("presentationVersion", savedOutcome.Outcome, StringComparison.Ordinal);
        var store = _scope.ServiceProvider.GetRequiredService<FoodVocabularyStore>();
        var active = (await store.CaptureActiveAsync())!;
        var document = System.Text.Json.Nodes.JsonNode.Parse(active.RawBytes)!;
        document["revision"] = "fixture-labels-v2";
        var release = document["releases"]![0]!.DeepClone();
        release["revision"] = "fixture-labels-v2";
        foreach (var food in release["foods"]!.AsArray()) food!["revision"] = food["revision"]!.GetValue<string>() + "-labels-v2";
        release["foods"]![0]!["labels"]!["en"] = "Fresh onion";
        release["foods"]![0]!["labels"]!["fr"] = "Oignon bulbe frais";
        document["releases"]!.AsArray().Add(release);
        await store.PublishReviewedAsync(System.Text.Encoding.UTF8.GetBytes(document.ToJsonString()), active.Reference, Guid.NewGuid(), "test-review:labels-only");
        var replay = await _scope.ServiceProvider.GetRequiredService<ScheduleService>().MutateGroceryItemAsync(0, request, reference: TestMonday);
        var shown = Assert.Single(replay.Rows);
        Assert.Equal("Fresh onion", shown.Presentation!.DisplayLabels.En);
        Assert.Equal("Oignon bulbe frais", shown.Presentation.DisplayLabels.Fr);
        Assert.Equal("2", replay.PresentationVersion);
        Assert.NotEqual(checkedResponse.PresentationEpoch, replay.PresentationEpoch);
        Assert.Equal(row.RowId, shown.RowId);
        Assert.Equal(checkedResponse.RowVersion, replay.RowVersion);
        Assert.Equal(checkedResponse.ListVersion, replay.ListVersion);
        var after = await _db.WeeklyPlans.AsNoTracking().SingleAsync();
        Assert.Equal(before.GroceryItems, after.GroceryItems);
        Assert.Equal(before.GroceryState, after.GroceryState);
        Assert.Equal(before.GroceryCheckedDemandBaselines, after.GroceryCheckedDemandBaselines);
        Assert.Equal(before.ServingInputVersion, after.ServingInputVersion);
        Assert.Equal(savedOutcome.Outcome, (await _db.GroceryMutationOutcomes.AsNoTracking().SingleAsync(x => x.Id == mutationId)).Outcome);
    }

    [Fact]
    public void BilingualSavedIdentity_MalformedPersistedFoodIdCannotSilentlyBecomeFallback()
    {
        var wire = System.Text.Json.Nodes.JsonNode.Parse(JsonSerializer.Serialize(new GroceryLineItemDto("onion", "onion", "Produce", 1, "g", [])
        { FoodId = OnionFood }, PackageJson))!;
        wire["foodId"] = "invalid-food-id";
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<GroceryLineItemDto>(wire.ToJsonString(), PackageJson));
    }

    [Fact]
    public async Task BilingualPresentation_ExplicitMappingClearKeepsPrivateNameAheadOfHouseholdFallbackName()
    {
        await InstallBilingualConsumerVocabulary();
        var id = await SeedQualifiedFood(TestMonday, "onion");
        async Task<CanonicalRecipeContent> EditShopping(string name, bool clear)
        {
            var recipe = await _db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            var current = CanonicalRecipeContentStore.Read(recipe)!;
            var line = current.IngredientLines[0];
            return (await _scope.ServiceProvider.GetRequiredService<CanonicalRecipeContentStore>().EditAsync(id, current.SourceRevision, Guid.NewGuid(), new()
            { ExpectedContentRevision = current.ContentRevision, IngredientLines = JsonSerializer.SerializeToElement(new[] { new
                { id = line.Id, description = line.Description, amount = line.Amount, amountText = line.AmountText, unit = line.Unit, scaling = line.Scaling, package = line.Package,
                    shopping = new RecipeShoppingAssociationDto(name, clear ? null : line.Shopping.FoodId, clear ? null : line.Shopping.MappingRevision) } }, PackageJson) })).Content;
        }
        await EditShopping("onion, diced", false);
        await EditShopping("onion, diced", true);
        _db.HouseholdFoodOverrides.Add(new HouseholdFoodOverride
        { Id = Guid.NewGuid(), Revision = "opaque-fallback-override", FallbackKey = IngredientNormalizer.Normalize("onion, diced"), ShoppingName = "Household default",
            ProtectedFields = ["shoppingName"], PresentationSequence = "1", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });
        await _db.SaveChangesAsync();
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var row = Assert.Single((await _scope.ServiceProvider.GetRequiredService<ScheduleService>().GetScheduleAsync(0, TestMonday)).GroceryItems!);
        Assert.Null(row.FoodId);
        Assert.Equal("onion, diced", row.Presentation!.DisplayLabels.En);
        Assert.Equal("onion, diced", row.Presentation.DisplayLabels.Fr);
    }

    [Fact]
    public async Task BilingualPresentation_ActualSseSerializerEmitsContractedLowercaseLabelsVariantsAndContributors()
    {
        await InstallBilingualConsumerVocabulary();
        await SeedQualifiedFood(TestMonday, "onion");
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var row = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        var manager = _scope.ServiceProvider.GetRequiredService<RecipeApi.Infrastructure.SseConnectionManager>();
        var context = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        using var bytes = new MemoryStream(); context.Response.Body = bytes;
        var connection = manager.AddConnection(context.Response);
        try
        {
            await _scope.ServiceProvider.GetRequiredService<RecipeApi.Infrastructure.IScheduleEventPublisher>().PublishGroceryRowsUpdatedAsync(0,
                new(DateTimeOffset.UtcNow, TestMonday, "1", [], [row]));
            var raw = System.Text.Encoding.UTF8.GetString(bytes.ToArray());
            var data = raw.Split('\n').Single(line => line.StartsWith("data: ", StringComparison.Ordinal))[6..];
            var payload = JsonDocument.Parse(data).RootElement;
            var shown = payload.GetProperty("groceryItems")[0];
            Assert.Equal("Fresh bulb onion", shown.GetProperty("displayLabels").GetProperty("en").GetString());
            Assert.Equal("Oignon frais", shown.GetProperty("displayLabels").GetProperty("fr").GetString());
            Assert.True(shown.GetProperty("displayNameVariants").GetProperty("en")[0].GetProperty("contributors")[0].TryGetProperty("ingredientLineId", out _));
            Assert.Equal("1", payload.GetProperty("presentationVersion").GetString());
        }
        finally { manager.RemoveConnection(connection); }
    }

    [Fact]
    public async Task BilingualFoodCategory_SameSectionExplicitCorrectionStillPublishesIndependentPresentationFence()
    {
        await InstallBilingualConsumerVocabulary();
        await SeedQualifiedFood(TestMonday, "onion");
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var row = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        var manager = _scope.ServiceProvider.GetRequiredService<RecipeApi.Infrastructure.SseConnectionManager>();
        var context = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        using var bytes = new MemoryStream(); context.Response.Body = bytes;
        var connection = manager.AddConnection(context.Response);
        try
        {
            await _scope.ServiceProvider.GetRequiredService<HouseholdFoodOverrideStore>().ReclassifyCategoryAsync(OnionFood, row.Section, null);
            var raw = System.Text.Encoding.UTF8.GetString(bytes.ToArray());
            Assert.Contains("event: grocery_updated", raw, StringComparison.Ordinal);
            var data = raw.Split('\n').Single(line => line.StartsWith("data: ", StringComparison.Ordinal))[6..];
            var payload = JsonDocument.Parse(data).RootElement;
            Assert.Equal("2", payload.GetProperty("presentationVersion").GetString());
            Assert.Equal(row.RowId, payload.GetProperty("groceryItems")[0].GetProperty("rowId").GetString());
        }
        finally { manager.RemoveConnection(connection); }
    }

    [Fact]
    public async Task BilingualFoodCategory_MappedContributorRetainsConflictingCurrentAndLegacyManualKeys()
    {
        await InstallBilingualConsumerVocabulary();
        await SeedQualifiedFood(TestMonday, "onion, diced");
        _db.IngredientCategories.AddRange(new IngredientCategory { NormalizedKey = "onion diced", GrocerySection = "Produce", Source = "manual" },
            new IngredientCategory { NormalizedKey = "onion, diced", GrocerySection = "Pantry", Source = "manual" });
        await _db.SaveChangesAsync();
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var row = Assert.Single((await _scope.ServiceProvider.GetRequiredService<ScheduleService>().GetScheduleAsync(0, TestMonday)).GroceryItems!);
        Assert.Equal("Grocery", row.Section);
        Assert.Equal("conflict", row.Presentation!.CategoryStatus);
        Assert.Equal(2, row.Presentation.CategoryChoices.Count);
    }

}
