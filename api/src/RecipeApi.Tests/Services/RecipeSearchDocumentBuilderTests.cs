using System.Text.Json;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class RecipeSearchDocumentBuilderTests
{
    [Fact]
    public void Build_NormalizesAndOrdersMetadataDeterministically()
    {
        var recipe = Recipe(" [  \" Tomato  \", \"tomato\", {\"name\":\" Salmon \"}] ");
        recipe.MealTypes = ["Supper", " supper "];

        var builder = new RecipeSearchDocumentBuilder();
        var first = builder.Build(recipe);
        var second = builder.Build(recipe);

        Assert.Equal(first.DocumentText, second.DocumentText);
        Assert.Equal(first.SearchMetadata, second.SearchMetadata);
        using var metadata = JsonDocument.Parse(first.SearchMetadata);
        Assert.Equal("main", metadata.RootElement.GetProperty("category").GetString());
        Assert.Equal(["italian"], metadata.RootElement.GetProperty("cuisineTypes").EnumerateArray().Select(x => x.GetString()!).ToArray());
        Assert.Equal(["salmon", "tomato"], metadata.RootElement.GetProperty("ingredients").EnumerateArray().Select(x => x.GetString()!).ToArray());
        Assert.Equal(["supper"], metadata.RootElement.GetProperty("mealTypes").EnumerateArray().Select(x => x.GetString()!).ToArray());
        Assert.False(metadata.RootElement.TryGetProperty("dietaryProfile", out _));
        Assert.Equal(65, metadata.RootElement.GetProperty("totalTimeMinutes").GetInt32());
    }

    [Fact]
    public void Build_MalformedOptionalJsonIsEmptyRatherThanInvented()
    {
        var recipe = Recipe("not-json");

        var content = new RecipeSearchDocumentBuilder().Build(recipe);
        using var metadata = JsonDocument.Parse(content.SearchMetadata);

        Assert.Equal(0, metadata.RootElement.GetProperty("ingredients").GetArrayLength());
        Assert.Equal(0, metadata.RootElement.GetProperty("tags").GetArrayLength());
    }

    [Fact]
    public void Build_KnownVegetarianClassificationAddsRecipeOwnedFact()
    {
        var recipe = Recipe("[\"lentils\", \"eggs\"]");
        recipe.IsVegetarian = true;

        var content = new RecipeSearchDocumentBuilder().Build(recipe);

        using var metadata = JsonDocument.Parse(content.SearchMetadata);
        Assert.True(metadata.RootElement.GetProperty("isVegetarian").GetBoolean());
        Assert.Contains("Vegetarian: true.", content.DocumentText);
    }

    [Fact]
    public void Build_UnknownVegetarianClassificationDoesNotIndexFact()
    {
        var recipe = Recipe("[\"lentils\"]");
        recipe.IsVegetarian = null;

        var content = new RecipeSearchDocumentBuilder().Build(recipe);

        using var metadata = JsonDocument.Parse(content.SearchMetadata);
        Assert.False(metadata.RootElement.TryGetProperty("isVegetarian", out _));
        Assert.DoesNotContain("Vegetarian:", content.DocumentText);
    }

    [Fact]
    public void Fingerprint_ChangesForContentAndSchemaVersion()
    {
        var builder = new RecipeSearchDocumentBuilder();
        var recipe = Recipe("[\"chicken\"]");
        var content = builder.Build(recipe);
        var fingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe, content);

        recipe.Name = "Changed";
        Assert.NotEqual(fingerprint, SearchFingerprintService.ComputeSourceFingerprint(recipe, builder.Build(recipe)));
        Assert.NotEqual(fingerprint, SearchFingerprintService.ComputeSourceFingerprint(recipe, content with { SchemaVersion = content.SchemaVersion + 1 }));
    }

    private static Recipe Recipe(string ingredients) => new()
    {
        Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
        Name = " Lemon  Pasta ", Description = " Bright pasta ", Notes = " Serve warm ",
        Category = " Main ", CuisineType = " Italian ", Ingredients = ingredients, TotalTime = "PT1H5M"
    };
}
