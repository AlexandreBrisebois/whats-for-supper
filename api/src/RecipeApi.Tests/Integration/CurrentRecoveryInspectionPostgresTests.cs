using RecipeApi.Tests.Infrastructure;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class CurrentRecoveryInspectionPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_StagesDeclaredHouseholdRelationshipsWithoutPublishing()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var fixture = new CurrentRecoveryHouseholdTestSet();
            await fixture.CheckHouseholdRefusalsAsync(factory.Services);
            await fixture.CheckHouseholdStateAsync(factory.Services);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_UsesDurableIndependentlySelectedHouseholdAndRechecksSchema()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var fixture = new CurrentRecoveryTestSet();
            await fixture.CheckScopeSelectionAsync(factory.Services);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_RejectsSemanticMetadataAndImageErrorsWithoutPublishing()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var fixture = new CurrentRecoveryTestSet();
            await fixture.CheckSemanticRefusalsAsync(factory.Services);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_RejectsCallerTransactionContainingUncommittedDestination()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var fixture = new CurrentRecoveryTestSet();
            await fixture.CheckCallerTransactionAsync(factory.Services);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_UsesCommittedDestinationAndDefersStaleReviewedBaseline()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var fixture = new CurrentRecoveryTestSet();
            await fixture.CheckManagementAsync(factory.Services);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManagementInspection_DoesNotCreateConvertResumeOrOverwriteUnreviewedState()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var fixture = new CurrentRecoveryTestSet();
            await fixture.CheckRefusalsAsync(factory.Services);
        });
    }
}
