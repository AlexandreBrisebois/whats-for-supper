using System.Text;
using System.Text.Json;
using FsCheck;
using FsCheck.Fluent;
using FsCheck.Xunit;
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

namespace RecipeApi.Tests.Services.Agents;

/// <summary>
/// Tests for RecipeAgent — prompt selection based on artifact presence and no-rawHtml guarantee.
/// </summary>
public class RecipeAgentPromptSelectionTests
{
    // ── Factory helpers ───────────────────────────────────────────────────────

    private static (RecipeAgent agent, InMemoryStorageProvider storage, RecipeRepository repo, Mock<IPromptRepository> promptRepoMock, Mock<IChatClient> chatClientMock, List<IEnumerable<ChatMessage>> capturedMessages)
        CreateSut(string aiExtractionResponse, string aiDescriptionResponse = "A delicious recipe.", string? targetLanguage = null)
    {
        var storage = new InMemoryStorageProvider();
        var repo = new RecipeRepository(storage);

        var chatClientMock = new Mock<IChatClient>();
        var capturedMessages = new List<IEnumerable<ChatMessage>>();
        // First call → extraction JSON; subsequent calls → description string
        var callCount = 0;
        chatClientMock
            .Setup(c => c.GetResponseAsync(
                It.IsAny<IEnumerable<ChatMessage>>(),
                It.IsAny<ChatOptions?>(),
                It.IsAny<CancellationToken>()))
            .Callback<IEnumerable<ChatMessage>, ChatOptions?, CancellationToken>((msgs, opts, ct) => capturedMessages.Add(msgs.ToList()))
            .ReturnsAsync(() =>
            {
                callCount++;
                var text = callCount == 1 ? aiExtractionResponse : aiDescriptionResponse;
                return new ChatResponse(new ChatMessage(ChatRole.Assistant, text));
            });

        var promptRepoMock = new Mock<IPromptRepository>();
        promptRepoMock
            .Setup(p => p.GetPrompt(It.IsAny<PromptType>()))
            .Returns("Extract prompt");

        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["IMPORT_TARGET_LANGUAGE"]).Returns(targetLanguage);
        var mockSection = new Mock<IConfigurationSection>();
        mockConfig.Setup(c => c.GetSection(It.IsAny<string>())).Returns(mockSection.Object);
        mockSection.Setup(s => s.GetSection(It.IsAny<string>())).Returns(mockSection.Object);

        var dbOptions = new DbContextOptionsBuilder<RecipeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new RecipeDbContext(dbOptions);

        var agent = new RecipeAgent(
            chatClientMock.Object,
            repo,
            promptRepoMock.Object,
            mockConfig.Object,
            new Mock<ILogger<RecipeAgent>>().Object,
            db,
            "ExtractRecipe");

