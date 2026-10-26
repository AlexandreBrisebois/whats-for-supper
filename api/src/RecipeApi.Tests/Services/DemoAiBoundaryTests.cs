using System.Net;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Infrastructure;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class DemoAiBoundaryTests
{
    [Fact]
    public async Task DemoCategorization_FailsBeforeChangingPreparedFacts()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync(new Dictionary<string, string?> { ["DEMO_MODE"] = "true" });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Synthetic lentil dish", Category = "Lunch", CuisineType = "Canadian", MealTypes = ["Lunch"], AddedBy = factory.DefaultFamilyMemberId };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var inner = new Mock<IChatClient>(MockBehavior.Strict);
        var client = new DemoModeChatClient(inner.Object, scope.ServiceProvider.GetRequiredService<DemoModeOptions>());
        var processor = ActivatorUtilities.CreateInstance<CategorizeRecipeProcessor>(scope.ServiceProvider, client);
        await Assert.ThrowsAsync<DemoAiUnavailableException>(() => processor.ExecuteAsync(new WorkflowTask
        {
            Payload = System.Text.Json.JsonSerializer.Serialize(new { recipeId = recipe.Id })
        }, CancellationToken.None));
        Assert.Equal("Lunch", recipe.Category);
        Assert.Equal("Canadian", recipe.CuisineType);
        Assert.Equal(new[] { "Lunch" }, recipe.MealTypes);
        inner.Verify(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    internal static IConfiguration Config(bool demo, bool credential = true) =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["DEMO_MODE"] = demo.ToString(),
            ["GEMINI_API_KEY"] = credential ? "synthetic-not-a-real-key" : "",
            ["EMBEDDING_DIMENSIONS"] = "2"
        }).Build();

    [Fact]
    public async Task NativeEmbedding_DemoRefusesEveryAttemptBeforeTransport()
    {
        using var handler = new SyntheticHandler("""{"embedding":{"values":[0.25,-0.5]}}""");
        var provider = new GeminiEmbeddingProvider(Config(true), new ClientFactory(handler));
        for (var attempt = 0; attempt < 3; attempt++)
            await Assert.ThrowsAnyAsync<InvalidOperationException>(() => provider.GenerateAsync("Synthetic soup"));
        Assert.Equal(0, handler.Sends);
    }

    [Fact]
    public async Task NativeEmbedding_NonDemoDelegatesToSyntheticTransport()
    {
        using var handler = new SyntheticHandler("""{"embedding":{"values":[0.25,-0.5]}}""");
        var provider = new GeminiEmbeddingProvider(Config(false), new ClientFactory(handler));
        var embedding = await provider.GenerateAsync("Synthetic soup");
        Assert.Equal(new float[] { 0.25f, -0.5f }, embedding);
        Assert.Equal(1, handler.Sends);
    }

    [Fact]
    public async Task ChatAndStream_DemoNeverDelegate()
    {
        var inner = new Mock<IChatClient>(MockBehavior.Strict);
        inner.Setup(c => c.Dispose());
        using var client = new DemoModeChatClient(inner.Object, new DemoModeOptions(Config(true)));
        var messages = new[] { new ChatMessage(ChatRole.User, "Synthetic meal") };
        await Assert.ThrowsAsync<InvalidOperationException>(() => client.GetResponseAsync(messages));
        Assert.Throws<InvalidOperationException>(() => client.GetStreamingResponseAsync(messages));
        inner.Verify(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()), Times.Never);
        inner.Verify(c => c.GetStreamingResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("ExtractRecipe")]
    [InlineData("GenerateDescription")]
    [InlineData("SynthesizeRecipe")]
    [InlineData("WebAcquisition")]
    [InlineData("CategorizeIngredients")]
    public async Task QueuedModelWork_IsUnavailableRatherThanSuccessful(string name)
    {
        var processor = new DemoModeBypassProcessor(name, new DemoModeOptions(Config(true)));
        await Assert.ThrowsAnyAsync<InvalidOperationException>(() => processor.ExecuteAsync(new WorkflowTask { ProcessorName = name }, CancellationToken.None));
    }

    [Fact]
    public async Task ForcedHero_DemoRefusesAndPreservesPreparedBytes()
    {
        var root = Path.Combine(Path.GetTempPath(), "wfs-demo-hero-" + Guid.NewGuid().ToString("N"));
        var config = new ConfigurationBuilder().AddConfiguration(Config(true, credential: false))
            .AddInMemoryCollection(new Dictionary<string, string?> { ["DataRoot"] = root }).Build();
        var recipes = new RecipesRootResolver(new DataRootResolver(config), config);
        var id = Guid.NewGuid();
        var directory = Path.Combine(recipes.Root, id.ToString());
        Directory.CreateDirectory(directory);
        await File.WriteAllTextAsync(Path.Combine(directory, "recipe.info"), "{}");
        var hero = Path.Combine(directory, "hero.webp");
        await File.WriteAllBytesAsync(hero, [1, 2, 3]);
        try
        {
            var agent = new RecipeHeroAgent(recipes, config, NullLogger<RecipeHeroAgent>.Instance);
            await Assert.ThrowsAnyAsync<InvalidOperationException>(() => agent.CreateHeroImageAsync(id, force: true));
            var retained = await File.ReadAllBytesAsync(hero);
            Assert.Equal(new byte[] { 1, 2, 3 }, retained);
        }
        finally { Directory.Delete(root, true); }
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DirectHeroSdk_UsesOnlySyntheticTransport_WithDemoForceAndRetryGuard(bool demo)
    {
        var root = Path.Combine(Path.GetTempPath(), "wfs-demo-sdk-" + Guid.NewGuid().ToString("N"));
        var config = new ConfigurationBuilder().AddConfiguration(Config(demo))
            .AddInMemoryCollection(new Dictionary<string, string?> { ["DataRoot"] = root }).Build();
        var recipes = new RecipesRootResolver(new DataRootResolver(config), config);
        var id = Guid.NewGuid();
        var directory = Path.Combine(recipes.Root, id.ToString());
        Directory.CreateDirectory(directory);
        await File.WriteAllTextAsync(Path.Combine(directory, "recipe.info"), "{}");
        await File.WriteAllTextAsync(Path.Combine(directory, "recipe.json"), "{\"name\":\"Synthetic soup\"}");
        var hero = Path.Combine(directory, "hero.webp");
        await File.WriteAllBytesAsync(hero, [1, 2, 3]);
        using var handler = new SyntheticHandler("""{"candidates":[{"content":{"parts":[{"inlineData":{"mimeType":"image/webp","data":"BAUG"}}]}}]}""", forbidden: demo);
        var agent = new RecipeHeroAgent(recipes, config, NullLogger<RecipeHeroAgent>.Instance, new ClientFactory(handler));
        try
        {
            if (demo)
            {
                for (var attempt = 0; attempt < 3; attempt++)
                    await Assert.ThrowsAsync<DemoAiUnavailableException>(() => agent.CreateHeroImageAsync(id, force: true));
                await Assert.ThrowsAsync<DemoAiUnavailableException>(() => agent.ExecuteAsync(new WorkflowTask
                {
                    Payload = System.Text.Json.JsonSerializer.Serialize(new { recipeId = id, force = true })
                }, CancellationToken.None));
            }
            else await agent.CreateHeroImageAsync(id, force: true);
            Assert.Equal(demo ? 0 : 1, handler.Sends);
            var bytes = await File.ReadAllBytesAsync(hero);
            Assert.Equal(demo ? new byte[] { 1, 2, 3 } : new byte[] { 4, 5, 6 }, bytes);
        }
        finally { Directory.Delete(root, true); }
    }

    [Fact]
    public async Task ChatAndStream_NonDemoDelegateToDoubles()
    {
        var inner = new Mock<IChatClient>(MockBehavior.Strict);
        inner.Setup(c => c.Dispose());
        inner.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, "Synthetic response")));
        inner.Setup(c => c.GetStreamingResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()))
            .Returns(EmptyUpdates());
        using var client = new DemoModeChatClient(inner.Object, new DemoModeOptions(Config(false)));
        var messages = new[] { new ChatMessage(ChatRole.User, "Synthetic meal") };
        await client.GetResponseAsync(messages);
        await foreach (var _ in client.GetStreamingResponseAsync(messages)) { }
        inner.Verify(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()), Times.Once);
        inner.Verify(c => c.GetStreamingResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    private static async IAsyncEnumerable<ChatResponseUpdate> EmptyUpdates()
    {
        await Task.CompletedTask;
        yield break;
    }

    internal sealed class ClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }

    internal sealed class SyntheticHandler(string response, bool forbidden = false) : HttpMessageHandler
    {
        public int Sends { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Sends++;
            if (forbidden) throw new InvalidOperationException("Test forbids outbound provider requests.");
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(response, System.Text.Encoding.UTF8, "application/json")
            });
        }
    }
}
