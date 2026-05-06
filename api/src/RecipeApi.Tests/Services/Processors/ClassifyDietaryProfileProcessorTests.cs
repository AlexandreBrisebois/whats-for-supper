using System.Text.Json;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using Moq;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Utils;
using Xunit;

namespace RecipeApi.Tests.Services.Processors;

/// <summary>
/// Unit tests for <see cref="ClassifyDietaryProfileProcessor"/>.
/// Uses an in-memory EF context via <see cref="TestDbContextFactory"/>.
/// The <see cref="IChatClient"/> is mocked with Moq so LLM calls can be
/// controlled and inspected without a real AI backend.
/// </summary>
public class ClassifyDietaryProfileProcessorTests : IDisposable
{
    private readonly RecipeDbContext _db;
    private readonly Mock<IChatClient> _chatClientMock;
    private readonly ClassifyDietaryProfileProcessor _processor;

    // A fixed recipe ID reused across tests that need one.
    private readonly Guid _recipeId = Guid.NewGuid();

    public ClassifyDietaryProfileProcessorTests()
    {
        _db = TestDbContextFactory.Create();
        _chatClientMock = new Mock<IChatClient>();

        _processor = new ClassifyDietaryProfileProcessor(
            _db,
            _chatClientMock.Object,
            new Mock<ILogger<ClassifyDietaryProfileProcessor>>().Object);
    }

    public void Dispose() => _db.Dispose();

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>Builds a raw_metadata JSON string with supply array and optional nutrition.</summary>
    private static string BuildRawMetadata(string[] ingredientNames, NutritionInformation? nutrition = null)
    {
        var supply = ingredientNames.Select(n => new { name = (string?)n }).ToList();
        var obj = new { supply = (object?)supply, nutrition = (object?)nutrition };
        return JsonSerializer.Serialize(obj, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
    }

    /// <summary>Creates a <see cref="WorkflowTask"/> with the given recipe ID and optional forceReclassify.</summary>
    private static WorkflowTask MakeTask(Guid recipeId, bool forceReclassify = false)
    {
        var payload = forceReclassify
            ? JsonSerializer.Serialize(new { recipeId, forceReclassify })
            : JsonSerializer.Serialize(new { recipeId });
        return new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            Payload = payload,
        };
    }

    /// <summary>
    /// Builds a valid LLM JSON response for dietary profile classification.
    /// </summary>
    private static string BuildLlmResponse(
        string primaryFoodGroup = "ProteinFoods",
        string[] secondaryFoodGroups = null,
        string proteinSource = "Poultry",
        string cuisineType = "Canadian",
        string[] mealTypes = null,
        string primaryMealType = "Dinner",
        bool wholeGrainConfident = false,
        double confidence = 0.95)
    {
        secondaryFoodGroups ??= [];
        mealTypes ??= ["Dinner"];

        var response = new
        {
            primaryFoodGroup,
            secondaryFoodGroups,
            proteinSource,
            cuisineType,
            mealTypes,
            primaryMealType,
            wholeGrainConfident,
            confidence,
            source = "llm"
        };
        return JsonSerializer.Serialize(response, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
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
    /// When a recipe already has a non-null dietary_profile and forceReclassify is absent,
    /// the processor must NOT call the LLM and must return without writing.
    /// </summary>
    [Fact]
    public async Task Idempotence_AlreadyClassified_NoLlmCall()
    {
        // Arrange: recipe with existing dietary_profile
        var existingProfile = new RecipeDietaryProfile(
            PrimaryFoodGroup: "ProteinFoods",
            SecondaryFoodGroups: [],
            ProteinSource: "Poultry",
            CuisineType: "Canadian",
            MealTypes: ["Dinner"],
            PrimaryMealType: "Dinner",
            WholeGrainConfident: false,
            Confidence: 0.95,
            Source: "llm",
            FopFlags: null);

        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "Already Classified",
            RawMetadata = BuildRawMetadata(["chicken", "rice"]),
            DietaryProfile = JsonSerializer.Serialize(existingProfile, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }),
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
    /// When a recipe has a non-null dietary_profile but forceReclassify: true,
    /// the processor MUST call the LLM and overwrite the profile.
    /// </summary>
    [Fact]
    public async Task ForceReclassifyBypass_OverwritesExistingProfile()
    {
        // Arrange: recipe with existing dietary_profile
        var oldProfile = new RecipeDietaryProfile(
            PrimaryFoodGroup: "VegetablesAndFruits",
            SecondaryFoodGroups: [],
            ProteinSource: "None",
            CuisineType: "Italian",
            MealTypes: ["Lunch"],
            PrimaryMealType: "Lunch",
            WholeGrainConfident: false,
            Confidence: 0.80,
            Source: "llm",
            FopFlags: null);

        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "Force Reclassify Recipe",
            RawMetadata = BuildRawMetadata(["chicken", "rice"]),
            DietaryProfile = JsonSerializer.Serialize(oldProfile, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }),
        });
        await _db.SaveChangesAsync();

