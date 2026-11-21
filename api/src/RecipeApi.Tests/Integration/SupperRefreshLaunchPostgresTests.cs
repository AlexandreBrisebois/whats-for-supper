using Microsoft.EntityFrameworkCore;
using RecipeApi.Tests.Services;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class SupperRefreshLaunchPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Save_CommitsOriginalRefreshIntent() => await Check("save");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Invalidation_CommitsOriginalRefreshIntent() => await Check("invalidate");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Retry_CommitsNewIntentAndPreservesOriginalWork() => await Check("retry");

    private async Task Check(string entrypoint) =>
        await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
            SupperRefreshLaunchTests.CheckAcceptanceAsync(b => b.UseNpgsql(settings.ConnectionString), entrypoint));
}
