using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class FoodVocabularySeederTests
{
    [Fact]
    public void BaselineVocabulary_ValidatesAndResolvesStaples()
    {
        var embeddedBytes = FoodVocabularySeeder.LoadBaselineBytes();
        var baseline = FoodVocabularyDefinitions.Read(embeddedBytes);

        using var doc = JsonDocument.Parse(embeddedBytes);
        var foods = doc.RootElement.GetProperty("releases")[0].GetProperty("foods").EnumerateArray().ToArray();
        Assert.True(foods.Length >= 44);

        foreach (var food in foods)
        {
            var id = food.GetProperty("id").GetGuid();
            foreach (var alias in food.GetProperty("aliases").EnumerateArray())
            {
                var text = alias.GetProperty("text").GetString()!;
                var match = Assert.IsType<FoodVocabularyMatch>(baseline.Resolve(text));
                Assert.Equal(id, match.Food.Id);
            }
        }

        // Verify EN/FR household staple unification without AI or translation calls.
        var pairs = new[]
        {
            ("onion", "oignon"),
            ("garlic", "ail"),
            ("garlic clove(s)", "gousses d'ail"),
            ("tomato", "tomate"),
            ("butter", "beurre"),
            ("olive oil", "huile d'olive"),
            ("carrot", "carotte"),
            ("potato", "pommes de terre"),
            ("chicken breast", "poitrines de poulet"),
            ("ground beef", "bœuf haché"),
            ("mozzarella", "mozzarella râpée"),
            ("salt", "sel"),
            ("pepper", "poivre"),
            ("soy sauce", "sauce soya"),
            ("honey", "miel"),
            ("sesame seeds", "graines de sésame"),
            ("toasted sesame seeds", "graines de sésame grillées"),
            ("grilled sesame seeds", "graines de sésame grillées"),
            ("sesame oil", "huile de sésame"),
            ("toasted sesame oil", "huile de sésame grillé"),
        };

        foreach (var (en, fr) in pairs)
        {
            var enMatch = Assert.IsType<FoodVocabularyMatch>(baseline.Resolve(en));
            var frMatch = Assert.IsType<FoodVocabularyMatch>(baseline.Resolve(fr));
            Assert.Equal(enMatch.Food.Id, frMatch.Food.Id);
        }

        // Distinct culinary forms/preparations must NOT collapse to the same FoodId.
        var distinctPairs = new[]
        {
            ("graines de sésame", "graines de sésame grillées"),
            ("sesame seeds", "toasted sesame seeds"),
            ("huile de sésame", "huile de sésame grillé"),
            ("diced tomatoes", "crushed tomatoes"),
            ("cream 15%", "heavy cream"),
            ("salt", "kosher salt"),
            ("eggs", "liquid egg"),
        };

        foreach (var (first, second) in distinctPairs)
        {
            var firstMatch = Assert.IsType<FoodVocabularyMatch>(baseline.Resolve(first));
            var secondMatch = Assert.IsType<FoodVocabularyMatch>(baseline.Resolve(second));
            Assert.NotEqual(firstMatch.Food.Id, secondMatch.Food.Id);
        }
    }

    [Fact]
    public async Task EnsureSeededAsync_PublishesBaselineWhenMissingAndIsIdempotent()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
        {
            ["Tests:LocalRecipeStore"] = "true"
        });

        using var scope = factory.Services.CreateScope();
        var store = scope.ServiceProvider.GetRequiredService<FoodVocabularyStore>();
        var seeder = scope.ServiceProvider.GetRequiredService<FoodVocabularySeeder>();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();

        Assert.Null(await store.CaptureActiveAsync());

        var outcome = await seeder.EnsureSeededAsync();
        Assert.NotNull(outcome);
        Assert.Null(outcome.PreviousHead);
        Assert.Equal("base-household-2026-11-16.1", outcome.NewHead.Revision);

        var expectedBytes = FoodVocabularySeeder.LoadBaselineBytes();
        Assert.Equal(FoodVocabularyDefinitions.Sha256(expectedBytes), outcome.NewHead.Sha256);

        var active = await store.CaptureActiveAsync();
        Assert.NotNull(active);
        Assert.Equal(expectedBytes, active.RawBytes);

        var membershipRaw = (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText();
        var inspection = FoodVocabularyStore.InspectMembership(membershipRaw);
        Assert.Equal(FoodVocabularySeeder.ComputeDeterministicOperationId(expectedBytes).ToString("D"), inspection.PresentationEpoch);

        // Repeat invocation is a no-op and preserves membership.
        var second = await seeder.EnsureSeededAsync();
        Assert.Null(second);
        var membershipAfter = (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText();
        Assert.Equal(membershipRaw, membershipAfter);
    }

    [Fact]
    public async Task EnsureSeededAsync_DoesNotOverwriteExistingVocabulary()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?>
        {
            ["Tests:LocalRecipeStore"] = "true"
        });

        using var scope = factory.Services.CreateScope();
        var store = scope.ServiceProvider.GetRequiredService<FoodVocabularyStore>();
        var seeder = scope.ServiceProvider.GetRequiredService<FoodVocabularySeeder>();

        var existingBytes = BoundedVocabularyInput.Bytes();
        await store.PublishReviewedAsync(existingBytes, null, Guid.NewGuid(), BoundedVocabularyInput.ReviewIdentity);

        var seeded = await seeder.EnsureSeededAsync();
        Assert.Null(seeded);

        var active = await store.CaptureActiveAsync();
        Assert.NotNull(active);
        Assert.Equal(BoundedVocabularyInput.Revision, active.Reference.Revision);
        Assert.Equal(existingBytes, active.RawBytes);
    }
}
