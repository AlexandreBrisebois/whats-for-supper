using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Dto;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public partial class GroceryRecomputeServiceTests
{
    private async Task SetChecksAsync(params (string Name, bool Checked)[] intents)
    {
        foreach (var (name, value) in intents)
        {
            _db.ChangeTracker.Clear();
            var row = (await GetGroceryItemsAsync(TestMonday)).Single(row => row.NormalizedKey == name);
            await _scope.ServiceProvider.GetRequiredService<ScheduleService>().MutateGroceryItemAsync(0,
                new(Guid.Parse(row.RowId), TestMonday, row.RowVersion, value, Guid.NewGuid()), reference: TestMonday);
        }
        _db.ChangeTracker.Clear();
    }

    private async Task<bool> IsCheckedAsync(string name)
    {
        _db.ChangeTracker.Clear();
        var row = (await GetGroceryItemsAsync(TestMonday)).Single(row => row.NormalizedKey == name);
        return JsonSerializer.Deserialize<Dictionary<string, bool>>((await GetWeeklyPlanAsync(TestMonday)).GroceryState)![row.RowId];
    }

    private async Task SetRangeAsync(Guid recipeId, string? amount, string unit = "g")
    {
        _db.ChangeTracker.Clear();
        var recipe = await _db.Recipes.SingleAsync(r => r.Id == recipeId);
        var text = amount is null ? "pasta" : $"{amount} {unit} pasta";
        recipe.Ingredients = JsonSerializer.Serialize(new[] { text });
        recipe.RawMetadata = JsonSerializer.Serialize(new { recipeIngredient = new[] { text }, supply = new[] { new { name = "pasta", quantity = amount is null ? (double?)null : double.Parse(amount.Split('–')[0], System.Globalization.CultureInfo.InvariantCulture), unitText = unit } } });
        await _db.SaveChangesAsync();
        await _service.RecomputeForWeekAsync(TestMonday, default);
        _db.ChangeTracker.Clear();
    }

    [Fact]
    public async Task CheckedBaseline_CumulativeOverlapsResetOnceAndRecheckCapturesNewRange()
    {
        var id = await SeedRecipeWithSupplyAsync(TestMonday, []);
        await SetRangeAsync(id, "2–3");
        await SetChecksAsync(("pasta", true));
        await SetRangeAsync(id, "3–4");
        Assert.True(await IsCheckedAsync("pasta"));
        await SetRangeAsync(id, "4–5");
        Assert.False(await IsCheckedAsync("pasta"));
        var summary = (await GetWeeklyPlanAsync(TestMonday)).GroceryResetSummaryVersion;
        Assert.NotNull(summary);
        await SetChecksAsync(("pasta", true));
        await SetRangeAsync(id, "4–5");
        Assert.True(await IsCheckedAsync("pasta"));
        Assert.Equal(summary, (await GetWeeklyPlanAsync(TestMonday)).GroceryResetSummaryVersion);
        await SetRangeAsync(id, "6–7");
        Assert.False(await IsCheckedAsync("pasta"));
        Assert.NotEqual(summary, (await GetWeeklyPlanAsync(TestMonday)).GroceryResetSummaryVersion);
    }

    [Theory]
    [InlineData("recompute")]
    [InlineData("true")]
    [InlineData("bulk")]
    [InlineData("decrease")]
    public async Task CheckedBaseline_PreservingCheckDoesNotRatchetAcknowledgedAmount(string action)
    {
        var id = await SeedRecipeWithSupplyAsync(TestMonday, []);
        await SetRangeAsync(id, "2–3");
        await SetChecksAsync(("pasta", true));
        await SetRangeAsync(id, action == "decrease" ? "1–2" : "3–4");
        if (action == "true") await SetChecksAsync(("pasta", true));
        if (action == "bulk")
        {
            var plan = await GetWeeklyPlanAsync(TestMonday);
            var checks = JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!;
            await _scope.ServiceProvider.GetRequiredService<ScheduleService>().MutateGroceryBulkAsync(0,
                new(TestMonday, plan.GroceryListVersion, checks, Guid.NewGuid()), reference: TestMonday);
        }
        await SetRangeAsync(id, action == "decrease" ? "3" : "4–5");
        Assert.Equal(action == "decrease", await IsCheckedAsync("pasta"));
    }

    [Fact]
    public async Task CheckedBaseline_UnknownRemainsUnprovableAfterKnownUpdates()
    {
        var id = await SeedRecipeWithSupplyAsync(TestMonday, []);
        await SetRangeAsync(id, null);
        await SetChecksAsync(("pasta", true));
        await SetRangeAsync(id, "5");
        Assert.True(await IsCheckedAsync("pasta"));
        await SetChecksAsync(("pasta", true));
        await SetRangeAsync(id, "10");
        Assert.True(await IsCheckedAsync("pasta"));
        await SetChecksAsync(("pasta", false), ("pasta", true));
        await SetRangeAsync(id, "11");
        Assert.False(await IsCheckedAsync("pasta"));
    }

    [Fact]
    public async Task CheckedBaseline_EquivalentMetricChangeThenIncreaseUsesExactDemand()
    {
        var id = await SeedRecipeWithSupplyAsync(TestMonday, []);
        await SetRangeAsync(id, "500");
        await SetChecksAsync(("pasta", true));
        await SetRangeAsync(id, "0.5", "kg");
        Assert.True(await IsCheckedAsync("pasta"));
        await SetRangeAsync(id, "0.501", "kg");
        Assert.False(await IsCheckedAsync("pasta"));
    }
    [Theory]
    [InlineData("[]")]
    [InlineData("null")]
    public async Task CheckedBaseline_CorruptContainerRemainsUnknownWithoutDroppingCheck(string corrupt)
    {
        var id = await SeedRecipeWithSupplyAsync(TestMonday, []);
        await SetRangeAsync(id, "2");
        await SetChecksAsync(("pasta", true));
        (await GetWeeklyPlanAsync(TestMonday)).GroceryCheckedDemandBaselines = corrupt;
        await _db.SaveChangesAsync();
        await SetRangeAsync(id, "10");
        Assert.True(await IsCheckedAsync("pasta"));
        Assert.Null((await GetWeeklyPlanAsync(TestMonday)).GroceryResetSummaryVersion);
        await SetChecksAsync(("pasta", true));
        await SetRangeAsync(id, "11");
        Assert.True(await IsCheckedAsync("pasta"));
    }

    [Fact]
    public async Task CheckedBaseline_IdenticalSourceOperandsCannotProveIncreaseFromPrecisionRefinement()
    {
        var id = await SeedRecipeWithSupplyAsync(TestMonday, []);
        await SetRangeAsync(id, "0.33", "cup");
        // Retained current source already says 1/3, but an earlier projection
        // recorded its supply decimal. Checking acknowledges these same inputs.
        var recipe = await _db.Recipes.SingleAsync(r => r.Id == id);
        recipe.Ingredients = "[\"1/3 cup pasta\"]";
        recipe.RawMetadata = "{\"recipeIngredient\":[\"1/3 cup pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":0.33,\"unitText\":\"cup\"}]}";
        await _db.SaveChangesAsync();
        await _service.RecomputeForWeekAsync(TestMonday, default);
        _db.ChangeTracker.Clear();
        var plan = await GetWeeklyPlanAsync(TestMonday);
        var row = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        plan.GroceryItems = JsonSerializer.Serialize(new[] { row with { ExactQuantity = new("scalar", new("33", "100")), Quantity = 0.33 } });
        await _db.SaveChangesAsync();
        await SetChecksAsync(("pasta", true));
        var baseline = (await GetWeeklyPlanAsync(TestMonday)).GroceryCheckedDemandBaselines;
        await _service.RecomputeForWeekAsync(TestMonday, default);
        Assert.True(await IsCheckedAsync("pasta"));
        Assert.Equal(baseline, (await GetWeeklyPlanAsync(TestMonday)).GroceryCheckedDemandBaselines);
        Assert.Equal(new("scalar", new GroceryRational("1", "3")), Assert.Single(await GetGroceryItemsAsync(TestMonday)).ExactQuantity);
        await SetRangeAsync(id, "0.34", "cup");
        Assert.False(await IsCheckedAsync("pasta")); // A real original-amount edit still resets.
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task CheckedBaseline_FutureAcknowledgedVersionCannotProveIncrease(bool immediateNextVersion)
    {
        var id = await SeedRecipeWithSupplyAsync(TestMonday, []);
        await SetRangeAsync(id, "2");
        await SetChecksAsync(("pasta", true));
        var plan = await GetWeeklyPlanAsync(TestMonday);
        var baseline = System.Text.Json.Nodes.JsonNode.Parse(plan.GroceryCheckedDemandBaselines)!;
        var row = Assert.Single(await GetGroceryItemsAsync(TestMonday));
        baseline[row.RowId]!["AcknowledgedAtRowVersion"] = immediateNextVersion ? (ulong.Parse(row.RowVersion) + 1).ToString() : "999";
        plan.GroceryCheckedDemandBaselines = baseline.ToJsonString();
        await _db.SaveChangesAsync();
        await SetRangeAsync(id, "10");
        Assert.True(await IsCheckedAsync("pasta"));
        Assert.Null((await GetWeeklyPlanAsync(TestMonday)).GroceryResetSummaryVersion);
    }

}
