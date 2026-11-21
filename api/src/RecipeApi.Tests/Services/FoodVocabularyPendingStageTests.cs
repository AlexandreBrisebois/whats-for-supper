using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class FoodVocabularyPendingStageTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ActualCommittedUndeliveredStage_RetainsOriginalAuthorityAndMissingJournalBecomesInertEvidence(bool installVocabulary)
    {
        var directory = Path.Combine(Path.GetTempPath(), "wfs-pending-stage-" + Guid.NewGuid().ToString("N"));
        try
        {
            var configuration = new ConfigurationManager { ["DataRoot"] = directory };
            var data = new DataRootResolver(configuration);
            var roots = new RecipesRootResolver(data, configuration);
            var storage = new FailingDeliveryStorage(new LocalStorageProvider(data, roots));
            await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options);
            var clock = new SystemClock();
            var vocabulary = new FoodVocabularyStore(db, storage, roots, new RecoveryBoundary(db, configuration, roots), clock);
            FoodVocabularyPublicationOutcome? installed = null;
            if (installVocabulary)
            {
                var bytes = await File.ReadAllBytesAsync(Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
                    "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
                installed = await vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "pending-stage-authority");
            }
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Original pending source" };
            db.Recipes.Add(recipe);
            await db.SaveChangesAsync();
            var repository = new RecipeRepository(storage);
            await repository.SaveInfoAsync(new RecipeInfo { Id = recipe.Id, Name = recipe.Name }, default);
            var publications = new RecipeFilePublicationStore(db, repository, clock,
                new SupperProjectionInvalidation(db, clock, new DeploymentCalendar(configuration)), vocabulary);
            var capture = await publications.CaptureAsync(recipe.Id);
            var operation = Guid.NewGuid();
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => publications.PublishAsync(capture,
                new("""{"name":"Committed pending publication","recipeIngredient":["salt"],"recipeInstructions":[{"text":"Mix."}]}""",
                    new RecipeInfo { Id = recipe.Id, Name = "Committed pending publication" }), operation));
            var journal = await db.RecipeFilePublications.SingleAsync();
            Assert.False(journal.Delivered);
            var original = (journal.InputHash, journal.Payload, journal.ResultHash);
            var file = Path.Combine(roots.Root, recipe.Id.ToString("D"), ".publications", operation.ToString("N"), journal.InputHash + ".json");
            var bytesBefore = await File.ReadAllBytesAsync(file);
            var facts = await Observe(vocabulary);
            var references = FoodVocabularyInventoryQualification.RequiredReferences(facts);
            if (installed is null)
            {
                Assert.Empty(references);
                Assert.Null(await vocabulary.CaptureActiveAsync());
            }
            else Assert.Contains(references, x => x.OwnerKind == "staged-journal" && x.Reference == installed.NewHead);
            Assert.Equal(original, (journal.InputHash, journal.Payload, journal.ResultHash));
            Assert.False(journal.Delivered);
            db.RecipeFilePublications.Remove(journal);
            await db.SaveChangesAsync();
            var inert = FoodVocabularyInventoryQualification.RequiredReferences(await Observe(vocabulary));
            if (installed is null) Assert.Empty(inert);
            else Assert.Contains(inert, x => x.OwnerKind == "staged-journal" && x.Reference == installed.NewHead);
            Assert.Equal(bytesBefore, await File.ReadAllBytesAsync(file));
        }
        finally { if (Directory.Exists(directory)) Directory.Delete(directory, true); }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task DeniedSemanticPublication_PreservesPreparedInertAuthorityWithoutACommit(bool installVocabulary)
    {
        var directory = Path.Combine(Path.GetTempPath(), "wfs-denied-stage-" + Guid.NewGuid().ToString("N"));
        try
        {
            var configuration = new ConfigurationManager { ["DataRoot"] = directory };
            var data = new DataRootResolver(configuration);
            var roots = new RecipesRootResolver(data, configuration);
            var storage = new LocalStorageProvider(data, roots);
            await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options);
            var clock = new SystemClock();
            var vocabulary = new FoodVocabularyStore(db, storage, roots, new RecoveryBoundary(db, configuration, roots), clock);
            var invalidation = new SupperProjectionInvalidation(db, clock, new DeploymentCalendar(configuration));
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Retained canonical owner", Ingredients = "[\"salt\"]" };
            db.Recipes.Add(recipe);
            await db.SaveChangesAsync();
            await new CanonicalRecipeContentStore(db, clock, invalidation, vocabulary).ConvertAsync(recipe.Id,
                CanonicalRecipeContentStore.InspectContentRevision(recipe), CanonicalRecipeContentStore.InspectSourceRevision(recipe), Guid.NewGuid());
            FoodVocabularyPublicationOutcome? installed = null;
            if (installVocabulary)
            {
                var bytes = await File.ReadAllBytesAsync(Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
                    "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
                installed = await vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "denied-stage-reference");
            }
            var repository = new RecipeRepository(storage);
            await repository.SaveInfoAsync(new RecipeInfo { Id = recipe.Id, Name = recipe.Name }, default);
            var publications = new RecipeFilePublicationStore(db, repository, clock, invalidation, vocabulary);
            var capture = await publications.CaptureAsync(recipe.Id);
            var original = recipe.CanonicalContent;
            var operation = Guid.NewGuid();
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => publications.PublishAsync(capture,
                new("""{"name":"Denied semantic candidate","recipeIngredient":["pepper"],"recipeInstructions":[{"text":"Mix."}]}""",
                    new RecipeInfo { Id = recipe.Id, Name = "Denied semantic candidate" }), operation));
            Assert.Empty(await db.RecipeFilePublications.ToArrayAsync());
            Assert.Equal(original, recipe.CanonicalContent);
            var facts = await Observe(vocabulary);
            var stage = Assert.Single(facts.History.StagedJournals);
            var references = FoodVocabularyInventoryQualification.RequiredReferences(facts);
            if (installed is null)
            {
                Assert.Empty(references);
                Assert.Null(await vocabulary.CaptureActiveAsync());
                Assert.Equal(capture.FieldHash, (await publications.CaptureAsync(recipe.Id)).FieldHash);
            }
            else
            {
                Assert.Contains(references, x => x.OwnerKind == "staged-journal" && x.Reference == installed.NewHead);
                db.FamilySettings.Remove(await db.FamilySettings.SingleAsync(x => x.Key == "food_vocabulary_publication"));
                await db.SaveChangesAsync();
                var isolated = FoodVocabularyInventoryQualification.RequiredReferences(await Observe(vocabulary));
                Assert.All(isolated, x => Assert.Equal("staged-journal", x.OwnerKind));
                Assert.NotEmpty(isolated);
                await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.CaptureActiveAsync());
            }
            var file = Path.Combine(roots.Root, recipe.Id.ToString("D"), ".publications", operation.ToString("N"), stage.InputHash + ".json");
            foreach (var mutation in new[] { "output", "claimed-result", "missing-evidence", "unknown-field", "request-hash" })
            {
                var node = System.Text.Json.Nodes.JsonNode.Parse(stage.RawBytes)!;
                switch (mutation)
                {
                    case "output": node["output"] = new System.Text.Json.Nodes.JsonObject(); break;
                    case "claimed-result": node["result"] = node["capture"]!["fields"]!.DeepClone(); break;
                    case "missing-evidence": node["capture"]!.AsObject().Remove("foodEvidence"); break;
                    case "unknown-field": node["inventedAuthority"] = true; break;
                    case "request-hash": node["candidate"]!["info"]!["name"] = "Divergent original"; break;
                }
                await File.WriteAllTextAsync(file, node.ToJsonString());
                await Assert.ThrowsAsync<InvalidDataException>(async () =>
                    FoodVocabularyInventoryQualification.RequiredReferences(await Observe(vocabulary)));
                await File.WriteAllBytesAsync(file, stage.RawBytes);
            }
            var renamed = Path.Combine(Path.GetDirectoryName(file)!, new string('A', 64) + ".json");
            File.Move(file, renamed);
            await Assert.ThrowsAsync<InvalidDataException>(async () =>
                FoodVocabularyInventoryQualification.RequiredReferences(await Observe(vocabulary)));
            File.Move(renamed, file);
            Assert.Equal(stage.RawBytes, await File.ReadAllBytesAsync(file));
            Assert.Empty(await db.RecipeFilePublications.ToArrayAsync());
        }
        finally { if (Directory.Exists(directory)) Directory.Delete(directory, true); }
    }

    private static Task<FoodVocabularyInventoryFacts> Observe(FoodVocabularyStore vocabulary) =>
        (Task<FoodVocabularyInventoryFacts>)typeof(FoodVocabularyStore).GetMethod("ObserveInventoryFactsAsync", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(vocabulary, [CancellationToken.None])!;

    private sealed class FailingDeliveryStorage(IStorageProvider inner) : IStorageProvider
    {
        internal bool FailInfo { get; set; }
        public Task SaveAsync(string partition, string key, string value) => inner.SaveAsync(partition, key, value);
        public Task SaveAsync(string partition, string key, byte[] value) => inner.SaveAsync(partition, key, value);
        public Task SaveAtomicallyAsync(string partition, string key, byte[] value) => FailInfo && key.EndsWith("/recipe.info", StringComparison.Ordinal)
            ? throw new IOException("Controlled post-commit file delivery failure") : inner.SaveAtomicallyAsync(partition, key, value);
        public Task DeleteAtomicallyAsync(string partition, string key) => inner.DeleteAtomicallyAsync(partition, key);
        public Task<byte[]?> LoadAsync(string partition, string key) => inner.LoadAsync(partition, key);
        public Task<List<KeyValuePair<string, string>>> FindAsync(string partition, string key) => inner.FindAsync(partition, key);
        public List<string> List(string partition) => inner.List(partition);
    }
}
