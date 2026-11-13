using RecipeApi.Tests.Infrastructure;
using RecipeApi.Tests.Services;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class RecipeShareCanonicalPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SharedRecipe_OrdinaryEditReadScheduleAndClearRetainMediaAndOneDemand() =>
        WithPostgres(RecipeShareCanonicalTests.QualifySharedLifecycleAsync);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SharedPublication_DuplicatePreservesNewerHumanFieldsAndMedia() =>
        WithPostgres(factory => RecipeShareCanonicalTests.QualifySharedReplayAsync(factory, interrupt: false, rejectNewerPending: false));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SharedPublication_InterruptedDeliveryResumesOriginalFactsAndMedia() =>
        WithPostgres(factory => RecipeShareCanonicalTests.QualifySharedReplayAsync(factory, interrupt: true, rejectNewerPending: false));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SharedPublication_PendingDeliveryRejectsNewerHumanFieldsWithoutReplacingFiles() =>
        WithPostgres(factory => RecipeShareCanonicalTests.QualifySharedReplayAsync(factory, interrupt: true, rejectNewerPending: true));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SharedRecipe_PreservesExplicitPositiveBasisWithoutGuessingQuantities() =>
        WithPostgres(RecipeShareDeclaredBasisTests.QualifyDeclaredBasisAsync);

    private Task WithPostgres(Func<TestWebApplicationFactory, Task> qualify) =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
                new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = DateTimeOffset.Parse("2026-10-12T16:00:00Z") },
                new() { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:LocalRecipeStore"] = "true", ["Tests:PostgresConnectionString"] = settings.ConnectionString });
            await qualify(factory);
        });
}
