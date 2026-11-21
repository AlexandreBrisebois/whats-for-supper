using System.Text;
using System.Text.Json.Nodes;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed partial class BilingualShoppingIdentityPostgresTests(ITestOutputHelper output)
{
    private async Task WithHousehold(Func<TestWebApplicationFactory, Task> action)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var backupRoot = Path.Combine(Path.GetTempPath(), "wfs-bounded-backup-" + Guid.NewGuid().ToString("N"));
            try
            {
                await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
                    new DeploymentCalendarIntegrationTests.CalendarClock(), new()
                    {
                        ["Calendar:TimeZone"] = "America/Toronto",
                        ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                        ["Tests:LocalRecipeStore"] = "true",
                        ["Recovery:BackupRoot"] = backupRoot
                    });
                await TomorrowPushPostgresTests.Seed(factory);
                await action(factory);
            }
            finally { if (Directory.Exists(backupRoot)) Directory.Delete(backupRoot, true); }
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Publication_OneReleaseRevisionCannotAcquireDifferentRawBytes() =>
        WithHousehold(async factory =>
        {
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            var vocabulary = services.GetRequiredService<FoodVocabularyStore>();
            var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
            var installed = await vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "bounded-review:initial");
            var before = (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText();
            var root = services.GetRequiredService<RecipesRootResolver>().Root;
            var files = Directory.GetFiles(Path.Combine(root, ".household", "food-vocabulary"));
            var changed = JsonNode.Parse(bytes)!;
            changed["sourceRef"] = "different-provenance-under-the-same-release-revision";
            var differentBytes = Encoding.UTF8.GetBytes(changed.ToJsonString());

            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.PublishReviewedAsync(
                differentBytes, installed.NewHead, Guid.NewGuid(), "bounded-review:conflicting-revision"));

            Assert.Equal(before, (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText());
            Assert.Equal(files, Directory.GetFiles(Path.Combine(root, ".household", "food-vocabulary")));
            Assert.Equal(bytes, (await vocabulary.CaptureActiveAsync())!.RawBytes);
        });

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false, false)]
    [InlineData(false, true)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public Task InterruptedPublication_RevalidatesEveryRetainedFileBeforeResuming(bool afterWrite, bool corrupt) =>
        WithHousehold(async factory =>
        {
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            var storage = services.GetRequiredService<IStorageProvider>();
            var vocabulary = services.GetRequiredService<FoodVocabularyStore>();
            var bytesA = BoundedVocabularyInput.Bytes();
            var a = await vocabulary.PublishReviewedAsync(bytesA, null, Guid.NewGuid(), BoundedVocabularyInput.ReviewIdentity);
            var node = JsonNode.Parse(bytesA)!;
            node["revision"] = "bounded-interrupted-B";
            node["releases"]![0]!["revision"] = "bounded-interrupted-B";
            var bytesB = Encoding.UTF8.GetBytes(node.ToJsonString());
            var interrupted = new InterruptedVocabularyStorage(storage, afterWrite);
            var publisher = new FoodVocabularyStore(db, interrupted, services.GetRequiredService<RecipesRootResolver>(),
                services.GetRequiredService<RecoveryBoundary>(), services.GetRequiredService<IClock>());
            var operation = Guid.NewGuid();
            await Assert.ThrowsAsync<IOException>(() => publisher.PublishReviewedAsync(bytesB, a.NewHead, operation, "bounded-review:B"));
            var prepared = (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText();
            var key = $".household/food-vocabulary/{a.NewHead.Revision}-{a.NewHead.Sha256}.json";
            if (corrupt) await storage.SaveAtomicallyAsync("recipes", key, Encoding.UTF8.GetBytes("{}"));
            else await storage.DeleteAtomicallyAsync("recipes", key);
            var filesBefore = VocabularyFiles(services);
            interrupted.Interrupt = false;

            await Assert.ThrowsAsync<InvalidDataException>(() => publisher.PublishReviewedAsync(bytesB, a.NewHead, operation, "bounded-review:B"));

            Assert.Equal(prepared, (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText());
            Assert.Equal(filesBefore, VocabularyFiles(services));
            await storage.SaveAtomicallyAsync("recipes", key, bytesA);
            var completed = await publisher.PublishReviewedAsync(bytesB, a.NewHead, operation, "bounded-review:B");
            Assert.Equal(bytesB, (await vocabulary.CaptureActiveAsync())!.RawBytes);
            Assert.Equal(completed, await publisher.PublishReviewedAsync(bytesB, a.NewHead, operation, "bounded-review:B"));
            Assert.Equal(bytesA, (await vocabulary.LoadCapturedAsync(a.NewHead)).RawBytes);
        });

    private static string VocabularyFiles(IServiceProvider services)
    {
        var root = Path.Combine(services.GetRequiredService<RecipesRootResolver>().Root, ".household", "food-vocabulary");
        return JsonSerializer.Serialize(Directory.GetFiles(root).Order(StringComparer.Ordinal)
            .Select(path => new { Name = Path.GetFileName(path), Sha256 = FoodVocabularyDefinitions.Sha256(File.ReadAllBytes(path)) }));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Publication_CollisionsStaleHeadsAndForeignRawHashesRejectBeforeAnyWrites() =>
        WithHousehold(async factory =>
        {
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            var vocabulary = services.GetRequiredService<FoodVocabularyStore>();
            var installed = await vocabulary.PublishReviewedAsync(BoundedVocabularyInput.Bytes(), null, Guid.NewGuid(), BoundedVocabularyInput.ReviewIdentity);
            var membership = (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText();
            var files = VocabularyFiles(services);
            var collision = JsonNode.Parse(BoundedVocabularyInput.Bytes())!;
            collision["releases"]![0]!["foods"]![1]!["aliases"]![0]!["text"] = "onion";
            collision["releases"]![0]!["foods"]![1]!["aliases"]![0]!["matchKey"] = "onion";
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.PublishReviewedAsync(
                Encoding.UTF8.GetBytes(collision.ToJsonString()), installed.NewHead, Guid.NewGuid(), "rejected-collision"));
            foreach (var expected in new FoodVocabularyReference?[] { null,
                installed.NewHead with { Sha256 = new string('f', 64) }, installed.NewHead with { Revision = "foreign-release" } })
                await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.PublishReviewedAsync(
                    BoundedVocabularyInput.Bytes(), expected, Guid.NewGuid(), "rejected-stale-head"));
            Assert.Equal(membership, (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText());
            Assert.Equal(files, VocabularyFiles(services));
        });

    private sealed class InterruptedVocabularyStorage(IStorageProvider inner, bool afterWrite) : IStorageProvider
    {
        public bool Interrupt { get; set; } = true;
        public Task SaveAsync(string partition, string key, string value) => inner.SaveAsync(partition, key, value);
        public Task SaveAsync(string partition, string key, byte[] value) => inner.SaveAsync(partition, key, value);
        public async Task SaveAtomicallyAsync(string partition, string key, byte[] value)
        {
            var vocabulary = partition == "recipes" && key.StartsWith(".household/food-vocabulary/", StringComparison.Ordinal);
            if (vocabulary && Interrupt && !afterWrite) throw new IOException("Controlled pre-file interruption.");
            await inner.SaveAtomicallyAsync(partition, key, value);
            if (vocabulary && Interrupt && afterWrite) throw new IOException("Controlled lost file reply.");
        }
        public Task DeleteAtomicallyAsync(string partition, string key) => inner.DeleteAtomicallyAsync(partition, key);
        public Task<byte[]?> LoadAsync(string partition, string key) => inner.LoadAsync(partition, key);
        public Task<List<KeyValuePair<string, string>>> FindAsync(string partition, string key) => inner.FindAsync(partition, key);
        public List<string> List(string partition) => inner.List(partition);
    }
}
