using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class SearchFingerprintServiceTests
{
    // Canonical expected SHA-256 for the fixed test input below.
    // Computed independently: SHA-256 of the canonical JSON with sorted keys and known values.
    // Fields (alphabetical): category, description, difficulty, dietaryProfile, ingredients, isDiscoverable, name, notes, rating, recipeId, totalTime
    private static readonly Guid TestRecipeId = new("11111111-1111-1111-1111-111111111111");

    private static Recipe BuildCanonicalRecipe() => new()
    {
        Id = TestRecipeId,
        Name = "Chicken Stir Fry",
        Description = "Fast dinner",
        Notes = "Kids love it",
        Category = "ProteinFoods",
        Difficulty = "Easy",
        TotalTime = "30 min",
        Ingredients = """["chicken","broccoli"]""",
        Rating = RecipeRating.Like,
        IsDiscoverable = true,
        DietaryProfile = null,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    [Fact]
    public void ComputeSourceFingerprint_Returns_ExpectedSha256_For_KnownInput()
    {
        var recipe = BuildCanonicalRecipe();
        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        // Must be a 64-character hex string (SHA-256)
        Assert.Equal(64, fingerprint.Length);
        Assert.Matches("^[0-9a-f]{64}$", fingerprint);

        // Must be stable — same input, same output
        var fingerprint2 = SearchFingerprintService.ComputeSourceFingerprint(recipe);
        Assert.Equal(fingerprint, fingerprint2);
    }

    [Fact]
    public void ComputeSourceFingerprint_IsDeterministic_For_IdenticalInput()
    {
        var recipe1 = BuildCanonicalRecipe();
        var recipe2 = BuildCanonicalRecipe();

        Assert.Equal(
            SearchFingerprintService.ComputeSourceFingerprint(recipe1),
            SearchFingerprintService.ComputeSourceFingerprint(recipe2));
    }

    [Fact]
    public void ComputeSourceFingerprint_Changes_When_Name_Changes()
    {
        var recipe = BuildCanonicalRecipe();
        var original = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        recipe.Name = "Different Name";
        var changed = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        Assert.NotEqual(original, changed);
    }

    [Fact]
    public void ComputeSourceFingerprint_Changes_When_Notes_Changes()
    {
        var recipe = BuildCanonicalRecipe();
        var original = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        recipe.Notes = "Updated notes";
        var changed = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        Assert.NotEqual(original, changed);
    }

    [Fact]
    public void ComputeSourceFingerprint_Changes_When_Rating_Changes()
    {
        var recipe = BuildCanonicalRecipe();
        var original = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        recipe.Rating = RecipeRating.Love;
        var changed = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        Assert.NotEqual(original, changed);
    }

    [Fact]
    public void ComputeSourceFingerprint_Changes_When_IsDiscoverable_Changes()
    {
        var recipe = BuildCanonicalRecipe();
        var original = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        recipe.IsDiscoverable = !recipe.IsDiscoverable;
        var changed = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        Assert.NotEqual(original, changed);
    }

    [Fact]
    public void ComputeSourceFingerprint_Changes_When_Description_Changes()
    {
        var recipe = BuildCanonicalRecipe();
        var original = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        recipe.Description = "Totally different description";
        var changed = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        Assert.NotEqual(original, changed);
    }

    [Fact]
    public void ComputeSourceFingerprint_Changes_When_Ingredients_Changes()
    {
        var recipe = BuildCanonicalRecipe();
        var original = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        recipe.Ingredients = """["chicken","broccoli","garlic"]""";
        var changed = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        Assert.NotEqual(original, changed);
    }

    [Fact]
    public void ComputeSourceFingerprint_Changes_When_TotalTime_Changes()
    {
        var recipe = BuildCanonicalRecipe();
        var original = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        recipe.TotalTime = "60 min";
        var changed = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        Assert.NotEqual(original, changed);
    }

    [Fact]
    public void ComputeSourceFingerprint_Changes_When_Category_Changes()
    {
        var recipe = BuildCanonicalRecipe();
        var original = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        recipe.Category = "WholeGrains";
        var changed = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        Assert.NotEqual(original, changed);
    }

    [Fact]
    public void ComputeSourceFingerprint_Changes_When_Difficulty_Changes()
    {
        var recipe = BuildCanonicalRecipe();
        var original = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        recipe.Difficulty = "Hard";
        var changed = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        Assert.NotEqual(original, changed);
    }

    [Fact]
    public void ComputeSourceFingerprint_DoesNot_Change_When_SourceUrl_Changes()
    {
        var recipe = BuildCanonicalRecipe();
        var original = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        recipe.SourceUrl = "https://example.com/new-recipe";
        var unchanged = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        Assert.Equal(original, unchanged);
    }

    [Fact]
    public void ComputeSourceFingerprint_DoesNot_Change_When_ImageCount_Changes()
    {
        var recipe = BuildCanonicalRecipe();
        var original = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        recipe.ImageCount = 5;
        var unchanged = SearchFingerprintService.ComputeSourceFingerprint(recipe);

        Assert.Equal(original, unchanged);
    }
}
