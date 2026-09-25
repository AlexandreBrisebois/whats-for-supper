using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

/// <summary>
/// Integration tests for the current recipe workflow tail.
/// </summary>
public class WorkflowStandardizationIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    
    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _client = _factory.CreateClient();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task CategorizeRecipe_CorrectlyCategorizesAndSaves()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe
        {
            Id = recipeId,
            Name = "Spaghetti Carbonara",
            Description = "Creamy pasta with pancetta",
            Ingredients = "[\"spaghetti\", \"eggs\", \"pancetta\"]",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var chatClientMock = new Mock<IChatClient>();
        var chatResponseText = """
        {
          "cuisineType": "Italian",
          "mealTypes": ["Dinner", "Lunch"],
          "primaryMealType": "Dinner",
          "isVegetarian": false
        }
        """;
        chatClientMock
            .Setup(c => c.GetResponseAsync(
                It.IsAny<IEnumerable<ChatMessage>>(),
                It.IsAny<ChatOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, chatResponseText)));

        var processor = new CategorizeRecipeProcessor(
            _db,
            chatClientMock.Object,
            NullLogger<CategorizeRecipeProcessor>.Instance
        );

        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = Guid.NewGuid(),
            TaskName = "categorize_recipe",
            ProcessorName = "CategorizeRecipe",
            Payload = JsonSerializer.Serialize(new { recipeId = recipeId.ToString() }),
            Status = RecipeApi.Models.TaskStatus.Pending,
            DependsOn = [],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        // Act
        await processor.ExecuteAsync(task, CancellationToken.None);

        // Assert: Verify DB update
        var updatedRecipe = await _db.Recipes.FindAsync(recipeId);
        Assert.NotNull(updatedRecipe);
        Assert.Equal("Italian", updatedRecipe.CuisineType);
        Assert.NotNull(updatedRecipe.MealTypes);
        Assert.Contains("Supper", updatedRecipe.MealTypes); // mapped from Dinner
        Assert.Contains("Lunch", updatedRecipe.MealTypes);
        Assert.Equal("Supper", updatedRecipe.Category); // mapped from Dinner
        Assert.False(updatedRecipe.IsVegetarian);
        Assert.Equal(1, updatedRecipe.VegetarianClassificationVersion);
        Assert.NotNull(updatedRecipe.VegetarianClassifiedAt);

    }

    [Fact]
    public async Task CategorizeRecipe_LlmFailure_CompletesGracefullyWithoutThrowing()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe
        {
            Id = recipeId,
            Name = "Faulty AI Spaghetti",
            Description = "Wait for exception",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        var chatClientMock = new Mock<IChatClient>();
        chatClientMock
            .Setup(c => c.GetResponseAsync(
                It.IsAny<IEnumerable<ChatMessage>>(),
                It.IsAny<ChatOptions?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("LLM is down"));

        var processor = new CategorizeRecipeProcessor(
            _db,
            chatClientMock.Object,
            NullLogger<CategorizeRecipeProcessor>.Instance
        );

        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            Payload = JsonSerializer.Serialize(new { recipeId = recipeId.ToString() }),
        };

        // Act
        var exception = await Record.ExceptionAsync(() => processor.ExecuteAsync(task, CancellationToken.None));

        // Assert
        Assert.Null(exception);
        var updatedRecipe = await _db.Recipes.FindAsync(recipeId);
        Assert.NotNull(updatedRecipe);
        Assert.Null(updatedRecipe.VegetarianClassificationVersion);
        Assert.NotNull(updatedRecipe.VegetarianClassificationFailedAt);
    }
}
