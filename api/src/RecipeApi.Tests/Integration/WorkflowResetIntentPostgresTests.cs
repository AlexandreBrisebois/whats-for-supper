using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Tests.Services;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class WorkflowResetIntentPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Reset_RetainsAllGenerationsAndSelectedChild()
    {
        foreach (var terminal in new[] { false, true })
            await Run(b => WorkflowResetIntentTests.CheckLedger(terminal, b));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PendingOriginal_ResumesCapturedGeneration() => Run(b => WorkflowResetIntentTests.CheckPending("unchanged", b));
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PendingOriginal_RefusesChangedRecoveryPublication() => Run(b => WorkflowResetIntentTests.CheckPending("publication", b));
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PendingOriginal_RefusesChangedPayload() => Run(b => WorkflowResetIntentTests.CheckPending("payload", b));
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PendingReset_ReaperPreservesOriginal() => Run(b => WorkflowResetIntentTests.CheckPendingReaper(b));
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Worker_ReconcilesBeforeDispatch() => Run(b => WorkflowResetIntentTests.CheckWorker(b));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task LostAcknowledgement_ReadsOriginalRequestOrAppliedReceipt()
    {
        foreach (var application in new[] { false, true })
            await Run(b => WorkflowResetIntentTests.CheckLostAcknowledgement(application, b));
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task MalformedPendingOriginal_FencesOtherwiseExecutableTask() => Run(b => WorkflowResetIntentTests.CheckMalformed(b));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PendingOriginal_MissingObservationOrTaskAndRetiredHistoryStayInert()
    {
        foreach (var change in new[] { "missingSelection", "missingTask", "retired" })
            await Run(b => WorkflowResetIntentTests.CheckPending(change, b));
    }

    private Task Run(Func<Action<DbContextOptionsBuilder<RecipeDbContext>>, Task> check) =>
        new TomorrowPushPostgresTests(output).WithDatabase(settings => check(builder => builder.UseNpgsql(settings.ConnectionString)));
}
