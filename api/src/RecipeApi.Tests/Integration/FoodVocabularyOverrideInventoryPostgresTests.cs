using Microsoft.EntityFrameworkCore;
using RecipeApi.Tests.Services;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class FoodVocabularyOverrideInventoryPostgresTests(ITestOutputHelper output)
{
    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("food-read")]
    [InlineData("food-publish")]
    [InlineData("malformed-fallback")]
    [InlineData("fallback-clear")]
    public Task ActualSingletonRows_ParticipateInAbsentMembershipQualification(string scenario) =>
        new TomorrowPushPostgresTests(output).WithDatabase(settings =>
            FoodVocabularyOverrideInventoryTests.CheckAsync(scenario, options => options.UseNpgsql(settings.ConnectionString)));
}
