using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Services.Agents;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task VocabularyRecovery_CurrentSnapshotRestoresWithoutSourceAndReplaysOriginalSaveAndOverride() =>
        WithStore(async (sourceServices, _, sourceStore, sourceStorage) =>
        {
            var backup = Path.Combine(Path.GetTempPath(), "wfs-vocabulary-restore-backup-" + Guid.NewGuid().ToString("N"));
            var sourceRoots = sourceServices.GetRequiredService<RecipesRootResolver>();
            var unavailable = sourceRoots.Root + ".source-unavailable-" + Guid.NewGuid().ToString("N");
            var originalRoot = sourceRoots.Root;
            try
            {
                sourceServices.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = backup;
                var sourceDb = sourceServices.GetRequiredService<RecipeDbContext>();
                var bytes = await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                    "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
                var head = await sourceServices.GetRequiredService<FoodVocabularyStore>().PublishReviewedAsync(bytes, null,
                    Guid.NewGuid(), "isolated-restore-source");
                var (recipeId, extraction) = await WholeUseImport(sourceServices, sourceStore, sourceStorage, photo: false);
                var chat = new Mock<IChatClient>(MockBehavior.Strict);
                chat.Setup(x => x.GetService(It.IsAny<Type>(), It.IsAny<object?>())).Returns((object?)null);
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                        """{"name":"Recovery onion","recipeYield":"4 servings","recipeIngredient":["25 g onion"],"supply":[{"name":"onion","requiredQuantity":{"value":25,"unitText":"g"}}],"recipeInstructions":[{"text":"Mix."}]}""")));
                var prompts = new Mock<IPromptRepository>();
                prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
                await new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance,
                    sourceStore, "ExtractRecipe").ExecuteAsync(extraction, default);
                var sourceProviderCalls = chat.Invocations.Count;
                Assert.True(sourceProviderCalls > 0);
                var sourceRecipe = await sourceDb.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipeId);
                var sourceContent = CanonicalRecipeContentStore.Read(sourceRecipe)!;
                var canonical = sourceServices.GetRequiredService<CanonicalRecipeContentStore>();
                var line = Assert.Single(sourceContent.IngredientLines);
                Assert.Equal(ThreeAnchorFoodIds[0], line.Shopping.FoodId);
                var input = new UpdateRecipeDto
                {
                    ExpectedContentRevision = sourceContent.ContentRevision, Notes = "Private retained recovery note",
                    IngredientLines = JsonSerializer.SerializeToElement(new[] { new RecipeIngredientLineInput
                    {
                        Id = line.Id, Description = line.Description, Amount = LegacyGroceryQuantity.Parse("50"), AmountText = "50",
                        Unit = line.Unit, Scaling = line.Scaling, Package = line.Package, Shopping = line.Shopping
                    } }, JsonDefaults.CamelCase)
                };
                var saveOperation = Guid.NewGuid();
                var saved = await canonical.EditAsync(recipeId, sourceContent.SourceRevision, saveOperation, input);
                await sourceServices.GetRequiredService<HouseholdFoodOverrideStore>().ReclassifyCategoryAsync(line.Shopping.FoodId!.Value,
                    "Pantry", null);
                var expectedRecipe = await sourceDb.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipeId);
                var expectedOperations = await sourceDb.CanonicalRecipeOperations.AsNoTracking().OrderBy(x => x.OperationId).ToArrayAsync();
                var expectedOverride = Assert.Single(await sourceServices.GetRequiredService<HouseholdFoodOverrideStore>().ReadRecoveryRowsAsync());
                Assert.Equal(sourceProviderCalls, chat.Invocations.Count);
                var captured = await sourceServices.GetRequiredService<RecoverySnapshotService>().CaptureAsync(default);
                Assert.Equal("completed", captured.State);
                Assert.Equal(sourceProviderCalls, chat.Invocations.Count);
                var snapshotId = captured.SnapshotId!.Value;
                var relative = $".household/food-vocabulary/{head.NewHead.Revision}-{head.NewHead.Sha256}.json";
                Assert.Equal(bytes, await sourceStorage.LoadAsync("recipes", relative));
                Directory.Move(originalRoot, unavailable);
                Assert.False(Directory.Exists(originalRoot));
                var targetProvider = new Mock<IChatClient>(MockBehavior.Strict);
                await WithStore(async (targetServices, _, _, targetStorage) =>
                {
                    targetServices.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = backup;
                    var targetDb = targetServices.GetRequiredService<RecipeDbContext>();
                    Assert.False(await targetDb.FamilySettings.AnyAsync(x => x.Key == "food_vocabulary_publication"));
                    var restored = await targetServices.GetRequiredService<RecoverySnapshotService>().RestoreExactAsync(snapshotId, default);
                    Assert.Equal("completed", restored.State);
                    targetDb.ChangeTracker.Clear();
                    var recipe = await targetDb.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipeId);
                    Assert.Equal(expectedRecipe.CanonicalContent, recipe.CanonicalContent);
                    Assert.Equal(expectedRecipe.FoodMappingEvidence, recipe.FoodMappingEvidence);
                    Assert.Equal(expectedRecipe.Notes, recipe.Notes);
                    var restoredOperations = await targetDb.CanonicalRecipeOperations.AsNoTracking().OrderBy(x => x.OperationId).ToArrayAsync();
                    Assert.Equal(expectedOperations.Select(x => (x.RecipeId, x.OperationId, x.InputHash, x.OriginalRequest, x.Result, x.CreatedAt)),
                        restoredOperations.Select(x => (x.RecipeId, x.OperationId, x.InputHash, x.OriginalRequest, x.Result, x.CreatedAt)));
                    Assert.Equal(bytes, await targetStorage.LoadAsync("recipes", relative));
                    var targetVocabulary = targetServices.GetRequiredService<FoodVocabularyStore>();
                    Assert.Equal(head.NewHead, (await targetVocabulary.CaptureActiveAsync())!.Reference);
                    Assert.Equal(JsonSerializer.Serialize(expectedOverride), JsonSerializer.Serialize(Assert.Single(await targetServices.GetRequiredService<HouseholdFoodOverrideStore>().ReadRecoveryRowsAsync())));
                    using (var fresh = targetServices.CreateScope())
                    {
                        var replay = await fresh.ServiceProvider.GetRequiredService<CanonicalRecipeContentStore>().EditAsync(recipeId,
                            sourceContent.SourceRevision, saveOperation, input);
                        Assert.Equal(JsonSerializer.Serialize(saved), JsonSerializer.Serialize(replay));
                    }
                    var reexport = await targetServices.GetRequiredService<RecoverySnapshotService>().CaptureAsync(default);
                    var reexportRoot = Path.Combine(backup, reexport.SnapshotId!.Value.ToString("N"));
                    Assert.Equal(bytes, await File.ReadAllBytesAsync(Path.Combine(reexportRoot, "recipes", relative)));
                    Assert.False(Directory.Exists(originalRoot));
                    Assert.Equal(sourceProviderCalls, chat.Invocations.Count);
                    Assert.Empty(targetProvider.Invocations);
                }, localRecipeStore: true, configureServices: registrations =>
                {
                    registrations.RemoveAll<IChatClient>();
                    registrations.AddSingleton(targetProvider.Object);
                });
            }
            finally
            {
                if (Directory.Exists(unavailable) && !Directory.Exists(originalRoot)) Directory.Move(unavailable, originalRoot);
                if (Directory.Exists(backup)) Directory.Delete(backup, true);
            }
        }, localRecipeStore: true);
}
