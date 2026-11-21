using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false, "food")]
    [InlineData(false, "release")]
    [InlineData(true, "food")]
    [InlineData(true, "release")]
    public Task VocabularyRecovery_UnknownSavedFoodOrReleaseRejectsCaptureWithoutPublishing(bool demo, string unknown) =>
        WithVocabularySnapshot(demo, async fixture =>
        {
            var db = fixture.Services.GetRequiredService<RecipeDbContext>();
            var at = fixture.Services.GetRequiredService<IClock>().UtcNow;
            var row = new HouseholdFoodOverride { Id = Guid.NewGuid(), Revision = "unknown-membership", FoodId = unknown == "food" ? Guid.NewGuid() : ThreeAnchorFoodIds[0],
                DictionaryRevision = unknown == "release" ? "unknown-dictionary-release" : fixture.Head.Revision,
                DocumentRevision = fixture.Head.Revision, DocumentSha256 = fixture.Head.Sha256, GrocerySection = "Pantry",
                ProtectedFields = ["grocerySection"], PresentationSequence = "1", CreatedAt = at, UpdatedAt = at };
            db.HouseholdFoodOverrides.Add(row);
            await db.SaveChangesAsync();
            var before = JsonSerializer.Serialize(await db.HouseholdFoodOverrides.AsNoTracking().ToArrayAsync());
            var originalManifest = await File.ReadAllBytesAsync(Path.Combine(fixture.SnapshotRoot, "manifest.json"));
            var recovery = fixture.Services.GetRequiredService<RecoverySnapshotService>();
            await Assert.ThrowsAsync<InvalidDataException>(() => demo ? recovery.CaptureDemoAsync(default) : recovery.CaptureAsync(default));
            Assert.Equal(before, JsonSerializer.Serialize(await db.HouseholdFoodOverrides.AsNoTracking().ToArrayAsync()));
            Assert.Equal(originalManifest, await File.ReadAllBytesAsync(Path.Combine(fixture.SnapshotRoot, "manifest.json")));
            Assert.Null(fixture.Services.GetRequiredService<RecipesRootResolver>().Generation);
        });

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public Task VocabularyRecovery_DestinationPublicationWhileStagingRejectsBeforeJournal(bool demo) =>
        WithVocabularySnapshot(demo, fixture => WithStore(async (target, repository, _, _) =>
        {
            target.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = fixture.BackupRoot;
            if (demo) await PrepareDemoDestination(fixture, target);
            var db = target.GetRequiredService<RecipeDbContext>();
            var before = JsonSerializer.Serialize(await db.Recipes.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync());
            var beforeSource = await repository.GetRecipeJsonAsync(Id, default);
            FoodVocabularyReference? committed = null;
            var callback = new RecoveryAt("staged", async () =>
            {
                var result = await target.GetRequiredService<FoodVocabularyStore>().PublishReviewedAsync(
                    NextRecoveryDocument(fixture.Bytes, "concurrent-destination"), null, Guid.NewGuid(), "concurrent-destination-review");
                committed = result.NewHead;
            });
            var recovery = RecoveryWithCheckpoint(target, callback);
            await Assert.ThrowsAsync<RecoveryDestinationConflictException>(() => demo ? recovery.RestoreDemoAsync(null, default)
                : recovery.RestoreExactAsync(fixture.SnapshotId, default));
            Assert.True(callback.Reached);
            Assert.Equal(committed, (await target.GetRequiredService<FoodVocabularyStore>().CaptureActiveAsync())!.Reference);
            Assert.Equal(before, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync()));
            Assert.Equal(beforeSource, await repository.GetRecipeJsonAsync(Id, default));
            var roots = target.GetRequiredService<RecipesRootResolver>();
            Assert.Null(roots.Generation);
            Assert.False(File.Exists(Path.Combine(roots.BaseRoot, ".recovery-journal.json")));
            Assert.False(await db.RecoveryPublications.AnyAsync());
        }, localRecipeStore: true));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task VocabularyRecovery_FileMutationDuringCaptureRejectsAndKeepsPreviousIndependentSnapshot() =>
        WithVocabularySnapshot(false, async fixture =>
        {
            var roots = fixture.Services.GetRequiredService<RecipesRootResolver>();
            var document = Path.Combine(roots.Root, VocabularyPath(fixture.Head));
            var manifest = await File.ReadAllBytesAsync(Path.Combine(fixture.SnapshotRoot, "manifest.json"));
            var callback = new RecoveryAt("capture-locked", () => File.WriteAllTextAsync(document, "{}"));
            await Assert.ThrowsAsync<InvalidDataException>(() => RecoveryWithCheckpoint(fixture.Services, callback).CaptureAsync(default));
            Assert.True(callback.Reached);
            Assert.Equal(manifest, await File.ReadAllBytesAsync(Path.Combine(fixture.SnapshotRoot, "manifest.json")));
            await File.WriteAllBytesAsync(document, fixture.Bytes);
            Assert.Equal("completed", (await fixture.Services.GetRequiredService<RecoverySnapshotService>().CaptureAsync(default)).State);
        });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task VocabularyRecovery_QueuedVocabularyPublicationCannotMixFileAndDatabaseCapture() =>
        WithVocabularySnapshot(false, async fixture =>
        {
            Task? publication = null;
            FoodVocabularyReference? newHead = null;
            var callback = new RecoveryAt("capture-locked", async () =>
            {
                publication = Task.Run(async () =>
                {
                    using var writer = fixture.Services.CreateScope();
                    var result = await writer.ServiceProvider.GetRequiredService<FoodVocabularyStore>().PublishReviewedAsync(
                        NextRecoveryDocument(fixture.Bytes, "publication-after-snapshot"), fixture.Head, Guid.NewGuid(), "queued-capture-review");
                    newHead = result.NewHead;
                });
                await using var probe = new NpgsqlConnection(fixture.Services.GetRequiredService<RecipeDbContext>().Database.GetConnectionString());
                await probe.OpenAsync();
                var queued = false;
                for (var attempt = 0; attempt < 100; attempt++)
                {
                    queued = (bool)(await new NpgsqlCommand("SELECT EXISTS(SELECT 1 FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid WHERE a.datname=current_database() AND l.locktype='advisory' AND l.objid=244001 AND l.mode='ExclusiveLock' AND NOT l.granted)", probe).ExecuteScalarAsync())!;
                    if (queued) break;
                    await Task.Delay(10);
                }
                Assert.True(queued, "Actual vocabulary publisher must be waiting behind the capture lease.");
                Assert.False(publication.IsCompleted);
            });
            RecoveryResult captured;
            try { captured = await RecoveryWithCheckpoint(fixture.Services, callback).CaptureAsync(default); }
            finally { if (publication is not null) await publication; }
            Assert.True(callback.Reached);
            Assert.NotNull(newHead);
            Assert.NotEqual(fixture.Head, newHead);
            var root = Path.Combine(fixture.BackupRoot, captured.SnapshotId!.Value.ToString("N"));
            var index = FoodVocabularyInventoryQualification.ReadRecoveryIndex(await File.ReadAllBytesAsync(Path.Combine(root, "vocabulary", "index.json")));
            Assert.Equal(fixture.Head, FoodVocabularyStore.InspectMembership(index.MembershipRawJson!).ActiveRef);
            Assert.DoesNotContain(index.Documents, x => x.Reference == newHead);
            Assert.Equal(fixture.Bytes, await File.ReadAllBytesAsync(Path.Combine(root, "recipes", VocabularyPath(fixture.Head))));
            Assert.Equal(newHead, (await fixture.Services.GetRequiredService<FoodVocabularyStore>().CaptureActiveAsync())!.Reference);
        });
}
