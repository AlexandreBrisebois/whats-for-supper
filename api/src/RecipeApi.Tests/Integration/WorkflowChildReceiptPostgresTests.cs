using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Tests.Services;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class WorkflowChildReceiptPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ProcessorHistory_BindsOriginalSelectedChild()
    {
        foreach (var search in new[] { false, true })
            foreach (var recovered in new[] { false, true })
                await Run(x => WorkflowChildReceiptTests.CheckChildHistory(search, recovered, x));
        await Run(x => WorkflowChildReceiptTests.CheckChildHistory(false, false, x, scheduled: true));
        foreach (var mode in new[] { "capture-failed", "missing-recipe", "deleted-recipe" })
            await Run(x => WorkflowChildReceiptTests.CheckIncompleteChildHistory(mode, x));
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Start_CrashBeforeParentResult_RetryUsesSameChild() => Run(x => WorkflowChildReceiptTests.CheckRetry(false, x));
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Search_CrashBeforeParentResult_RetryUsesOriginalFingerprint() => Run(x => WorkflowChildReceiptTests.CheckRetry(true, x));
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task ExplicitTerminalReset_RetainsPriorReceipt() => Task.WhenAll(Run(x => WorkflowChildReceiptTests.CheckReset(RecipeApi.Models.WorkflowStatus.Completed, x)),
        Run(x => WorkflowChildReceiptTests.CheckReset(RecipeApi.Models.WorkflowStatus.Failed, x)));
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task FailedOriginalCapture_RetryRemainsInert() => Run(x => WorkflowChildReceiptTests.CheckFailedCapture(x));
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task LostAcceptanceAcknowledgement_ReadsCommittedChildAndReceipt() => Run(x => WorkflowChildReceiptTests.CheckLostAck(x));
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task MissingAcceptedChild_IsNotReplaced() => Run(x => WorkflowChildReceiptTests.CheckMissingChild(x));
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PreparedCommandCrash_RetryUsesOriginalGraph() => Run(x => WorkflowChildReceiptTests.CheckPreparedCrash(x));
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task WorkerPickup_StartAfterCrash_CompletesParentFromOriginalReceipt() => Run(x => WorkflowChildReceiptTests.CheckWorker(false, x));
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task WorkerPickup_SearchAfterCrash_CompletesParentFromOriginalReceipt() => Run(x => WorkflowChildReceiptTests.CheckWorker(true, x));
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RolledBackAcceptance_DoesNotResurrectChildOnLaterSave() => Run(x => WorkflowChildReceiptTests.CheckRollback(x));
    private Task Run(Func<Action<DbContextOptionsBuilder<RecipeDbContext>>, Task> check) =>
        new TomorrowPushPostgresTests(output).WithDatabase(settings => check(builder => builder.UseNpgsql(settings.ConnectionString)));
}
