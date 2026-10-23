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
    [Fact]
    public void Retired_pdf_registry_key_and_environment_variable_have_no_effect()
    {
        foreach (var mode in new[] { "off", "opt-in", "on", "invalid" })
        {
            var registry = new FeatureFlagRegistry(
                new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT"] = mode }).Build(),
                NullLogger<FeatureFlagRegistry>.Instance);
            Assert.Null(registry.Get("preview-pdf-recipe-import"));
        }
    }

    [Theory]
    [InlineData(null)]
    [InlineData("off")]
    [InlineData("OPT-IN")]
    [InlineData(" on ")]
    [InlineData("invalid")]
    public void Retired_cooking_registry_key_and_environment_variable_have_no_effect(string? value)
    {
        var values = value is null
            ? new Dictionary<string, string?>()
            : new Dictionary<string, string?> { ["WFS_FEATURE_SINGLE_PAGE_RECIPE_STEPS"] = value };
        var registry = new FeatureFlagRegistry(
            new ConfigurationBuilder().AddInMemoryCollection(values).Build(),
            NullLogger<FeatureFlagRegistry>.Instance);

        Assert.Null(registry.Get("single-page-recipe-steps"));
        Assert.Null(registry.Get("planner-hold-to-move"));
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
    public async Task Snapshot_ignores_legacy_graduated_overrides_when_cleanup_has_not_run()
    {
        await using var db = CreateDb();
        var member = new FamilyMember { Name = "Alex" };
        db.FamilyMembers.Add(member);
        db.FeatureFlagOverrides.Add(new FeatureFlagOverride
        {
            MemberId = member.Id,
            FlagKey = "planner-hold-to-move",
            Enabled = false
        });
        db.FeatureFlagOverrides.Add(new FeatureFlagOverride
        {
            MemberId = member.Id,
            FlagKey = "single-page-recipe-steps",
            Enabled = false
        });
        db.FeatureFlagOverrides.Add(new FeatureFlagOverride
        {
            MemberId = member.Id,
            FlagKey = "preview-pdf-recipe-import",
            Enabled = false
        });
        await db.SaveChangesAsync();
        var service = CreateService(db, "opt-in");

        var snapshot = await service.GetSnapshotAsync(member.Id);

        Assert.DoesNotContain(snapshot, flag => flag.Key == "planner-hold-to-move");
        Assert.DoesNotContain(snapshot, flag => flag.Key == "preview-pdf-recipe-import");
        Assert.DoesNotContain(snapshot, flag => flag.Key == "single-page-recipe-steps");
    }

    private static FeatureFlagService CreateService(RecipeDbContext db, string mode)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["WFS_FEATURE_SINGLE_PAGE_RECIPE_STEPS"] = mode
        }).Build();
        var registry = new FeatureFlagRegistry(configuration, NullLogger<FeatureFlagRegistry>.Instance);
        return new FeatureFlagService(new RecipeApi.Services.SystemClock(), db, registry);
    }

    private static RecipeDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<RecipeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new RecipeDbContext(options);
    }
}
