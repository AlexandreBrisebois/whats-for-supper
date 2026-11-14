using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    private sealed record VocabularySnapshotFixture(IServiceProvider Services, string BackupRoot, string SnapshotRoot,
        Guid SnapshotId, FoodVocabularyReference Head, byte[] Bytes, bool Demo);

    private Task WithVocabularySnapshot(bool demo, Func<VocabularySnapshotFixture, Task> action) =>
        WithStore(async (services, _, publications, _) =>
        {
            var backups = Path.Combine(Path.GetTempPath(), "wfs-recovery-validation-" + Guid.NewGuid().ToString("N"));
            try
            {
                services.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = backups;
                var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                    "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
                var published = await services.GetRequiredService<FoodVocabularyStore>().PublishReviewedAsync(bytes, null,
                    Guid.NewGuid(), "recovery-validation-source");
                await publications.PublishAsync(await publications.CaptureAsync(Id), Candidate(), Guid.NewGuid());
                var recovery = services.GetRequiredService<RecoverySnapshotService>();
                var captured = demo ? await recovery.CaptureDemoAsync(default) : await recovery.CaptureAsync(default);
                var snapshotId = captured.SnapshotId!.Value;
                var snapshot = demo ? Path.Combine(services.GetRequiredService<DataRootResolver>().Root, "demo", snapshotId.ToString("N"))
                    : Path.Combine(backups, snapshotId.ToString("N"));
                await action(new(services, backups, snapshot, snapshotId, published.NewHead, bytes, demo));
            }
            finally { if (Directory.Exists(backups)) Directory.Delete(backups, true); }
        }, localRecipeStore: true);

    private static string VocabularyPath(FoodVocabularyReference reference) => ".household/food-vocabulary/" + reference.Revision + "-" + reference.Sha256 + ".json";

    private static byte[] NextRecoveryDocument(byte[] bytes, string revision)
    {
        var node = JsonNode.Parse(bytes)!;
        node["revision"] = revision;
        node["releases"]![0]!["revision"] = revision;
        return Encoding.UTF8.GetBytes(node.ToJsonString());
    }

    private static async Task RefreshRecoveryManifestFile(string root, string path)
    {
        var file = Path.Combine(root, path);
        var bytes = await File.ReadAllBytesAsync(file);
        var manifestPath = Path.Combine(root, "manifest.json");
        var manifest = JsonSerializer.Deserialize<RecoveryManifest>(await File.ReadAllTextAsync(manifestPath), JsonDefaults.CamelCase)!;
        manifest = manifest with { Files = manifest.Files.Select(x => x.Path == path
            ? new RecoveryFile(path, bytes.Length, Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(bytes))) : x).ToArray() };
        await File.WriteAllTextAsync(manifestPath, JsonSerializer.Serialize(manifest, JsonDefaults.CamelCase));
    }

    private static async Task PrepareDemoDestination(VocabularySnapshotFixture fixture, IServiceProvider destination)
    {
        var root = Path.Combine(destination.GetRequiredService<DataRootResolver>().Root, "demo");
        CopyRecoveryDirectory(fixture.SnapshotRoot, Path.Combine(root, fixture.SnapshotId.ToString("N")));
        await File.WriteAllTextAsync(Path.Combine(root, "current"), fixture.SnapshotId.ToString("N"));
    }

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false, "missing-document")]
    [InlineData(false, "checksum")]
    [InlineData(false, "unsupported-document")]
    [InlineData(false, "invalid-utf8")]
    [InlineData(false, "history")]
    [InlineData(false, "index")]
    [InlineData(true, "missing-document")]
    [InlineData(true, "checksum")]
    [InlineData(true, "unsupported-document")]
    [InlineData(true, "invalid-utf8")]
    [InlineData(true, "history")]
    [InlineData(true, "index")]
    public Task VocabularyRecovery_InvalidRequiredArtifactsRejectBeforeIndependentDestinationWrites(bool demo, string corruption) =>
        WithVocabularySnapshot(demo, async fixture =>
        {
            var documentPath = "recipes/" + VocabularyPath(fixture.Head);
            var document = Path.Combine(fixture.SnapshotRoot, documentPath);
            if (corruption == "missing-document") File.Delete(document);
            if (corruption == "checksum") await File.WriteAllTextAsync(document, "{}");
            if (corruption == "unsupported-document")
            {
                var node = JsonNode.Parse(fixture.Bytes)!;
                node["version"] = 99;
                await File.WriteAllTextAsync(document, node.ToJsonString());
                await RefreshRecoveryManifestFile(fixture.SnapshotRoot, documentPath);
            }
            if (corruption == "invalid-utf8")
            {
                await File.WriteAllBytesAsync(document, [0xff]);
                await RefreshRecoveryManifestFile(fixture.SnapshotRoot, documentPath);
            }
            if (corruption == "history")
            {
                await File.WriteAllTextAsync(Path.Combine(fixture.SnapshotRoot, "vocabulary", "history-observations.json"), "{}");
                await RefreshRecoveryManifestFile(fixture.SnapshotRoot, "vocabulary/history-observations.json");
            }
            if (corruption == "index")
            {
                var path = Path.Combine(fixture.SnapshotRoot, "vocabulary", "index.json");
                var node = JsonNode.Parse(await File.ReadAllBytesAsync(path))!;
                node["documents"]![0]!["reference"]!["revision"] = "unknown-release";
                await File.WriteAllTextAsync(path, node.ToJsonString());
                await RefreshRecoveryManifestFile(fixture.SnapshotRoot, "vocabulary/index.json");
            }
            var provider = new Mock<IChatClient>(MockBehavior.Strict);
            await WithStore(async (target, repository, _, _) =>
            {
                target.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = fixture.BackupRoot;
                if (demo) await PrepareDemoDestination(fixture, target);
                var db = target.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                recipe.Name = "Retain destination after invalid source";
                await db.SaveChangesAsync();
                var before = JsonSerializer.Serialize(await db.Recipes.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync());
                var source = await repository.GetRecipeJsonAsync(Id, default);
                var recovery = target.GetRequiredService<RecoverySnapshotService>();
                await Assert.ThrowsAsync<InvalidDataException>(() => demo ? recovery.RestoreDemoAsync(null, default)
                    : recovery.RestoreExactAsync(fixture.SnapshotId, default));
                db.ChangeTracker.Clear();
                Assert.Equal(before, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync()));
                Assert.Equal(source, await repository.GetRecipeJsonAsync(Id, default));
                var roots = target.GetRequiredService<RecipesRootResolver>();
                Assert.Null(roots.Generation);
                Assert.False(File.Exists(Path.Combine(roots.BaseRoot, ".recovery-journal.json")));
                Assert.False(await db.RecoveryPublications.AnyAsync());
                Assert.Empty(provider.Invocations);
            }, localRecipeStore: true, configureServices: registrations =>
            {
                registrations.RemoveAll<IChatClient>();
                registrations.AddSingleton(provider.Object);
            });
        });

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public Task VocabularyRecovery_DifferentDestinationRequiresReviewedCASAndRetainsHistoryOnlyDocuments(bool demo) =>
        WithVocabularySnapshot(demo, fixture => WithStore(async (target, _, _, storage) =>
        {
            target.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = fixture.BackupRoot;
            if (demo) await PrepareDemoDestination(fixture, target);
            var vocabulary = target.GetRequiredService<FoodVocabularyStore>();
            var bytesB = NextRecoveryDocument(fixture.Bytes, "independent-target-B");
            var b = await vocabulary.PublishReviewedAsync(bytesB, null, Guid.NewGuid(), "recovery-destination-B");
            var recovery = target.GetRequiredService<RecoverySnapshotService>();
            if (!demo)
            {
                var before = await vocabulary.CaptureActiveAsync();
                await Assert.ThrowsAsync<RecoveryDestinationConflictException>(() => recovery.RestoreExactAsync(fixture.SnapshotId, default));
                Assert.Equal(before!.Reference, (await vocabulary.CaptureActiveAsync())!.Reference);
                var preflight = await recovery.PreflightRestoreAsync(fixture.SnapshotId, default);
                Assert.True(preflight.RequiresExpectedDestinationRevision);
                Assert.Contains(b.NewHead, preflight.Destination.Documents);
                await Assert.ThrowsAsync<RecoveryDestinationConflictException>(() => recovery.RestoreExactAsync(fixture.SnapshotId, default, new string('0', 64)));
                await vocabulary.PublishReviewedAsync(NextRecoveryDocument(fixture.Bytes, "independent-target-C"), b.NewHead,
                    Guid.NewGuid(), "recovery-destination-C");
                await Assert.ThrowsAsync<RecoveryDestinationConflictException>(() => recovery.RestoreExactAsync(fixture.SnapshotId, default, preflight.Destination.Revision));
                var refreshed = await recovery.PreflightRestoreAsync(fixture.SnapshotId, default);
                await recovery.RestoreExactAsync(fixture.SnapshotId, default, refreshed.Destination.Revision);
            }
            else await recovery.RestoreDemoAsync(null, default);
            Assert.Equal(fixture.Head, (await vocabulary.CaptureActiveAsync())!.Reference);
            Assert.Equal(bytesB, await storage.LoadAsync("recipes", VocabularyPath(b.NewHead)));
            using (var restart = target.CreateScope())
                Assert.Equal(fixture.Head, (await restart.ServiceProvider.GetRequiredService<FoodVocabularyStore>().CaptureActiveAsync())!.Reference);
            var reexport = await recovery.CaptureAsync(default);
            var reexportRoot = Path.Combine(fixture.BackupRoot, reexport.SnapshotId!.Value.ToString("N"));
            var index = FoodVocabularyInventoryQualification.ReadRecoveryIndex(await File.ReadAllBytesAsync(Path.Combine(reexportRoot, "vocabulary", "index.json")));
            Assert.DoesNotContain(b.NewHead, FoodVocabularyStore.InspectMembership(index.MembershipRawJson!).References);
            Assert.Contains(index.Origins, x => x.Reference == b.NewHead && x.OwnerKind == "membership");
            Assert.Equal(bytesB, await File.ReadAllBytesAsync(Path.Combine(reexportRoot, "recipes", VocabularyPath(b.NewHead))));
            var roots = target.GetRequiredService<RecipesRootResolver>();
            var historyOnly = Path.Combine(roots.Root, VocabularyPath(b.NewHead));
            File.Delete(historyOnly);
            await Assert.ThrowsAsync<InvalidDataException>(() => recovery.CaptureAsync(default));
            await File.WriteAllTextAsync(historyOnly, "{}");
            await Assert.ThrowsAsync<InvalidDataException>(() => recovery.CaptureAsync(default));
            await File.WriteAllBytesAsync(historyOnly, bytesB);
            Assert.Equal("completed", (await recovery.CaptureAsync(default)).State);
        }, localRecipeStore: true));

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false, "staged")]
    [InlineData(false, "journal")]
    [InlineData(false, "pointer")]
    [InlineData(false, "committed")]
    [InlineData(true, "staged")]
    [InlineData(true, "journal")]
    [InlineData(true, "pointer")]
    [InlineData(true, "committed")]
    public Task VocabularyRecovery_CurrentDocumentsResumeAfterInterruptionAndReplayWithoutReseed(bool demo, string point) =>
        WithVocabularySnapshot(demo, fixture => WithStore(async (target, _, _, storage) =>
        {
            target.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = fixture.BackupRoot;
            if (demo) await PrepareDemoDestination(fixture, target);
            var callback = new RecoveryAt(point, () => throw new IOException("Synthetic interruption at " + point));
            var interrupted = RecoveryWithCheckpoint(target, callback);
            var error = await Assert.ThrowsAsync<IOException>(() => demo ? interrupted.RestoreDemoAsync(null, default)
                : interrupted.RestoreExactAsync(fixture.SnapshotId, default));
            Assert.Contains(point, error.Message);
            using var restart = target.CreateScope();
            var recovery = restart.ServiceProvider.GetRequiredService<RecoverySnapshotService>();
            await recovery.ResumeAsync(default);
            if (demo)
            {
                await recovery.RestoreDemoAsync(null, default);
                await recovery.RestoreDemoAsync(null, default);
            }
            else
            {
                await recovery.RestoreExactAsync(fixture.SnapshotId, default);
                await recovery.RestoreExactAsync(fixture.SnapshotId, default);
            }
            Assert.Equal(fixture.Head, (await restart.ServiceProvider.GetRequiredService<FoodVocabularyStore>().CaptureActiveAsync())!.Reference);
            Assert.Equal(fixture.Bytes, await storage.LoadAsync("recipes", VocabularyPath(fixture.Head)));
            var reexport = await recovery.CaptureAsync(default);
            Assert.Equal(fixture.Bytes, await File.ReadAllBytesAsync(Path.Combine(fixture.BackupRoot, reexport.SnapshotId!.Value.ToString("N"), "recipes", VocabularyPath(fixture.Head))));
            Assert.False(File.Exists(Path.Combine(target.GetRequiredService<RecipesRootResolver>().BaseRoot, ".recovery-journal.json")));
        }, localRecipeStore: true));
    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("schema")]
    [InlineData("weekly-history")]
    [InlineData("row-shape")]
    [InlineData("foreign-key")]
    public Task VocabularyRecovery_PreflightRejectsUnrestorableSnapshotWithoutStagingOrLiveWrites(string corruption) =>
        WithVocabularySnapshot(false, async fixture =>
        {
            var manifestPath = Path.Combine(fixture.SnapshotRoot, "manifest.json");
            if (corruption == "schema")
            {
                var manifest = JsonSerializer.Deserialize<RecoveryManifest>(await File.ReadAllTextAsync(manifestPath), JsonDefaults.CamelCase)!;
                await File.WriteAllTextAsync(manifestPath, JsonSerializer.Serialize(manifest with { Schema = new string('0', 64) }, JsonDefaults.CamelCase));
            }
            if (corruption == "weekly-history")
            {
                await File.WriteAllTextAsync(Path.Combine(fixture.SnapshotRoot, "weekly-household-interest.json"),
                    JsonSerializer.Serialize(new { version = 2, generation = Guid.NewGuid(), rows = Array.Empty<object>() }));
                await RefreshRecoveryManifestFile(fixture.SnapshotRoot, "weekly-household-interest.json");
            }
            if (corruption == "row-shape")
            {
                var path = "tables/weekly_plans.json";
                var rows = JsonNode.Parse(await File.ReadAllTextAsync(Path.Combine(fixture.SnapshotRoot, path)))!.AsArray();
                Assert.NotEmpty(rows);
                rows[0]!["unrecognized_recovery_field"] = true;
                await File.WriteAllTextAsync(Path.Combine(fixture.SnapshotRoot, path), rows.ToJsonString());
                await RefreshRecoveryManifestFile(fixture.SnapshotRoot, path);
            }
            if (corruption == "foreign-key")
            {
                var sourceDb = fixture.Services.GetRequiredService<RecipeDbContext>();
                var calendar = new CalendarEvent { Id = Guid.NewGuid(), RecipeId = Id, Date = new DateOnly(2030, 1, 1), Status = CalendarEventStatus.Planned };
                sourceDb.CalendarEvents.Add(calendar);
                await sourceDb.SaveChangesAsync();
                await using var connection = new Npgsql.NpgsqlConnection(sourceDb.Database.GetConnectionString());
                await connection.OpenAsync();
                var row = JsonNode.Parse((string)(await new Npgsql.NpgsqlCommand($"SELECT to_jsonb(e)::text FROM calendar_events e WHERE id='{calendar.Id}'", connection).ExecuteScalarAsync())!)!;
                row["recipe_id"] = Guid.NewGuid();
                var path = "tables/calendar_events.json";
                var rows = JsonNode.Parse(await File.ReadAllTextAsync(Path.Combine(fixture.SnapshotRoot, path)))!.AsArray();
                rows.Add(row);
                await File.WriteAllTextAsync(Path.Combine(fixture.SnapshotRoot, path), rows.ToJsonString());
                await RefreshRecoveryManifestFile(fixture.SnapshotRoot, path);
            }
            await WithStore(async (target, repository, _, _) =>
            {
                target.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = fixture.BackupRoot;
                var db = target.GetRequiredService<RecipeDbContext>();
                var beforeRows = JsonSerializer.Serialize(await db.Recipes.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync());
                var beforeFiles = Directory.GetFiles(target.GetRequiredService<RecipesRootResolver>().BaseRoot, "*", SearchOption.AllDirectories).Order().ToArray();
                var beforeSource = await repository.GetRecipeJsonAsync(Id, default);
                await Assert.ThrowsAsync<InvalidDataException>(() => target.GetRequiredService<RecoverySnapshotService>().PreflightRestoreAsync(fixture.SnapshotId, default));
                Assert.Equal(beforeRows, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync()));
                Assert.Equal(beforeSource, await repository.GetRecipeJsonAsync(Id, default));
                Assert.Equal(beforeFiles, Directory.GetFiles(target.GetRequiredService<RecipesRootResolver>().BaseRoot, "*", SearchOption.AllDirectories).Order().ToArray());
                Assert.Null(target.GetRequiredService<RecipesRootResolver>().Generation);
                Assert.False(await db.RecoveryPublications.AnyAsync());
            }, localRecipeStore: true);
        });

}
