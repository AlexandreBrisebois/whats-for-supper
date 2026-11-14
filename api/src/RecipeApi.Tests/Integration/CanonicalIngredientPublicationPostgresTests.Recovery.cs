using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task VocabularyRecovery_FullSnapshotPreservesExactPublishedDocumentAfterQualifiedSourceAndQuantitySave() =>
        WithStore(async (services, _, store, storage) =>
        {
            var backup = Path.Combine(Path.GetTempPath(), "wfs-bilingual-backup-tracer-" + Guid.NewGuid().ToString("N"));
            try
            {
                services.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = backup;
                var db = services.GetRequiredService<RecipeDbContext>();
                var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                    "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
                var vocabulary = services.GetRequiredService<FoodVocabularyStore>();
                var published = await vocabulary.PublishReviewedAsync(bytes, null, Guid.NewGuid(), "test-review:full-backup-input");
                Assert.Equal(ThreeAnchorRevision, published.NewHead.Revision);
                Assert.Equal(ThreeAnchorSha256, published.NewHead.Sha256);
                var relative = $".household/food-vocabulary/{published.NewHead.Revision}-{published.NewHead.Sha256}.json";
                Assert.Equal(bytes, await storage.LoadAsync("recipes", relative));
                var (id, extraction) = await WholeUseImport(services, store, storage, photo: false);
                var chat = new Mock<IChatClient>();
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                        """{"name":"Backup tracer onion","recipeYield":"4 servings","recipeIngredient":["25 g onion"],"supply":[{"name":"onion","requiredQuantity":{"value":25,"unitText":"g"}}],"recipeInstructions":[{"text":"Mix."}]}""")));
                var prompts = new Mock<IPromptRepository>();
                prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
                await new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance,
                    store, "ExtractRecipe").ExecuteAsync(extraction, default);
                var sourceRecipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                var source = CanonicalRecipeContentStore.Read(sourceRecipe)!;
                var line = Assert.Single(source.IngredientLines);
                Assert.Equal(ThreeAnchorFoodIds[0], line.Shopping.FoodId);
                Assert.False(string.IsNullOrWhiteSpace(line.Shopping.MappingRevision));
                Assert.NotNull(sourceRecipe.FoodMappingEvidence);
                var changed = new RecipeIngredientLineInput
                {
                    Id = line.Id, Description = line.Description, Amount = LegacyGroceryQuantity.Parse("50"), AmountText = "50",
                    Unit = line.Unit, Scaling = line.Scaling, Package = line.Package, Shopping = line.Shopping
                };
                // Actual guarded canonical owner, not a fabricated mapping or
                // operation. This helper does not expose the factory's HTTP client.
                var saved = await services.GetRequiredService<CanonicalRecipeContentStore>().EditAsync(id, source.SourceRevision,
                    Guid.NewGuid(), new UpdateRecipeDto { ExpectedContentRevision = source.ContentRevision,
                        IngredientLines = JsonSerializer.SerializeToElement(new[] { changed }, JsonDefaults.CamelCase) });
                Assert.Equal(line.Shopping, Assert.Single(saved.Content.IngredientLines).Shopping);
                Assert.Equal("50", saved.Content.IngredientLines[0].AmountText);
                Assert.Equal(source.SourceRevision, saved.Content.SourceRevision);
                var savedRecipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                Assert.Equal(sourceRecipe.RawMetadata, savedRecipe.RawMetadata);
                var evidence = JsonSerializer.Deserialize<RecipeFoodMappingEvidence>(savedRecipe.FoodMappingEvidence!, JsonDefaults.CamelCase)!;
                var decision = Assert.Single(evidence.NameDecisions);
                Assert.Equal("source", decision.Kind);
                Assert.Equal(extraction.TaskId, decision.DecidingOperationId);
                Assert.Equal(saved.Content.ContentRevision, decision.ContentRevision);
                Assert.Equal(line.Shopping.MappingRevision, Assert.Single(evidence.Mappings).Facts.MappingRevision);
                Assert.Equal(bytes, await storage.LoadAsync("recipes", relative));
                Assert.False(await db.RecipeFilePublications.AsNoTracking().AnyAsync(x => !x.Delivered));
                var snapshot = await services.GetRequiredService<RecoverySnapshotService>().CaptureAsync(default);
                Assert.Equal("completed", snapshot.State);
                Assert.NotNull(snapshot.SnapshotId);
                var directory = Path.Combine(backup, snapshot.SnapshotId.Value.ToString("N"));
                var manifest = JsonSerializer.Deserialize<RecoveryManifest>(await File.ReadAllTextAsync(Path.Combine(directory, "manifest.json")),
                    JsonDefaults.CamelCase)!;
                var artifact = "recipes/" + relative;
                var exported = Path.Combine(directory, "recipes", relative);
                output.WriteLine($"Full snapshot completed={snapshot.State}; mapped line={line.Id}; mapping={line.Shopping.MappingRevision}; vocabulary={published.NewHead}; expectedArtifact={artifact}; exists={File.Exists(exported)}");
                // Optional runner evidence does not supply any backup authority.
                if (Directory.Exists("/results"))
                {
                    await using var proof = new FileStream("/results/recovery-vocabulary-red-proof.json", FileMode.CreateNew, FileAccess.Write);
                    await JsonSerializer.SerializeAsync(proof, new { snapshot, recipeId = id, source.ContentRevision, savedRevision = saved.Content.ContentRevision,
                        foodId = line.Shopping.FoodId, line.Shopping.MappingRevision, evidence,
                        expectedArtifact = artifact, expectedSha256 = ThreeAnchorSha256, expectedBytes = bytes.Length,
                        artifactExists = File.Exists(exported), manifest });
                }
                Assert.True(File.Exists(exported), $"Completed full snapshot omitted required immutable vocabulary artifact: {artifact}");
                Assert.Equal(bytes, await File.ReadAllBytesAsync(exported));
                var item = Assert.Single(manifest.Files, file => file.Path == artifact);
                Assert.Equal(bytes.Length, item.Length);
                Assert.Equal(ThreeAnchorSha256, item.Sha256.ToLowerInvariant());
                Assert.Equal(ThreeAnchorSha256, Convert.ToHexStringLower(SHA256.HashData(await File.ReadAllBytesAsync(exported))));
                // Controlled direct source/Save/capture tracer only. This is not
                // autonomous worker, full Ready/browser, restored/re-exported or DV proof.
            }
            finally { if (Directory.Exists(backup)) Directory.Delete(backup, recursive: true); }
        }, localRecipeStore: true);
}
