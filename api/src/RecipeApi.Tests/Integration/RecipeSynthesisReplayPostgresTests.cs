using RecipeApi.Tests.Infrastructure;
using RecipeApi.Tests.Services;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class RecipeSynthesisReplayPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task InterruptedSynthesis_ResumesOriginalDeliveryAndPreservesLaterPrivateEdits() =>
        WithPostgres(factory => RecipeSynthesisCanonicalTests.QualifySynthesizedReplayAsync(factory, false));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task InterruptedSynthesis_NewerHumanFieldsRejectPendingDelivery() =>
        WithPostgres(factory => RecipeSynthesisCanonicalTests.QualifySynthesizedReplayAsync(factory, true));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PendingSynthesis_SourceFileRaceRejectsStaleGeneratedOutput() =>
        WithPostgres(factory => RecipeSynthesisCanonicalTests.QualifySynthesisConcurrentAsync(factory, "source-file"));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PendingSynthesis_HumanNameRaceRejectsStaleGeneratedOutput() =>
        WithPostgres(factory => RecipeSynthesisCanonicalTests.QualifySynthesisConcurrentAsync(factory, "human-name"));

    private Task WithPostgres(Func<TestWebApplicationFactory, Task> qualify) =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
            {
                ["Tests:LocalRecipeStore"] = "true", ["Tests:RealWorkflowOrchestrator"] = "true",
                ["Tests:PostgresConnectionString"] = settings.ConnectionString
            });
            await qualify(factory);
        });
}
