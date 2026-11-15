using RecipeApi.Tests.Infrastructure;
using RecipeApi.Tests.Services;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class RecipeProtectedReimportPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PhotoIngredientRepair_UpdatesQualifiedSourceFacts() => WithPostgres("source");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PhotoIngredientRepair_PreservesCapturedHumanClearsPrivateNameShoppingAndInstructions() => WithPostgres("protected-before");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PhotoIngredientRepair_RejectsHumanClearAfterAcceptedCapture() => WithPostgres("stale-after");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PhotoIngredientRepair_RequalifiesCapturedMappingWithoutChangingItsDecision() => WithPostgres("mapped-source");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PhotoIngredientRepair_DoesNotRematchExplicitIdentityClearEvenForAnExactAlias() => WithPostgres("mapped-clear-before");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PhotoIngredientRepair_FollowupsPreserveMediaAndProduceOneOrdinaryDemand() => WithPostgres("followup");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PhotoIngredientRepair_InterruptedDeliveryReplaysWithoutOverwritingLaterHumanFields() => WithPostgres("delivery-replay");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PhotoIngredientRepair_NewerHumanFieldsRejectPendingDelivery() => WithPostgres("delivery-newer-pending");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PhotoIngredientRepair_DoesNotSelectStaleMetadataAfterCommittedUserEditSyncFailure() => WithPostgres("metadata-sync-failure");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_UpdatesFactsAndPreservesMediaOneDemand() => WithSourceChannels("followup");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_PreservesHumanClearsAndOriginalSteps() => WithSourceChannels("protected-before");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_RejectsNewerContent() => WithSourceChannels("stale-after");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_PreservesCapturedVocabularyDecision() => WithSourceChannels("mapped-source");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_DoesNotRestoreClearedIdentity() => WithSourceChannels("mapped-clear-before");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_ProviderFailurePreservesOriginals() => WithSourceChannels("provider-failure");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_CancellationPreservesOriginals() => WithSourceChannels("provider-cancellation");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_ResumesInterruptedDeliveryWithoutProviderReplay() => WithSourceChannels("delivery-replay");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_RejectsPendingDeliveryAfterHumanEdit() => WithSourceChannels("delivery-newer-pending");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_RejectsLateProviderAfterHumanSave() => WithSourceChannels("stale-during-provider");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_RejectsSourceChangeDuringProvider() => WithSourceChannels("source-during-provider");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RetainedSourceRepair_RejectsMalformedCandidateOrChangedCommand()
    {
        foreach (var mode in new[] { "reordered", "duplicate", "changed-shape", "report-note-mismatch", "report-reasons-mismatch" })
            await WithSourceChannels(mode);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_PreservesRenamedHumanRowAndRepairsUntouchedRows() => WithSourceChannels("renamed-before");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_UpdatesProvenOriginalStepsAndReevaluatesScaling() => WithSourceChannels("steps-source");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RetainedSourceRepair_AbstainsOnHumanRevertedAndMissingStepAuthority()
    {
        foreach (var mode in new[] { "steps-protected", "steps-reverted", "steps-missing-proof" }) await WithSourceChannels(mode);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_RejectsLateHumanStepSave() => WithSourceChannels("steps-late-human");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_RequiresIndependentStepSourceForCommitAndRecovery() => WithSourceChannels("steps-forged-proof");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetainedSourceRepair_ChangedFeedbackCanRepairPreviouslyCorrectedSourceSteps() => WithSourceChannels("steps-repeat");

    private async Task WithSourceChannels(string mode)
    {
        foreach (var channel in new[] { "url", "pdf" }) await WithPostgres(mode, channel);
    }

    private Task WithPostgres(string mode, string channel = "photo") => new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
        {
            ["Tests:LocalRecipeStore"] = "true", ["Tests:RealWorkflowOrchestrator"] = "true",
            ["Tests:PostgresConnectionString"] = settings.ConnectionString
        });
        await RecipeProtectedReimportTests.QualifyPhotoRepairAsync(factory, mode, channel);
    });
}
