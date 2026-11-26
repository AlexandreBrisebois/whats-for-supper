using RecipeApi.Tests.Infrastructure;
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
    private readonly RecipeDbContext _db;
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
        _db = new RecipeDbContext(dbOptions);
        _db.Recipes.Add(new Recipe { Id = _recipeId, Name = "Pending" });
        _db.SaveChanges();

        _agent = new RecipeAgent(
            _chatClientMock.Object,
            promptRepositoryMock.Object,
            mockConfig.Object,
            new Mock<ILogger<RecipeAgent>>().Object,
            "ExtractRecipe",
            _db,
            recipeRepository: _recipeRepository,
            vocabulary: TestPublicationStore.Vocabulary(_db, _recipeRepository.StorageProvider, new SystemClock()));
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

        var jsonResponse = """
            {
              "name": "Test Recipe",
              "recipeIngredient": ["Ing 1"],
              "recipeInstructions": [
                {
                  "@type": "HowToSection",
                  "itemListElement": [{ "@type": "HowToStep", "text": "Mix the ingredients." }]
                }
              ]
            }
            """;
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
        using var doc = System.Text.Json.JsonDocument.Parse(savedJson);
        Assert.Equal("https://schema.org/", doc.RootElement.GetProperty("@context").GetString());
        Assert.Equal("Recipe", doc.RootElement.GetProperty("@type").GetString());
        Assert.False(doc.RootElement.TryGetProperty("format", out _));
        var publicationEntries = await _storage.FindAsync("recipes", ".publications");
        Assert.Empty(publicationEntries);
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

    [Fact]
    public async Task ExecuteAsync_PersistsTotalTimeAndAppendsSwapNotesWithoutOverwritingUserNotes()
    {
        // Arrange
        var info = new RecipeInfo { Id = _recipeId, ImageCount = 2, Notes = "Kids loved this." };
        await _storage.SaveAsync("recipes", $"{_recipeId}/recipe.info", System.Text.Json.JsonSerializer.Serialize(info, JsonDefaults.CamelCase));
        await _storage.SaveAsync("recipes", $"{_recipeId}/original/0.jpg", "front image");
        await _storage.SaveAsync("recipes", $"{_recipeId}/original/1.jpg", "back image");

        var existingRecipe = await _db.Recipes.SingleAsync(x => x.Id == _recipeId);
        existingRecipe.Notes = "Kids loved this.";
        await _db.SaveChangesAsync();

        var jsonResponse = """
            {
              "name": "One-Pan Chicken and Orzo",
              "recipeYield": "2 portions",
              "totalTime": "PT35M",
              "recipeIngredient": ["2 Chicken Breasts", "170 g Orzo"],
              "recipeInstructions": [
                {
                  "@type": "HowToSection",
                  "name": "1. Prep and cook chicken",
                  "itemListElement": [{ "@type": "HowToStep", "text": "Cook chicken for 4-6 min." }]
                }
              ],
              "notes": "Swap suggestion: Substitute chicken thighs (270 g) or organic chicken breasts (2)."
            }
            """;
        _chatClientMock.Setup(c => c.GetResponseAsync(
            It.IsAny<IEnumerable<ChatMessage>>(),
            It.IsAny<ChatOptions>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, jsonResponse)));

        // Act
        await _agent.ExecuteAsync(new WorkflowTask { Payload = $"{{\"recipeId\": \"{_recipeId}\"}}" }, CancellationToken.None);

        // Assert
        var updatedRecipe = await _db.Recipes.AsNoTracking().SingleAsync(x => x.Id == _recipeId);
        Assert.Equal("PT35M", updatedRecipe.TotalTime);
        Assert.Equal("Kids loved this.\n\nSwap suggestion: Substitute chicken thighs (270 g) or organic chicken breasts (2).", updatedRecipe.Notes);

        var updatedInfo = await _recipeRepository.GetInfoAsync(_recipeId, CancellationToken.None);
        Assert.Equal("PT35M", updatedInfo.TotalTime);
        Assert.Equal("Kids loved this.\n\nSwap suggestion: Substitute chicken thighs (270 g) or organic chicken breasts (2).", updatedInfo.Notes);
    }

    [Fact]
    public async Task ExecuteAsync_GuidedRepair_MergesCustomizationNotesWithoutOverwritingUserNotes()
    {
        // Arrange: an already-structured recipe undergoing a guided repair
        var info = new RecipeInfo { Id = _recipeId, ImageCount = 2, Name = "Parmesan Pan-Fried Gnocchi", Notes = "Family favorite." };
        await _storage.SaveAsync("recipes", $"{_recipeId}/recipe.info", System.Text.Json.JsonSerializer.Serialize(info, JsonDefaults.CamelCase));
        await _storage.SaveAsync("recipes", $"{_recipeId}/original/0.jpg", "front image");
        await _storage.SaveAsync("recipes", $"{_recipeId}/original/1.jpg", "back image");

        var initialSchemaOrg = """
            {
              "@context": "https://schema.org/",
              "@type": "Recipe",
              "name": "Parmesan Pan-Fried Gnocchi",
              "recipeYield": "2 portions",
              "recipeIngredient": ["350 g Gnocchi", "56 g Baby Spinach"],
              "recipeInstructions": [
                {
                  "@type": "HowToSection",
                  "name": "1. Prep veggies and sauce",
                  "itemListElement": [{ "@type": "HowToStep", "text": "Chop spinach." }]
                }
              ]
            }
            """;
        var (structuredContent, evidence) = StructuredRecipeContentStore.FromSchemaOrg(
            _recipeId, initialSchemaOrg, null, null, Guid.NewGuid(), "source");

        var existingRecipe = await _db.Recipes.SingleAsync(x => x.Id == _recipeId);
        existingRecipe.Name = "Parmesan Pan-Fried Gnocchi";
        existingRecipe.Notes = "Family favorite.";
        existingRecipe.RawMetadata = initialSchemaOrg;
        existingRecipe.StructuredContent = System.Text.Json.JsonSerializer.Serialize(structuredContent, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web));
        existingRecipe.FoodMappingEvidence = evidence;
        existingRecipe.Servings = structuredContent.Servings;
        _db.RecipeImportReports.Add(new RecipeImportReport
        {
            RecipeId = _recipeId,
            Reasons = ["ingredients", "steps"],
            Status = RecipeImportReportStatus.Reimporting
        });
        await _db.SaveChangesAsync();

        var repairedJsonResponse = """
            {
              "name": "Parmesan Pan-Fried Gnocchi",
              "recipeYield": "2 portions",
              "totalTime": "PT30M",
              "recipeIngredient": ["350 g Gnocchi", "56 g Baby Spinach"],
              "recipeInstructions": [
                {
                  "@type": "HowToSection",
                  "name": "1. Prep veggies and sauce",
                  "itemListElement": [{ "@type": "HowToStep", "text": "Chop spinach." }]
                }
              ],
              "notes": "Optional add-on: Add shrimp (285 g); drain, rinse, pat dry, season with salt and pepper, cook in 1/2 tbsp oil for 2-3 min, and top bowls with shrimp."
            }
            """;
        _chatClientMock.Setup(c => c.GetResponseAsync(
            It.IsAny<IEnumerable<ChatMessage>>(),
            It.IsAny<ChatOptions>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, repairedJsonResponse)));

        // Act
        await _agent.ExecuteAsync(new WorkflowTask { Payload = $"{{\"recipeId\": \"{_recipeId}\"}}" }, CancellationToken.None);

        // Assert
        var updatedRecipe = await _db.Recipes.AsNoTracking().SingleAsync(x => x.Id == _recipeId);
        Assert.Equal(
            "Family favorite.\n\nOptional add-on: Add shrimp (285 g); drain, rinse, pat dry, season with salt and pepper, cook in 1/2 tbsp oil for 2-3 min, and top bowls with shrimp.",
            updatedRecipe.Notes);
    }
}
