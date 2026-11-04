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
        
        var aisleMapper = new AisleMapper();
        var groceryRecomputeService = new GroceryRecomputeService(_db, aisleMapper, new Mock<ILogger<GroceryRecomputeService>>().Object, new SystemClock(), new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager()), RecipeApi.Tests.Infrastructure.TestGroceryCoordinator.Create(_db));
        _processor = new SyncRecipeProcessor(new RecipeApi.Services.SystemClock(), _db, _recipeRepository, groceryRecomputeService, _loggerMock.Object);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    [Theory]
    [InlineData("4", 4)]
    [InlineData("3", 3)]
    [InlineData("null", null)]
    [InlineData("absent", 2)]
    public async Task ExportedServingBasis_IsAuthoritativeIncludingExplicitNull(string count, int? expected)
    {
        var recipe = new Recipe { Id = _recipeId, Servings = 7 }; _db.Recipes.Add(recipe); await _db.SaveChangesAsync();
        await _storage.SaveAsync("recipes", $"{_recipeId}/recipe.info", System.Text.Json.JsonSerializer.Serialize(new RecipeInfo { Id = _recipeId }, JsonDefaults.CamelCase));
        var fields = count == "absent" ? "" : $",\"servings\":{count}";
        var content = "{\"backupContentVersion\":1,\"rawMetadata\":\"{\\\"recipeYield\\\":\\\"2 portions\\\"}\",\"ingredients\":\"[\\\"340 g pasta\\\"]\"" + fields + "}";
        await _storage.SaveAsync("recipes", $"{_recipeId}/recipe.json", content);
        for (var attempt = 0; attempt < 2; attempt++) {
            await _processor.ExecuteAsync(new WorkflowTask { Payload = $"{{\"recipeId\":\"{_recipeId}\"}}" }, CancellationToken.None);
            Assert.Equal(expected, recipe.Servings); Assert.Contains("2 portions", recipe.RawMetadata); Assert.Contains("340 g pasta", recipe.Ingredients);
        }
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("1.5")]
    [InlineData("2147483648")]
    [InlineData("\"4\"")]
    [InlineData("true")]
    [InlineData("{}")]
    [InlineData("[]")]
    public async Task MalformedExportedServings_FailsWithoutSaving(string count)
    {
        var recipe = new Recipe { Id = _recipeId, Servings = 7, Ingredients = "[\"retained\"]" }; _db.Recipes.Add(recipe); await _db.SaveChangesAsync();
        await _storage.SaveAsync("recipes", $"{_recipeId}/recipe.info", System.Text.Json.JsonSerializer.Serialize(new RecipeInfo { Id = _recipeId }, JsonDefaults.CamelCase));
        await _storage.SaveAsync("recipes", $"{_recipeId}/recipe.json", $$"""{"backupContentVersion":1,"rawMetadata":null,"ingredients":null,"servings":{{count}}}""");
        await Assert.ThrowsAsync<InvalidDataException>(() => _processor.ExecuteAsync(new WorkflowTask { Payload = $"{{\"recipeId\":\"{_recipeId}\"}}" }, CancellationToken.None));
        _db.ChangeTracker.Clear(); var saved = await _db.Recipes.FindAsync(_recipeId); Assert.Equal(7, saved!.Servings); Assert.Contains("retained", saved.Ingredients);
    }

    [Fact]
    public async Task ExportEnvelope_PreservesOuterNameAndTimeFallbackWhenInfoHasNoName()
    {
        var recipe = new Recipe { Id = _recipeId, Name = "Previous", TotalTime = "PT10M" };
        _db.Recipes.Add(recipe); await _db.SaveChangesAsync();
        await _storage.SaveAsync("recipes", $"{_recipeId}/recipe.info", System.Text.Json.JsonSerializer.Serialize(new RecipeInfo { Id = _recipeId }, JsonDefaults.CamelCase));
        var raw = "{\"name\":\"Original extraction\",\"totalTime\":\"PT60M\",\"recipeYield\":\"4 portions\"}";
        await _storage.SaveAsync("recipes", $"{_recipeId}/recipe.json", System.Text.Json.JsonSerializer.Serialize(new { backupContentVersion = 1, name = "Saved manual name", totalTime = "PT30M", rawMetadata = raw, ingredients = "[\"340 g pasta\"]", servings = (int?)4 }));
        await _processor.ExecuteAsync(new WorkflowTask { Payload = $"{{\"recipeId\":\"{_recipeId}\"}}" }, CancellationToken.None);
        Assert.Equal("Saved manual name", recipe.Name); Assert.Equal("PT30M", recipe.TotalTime);
        Assert.Equal(4, recipe.Servings); Assert.Equal(raw, recipe.RawMetadata);
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

    [Theory]
    [InlineData("null")]
    [InlineData("2")]
    [InlineData("\"2 or 4 portions\"")]
    public async Task ReplacementYield_ClearsOldCountAndKeepsReplacementQuantities(string yield)
    {
        var recipe = new Recipe { Id = _recipeId, Servings = 4 };
        _db.Recipes.Add(recipe); await _db.SaveChangesAsync();
        await _storage.SaveAsync("recipes", $"{_recipeId}/recipe.info", System.Text.Json.JsonSerializer.Serialize(new RecipeInfo { Id = _recipeId }, JsonDefaults.CamelCase));
        await _storage.SaveAsync("recipes", $"{_recipeId}/recipe.json", $$"""{"recipeYield":{{yield}},"recipeIngredient":["225 g Brussels sprouts"]}""");
        for (var attempt = 0; attempt < 2; attempt++) {
            await _processor.ExecuteAsync(new WorkflowTask { Payload = $"{{\"recipeId\":\"{_recipeId}\"}}" }, CancellationToken.None);
            Assert.Null(recipe.Servings);
            Assert.Contains("225 g Brussels sprouts", recipe.Ingredients);
        }
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
