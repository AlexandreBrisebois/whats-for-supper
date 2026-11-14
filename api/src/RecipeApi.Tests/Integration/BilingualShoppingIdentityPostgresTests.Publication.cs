using System.Net;
using System.Net.Http.Json;
using System.Reflection;
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
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Utils;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class BilingualShoppingIdentityPostgresTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private sealed record ImportedSource(Guid Id, WorkflowTask Extraction, RecipeAgent Agent, Mock<IChatClient> Provider);

    private static async Task<ImportedSource> ImportAsync(IServiceProvider services, string locale)
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        var storage = services.GetRequiredService<IStorageProvider>();
        var publications = services.GetRequiredService<RecipeFilePublicationStore>();
        var clock = services.GetRequiredService<IClock>();
        await storage.SaveAsync("workflows", "url-import.yaml", await File.ReadAllTextAsync(
            Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi/Workflows/url-import.yaml")));
        var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db, publications);
        var service = ActivatorUtilities.CreateInstance<RecipeService>(services, publications, orchestrator);
        var member = (await db.FamilyMembers.FirstAsync()).Id;
        var id = await service.CaptureUrl(new() { Url = $"https://example.test/bounded-{locale}" }, member);
        db.ChangeTracker.Clear();
        var workflow = (await db.WorkflowInstances.Include(x => x.Tasks).Where(x => x.WorkflowId == "url-import").ToArrayAsync())
            .Single(x => x.Tasks.Any(task => task.Payload?.Contains(id.ToString("D"), StringComparison.Ordinal) == true));
        var prompts = new Mock<IPromptRepository>();
        prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Controlled external recipe extraction");
        var acquisition = new Mock<IChatClient>();
        acquisition.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, "{\"name\":\"Bounded source\"}")));
        using var http = new HttpClient(new BoundedSourceHandler());
        await new WebAcquisitionAgent(acquisition.Object, publications, prompts.Object, http, NullLogger<WebAcquisitionAgent>.Instance)
            .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "FetchUrlContent"), default);
        var names = locale == "fr"
            ? new[] { "oignon émincé", "tomate", "tomates en conserve", "échalote", "tomates séchées" }
            : new[] { "onion, diced", "tomato", "canned tomatoes", "échalote", "tomatoes with basil" };
        var source = JsonSerializer.Serialize(new
        {
            name = "Bounded " + locale,
            recipeYield = "4 servings",
            recipeIngredient = names.Select(name => "25 g " + name),
            supply = names.Select(name => new { name, requiredQuantity = new { value = 25, unitText = "g" } }),
            recipeInstructions = new[] { new { text = "Mix." } }
        });
        var provider = new Mock<IChatClient>();
        provider.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, source)));
        var extraction = workflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
        var agent = new RecipeAgent(provider.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance, publications, "ExtractRecipe");
        await agent.ExecuteAsync(extraction, default);
        var hero = workflow.Tasks.Single(x => x.ProcessorName == "GenerateHero");
        await publications.PublishAsync(await publications.CaptureForTaskAsync(hero, id),
            new(null, await services.GetRequiredService<RecipeRepository>().GetInfoAsync(id, default),
                "GenerateHero\n" + JsonSerializer.Serialize(JsonDocument.Parse(hero.Payload!).RootElement),
                new Dictionary<string, byte[]?> { ["hero.webp"] = [7, 8, 9] }, SourceKind: "hero"), hero.TaskId);
        await new SyncRecipeProcessor(clock, db, services.GetRequiredService<RecipeRepository>(),
            services.GetRequiredService<SupperProjectionInvalidation>(), Mock.Of<ISupperProjectionPublisher>(),
            NullLogger<SyncRecipeProcessor>.Instance, services.GetRequiredService<FoodVocabularyStore>())
            .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
        var category = new Mock<IChatClient>();
        category.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                """{"cuisineType":"Italian","mealTypes":["Lunch","Supper"],"primaryMealType":"Supper","isVegetarian":true}""")));
        await ActivatorUtilities.CreateInstance<CategorizeRecipeProcessor>(services, category.Object)
            .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeRecipe"), default);
        await new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance, Mock.Of<IScheduleEventPublisher>(), publications)
            .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "RecipeReady"), default);
        Assert.True((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).IsReady);
        return new(id, extraction, agent, provider);
    }

    private static async Task<JsonElement> CaptureProtectedAsync(IServiceProvider services)
    {
        var recovery = services.GetRequiredService<RecoverySnapshotService>();
        var captured = await recovery.CaptureAsync(default);
        Assert.Equal("completed", captured.State);
        var inspect = typeof(RecoverySnapshotService).GetMethod("InspectSourceProtectionAsync", BindingFlags.NonPublic | BindingFlags.Instance)!;
        var task = (Task)inspect.Invoke(recovery, [captured.SnapshotId!.Value, CancellationToken.None])!;
        await task;
        var source = task.GetType().GetProperty("Result")!.GetValue(task)!;
        return JsonSerializer.SerializeToElement(source, source.GetType(), Json);
    }

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData("en")]
    [InlineData("fr")]
    public Task ReviewedRelease_OrdinaryPublicationPersistsExactMappingsAndCapturedAdoptionInputs(string locale) =>
        WithHousehold(async factory =>
        {
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            var vocabulary = services.GetRequiredService<FoodVocabularyStore>();
            Assert.Null(await vocabulary.CaptureActiveAsync());
            var before = await CaptureProtectedAsync(services);
            var installed = await vocabulary.PublishReviewedAsync(BoundedVocabularyInput.Bytes(), null, Guid.NewGuid(), BoundedVocabularyInput.ReviewIdentity);
            var after = await CaptureProtectedAsync(services);
            foreach (var table in before.GetProperty("tables").EnumerateObject().Where(x => x.Name != "family_settings"))
                Assert.True(JsonElement.DeepEquals(table.Value, after.GetProperty("tables").GetProperty(table.Name)), table.Name);
            var imported = await ImportAsync(services, locale);
            var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id);
            var content = CanonicalRecipeContentStore.Read(recipe)!;
            Assert.Equal(new Guid?[] { BoundedVocabularyInput.Onion, BoundedVocabularyInput.Tomato, BoundedVocabularyInput.CannedTomato, null, null },
                content.IngredientLines.Select(x => x.Shopping.FoodId));
            Assert.Equal(content.IngredientLines.Select(x => x.Description), content.IngredientLines.Select(x => x.Shopping.Name));
            var evidence = JsonSerializer.Deserialize<RecipeFoodMappingEvidence>(recipe.FoodMappingEvidence!, Json)!;
            Assert.Equal(3, evidence.Mappings.Length);
            Assert.All(evidence.Mappings, mapping =>
            {
                Assert.Equal(content.ContentRevision, mapping.Facts.ContentRevision);
                Assert.Equal(BoundedVocabularyInput.Revision, mapping.VocabularyRevision);
                Assert.Equal(BoundedVocabularyInput.Sha256, mapping.VocabularySha256);
                Assert.Equal(1, mapping.ResolverPolicyVersion);
            });
            using var client = factory.CreateAuthenticatedClient();
            using var response = await client.GetAsync($"/api/recipes/{imported.Id}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var detail = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(content.ContentRevision, detail.GetProperty("recipe").GetProperty("contentRevision").GetString());
            Assert.Equal(3, detail.GetProperty("recipe").GetProperty("ingredientLines").EnumerateArray()
                .Count(x => x.GetProperty("shopping").GetProperty("foodId").ValueKind == JsonValueKind.String));
            var calls = imported.Provider.Invocations.Count;
            await imported.Agent.ExecuteAsync(imported.Extraction, default);
            Assert.Equal(calls, imported.Provider.Invocations.Count);
            Assert.Equal(recipe.CanonicalContent, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id)).CanonicalContent);
            output.WriteLine("BILINGUAL_ADOPTION " + JsonSerializer.Serialize(new
            {
                locale, before, after, installed,
                source = new { recipe.Id, recipe.RawMetadata, recipe.CanonicalContent, recipe.FoodMappingEvidence, recipe.SourceUrl },
                vocabularyFiles = JsonSerializer.Deserialize<JsonElement>(VocabularyFiles(services)),
                sourceSnapshotKind = "actual-disposable-postgresql-and-local-files",
                preexistingMappingsChanged = 0,
                newMappedLines = evidence.Mappings.Length
            }, Json));
        });

    private sealed class BoundedSourceHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("Controlled source acquisition") });
    }
}
