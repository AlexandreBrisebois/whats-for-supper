using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class FoodVocabularyPresentationEpochTests
{
    [Fact]
    public async Task ActualGenerationChange_SameHeadAndOlderRetainedSequenceHaveANewEpochWithoutRewritingMembership()
    {
        await using var fixture = new Fixture();
        var firstGeneration = Guid.NewGuid(); fixture.SelectGeneration(firstGeneration);
        var published = await fixture.Publish();
        var row = new HouseholdFoodOverride { Id = Guid.NewGuid(), Revision = "opaque-retained", FallbackKey = "onion",
            ShoppingName = null, ProtectedFields = ["shoppingName"], PresentationSequence = "90",
            CreatedAt = DateTimeOffset.Parse("2026-11-13T16:00:00Z"), UpdatedAt = DateTimeOffset.Parse("2026-11-13T16:00:00Z") };
        fixture.Db.HouseholdFoodOverrides.Add(row); await fixture.Db.SaveChangesAsync();
        var membership = (await fixture.Db.FamilySettings.AsNoTracking().SingleAsync()).Value.GetRawText();
        var before = await fixture.Store.CapturePresentationAsync([]);

        // Exercise the presentation boundary with the actual root pointer and
        // retained older facts. This is not a qualification of the restore engine.
        var nextGeneration = Guid.NewGuid(); fixture.SelectGeneration(nextGeneration);
        row.PresentationSequence = "4"; await fixture.Db.SaveChangesAsync();
        var after = await fixture.Store.CapturePresentationAsync([]);
        Assert.Equal("91", before.Version); Assert.Equal("5", after.Version);
        Assert.Equal(published.NewHead, before.Authority.ActiveRef);
        Assert.Equal(published.NewHead, after.Authority.ActiveRef);
        Assert.NotEqual(before.Epoch, after.Epoch);
        Assert.Equal(firstGeneration, before.Epoch); Assert.Equal(nextGeneration, after.Epoch);
        Assert.Equal(membership, (await fixture.Db.FamilySettings.AsNoTracking().SingleAsync()).Value.GetRawText());
        var retained = await fixture.Db.HouseholdFoodOverrides.AsNoTracking().SingleAsync();
        Assert.Equal("opaque-retained", retained.Revision); Assert.Equal("4", retained.PresentationSequence);
        Assert.Null(retained.ShoppingName); Assert.Equal(new[] { "shoppingName" }, retained.ProtectedFields);
    }

    [Fact]
    public async Task LabelPublication_WithinActualGenerationKeepsEpochAndAdvancesVersion()
    {
        await using var fixture = new Fixture();
        var generation = Guid.NewGuid(); fixture.SelectGeneration(generation);
        var first = await fixture.Publish();
        var before = await fixture.Store.CapturePresentationAsync([]);
        var bytes = Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(await Fixture.Definition())
            .Replace("fixture-three-anchor-v1", "fixture-three-anchor-v2", StringComparison.Ordinal)
            .Replace("Fresh bulb onion", "Fresh onion bulb", StringComparison.Ordinal));
        await fixture.Store.PublishReviewedAsync(bytes, first.NewHead, Guid.NewGuid(), "generation-label-publication");
        var after = await fixture.Store.CapturePresentationAsync([]);
        Assert.Equal(generation, before.Epoch); Assert.Equal(generation, after.Epoch);
        Assert.Equal("1", before.Version); Assert.Equal("2", after.Version);
    }

    [Fact]
    public async Task WithoutGeneration_UsesExistingMembershipEpochOrNilWhenAbsent()
    {
        await using var fixture = new Fixture();
        var absent = await fixture.Store.CapturePresentationAsync([]);
        Assert.Equal(Guid.Empty, absent.Epoch); Assert.Equal("0", absent.Version);
        var operation = Guid.NewGuid(); await fixture.Store.PublishReviewedAsync(await Fixture.Definition(), null, operation, "membership-fallback");
        Assert.Equal(operation, (await fixture.Store.CapturePresentationAsync([])).Epoch);
        Assert.Null(fixture.Roots.Generation);
    }

    [Fact]
    public async Task ActualGeneration_AlsoFencesAbsentMembership()
    {
        await using var fixture = new Fixture();
        var generation = Guid.NewGuid(); fixture.SelectGeneration(generation);
        var capture = await fixture.Store.CapturePresentationAsync([]);
        Assert.Equal(generation, capture.Epoch); Assert.Equal("0", capture.Version);
        Assert.Null(capture.Authority.ActiveRef); Assert.Empty(await fixture.Db.FamilySettings.ToArrayAsync());
    }

    [Theory]
    [InlineData("not-a-generation")]
    [InlineData("00000000-0000-0000-0000-000000000001")]
    [InlineData("")]
    [InlineData("../another-generation")]
    public async Task InvalidActualPointer_AbsentMembershipFailsClosedWithoutWrites(string pointer)
    {
        await using var fixture = new Fixture();
        Directory.CreateDirectory(fixture.Roots.BaseRoot);
        await File.WriteAllTextAsync(Path.Combine(fixture.Roots.BaseRoot, ".recovery-active"), pointer);
        await Assert.ThrowsAsync<InvalidDataException>(() => fixture.Store.CapturePresentationAsync([]));
        Assert.Empty(await fixture.Db.FamilySettings.ToArrayAsync());
        Assert.Empty(await fixture.Db.HouseholdFoodOverrides.ToArrayAsync());
        Assert.Equal(pointer, await File.ReadAllTextAsync(Path.Combine(fixture.Roots.BaseRoot, ".recovery-active")));
    }

    private sealed class Fixture : IAsyncDisposable
    {
        private readonly string directory = Path.Combine(Path.GetTempPath(), "wfs-presentation-epoch-" + Guid.NewGuid().ToString("N"));
        public RecipeDbContext Db { get; } = new(new DbContextOptionsBuilder<RecipeDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        public RecipesRootResolver Roots { get; }
        public FoodVocabularyStore Store { get; }
        public Fixture()
        {
            var configuration = new ConfigurationManager { ["DataRoot"] = directory, ["RecipesRoot"] = Path.Combine(directory, "recipes") };
            Roots = new(new DataRootResolver(configuration), configuration);
            Assert.Equal(Path.Combine(directory, "recipes"), Roots.BaseRoot);
            Store = new(Db, new InMemoryStorageProvider(), Roots, new RecoveryBoundary(Db, configuration, Roots), new SystemClock());
        }
        public void SelectGeneration(Guid generation)
        {
            Directory.CreateDirectory(Roots.BaseRoot);
            File.WriteAllText(Path.Combine(Roots.BaseRoot, ".recovery-active"), generation.ToString("N") + "\n");
            Directory.CreateDirectory(Roots.Root);
            Assert.Equal(generation.ToString("N"), Roots.Generation);
        }
        public Task<FoodVocabularyPublicationOutcome> Publish() => PublishCore();
        private async Task<FoodVocabularyPublicationOutcome> PublishCore() => await Store.PublishReviewedAsync(await Definition(), null, Guid.NewGuid(), "generation-test");
        public static Task<byte[]> Definition() => File.ReadAllBytesAsync(Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
        public async ValueTask DisposeAsync()
        {
            await Db.DisposeAsync();
            if (Directory.Exists(directory)) Directory.Delete(directory, true);
        }
    }
}
