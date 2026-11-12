using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public partial class GroceryRecomputeServiceTests
{
    private static readonly JsonSerializerOptions PackageJson = new(JsonSerializerDefaults.Web);
    private static RecipePackageDto DeclaredPackage(string capacity = "400", string basis = "net", string countUnit = "cans", string capacityUnit = "g") =>
        new(new(countUnit, null), new(LegacyGroceryQuantity.Parse(capacity)!, new(capacityUnit, null)), basis);

    private async Task<Guid> SeedDeclaredPackage(DateOnly date, RecipePackageDto? package)
    {
        var id = await SeedRecipeWithSupplyAsync(date, [], basis: 4);
        var recipe = await _db.Recipes.SingleAsync(value => value.Id == id);
        var row = new RecipeIngredientLineDto { Id = Guid.NewGuid(), Description = "tomatoes", Amount = LegacyGroceryQuantity.Parse("2"),
            AmountText = "2", Unit = new("cans", null), Scaling = "proportional", Package = package,
            Shopping = new("tomatoes", null, null), Provenance = new("human", "source", ["package"]) };
        recipe.CanonicalContent = JsonSerializer.Serialize(new CanonicalRecipeContent(2, "before", "source", 4, [row], []), PackageJson);
        await _db.SaveChangesAsync();
        return id;
    }

    private async Task ChangeDeclaredPackage(Guid id, RecipePackageDto? package, string count = "2")
    {
        _db.ChangeTracker.Clear();
        var recipe = await _db.Recipes.SingleAsync(value => value.Id == id);
        var content = CanonicalRecipeContentStore.Read(recipe)!;
        recipe.CanonicalContent = JsonSerializer.Serialize(content with { ContentRevision = Guid.NewGuid().ToString(), IngredientLines =
            [content.IngredientLines[0] with { Package = package, Amount = LegacyGroceryQuantity.Parse(count), AmountText = count }] }, PackageJson);
        await _db.SaveChangesAsync();
        await _service.RecomputeForWeekAsync(TestMonday, default);
        _db.ChangeTracker.Clear();
    }

    [Theory]
    [InlineData("capacity")][InlineData("drained")][InlineData("unspecified")][InlineData("unpackaged")]
    [InlineData("countLabel")][InlineData("capacityUnit")]
    public async Task DeclaredPackagesDifferentPurchaseFactsNeverMergeIntoOneCount(string difference)
    {
        var first = DeclaredPackage();
        var second = difference switch { "capacity" => DeclaredPackage("800"), "drained" => DeclaredPackage(basis: "drained"),
            "unspecified" => DeclaredPackage(basis: "unspecified"), "countLabel" => DeclaredPackage(countUnit: "boxes"),
            "capacityUnit" => DeclaredPackage(capacityUnit: "ml"), _ => null };
        await SeedDeclaredPackage(TestMonday, first);
        await SeedDeclaredPackage(TestMonday.AddDays(1), second);
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var rows = await GetGroceryItemsAsync(TestMonday);
        Assert.Equal(2, rows.Count);
        Assert.All(rows, row => Assert.Equal(LegacyGroceryQuantity.Parse("2"), row.ExactQuantity));
        Assert.Equal(2, rows.Select(row => row.DemandIdentity).Distinct().Count());
        Assert.Single(rows.Select(row => row.NormalizedKey).Distinct());
        Assert.Single(rows.Select(row => row.Section).Distinct());
    }

    [Fact]
    public async Task DeclaredPackagesIdenticalFactsMergeExactCountsAndOnlyDecorateFinalDisplayName()
    {
        var package = DeclaredPackage();
        var first = await SeedDeclaredPackage(TestMonday, package);
        var second = await SeedDeclaredPackage(TestMonday.AddDays(1), package);
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var row = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        Assert.Equal(LegacyGroceryQuantity.Parse("4"), row.ExactQuantity);
        Assert.Equal(row.NormalizedKey + " (400 g / cans; net)", row.DisplayName);
        Assert.DoesNotContain("400", row.NormalizedKey);
        Assert.Equal(new[] { first, second }.Order(), row.RecipeIds);
        using var identity = JsonDocument.Parse(row.DemandIdentity);
        Assert.True(JsonElement.DeepEquals(JsonSerializer.SerializeToElement(package, PackageJson), identity.RootElement.GetProperty("package")));
    }

    [Fact]
    public async Task DeclaredPackageCapacityChangeCreatesUncheckedPurchaseWhileCountIncreaseKeepsLineage()
    {
        var id = await SeedDeclaredPackage(TestMonday, DeclaredPackage());
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var before = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        await SetChecksAsync((before.NormalizedKey, true));
        await ChangeDeclaredPackage(id, DeclaredPackage("800"));
        var after = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        Assert.NotEqual(before.RowId, after.RowId);
        Assert.NotEqual(before.DemandIdentity, after.DemandIdentity);
        Assert.False(await IsCheckedAsync(after.NormalizedKey));
        await SetChecksAsync((after.NormalizedKey, true));
        await ChangeDeclaredPackage(id, DeclaredPackage("800"), "3");
        var increased = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        Assert.Equal(after.RowId, increased.RowId);
        Assert.False(await IsCheckedAsync(increased.NormalizedKey));
    }

    [Fact]
    public async Task DeclaredPackageSplitCreatesIndependentUncheckedRowsWithoutCheckInheritance()
    {
        await SeedDeclaredPackage(TestMonday, DeclaredPackage());
        var second = await SeedDeclaredPackage(TestMonday.AddDays(1), DeclaredPackage());
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var before = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        await SetChecksAsync((before.NormalizedKey, true));
        await ChangeDeclaredPackage(second, DeclaredPackage("800"));
        var rows = await GetGroceryItemsAsync(TestMonday);
        Assert.Equal(2, rows.Count);
        Assert.All(rows, row => Assert.NotEqual(before.RowId, row.RowId));
        var plan = await GetWeeklyPlanAsync(TestMonday);
        Assert.All(JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!.Values, value => Assert.False(value));
        Assert.Equal("{}", plan.GroceryCheckedDemandBaselines);
    }

    [Fact]
    public async Task NonpackageIdentityBytesRowIdAndAcknowledgedCheckRemainUnchanged()
    {
        await SeedDeclaredPackage(TestMonday, null);
        await _service.RecomputeForWeekAsync(TestMonday, default);
        var before = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        var expected = JsonSerializer.Serialize(new { fallback = before.NormalizedKey, bucket = "cans" });
        Assert.Equal(expected, before.DemandIdentity);
        using var identity = JsonDocument.Parse(before.DemandIdentity);
        Assert.False(identity.RootElement.TryGetProperty("package", out _));
        await SetChecksAsync((before.NormalizedKey, true));
        var acknowledged = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        var baseline = (await GetWeeklyPlanAsync(TestMonday)).GroceryCheckedDemandBaselines;
        await _service.RecomputeForWeekAsync(TestMonday, default);
        _db.ChangeTracker.Clear();
        var after = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        Assert.Equal(expected, after.DemandIdentity);
        Assert.Equal(before.RowId, after.RowId);
        Assert.Equal(acknowledged.RowVersion, after.RowVersion);
        Assert.True(await IsCheckedAsync(after.NormalizedKey));
        Assert.Equal(baseline, (await GetWeeklyPlanAsync(TestMonday)).GroceryCheckedDemandBaselines);
    }

    private async Task<(Guid Recipe, Guid Selected)> SeedSameOccurrencePackages(RecipePackageDto? selected = null)
    {
        var id = await SeedDeclaredPackage(TestMonday, selected ?? DeclaredPackage());
        var recipe = await _db.Recipes.SingleAsync(row => row.Id == id);
        var content = CanonicalRecipeContentStore.Read(recipe)!;
        var first = content.IngredientLines[0];
        recipe.CanonicalContent = JsonSerializer.Serialize(content with
        {
            IngredientLines = [first, first with { Id = Guid.NewGuid(), Package = DeclaredPackage("800") }]
        }, PackageJson);
        await _db.SaveChangesAsync();
        await _service.RecomputeForWeekAsync(TestMonday, default);
        _db.ChangeTracker.Clear();
        return (id, first.Id);
    }

    private async Task ChangePackageLine(Guid recipeId, Guid lineId, RecipePackageDto? package, string count = "2")
    {
        _db.ChangeTracker.Clear();
        var recipe = await _db.Recipes.SingleAsync(row => row.Id == recipeId);
        var content = CanonicalRecipeContentStore.Read(recipe)!;
        recipe.CanonicalContent = JsonSerializer.Serialize(content with
        {
            ContentRevision = Guid.NewGuid().ToString("N"),
            IngredientLines = content.IngredientLines.Select(row => row.Id == lineId
                ? row with { Package = package, Amount = LegacyGroceryQuantity.Parse(count), AmountText = count } : row).ToArray()
        }, PackageJson);
        await _db.SaveChangesAsync();
        await _service.RecomputeForWeekAsync(TestMonday, default);
        _db.ChangeTracker.Clear();
    }

    private async Task CheckPackageRows()
    {
        foreach (var row in await GetGroceryItemsAsync(TestMonday))
            await _scope.ServiceProvider.GetRequiredService<ScheduleService>().MutateGroceryItemAsync(0,
                new(Guid.Parse(row.RowId), TestMonday, row.RowVersion, true, Guid.NewGuid()), reference: TestMonday);
        _db.ChangeTracker.Clear();
    }

    [Theory]
    [InlineData("clear")][InlineData("capacity")][InlineData("basis")]
    [InlineData("countDefinition")][InlineData("capacityDefinition")]
    public async Task DeclaredPackageMeaningChangeRetiresOnlySelectedSameOccurrencePurchase(string change)
    {
        var original = DeclaredPackage() with
        {
            CountUnit = new("cans", "count:can"),
            Capacity = DeclaredPackage().Capacity with { Unit = new("g", "mass:g") }
        };
        var (recipe, selected) = await SeedSameOccurrencePackages(original);
        await CheckPackageRows();
        var before = await GetGroceryItemsAsync(TestMonday);
        var untouched = before.Single(row => row.DisplayName.Contains("800 g", StringComparison.Ordinal));
        var affected = before.Single(row => row.RowId != untouched.RowId);
        using var baselines = JsonDocument.Parse((await GetWeeklyPlanAsync(TestMonday)).GroceryCheckedDemandBaselines);
        var baseline = baselines.RootElement.GetProperty(untouched.RowId).Clone();
        var next = change switch
        {
            "clear" => null,
            "capacity" => original with { Capacity = original.Capacity with { Amount = LegacyGroceryQuantity.Parse("600")! } },
            "basis" => original with { Basis = "drained" },
            "countDefinition" => original with { CountUnit = original.CountUnit with { DefinitionId = null } },
            _ => original with { Capacity = original.Capacity with { Unit = original.Capacity.Unit with { DefinitionId = null } } }
        };
        await ChangePackageLine(recipe, selected, next);
        var after = await GetGroceryItemsAsync(TestMonday);
        var retained = after.Single(row => row.RowId == untouched.RowId);
        Assert.Equal(untouched.DemandIdentity, retained.DemandIdentity);
        Assert.Equal(untouched.RowVersion, retained.RowVersion);
        Assert.Equal(untouched.ExactQuantity, retained.ExactQuantity);
        var plan = await GetWeeklyPlanAsync(TestMonday);
        var checks = JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!;
        Assert.True(checks[retained.RowId]);
        var replacement = after.Single(row => row.RowId != retained.RowId);
        Assert.NotEqual(affected.RowId, replacement.RowId);
        Assert.NotEqual(affected.DemandIdentity, replacement.DemandIdentity);
        Assert.False(checks[replacement.RowId]);
        Assert.DoesNotContain(affected.RowId, checks.Keys);
        using var nextBaselines = JsonDocument.Parse(plan.GroceryCheckedDemandBaselines);
        Assert.True(JsonElement.DeepEquals(baseline, nextBaselines.RootElement.GetProperty(retained.RowId)));
        Assert.False(nextBaselines.RootElement.TryGetProperty(replacement.RowId, out _));
        Assert.False(nextBaselines.RootElement.TryGetProperty(affected.RowId, out _));
    }

    [Fact]
    public async Task DeclaredPackageMergeRetiresBothCheckedPredecessorsAndTheirBaselines()
    {
        var (recipe, selected) = await SeedSameOccurrencePackages();
        await CheckPackageRows();
        var before = await GetGroceryItemsAsync(TestMonday);
        await ChangePackageLine(recipe, selected, DeclaredPackage("800"));
        var merged = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        Assert.DoesNotContain(merged.RowId, before.Select(row => row.RowId));
        Assert.Equal(LegacyGroceryQuantity.Parse("4"), merged.ExactQuantity);
        var plan = await GetWeeklyPlanAsync(TestMonday);
        Assert.False(JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)![merged.RowId]);
        Assert.Equal("{}", plan.GroceryCheckedDemandBaselines);
    }

    [Fact]
    public async Task DeclaredPackageCountIncreaseKeepsOnlyItsLineageAndPreservesOtherPackageBaseline()
    {
        var (recipe, selected) = await SeedSameOccurrencePackages();
        await CheckPackageRows();
        var before = await GetGroceryItemsAsync(TestMonday);
        var small = before.Single(row => row.DisplayName.Contains("400 g", StringComparison.Ordinal));
        var large = before.Single(row => row.RowId != small.RowId);
        using var baselines = JsonDocument.Parse((await GetWeeklyPlanAsync(TestMonday)).GroceryCheckedDemandBaselines);
        var baseline = baselines.RootElement.GetProperty(large.RowId).Clone();
        await ChangePackageLine(recipe, selected, DeclaredPackage(), "3");
        var after = await GetGroceryItemsAsync(TestMonday);
        Assert.Equal(LegacyGroceryQuantity.Parse("3"), after.Single(row => row.RowId == small.RowId).ExactQuantity);
        Assert.True(JsonElement.DeepEquals(JsonSerializer.SerializeToElement(large),
            JsonSerializer.SerializeToElement(after.Single(row => row.RowId == large.RowId))));
        var plan = await GetWeeklyPlanAsync(TestMonday);
        var checks = JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!;
        Assert.False(checks[small.RowId]);
        Assert.True(checks[large.RowId]);
        using var nextBaselines = JsonDocument.Parse(plan.GroceryCheckedDemandBaselines);
        Assert.True(JsonElement.DeepEquals(baseline, nextBaselines.RootElement.GetProperty(large.RowId)));
    }

    [Theory]
    [InlineData("missingContributors")][InlineData("invalidPurchase")][InlineData("duplicateContributors")]
    [InlineData("malformedIdentity")][InlineData("unknownIdentity")][InlineData("malformedPackage")][InlineData("incompletePackage")]
    public async Task DeclaredPackageUnprovenPredecessorRetainsConservativeLegacyEdges(string evidence)
    {
        var (recipe, selected) = await SeedSameOccurrencePackages();
        await CheckPackageRows();
        var large = (await GetGroceryItemsAsync(TestMonday)).Single(row => row.DisplayName.Contains("800 g", StringComparison.Ordinal));
        var plan = await GetWeeklyPlanAsync(TestMonday);
        if (evidence.EndsWith("Identity", StringComparison.Ordinal) || (evidence == "malformedPackage" || evidence == "incompletePackage"))
        {
            var rows = JsonNode.Parse(plan.GroceryItems)!.AsArray();
            rows.Single(row => row!["rowId"]!.GetValue<string>() == large.RowId)!["demandIdentity"] = evidence switch
            {
                "malformedIdentity" => "not-json",
                "unknownIdentity" => "{}",
                "malformedPackage" => "{\"fallback\":\"tomato\",\"bucket\":\"cans\",\"package\":[]}",
                _ => "{\"fallback\":\"tomato\",\"bucket\":\"cans\",\"package\":{\"countUnit\":{},\"capacity\":{},\"basis\":\"net\"}}"
            };
            plan.GroceryItems = rows.ToJsonString();
        }
        else
        {
            var entries = JsonNode.Parse(plan.GroceryDemandEvidence)!;
            var prior = entries[large.RowId]!.AsObject();
            if (evidence == "missingContributors") prior.Remove("Contributors");
            else if (evidence == "invalidPurchase") prior["Contributors"]![0]!["PurchaseIdentity"] = "unproven";
            else prior["Contributors"]!.AsArray().Add(prior["Contributors"]![0]!.DeepClone());
            plan.GroceryDemandEvidence = entries.ToJsonString();
        }
        await _db.SaveChangesAsync();
        await ChangePackageLine(recipe, selected, null);
        var after = await GetGroceryItemsAsync(TestMonday);
        Assert.DoesNotContain(large.RowId, after.Select(row => row.RowId));
        var current = after.Single(row => row.DisplayName.Contains("800 g", StringComparison.Ordinal));
        var saved = await GetWeeklyPlanAsync(TestMonday);
        Assert.False(JsonSerializer.Deserialize<Dictionary<string, bool>>(saved.GroceryState)![current.RowId]);
        using var baselines = JsonDocument.Parse(saved.GroceryCheckedDemandBaselines);
        Assert.False(baselines.RootElement.TryGetProperty(current.RowId, out _));
    }

    [Theory]
    [InlineData("emptyAmount")][InlineData("unknownAmountKind")][InlineData("unsupportedBasis")]
    public async Task DeclaredPackageUnknownCapacityOrBasisCannotPreserveMalformedPredecessorCheck(string shape)
    {
        var (recipe, selected) = await SeedSameOccurrencePackages();
        await CheckPackageRows();
        var large = (await GetGroceryItemsAsync(TestMonday)).Single(row => row.DisplayName.Contains("800 g", StringComparison.Ordinal));
        var plan = await GetWeeklyPlanAsync(TestMonday);
        var evidenceBefore = plan.GroceryDemandEvidence;
        var rows = JsonNode.Parse(plan.GroceryItems)!.AsArray();
        var persisted = rows.Single(row => row!["rowId"]!.GetValue<string>() == large.RowId)!;
        var identity = JsonNode.Parse(large.DemandIdentity)!;
        if (shape == "unsupportedBasis") identity["package"]!["basis"] = "unknown-basis";
        else identity["package"]!["capacity"]!["amount"] = shape == "emptyAmount"
            ? new JsonObject() : new JsonObject { ["kind"] = "unknown", ["value"] = new JsonObject { ["n"] = "800", ["d"] = "1" } };
        persisted["demandIdentity"] = identity.ToJsonString();
        plan.GroceryItems = rows.ToJsonString();
        await _db.SaveChangesAsync();
        Assert.Equal(evidenceBefore, plan.GroceryDemandEvidence); // Retain valid saved contributors; corrupt only old purchase identity.
        Assert.True(JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)![large.RowId]);
        using (var baseline = JsonDocument.Parse(plan.GroceryCheckedDemandBaselines))
            Assert.True(baseline.RootElement.TryGetProperty(large.RowId, out _));

        await ChangePackageLine(recipe, selected, null);
        var after = await GetGroceryItemsAsync(TestMonday);
        var current = after.Single(row => row.DisplayName.Contains("800 g", StringComparison.Ordinal));
        var saved = await GetWeeklyPlanAsync(TestMonday);
        var checkedNow = JsonSerializer.Deserialize<Dictionary<string, bool>>(saved.GroceryState)![current.RowId];
        using var baselines = JsonDocument.Parse(saved.GroceryCheckedDemandBaselines);
        var hasBaseline = baselines.RootElement.TryGetProperty(current.RowId, out _);
        Assert.False(current.RowId == large.RowId,
            $"Unknown {shape} retained predecessor {large.RowId}; checked={checkedNow}; baseline={hasBaseline}");
        Assert.False(checkedNow);
        Assert.False(hasBaseline);
        Assert.False(baselines.RootElement.TryGetProperty(large.RowId, out _));
    }
}
