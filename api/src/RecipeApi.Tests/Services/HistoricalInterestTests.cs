using Microsoft.Extensions.Configuration;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class HistoricalInterestTests
{
    private sealed class Clock : IClock { public DateTimeOffset UtcNow => new(2026, 10, 12, 12, 0, 0, TimeSpan.Zero); }

    [Fact]
    public async Task Snapshot_UsesCompletedCalendarWeeks_OneContributionPerWeek_ExcludesSelectedAndReopened()
    {
        await using var db = TestDbContextFactory.Create();
        var id = Guid.NewGuid();
        db.WeeklyHouseholdInterests.AddRange(Enumerable.Range(0, 6).Select(i => new WeeklyHouseholdInterest
        {
            RecipeId = id, WeekStartDate = new DateOnly(2026, 9, 7).AddDays(i * 7), PositiveCount = i + 1,
            Selected = i == 2
        }));
        db.WeeklyPlans.Add(new WeeklyPlan { WeekStartDate = new(2026, 9, 28), Status = WeeklyPlanStatus.VotingOpen });
        await db.SaveChangesAsync();
        var service = new HistoricalInterestService(db, new Clock(), new(new ConfigurationManager()), new(new ConfigurationManager()));
        var snapshot = await service.CaptureAsync();
        Assert.Equal(0.5, snapshot.Signal(id));
        db.WeeklyPlans.Single().Status = WeeklyPlanStatus.Locked;
        await db.SaveChangesAsync();
        var closed = await service.CaptureAsync();
        Assert.Equal(0.75, closed.Signal(id));
        Assert.NotEqual(snapshot.Generation, closed.Generation);
        var disabled = new HistoricalInterestService(db, new Clock(), new(new ConfigurationManager()),
            new(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["HISTORICAL_INTEREST_ENABLED"] = "false" }).Build()));
        Assert.Empty((await disabled.CaptureAsync()).Counts);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("1.5")]
    [InlineData("four")]
    [InlineData("5201")]
    public void InvalidWindowsFailConfiguration(string setting)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        { ["HISTORICAL_INTEREST_WEEKS"] = setting, ["COOKED_COOLDOWN_WEEKS"] = setting }).Build();
        Assert.Throws<InvalidOperationException>(() => new HistoricalInterestOptions(configuration));
        Assert.Throws<InvalidOperationException>(() => new RecipeRotationOptions(configuration));
    }
}
