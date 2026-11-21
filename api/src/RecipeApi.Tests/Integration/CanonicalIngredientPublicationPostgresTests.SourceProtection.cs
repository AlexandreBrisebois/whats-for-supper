using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("unchanged")]
    [InlineData("recipe")]
    [InlineData("history")]
    [InlineData("original")]
    [InlineData("hero")]
    [InlineData("vocabulary")]
    [InlineData("orphan-original")]
    [InlineData("derived-metadata")]
    public Task VocabularyRecovery_SourceProtectionComparesProtectedFactsAndBytes(string change) =>
        WithStore(async (services, repository, _, storage) =>
        {
            var backup = Path.Combine(Path.GetTempPath(), "wfs-source-protection-" + Guid.NewGuid().ToString("N"));
            services.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = backup;
            var db = services.GetRequiredService<RecipeDbContext>();
            var roots = services.GetRequiredService<RecipesRootResolver>();
            var snapshots = services.GetRequiredService<RecoverySnapshotService>();
            try
            {
                var definitions = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                    "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
                await services.GetRequiredService<FoodVocabularyStore>().PublishReviewedAsync(definitions, null,
                    Guid.NewGuid(), "source-protection-disposable-fixture");
                await storage.SaveAsync("recipes", $"{Id}/hero.webp", new byte[] { 7, 8, 9 });
                var workflow = new WorkflowInstance
                {
                    Id = Guid.NewGuid(), WorkflowId = "source-protection-fixture", Status = WorkflowStatus.Completed,
                    Parameters = "{\"preserved\":true}", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
                };
                db.WorkflowInstances.Add(workflow);
                await db.SaveChangesAsync();
                var snapshot = await snapshots.CaptureAsync(default);
                Assert.Equal("completed", snapshot.State);
                var snapshotId = snapshot.SnapshotId!.Value;
                var snapshotRoot = Path.Combine(backup, snapshotId.ToString("N"));
                var manifest = await File.ReadAllBytesAsync(Path.Combine(snapshotRoot, "manifest.json"));
                var before = await SourceProtectionCall(snapshots, "RequireSourceCoverageAsync", snapshotId);
                Assert.Contains("recipes", before.GetProperty("tables").EnumerateObject().Select(x => x.Name));
                Assert.Contains(before.GetProperty("files").EnumerateArray(), x => x.GetProperty("path").GetString() == $"recipes/{Id}/original/content.html");
                Assert.Contains("recipe metadata and search sidecars", before.GetProperty("derivedOmissions").EnumerateArray().Select(x => x.GetString()));

                switch (change)
                {
                    case "recipe":
                        var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                        recipe.Notes = "Human note after the captured backup";
                        await db.SaveChangesAsync();
                        break;
                    case "history":
                        workflow.Parameters = "{\"preserved\":false}";
                        await db.SaveChangesAsync();
                        break;
                    case "original":
                        await repository.SaveContentHtmlAsync(Id, "Different protected source", default);
                        break;
                    case "hero":
                        await storage.SaveAsync("recipes", $"{Id}/hero.webp", new byte[] { 9, 8, 7 });
                        break;
                    case "vocabulary":
                        await storage.SaveAsync("recipes", ThreeAnchorStorageKey, definitions.Concat(new byte[] { 32 }).ToArray());
                        break;
                    case "orphan-original":
                        await storage.SaveAsync("recipes", $"{Guid.NewGuid()}/original/source.txt", "Uncovered source bytes");
                        break;
                    case "derived-metadata":
                        await storage.SaveAsync("recipes", $"{Id}/info.json", "{\"derived\":true}");
                        break;
                }

                if (change is "unchanged" or "derived-metadata")
                {
                    var after = await SourceProtectionCall(snapshots, "RequireSourceCoverageAsync", snapshotId);
                    Assert.Equal(before.GetRawText(), after.GetRawText());
                }
                else
                    await Assert.ThrowsAsync<InvalidDataException>(() => SourceProtectionCall(snapshots, "RequireSourceCoverageAsync", snapshotId));

                Assert.Equal(manifest, await File.ReadAllBytesAsync(Path.Combine(snapshotRoot, "manifest.json")));
                Assert.Null(roots.Generation);
                Assert.False(File.Exists(Path.Combine(roots.BaseRoot, ".recovery-journal.json")));
                Assert.False(Directory.Exists(Path.Combine(roots.BaseRoot, ".recovery-generations")));
                Assert.False(await db.RecoveryPublications.AnyAsync());
            }
            finally
            {
                if (Directory.Exists(backup)) Directory.Delete(backup, true);
            }
        }, localRecipeStore: true);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task VocabularyRecovery_SourceProtectionRejectsRetainedHistoryPublishedDuringInspection()
    {
        Func<Task>? publishHistory = null;
        var checkpoint = new SourceProtectionHistoryCheckpoint(() => publishHistory?.Invoke() ?? Task.CompletedTask);
        return WithStore(async (services, _, _, storage) =>
        {
            var backup = Path.Combine(Path.GetTempPath(), "wfs-source-history-race-" + Guid.NewGuid().ToString("N"));
            services.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = backup;
            var snapshots = services.GetRequiredService<RecoverySnapshotService>();
            try
            {
                var captured = await snapshots.CaptureAsync(default);
                var vocabulary = services.GetRequiredService<FoodVocabularyStore>();
                var observe = typeof(FoodVocabularyStore).GetMethod("ObserveInventoryFactsAsync", BindingFlags.Instance | BindingFlags.NonPublic)!;
                var pending = (Task)observe.Invoke(vocabulary, [CancellationToken.None])!;
                await pending;
                var facts = (FoodVocabularyInventoryFacts)pending.GetType().GetProperty("Result")!.GetValue(pending)!;
                var retained = FoodVocabularyInventoryQualification.WriteHistoryObservations(facts, "destination", null,
                    Guid.NewGuid(), services.GetRequiredService<RecipesRootResolver>().Generation);
                publishHistory = () => storage.SaveAsync("recipes", ".household/food-vocabulary/history-observations.json", retained);
                await Assert.ThrowsAsync<InvalidDataException>(() => SourceProtectionCall(snapshots,
                    "RequireSourceCoverageAsync", captured.SnapshotId!.Value));
                Assert.Equal(retained, await storage.LoadAsync("recipes", ".household/food-vocabulary/history-observations.json"));
                Assert.False(await services.GetRequiredService<RecipeDbContext>().RecoveryPublications.AnyAsync());
            }
            finally
            {
                if (Directory.Exists(backup)) Directory.Delete(backup, true);
            }
        }, localRecipeStore: true, configureServices: registrations => registrations.AddSingleton<IRecoveryCheckpoint>(checkpoint));
    }

    private sealed class SourceProtectionHistoryCheckpoint(Func<Task> publish) : IRecoveryCheckpoint
    {
        public Task ReachedAsync(string name, CancellationToken ct) =>
            name == "source-protection-observed" ? publish() : Task.CompletedTask;
    }

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("InspectSourceProtectionAsync")]
    [InlineData("RequireSourceCoverageAsync")]
    public Task VocabularyRecovery_SourceProtectionRejectsRehashedUnrestorableSnapshot(string operation) =>
        WithStore(async (services, _, _, _) =>
        {
            var backup = Path.Combine(Path.GetTempPath(), "wfs-source-invalid-history-" + Guid.NewGuid().ToString("N"));
            services.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = backup;
            try
            {
                var snapshots = services.GetRequiredService<RecoverySnapshotService>();
                var captured = await snapshots.CaptureAsync(default);
                var root = Path.Combine(backup, captured.SnapshotId!.Value.ToString("N"));
                var manifestPath = Path.Combine(root, "manifest.json");
                var manifest = JsonSerializer.Deserialize<RecoveryManifest>(await File.ReadAllTextAsync(manifestPath), JsonDefaults.CamelCase)!;
                var invalidHistory = Encoding.UTF8.GetBytes("{}");
                await File.WriteAllBytesAsync(Path.Combine(root, "weekly-household-interest.json"), invalidHistory);
                var changed = manifest with
                {
                    Files = manifest.Files.Select(file => file.Path == "weekly-household-interest.json"
                        ? file with { Length = invalidHistory.LongLength, Sha256 = Convert.ToHexString(SHA256.HashData(invalidHistory)) }
                        : file).ToArray()
                };
                await File.WriteAllTextAsync(manifestPath, JsonSerializer.Serialize(changed, JsonDefaults.CamelCase));
                await Assert.ThrowsAsync<InvalidDataException>(() => SourceProtectionCall(snapshots,
                    operation, captured.SnapshotId.Value));
                Assert.False(await services.GetRequiredService<RecipeDbContext>().RecoveryPublications.AnyAsync());
            }
            finally
            {
                if (Directory.Exists(backup)) Directory.Delete(backup, true);
            }
        }, localRecipeStore: true);

    private static async Task<JsonElement> SourceProtectionCall(RecoverySnapshotService snapshots, string name, Guid snapshotId)
    {
        var method = typeof(RecoverySnapshotService).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic);
        Assert.NotNull(method);
        var pending = (Task)method.Invoke(snapshots, [snapshotId, CancellationToken.None])!;
        await pending;
        return JsonSerializer.SerializeToElement(pending.GetType().GetProperty("Result")!.GetValue(pending), JsonDefaults.CamelCase);
    }
}
