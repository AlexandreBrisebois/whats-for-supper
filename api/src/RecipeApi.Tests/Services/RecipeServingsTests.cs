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
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class RecipeServingsTests
{
    [Theory]
    [InlineData(4, "{\"servings\":3}", 3)]
    [InlineData(null, "{\"servings\":2}", 2)]
    [InlineData(4, "{}", 4)]
    [InlineData(null, "{}", null)]
    [InlineData(4, "{\"servings\":2147483647}", 2147483647)]
    public async Task RecipeServings_HttpEditingPreservesSource(int? initial, string payload, int? expected)
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Radiatore", Servings = initial, Ingredients = "[\"510 g beef\",\"340 g pasta\"]", RawMetadata = "{\"recipeYield\":\"4 portions\"}" };
        db.Recipes.Add(recipe); await db.SaveChangesAsync();
        using var client = factory.CreateAuthenticatedClient();
        var response = await client.PatchAsync($"/api/recipes/{recipe.Id}", new StringContent(payload, System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        db.ChangeTracker.Clear(); var saved = await db.Recipes.FindAsync(recipe.Id);
        Assert.Equal(expected, saved!.Servings); Assert.Equal(recipe.RawMetadata, saved.RawMetadata); Assert.Equal(recipe.Ingredients, saved.Ingredients);
        var detail = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{recipe.Id}")).RootElement.GetProperty("recipe");
        Assert.Equal(expected, detail.GetProperty("servings").ValueKind == JsonValueKind.Null ? (int?)null : detail.GetProperty("servings").GetInt32());
    }

    [Theory]
    [InlineData("null")][InlineData("0")][InlineData("-1")][InlineData("1.5")][InlineData("2147483648")][InlineData("\"3\"")][InlineData("true")][InlineData("{}")]
    public async Task RecipeServings_InvalidHttpEditingIsAtomic(string supplied)
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync();
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Keep", Servings = 4 }; db.Recipes.Add(recipe); await db.SaveChangesAsync();
        using var client = factory.CreateAuthenticatedClient();
        var response = await client.PatchAsync($"/api/recipes/{recipe.Id}", new StringContent("{\"name\":\"Changed\",\"servings\":" + supplied + "}", System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
        db.ChangeTracker.Clear(); var saved = await db.Recipes.FindAsync(recipe.Id); Assert.Equal(4, saved!.Servings); Assert.Equal("Keep", saved.Name);
    }

    [Fact]
    public async Task RecipeServings_EditingRequiresAuthorization()
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync();
        using var client = factory.CreateClient();
        Assert.Equal(System.Net.HttpStatusCode.Unauthorized, (await client.PatchAsync($"/api/recipes/{Guid.NewGuid()}", new StringContent("{\"servings\":3}", System.Text.Encoding.UTF8, "application/json"))).StatusCode);
    }

    [Fact]
    public async Task RecipeServings_ExtractionSyncProjectsFourWithoutScalingOrInfoFields()
    {
        await using var db = TestDbContextFactory.Create();
        await ExtractAndSync(db);
    }

    [Theory]
    [InlineData("2 portions", 2)]
    [InlineData("4 portions", 4)]
    [InlineData(" 1 serving ", 1)]
    [InlineData("3 SERVINGS", 3)]
    [InlineData("2 personnes", 2)]
    [InlineData("1 personne", 1)]
    [InlineData("1 person", 1)]
    [InlineData("3 people", 3)]
    [InlineData("serves 4", 4)]
    [InlineData("1 portion", 1)]
    [InlineData("2 or 4 portions", null)]
    [InlineData("2–4 servings", null)]
    [InlineData("12 muffins", null)]
    [InlineData("340 g", null)]
    [InlineData("4", null)]
    [InlineData("0 portions", null)]
    [InlineData("-2 portions", null)]
    [InlineData("1.5 portions", null)]
    [InlineData("2147483648 servings", null)]
    [InlineData(null, null)]
    public async Task RecipeServings_CapturedPublicationProjectsOnlyCompleteServingExpressions(string? yield, int? expected)
    {
        await using var db = TestDbContextFactory.Create();
        var id = Guid.NewGuid();
        var storage = new InMemoryStorageProvider();
        var repository = new RecipeRepository(storage);
        await storage.SaveAsync("recipes", $"{id}/recipe.info", JsonSerializer.Serialize(new RecipeInfo { Id = id }, JsonDefaults.CamelCase));
        await storage.SaveAsync("recipes", $"{id}/recipe.json", JsonSerializer.Serialize(new { recipeYield = yield, recipeIngredient = new[] { "340 g pasta" } }));
        db.Recipes.Add(new Recipe { Id = id });
        await db.SaveChangesAsync();
        var task = await ProducerTask(db, repository, id);
        var owner = PublicationStore(db, repository);
        await owner.PublishAsync(await owner.CaptureAsync(id), new RecipePublicationCandidate(
            JsonSerializer.Serialize(new { recipeYield = yield, recipeIngredient = new[] { "340 g pasta" } }),
            new RecipeInfo { Id = id }), task.TaskId);
        for (var attempt = 0; attempt < 2; attempt++) {
            await Sync(db, repository, task);
            var wire = JsonSerializer.SerializeToElement(RecipeService.MapToDto((await db.Recipes.FindAsync(id))!));
            Assert.True(wire.TryGetProperty("servings", out var count), "DTO must expose servings including unknown null.");
            Assert.Equal(expected, count.ValueKind == JsonValueKind.Null ? (int?)null : count.GetInt32());
        }
    }

    internal static async Task<Guid> ExtractAndSync(RecipeDbContext db)
    {
        var id = Guid.NewGuid();
        var storage = new InMemoryStorageProvider();
        var repository = new RecipeRepository(storage);
        await storage.SaveAsync("recipes", $"{id}/recipe.info", JsonSerializer.Serialize(new RecipeInfo { Id = id, ImageCount = 1 }, JsonDefaults.CamelCase));
        await storage.SaveAsync("recipes", $"{id}/original/0.jpg", "synthetic provider-boundary image");
        var chat = new Mock<IChatClient>();
        chat.SetupSequence(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, """
                {"name":"Radiatore","recipeYield":"4 portions","recipeIngredient":["510 g beef","340 g pasta"],"recipeInstructions":["Cook the pasta and beef."]}
                """)))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, "Radiatore with beef and pasta.")));
        var prompts = new Mock<IPromptRepository>();
        prompts.Setup(p => p.GetPrompt(It.IsAny<PromptType>())).Returns("Extract the supplied recipe.");
        var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance,
            new RecipeFilePublicationStore(db, repository, new SystemClock(), new SupperProjectionInvalidation(db, new SystemClock(), new DeploymentCalendar(new ConfigurationManager())), TestPublicationStore.Vocabulary(db, repository.StorageProvider, new SystemClock())), "ExtractRecipe");
        db.Recipes.Add(new Recipe { Id = id, Name = "Pending", IsReady = true });
        await db.SaveChangesAsync();
        var task = await ProducerTask(db, repository, id);
        await agent.ExecuteAsync(task, CancellationToken.None);
        await Sync(db, repository, task);
        db.ChangeTracker.Clear();
        var recipe = await db.Recipes.SingleAsync(r => r.Id == id);
        var dto = JsonSerializer.SerializeToElement(RecipeService.MapToDto(recipe));
        Assert.True(dto.TryGetProperty("servings", out var servings), "Recipe DTO must expose the stored ingredient serving basis.");
        Assert.Equal(4, servings.GetInt32());
        Assert.Equal(new[] { "510 g beef", "340 g pasta" }, RecipeService.DeserializeIngredients(recipe.Ingredients));
        Assert.Equal("4 portions", JsonDocument.Parse(recipe.RawMetadata!).RootElement.GetProperty("recipeYield").GetString());
        var info = JsonDocument.Parse((await storage.LoadAsync("recipes", $"{id}/recipe.info"))!);
        Assert.False(info.RootElement.TryGetProperty("servings", out _));
        Assert.False(info.RootElement.TryGetProperty("recipeYield", out _));
        chat.Verify(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()), Times.Exactly(2));
        return id;
    }

    internal static async Task<RecipeReadyProcessor> ReadyProcessor(RecipeDbContext db, WorkflowTask task, IScheduleEventPublisher publisher)
    {
        var repository = new RecipeRepository(new InMemoryStorageProvider());
        using var payload = JsonDocument.Parse(task.Payload!);
        var id = payload.RootElement.GetProperty("recipeId").GetGuid();
        var recipe = await db.Recipes.FindAsync(id);
        var owner = PublicationStore(db, repository);
        if (recipe is not null)
        {
            await repository.SaveInfoAsync(new RecipeInfo { Id = id, Name = recipe.Name, ImageCount = recipe.ImageCount }, default);
            var instance = new WorkflowInstance { Id = task.InstanceId, WorkflowId = "ready-test",
                Parameters = JsonSerializer.Serialize(new Dictionary<string, string> { ["recipeId"] = id.ToString() }) };
            instance.Tasks.Add(task);
            await owner.CaptureLaunchAsync(instance);
            db.WorkflowInstances.Add(instance);
            await db.SaveChangesAsync();
        }
        return new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance, publisher, owner);
    }

    internal static RecipeFilePublicationStore PublicationStore(RecipeDbContext db, RecipeRepository repository) =>
        new(db, repository, new SystemClock(), new SupperProjectionInvalidation(db, new SystemClock(), new DeploymentCalendar(new ConfigurationManager())), TestPublicationStore.Vocabulary(db, repository.StorageProvider, new SystemClock()));

    internal static async Task<WorkflowTask> ProducerTask(RecipeDbContext db, RecipeRepository repository, Guid recipeId)
    {
        var instance = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "recipe-import" };
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = instance.Id,
            ProcessorName = "ExtractRecipe", TaskName = "extract_recipe", Payload = JsonSerializer.Serialize(new { recipeId }) };
        instance.Parameters = JsonSerializer.Serialize(new Dictionary<string, string> { ["recipeId"] = recipeId.ToString() });
        instance.Tasks.Add(task);
        await PublicationStore(db, repository).CaptureLaunchAsync(instance);
        db.WorkflowInstances.Add(instance);
        await db.SaveChangesAsync();
        return task;
    }

    internal static Task<object?> Sync(RecipeDbContext db, RecipeRepository repository, WorkflowTask task)
    {
        var invalidation = new SupperProjectionInvalidation(db, new SystemClock(), new DeploymentCalendar(new ConfigurationManager()));
        return new SyncRecipeProcessor(new SystemClock(), db, repository, invalidation, Mock.Of<ISupperProjectionPublisher>(), NullLogger<SyncRecipeProcessor>.Instance, TestPublicationStore.Vocabulary(db, (repository).StorageProvider, new SystemClock())).ExecuteAsync(task, CancellationToken.None);
    }
}
