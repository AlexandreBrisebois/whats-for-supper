using System.Text.Json;
using System.Text.Json.Nodes;
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
    private const string FixedUseSource = """
        {"name":"Oil","recipeYield":"4 servings","recipeIngredient":["2 tbsp oil","100 ml sauce"],"supply":[{"name":"oil","requiredQuantity":{"value":2,"unitText":"tbsp"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"For any number of portions, use exactly 1 tbsp oil."},{"text":"Add all 100 ml sauce."},{"text":"Simmer 20 minutes at 180 °C."}]}
        """;

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryFixedUse_FreshUrlAndPhotoReachReadyThroughActualProcessorsAndReplay()
    {
        foreach (var french in new[] { false, true })
        foreach (var photo in new[] { false, true })
            await WithStore(async (services, repository, store, storage) =>
            {
                var (id, extraction) = await WholeUseImport(services, store, storage, photo);
                var ingredient = french ? "huile" : "oil";
                var fixedText = french
                    ? "Quel que soit le nombre de portions, utilisez exactement 1 c. à soupe d’huile."
                    : "For any number of portions, use exactly 1 tbsp oil.";
                var source = french
                    ? FixedUseSource.Replace("2 tbsp oil", "2 c. à soupe huile", StringComparison.Ordinal)
                        .Replace("\"oil\"", "\"huile\"", StringComparison.Ordinal)
                        .Replace("\"tbsp\"", "\"c. à soupe\"", StringComparison.Ordinal)
                        .Replace("For any number of portions, use exactly 1 tbsp oil.", fixedText, StringComparison.Ordinal)
                    : FixedUseSource;
                var db = services.GetRequiredService<RecipeDbContext>();
                var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == extraction.InstanceId);
                if (photo)
                    await new PdfConversionProcessor(store, Mock.Of<IPdfPageRenderer>())
                        .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "ConvertPdf"), default);
                var chat = new Mock<IChatClient>();
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, source)));
                var prompts = new Mock<IPromptRepository>();
                prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
                var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                    NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
                storage.FailInfo = true;
                await Assert.ThrowsAsync<IOException>(() => agent.ExecuteAsync(extraction, default));
                storage.FailInfo = false;
                var extractedCalls = chat.Invocations.Count;
                await agent.ExecuteAsync(extraction, default);
                await agent.ExecuteAsync(extraction, default);
                Assert.Equal(extractedCalls, chat.Invocations.Count);

                var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                var content = CanonicalRecipeContentStore.Read(saved)!;
                var fixedBinding = Assert.Single(content.InstructionSections[0].Steps[0].Bindings);
                Assert.Equal("fixed", fixedBinding.GetProperty("role").GetString());
                Assert.Equal(content.IngredientLines[0].Id, fixedBinding.GetProperty("ingredientLineId").GetGuid());
                var evidence = fixedBinding.GetProperty("payload").GetProperty("relationshipEvidence");
                Assert.Equal("explicit-fixed-portions-clause", evidence.GetProperty("rule").GetString());
                Assert.Equal(content.SourceRevision, evidence.GetProperty("sourceRevision").GetString());
                var span = fixedBinding.GetProperty("span");
                var start = span.GetProperty("start").GetInt32();
                var end = span.GetProperty("end").GetInt32();
                Assert.Equal(french ? "1 c. à soupe" : "1 tbsp", fixedText[start..end]);
                Assert.Equal(fixedText[start..end], span.GetProperty("expectedText").GetString());
                foreach (var target in new[] { 8, 2, 4, 8 })
                {
                    var projected = CookingStepProjection.Read(content, target);
                    Assert.Equal(2, projected.ValidatedUses);
                    Assert.Equal(fixedText, projected.Sections[0].Steps[0].Text);
                    Assert.Equal("Simmer 20 minutes at 180 °C.", projected.Sections[0].Steps[2].Text);
                }
                Assert.Equal(fixedText, content.InstructionSections[0].Steps[0].Text);

                var heroHandler = new SourceHandler(() => { },
                    """{"candidates":[{"content":{"parts":[{"inlineData":{"mimeType":"image/webp","data":"BAUG"}}]}}]}""");
                var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
                    { ["GEMINI_API_KEY"] = "synthetic-key" }).Build();
                var hero = new RecipeHeroAgent(store, configuration, NullLogger<RecipeHeroAgent>.Instance,
                    new HeroClientFactory(heroHandler));
                await hero.ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "GenerateHero"), default);
                await hero.ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "GenerateHero"), default);
                Assert.Equal(1, heroHandler.Calls);
                var clock = services.GetRequiredService<IClock>();
                await new SyncRecipeProcessor(clock, db, repository, services.GetRequiredService<SupperProjectionInvalidation>(),
                    Mock.Of<ISupperProjectionPublisher>(), NullLogger<SyncRecipeProcessor>.Instance)
                    .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                        JsonSerializer.Serialize(new[] { new { normalizedKey = ingredient, section = "Pantry", confidence = 1 },
                            new { normalizedKey = "sauce", section = "Pantry", confidence = 1 } }))));
                await new CategorizeIngredientsProcessor(clock, db, chat.Object, NullLogger<CategorizeIngredientsProcessor>.Instance)
                    .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeIngredients"), default);
                Assert.Equal("Pantry", (await db.IngredientCategories.AsNoTracking()
                    .SingleAsync(x => x.NormalizedKey == ingredient)).GrocerySection);
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                        """{"cuisineType":"Italian","mealTypes":["Lunch","Supper"],"primaryMealType":"Supper","isVegetarian":true}""")));
                var category = ActivatorUtilities.CreateInstance<CategorizeRecipeProcessor>(services, chat.Object);
                await category.ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeRecipe"), default);
                await new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance, Mock.Of<IScheduleEventPublisher>(), store)
                    .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "RecipeReady"), default);
                var ready = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                Assert.True(ready.IsReady);
                Assert.Equal("Italian", ready.CuisineType);
                Assert.Equal(saved.CanonicalContent, ready.CanonicalContent);
                Assert.Equal(saved.RawMetadata, ready.RawMetadata);
                var categoryCalls = chat.Invocations.Count;
                await category.ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeRecipe"), default);
                await agent.ExecuteAsync(extraction, default);
                Assert.Equal(categoryCalls, chat.Invocations.Count);

                var monday = new DateOnly(2026, 10, 12);
                (await db.CalendarEvents.SingleAsync(x => x.Date == monday && x.MealSlot == 0)).RecipeId = id;
                db.SupperServings.Add(new SupperServing { Date = monday, OverrideServings = 8,
                    CreatedAt = clock.UtcNow, UpdatedAt = clock.UtcNow });
                await db.SaveChangesAsync();
                await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
                var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                var groceries = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!;
                Assert.Equal(LegacyGroceryQuantity.Parse("4"), Assert.Single(groceries,
                    row => row.NormalizedKey == ingredient && row.RecipeIds.Contains(id)).ExactQuantity);
                if (photo) Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(id, 0, default));
                var management = services.GetRequiredService<ManagementService>();
                await management.BackupAsync();
                Assert.Equal(0, (await management.RestoreAsync()).Errors);
                var restored = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                Assert.Equal(ready.CanonicalContent, restored.CanonicalContent);
                Assert.Equal(ready.RawMetadata, restored.RawMetadata);
                Assert.Equal(fixedText, CookingStepProjection.Read(CanonicalRecipeContentStore.Read(restored)!, 8)
                    .Sections[0].Steps[0].Text);
                Assert.Equal(new byte[] { 4, 5, 6 }, (await store.CaptureAsync(id)).Files["hero.webp"]);
                if (photo) Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(id, 0, default));
            }, localRecipeStore: true);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryFixedUse_PublicationRejectsForgedFixedIntentAndPreservesCapturedFiles()
    {
        foreach (var fault in new[] { "wording", "dose", "source-revision" })
            await WithStore(async (services, repository, store, storage) =>
            {
                var (id, extraction) = await WholeUseImport(services, store, storage, photo: false);
                var capture = await store.CaptureForTaskAsync(extraction, id);
                var prepared = WholeUseExport(id, FixedUseSource, capture.Fields!.SourceUrl,
                    "For any number of portions, use exactly 1 tbsp oil.", "2");
                var section = prepared.Content.InstructionSections[0];
                prepared = prepared with { Content = prepared.Content with
                {
                    IngredientLines = [prepared.Content.IngredientLines[0] with
                        { Description = "oil", Unit = new("tbsp", null), Shopping = new("oil", null, null) }, prepared.Content.IngredientLines[1]],
                    InstructionSections = [section with { Steps = [section.Steps[0],
                        section.Steps[1] with { Text = "Add all 100 ml sauce." },
                        new(Guid.NewGuid(), "Simmer 20 minutes at 180 °C.", Guid.NewGuid().ToString("N"), [])] }]
                } };
                prepared = prepared with { Content = CookingStepRelationshipProducer.Discover(prepared.Content) };
                Assert.Equal("fixed", Assert.Single(prepared.Content.InstructionSections[0].Steps[0].Bindings)
                    .GetProperty("role").GetString());
                var envelope = JsonNode.Parse(RecipeExportContent.WriteCurrent(prepared))!;
                var step = envelope["content"]!["instructionSections"]![0]!["steps"]![0]!;
                var binding = step["bindings"]![0]!;
                if (fault == "wording")
                    step["text"] = "For any number of portions, use usually 1 tbsp oil.";
                if (fault == "dose") binding["payload"]!["amount"]!["value"]!["n"] = "2";
                if (fault == "source-revision") binding["payload"]!["relationshipEvidence"]!["sourceRevision"] = "forged";
                var db = services.GetRequiredService<RecipeDbContext>();
                var before = JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id));
                var journals = await db.RecipeFilePublications.CountAsync();
                var info = await repository.GetInfoAsync(id, default);
                await Assert.ThrowsAsync<InvalidDataException>(() => store.PublishAsync(capture,
                    new(envelope.ToJsonString(), info,
                        "ExtractRecipe\n" + JsonSerializer.Serialize(JsonDocument.Parse(extraction.Payload!).RootElement), SourceKind: "fresh-canonical"),
                    extraction.TaskId));
                db.ChangeTracker.Clear();
                Assert.Equal(before, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)));
                Assert.Equal(journals, await db.RecipeFilePublications.CountAsync());
                var retained = (await store.CaptureAsync(id)).Files;
                Assert.Equal(capture.Files.Keys.Order(), retained.Keys.Order());
                foreach (var path in capture.Files.Keys) Assert.Equal(capture.Files[path], retained[path]);
            });
    }
}
