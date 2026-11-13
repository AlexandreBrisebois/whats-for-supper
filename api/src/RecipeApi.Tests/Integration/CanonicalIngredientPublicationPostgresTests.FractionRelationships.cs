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
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryFractionUse_FreshUrlAndPhotoReachReadyThroughBothCategoriesAndReplay()
    {
        foreach (var photo in new[] { false, true })
            await WithStore(async (services, repository, store, storage) =>
            {
                var (id, extraction) = await WholeUseImport(services, store, storage, photo);
                var source = WholeUseSource.Replace("Add all 200 g pasta.", "Add half of the pasta (100 g).", StringComparison.Ordinal);
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
                var binding = Assert.Single(content.InstructionSections.SelectMany(x => x.Steps).SelectMany(x => x.Bindings));
                Assert.Equal("fraction", binding.GetProperty("role").GetString());
                Assert.Equal("Add half of the pasta (100 g).", content.InstructionSections[0].Steps[0].Text);
                Assert.Equal("Add half of the pasta (100 g).", JsonDocument.Parse(saved.RawMetadata!).RootElement
                    .GetProperty("recipeInstructions")[0].GetProperty("itemListElement")[0].GetProperty("text").GetString());
                Assert.Equal("Add half of the pasta (150 g).", CookingStepProjection.Read(content, 6).Sections[0].Steps[0].Text);
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
                        """[{"normalizedKey":"pasta","section":"Pantry","confidence":1},{"normalizedKey":"sauce","section":"Pantry","confidence":1}]""")));
                await new CategorizeIngredientsProcessor(clock, db, chat.Object, NullLogger<CategorizeIngredientsProcessor>.Instance)
                    .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeIngredients"), default);
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
                db.SupperServings.Add(new SupperServing { Date = monday, OverrideServings = 6 });
                await db.SaveChangesAsync();
                await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
                var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                var groceries = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!;
                Assert.Equal(LegacyGroceryQuantity.Parse("300"), Assert.Single(groceries,
                    x => x.NormalizedKey == "pasta" && x.RecipeIds.Contains(id)).ExactQuantity);
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryFractionUse_PublicationRejectsForgedProofAndRetainsAllSourceFiles()
    {
        foreach (var fault in new[] { "fraction", "annotation", "duplicate-id", "source-text" })
            await WithStore(async (services, repository, store, storage) =>
            {
                var (id, extraction) = await WholeUseImport(services, store, storage, photo: false);
                var capture = await store.CaptureForTaskAsync(extraction, id);
                const string text = "Add half of the pasta (100 g).";
                var source = WholeUseSource.Replace("Add all 200 g pasta.", text, StringComparison.Ordinal);
                var prepared = WholeUseExport(id, source, capture.Fields!.SourceUrl, text);
                prepared = prepared with { Content = CookingStepRelationshipProducer.Discover(prepared.Content) };
                Assert.Single(prepared.Content.InstructionSections[0].Steps[0].Bindings);
                // Serialize valid proof first, then corrupt the received wire envelope
                // so this qualifies the publication fence rather than only the writer.
                var envelope = System.Text.Json.Nodes.JsonNode.Parse(RecipeExportContent.WriteCurrent(prepared))!;
                var wireStep = envelope["content"]!["instructionSections"]![0]!["steps"]![0]!;
                var forged = wireStep["bindings"]![0]!;
                if (fault == "fraction") forged["payload"]!["fraction"]!["d"] = "3";
                if (fault == "annotation") forged["payload"]!["annotationSpan"]!["expectedText"] = "125 g";
                if (fault == "duplicate-id") wireStep["bindings"]!.AsArray().Add(forged.DeepClone());
                if (fault == "source-text")
                {
                    wireStep["text"] = "Use half of the pasta (100 g).";
                    forged["span"]!["start"] = 4;
                    forged["span"]!["end"] = 8;
                }
                var db = services.GetRequiredService<RecipeDbContext>();
                var before = JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id));
                var journals = await db.RecipeFilePublications.CountAsync();
                var info = await repository.GetInfoAsync(id, default);
                var rejected = await Assert.ThrowsAsync<InvalidDataException>(() => store.PublishAsync(capture,
                    new(envelope.ToJsonString(), info,
                        "ExtractRecipe\n" + JsonSerializer.Serialize(JsonDocument.Parse(extraction.Payload!).RootElement), SourceKind: "fresh-canonical"),
                    extraction.TaskId));
                Assert.Equal(4, capture.FieldHashVersion);
                Assert.Equal(fault switch
                {
                    "fraction" or "annotation" => "Fresh relationship evidence is not independently validated.",
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
