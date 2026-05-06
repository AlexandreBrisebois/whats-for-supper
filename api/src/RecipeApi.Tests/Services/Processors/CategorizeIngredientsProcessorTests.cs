using System.Text.Json;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using Moq;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services.Processors;

/// <summary>
/// Unit tests for <see cref="CategorizeIngredientsProcessor"/>.
/// Uses an in-memory EF context via <see cref="TestDbContextFactory"/>.
/// The <see cref="IChatClient"/> is mocked with Moq so LLM calls can be
/// controlled and inspected without a real AI backend.
/// </summary>
public class CategorizeIngredientsProcessorTests : IDisposable
{
    private readonly RecipeDbContext _db;
    private readonly Mock<IChatClient> _chatClientMock;
    private readonly CategorizeIngredientsProcessor _processor;

    // A fixed recipe ID reused across tests that need one.
    private readonly Guid _recipeId = Guid.NewGuid();

    public CategorizeIngredientsProcessorTests()
    {
        _db = TestDbContextFactory.Create();
        _chatClientMock = new Mock<IChatClient>();

        _processor = new CategorizeIngredientsProcessor(
            _db,
            _chatClientMock.Object,
            new Mock<ILogger<CategorizeIngredientsProcessor>>().Object);
    }

    public void Dispose() => _db.Dispose();

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>Builds a raw_metadata JSON string with a supply array.</summary>
    private static string BuildRawMetadata(params string[] ingredientNames)
    {
        var supply = ingredientNames.Select(n => new { name = n });
        return JsonSerializer.Serialize(new { supply });
    }

    /// <summary>Creates a <see cref="WorkflowTask"/> with the given recipe ID as payload.</summary>
    private static WorkflowTask MakeTask(Guid recipeId) => new()
    {
        TaskId = Guid.NewGuid(),
        Payload = JsonSerializer.Serialize(new { recipeId }),
    };

    /// <summary>
    /// Builds a valid LLM JSON response for the given (normalizedKey, section) pairs.
    /// </summary>
    private static string BuildLlmResponse(params (string key, string section)[] entries)
    {
        var items = entries.Select(e => new
        {
            normalizedKey = e.key,
            section = e.section,
            confidence = 0.95,
        });
        return JsonSerializer.Serialize(items);
    }

