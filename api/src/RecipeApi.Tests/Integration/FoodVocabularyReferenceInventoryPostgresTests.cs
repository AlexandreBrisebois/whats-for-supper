using Microsoft.EntityFrameworkCore;
using RecipeApi.Tests.Services;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class FoodVocabularyReferenceInventoryPostgresTests(ITestOutputHelper output)
{
    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("reset")]
    [InlineData("attempt")]
    [InlineData("retirement")]
    [InlineData("repair")]
    [InlineData("child")]
    [InlineData("physical")]
    public Task MissingMembership_RejectsIndependentRetainedReferenceWithoutChangingOriginalRows(string owner) =>
        new TomorrowPushPostgresTests(output).WithDatabase(settings =>
            FoodVocabularyReferenceInventoryTests.CheckAbsentMembership(owner, builder => builder.UseNpgsql(settings.ConnectionString)));
}
