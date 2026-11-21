using RecipeApi.Tests.Services;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class CurrentRecoveryDictionaryPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_RetainsPinnedDictionaryAndProtectedOverridesWithoutPublication()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var fixture = new CurrentRecoveryDictionaryTests();
            await fixture.CheckDictionaryStateAsync(factory.Services);
        });
    }
}