    /// <summary>
    /// Configures the mock chat client to return the given JSON text.
    /// </summary>
    private void SetupLlmResponse(string responseJson)
    {
        _chatClientMock
            .Setup(c => c.GetResponseAsync(
                It.IsAny<IEnumerable<ChatMessage>>(),
                It.IsAny<ChatOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, responseJson)));
    }

    /// <summary>
    /// Configures the mock chat client to throw an exception (simulates LLM failure).
    /// </summary>
    private void SetupLlmFailure()
    {
        _chatClientMock
            .Setup(c => c.GetResponseAsync(
                It.IsAny<IEnumerable<ChatMessage>>(),
                It.IsAny<ChatOptions?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("LLM service unavailable"));
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    /// <summary>
    /// When every ingredient in the recipe is already present in ingredient_categories,
    /// the processor must NOT call the LLM at all.
    /// </summary>
    [Fact]
    public async Task AllIngredientsCached_NoLlmCall()
    {
        // Arrange: recipe with two ingredients
        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "Cached Recipe",
            RawMetadata = BuildRawMetadata("chicken breast", "tomato"),
        });
        // Both normalized keys already in the cache
        _db.IngredientCategories.Add(new IngredientCategory
        {
            NormalizedKey = "chicken breast",
            GrocerySection = "Meat",
            Confidence = 0.99,
            Source = "llm",
        });
        _db.IngredientCategories.Add(new IngredientCategory
        {
            NormalizedKey = "tomato",
            GrocerySection = "Produce",
            Confidence = 0.98,
            Source = "llm",
        });
        await _db.SaveChangesAsync();

        // Act
        await _processor.ExecuteAsync(MakeTask(_recipeId), CancellationToken.None);

        // Assert: LLM was never called
        _chatClientMock.Verify(
            c => c.GetResponseAsync(
                It.IsAny<IEnumerable<ChatMessage>>(),
                It.IsAny<ChatOptions?>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    /// <summary>
    /// When some ingredients are cached and some are not, the LLM is called with
    /// only the uncached names — not the full list.
    /// </summary>
    [Fact]
    public async Task SomeUncached_LlmCalledWithOnlyUncachedNames()
    {
        // Arrange: recipe with three ingredients; only "tomato" is cached
        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "Partial Cache Recipe",
            RawMetadata = BuildRawMetadata("chicken breast", "tomato", "heavy cream"),
        });
        _db.IngredientCategories.Add(new IngredientCategory
        {
            NormalizedKey = "tomato",
            GrocerySection = "Produce",
            Confidence = 0.98,
            Source = "llm",
        });
        await _db.SaveChangesAsync();

        // Capture the prompt sent to the LLM
        string? capturedPrompt = null;
        _chatClientMock
            .Setup(c => c.GetResponseAsync(
                It.IsAny<IEnumerable<ChatMessage>>(),
                It.IsAny<ChatOptions?>(),
                It.IsAny<CancellationToken>()))
            .Callback<IEnumerable<ChatMessage>, ChatOptions?, CancellationToken>((msgs, _, _) =>
            {
                capturedPrompt = msgs.FirstOrDefault()?.Text ?? string.Empty;
            })
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                BuildLlmResponse(("chicken breast", "Meat"), ("heavy cream", "Dairy & Eggs")))));

        // Act
        await _processor.ExecuteAsync(MakeTask(_recipeId), CancellationToken.None);

        // Assert: LLM was called exactly once
        _chatClientMock.Verify(
            c => c.GetResponseAsync(
                It.IsAny<IEnumerable<ChatMessage>>(),
                It.IsAny<ChatOptions?>(),
                It.IsAny<CancellationToken>()),
            Times.Once);

        // Assert: prompt contains the two uncached names but NOT the cached one
        Assert.NotNull(capturedPrompt);
        Assert.Contains("chicken breast", capturedPrompt);
        Assert.Contains("heavy cream", capturedPrompt);
        Assert.DoesNotContain("tomato", capturedPrompt);
    }

    /// <summary>
    /// The sections list sent to the LLM must contain "Meat" and "Seafood" as
    /// separate entries. It must NOT contain the combined string "Meat &amp; Seafood".
    /// </summary>
    [Fact]
    public async Task LlmPrompt_ContainsMeatAndSeafoodAsSeparateEntries_NotCombined()
    {
        // Arrange: recipe with one uncached ingredient so the LLM is called
        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "Section Check Recipe",
            RawMetadata = BuildRawMetadata("salmon fillet"),
        });
        await _db.SaveChangesAsync();

        string? capturedPrompt = null;
        _chatClientMock
            .Setup(c => c.GetResponseAsync(
                It.IsAny<IEnumerable<ChatMessage>>(),
                It.IsAny<ChatOptions?>(),
                It.IsAny<CancellationToken>()))
            .Callback<IEnumerable<ChatMessage>, ChatOptions?, CancellationToken>((msgs, _, _) =>
            {
                capturedPrompt = msgs.FirstOrDefault()?.Text ?? string.Empty;
            })
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                BuildLlmResponse(("salmon fillet", "Seafood")))));

        // Act
        await _processor.ExecuteAsync(MakeTask(_recipeId), CancellationToken.None);

        // Assert: prompt contains "Meat" and "Seafood" as separate section strings
        Assert.NotNull(capturedPrompt);
        Assert.Contains("\"Meat\"", capturedPrompt);
        Assert.Contains("\"Seafood\"", capturedPrompt);

        // Assert: the combined string "Meat & Seafood" is NOT present
        Assert.DoesNotContain("Meat & Seafood", capturedPrompt);

        // Assert: fallback section is "Grocery", not "Uncategorized"
        Assert.Contains("\"Grocery\"", capturedPrompt);
        Assert.DoesNotContain("\"Uncategorized\"", capturedPrompt);
    }

    /// <summary>
    /// When the LLM returns "Meat &amp; Seafood" as a section value, that entry must be
    /// discarded (it is not a valid GrocerySection string) and nothing is upserted for it.
    /// </summary>
    [Fact]
    public async Task LlmReturnsMeatAndSeafood_EntryDiscarded()
    {
        // Arrange
        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "Invalid Section Recipe",
            RawMetadata = BuildRawMetadata("beef steak"),
        });
        await _db.SaveChangesAsync();

        // LLM returns the invalid combined section string
        SetupLlmResponse(BuildLlmResponse(("beef steak", "Meat & Seafood")));

        // Act
        await _processor.ExecuteAsync(MakeTask(_recipeId), CancellationToken.None);

        // Assert: nothing was upserted — "beef steak" is not in ingredient_categories
        var entry = await _db.IngredientCategories.FindAsync("beef steak");
        Assert.Null(entry);
    }

    /// <summary>
    /// When the LLM returns a mix of valid and invalid section strings, the invalid
    /// entries are discarded while the valid entries are still upserted.
    /// </summary>
    [Fact]
    public async Task LlmReturnsInvalidSection_InvalidDiscarded_ValidUpserted()
    {
        // Arrange: recipe with two uncached ingredients
        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "Mixed Validity Recipe",
            RawMetadata = BuildRawMetadata("chicken breast", "mystery ingredient"),
        });
        await _db.SaveChangesAsync();

        // LLM returns one valid section and one completely invalid section
        SetupLlmResponse(BuildLlmResponse(
            ("chicken breast", "Meat"),
            ("mystery ingredient", "NotARealSection")));

        // Act
        await _processor.ExecuteAsync(MakeTask(_recipeId), CancellationToken.None);

        // Assert: valid entry was upserted
        var chickenEntry = await _db.IngredientCategories.FindAsync("chicken breast");
        Assert.NotNull(chickenEntry);
        Assert.Equal("Meat", chickenEntry.GrocerySection);

        // Assert: invalid entry was discarded
        var mysteryEntry = await _db.IngredientCategories.FindAsync("mystery ingredient");
        Assert.Null(mysteryEntry);
    }

    /// <summary>
    /// When the LLM call throws an exception, the processor must complete without
    /// re-throwing — the workflow continues to the next step.
    /// </summary>
    [Fact]
    public async Task LlmCallFails_ProcessorCompletesWithoutThrowing()
    {
        // Arrange: recipe with one uncached ingredient so the LLM would be called
        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "LLM Failure Recipe",
            RawMetadata = BuildRawMetadata("olive oil"),
        });
        await _db.SaveChangesAsync();

        SetupLlmFailure();

        // Act & Assert: must not throw
        var exception = await Record.ExceptionAsync(() =>
            _processor.ExecuteAsync(MakeTask(_recipeId), CancellationToken.None));

        Assert.Null(exception);

        // Sanity: nothing was upserted
        var entry = await _db.IngredientCategories.FindAsync("olive oil");
        Assert.Null(entry);
    }
}
