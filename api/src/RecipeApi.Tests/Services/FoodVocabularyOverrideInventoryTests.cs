using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class FoodVocabularyOverrideInventoryTests
{
    [Theory]
    [InlineData("food-read")]
    [InlineData("food-publish")]
    [InlineData("malformed-fallback")]
    [InlineData("fallback-clear")]
    public Task ActualSingletonRows_ParticipateInAbsentMembershipQualification(string scenario) => CheckAsync(scenario);

    internal static async Task CheckAsync(string scenario, Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        var options = new DbContextOptionsBuilder<RecipeDbContext>();
        if (configure is null) options.UseInMemoryDatabase(Guid.NewGuid().ToString());
        else configure(options);
        await using var db = new RecipeDbContext(options.Options);
        var storage = new InMemoryStorageProvider();
        var vocabulary = TestPublicationStore.Vocabulary(db, storage, new SystemClock());
        var bytes = await File.ReadAllBytesAsync(Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
        var food = scenario.StartsWith("food", StringComparison.Ordinal);
        FoodVocabularyPublicationOutcome? published = null;
        if (food) published = await vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "override-inventory-original");
        var at = DateTimeOffset.Parse("2026-11-13T16:00:00Z");
        var row = new HouseholdFoodOverride
        {
            Id = Guid.NewGuid(), Revision = "opaque-original", PresentationSequence = "9007199254740993",
            FoodId = food ? Guid.Parse("ac9818ee-4c30-4f91-a4ea-0aa4fc7265ee") : null,
            DictionaryRevision = food ? "fixture-three-anchor-v1" : null,
            DocumentRevision = published?.NewHead.Revision, DocumentSha256 = published?.NewHead.Sha256,
            FallbackKey = food ? null : "onion", ShoppingName = null,
            GrocerySection = scenario == "malformed-fallback" ? "Pantry" : null,
            ProtectedFields = ["shoppingName"], CreatedAt = at, UpdatedAt = at
        };
        db.HouseholdFoodOverrides.Add(row);
        await db.SaveChangesAsync();
        db.FamilySettings.RemoveRange(await db.FamilySettings.Where(x => x.Key == "food_vocabulary_publication").ToArrayAsync());
        await db.SaveChangesAsync();
        var before = JsonSerializer.Serialize(HouseholdFoodOverrideSnapshot.From(row));
        if (scenario == "food-publish")
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "cannot-reseed-override"));
        else if (food || scenario == "malformed-fallback")
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.CaptureActiveAsync());
        else
        {
            var method = typeof(FoodVocabularyStore).GetMethod("ObserveInventoryFactsAsync", BindingFlags.Instance | BindingFlags.NonPublic)!;
            var facts = await (Task<FoodVocabularyInventoryFacts>)method.Invoke(vocabulary, [CancellationToken.None])!;
            Assert.Equal(FoodVocabularyOverrideCoverage.CapturedV1, facts.Overrides.Coverage);
            var observed = Assert.Single(facts.Overrides.Rows!);
            Assert.Equal(row.Id, observed.Id);
            Assert.Equal("9007199254740993", observed.PresentationSequence);
            Assert.Null(observed.ShoppingName);
            Assert.Equal(row.ProtectedFields, observed.ProtectedFields);
            Assert.Empty(FoodVocabularyInventoryQualification.RequiredReferences(facts));
            Assert.Null(await vocabulary.CaptureActiveAsync());
            await vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "valid-fallback-first-install");
        }
        if (food)
        {
            var method = typeof(FoodVocabularyStore).GetMethod("ObserveInventoryFactsAsync", BindingFlags.Instance | BindingFlags.NonPublic)!;
            var facts = await (Task<FoodVocabularyInventoryFacts>)method.Invoke(vocabulary, [CancellationToken.None])!;
            var origin = Assert.Single(FoodVocabularyInventoryQualification.RequiredReferences(facts));
            Assert.Equal("household-override", origin.OwnerKind);
            Assert.Equal(row.Id.ToString("D"), origin.OwnerKey);
            Assert.Equal(published!.NewHead, origin.Reference);
        }
        Assert.Equal(before, JsonSerializer.Serialize(HouseholdFoodOverrideSnapshot.From(await db.HouseholdFoodOverrides.AsNoTracking().SingleAsync())));
        if (scenario != "fallback-clear") Assert.False(await db.FamilySettings.AsNoTracking().AnyAsync(x => x.Key == "food_vocabulary_publication"));
        if (published is not null)
            Assert.Equal(bytes, await storage.LoadAsync("recipes", $".household/food-vocabulary/{published.NewHead.Revision}-{published.NewHead.Sha256}.json"));
    }
}
