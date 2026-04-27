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
    private readonly string _testRoot;
    private readonly RecipeDbContext _db;
    private readonly Mock<ILogger<SyncRecipeProcessor>> _loggerMock;
    private readonly SyncRecipeProcessor _processor;
    private readonly Guid _recipeId = Guid.NewGuid();

    public SyncRecipeProcessorTests()
    {
        _testRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(_testRoot);

        _db = TestDbContextFactory.Create();
        _loggerMock = new Mock<ILogger<SyncRecipeProcessor>>();
        
        var mockConfig = new Mock<Microsoft.Extensions.Configuration.IConfiguration>();
        mockConfig.Setup(c => c["RecipesRoot"]).Returns(_testRoot);
        var dataRootResolver = new DataRootResolver(mockConfig.Object);
        var recipesRootResolver = new RecipesRootResolver(dataRootResolver, mockConfig.Object);
        // Ensure env var doesn't override configuration
        Environment.SetEnvironmentVariable("RECIPES_ROOT", null);

        var discoveryService = new DiscoveryService(_db);
        _processor = new SyncRecipeProcessor(_db, recipesRootResolver, discoveryService, _loggerMock.Object);
    }

    public void Dispose()
    {
        if (Directory.Exists(_testRoot))
        {
            Directory.Delete(_testRoot, true);
        }
        Environment.SetEnvironmentVariable("RECIPES_ROOT", null);
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
        
        var recipeDir = Path.Combine(_testRoot, _recipeId.ToString());
        Directory.CreateDirectory(recipeDir);
        // recipe.info is missing

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
        
        var recipeDir = Path.Combine(_testRoot, _recipeId.ToString());
        Directory.CreateDirectory(recipeDir);
        
        var info = new RecipeInfo { Id = _recipeId, ImageCount = 0 };
        await File.WriteAllTextAsync(Path.Combine(recipeDir, "recipe.info"), System.Text.Json.JsonSerializer.Serialize(info));

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
        
        var recipeDir = Path.Combine(_testRoot, _recipeId.ToString());
        Directory.CreateDirectory(recipeDir);
        
        var info = new RecipeInfo { Id = _recipeId, ImageCount = 1, Name = "From Info", Description = "Desc from info" };
        await File.WriteAllTextAsync(Path.Combine(recipeDir, "recipe.info"), System.Text.Json.JsonSerializer.Serialize(info, JsonDefaults.CamelCase));
        
        var recipeJson = new { name = "From Json", recipeIngredient = new[] { "Ing 1" }, totalTime = "PT30M" };
        await File.WriteAllTextAsync(Path.Combine(recipeDir, "recipe.json"), System.Text.Json.JsonSerializer.Serialize(recipeJson));

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
