using RecipeApi.Tests.Infrastructure;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using RecipeApi.Utils;
using Xunit;

namespace RecipeApi.Tests.Integration;

// The preinstalled definitions/receipt are INPUTS, not proof of a real publisher,
// lexical adoption, restore, autonomous worker dispatch, or hosted/browser execution.
public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    private const string ThreeAnchorRevision = "fixture-three-anchor-v1";
    private const string ThreeAnchorSha256 = "0514bc6808b84c00a08cf96a104156c424f34391a431d4d1d6e0f8037ebc3a36";
    private const string ThreeAnchorSettingSha256 = "a52c9d4e32cfafbb1ad4d769939228b1966e7be49d08cfaedcf49b7813ce86c5";
    private const string ThreeAnchorSettingKey = "food_vocabulary_publication";
    private const string ThreeAnchorStorageKey = ".household/food-vocabulary/" + ThreeAnchorRevision + "-" + ThreeAnchorSha256 + ".json";
    private static readonly Guid ThreeAnchorSettingId = Guid.Parse("d68fe9f6-c9b5-43ce-813b-fd0983dc19ca");
    private static readonly Guid[] ThreeAnchorFoodIds =
    [
        Guid.Parse("ac9818ee-4c30-4f91-a4ea-0aa4fc7265ee"),
        Guid.Parse("d9940182-48c9-4823-a820-1c7c54869d5f"),
        Guid.Parse("031a0c4b-2d73-4a70-88aa-8ad3dd680ebb")
    ];
    private const string ThreeAnchorCanonicalPublicationRequest = """
        {"adoptionReviewIdentity":"wfs-test-fixture:three-anchor-v1","expectedHead":null,"kind":"publish-reviewed-vocabulary","newFile":{"revision":"fixture-three-anchor-v1","sha256":"0514bc6808b84c00a08cf96a104156c424f34391a431d4d1d6e0f8037ebc3a36"},"operationId":"8850f9bb-a680-4c6a-a99a-02bbd08999ba","requestVersion":1}
        """;

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task FreshUrl_ReviewedVocabularyInputPublishesQualifiedThreeAnchorAssociations_En() =>
        FreshUrlThreeAnchorAssociations("en");

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task FreshUrl_ReviewedVocabularyInputPublishesQualifiedThreeAnchorAssociations_Fr() =>
        FreshUrlThreeAnchorAssociations("fr");

    private async Task FreshUrlThreeAnchorAssociations(string locale)
    {
        var names = locale == "en"
            ? new[] { "onion", "tomato", "canned tomatoes" }
            : new[] { "oignon", "tomate", "tomates en conserve" };
        var quantities = new[] { "25", "50", "75" };
        var ingredients = names.Select((name, index) => quantities[index] + " g " + name).ToArray();
        var instruction = locale == "en" ? "Mix the ingredients." : "Mélanger les ingrédients.";
        var title = "Three-anchor " + locale.ToUpperInvariant() + " source";
        var source = JsonSerializer.Serialize(new
        {
            name = title,
            recipeYield = "4 servings",
            recipeIngredient = ingredients,
            supply = names.Select((name, index) => new
            {
                name,
                requiredQuantity = new { value = (index + 1) * 25, unitText = "g" }
            }),
            recipeInstructions = new[] { new { text = instruction } }
        });

        // Each public fact owns an independent PostgreSQL database/local root.
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var (definitionBytes, settingBytes) = await InstallThreeAnchorInput(db, storage);

            // Existing actual CaptureUrl/bootstrap/FetchUrlContent/extraction owner.
            // One root only per database; WholeUseImport's Single is unambiguous.
            var (id, extraction) = await WholeUseImport(services, store, storage, photo: false);
            var chat = new Mock<IChatClient>();
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, source)));
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
            await agent.ExecuteAsync(extraction, default);

            var extracted = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            var canonical = CanonicalRecipeContentStore.Read(extracted);
            Assert.NotNull(canonical);
            Assert.Equal(4, canonical.Servings);
            Assert.False(string.IsNullOrWhiteSpace(canonical.ContentRevision));
            Assert.False(string.IsNullOrWhiteSpace(canonical.SourceRevision));
            Assert.Equal(ingredients, canonical.IngredientLines.Select(CanonicalRecipeContentStore.Render));
            Assert.Equal(names, canonical.IngredientLines.Select(line => line.Description));
            Assert.Equal(names, canonical.IngredientLines.Select(line => line.Shopping.Name));
            Assert.Equal(3, canonical.IngredientLines.Select(line => line.Id).Distinct().Count());
            for (var index = 0; index < 3; index++)
            {
                var line = canonical.IngredientLines[index];
                Assert.NotEqual(Guid.Empty, line.Id);
                Assert.Equal(LegacyGroceryQuantity.Parse(quantities[index]), line.Amount);
                Assert.Equal(quantities[index], line.AmountText);
                Assert.Equal("g", line.Unit?.Text);
                Assert.Null(line.Unit?.DefinitionId);
                Assert.Null(line.Package);
                Assert.Equal("proportional", line.Scaling);
                Assert.Equal("source", line.Provenance.Origin);
                Assert.Equal(canonical.SourceRevision, line.Provenance.SourceRef);
                Assert.Empty(line.Provenance.ProtectedFields);
            }
            var step = Assert.Single(Assert.Single(canonical.InstructionSections).Steps);
            Assert.NotEqual(Guid.Empty, step.Id);
            Assert.Equal(instruction, step.Text);
            Assert.Empty(step.Bindings);
            using (var metadata = JsonDocument.Parse(extracted.RawMetadata!))
                Assert.Equal(ingredients, metadata.RootElement.GetProperty("recipeIngredient")
                    .EnumerateArray().Select(value => value.GetString()));
            Assert.Equal("https://example.test/whole-use", extracted.SourceUrl);
            Assert.DoesNotContain(await db.RecipeImportReports.AsNoTracking().ToListAsync(), report => report.RecipeId == id);

            // Same controlled external Hero boundary and real follow-up processors
            // as AbsoluteRelationships; no canonical association is seeded here.
            var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == extraction.InstanceId);
            var clock = services.GetRequiredService<IClock>();
            var hero = workflow.Tasks.Single(x => x.ProcessorName == "GenerateHero");
            await store.PublishAsync(await store.CaptureForTaskAsync(hero, id),
                new(null, await repository.GetInfoAsync(id, default),
                    "GenerateHero\n" + JsonSerializer.Serialize(JsonDocument.Parse(hero.Payload!).RootElement),
                    new Dictionary<string, byte[]?> { ["hero.webp"] = [7, 8, 9] }, SourceKind: "hero"), hero.TaskId);
            await new SyncRecipeProcessor(clock, db, repository, services.GetRequiredService<SupperProjectionInvalidation>(),
                Mock.Of<ISupperProjectionPublisher>(), NullLogger<SyncRecipeProcessor>.Instance, TestPublicationStore.Vocabulary(db, (repository).StorageProvider, clock, services))
                .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, JsonSerializer.Serialize(
                    names.Select((name, index) => new { normalizedKey = IngredientNormalizer.Normalize(name), section = index == 2 ? "Pantry" : "Produce", confidence = 1 })))));
            await new CategorizeIngredientsProcessor(clock, db, chat.Object, NullLogger<CategorizeIngredientsProcessor>.Instance)
                .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeIngredients"), default);
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                    """{"cuisineType":"Italian","mealTypes":["Lunch","Supper"],"primaryMealType":"Supper","isVegetarian":true}""")));
            await ActivatorUtilities.CreateInstance<CategorizeRecipeProcessor>(services, chat.Object)
                .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeRecipe"), default);
            await new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance, Mock.Of<IScheduleEventPublisher>(), store)
                .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "RecipeReady"), default);

            var ready = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.True(ready.IsReady);
            Assert.Equal(title, ready.Name);
            Assert.Equal(extracted.CanonicalContent, ready.CanonicalContent);
            Assert.Equal(extracted.RawMetadata, ready.RawMetadata);
            Assert.DoesNotContain(await db.RecipeImportReports.AsNoTracking().ToListAsync(), report => report.RecipeId == id);
            await AssertThreeAnchorInputUnchanged(db, storage, definitionBytes, settingBytes);

            // INTENDED DOMAIN RED on current source: expected onion UUID, actual
            // null after successful ordinary fresh publication/Ready. No missing
            // future resolver/store/DI interface is invoked by this draft.
            var saved = CanonicalRecipeContentStore.Read(ready)!;
            for (var index = 0; index < 3; index++)
            {
                Assert.Equal<Guid?>(ThreeAnchorFoodIds[index], saved.IngredientLines[index].Shopping.FoodId);
                Assert.False(string.IsNullOrWhiteSpace(saved.IngredientLines[index].Shopping.MappingRevision));
            }
            Assert.Equal(3, saved.IngredientLines.Select(line => line.Shopping.FoodId).Distinct().Count());
        }, localRecipeStore: true);
    }

    private static async Task<(byte[] Definitions, byte[] Setting)> InstallThreeAnchorInput(RecipeDbContext db, IStorageProvider storage)
    {
        var fixtures = Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi.Tests/Fixtures");
        var definitions = await File.ReadAllBytesAsync(Path.Combine(fixtures, "food-vocabulary-three-anchor-v1.json"));
        var setting = await File.ReadAllBytesAsync(Path.Combine(fixtures, "food-vocabulary-publication-input.json"));
        Assert.Equal(ThreeAnchorSha256, ThreeAnchorHash(definitions));
        Assert.Equal(ThreeAnchorSettingSha256, ThreeAnchorHash(setting));
        using var document = JsonDocument.Parse(definitions);
        Assert.Equal(ThreeAnchorRevision, document.RootElement.GetProperty("revision").GetString());
        var foods = document.RootElement.GetProperty("releases")[0].GetProperty("foods").EnumerateArray().ToArray();
        Assert.Equal(ThreeAnchorFoodIds, foods.Select(food => food.GetProperty("id").GetGuid()));
        Assert.Equal(15, foods.Sum(food => food.GetProperty("aliases").GetArrayLength()));
        Assert.False(document.RootElement.TryGetProperty("mappings", out _));
        using var installed = JsonDocument.Parse(setting);
        using var request = JsonDocument.Parse(ThreeAnchorCanonicalPublicationRequest);
        Assert.Equal("c3f2cb42a96f964c4776fd77c2a298d781093cd518ab44da69057d22f7609a75",
            ThreeAnchorHash(Encoding.UTF8.GetBytes(ThreeAnchorCanonicalPublicationRequest)));
        Assert.True(JsonElement.DeepEquals(request.RootElement, installed.RootElement.GetProperty("operations")[0].GetProperty("request")));
        Assert.Null(await storage.LoadAsync("recipes", ThreeAnchorStorageKey));
        Assert.False(await db.FamilySettings.AnyAsync(value => value.Key == ThreeAnchorSettingKey));
        await storage.SaveAtomicallyAsync("recipes", ThreeAnchorStorageKey, definitions);
        db.FamilySettings.Add(new FamilySetting
        {
            Id = ThreeAnchorSettingId,
            Key = ThreeAnchorSettingKey,
            Value = installed.RootElement.Clone(),
            UpdatedAt = new DateTimeOffset(2026, 10, 12, 1, 30, 0, TimeSpan.Zero)
        });
        await db.SaveChangesAsync();
        await AssertThreeAnchorInputUnchanged(db, storage, definitions, setting);
        return (definitions, setting);
    }

    private static async Task AssertThreeAnchorInputUnchanged(RecipeDbContext db, IStorageProvider storage, byte[] definitions, byte[] setting)
    {
        var actualBytes = await storage.LoadAsync("recipes", ThreeAnchorStorageKey);
        Assert.NotNull(actualBytes);
        Assert.Equal(definitions, actualBytes);
        Assert.Equal(ThreeAnchorSha256, ThreeAnchorHash(actualBytes));
        var actual = await db.FamilySettings.AsNoTracking().SingleAsync(value => value.Key == ThreeAnchorSettingKey);
        Assert.Equal(ThreeAnchorSettingId, actual.Id);
        using var expected = JsonDocument.Parse(setting);
        Assert.True(JsonElement.DeepEquals(expected.RootElement, actual.Value));
    }

    private static string ThreeAnchorHash(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
}