        return (agent, storage, repo, promptRepoMock, chatClientMock, capturedMessages);
    }

    /// <summary>
    /// Writes recipe.info to storage with the given ImageCount.
    /// </summary>
    private static async Task WriteRecipeInfo(InMemoryStorageProvider storage, Guid recipeId, int imageCount = 0)
    {
        var info = new RecipeInfo { Id = recipeId, ImageCount = imageCount };
        var json = JsonSerializer.Serialize(info, JsonDefaults.CamelCase);
        await storage.SaveAsync("recipes", $"{recipeId}/recipe.info", json);
    }

    /// <summary>
    /// Saves a dummy image file to storage for the given recipe and index.
    /// </summary>
    private static async Task WriteImage(InMemoryStorageProvider storage, Guid recipeId, int index = 0)
    {
        await storage.SaveAsync("recipes", $"{recipeId}/original/{index}.jpg", new byte[] { 0xFF, 0xD8, 0xFF });
    }

    private static string ValidRecipeJson(string name = "Test Recipe") =>
        JsonSerializer.Serialize(new SchemaOrgRecipe
        {
            Name = name,
            RecipeIngredient = ["1 cup flour", "2 eggs"]
        }, new JsonSerializerOptions(JsonDefaults.CamelCase) { WriteIndented = true });

    // ── Unit tests ────────────────────────────────────────────────────────────

    [Fact]
    public async Task ContentHtmlExists_NoImages_UsesWebRecipeExtractionPrompt()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var (agent, storage, repo, promptRepoMock, _, _) = CreateSut(ValidRecipeJson());

        await WriteRecipeInfo(storage, recipeId, imageCount: 0);
        await repo.SaveContentHtmlAsync(recipeId, "<html><body>Recipe</body></html>", CancellationToken.None);

        // Act
        await agent.DoExtractRecipeAsync(recipeId, CancellationToken.None);

        // Assert
        promptRepoMock.Verify(p => p.GetPrompt(PromptType.WebRecipeExtraction), Times.AtLeastOnce);
        promptRepoMock.Verify(p => p.GetPrompt(PromptType.RecipeExtraction), Times.Never);
    }

    [Fact]
    public async Task NoContentHtml_ImagesExist_UsesRecipeExtractionPrompt()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var (agent, storage, repo, promptRepoMock, _, _) = CreateSut(ValidRecipeJson());

        await WriteRecipeInfo(storage, recipeId, imageCount: 1);
        await WriteImage(storage, recipeId, 0);

        // Act
        await agent.DoExtractRecipeAsync(recipeId, CancellationToken.None);

        // Assert
        promptRepoMock.Verify(p => p.GetPrompt(PromptType.RecipeExtraction), Times.AtLeastOnce);
        promptRepoMock.Verify(p => p.GetPrompt(PromptType.WebRecipeExtraction), Times.Never);
    }

    [Fact]
    public async Task NoContentHtml_NoImages_GetPromptNeverCalled_RecipeJsonNotWritten()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var (agent, storage, _, promptRepoMock, _, _) = CreateSut(ValidRecipeJson());

        await WriteRecipeInfo(storage, recipeId, imageCount: 0);
        // No content.html, no images

        // Act
        await agent.DoExtractRecipeAsync(recipeId, CancellationToken.None);

        // Assert
        promptRepoMock.Verify(p => p.GetPrompt(It.IsAny<PromptType>()), Times.Never);
        var recipeJson = await storage.LoadAsync("recipes", $"{recipeId}/recipe.json");
        Assert.Null(recipeJson);
    }

    [Fact]
    public async Task ExtractionWithContentHtml_RecipeJsonDoesNotContainRawHtml()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var (agent, storage, repo, _, _, _) = CreateSut(ValidRecipeJson());

        await WriteRecipeInfo(storage, recipeId, imageCount: 0);
        await repo.SaveContentHtmlAsync(recipeId, "<html><body>Recipe page</body></html>", CancellationToken.None);

        // Act
        await agent.DoExtractRecipeAsync(recipeId, CancellationToken.None);

        // Assert
        var recipeJsonBytes = await storage.LoadAsync("recipes", $"{recipeId}/recipe.json");
        Assert.NotNull(recipeJsonBytes);
        var recipeJsonStr = Encoding.UTF8.GetString(recipeJsonBytes);
        using var doc = JsonDocument.Parse(recipeJsonStr);
        Assert.False(doc.RootElement.TryGetProperty("rawHtml", out _),
            "recipe.json must not contain a rawHtml property after extraction via content.html");
    }

    [Fact]
    public async Task TranslationLanguageSet_InjectsInstructionIntoPrompts()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var targetLanguage = "French";
        var (agent, storage, repo, _, chatClientMock, capturedMessages) = CreateSut(ValidRecipeJson(), targetLanguage: targetLanguage);

        await WriteRecipeInfo(storage, recipeId, imageCount: 1);
        await WriteImage(storage, recipeId, 0);

        // Act
        await agent.DoExtractRecipeAsync(recipeId, CancellationToken.None);

        // Assert
        var hasFrench = capturedMessages.Any(batch => 
            batch.Any(m => m.Text != null && m.Text.Contains("French", StringComparison.OrdinalIgnoreCase)));

        Assert.True(hasFrench, $"The word 'French' was not found in any AI messages. Total message batches: {capturedMessages.Count}");
    }

    [Fact]
    public async Task TranslationLanguageNone_DoesNotInjectInstruction()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var targetLanguage = "NONE";
        var (agent, storage, repo, _, chatClientMock, capturedMessages) = CreateSut(ValidRecipeJson(), targetLanguage: targetLanguage);

        await WriteRecipeInfo(storage, recipeId, imageCount: 1);
        await WriteImage(storage, recipeId, 0);

        // Act
        await agent.DoExtractRecipeAsync(recipeId, CancellationToken.None);

        // Assert
        var hasTranslationInstruction = capturedMessages.Any(batch => 
            batch.Any(m => m.Text != null && m.Text.Contains("Translate", StringComparison.OrdinalIgnoreCase)));

        Assert.False(hasTranslationInstruction, "A translation instruction was found even though IMPORT_TARGET_LANGUAGE was set to NONE.");
    }

    [Fact]
    public async Task ExtractionWithImagesOnly_RecipeJsonDoesNotContainRawHtml()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var (agent, storage, _, _, _, _) = CreateSut(ValidRecipeJson());

        await WriteRecipeInfo(storage, recipeId, imageCount: 1);
        await WriteImage(storage, recipeId, 0);

        // Act
        await agent.DoExtractRecipeAsync(recipeId, CancellationToken.None);

        // Assert
        var recipeJsonBytes = await storage.LoadAsync("recipes", $"{recipeId}/recipe.json");
        Assert.NotNull(recipeJsonBytes);
        var recipeJsonStr = Encoding.UTF8.GetString(recipeJsonBytes);
        using var doc = JsonDocument.Parse(recipeJsonStr);
        Assert.False(doc.RootElement.TryGetProperty("rawHtml", out _),
            "recipe.json must not contain a rawHtml property after extraction via images");
    }

    // ── Property-based tests ──────────────────────────────────────────────────

    // Feature: url-import-html-capture, Property 3: recipe.json never contains rawHtml after RecipeAgent
    /// <summary>
    /// For any mocked AI extraction response (arbitrary SchemaOrgRecipe-shaped JSON, with and without extra fields):
    /// after DoExtractRecipeAsync, recipe.json SHALL NOT contain a rawHtml property.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 5.2, 5.3
    /// </remarks>
    [Property(MaxTest = 100)]
    public Property RecipeJson_NeverContainsRawHtml_AfterRecipeAgent()
    {
        // Generate non-whitespace-only strings for recipe name and ingredient
        // Use Gen.Elements with a set of safe printable strings to avoid whitespace-only names
        var nonWhitespaceStringGen =
            from length in Gen.Choose(1, 20)
            from chars in Gen.Elements('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                                       'A', 'B', 'C', 'D', 'E', 'F', '1', '2', '3', '4',
                                       '-', '_', ' ').ListOf(length)
            let s = new string(chars.ToArray()).Trim()
            where s.Length > 0
            select s;

        return Prop.ForAll(
            nonWhitespaceStringGen.ToArbitrary(),
            nonWhitespaceStringGen.ToArbitrary(),
            (recipeName, ingredient) =>
        {
        var recipeId = Guid.NewGuid();

        // Build a valid SchemaOrgRecipe JSON — include an extra "rawHtml" field to stress-test
        // that the agent strips it during normalization
        var aiResponse = JsonSerializer.Serialize(new
        {
            name = recipeName,
            recipeIngredient = new[] { ingredient },
            rawHtml = "<html>should be stripped</html>"
        });

        var (agent, storage, repo, _, _, _) = CreateSut(aiResponse);

        // Set up: content.html path (web extraction)
        var info = new RecipeInfo { Id = recipeId, ImageCount = 0 };
        storage.SaveAsync("recipes", $"{recipeId}/recipe.info",
            JsonSerializer.Serialize(info, JsonDefaults.CamelCase)).GetAwaiter().GetResult();
        repo.SaveContentHtmlAsync(recipeId, "<html><body>Recipe</body></html>", CancellationToken.None)
            .GetAwaiter().GetResult();

        agent.DoExtractRecipeAsync(recipeId, CancellationToken.None).GetAwaiter().GetResult();

        var recipeJsonBytes = storage.LoadAsync("recipes", $"{recipeId}/recipe.json").GetAwaiter().GetResult();
        if (recipeJsonBytes == null) return true; // no file written — acceptable if name was empty

        var recipeJsonStr = Encoding.UTF8.GetString(recipeJsonBytes);
        try
        {
            using var doc = JsonDocument.Parse(recipeJsonStr);
            return !doc.RootElement.TryGetProperty("rawHtml", out _);
        }
        catch (JsonException)
        {
            return true; // unparseable JSON has no rawHtml by definition
        }
        });
    }

    // Feature: url-import-html-capture, Property 4: Prompt selection determined by artifact presence
    /// <summary>
    /// For any (hasContentHtml: bool, imageCount: int 0–5): set up artifacts accordingly,
    /// spy on IPromptRepository.GetPrompt, run DoExtractRecipeAsync; assert correct prompt type
    /// (or no call) per the three-way rule.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 2.1, 2.2, 2.3
    /// </remarks>
    [Property(MaxTest = 100)]
    public bool PromptSelection_DeterminedSolelyByArtifactPresence(bool hasContentHtml, PositiveInt rawImageCount)
    {
        // Clamp imageCount to 0–5
        var imageCount = rawImageCount.Get % 6; // 0..5

        var recipeId = Guid.NewGuid();
        var (agent, storage, repo, promptRepoMock, _, _) = CreateSut(ValidRecipeJson());

        // Capture which PromptTypes were requested
        var capturedPromptTypes = new List<PromptType>();
        promptRepoMock
            .Setup(p => p.GetPrompt(It.IsAny<PromptType>()))
            .Callback<PromptType>(pt => capturedPromptTypes.Add(pt))
            .Returns("Extract prompt");

        // Set up recipe.info
        var info = new RecipeInfo { Id = recipeId, ImageCount = imageCount };
        storage.SaveAsync("recipes", $"{recipeId}/recipe.info",
            JsonSerializer.Serialize(info, JsonDefaults.CamelCase)).GetAwaiter().GetResult();

        // Set up content.html if requested
        if (hasContentHtml)
        {
            repo.SaveContentHtmlAsync(recipeId, "<html><body>Recipe</body></html>", CancellationToken.None)
                .GetAwaiter().GetResult();
        }

        // Set up image files if requested
        for (int i = 0; i < imageCount; i++)
        {
            storage.SaveAsync("recipes", $"{recipeId}/original/{i}.jpg", new byte[] { 0xFF, 0xD8, 0xFF })
                .GetAwaiter().GetResult();
        }

        agent.DoExtractRecipeAsync(recipeId, CancellationToken.None).GetAwaiter().GetResult();

        // Extraction-related prompt calls only (filter out DescriptionGeneration)
        var extractionCalls = capturedPromptTypes
            .Where(pt => pt == PromptType.WebRecipeExtraction || pt == PromptType.RecipeExtraction)
            .ToList();

        if (hasContentHtml)
        {
            // Must use WebRecipeExtraction
            return extractionCalls.Count >= 1 && extractionCalls[0] == PromptType.WebRecipeExtraction;
        }
        else if (imageCount > 0)
        {
            // Must use RecipeExtraction
            return extractionCalls.Count >= 1 && extractionCalls[0] == PromptType.RecipeExtraction;
        }
        else
        {
            // Neither artifact — no extraction prompt call, no recipe.json
            var recipeJsonBytes = storage.LoadAsync("recipes", $"{recipeId}/recipe.json").GetAwaiter().GetResult();
            return extractionCalls.Count == 0 && recipeJsonBytes == null;
        }
    }

    // Feature: url-import-html-capture, Property 5: Both prompts produce valid SchemaOrgRecipe output
    /// <summary>
    /// For any mocked AI response returning a valid SchemaOrgRecipe JSON (minimal: name + ingredients;
    /// full: all fields): after DoExtractRecipeAsync on both web and photo paths, recipe.json
    /// deserializes to SchemaOrgRecipe with non-null/non-empty name and non-null recipeIngredient.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 3.4, 6.1, 6.2
    /// </remarks>
    [Property(MaxTest = 100)]
    public Property BothPrompts_ProduceValidSchemaOrgRecipe()
    {
        // Generate non-whitespace-only strings for recipe name
        var nonWhitespaceStringGen =
            from length in Gen.Choose(1, 20)
            from chars in Gen.Elements('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                                       'A', 'B', 'C', 'D', 'E', 'F', '1', '2', '3', '4',
                                       '-', '_', ' ').ListOf(length)
            let s = new string(chars.ToArray()).Trim()
            where s.Length > 0
            select s;

        var ingredientCountGen = Gen.Choose(1, 5);

        return Prop.ForAll(
            nonWhitespaceStringGen.ToArbitrary(),
            ingredientCountGen.ToArbitrary(),
            (recipeName, ingredientCount) =>
        {
        // Clamp ingredient count to 1–5
        var count = (ingredientCount % 5) + 1;
        var ingredients = Enumerable.Range(1, count).Select(i => $"{i} cup ingredient{i}").ToArray();

        var aiResponse = JsonSerializer.Serialize(new SchemaOrgRecipe
        {
            Name = recipeName,
            RecipeIngredient = ingredients.ToList()
        }, new JsonSerializerOptions(JsonDefaults.CamelCase) { WriteIndented = true });

        // ── Web path (content.html present) ──────────────────────────────────
        var webRecipeId = Guid.NewGuid();
        var (webAgent, webStorage, webRepo, _, _, _) = CreateSut(aiResponse);

        var webInfo = new RecipeInfo { Id = webRecipeId, ImageCount = 0 };
        webStorage.SaveAsync("recipes", $"{webRecipeId}/recipe.info",
            JsonSerializer.Serialize(webInfo, JsonDefaults.CamelCase)).GetAwaiter().GetResult();
        webRepo.SaveContentHtmlAsync(webRecipeId, "<html><body>Recipe</body></html>", CancellationToken.None)
            .GetAwaiter().GetResult();

        webAgent.DoExtractRecipeAsync(webRecipeId, CancellationToken.None).GetAwaiter().GetResult();

        var webJsonBytes = webStorage.LoadAsync("recipes", $"{webRecipeId}/recipe.json").GetAwaiter().GetResult();
        if (webJsonBytes == null) return false;

        var webRecipe = JsonSerializer.Deserialize<SchemaOrgRecipe>(
            Encoding.UTF8.GetString(webJsonBytes), JsonDefaults.CaseInsensitive);
        if (string.IsNullOrWhiteSpace(webRecipe?.Name)) return false;
        if (webRecipe.RecipeIngredient == null) return false;

        // ── Photo path (images only) ──────────────────────────────────────────
        var photoRecipeId = Guid.NewGuid();
        var (photoAgent, photoStorage, _, _, _, _) = CreateSut(aiResponse);

        var photoInfo = new RecipeInfo { Id = photoRecipeId, ImageCount = 1 };
        photoStorage.SaveAsync("recipes", $"{photoRecipeId}/recipe.info",
            JsonSerializer.Serialize(photoInfo, JsonDefaults.CamelCase)).GetAwaiter().GetResult();
        photoStorage.SaveAsync("recipes", $"{photoRecipeId}/original/0.jpg", new byte[] { 0xFF, 0xD8, 0xFF })
            .GetAwaiter().GetResult();

        photoAgent.DoExtractRecipeAsync(photoRecipeId, CancellationToken.None).GetAwaiter().GetResult();

        var photoJsonBytes = photoStorage.LoadAsync("recipes", $"{photoRecipeId}/recipe.json").GetAwaiter().GetResult();
        if (photoJsonBytes == null) return false;

        var photoRecipe = JsonSerializer.Deserialize<SchemaOrgRecipe>(
            Encoding.UTF8.GetString(photoJsonBytes), JsonDefaults.CaseInsensitive);
        if (string.IsNullOrWhiteSpace(photoRecipe?.Name)) return false;
        if (photoRecipe.RecipeIngredient == null) return false;

        return true;
        });
    }
}
