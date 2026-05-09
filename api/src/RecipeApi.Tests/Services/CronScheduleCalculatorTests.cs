using Microsoft.Extensions.Configuration;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class CronScheduleCalculatorTests
{
    [Fact]
    public void GetNextOccurrence_DailyCronBeforeTarget_ReturnsTodayAtTargetUtc()
    {
        var calculator = new CronScheduleCalculator(Configuration([]));
        var now = new DateTimeOffset(2026, 5, 9, 2, 30, 0, TimeSpan.Zero);

        var next = calculator.GetNextOccurrence("${DREAMING_CRON_UTC:-0 3 * * *}", now);

        Assert.Equal(new DateTimeOffset(2026, 5, 9, 3, 0, 0, TimeSpan.Zero), next);
    }

    [Fact]
    public void GetNextOccurrence_DailyCronAfterTarget_ReturnsTomorrowAtTargetUtc()
    {
        var calculator = new CronScheduleCalculator(Configuration([]));
        var now = new DateTimeOffset(2026, 5, 9, 3, 0, 0, TimeSpan.Zero);

        var next = calculator.GetNextOccurrence("${DREAMING_CRON_UTC:-0 3 * * *}", now);

        Assert.Equal(new DateTimeOffset(2026, 5, 10, 3, 0, 0, TimeSpan.Zero), next);
    }

    [Fact]
    public void GetNextOccurrence_UsesConfiguredEnvironmentValue()
    {
        var calculator = new CronScheduleCalculator(Configuration(new Dictionary<string, string?>
        {
            ["DREAMING_CRON_UTC"] = "30 4 * * *"
        }));
        var now = new DateTimeOffset(2026, 5, 9, 3, 0, 0, TimeSpan.Zero);

        var next = calculator.GetNextOccurrence("${DREAMING_CRON_UTC:-0 3 * * *}", now);

        Assert.Equal(new DateTimeOffset(2026, 5, 9, 4, 30, 0, TimeSpan.Zero), next);
    }

    [Fact]
    public void GetNextOccurrence_WeeklyCron_ReturnsNextMatchingDay()
    {
        var calculator = new CronScheduleCalculator(Configuration([]));
        var saturday = new DateTimeOffset(2026, 5, 9, 3, 0, 0, TimeSpan.Zero);

        var next = calculator.GetNextOccurrence("15 6 * * 1", saturday);

        Assert.Equal(new DateTimeOffset(2026, 5, 11, 6, 15, 0, TimeSpan.Zero), next);
    }

    private static IConfiguration Configuration(Dictionary<string, string?> values)
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();
    }
}
