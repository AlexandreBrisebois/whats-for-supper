using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    private static MethodInfo RecoveryHistoryMethod(string owner, string method) => typeof(RecoverySnapshotService).Assembly
        .GetType("RecipeApi.Services." + owner)!.GetMethod(method, BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static)!;

    private static async Task AddRecoveryHistory(IServiceProvider services, RecipeFilePublicationStore publications, IStorageProvider storage, Guid recipeId)
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        var clock = services.GetRequiredService<IClock>();
        await storage.SaveAsync("workflows", "recipe-import.yaml", """
            name: recipe-import
            parameters: [recipeId]
            tasks:
              - name: extract
                processor: ExtractRecipe
                payload:
                  recipeId: "{{recipeId}}"
            """);
        var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db, publications);
        var parameters = new Dictionary<string, string> { ["recipeId"] = recipeId.ToString("D") };
        var workflow = await orchestrator.TriggerAsync("recipe-import", parameters);
        var task = Assert.Single(workflow.Tasks);
        await (Task)RecoveryHistoryMethod("WorkflowReset", "RecordAsync").Invoke(null, [db, task, workflow, clock.UtcNow, CancellationToken.None])!;
        RecoveryHistoryMethod("WorkflowProcessorHistory", "Begin").Invoke(null, [db, task, workflow, clock.UtcNow]);
        var retirement = Guid.NewGuid();
        await (Task)RecoveryHistoryMethod("WorkflowLifecycle", "RetainAsync").Invoke(null,
            [db, workflow, "pruned", retirement, clock.UtcNow, CancellationToken.None, null])!;
        db.RecipeRepairIntents.Add((RecipeRepairIntent)RecoveryHistoryMethod("RecipeReportRepairIntent", "Create").Invoke(null,
            [workflow.Id, recipeId, workflow.WorkflowId, parameters, workflow, clock.UtcNow])!);
        await db.SaveChangesAsync();
        var command = new MaintenanceCommand { Id = retirement, CommandType = "PruneWorkflows", Status = "completed",
            Payload = "{}", CreatedAt = clock.UtcNow, CompletedAt = clock.UtcNow };
        await (Task)RecoveryHistoryMethod("MaintenanceCommandLifecycle", "RetainAsync").Invoke(null,
            [db, command, "pruned", Guid.NewGuid(), clock.UtcNow, CancellationToken.None])!;
        await storage.SaveAsync("workflows", "recovery-parent.yaml", """
            name: recovery-parent
            parameters: []
            tasks:
              - name: child
                processor: StartWorkflow
                payload:
                  workflowId: recipe-import
            """);
        var parent = await orchestrator.TriggerAsync("recovery-parent", []);
        await orchestrator.TriggerChildAsync(Assert.Single(parent.Tasks), "recipe-import", parameters);
        var retiredRecipe = new Recipe { Id = Guid.NewGuid(), Name = "Retained retired source", Ingredients = "[\"salt\"]",
            RawMetadata = "{\"recipeIngredient\":[\"salt\"],\"recipeInstructions\":[{\"text\":\"Mix.\"}]}" };
        db.Recipes.Add(retiredRecipe);
        await db.SaveChangesAsync();
        await services.GetRequiredService<CanonicalRecipeContentStore>().ConvertAsync(retiredRecipe.Id,
            CanonicalRecipeContentStore.InspectContentRevision(retiredRecipe), CanonicalRecipeContentStore.InspectSourceRevision(retiredRecipe), Guid.NewGuid());
        await (Task)RecoveryHistoryMethod("RecipePhysicalLifecycle", "DeleteAsync").Invoke(null,
            [db, retiredRecipe.Id, "delete", clock, services.GetRequiredService<RecipesRootResolver>(), (Func<Recipe, bool>)(_ => true),
                (Func<Task<bool?>>)(() => Task.FromResult<bool?>(false)), null, null, null, CancellationToken.None])!;
        await db.SaveChangesAsync();
    }

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false, false)]
    [InlineData(true, false)]
    [InlineData(false, true)]
    [InlineData(true, true)]
    public Task VocabularyRecovery_AllTypedHistoryAndProtectedClearsSurviveIndependentOfflineRestore(bool demo, bool boundedRelease) =>
        WithStore(async (sourceServices, sourceRepository, sourceStore, sourceStorage) =>
        {
            var root = Path.Combine(Path.GetTempPath(), "wfs-recovery-typed-roundtrip-" + Guid.NewGuid().ToString("N"));
            var recipes = sourceServices.GetRequiredService<RecipesRootResolver>();
            var sourceRoot = recipes.Root;
            var unavailable = sourceRoot + ".unavailable-" + Guid.NewGuid().ToString("N");
            try
            {
                var sourceBackup = Path.Combine(root, "source");
                var independentBackup = Path.Combine(root, "independent");
                sourceServices.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = sourceBackup;
                var sourceDb = sourceServices.GetRequiredService<RecipeDbContext>();
                var bytesA = boundedRelease ? BoundedVocabularyInput.Bytes()
                    : await File.ReadAllBytesAsync(Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(),
                        "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));
                var vocabulary = sourceServices.GetRequiredService<FoodVocabularyStore>();
                var a = await vocabulary.PublishReviewedAsync(bytesA, null, Guid.NewGuid(), "full-recovery-A");
                await sourceStore.PublishAsync(await sourceStore.CaptureAsync(Id), Candidate(), Guid.NewGuid());
                var (mappedId, extraction) = await WholeUseImport(sourceServices, sourceStore, sourceStorage, photo: false);
                var sourceProvider = new Mock<IChatClient>(MockBehavior.Strict);
                sourceProvider.Setup(x => x.GetService(It.IsAny<Type>(), It.IsAny<object?>())).Returns((object?)null);
                sourceProvider.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                        """{"name":"Mapped recovery onion","recipeYield":"4 servings","recipeIngredient":["25 g onion"],"supply":[{"name":"onion","requiredQuantity":{"value":25,"unitText":"g"}}],"recipeInstructions":[{"text":"Mix."}]}""")));
                var prompts = new Mock<IPromptRepository>();
                prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
                await new RecipeAgent(sourceProvider.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance,
                    sourceStore, "ExtractRecipe").ExecuteAsync(extraction, default);
                var mappedRecipe = await sourceDb.Recipes.AsNoTracking().SingleAsync(x => x.Id == mappedId);
                var mapped = CanonicalRecipeContentStore.Read(mappedRecipe)!;
                var line = Assert.Single(mapped.IngredientLines);
                Assert.Equal(ThreeAnchorFoodIds[0], line.Shopping.FoodId);
                var saved = await sourceServices.GetRequiredService<CanonicalRecipeContentStore>().EditAsync(mappedId, mapped.SourceRevision,
                    Guid.NewGuid(), new UpdateRecipeDto { ExpectedContentRevision = mapped.ContentRevision, Notes = "Private full-recovery note",
                        IngredientLines = JsonSerializer.SerializeToElement(new[] { new RecipeIngredientLineInput
                        {
                            Id = line.Id, Description = line.Description, Amount = LegacyGroceryQuantity.Parse("50"), AmountText = "50",
                            Unit = line.Unit, Scaling = line.Scaling, Package = line.Package, Shopping = line.Shopping
                        } }, JsonDefaults.CamelCase) });
                Assert.Equal(line.Shopping, Assert.Single(saved.Content.IngredientLines).Shopping);
                await sourceServices.GetRequiredService<HouseholdFoodOverrideStore>().ReclassifyCategoryAsync(ThreeAnchorFoodIds[0], "Pantry", null);
                await AddRecoveryHistory(sourceServices, sourceStore, sourceStorage, mappedId);
                var node = JsonNode.Parse(bytesA)!;
                node["revision"] = "full-recovery-head-B";
                node["releases"]![0]!["revision"] = "full-recovery-head-B";
                var bytesB = Encoding.UTF8.GetBytes(node.ToJsonString());
                var b = await vocabulary.PublishReviewedAsync(bytesB, a.NewHead, Guid.NewGuid(), "full-recovery-B");
                var at = sourceServices.GetRequiredService<IClock>().UtcNow;
                sourceDb.HouseholdFoodOverrides.AddRange(
                    new HouseholdFoodOverride { Id = Guid.NewGuid(), Revision = "private-name-revision", FallbackKey = "private flour",
                        ShoppingName = "Ma farine", ProtectedFields = ["shoppingName"], PresentationSequence = "2", CreatedAt = at, UpdatedAt = at },
                    new HouseholdFoodOverride { Id = Guid.NewGuid(), Revision = "protected-clear-revision", FallbackKey = "cleared onion",
                        ShoppingName = null, ProtectedFields = ["shoppingName"], PresentationSequence = "3", CreatedAt = at, UpdatedAt = at });
                await sourceDb.SaveChangesAsync();
                await sourceStorage.SaveAsync("recipes", Id + "/hero.webp", new byte[] { 4, 5, 6 });
                var expectedOverrides = JsonSerializer.Serialize(await sourceServices.GetRequiredService<HouseholdFoodOverrideStore>().ReadRecoveryRowsAsync());
                var expectedRecipe = await sourceDb.Recipes.AsNoTracking().SingleAsync(x => x.Id == mappedId);
                var capture = demo ? await sourceServices.GetRequiredService<RecoverySnapshotService>().CaptureDemoAsync(default)
                    : await sourceServices.GetRequiredService<RecoverySnapshotService>().CaptureAsync(default);
                var snapshotId = capture.SnapshotId!.Value;
                var capturedRoot = demo
                    ? Path.Combine(sourceServices.GetRequiredService<DataRootResolver>().Root, "demo", snapshotId.ToString("N"))
                    : Path.Combine(sourceBackup, snapshotId.ToString("N"));
                var independentRoot = Path.Combine(independentBackup, snapshotId.ToString("N"));
                CopyRecoveryDirectory(capturedRoot, independentRoot);
                var index = FoodVocabularyInventoryQualification.ReadRecoveryIndex(await File.ReadAllBytesAsync(Path.Combine(independentRoot, "vocabulary", "index.json")));
                foreach (var owner in new[] { "membership", "canonical-operation", "publication", "workflow", "launch", "child", "reset", "processor-attempt", "workflow-retirement", "repair", "physical-retirement", "staged-journal" })
                    Assert.Contains(index.Origins, x => x.OwnerKind == owner && x.Reference == a.NewHead);
                Assert.Contains(index.Documents, x => x.Reference == b.NewHead);
                var expectedContexts = FoodVocabularyInventoryQualification.ReadHistoryObservations(await File.ReadAllBytesAsync(Path.Combine(independentRoot, "vocabulary", "history-observations.json")))
                    .Select(x => x.Context.ContextId).ToHashSet();
                Directory.Move(sourceRoot, unavailable);
                Directory.Move(capturedRoot, capturedRoot + ".unavailable");
                var targetProvider = new Mock<IChatClient>(MockBehavior.Strict);
                var targetNetwork = new Mock<IHttpClientFactory>(MockBehavior.Strict);
                await WithStore(async (targetServices, targetRepository, _, targetStorage) =>
                {
                    targetServices.GetRequiredService<IConfiguration>()["Recovery:BackupRoot"] = independentBackup;
                    var targetDb = targetServices.GetRequiredService<RecipeDbContext>();
                    Assert.False(await targetDb.FamilySettings.AsNoTracking().AnyAsync(x => x.Key == "food_vocabulary_publication"));
                    Assert.Null(await targetServices.GetRequiredService<FoodVocabularyStore>().CaptureActiveAsync());
                    var recovery = targetServices.GetRequiredService<RecoverySnapshotService>();
                    if (demo)
                    {
                        var targetDemo = Path.Combine(targetServices.GetRequiredService<DataRootResolver>().Root, "demo");
                        CopyRecoveryDirectory(independentRoot, Path.Combine(targetDemo, snapshotId.ToString("N")));
                        await File.WriteAllTextAsync(Path.Combine(targetDemo, "current"), snapshotId.ToString("N"));
                    }
                    for (var replay = 0; replay < 2; replay++)
                    {
                        var restored = demo ? await recovery.RestoreDemoAsync(null, default) : await recovery.RestoreExactAsync(snapshotId, default);
                        Assert.Equal("completed", restored.State);
                        targetDb.ChangeTracker.Clear();
                        var recipe = await targetDb.Recipes.AsNoTracking().SingleAsync(x => x.Id == mappedId);
                        Assert.Equal((expectedRecipe.CanonicalContent, expectedRecipe.FoodMappingEvidence, expectedRecipe.RawMetadata, expectedRecipe.Notes),
                            (recipe.CanonicalContent, recipe.FoodMappingEvidence, recipe.RawMetadata, recipe.Notes));
                        Assert.Equal(new byte[] { 1, 2, 3 }, await targetRepository.GetOriginalImageAsync(Id, 0, default));
                        Assert.Equal(new byte[] { 4, 5, 6 }, await targetStorage.LoadAsync("recipes", Id + "/hero.webp"));
                        Assert.Equal(expectedOverrides, JsonSerializer.Serialize(await targetServices.GetRequiredService<HouseholdFoodOverrideStore>().ReadRecoveryRowsAsync()));
                        Assert.Equal(bytesA, await targetStorage.LoadAsync("recipes", ".household/food-vocabulary/" + a.NewHead.Revision + "-" + a.NewHead.Sha256 + ".json"));
                        Assert.Equal(bytesB, await targetStorage.LoadAsync("recipes", ".household/food-vocabulary/" + b.NewHead.Revision + "-" + b.NewHead.Sha256 + ".json"));
                    }
                    using (var restarted = targetServices.CreateScope())
                        Assert.Equal(b.NewHead, (await restarted.ServiceProvider.GetRequiredService<FoodVocabularyStore>().CaptureActiveAsync())!.Reference);
                    var reexport = await recovery.CaptureAsync(default);
                    var reexportRoot = Path.Combine(independentBackup, reexport.SnapshotId!.Value.ToString("N"));
                    var contexts = FoodVocabularyInventoryQualification.ReadHistoryObservations(await File.ReadAllBytesAsync(Path.Combine(reexportRoot, "vocabulary", "history-observations.json")));
                    Assert.True(expectedContexts.IsSubsetOf(contexts.Select(x => x.Context.ContextId).ToHashSet()));
                    Assert.Empty(targetProvider.Invocations);
                    Assert.Empty(targetNetwork.Invocations);
                    var expectedFiles = new[] { a.NewHead.Revision + "-" + a.NewHead.Sha256 + ".json",
                        b.NewHead.Revision + "-" + b.NewHead.Sha256 + ".json", "history-observations.json" }.Order().ToArray();
                    var actualFiles = Directory.GetFiles(Path.Combine(targetServices.GetRequiredService<RecipesRootResolver>().Root,
                        ".household", "food-vocabulary")).Select(Path.GetFileName).Order().ToArray();
                    Assert.Equal(expectedFiles, actualFiles);
                    Assert.False(Directory.Exists(sourceRoot));
                }, localRecipeStore: true, configureServices: registrations =>
                {
                    registrations.RemoveAll<IChatClient>();
                    registrations.AddSingleton(targetProvider.Object);
                    registrations.RemoveAll<IHttpClientFactory>();
                    registrations.AddSingleton(targetNetwork.Object);
                });
            }
            finally
            {
                if (Directory.Exists(unavailable) && !Directory.Exists(sourceRoot)) Directory.Move(unavailable, sourceRoot);
                if (Directory.Exists(root)) Directory.Delete(root, true);
            }
        }, localRecipeStore: true);
}
