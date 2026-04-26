using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services.Agents;
using Xunit;

namespace RecipeApi.Tests.Services.Processors;

public class ExtractRecipeProcessorTests : IDisposable
{
    private readonly string _testRoot;
    private readonly Mock<IChatClient> _chatClientMock;
    private readonly RecipeExtractionAgent _agent;
    private readonly Guid _recipeId = Guid.NewGuid();

    public ExtractRecipeProcessorTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(_testRoot);

        _chatClientMock = new Mock<IChatClient>();
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["RecipesRoot"]).Returns(_testRoot);
        mockConfig.Setup(c => c.GetSection("AgentSettings:ContextWindow")).Returns(new Mock<IConfigurationSection>().Object);
        
        // Ensure env var doesn't override configuration
        Environment.SetEnvironmentVariable("RECIPES_ROOT", null);
        var recipesRootResolver = new RecipesRootResolver(mockConfig.Object);

        _agent = new RecipeExtractionAgent(
            _chatClientMock.Object,
            recipesRootResolver,
            mockConfig.Object,
            new Mock<ILogger<RecipeExtractionAgent>>().Object);
    }

    public void Dispose()
    {
        if (Directory.Exists(_testRoot))
        {
            Directory.Delete(_testRoot, true);
        }
        Environment.SetEnvironmentVariable("RECIPES_ROOT", null);
    }

    [Fact]
    public async Task ExecuteAsync_ValidPayload_ExtractsRecipe()
    {
        // Arrange
        var recipeDir = Path.Combine(_testRoot, _recipeId.ToString());
        var originalDir = Path.Combine(recipeDir, "original");
        Directory.CreateDirectory(originalDir);
        File.WriteAllText(Path.Combine(originalDir, "card1.jpg"), "dummy image data");
        File.WriteAllText(Path.Combine(recipeDir, "recipe.info"), "{}");

        var task = new WorkflowTask
        {
            Payload = $"{{\"recipeId\": \"{_recipeId}\"}}"
        };

        var jsonResponse = "{\"name\": \"Test Recipe\", \"recipeIngredient\": [\"Ing 1\"]}";
        _chatClientMock.Setup(c => c.GetResponseAsync(
            It.IsAny<IEnumerable<ChatMessage>>(),
            It.IsAny<ChatOptions>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, jsonResponse)));

        // Act
        await _agent.ExecuteAsync(task, CancellationToken.None);

        // Assert
        var recipeJsonPath = Path.Combine(recipeDir, "recipe.json");
        Assert.True(File.Exists(recipeJsonPath));
        var savedJson = await File.ReadAllTextAsync(recipeJsonPath);
        Assert.Contains("Test Recipe", savedJson);
    }

    [Fact]
    public async Task ExecuteAsync_MissingRecipeInfo_ThrowsFileNotFoundException()
    {
        // Arrange
        var recipeDir = Path.Combine(_testRoot, _recipeId.ToString());
        var originalDir = Path.Combine(recipeDir, "original");
        Directory.CreateDirectory(originalDir);
        // recipe.info is missing

        var task = new WorkflowTask
        {
            Payload = $"{{\"recipeId\": \"{_recipeId}\"}}"
        };

        // Act & Assert
        await Assert.ThrowsAsync<FileNotFoundException>(() => _agent.ExecuteAsync(task, CancellationToken.None));
    }
}
