using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Tests.Services;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class RecipeReportRepairIntentPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task FeedbackCommit_FreezesOriginalDefinitionBeforeLaterDefinitionChanges() => RunAsync(x => RecipeReportRepairIntentTests.CheckFrozenDefinitionAsync(x));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task CrashAfterFeedbackCommit_RetryUsesOriginalCommandAndBaseline() => RunAsync(x => RecipeReportRepairIntentTests.CheckCrashRetryAsync(x));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task FailedOriginalCapture_UnchangedRetryCannotAcquireFreshAuthority() => RunAsync(x => RecipeReportRepairIntentTests.CheckFailedCaptureAsync(x));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task WorkerPickup_ReconcilesCommittedFeedbackWithoutAnotherSubmission() => RunAsync(x => RecipeReportRepairIntentTests.CheckWorkerReconciliationAsync(x));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task HistoricalFeedbackWithoutCapture_UnchangedSaveNeverBuildsTodaysCommand() => RunAsync(x => RecipeReportRepairIntentTests.CheckHistoricalFeedbackAsync(x));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task OriginalUrlCommand_CannotCaptureAChangedSourceAsItsBaseline() => RunAsync(x => RecipeReportRepairIntentTests.CheckChangedSourceAsync(x));

    private Task RunAsync(Func<Action<DbContextOptionsBuilder<RecipeDbContext>>, Task> check) =>
        new TomorrowPushPostgresTests(output).WithDatabase(settings =>
            check(builder => builder.UseNpgsql(settings.ConnectionString)));
}
