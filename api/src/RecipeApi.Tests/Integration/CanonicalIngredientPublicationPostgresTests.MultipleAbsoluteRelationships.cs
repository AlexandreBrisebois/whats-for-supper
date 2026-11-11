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
    private const string MultipleAbsoluteSource = """
        {"name":"Oil","recipeYield":"4 servings","recipeIngredient":["2 tbsp oil","100 ml sauce"],"supply":[{"name":"oil","requiredQuantity":{"value":2,"unitText":"tbsp"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Add 1 tbsp oil."},{"text":"Use 1 tbsp oil."},{"text":"Simmer 20 minutes at 180 °C."}]}
        """;

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryMultipleAbsoluteUses_FreshUrlAndPhotoReachReadyThroughBothCategoriesAndReplay()
    {
        foreach (var photo in new[] { false, true })
            await WithStore(async (services, repository, store, storage) =>
            {
                var (id, extraction) = await WholeUseImport(services, store, storage, photo);
                var source = MultipleAbsoluteSource;
                var chat = new Mock<IChatClient>();
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, source)));
                var prompts = new Mock<IPromptRepository>();
                prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
                var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
                await agent.ExecuteAsync(extraction, default);
                var db = services.GetRequiredService<RecipeDbContext>();
                var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                var content = CanonicalRecipeContentStore.Read(saved)!;
                var bindings = content.InstructionSections.SelectMany(x => x.Steps).SelectMany(x => x.Bindings).ToArray();
                Assert.Equal(2, bindings.Length);
                Assert.All(bindings, binding =>
                {
                    Assert.Equal("absolute", binding.GetProperty("role").GetString());
                    Assert.Equal(content.IngredientLines[0].Id, binding.GetProperty("ingredientLineId").GetGuid());
                    Assert.False(binding.GetProperty("payload").TryGetProperty("allocationGroup", out _));
                    Assert.False(binding.GetProperty("payload").TryGetProperty("allocationGroupId", out _));
                });
                var projection = CookingStepProjection.Read(content, 8);
                Assert.Equal(2, projection.ValidatedUses);
                Assert.Equal("Add 2 tbsp oil.", projection.Sections[0].Steps[0].Text);
                Assert.Equal("Use 2 tbsp oil.", projection.Sections[0].Steps[1].Text);
                Assert.Equal("Add 1 tbsp oil.", JsonDocument.Parse(saved.RawMetadata!).RootElement.GetProperty("recipeInstructions")[0].GetProperty("itemListElement")[0].GetProperty("text").GetString());
                Assert.Equal("Add 1 tbsp oil.", content.InstructionSections[0].Steps[0].Text);
                Assert.Equal("Use 1 tbsp oil.", content.InstructionSections[0].Steps[1].Text);
                var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == extraction.InstanceId);
                var clock = services.GetRequiredService<IClock>();
                var hero = workflow.Tasks.Single(x => x.ProcessorName == "GenerateHero");
                await store.PublishAsync(await store.CaptureForTaskAsync(hero, id),
                    new(null, await repository.GetInfoAsync(id, default), "GenerateHero\n" + JsonSerializer.Serialize(JsonDocument.Parse(hero.Payload!).RootElement),
                        new Dictionary<string, byte[]?> { ["hero.webp"] = [7, 8, 9] }, SourceKind: "hero"), hero.TaskId);
                await new SyncRecipeProcessor(clock, db, repository, services.GetRequiredService<SupperProjectionInvalidation>(),
                    Mock.Of<ISupperProjectionPublisher>(), NullLogger<SyncRecipeProcessor>.Instance)
                    .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                        """[{"normalizedKey":"oil","section":"Pantry","confidence":1},{"normalizedKey":"sauce","section":"Pantry","confidence":1}]""")));
                await new CategorizeIngredientsProcessor(clock, db, chat.Object, NullLogger<CategorizeIngredientsProcessor>.Instance)
                    .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeIngredients"), default);
                Assert.Equal("Pantry", (await db.IngredientCategories.AsNoTracking().SingleAsync(x => x.NormalizedKey == "oil")).GrocerySection);
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
                db.SupperServings.Add(new SupperServing { Date = monday, OverrideServings = 8 });
                await db.SaveChangesAsync();
                await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
                var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                var groceries = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!;
                Assert.Equal(LegacyGroceryQuantity.Parse("4"), Assert.Single(groceries,
                    x => x.NormalizedKey == "oil" && x.RecipeIds.Contains(id)).ExactQuantity);
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryMultipleAbsoluteUses_PublicationRejectsForgedSecondUseAndRetainsAllSourceFiles()
    {
        foreach (var fault in new[] { "amount", "duplicate-id", "source-text" })
            await WithStore(async (services, repository, store, storage) =>
            {
                var (id, extraction) = await WholeUseImport(services, store, storage, photo: false);
                var capture = await store.CaptureForTaskAsync(extraction, id);
                var prepared = WholeUseExport(id, MultipleAbsoluteSource, capture.Fields!.SourceUrl, "Add 1 tbsp oil.", "2");
                var originalSection = prepared.Content.InstructionSections[0];
                prepared = prepared with { Content = prepared.Content with
                {
                    IngredientLines = [prepared.Content.IngredientLines[0] with
                        { Description = "oil", Unit = new("tbsp", null), Shopping = new("oil", null, null) }, prepared.Content.IngredientLines[1]],
                    InstructionSections = [originalSection with { Steps = [originalSection.Steps[0],
                        new(Guid.NewGuid(), "Use 1 tbsp oil.", Guid.NewGuid().ToString("N"), []),
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
                if (fault == "amount") forged["payload"]!["amount"] = JsonSerializer.SerializeToNode(
                    LegacyGroceryQuantity.Parse("2"), new JsonSerializerOptions(JsonSerializerDefaults.Web));
                if (fault == "duplicate-id") forged["id"] = section.Steps[0].Bindings[0].GetProperty("id").GetGuid();
                if (fault == "source-text")
                {
                    wireSteps[1]!["text"] = "Use 0.5 tbsp oil.";
                    forged["span"]!["end"] = 12;
                    forged["span"]!["expectedText"] = "0.5 tbsp";
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
                Assert.Equal(fault switch
                {
                    "amount" => "Fresh relationship evidence is not independently validated.",
                    "source-text" => "Fresh relationship originals differ from retained source evidence.",
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
