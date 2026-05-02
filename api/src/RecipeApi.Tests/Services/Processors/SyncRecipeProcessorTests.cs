using Microsoft.Extensions.Logging;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services.Processors;

public class SyncRecipeProcessorTests : IDisposable
{
    private readonly RecipeDbContext _db;
    private readonly Mock<ILogger<SyncRecipeProcessor>> _loggerMock;
    private readonly InMemoryStorageProvider _storage;
    private readonly RecipeRepository _recipeRepository;
    private readonly SyncRecipeProcessor _processor;
    private readonly Guid _recipeId = Guid.NewGuid();

    public SyncRecipeProcessorTests()
    {
        _db = TestDbContextFactory.Create();
        _loggerMock = new Mock<ILogger<SyncRecipeProcessor>>();
        _storage = new InMemoryStorageProvider();
        _recipeRepository = new RecipeRepository(_storage);
        
        var discoveryService = new DiscoveryService(_db);
        _processor = new SyncRecipeProcessor(_db, _recipeRepository, discoveryService, _loggerMock.Object);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public async Task ExecuteAsync_MissingRecipeInfo_ThrowsFileNotFoundException()
    {
        // Arrange
        var task = new WorkflowTask
        {
            Payload = $"{{\"recipeId\": \"{_recipeId}\"}}"
        };
        
        // recipe.info is missing in _storage

        // Act & Assert
        await Assert.ThrowsAsync<FileNotFoundException>(() => _processor.ExecuteAsync(task, CancellationToken.None));
    }

    [Fact]
    public async Task ExecuteAsync_InvalidImageCount_ThrowsInvalidDataException()
    {
        // Arrange
        var task = new WorkflowTask
        {
            Payload = $"{{\"recipeId\": \"{_recipeId}\"}}"
        };
        
        var info = new RecipeInfo { Id = _recipeId, ImageCount = -1 };
        var infoJson = System.Text.Json.JsonSerializer.Serialize(info, JsonDefaults.CamelCase);
        await _storage.SaveAsync("recipes", $"{_recipeId}/recipe.info", infoJson);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidDataException>(() => _processor.ExecuteAsync(task, CancellationToken.None));
        Assert.Contains("Invalid ImageCount", ex.Message);
    }

    [Fact]
    public async Task ExecuteAsync_ValidData_SyncsToDb()
    {
        // Arrange
        var task = new WorkflowTask
        {
            Payload = $"{{\"recipeId\": \"{_recipeId}\"}}"
        };
        
        var info = new RecipeInfo { Id = _recipeId, ImageCount = 1, Name = "From Info", Description = "Desc from info" };
        var infoJson = System.Text.Json.JsonSerializer.Serialize(info, JsonDefaults.CamelCase);
        await _storage.SaveAsync("recipes", $"{_recipeId}/recipe.info", infoJson);
        
        var recipeJson = new { name = "From Json", recipeIngredient = new[] { "Ing 1" }, totalTime = "PT30M" };
        var recipeJsonContent = System.Text.Json.JsonSerializer.Serialize(recipeJson);
        await _storage.SaveAsync("recipes", $"{_recipeId}/recipe.json", recipeJsonContent);

        _db.Recipes.Add(new Recipe { Id = _recipeId, Name = "Original Name" });
        await _db.SaveChangesAsync();

        // Act
        await _processor.ExecuteAsync(task, CancellationToken.None);

        // Assert
        var updated = await _db.Recipes.FindAsync(_recipeId);
        Assert.NotNull(updated);
        Assert.Equal("From Info", updated.Name); // Info takes precedence
        Assert.Equal("Desc from info", updated.Description);
        Assert.Contains("Ing 1", updated.Ingredients);
    }
}
