using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using Xunit;

namespace RecipeApi.Tests.Services.Processors;

public class ExtractRecipeProcessorTests : IDisposable
{
    private readonly Mock<IChatClient> _chatClientMock;
    private readonly InMemoryStorageProvider _storage;
    private readonly RecipeRepository _recipeRepository;
    private readonly RecipeAgent _agent;
    private readonly Guid _recipeId = Guid.NewGuid();

    public ExtractRecipeProcessorTests()
    {
        _chatClientMock = new Mock<IChatClient>();
        _storage = new InMemoryStorageProvider();
        _recipeRepository = new RecipeRepository(_storage);
        
        var promptRepositoryMock = new Mock<IPromptRepository>();
        promptRepositoryMock.Setup(p => p.GetPrompt(It.IsAny<PromptType>())).Returns("Extract prompt");

        var mockConfig = new Mock<IConfiguration>();
        var mockSection = new Mock<IConfigurationSection>();
        mockConfig.Setup(c => c.GetSection(It.IsAny<string>())).Returns(mockSection.Object);
        mockSection.Setup(s => s.GetSection(It.IsAny<string>())).Returns(mockSection.Object);

        var dbOptions = new DbContextOptionsBuilder<RecipeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new RecipeDbContext(dbOptions);

        _agent = new RecipeAgent(
            _chatClientMock.Object,
            _recipeRepository,
            promptRepositoryMock.Object,
            mockConfig.Object,
            new Mock<ILogger<RecipeAgent>>().Object,
            db,
            "ExtractRecipe");
    }

    public void Dispose()
    {
    }

    [Fact]
    public async Task ExecuteAsync_ValidPayload_ExtractsRecipe()
    {
        // Arrange
        var info = new RecipeInfo { Id = _recipeId, ImageCount = 1 };
        await _storage.SaveAsync("recipes", $"{_recipeId}/recipe.info", System.Text.Json.JsonSerializer.Serialize(info, JsonDefaults.CamelCase));
        await _storage.SaveAsync("recipes", $"{_recipeId}/original/0.jpg", "dummy image data");

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
        var exists = await _storage.LoadAsync("recipes", $"{_recipeId}/recipe.json");
        Assert.NotNull(exists);
        var savedJson = System.Text.Encoding.UTF8.GetString(exists);
        Assert.Contains("Test Recipe", savedJson);
    }

    [Fact]
    public async Task ExecuteAsync_MissingRecipeInfo_ThrowsFileNotFoundException()
    {
        // Arrange
        // recipe.info is missing

        var task = new WorkflowTask
        {
            Payload = $"{{\"recipeId\": \"{_recipeId}\"}}"
        };

        // Act & Assert
        await Assert.ThrowsAsync<FileNotFoundException>(() => _agent.ExecuteAsync(task, CancellationToken.None));
    }
}
