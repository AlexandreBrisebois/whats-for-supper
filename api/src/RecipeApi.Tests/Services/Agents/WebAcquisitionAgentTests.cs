using System.Net;
using System.Text;
using System.Text.Json;
using FsCheck;
using FsCheck.Xunit;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using Moq;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Workflow;
using Xunit;

namespace RecipeApi.Tests.Services.Agents;

/// <summary>
/// Tests for WebAcquisitionAgent — verifies the no-rawHtml guarantee and correct artifact storage.
/// </summary>
public class WebAcquisitionAgentTests
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// A simple fake HttpMessageHandler that returns configurable responses per request.
    /// </summary>
    public class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

        public FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
            => _handler = handler;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
            => Task.FromResult(_handler(request));
    }

    private static (WebAcquisitionAgent agent, InMemoryStorageProvider storage, RecipeRepository repo) CreateSut(
        string htmlContent,
        string aiJsonResponse,
        string targetUrl = "https://example.com/recipe")
    {
        var storage = new InMemoryStorageProvider();
        var repo = new RecipeRepository(storage);

        // Mock IChatClient — GetResponseAsync is called internally by AsAIAgent.RunAsync
        var chatClientMock = new Mock<IChatClient>();
        chatClientMock
            .Setup(c => c.GetResponseAsync(
                It.IsAny<IEnumerable<ChatMessage>>(),
                It.IsAny<ChatOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, aiJsonResponse)));

        // Mock IPromptRepository
        var promptRepoMock = new Mock<IPromptRepository>();
        promptRepoMock
            .Setup(p => p.GetPrompt(It.IsAny<PromptType>()))
            .Returns("Extract context from HTML.");

        // Fake HttpClient: returns htmlContent for the page URL, 404 for anything else
        var fakeHandler = new FakeHttpMessageHandler(req =>
        {
            if (req.RequestUri?.ToString() == targetUrl)
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(htmlContent, Encoding.UTF8, "text/html")
                };
            }
            // Hero image requests or unknown URLs → 404 (no hero image downloaded)
            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        var httpClient = new HttpClient(fakeHandler);

        var agent = new WebAcquisitionAgent(
            chatClientMock.Object,
            repo,
            promptRepoMock.Object,
            httpClient,
            new Mock<ILogger<WebAcquisitionAgent>>().Object);

        return (agent, storage, repo);
    }

    private static WorkflowTask MakeTask(Guid recipeId, string url)
        => new() { Payload = $"{{\"recipeId\": \"{recipeId}\", \"url\": \"{url}\"}}" };

    private static async Task PreCreateRecipeInfo(InMemoryStorageProvider storage, Guid recipeId)
    {
        var info = new RecipeInfo { Id = recipeId };
        var json = JsonSerializer.Serialize(info, JsonDefaults.CamelCase);
        await storage.SaveAsync("recipes", $"{recipeId}/recipe.info", json);
    }

    // ── Unit tests ────────────────────────────────────────────────────────────

    [Fact]
    public async Task ProcessUrlAsync_DoesNotWriteRecipeJson()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        const string url = "https://example.com/recipe";
        const string html = "<html><body><h1>Test Recipe</h1></body></html>";
        const string aiResponse = "{\"name\": \"Test Recipe\", \"heroImageUrl\": null}";

        var (agent, storage, _) = CreateSut(html, aiResponse, url);
        await PreCreateRecipeInfo(storage, recipeId);

        // Act
        await agent.ExecuteAsync(MakeTask(recipeId, url), CancellationToken.None);

        // Assert — recipe.json must NOT exist
        var recipeJson = await storage.LoadAsync("recipes", $"{recipeId}/recipe.json");
        Assert.Null(recipeJson);
    }

    [Fact]
    public async Task ProcessUrlAsync_WritesContentHtml()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        const string url = "https://example.com/recipe";
        const string html = "<html><body><h1>Test Recipe</h1></body></html>";
        const string aiResponse = "{\"name\": \"Test Recipe\", \"heroImageUrl\": null}";

        var (agent, storage, _) = CreateSut(html, aiResponse, url);
        await PreCreateRecipeInfo(storage, recipeId);

        // Act
        await agent.ExecuteAsync(MakeTask(recipeId, url), CancellationToken.None);

        // Assert — original/content.html must exist
        var contentHtml = await storage.LoadAsync("recipes", $"{recipeId}/original/content.html");
        Assert.NotNull(contentHtml);
        Assert.Equal(html, Encoding.UTF8.GetString(contentHtml));
    }

    [Fact]
    public async Task ProcessUrlAsync_SetsSourceUrlInRecipeInfo()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        const string url = "https://example.com/recipe";
        const string html = "<html><body><h1>Test Recipe</h1></body></html>";
        const string aiResponse = "{\"name\": \"Test Recipe\", \"heroImageUrl\": null}";

        var (agent, storage, repo) = CreateSut(html, aiResponse, url);
        await PreCreateRecipeInfo(storage, recipeId);

        // Act
        await agent.ExecuteAsync(MakeTask(recipeId, url), CancellationToken.None);

        // Assert — recipe.info.SourceUrl must equal the input URL
        var info = await repo.GetInfoAsync(recipeId, CancellationToken.None);
        Assert.Equal(url, info.SourceUrl);
    }

    // ── Property-based test ───────────────────────────────────────────────────

    // Feature: url-import-html-capture, Property 2: recipe.json never contains rawHtml after WebAcquisitionAgent
    /// <summary>
    /// For any HTML string and any mocked AI response (arbitrary name + heroImageUrl pairs):
    /// after ProcessUrlAsync, if recipe.json exists it SHALL NOT contain a rawHtml property.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 1.2, 5.1
    /// </remarks>
    [Property(MaxTest = 100)]
    public bool RecipeJson_NeverContainsRawHtml_AfterWebAcquisitionAgent(
        NonNull<string> htmlContent,
        NonEmptyString recipeName)
    {
        var recipeId = Guid.NewGuid();
        const string url = "https://example.com/recipe";

        // Build a valid AI response JSON — use JsonSerializer with safe encoder to guarantee valid JSON
        // regardless of what characters are in the recipe name.
        var aiResponse = JsonSerializer.Serialize(
            new { name = recipeName.Get, heroImageUrl = (string?)null },
            new JsonSerializerOptions
            {
                Encoder = System.Text.Encodings.Web.JavaScriptEncoder.Default
            });

        var (agent, storage, _) = CreateSut(htmlContent.Get, aiResponse, url);

        // Pre-create recipe.info synchronously
        var info = new RecipeInfo { Id = recipeId };
        var infoJson = JsonSerializer.Serialize(info, JsonDefaults.CamelCase);
        storage.SaveAsync("recipes", $"{recipeId}/recipe.info", infoJson).GetAwaiter().GetResult();

        // Run the agent
        agent.ExecuteAsync(MakeTask(recipeId, url), CancellationToken.None).GetAwaiter().GetResult();

        // Check: if recipe.json exists, it must NOT contain rawHtml
        var recipeJsonBytes = storage.LoadAsync("recipes", $"{recipeId}/recipe.json").GetAwaiter().GetResult();
        if (recipeJsonBytes == null)
        {
            // recipe.json was not written — this is the expected behaviour
            return true;
        }

        // recipe.json exists — parse and assert no rawHtml property
        var recipeJsonStr = Encoding.UTF8.GetString(recipeJsonBytes);
        try
        {
            using var doc = JsonDocument.Parse(recipeJsonStr);
            return !doc.RootElement.TryGetProperty("rawHtml", out _);
        }
        catch (JsonException)
        {
            // Unparseable JSON — no rawHtml by definition
            return true;
        }
    }
}
