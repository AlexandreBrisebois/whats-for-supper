using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public partial class GroceryRecomputeServiceTests
{
    [Fact]
    public async Task OrdinaryRecoveryRows_PreserveValidatedProtectedClearWithoutInventingHouseholdIdentity()
    {
        var at = DateTimeOffset.Parse("2026-11-13T16:00:00Z");
        var id = Guid.NewGuid();
        _db.HouseholdFoodOverrides.Add(new HouseholdFoodOverride { Id = id, Revision = "retained.opaque-revision",
            FallbackKey = "onion", ShoppingName = null, GrocerySection = "Pantry",
            ProtectedFields = ["shoppingName", "grocerySection"], PresentationSequence = "9007199254740993", CreatedAt = at, UpdatedAt = at });
        await _db.SaveChangesAsync();
        var before = await _db.HouseholdFoodOverrides.AsNoTracking().SingleAsync();
        var store = _scope.ServiceProvider.GetRequiredService<HouseholdFoodOverrideStore>();
        var rows = await store.ReadRecoveryRowsAsync();
        var row = Assert.Single(rows);
        Assert.Equal(id, row.Id);
        Assert.Equal("retained.opaque-revision", row.Revision);
        Assert.Equal("9007199254740993", row.PresentationSequence);
        Assert.Null(row.ShoppingName);
        Assert.Equal(before.ProtectedFields, row.ProtectedFields);
        Assert.Null(row.Document);
        Assert.Empty(await _db.FamilySettings.AsNoTracking().ToArrayAsync());
        Assert.Equal(before.Revision, (await _db.HouseholdFoodOverrides.AsNoTracking().SingleAsync()).Revision);
        var household = Guid.NewGuid();
        var archiveFeed = await store.ReadRecoveryFeedAsync(household);
        Assert.Equal(household, archiveFeed.HouseholdId);
        Assert.Equal(System.Text.Json.JsonSerializer.Serialize(rows), System.Text.Json.JsonSerializer.Serialize(archiveFeed.Overrides));
        await Assert.ThrowsAsync<InvalidDataException>(() => store.ReadRecoveryFeedAsync(Guid.Empty));
    }

    [Fact]
    public async Task OrdinaryRecoveryRows_RejectMalformedLiveOverrideThroughSameValidatedSnapshotOwner()
    {
        var at = DateTimeOffset.Parse("2026-11-13T16:00:00Z");
        _db.HouseholdFoodOverrides.Add(new HouseholdFoodOverride { Id = Guid.NewGuid(), Revision = "opaque",
            FallbackKey = "onion", ProtectedFields = ["shoppingName"], PresentationSequence = "01", CreatedAt = at, UpdatedAt = at });
        await _db.SaveChangesAsync();
        var store = _scope.ServiceProvider.GetRequiredService<HouseholdFoodOverrideStore>();
        await Assert.ThrowsAsync<InvalidDataException>(() => store.ReadRecoveryRowsAsync());
        Assert.Equal("01", (await _db.HouseholdFoodOverrides.AsNoTracking().SingleAsync()).PresentationSequence);
        Assert.Empty(await _db.FamilySettings.AsNoTracking().ToArrayAsync());
    }
}
