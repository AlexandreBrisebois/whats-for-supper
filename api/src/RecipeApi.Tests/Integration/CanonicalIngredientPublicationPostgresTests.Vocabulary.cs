using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task VocabularyPublication_TrackedOldHeadCannotOverwriteAnotherContextsCommittedHeadOrDropOutcomes() =>
        WithStore(async (services, _, _, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var clock = services.GetRequiredService<IClock>();
            var first = TestPublicationStore.Vocabulary(db, storage, clock, services);
            var bytesA = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
            byte[] Next(string revision)
            {
                var node = JsonNode.Parse(bytesA)!;
                node["revision"] = revision;
                node["releases"]![0]!["revision"] = revision;
                return Encoding.UTF8.GetBytes(node.ToJsonString());
            }
            var operationA = Guid.NewGuid();
            var a = await first.PublishReviewedAsync(bytesA, null, operationA, "test-review:A");
            Assert.Single(db.ChangeTracker.Entries<FamilySetting>().Where(x => x.Entity.Key == "food_vocabulary_publication"));
            await using var secondDb = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
                .UseNpgsql(db.Database.GetConnectionString()).Options);
            var second = TestPublicationStore.Vocabulary(secondDb, storage, clock, services);
            var operationB = Guid.NewGuid();
            var b = await second.PublishReviewedAsync(Next("fixture-context-B"), a.NewHead, operationB, "test-review:B");
            var before = (await secondDb.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText();
            Assert.Equal(a, await first.PublishReviewedAsync(bytesA, null, operationA, "test-review:A"));
            var pending = new FamilySetting { Key = "bilingual-unrelated-pending", Value = JsonSerializer.SerializeToElement(new { value = "keep" }) };
            db.FamilySettings.Add(pending);
            var bytesC = Next("fixture-context-C");
            var operationC = Guid.NewGuid();
            var rejection = await Record.ExceptionAsync(() => first.PublishReviewedAsync(bytesC, a.NewHead, operationC, "test-review:C"));
            var after = (await secondDb.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText();
            output.WriteLine($"Stale expected-A publication: exception={rejection?.GetType().Name ?? "none"}; expected current head={b.NewHead}; observed={FoodVocabularyStore.InspectMembership(after).ActiveRef}");
            Assert.Equal(before, after); // RED: stale S1 overwrites B with A+C.
            Assert.IsType<InvalidDataException>(rejection);
            Assert.Equal(EntityState.Added, db.Entry(pending).State);
            Assert.False(await secondDb.FamilySettings.AsNoTracking().AnyAsync(x => x.Key == pending.Key));
            var c = await first.PublishReviewedAsync(bytesC, b.NewHead, operationC, "test-review:C");
            Assert.Equal(c.NewHead, (await second.CaptureActiveAsync())!.Reference);
            var committed = (await secondDb.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value;
            Assert.Equal(3, committed.GetProperty("operations").GetArrayLength());
            Assert.Contains(committed.GetProperty("operations").EnumerateArray(), x => x.GetProperty("operationId").GetGuid() == operationB);
            Assert.Equal(3, FoodVocabularyStore.InspectMembership(committed.GetRawText()).References.Count);
            Assert.Equal(a, await first.PublishReviewedAsync(bytesA, null, operationA, "test-review:A"));
            Assert.Equal(c.NewHead, (await second.CaptureActiveAsync())!.Reference);
            Assert.Equal("keep", (await secondDb.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == pending.Key)).Value.GetProperty("value").GetString());
        }, localRecipeStore: true);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task VocabularyFirstInstall_AllowsUnreferencedV4ButNeverReseedsMissingReferencedMembership() =>
        WithStore(async (services, _, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            await store.PublishAsync(await store.CaptureAsync(Id), Candidate(), Guid.NewGuid());
            var vocabulary = new FoodVocabularyStore(db, storage, services.GetRequiredService<RecipesRootResolver>(),
                services.GetRequiredService<RecoveryBoundary>(), services.GetRequiredService<IClock>());
            Assert.Null(await vocabulary.CaptureActiveAsync());
            var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
            var installed = await vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "test-review:first-install");
            await store.PublishAsync(await store.CaptureAsync(Id), Candidate(), Guid.NewGuid());
            var member = await db.FamilySettings.SingleAsync(x => x.Key == "food_vocabulary_publication");
            db.FamilySettings.Remove(member);
            await db.SaveChangesAsync();
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.CaptureActiveAsync());
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "cannot-reseed"));
            Assert.Equal(bytes, await storage.LoadAsync("recipes", ".household/food-vocabulary/" + installed.NewHead.Revision + "-" + installed.NewHead.Sha256 + ".json"));
            Assert.False(await db.FamilySettings.AnyAsync(x => x.Key == "food_vocabulary_publication"));
        }, localRecipeStore: true);

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public Task VocabularyPublication_PreparedFileInterruptionResumesSameOperationWithoutInstallingDifferentInput(bool afterWrite) =>
        WithStore(async (services, _, _, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var interrupted = new VocabularyInterruptedStorage(storage, afterWrite);
            var vocabulary = new FoodVocabularyStore(db, interrupted, services.GetRequiredService<RecipesRootResolver>(),
                services.GetRequiredService<RecoveryBoundary>(), services.GetRequiredService<IClock>());
            var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
            var operation = Guid.NewGuid();
            await Assert.ThrowsAsync<IOException>(() => vocabulary.PublishReviewedAsync(bytes, null, operation, "test-review:interruption"));
            var prepared = (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText();
            Assert.True(FoodVocabularyStore.InspectMembership(prepared).HasPrepared);
            Assert.Null(FoodVocabularyStore.InspectMembership(prepared).ActiveRef);
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.CaptureActiveAsync());
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.PublishReviewedAsync(bytes, null, operation, "different-review"));
            Assert.Equal(prepared, (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText());
            interrupted.Interrupt = false;
            var outcome = await vocabulary.PublishReviewedAsync(bytes, null, operation, "test-review:interruption");
            Assert.Equal(outcome.NewHead, (await vocabulary.CaptureActiveAsync())!.Reference);
            Assert.False(FoodVocabularyStore.InspectMembership((await db.FamilySettings.AsNoTracking()
                .SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText()).HasPrepared);
            Assert.Equal(1, interrupted.CompletedVocabularyWrites);
            Assert.Equal(outcome, await vocabulary.PublishReviewedAsync(bytes, null, operation, "test-review:interruption"));
            Assert.Equal(1, interrupted.CompletedVocabularyWrites);
        }, localRecipeStore: true);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task VocabularySource_CapturedAStillDecidesAfterHeadBAndDeliveredReplayNeverRemaps() =>
        WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var vocabulary = new FoodVocabularyStore(db, storage, services.GetRequiredService<RecipesRootResolver>(),
                services.GetRequiredService<RecoveryBoundary>(), services.GetRequiredService<IClock>());
            var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
            var a = await vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "test-review:A");
            var (id, extraction) = await WholeUseImport(services, store, storage, photo: false);
            var node = JsonNode.Parse(bytes)!;
            node["revision"] = "fixture-three-anchor-v2";
            node["releases"]![0]!["revision"] = "fixture-three-anchor-v2";
            node["releases"]![0]!["foods"]![0]!["revision"] = "fixture-three-anchor-v2/food-1";
            node["releases"]![0]!["foods"]![0]!["aliases"]!.AsArray().RemoveAt(0);
            var b = await vocabulary.PublishReviewedAsync(Encoding.UTF8.GetBytes(node.ToJsonString()), a.NewHead, Guid.NewGuid(), "test-review:B");
            Assert.Null((await vocabulary.CaptureActiveAsync())!.Definitions().Resolve("onion"));
            var chat = new Mock<IChatClient>();
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                    """{"name":"Captured A","recipeYield":"4 servings","recipeIngredient":["25 g onion"],"supply":[{"name":"onion","requiredQuantity":{"value":25,"unitText":"g"}}],"recipeInstructions":[{"text":"Mix."}]}""")));
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
            await agent.ExecuteAsync(extraction, default);
            var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            var content = CanonicalRecipeContentStore.Read(recipe)!;
            Assert.Equal(Guid.Parse("ac9818ee-4c30-4f91-a4ea-0aa4fc7265ee"), Assert.Single(content.IngredientLines).Shopping.FoodId);
            Assert.NotNull(recipe.FoodMappingEvidence);
            Assert.Contains(a.NewHead.Sha256, recipe.FoodMappingEvidence);
            Assert.DoesNotContain(b.NewHead.Sha256, recipe.FoodMappingEvidence);
            var before = (recipe.CanonicalContent, recipe.FoodMappingEvidence, recipe.UpdatedAt, Json: await repository.GetRecipeJsonAsync(id, default));
            var writes = storage.AtomicWrites;
            await agent.ExecuteAsync(extraction, default);
            recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.Equal(before, (recipe.CanonicalContent, recipe.FoodMappingEvidence, recipe.UpdatedAt, Json: await repository.GetRecipeJsonAsync(id, default)));
            Assert.Equal(writes, storage.AtomicWrites);
            Assert.Equal(b.NewHead, (await vocabulary.CaptureActiveAsync())!.Reference);
            Assert.Equal(bytes, await storage.LoadAsync("recipes", ".household/food-vocabulary/" + a.NewHead.Revision + "-" + a.NewHead.Sha256 + ".json"));
        }, localRecipeStore: true);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task VocabularyPublication_ReplaySelectsRetainedOperationWithoutReactivatingOldHead() =>
        WithStore(async (services, _, _, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var vocabulary = new FoodVocabularyStore(db, storage, services.GetRequiredService<RecipesRootResolver>(),
                services.GetRequiredService<RecoveryBoundary>(), services.GetRequiredService<IClock>());
            var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
            var first = Guid.NewGuid();
            var a = await vocabulary.PublishReviewedAsync(bytes, null, first, "review:first");
            var capturedA = await vocabulary.CaptureActiveAsync();
            Assert.NotNull(capturedA);
            var node = JsonNode.Parse(bytes)!;
            node["revision"] = "fixture-three-anchor-v2";
            node["releases"]![0]!["revision"] = "fixture-three-anchor-v2";
            var newer = Encoding.UTF8.GetBytes(node.ToJsonString());
            var b = await vocabulary.PublishReviewedAsync(newer, a.NewHead, Guid.NewGuid(), "review:second");
            Assert.Equal(a, await vocabulary.PublishReviewedAsync(bytes, null, first, "review:first"));
            Assert.Equal(b.NewHead, (await vocabulary.CaptureActiveAsync())!.Reference);
            Assert.Equal(a.NewHead, capturedA!.Reference);
            Assert.Equal(Guid.Parse("ac9818ee-4c30-4f91-a4ea-0aa4fc7265ee"), capturedA.Definitions().Resolve("oignon")!.Food.Id);
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.PublishReviewedAsync(newer, null, first, "review:first"));
            var before = (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText();
            var key = ".household/food-vocabulary/" + a.NewHead.Revision + "-" + a.NewHead.Sha256 + ".json";
            await storage.SaveAtomicallyAsync("recipes", key, [1, 2, 3]);
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.LoadCapturedAsync(a.NewHead));
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.PublishReviewedAsync(bytes, null, first, "review:first"));
            Assert.Equal(before, (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText());
        }, localRecipeStore: true);

    private sealed class VocabularyInterruptedStorage(IStorageProvider inner, bool afterWrite) : IStorageProvider
    {
        public bool Interrupt { get; set; } = true;
        public int CompletedVocabularyWrites { get; private set; }
        public Task SaveAsync(string partition, string key, string value) => inner.SaveAsync(partition, key, value);
        public Task SaveAsync(string partition, string key, byte[] value) => inner.SaveAsync(partition, key, value);
        public async Task SaveAtomicallyAsync(string partition, string key, byte[] value)
        {
            var vocabulary = partition == "recipes" && key.StartsWith(".household/food-vocabulary/", StringComparison.Ordinal);
            if (vocabulary && Interrupt && !afterWrite) throw new IOException("Controlled pre-file interruption.");
            await inner.SaveAtomicallyAsync(partition, key, value);
            if (vocabulary) CompletedVocabularyWrites++;
            if (vocabulary && Interrupt && afterWrite) throw new IOException("Controlled file-committed lost reply.");
        }
        public Task DeleteAtomicallyAsync(string partition, string key) => inner.DeleteAtomicallyAsync(partition, key);
        public Task<byte[]?> LoadAsync(string partition, string key) => inner.LoadAsync(partition, key);
        public Task<List<KeyValuePair<string, string>>> FindAsync(string partition, string key) => inner.FindAsync(partition, key);
        public List<string> List(string partition) => inner.List(partition);
    }
}
