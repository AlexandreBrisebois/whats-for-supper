using RecipeApi.Tests.Infrastructure;
using RecipeApi.Tests.Services;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class RecipeSynthesisCanonicalPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task GeneratedRecipe_RealDescribePublicationFollowupsReadDemandAndProtectedReplay() => WithPostgres("valid");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task MalformedGeneratedRecipe_RetainsHonestEmptyFallbackThroughFollowups() => WithPostgres("malformed");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task UnnamedGeneratedRecipe_RetainsHonestEmptyFallbackThroughFollowups() => WithPostgres("missing-name");

    private Task WithPostgres(string mode) => new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
            new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = DateTimeOffset.Parse("2026-10-12T16:00:00Z") }, new()
            {
                ["Calendar:TimeZone"] = "America/Toronto", ["Tests:LocalRecipeStore"] = "true",
                ["Tests:RealWorkflowOrchestrator"] = "true", ["Tests:PostgresConnectionString"] = settings.ConnectionString
            });
        await RecipeSynthesisCanonicalTests.QualifySynthesisAsync(factory, mode);
    });
}
