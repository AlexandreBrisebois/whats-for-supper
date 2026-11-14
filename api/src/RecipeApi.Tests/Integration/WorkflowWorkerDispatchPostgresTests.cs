using Microsoft.EntityFrameworkCore;
using RecipeApi.Tests.Services;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class WorkflowWorkerDispatchPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Dispatch_RefusesMissingMalformedAndDivergentStoredAuthority()
    {
        foreach (var mutation in new[] { "missing", "malformed", "parameters", "workflow", "payload", "processor",
            "name", "dependencies", "sibling-payload", "removed-sibling" })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckDispatchAuthorityAsync(b => b.UseNpgsql(settings.ConnectionString), mutation));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ThrottleWait_RereadsOriginalParameterAuthority() =>
        await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
            WorkflowWorkerAuthorityTests.CheckDispatchThrottleAsync(b => b.UseNpgsql(settings.ConnectionString)));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task WriterDispatch_ExecutesFullIntentButOnlyRetainsHistoricalIntent()
    {
        foreach (var historical in new[] { false, true })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckWriterAuthorityAsync(b => b.UseNpgsql(settings.ConnectionString), historical));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ReclaimedHistoricalWork_RemainsWithoutExecutionAuthority() =>
        await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
            WorkflowWorkerAuthorityTests.CheckReclaimedAuthorityAsync(b => b.UseNpgsql(settings.ConnectionString)));
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RefusedHistoricalBatch_DoesNotStarveCurrentAcceptedWork()
    {
        foreach (var missing in new[] { false, true })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckRefusedBatchAsync(b => b.UseNpgsql(settings.ConnectionString), missing));
    }

}
