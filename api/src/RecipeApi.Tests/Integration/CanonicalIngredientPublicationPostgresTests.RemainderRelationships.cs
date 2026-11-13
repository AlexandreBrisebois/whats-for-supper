using RecipeApi.Tests.Infrastructure;
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
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    private const string RemainderUseSource = """
        {"name":"Oil","recipeYield":"4 servings","recipeIngredient":["2 tbsp oil","100 ml sauce"],"supply":[{"name":"oil","requiredQuantity":{"value":2,"unitText":"tbsp"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Use 1 tbsp oil."},{"text":"Finally, use all the remaining oil."},{"text":"Simmer 20 minutes at 180 °C."}]}
        """;

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryRemainderUse_FreshUrlAndPhotoReachReadyThroughBothCategoriesAndReplay()
    {
        foreach (var french in new[] { false, true })
        foreach (var photo in new[] { false, true })
            await WithStore(async (services, repository, store, storage) =>
            {
                var (id, extraction) = await WholeUseImport(services, store, storage, photo);
                var ingredient = french ? "huile" : "oil";
                var priorText = french ? "Utilisez 1 tbsp d’huile." : "Use 1 tbsp oil.";
                var finalText = french ? "Enfin, utilisez tout le reste d’huile." : "Finally, use all the remaining oil.";
                var source = french ? RemainderUseSource.Replace("oil", "huile", StringComparison.Ordinal)
                    .Replace("Use 1 tbsp huile.", priorText, StringComparison.Ordinal)
                    .Replace("Finally, use all the remaining huile.", finalText, StringComparison.Ordinal) : RemainderUseSource;
                var chat = new Mock<IChatClient>();
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, source)));
                var prompts = new Mock<IPromptRepository>();
                prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
                var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
                storage.FailInfo = true;
                await Assert.ThrowsAsync<IOException>(() => agent.ExecuteAsync(extraction, default));
                storage.FailInfo = false;
                var extractedCalls = chat.Invocations.Count;
                await agent.ExecuteAsync(extraction, default);
                await agent.ExecuteAsync(extraction, default);
                Assert.Equal(extractedCalls, chat.Invocations.Count);
                var db = services.GetRequiredService<RecipeDbContext>();
                var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                var content = CanonicalRecipeContentStore.Read(saved)!;
                var bindings = content.InstructionSections.SelectMany(x => x.Steps).SelectMany(x => x.Bindings).ToArray();
                Assert.Equal(2, bindings.Length);
                Assert.Equal(new[] { "absolute", "remainder" }, bindings.Select(binding => binding.GetProperty("role").GetString()));
                Assert.All(bindings, binding => Assert.Equal(content.IngredientLines[0].Id, binding.GetProperty("ingredientLineId").GetGuid()));
                var group = bindings[1].GetProperty("payload").GetProperty("allocationGroup");
                Assert.True(group.GetProperty("exhaustive").GetBoolean());
                Assert.Equal(bindings[0].GetProperty("id").GetGuid(), bindings[1].GetProperty("payload")
                    .GetProperty("predecessors")[0].GetGuid());
                var projection = CookingStepProjection.Read(content, 8);
                Assert.Equal(2, projection.ValidatedUses);
                Assert.Equal(french ? "Utilisez 2 tbsp d’huile." : "Use 2 tbsp oil.", projection.Sections[0].Steps[0].Text);
                Assert.Equal(french ? "Enfin, utilisez tout le reste (2 tbsp) d’huile." : "Finally, use all the remaining (2 tbsp) oil.",
                    projection.Sections[0].Steps[1].Text);
                Assert.Equal(priorText, JsonDocument.Parse(saved.RawMetadata!).RootElement.GetProperty("recipeInstructions")[0].GetProperty("itemListElement")[0].GetProperty("text").GetString());
                Assert.Equal(priorText, content.InstructionSections[0].Steps[0].Text);
                Assert.Equal(finalText, content.InstructionSections[0].Steps[1].Text);
                var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == extraction.InstanceId);
                var clock = services.GetRequiredService<IClock>();
                var hero = workflow.Tasks.Single(x => x.ProcessorName == "GenerateHero");
                await store.PublishAsync(await store.CaptureForTaskAsync(hero, id),
                    new(null, await repository.GetInfoAsync(id, default), "GenerateHero\n" + JsonSerializer.Serialize(JsonDocument.Parse(hero.Payload!).RootElement),
                        new Dictionary<string, byte[]?> { ["hero.webp"] = [7, 8, 9] }, SourceKind: "hero"), hero.TaskId);
                await new SyncRecipeProcessor(clock, db, repository, services.GetRequiredService<SupperProjectionInvalidation>(),
                    Mock.Of<ISupperProjectionPublisher>(), NullLogger<SyncRecipeProcessor>.Instance, TestPublicationStore.Vocabulary(db, (repository).StorageProvider, clock, services))
                    .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                        JsonSerializer.Serialize(new[] { new { normalizedKey = ingredient, section = "Pantry", confidence = 1 },
                            new { normalizedKey = "sauce", section = "Pantry", confidence = 1 } }))));
                await new CategorizeIngredientsProcessor(clock, db, chat.Object, NullLogger<CategorizeIngredientsProcessor>.Instance)
                    .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeIngredients"), default);
                Assert.Equal("Pantry", (await db.IngredientCategories.AsNoTracking().SingleAsync(x => x.NormalizedKey == ingredient)).GrocerySection);
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                        """{"cuisineType":"Italian","mealTypes":["Lunch","Supper"],"primaryMealType":"Supper","isVegetarian":true}""")));
                var category = ActivatorUtilities.CreateInstance<CategorizeRecipeProcessor>(services, chat.Object);
                await category.ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeRecipe"), default);
                await new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance, Mock.Of<IScheduleEventPublisher>(), store)
                    .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "RecipeReady"), default);
                var ready = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                Assert.True(ready.IsReady);
                Assert.Equal(saved.CanonicalContent, ready.CanonicalContent);
                Assert.Equal(saved.RawMetadata, ready.RawMetadata);
                Assert.Equal("Italian", ready.CuisineType);
                var calls = chat.Invocations.Count;
                await agent.ExecuteAsync(extraction, default);
                await category.ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeRecipe"), default);
                Assert.Equal(calls, chat.Invocations.Count);
                Assert.Equal(saved.CanonicalContent, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent);
                if (photo) Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(id, 0, default));
                var monday = new DateOnly(2026, 10, 12);
                (await db.CalendarEvents.SingleAsync(x => x.Date == monday && x.MealSlot == 0)).RecipeId = id;
                db.SupperServings.Add(new SupperServing { Date = monday, OverrideServings = 8,
                    CreatedAt = clock.UtcNow, UpdatedAt = clock.UtcNow });
                await db.SaveChangesAsync();
                await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
                var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                var groceries = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!;
                Assert.Equal(LegacyGroceryQuantity.Parse("4"), Assert.Single(groceries,
                    x => x.NormalizedKey == ingredient && x.RecipeIds.Contains(id)).ExactQuantity);
                Assert.All(await db.SupperServings.AsNoTracking().ToListAsync(), serving =>
                    Assert.True(serving.UpdatedAt >= serving.CreatedAt, "Serving fixture timestamps must share the fixed deployment clock."));
                var management = services.GetRequiredService<ManagementService>();
                await management.BackupAsync();
                var readback = await management.RestoreAsync();
                Assert.Equal(0, readback.Errors);
                var restored = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                Assert.Equal(ready.CanonicalContent, restored.CanonicalContent);
                Assert.Equal(ready.RawMetadata, restored.RawMetadata);
                Assert.Equal(2, CookingStepProjection.Read(CanonicalRecipeContentStore.Read(restored)!, 8).ValidatedUses);
                if (photo) Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(id, 0, default));
            }, localRecipeStore: true);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryRemainderUse_PublicationRejectsForgedFinalIntentPredecessorsAndRetainsAllSourceFiles()
    {
        foreach (var fault in new[] { "exhaustive", "predecessor", "duplicate-id", "source-text" })
            await WithStore(async (services, repository, store, storage) =>
            {
                var (id, extraction) = await WholeUseImport(services, store, storage, photo: false);
                var capture = await store.CaptureForTaskAsync(extraction, id);
                var prepared = WholeUseExport(id, RemainderUseSource, capture.Fields!.SourceUrl, "Use 1 tbsp oil.", "2");
                var originalSection = prepared.Content.InstructionSections[0];
                prepared = prepared with { Content = prepared.Content with
                {
                    IngredientLines = [prepared.Content.IngredientLines[0] with
                        { Description = "oil", Unit = new("tbsp", null), Shopping = new("oil", null, null) }, prepared.Content.IngredientLines[1]],
                    InstructionSections = [originalSection with { Steps = [originalSection.Steps[0],
                        new(Guid.NewGuid(), "Finally, use all the remaining oil.", Guid.NewGuid().ToString("N"), []),
                        originalSection.Steps[1] with { Text = "Simmer 20 minutes at 180 °C." }] }]
                } };
                prepared = prepared with { Content = CookingStepRelationshipProducer.Discover(prepared.Content) };
                var section = prepared.Content.InstructionSections[0];
                Assert.Equal(2, section.Steps.Sum(step => step.Bindings.Count));
                // Start with a valid wire envelope, then corrupt its received bytes.
                // Invalid proofs must reach the publication reader rather than fail
                // in the export writer before PublishAsync is invoked.
                var envelope = System.Text.Json.Nodes.JsonNode.Parse(RecipeExportContent.WriteCurrent(prepared))!;
                var wireSteps = envelope["content"]!["instructionSections"]![0]!["steps"]!;
                var forged = wireSteps[1]!["bindings"]![0]!;
                if (fault == "exhaustive") forged["payload"]!["allocationGroup"]!["exhaustive"] = false;
                if (fault == "predecessor") forged["payload"]!["predecessors"]![0] = Guid.NewGuid();
                if (fault == "duplicate-id") forged["id"] = section.Steps[0].Bindings[0].GetProperty("id").GetGuid();
                if (fault == "source-text")
                {
                    wireSteps[1]!["text"] = "Finally, use all the remaining oil!";
                }
                var candidateJson = envelope.ToJsonString();
                var db = services.GetRequiredService<RecipeDbContext>();
                var before = JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id));
                var journals = await db.RecipeFilePublications.CountAsync();
                var info = await repository.GetInfoAsync(id, default);
                var rejected = await Assert.ThrowsAsync<InvalidDataException>(() => store.PublishAsync(capture,
                    new(candidateJson, info,
                        "ExtractRecipe\n" + JsonSerializer.Serialize(JsonDocument.Parse(extraction.Payload!).RootElement), SourceKind: "fresh-canonical"),
                    extraction.TaskId));
                Assert.Equal(4, capture.FieldHashVersion);
                Assert.Equal(fault switch
                {
                    "exhaustive" => "Fresh relationship evidence is not independently validated.",
                    "predecessor" => "Fresh relationship allocation references are missing.",
                    // This current producer captures V4 vocabulary authority;
                    // its mapped-original validation precedes the legacy V3 fence.
                    "source-text" => "Mapped originals/evidence differ from the captured source decision.",
                    _ => "Unsupported or malformed current recipe content envelope."
                }, rejected.Message);
                db.ChangeTracker.Clear();
                Assert.Equal(before, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)));
                Assert.Equal(journals, await db.RecipeFilePublications.CountAsync());
                var retained = (await store.CaptureAsync(id)).Files;
                Assert.Equal(capture.Files.Keys.Order(), retained.Keys.Order());
                foreach (var path in capture.Files.Keys) Assert.Equal(capture.Files[path], retained[path]);
            });
    }
}
