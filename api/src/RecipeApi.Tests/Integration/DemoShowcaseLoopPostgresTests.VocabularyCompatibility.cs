using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class DemoShowcaseLoopPostgresTests
{
    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("override")]
    [InlineData("membership")]
    [InlineData("mapping")]
    [InlineData("canonical-v2")]
    public async Task LegacyDemo2_CannotCaptureFoodAuthority(string owner)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Legacy boundary", Ingredients = "[\"salt\"]", AddedBy = app.DefaultFamilyMemberId };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        if (owner == "override")
        {
            db.HouseholdFoodOverrides.Add(ProtectedClear());
            await db.SaveChangesAsync();
        }
        if (owner == "membership")
        {
            var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
            await services.GetRequiredService<FoodVocabularyStore>().PublishReviewedAsync(bytes, null, Guid.NewGuid(), "legacy-demo-reject");
        }
        if (owner == "mapping")
        {
            recipe.FoodMappingEvidence = "{}";
            await db.SaveChangesAsync();
        }
        if (owner == "canonical-v2")
        {
            await services.GetRequiredService<CanonicalRecipeContentStore>().ConvertAsync(recipe.Id,
                CanonicalRecipeContentStore.InspectContentRevision(recipe), CanonicalRecipeContentStore.InspectSourceRevision(recipe), Guid.NewGuid());
            Assert.NotEmpty(await db.CanonicalRecipeOperations.ToArrayAsync());
        }
        var before = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipe.Id);
        await Assert.ThrowsAsync<InvalidDataException>(() => services.GetRequiredService<ManagementService>().CaptureDemoStateAsync());
        Assert.False(File.Exists(Path.Combine(services.GetRequiredService<DataRootResolver>().Root, "demo", "current")));
        var after = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipe.Id);
        Assert.Equal((before.CanonicalContent, before.FoodMappingEvidence), (after.CanonicalContent, after.FoodMappingEvidence));
        Assert.Equal(owner == "override" ? 1 : 0, await db.HouseholdFoodOverrides.CountAsync());
        Assert.Equal(owner == "membership", await db.FamilySettings.AnyAsync(x => x.Key == "food_vocabulary_publication"));
    }

    [RecipeImportReportPostgresTests.PostgresFact]
    public async Task LegacyDemo2_RechecksActualOverrideOwnerAfterWritersDrain()
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Captured food-free recipe", AddedBy = app.DefaultFamilyMemberId };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        await services.GetRequiredService<ManagementService>().CaptureDemoStateAsync();
        var baseline = SelectedBaseline(scope);
        recipe.Name = "Later human recipe name";
        await db.SaveChangesAsync();
        var retained = ProtectedClear();
        var checkpoint = new AddOverrideAtStage(async () =>
        {
            db.HouseholdFoodOverrides.Add(retained);
            await db.SaveChangesAsync();
        });
        var recovery = new RecoverySnapshotService(db, services.GetRequiredService<RecipesRootResolver>(),
            services.GetRequiredService<DataRootResolver>(), services.GetRequiredService<IConfiguration>(),
            services.GetRequiredService<IClock>(), services.GetRequiredService<RecoveryBoundary>(),
            services.GetRequiredService<FoodVocabularyStore>(), checkpoint);
        await Assert.ThrowsAsync<InvalidDataException>(() => recovery.RestoreDemoAsync(null, default));
        Assert.True(checkpoint.Applied);
        Assert.Equal("Later human recipe name", (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipe.Id)).Name);
        Assert.Equal(retained.Id, (await db.HouseholdFoodOverrides.AsNoTracking().SingleAsync()).Id);
        Assert.Equal(baseline, SelectedBaseline(scope));
        Assert.False(File.Exists(Path.Combine(services.GetRequiredService<RecipesRootResolver>().BaseRoot, ".recovery-journal.json")));
    }

    private static HouseholdFoodOverride ProtectedClear()
    {
        var at = DateTimeOffset.Parse("2026-11-13T16:00:00Z");
        return new() { Id = Guid.NewGuid(), Revision = "original-opaque", FallbackKey = "onion", ShoppingName = null,
            ProtectedFields = ["shoppingName"], PresentationSequence = "1", CreatedAt = at, UpdatedAt = at };
    }

    private sealed class AddOverrideAtStage(Func<Task> mutation) : IRecoveryCheckpoint
    {
        public bool Applied { get; private set; }
        public async Task ReachedAsync(string name, CancellationToken ct)
        {
            if (name != "staged") return;
            await mutation();
            Applied = true;
        }
    }
}
