using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("bytes")]
    [InlineData("manifest")]
    [InlineData("missing")]
    [InlineData("added")]
    [InlineData("link")]
    public Task VocabularyRecovery_RejectsChangedSourceAfterStagingBeforeAnyLiveWrite(string mutation) =>
        WithStore(async (services, repository, _, _) =>
        {
            var backups = Path.Combine(Path.GetTempPath(), "wfs-recovery-race-" + Guid.NewGuid().ToString("N"));
            try
            {
                services.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = backups;
                var vocabulary = services.GetRequiredService<FoodVocabularyStore>();
                var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                    "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
                var published = await vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "source-staging-race");
                var captured = await services.GetRequiredService<RecoverySnapshotService>().CaptureAsync(default);
                var snapshotId = captured.SnapshotId!.Value;
                var source = Path.Combine(backups, snapshotId.ToString("N"));
                var document = Path.Combine(source, "recipes", ".household", "food-vocabulary",
                    published.NewHead.Revision + "-" + published.NewHead.Sha256 + ".json");
                var db = services.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                recipe.Name = "Keep current destination";
                await db.SaveChangesAsync();
                var before = System.Text.Json.JsonSerializer.Serialize(await db.Recipes.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync());
                var beforeSource = await repository.GetRecipeJsonAsync(Id, default);
                var roots = services.GetRequiredService<RecipesRootResolver>();
                var check = new RecoveryAt("staged", async () =>
                {
                    switch (mutation)
                    {
                        case "bytes": await File.WriteAllTextAsync(document, "{}"); break;
                        case "manifest": await File.AppendAllTextAsync(Path.Combine(source, "manifest.json"), "\n"); break;
                        case "missing": File.Delete(document); break;
                        case "added": await File.WriteAllTextAsync(Path.Combine(source, "unlisted.json"), "{}"); break;
                        case "link":
                            var retained = Path.Combine(backups, "linked-document.json");
                            await File.WriteAllBytesAsync(retained, bytes);
                            File.Delete(document);
                            File.CreateSymbolicLink(document, retained);
                            break;
                    }
                });
                var recovery = RecoveryWithCheckpoint(services, check);
                await Assert.ThrowsAsync<InvalidDataException>(() => recovery.RestoreExactAsync(snapshotId, default));
                Assert.True(check.Reached);
                db.ChangeTracker.Clear();
                Assert.Equal(before, System.Text.Json.JsonSerializer.Serialize(await db.Recipes.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync()));
                Assert.Equal(beforeSource, await repository.GetRecipeJsonAsync(Id, default));
                Assert.Null(roots.Generation);
                Assert.False(File.Exists(Path.Combine(roots.BaseRoot, ".recovery-journal.json")));
                Assert.False(await db.RecoveryPublications.AnyAsync());
            }
            finally { if (Directory.Exists(backups)) Directory.Delete(backups, true); }
        }, localRecipeStore: true);

    private static RecoverySnapshotService RecoveryWithCheckpoint(IServiceProvider services, IRecoveryCheckpoint checkpoint) => new(
        services.GetRequiredService<RecipeDbContext>(), services.GetRequiredService<RecipesRootResolver>(),
        services.GetRequiredService<DataRootResolver>(), services.GetRequiredService<IConfiguration>(),
        services.GetRequiredService<IClock>(), services.GetRequiredService<RecoveryBoundary>(),
        services.GetRequiredService<FoodVocabularyStore>(), services.GetRequiredService<HouseholdFoodOverrideStore>(), checkpoint);

    private sealed class RecoveryAt(string point, Func<Task> action) : IRecoveryCheckpoint
    {
        public bool Reached { get; private set; }
        public async Task ReachedAsync(string name, CancellationToken ct)
        {
            if (name != point) return;
            await action();
            Reached = true;
        }
    }
}
