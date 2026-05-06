using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class DietaryProfileBackupTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private ManagementService _service = null!;
    private IRecipeStore _recipeStore = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        _service = _scope.ServiceProvider.GetRequiredService<ManagementService>();
        _recipeStore = _scope.ServiceProvider.GetRequiredService<IRecipeStore>();
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task BackupAsync_WithDietaryProfile_PersistsToRecipeInfo()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var profile = new RecipeDietaryProfile(
            "ProteinFoods",
            ["VegetablesAndFruits"],
            "Poultry",
            "Canadian",
            ["Dinner"],
            "Dinner",
            true,
            0.95,
            "llm",
            new FopFlags(false, false, true)
        );

        var recipe = new Recipe
        {
            Id = recipeId,
            Name = "Test Recipe",
            Category = "ProteinFoods",
            DietaryProfile = JsonSerializer.Serialize(profile, JsonDefaults.CamelCase),
            IsSynthesized = true, // Ensure it's considered "ready" for backup
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        // Act
        await _service.BackupAsync();

        // Assert
        var info = await _recipeStore.ReadInfoAsync(recipeId);
        Assert.NotNull(info);
        Assert.NotNull(info.DietaryProfile);
        Assert.Equal("ProteinFoods", info.DietaryProfile.PrimaryFoodGroup);
        Assert.Equal("Canadian", info.DietaryProfile.CuisineType);
        Assert.NotNull(info.DietaryProfile.FopFlags);
        Assert.True(info.DietaryProfile.FopFlags.HighInSodium);
    }

    [Fact]
    public async Task BackupAsync_WithNullDietaryProfile_DoesNotPersistToRecipeInfo()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe
        {
            Id = recipeId,
            Name = "Test Recipe",
            DietaryProfile = null,
            IsSynthesized = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        // Act
        await _service.BackupAsync();

        // Assert
        var info = await _recipeStore.ReadInfoAsync(recipeId);
        Assert.NotNull(info);
        Assert.Null(info.DietaryProfile);
    }

    [Fact]
    public async Task RestoreAsync_WithDietaryProfileInInfo_UpsertsToDatabase()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var profile = new RecipeDietaryProfile(
            "WholeGrains",
            ["ProteinFoods"],
            "Seafood",
            "Japanese",
            ["Lunch"],
            "Lunch",
            true,
            0.99,
            "llm",
            null
        );

        var info = new RecipeInfo
        {
            Id = recipeId,
            Name = "Restored Recipe",
            IsSynthesized = true,
            DietaryProfile = profile
        };
        await _recipeStore.WriteInfoAsync(info);

        // Act
        await _service.RestoreAsync();

        // Assert
        var recipe = await _db.Recipes.FindAsync(recipeId);
        Assert.NotNull(recipe);
        Assert.NotNull(recipe.DietaryProfile);
        Assert.Equal("WholeGrains", recipe.Category);

        var restoredProfile = JsonSerializer.Deserialize<RecipeDietaryProfile>(recipe.DietaryProfile, JsonDefaults.CamelCase);
        Assert.NotNull(restoredProfile);
        Assert.Equal("WholeGrains", restoredProfile.PrimaryFoodGroup);
        Assert.Equal("Japanese", restoredProfile.CuisineType);
    }

    [Fact]
    public async Task RestoreAsync_WithoutDietaryProfileInInfo_LeavesDatabaseNull()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var info = new RecipeInfo
        {
            Id = recipeId,
            Name = "Restored Recipe",
            IsSynthesized = true,
            DietaryProfile = null
        };
        await _recipeStore.WriteInfoAsync(info);

        // Act
        await _service.RestoreAsync();

        // Assert
        var recipe = await _db.Recipes.FindAsync(recipeId);
        Assert.NotNull(recipe);
        Assert.Null(recipe.DietaryProfile);
    }

    [Fact]
    public async Task BackupRestoreRoundTrip_PreservesDietaryProfile()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var profile = new RecipeDietaryProfile(
            "VegetablesAndFruits",
            ["ProteinFoods"],
            "PlantProtein",
            "Mexican",
            ["Dinner"],
            "Dinner",
            false,
            0.9,
            "manual",
            new FopFlags(true, true, false)
        );

        var recipe = new Recipe
        {
            Id = recipeId,
            Name = "Round Trip Recipe",
            Category = "VegetablesAndFruits",
            DietaryProfile = JsonSerializer.Serialize(profile, JsonDefaults.CamelCase),
            IsSynthesized = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        // Act 1: Backup
        await _service.BackupAsync();

        // Modify DB to simulate wipe/loss
        recipe.DietaryProfile = null;
        recipe.Category = "Old Category";
        await _db.SaveChangesAsync();

        // Act 2: Restore
        await _service.RestoreAsync();

        // Assert
        var restoredRecipe = await _db.Recipes.FindAsync(recipeId);
        Assert.NotNull(restoredRecipe);
        Assert.NotNull(restoredRecipe.DietaryProfile);
        Assert.Equal("VegetablesAndFruits", restoredRecipe.Category);

        var restoredProfile = JsonSerializer.Deserialize<RecipeDietaryProfile>(restoredRecipe.DietaryProfile, JsonDefaults.CamelCase);
        Assert.NotNull(restoredProfile);
        Assert.Equal("VegetablesAndFruits", restoredProfile.PrimaryFoodGroup);
        Assert.Equal("Mexican", restoredProfile.CuisineType);
        Assert.True(restoredProfile.FopFlags?.HighInSugars);
    }
}
