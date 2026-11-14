using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Dto;
using Xunit;

namespace RecipeApi.Tests.Services;

public partial class GroceryRecomputeServiceTests
{
    [Fact]
    public async Task ContributorContinuity_IncompatibleLegacyUnitCannotInventSavedIngredientLineage()
    {
        var recipe = await SeedRecipeWithSupplyAsync(TestMonday, []);
        await SetRangeAsync(recipe, "2", "g");
        await SetChecksAsync(("pasta", true));
        var before = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        await SetRangeAsync(recipe, "3", "cup");
        Assert.NotEqual(before.RowId, Assert.Single(await GetGroceryItemsAsync(TestMonday)).RowId);
        Assert.False(await IsCheckedAsync("pasta"));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ContributorContinuity_ActualSplitOrMergeCreatesUncheckedRowsEvenWhenOneBucketMatches(bool split)
    {
        var first = await SeedRecipeWithSupplyAsync(TestMonday, []);
        var second = await SeedRecipeWithSupplyAsync(TestMonday.AddDays(1), []);
        await SetRangeAsync(first, "2", "g");
        await SetRangeAsync(second, "3", split ? "g" : "cup");
        var before = await GetGroceryItemsAsync(TestMonday);
        foreach (var row in before)
        {
            await _scope.ServiceProvider.GetRequiredService<RecipeApi.Services.ScheduleService>().MutateGroceryItemAsync(0,
                new(Guid.Parse(row.RowId), TestMonday, row.RowVersion, true, Guid.NewGuid()), reference: TestMonday);
        }
        await SetRangeAsync(second, "3", split ? "cup" : "g");
        var after = await GetGroceryItemsAsync(TestMonday);
        Assert.Equal(split ? 2 : 1, after.Count);
        Assert.All(after, row => Assert.DoesNotContain(before, prior => prior.RowId == row.RowId));
        var plan = await GetWeeklyPlanAsync(TestMonday);
        Assert.All(JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!.Values, value => Assert.False(value));
        Assert.Equal("{}", plan.GroceryCheckedDemandBaselines);
        await _service.RecomputeForWeekAsync(TestMonday, default);
        _db.ChangeTracker.Clear();
        Assert.Equal(after.Select(x => x.RowId), (await GetGroceryItemsAsync(TestMonday)).Select(x => x.RowId));
    }

    [Fact]
    public async Task ContributorContinuity_NewOccurrenceCannotInheritRemovedOccurrencesCheck()
    {
        var recipe = await SeedRecipeWithSupplyAsync(TestMonday, []);
        await SetRangeAsync(recipe, "2", "g");
        await SetChecksAsync(("pasta", true));
        var before = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        var occurrence = await _db.CalendarEvents.SingleAsync();
        _db.CalendarEvents.Remove(occurrence);
        _db.CalendarEvents.Add(new() { Id = Guid.NewGuid(), Date = TestMonday, RecipeId = recipe });
        await _db.SaveChangesAsync();
        await SetRangeAsync(recipe, "2", "cup");
        var after = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        Assert.NotEqual(before.RowId, after.RowId);
        Assert.False(await IsCheckedAsync("pasta"));
    }

    [Fact]
    public async Task ContributorContinuity_MissingEvidenceCannotBeInventedFromRecipeIds()
    {
        var recipe = await SeedRecipeWithSupplyAsync(TestMonday, []);
        await SetRangeAsync(recipe, "2", "g");
        await SetChecksAsync(("pasta", true));
        var before = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        // A current-format row can predate contributor evidence. RecipeIds are
        // disclosure, not proof of which saved ingredient/occurrence continued.
        var plan = await GetWeeklyPlanAsync(TestMonday);
        plan.GroceryDemandEvidence = "{}";
        await _db.SaveChangesAsync();
        await SetRangeAsync(recipe, "2", "cup");
        Assert.NotEqual(before.RowId, Assert.Single(await GetGroceryItemsAsync(TestMonday)).RowId);
        Assert.False(await IsCheckedAsync("pasta"));
    }
}
