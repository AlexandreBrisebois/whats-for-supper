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
    private const string PerItemUseSource = """
        {"name":"Per-item tofu","recipeYield":"4 servings","recipeIngredient":["4 pieces tofu","2 tsp oil","100 ml sauce"],"supply":[{"name":"tofu","requiredQuantity":{"value":4,"unitText":"pieces"}},{"name":"oil","requiredQuantity":{"value":2,"unitText":"tsp"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"For all 4 pieces of tofu, use exactly 1/2 tsp of oil on each piece."},{"text":"Add all 100 ml sauce."},{"text":"Cook for 20 minutes at 180 °C in a 20 cm pan; retain the 400 g package label."}]}
        """;

    private static string PerItemSource(bool french, bool unknownDoseTotal = false, bool unknownBasis = false)
    {
        var source = JsonNode.Parse(PerItemUseSource)!;
        if (unknownDoseTotal)
        {
            source["recipeIngredient"]![1] = "tsp oil";
            source["supply"]![1] = JsonNode.Parse("""{"name":"oil","requiredQuantity":{"unitText":"tsp"}}""");
        }
        if (unknownBasis) source.AsObject().Remove("recipeYield");
        var text = source.ToJsonString();
        return french ? text.Replace("pieces", "morceaux", StringComparison.Ordinal)
            .Replace("tsp", "c. à thé", StringComparison.Ordinal)
            .Replace("oil", "huile", StringComparison.Ordinal)
            .Replace("For all 4 morceaux of tofu, use exactly 1/2 c. à thé of huile on each piece.",
                "Pour tous les 4 morceaux de tofu, utilisez exactement 1/2 c. à thé d’huile sur chaque morceau.", StringComparison.Ordinal) : text;
    }

    private static void AssertPublishedPerItemGraph(CanonicalRecipeContent content, bool french)
    {
        var step = content.InstructionSections[0].Steps[0];
        Assert.Equal(2, step.Bindings.Count);
        var count = step.Bindings[0];
        var dose = step.Bindings[1];
        Assert.Equal("whole", count.GetProperty("role").GetString());
        Assert.Equal("perItem", dose.GetProperty("role").GetString());
        Assert.Equal(content.IngredientLines[0].Id, count.GetProperty("ingredientLineId").GetGuid());
        Assert.Equal(content.IngredientLines[1].Id, dose.GetProperty("ingredientLineId").GetGuid());
        Assert.NotEqual(count.GetProperty("id").GetGuid(), dose.GetProperty("id").GetGuid());
        Assert.Equal(count.GetProperty("id").GetGuid(), dose.GetProperty("payload").GetProperty("countBindingId").GetGuid());
        var bindings = content.InstructionSections.SelectMany(section => section.Steps).SelectMany(item => item.Bindings).ToArray();
        Assert.Equal(3, bindings.Length);
        Assert.Equal(3, bindings.Select(binding => binding.GetProperty("id").GetGuid()).Distinct().Count());
        foreach (var (binding, measured, start, end) in new[]
        {
            (count, french ? "4 morceaux" : "4 pieces", french ? 14 : 8, french ? 24 : 16),
            (dose, french ? "1/2 c. à thé" : "1/2 tsp", french ? 54 : 38, french ? 66 : 45)
        })
        {
            Assert.Equal(step.Id, binding.GetProperty("stepId").GetGuid());
            Assert.Equal(content.ContentRevision, binding.GetProperty("validatedContentRevision").GetString());
            Assert.Equal(step.TextRevision, binding.GetProperty("validatedTextRevision").GetString());
            Assert.Equal("validated", binding.GetProperty("status").GetString());
            var span = binding.GetProperty("span");
            Assert.Equal(start, span.GetProperty("start").GetInt32());
            Assert.Equal(end, span.GetProperty("end").GetInt32());
            Assert.Equal(measured, span.GetProperty("expectedText").GetString());
            Assert.Equal(measured, step.Text[start..end]);
            var payload = binding.GetProperty("payload");
            Assert.False(payload.TryGetProperty("allocationGroup", out _));
            Assert.False(payload.TryGetProperty("allocationGroupId", out _));
            var evidence = payload.GetProperty("relationshipEvidence");
            Assert.Equal(1, evidence.GetProperty("version").GetInt32());
            Assert.Equal("explicit-per-item-clause", evidence.GetProperty("rule").GetString());
            Assert.Equal(content.SourceRevision, evidence.GetProperty("sourceRevision").GetString());
        }
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        Assert.Equal(LegacyGroceryQuantity.Parse("4"), count.GetProperty("payload").GetProperty("relationshipEvidence")
            .GetProperty("originalAmount").Deserialize<GroceryQuantity>(options));
        Assert.Equal(LegacyGroceryQuantity.Parse("1/2"), dose.GetProperty("payload").GetProperty("dose")
            .GetProperty("amount").Deserialize<GroceryQuantity>(options));
        Assert.Equal(content.IngredientLines[1].Unit, dose.GetProperty("payload").GetProperty("dose")
            .GetProperty("unit").Deserialize<RecipeUnitDto>(options));
        Assert.Equal(LegacyGroceryQuantity.Parse("1/2"), dose.GetProperty("payload").GetProperty("relationshipEvidence")
            .GetProperty("originalAmount").Deserialize<GroceryQuantity>(options));
    }

    private static async Task<(Guid Id, CanonicalRecipeContent Content)> CompletePerItemImport(IServiceProvider services,
        RecipeRepository repository, RecipeFilePublicationStore store, FailingStorage storage,
        bool photo, bool french, bool unknownDoseTotal = false, bool unknownBasis = false)
    {
        var (id, extraction) = await WholeUseImport(services, store, storage, photo);
        var db = services.GetRequiredService<RecipeDbContext>();
        var workflow = await db.WorkflowInstances.Include(instance => instance.Tasks).SingleAsync(instance => instance.Id == extraction.InstanceId);
        if (photo)
            await new PdfConversionProcessor(store, Mock.Of<IPdfPageRenderer>())
                .ExecuteAsync(workflow.Tasks.Single(task => task.ProcessorName == "ConvertPdf"), default);
        var chat = new Mock<IChatClient>();
        chat.Setup(client => client.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, PerItemSource(french, unknownDoseTotal, unknownBasis))));
        var prompts = new Mock<IPromptRepository>();
        prompts.Setup(repository => repository.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
        var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
        storage.FailInfo = true;
        await Assert.ThrowsAsync<IOException>(() => agent.ExecuteAsync(extraction, default));
        storage.FailInfo = false;
        var extractionCalls = chat.Invocations.Count;
        await agent.ExecuteAsync(extraction, default);
        await agent.ExecuteAsync(extraction, default);
        Assert.Equal(extractionCalls, chat.Invocations.Count);
        var extracted = await db.Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == id);
        var content = CanonicalRecipeContentStore.Read(extracted)!;
        AssertPublishedPerItemGraph(content, french);
        var heroHandler = new SourceHandler(() => { },
            """{"candidates":[{"content":{"parts":[{"inlineData":{"mimeType":"image/webp","data":"BAUG"}}]}}]}""");
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            { ["GEMINI_API_KEY"] = "synthetic-key" }).Build();
        var hero = new RecipeHeroAgent(store, configuration, NullLogger<RecipeHeroAgent>.Instance, new HeroClientFactory(heroHandler));
        await hero.ExecuteAsync(workflow.Tasks.Single(task => task.ProcessorName == "GenerateHero"), default);
        await hero.ExecuteAsync(workflow.Tasks.Single(task => task.ProcessorName == "GenerateHero"), default);
        Assert.Equal(1, heroHandler.Calls);
        var clock = services.GetRequiredService<IClock>();
        await new SyncRecipeProcessor(clock, db, repository, services.GetRequiredService<SupperProjectionInvalidation>(),
            Mock.Of<ISupperProjectionPublisher>(), NullLogger<SyncRecipeProcessor>.Instance)
            .ExecuteAsync(workflow.Tasks.Single(task => task.ProcessorName == "SyncRecipe"), default);
        var oil = french ? "huile" : "oil";
        chat.Setup(client => client.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, JsonSerializer.Serialize(new[]
            {
                new { normalizedKey = "tofu", section = "Produce", confidence = 1 },
                new { normalizedKey = oil, section = "Pantry", confidence = 1 },
                new { normalizedKey = "sauce", section = "Pantry", confidence = 1 }
            }))));
        await new CategorizeIngredientsProcessor(clock, db, chat.Object, NullLogger<CategorizeIngredientsProcessor>.Instance)
            .ExecuteAsync(workflow.Tasks.Single(task => task.ProcessorName == "CategorizeIngredients"), default);
        foreach (var key in new[] { "tofu", oil, "sauce" })
            Assert.NotNull((await db.IngredientCategories.AsNoTracking().SingleAsync(category => category.NormalizedKey == key)).GrocerySection);
        chat.Setup(client => client.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                """{"cuisineType":"Italian","mealTypes":["Lunch","Supper"],"primaryMealType":"Supper","isVegetarian":true}""")));
        var category = ActivatorUtilities.CreateInstance<CategorizeRecipeProcessor>(services, chat.Object);
        await category.ExecuteAsync(workflow.Tasks.Single(task => task.ProcessorName == "CategorizeRecipe"), default);
        await new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance, Mock.Of<IScheduleEventPublisher>(), store)
            .ExecuteAsync(workflow.Tasks.Single(task => task.ProcessorName == "RecipeReady"), default);
        var ready = await db.Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == id);
        Assert.True(ready.IsReady);
        Assert.Equal("Italian", ready.CuisineType);
        Assert.Equal(extracted.CanonicalContent, ready.CanonicalContent);
        Assert.Equal(extracted.RawMetadata, ready.RawMetadata);
        var categoryCalls = chat.Invocations.Count;
        await category.ExecuteAsync(workflow.Tasks.Single(task => task.ProcessorName == "CategorizeRecipe"), default);
        await agent.ExecuteAsync(extraction, default);
        Assert.Equal(categoryCalls, chat.Invocations.Count);
        Assert.Equal(new byte[] { 4, 5, 6 }, (await store.CaptureAsync(id)).Files["hero.webp"]);
        if (photo) Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(id, 0, default));
        return (id, content);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryPerItemUse_FreshUrlAndPhotoReachReadyWithIndependentCountDoseAndReplay()
    {
        foreach (var french in new[] { false, true })
        foreach (var photo in new[] { false, true })
            await WithStore(async (services, repository, store, storage) =>
            {
                var (id, content) = await CompletePerItemImport(services, repository, store, storage, photo, french);
                var db = services.GetRequiredService<RecipeDbContext>();
                var ready = await db.Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == id);
                var original = content.InstructionSections[0].Steps[0].Text;
                foreach (var target in new[] { 8, 2, 4, 8 })
                {
                    var projection = CookingStepProjection.Read(content, target);
                    Assert.Equal(3, projection.ValidatedUses);
                    Assert.Equal(0, projection.UncertainUses);
                    Assert.Equal(original.Replace(french ? "4 morceaux" : "4 pieces", $"{target} {(french ? "morceaux" : "pieces")}", StringComparison.Ordinal),
                        projection.Sections[0].Steps[0].Text);
                    Assert.Equal(content.InstructionSections[0].Steps[2].Text, projection.Sections[0].Steps[2].Text);
                }
                var monday = new DateOnly(2026, 10, 12);
                (await db.CalendarEvents.SingleAsync(item => item.Date == monday && item.MealSlot == 0)).RecipeId = id;
                db.SupperServings.Add(new SupperServing { Date = monday, OverrideServings = 8,
                    CreatedAt = services.GetRequiredService<IClock>().UtcNow, UpdatedAt = services.GetRequiredService<IClock>().UtcNow });
                await db.SaveChangesAsync();
                await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
                var groceries = JsonSerializer.Deserialize<List<GroceryLineItemDto>>((await db.WeeklyPlans.AsNoTracking()
                    .SingleAsync(plan => plan.WeekStartDate == monday)).GroceryItems)!;
                foreach (var (key, expected) in new[] { ("tofu", "8"), (french ? "huile" : "oil", "4"), ("sauce", "200") })
                    Assert.Equal(LegacyGroceryQuantity.Parse(expected), Assert.Single(groceries,
                        row => row.NormalizedKey == key && row.RecipeIds.Contains(id)).ExactQuantity);
                var management = services.GetRequiredService<ManagementService>();
                await management.BackupAsync();
                Assert.Equal(0, (await management.RestoreAsync()).Errors);
                var restored = await db.Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == id);
                Assert.Equal(ready.CanonicalContent, restored.CanonicalContent);
                Assert.Equal(ready.RawMetadata, restored.RawMetadata);
                AssertPublishedPerItemGraph(CanonicalRecipeContentStore.Read(restored)!, french);
                Assert.Equal(new byte[] { 4, 5, 6 }, (await store.CaptureAsync(id)).Files["hero.webp"]);
                if (photo) Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(id, 0, default));
            }, localRecipeStore: true);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryPerItemUse_UnknownDoseTotalAndUnknownServingBasisRemainOriginalFacts()
    {
        foreach (var french in new[] { false, true })
        foreach (var unknownBasis in new[] { false, true })
            await WithStore(async (services, repository, store, storage) =>
            {
                var (id, content) = await CompletePerItemImport(services, repository, store, storage, photo: true,
                    french: french, unknownDoseTotal: !unknownBasis, unknownBasis: unknownBasis);
                Assert.Equal(unknownBasis ? (int?)null : 4, content.Servings);
                Assert.Equal(unknownBasis ? "2" : null, content.IngredientLines[1].AmountText);
                if (!unknownBasis) Assert.Null(content.IngredientLines[1].Amount);
                Assert.Equal(new RecipeUnitDto(french ? "c. à thé" : "tsp", null), content.IngredientLines[1].Unit);
                var projection = CookingStepProjection.Read(content, 8);
                Assert.Equal(unknownBasis ? 0 : 3, projection.ValidatedUses);
                Assert.Equal(unknownBasis ? 3 : 0, projection.UncertainUses);
                var original = content.InstructionSections[0].Steps[0].Text;
                Assert.Equal(unknownBasis ? original : original.Replace(french ? "4 morceaux" : "4 pieces", french ? "8 morceaux" : "8 pieces", StringComparison.Ordinal),
                    projection.Sections[0].Steps[0].Text);
                Assert.Equal(3, CookingStepProjection.Read(content, null).ValidatedUses);
            }, localRecipeStore: true);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryPerItemUse_PublicationRejectsForgedCountEdgesAndPreservesCapturedFiles()
    {
        foreach (var fault in new[] { "missing-edge", "foreign-edge", "self-edge", "duplicate-id", "dose", "source-revision", "span", "overlap", "group" })
            await WithStore(async (services, repository, store, storage) =>
            {
                var (id, extraction) = await WholeUseImport(services, store, storage, photo: false);
                var capture = await store.CaptureForTaskAsync(extraction, id);
                var prepared = WholeUseExport(id, PerItemUseSource, capture.Fields!.SourceUrl,
                    "For all 4 pieces of tofu, use exactly 1/2 tsp of oil on each piece.", "4");
                var count = prepared.Content.IngredientLines[0] with
                    { Description = "tofu", Unit = new("pieces", null), Shopping = new("tofu", null, null) };
                var oil = count with { Id = Guid.NewGuid(), Description = "oil", Amount = LegacyGroceryQuantity.Parse("2"), AmountText = "2",
                    Unit = new("tsp", null), Shopping = new("oil", null, null) };
                var section = prepared.Content.InstructionSections[0];
                prepared = prepared with { Content = prepared.Content with
                {
                    IngredientLines = [count, oil, prepared.Content.IngredientLines[1]],
                    InstructionSections = [section with { Steps = [section.Steps[0],
                        section.Steps[1] with { Text = "Add all 100 ml sauce." },
                        new(Guid.NewGuid(), "Cook for 20 minutes at 180 °C in a 20 cm pan; retain the 400 g package label.", Guid.NewGuid().ToString("N"), [])] }]
                } };
                prepared = prepared with { Content = CookingStepRelationshipProducer.Discover(prepared.Content) };
                AssertPublishedPerItemGraph(prepared.Content, french: false);
                var envelope = JsonNode.Parse(RecipeExportContent.WriteCurrent(prepared))!;
                var step = envelope["content"]!["instructionSections"]![0]!["steps"]![0]!;
                var first = step["bindings"]![0]!;
                var second = step["bindings"]![1]!;
                if (fault == "missing-edge") second["payload"]!.AsObject().Remove("countBindingId");
                if (fault == "foreign-edge") second["payload"]!["countBindingId"] = Guid.NewGuid().ToString();
                if (fault == "self-edge") second["payload"]!["countBindingId"] = second["id"]!.DeepClone();
                if (fault == "duplicate-id") second["id"] = first["id"]!.DeepClone();
                if (fault == "dose") second["payload"]!["dose"]!["amount"]!["value"]!["n"] = "9";
                if (fault == "source-revision") second["payload"]!["relationshipEvidence"]!["sourceRevision"] = "forged";
                if (fault == "span") second["span"]!["expectedText"] = "1/3 tsp";
                if (fault == "overlap") second["span"] = first["span"]!.DeepClone();
                if (fault == "group") second["payload"]!["allocationGroupId"] = Guid.NewGuid().ToString();
                var db = services.GetRequiredService<RecipeDbContext>();
                var before = JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == id));
                var journals = await db.RecipeFilePublications.CountAsync();
                var info = await repository.GetInfoAsync(id, default);
                await Assert.ThrowsAsync<InvalidDataException>(() => store.PublishAsync(capture,
                    new(envelope.ToJsonString(), info,
                        "ExtractRecipe\n" + JsonSerializer.Serialize(JsonDocument.Parse(extraction.Payload!).RootElement), SourceKind: "fresh-canonical"), extraction.TaskId));
                db.ChangeTracker.Clear();
                Assert.Equal(before, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == id)));
                Assert.Equal(journals, await db.RecipeFilePublications.CountAsync());
                var retained = (await store.CaptureAsync(id)).Files;
                Assert.Equal(capture.Files.Keys.Order(), retained.Keys.Order());
                foreach (var path in capture.Files.Keys) Assert.Equal(capture.Files[path], retained[path]);
            });
    }
}
