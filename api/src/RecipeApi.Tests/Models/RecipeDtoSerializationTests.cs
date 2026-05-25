using System.Text.Json;
using RecipeApi.Dto;
using Xunit;

namespace RecipeApi.Tests.Models;

public class RecipeDtoSerializationTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    [Fact]
    public void RecipeDto_SerializationRoundTrip_IncludesCuisineAndMealTypes()
    {
        var original = new RecipeDto
        {
            Id = Guid.NewGuid(),
            Name = "Carbonara",
            ImageUrl = "/img.jpg",
            SourceType = "url",
            CanReimport = true,
            ImageCount = 1,
            CreatedAt = DateTimeOffset.UtcNow,
            CuisineType = "Italian",
            MealTypes = ["Supper", "Lunch"]
        };

        var json = JsonSerializer.Serialize(original, JsonOptions);
        var deserialized = JsonSerializer.Deserialize<RecipeDto>(json, JsonOptions);

        Assert.NotNull(deserialized);
        Assert.Equal("Italian", deserialized.CuisineType);
        Assert.Equal(new[] { "Supper", "Lunch" }, deserialized.MealTypes);
    }

    [Fact]
    public void UpdateRecipeDto_SerializationRoundTrip_IncludesCuisineAndMealTypes()
    {
        var original = new UpdateRecipeDto
        {
            Name = "Carbonara",
            CuisineType = "Italian",
            MealTypes = ["Supper", "Lunch"]
        };

        var json = JsonSerializer.Serialize(original, JsonOptions);
        var deserialized = JsonSerializer.Deserialize<UpdateRecipeDto>(json, JsonOptions);

        Assert.NotNull(deserialized);
        Assert.Equal("Italian", deserialized.CuisineType);
        Assert.Equal(new[] { "Supper", "Lunch" }, deserialized.MealTypes);
    }

    [Fact]
    public void ImportedRecipeDto_SerializationRoundTrip_IncludesCuisineAndMealTypes()
    {
        var original = new ImportedRecipeDto
        {
            Name = "Carbonara",
            Ingredients = ["Pasta", "Bacon"],
            Instructions = [],
            IsSynthesized = false,
            CuisineType = "Italian",
            MealTypes = ["Supper", "Lunch"]
        };

        var json = JsonSerializer.Serialize(original, JsonOptions);
        var deserialized = JsonSerializer.Deserialize<ImportedRecipeDto>(json, JsonOptions);

        Assert.NotNull(deserialized);
        Assert.Equal("Italian", deserialized.CuisineType);
        Assert.Equal(new[] { "Supper", "Lunch" }, deserialized.MealTypes);
    }
}
