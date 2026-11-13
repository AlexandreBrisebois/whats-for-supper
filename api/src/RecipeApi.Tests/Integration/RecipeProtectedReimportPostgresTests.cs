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

    private Task WithPostgres(string mode) => new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
        {
            ["Tests:LocalRecipeStore"] = "true", ["Tests:RealWorkflowOrchestrator"] = "true",
            ["Tests:PostgresConnectionString"] = settings.ConnectionString
        });
        await RecipeProtectedReimportTests.QualifyPhotoRepairAsync(factory, mode);
    });
}
