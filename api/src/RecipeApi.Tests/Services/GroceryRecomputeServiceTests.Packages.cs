using System.Text.Json;
using Microsoft.EntityFrameworkCore;
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
}
