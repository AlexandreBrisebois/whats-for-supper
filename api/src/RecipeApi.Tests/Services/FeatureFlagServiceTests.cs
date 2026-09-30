using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class FeatureFlagServiceTests
{
    [Theory]
    [InlineData(null, FeatureFlagMode.Off)]
    [InlineData("off", FeatureFlagMode.Off)]
    [InlineData("OPT-IN", FeatureFlagMode.OptIn)]
    [InlineData(" on ", FeatureFlagMode.On)]
    [InlineData("invalid", FeatureFlagMode.Off)]
    public void Registry_parses_modes_fail_closed(string? value, FeatureFlagMode expected)
    {
        var values = value is null
            ? new Dictionary<string, string?>()
            : new Dictionary<string, string?> { ["WFS_FEATURE_SINGLE_PAGE_RECIPE_STEPS"] = value };
        var registry = new FeatureFlagRegistry(
            new ConfigurationBuilder().AddInMemoryCollection(values).Build(),
            NullLogger<FeatureFlagRegistry>.Instance);

        Assert.Equal(expected, registry.Get("single-page-recipe-steps")!.Mode);
        Assert.Null(registry.Get("unknown"));
    }

    [Theory]
    [InlineData(FeatureFlagMode.Off, null, false)]
    [InlineData(FeatureFlagMode.Off, true, false)]
    [InlineData(FeatureFlagMode.OptIn, null, false)]
    [InlineData(FeatureFlagMode.OptIn, true, true)]
    [InlineData(FeatureFlagMode.OptIn, false, false)]
    [InlineData(FeatureFlagMode.On, false, true)]
    public void Resolver_combines_mode_and_override(FeatureFlagMode mode, bool? memberEnabled, bool expected) =>
        Assert.Equal(expected, FeatureFlagService.Resolve(mode, memberEnabled));

    [Fact]
    public async Task SetOverride_is_member_specific_and_upserts()
    {
        await using var db = CreateDb();
        var first = new FamilyMember { Name = "Alex" };
        var second = new FamilyMember { Name = "Sam" };
        db.FamilyMembers.AddRange(first, second);
        await db.SaveChangesAsync();
        var service = CreateService(db, "opt-in");

        await service.SetOverrideAsync(first.Id, "single-page-recipe-steps", true);
        await service.SetOverrideAsync(first.Id, "single-page-recipe-steps", false);

        Assert.False((await service.GetSnapshotAsync(first.Id)).Single().Enabled);
        Assert.False((await service.GetSnapshotAsync(second.Id)).Single().Enabled);
        Assert.Single(db.FeatureFlagOverrides);
    }

    private static FeatureFlagService CreateService(RecipeDbContext db, string mode)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["WFS_FEATURE_SINGLE_PAGE_RECIPE_STEPS"] = mode
        }).Build();
        var registry = new FeatureFlagRegistry(configuration, NullLogger<FeatureFlagRegistry>.Instance);
        return new FeatureFlagService(db, registry);
    }

    private static RecipeDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<RecipeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new RecipeDbContext(options);
    }
}
