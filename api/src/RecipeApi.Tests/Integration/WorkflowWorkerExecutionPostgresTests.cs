using Microsoft.EntityFrameworkCore;
using RecipeApi.Tests.Services;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class WorkflowWorkerExecutionPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task ConcurrentPickup_OnlyOneProcessorOwnsThePendingTask() =>
        new TomorrowPushPostgresTests(output).WithDatabase(settings =>
            WorkflowWorkerAuthorityTests.CheckConcurrentExecutionAsync(b => b.UseNpgsql(settings.ConnectionString)));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task LiveProcessor_OldTimestampIsNotAnAbandonedAttempt() =>
        new TomorrowPushPostgresTests(output).WithDatabase(settings =>
            WorkflowWorkerAuthorityTests.CheckLiveReaperAsync(b => b.UseNpgsql(settings.ConnectionString)));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task ResetDuringExecution_DrainsOldAttemptBeforeCreatingPendingWork() =>
        new TomorrowPushPostgresTests(output).WithDatabase(settings =>
            WorkflowWorkerAuthorityTests.CheckExecutingResetAsync(b => b.UseNpgsql(settings.ConnectionString)));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task IndependentDatabaseSession_FencesPickupUntilOwnershipEnds() =>
        new TomorrowPushPostgresTests(output).WithDatabase(settings =>
            WorkflowWorkerAuthorityTests.CheckExternalLeaseAsync(settings.ConnectionString, abandoned: false));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task AbandonedProcessor_ReclaimsOnlyAfterDatabaseSessionEnds() =>
        new TomorrowPushPostgresTests(output).WithDatabase(settings =>
            WorkflowWorkerAuthorityTests.CheckExternalLeaseAsync(settings.ConnectionString, abandoned: true));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RecoveryProcessorReset_DoesNotWaitUnderAWriteLease()
    {
        foreach (var processor in new[] { "CaptureDemoState", "RestoreDemoState" })
            await new TomorrowPushPostgresTests(output).WithDatabase(settings =>
                WorkflowWorkerAuthorityTests.CheckRecoveryResetAsync(b => b.UseNpgsql(settings.ConnectionString), processor, demo: false));
    }
}