        // Setup LLM to return a different profile
        SetupLlmResponse(BuildLlmResponse(
            primaryFoodGroup: "ProteinFoods",
            proteinSource: "Poultry",
            cuisineType: "Canadian"));

        // Act
        await _processor.ExecuteAsync(MakeTask(_recipeId, forceReclassify: true), CancellationToken.None);

        // Assert: LLM was called
        _chatClientMock.Verify(
            c => c.GetResponseAsync(
                It.IsAny<IEnumerable<ChatMessage>>(),
                It.IsAny<ChatOptions?>(),
                It.IsAny<CancellationToken>()),
            Times.Once);

        // Assert: profile was overwritten
        var recipe = await _db.Recipes.FindAsync(_recipeId);
        Assert.NotNull(recipe?.DietaryProfile);
        var profile = JsonSerializer.Deserialize<RecipeDietaryProfile>(recipe.DietaryProfile, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.Equal("ProteinFoods", profile?.PrimaryFoodGroup);
        Assert.Equal("Canadian", profile?.CuisineType);
    }

    /// <summary>
    /// Happy path: LLM returns valid response → dietary_profile and category are written.
    /// </summary>
    [Fact]
    public async Task HappyPath_ValidLlmResponse_WritesProfileAndCategory()
    {
        // Arrange: recipe with no dietary_profile
        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "Grilled Chicken",
            RawMetadata = BuildRawMetadata(["chicken breast", "brown rice", "broccoli"]),
        });
        await _db.SaveChangesAsync();

        SetupLlmResponse(BuildLlmResponse(
            primaryFoodGroup: "ProteinFoods",
            secondaryFoodGroups: ["WholeGrains", "VegetablesAndFruits"],
            proteinSource: "Poultry",
            cuisineType: "Canadian",
            mealTypes: ["Dinner", "Lunch"],
            primaryMealType: "Dinner",
            wholeGrainConfident: true,
            confidence: 0.95));

        // Act
        await _processor.ExecuteAsync(MakeTask(_recipeId), CancellationToken.None);

        // Assert: profile was written
        var recipe = await _db.Recipes.FindAsync(_recipeId);
        Assert.NotNull(recipe?.DietaryProfile);
        var profile = JsonSerializer.Deserialize<RecipeDietaryProfile>(recipe.DietaryProfile, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.Equal("ProteinFoods", profile?.PrimaryFoodGroup);
        Assert.Contains("WholeGrains", profile?.SecondaryFoodGroups ?? []);
        Assert.Equal("Poultry", profile?.ProteinSource);

        // Assert: category was set to primaryFoodGroup
        Assert.Equal("ProteinFoods", recipe.Category);
    }

    /// <summary>
    /// WholeGrain guard: when LLM returns wholeGrainConfident: false with WholeGrains
    /// in secondaryFoodGroups, WholeGrains must be removed from the stored profile.
    /// </summary>
    [Fact]
    public async Task WholeGrainGuard_NotConfident_RemovedFromSecondary()
    {
        // Arrange
        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "Pasta Dish",
            RawMetadata = BuildRawMetadata(["pasta", "tomato sauce", "chicken"]),
        });
        await _db.SaveChangesAsync();

        // LLM returns WholeGrains in secondary but wholeGrainConfident: false
        SetupLlmResponse(BuildLlmResponse(
            primaryFoodGroup: "ProteinFoods",
            secondaryFoodGroups: ["WholeGrains", "VegetablesAndFruits"],
            wholeGrainConfident: false));

        // Act
        await _processor.ExecuteAsync(MakeTask(_recipeId), CancellationToken.None);

        // Assert: WholeGrains was removed from secondaryFoodGroups
        var recipe = await _db.Recipes.FindAsync(_recipeId);
        var profile = JsonSerializer.Deserialize<RecipeDietaryProfile>(recipe?.DietaryProfile ?? "", new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.DoesNotContain("WholeGrains", profile?.SecondaryFoodGroups ?? []);
        Assert.Contains("VegetablesAndFruits", profile?.SecondaryFoodGroups ?? []);
    }

    /// <summary>
    /// Invalid primaryFoodGroup: LLM returns an unrecognized value → no DB write, method returns normally.
    /// </summary>
    [Fact]
    public async Task InvalidPrimaryFoodGroup_NoDbWrite_ReturnsNormally()
    {
        // Arrange
        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "Invalid Classification",
            RawMetadata = BuildRawMetadata(["ingredient1", "ingredient2"]),
        });
        await _db.SaveChangesAsync();

        // LLM returns invalid primaryFoodGroup
        SetupLlmResponse(BuildLlmResponse(primaryFoodGroup: "Dessert"));

        // Act & Assert: must not throw
        var exception = await Record.ExceptionAsync(() =>
            _processor.ExecuteAsync(MakeTask(_recipeId), CancellationToken.None));
        Assert.Null(exception);

        // Assert: dietary_profile was not written
        var recipe = await _db.Recipes.FindAsync(_recipeId);
        Assert.Null(recipe?.DietaryProfile);
    }

    /// <summary>
    /// LLM throws: exception is caught, logged, and method returns normally.
    /// </summary>
    [Fact]
    public async Task LlmThrows_ProcessorCompletesWithoutThrowing()
    {
        // Arrange
        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "LLM Failure Recipe",
            RawMetadata = BuildRawMetadata(["ingredient1"]),
        });
        await _db.SaveChangesAsync();

        SetupLlmFailure();

        // Act & Assert: must not throw
        var exception = await Record.ExceptionAsync(() =>
            _processor.ExecuteAsync(MakeTask(_recipeId), CancellationToken.None));
        Assert.Null(exception);

        // Assert: dietary_profile was not written
        var recipe = await _db.Recipes.FindAsync(_recipeId);
        Assert.Null(recipe?.DietaryProfile);
    }

    /// <summary>
    /// Recipe not found: processor logs warning and returns without exception.
    /// </summary>
    [Fact]
    public async Task RecipeNotFound_LogsWarning_ReturnsNormally()
    {
        // Act & Assert: must not throw
        var exception = await Record.ExceptionAsync(() =>
            _processor.ExecuteAsync(MakeTask(_recipeId), CancellationToken.None));
        Assert.Null(exception);

        // Assert: LLM was never called
        _chatClientMock.Verify(
            c => c.GetResponseAsync(
                It.IsAny<IEnumerable<ChatMessage>>(),
                It.IsAny<ChatOptions?>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    /// <summary>
    /// Null RawMetadata: processor logs debug and returns without LLM call.
    /// </summary>
    [Fact]
    public async Task NullRawMetadata_NoLlmCall()
    {
        // Arrange
        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "No Metadata Recipe",
            RawMetadata = null,
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
    /// FOP flags computed deterministically: recipe with sodium 400mg (above 345mg threshold)
    /// → stored profile has highInSodium: true.
    /// </summary>
    [Fact]
    public async Task FopFlagsComputed_SodiumAboveThreshold_HighInSodiumTrue()
    {
        // Arrange: recipe with nutrition data
        var nutrition = new NutritionInformation
        {
            SodiumContent = "400 mg",
            SaturatedFatContent = "2 g",
            SugarContent = "5 g"
        };

        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "High Sodium Recipe",
            RawMetadata = BuildRawMetadata(["ingredient1"], nutrition),
        });
        await _db.SaveChangesAsync();

        SetupLlmResponse(BuildLlmResponse());

        // Act
        await _processor.ExecuteAsync(MakeTask(_recipeId), CancellationToken.None);

        // Assert: FOP flags were computed and stored
        var recipe = await _db.Recipes.FindAsync(_recipeId);
        var profile = JsonSerializer.Deserialize<RecipeDietaryProfile>(recipe?.DietaryProfile ?? "", new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.NotNull(profile?.FopFlags);
        Assert.True(profile.FopFlags.HighInSodium);
        Assert.False(profile.FopFlags.HighInSaturatedFat);
        Assert.False(profile.FopFlags.HighInSugars);
    }

    /// <summary>
    /// FOP flags null when nutrition absent: recipe with no nutrition data
    /// → stored profile has fopFlags: null.
    /// </summary>
    [Fact]
    public async Task FopFlagsNull_NutritionAbsent()
    {
        // Arrange: recipe with no nutrition data
        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "No Nutrition Recipe",
            RawMetadata = BuildRawMetadata(["ingredient1"], nutrition: null),
        });
        await _db.SaveChangesAsync();

        SetupLlmResponse(BuildLlmResponse());

        // Act
        await _processor.ExecuteAsync(MakeTask(_recipeId), CancellationToken.None);

        // Assert: FOP flags are null
        var recipe = await _db.Recipes.FindAsync(_recipeId);
        var profile = JsonSerializer.Deserialize<RecipeDietaryProfile>(recipe?.DietaryProfile ?? "", new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.Null(profile?.FopFlags);
    }

    /// <summary>
    /// FOP flags do not block on LLM failure: if LLM throws but nutrition data is present,
    /// FOP flags are still computed (they are deterministic and don't depend on LLM).
    /// However, since the LLM failed, the profile is not written at all.
    /// This test verifies that FOP computation doesn't interfere with error handling.
    /// </summary>
    [Fact]
    public async Task FopFlagsComputationDoesNotBlockErrorHandling()
    {
        // Arrange: recipe with nutrition data
        var nutrition = new NutritionInformation
        {
            SodiumContent = "400 mg",
            SaturatedFatContent = "5 g",
            SugarContent = "20 g"
        };

        _db.Recipes.Add(new Recipe
        {
            Id = _recipeId,
            Name = "LLM Failure With Nutrition",
            RawMetadata = BuildRawMetadata(["ingredient1"], nutrition),
        });
        await _db.SaveChangesAsync();

        SetupLlmFailure();

        // Act & Assert: must not throw
        var exception = await Record.ExceptionAsync(() =>
            _processor.ExecuteAsync(MakeTask(_recipeId), CancellationToken.None));
        Assert.Null(exception);

        // Assert: profile was not written (LLM failure prevented it)
        var recipe = await _db.Recipes.FindAsync(_recipeId);
        Assert.Null(recipe?.DietaryProfile);
    }
}
