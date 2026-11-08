using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;
using RecipeApi.Tests.Services;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class WorkflowWorkerAuthorityPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Pickup_UsesStoredParentAndExcludesInitializationPlaceholders()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            foreach (var status in new[] { WorkflowStatus.Paused,
                WorkflowStatus.Pending, WorkflowStatus.Processing })
                await WorkflowWorkerAuthorityTests.CheckPickupAsync(b => b.UseNpgsql(settings.ConnectionString),
                    status, "AuthorityProbe", status is WorkflowStatus.Pending or WorkflowStatus.Processing);
            foreach (var processor in new[] { "UrlCaptureInitialization", "RecipeFollowupInitialization" })
                await WorkflowWorkerAuthorityTests.CheckPickupAsync(b => b.UseNpgsql(settings.ConnectionString),
                    WorkflowStatus.Processing, processor, false);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ThrottleWait_RefusesNewerParentTaskAndScheduleState()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            foreach (var change in new[] { "paused", "processing-task", "future" })
                await WorkflowWorkerAuthorityTests.CheckThrottleAsync(b => b.UseNpgsql(settings.ConnectionString), change);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Completion_RereadsConcurrentParentPause()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
            WorkflowWorkerAuthorityTests.CheckConcurrentPauseAsync(b => b.UseNpgsql(settings.ConnectionString)));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ExplicitReset_PreservesTerminalParentContract()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            foreach (var status in new[] { WorkflowStatus.Completed, WorkflowStatus.Failed })
                await WorkflowWorkerAuthorityTests.CheckResetAsync(b => b.UseNpgsql(settings.ConnectionString), status);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshAttempt_IsNotImmediatelyReclaimedFromOldPendingTimestamp()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
            WorkflowWorkerAuthorityTests.CheckFreshAttemptAsync(b => b.UseNpgsql(settings.ConnectionString)));
    }
}
