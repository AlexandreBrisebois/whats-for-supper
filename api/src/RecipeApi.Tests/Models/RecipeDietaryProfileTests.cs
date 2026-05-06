using System.Text.Json;
using RecipeApi.Models;
using Xunit;

namespace RecipeApi.Tests.Models;

public class RecipeDietaryProfileTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    [Fact]
    public void RecipeDietaryProfile_RoundTrip_WithAllFields()
    {
        // Arrange
        var fopFlags = new FopFlags(
            HighInSaturatedFat: true,
            HighInSugars: false,
            HighInSodium: true
        );

        var original = new RecipeDietaryProfile(
            PrimaryFoodGroup: "ProteinFoods",
            SecondaryFoodGroups: new[] { "WholeGrains", "VegetablesAndFruits" },
            ProteinSource: "Poultry",
            CuisineType: "Canadian",
            MealTypes: new[] { "Dinner", "Lunch" },
            PrimaryMealType: "Dinner",
            WholeGrainConfident: true,
            Confidence: 0.95,
            Source: "llm",
            FopFlags: fopFlags
        );

        // Act
        var json = JsonSerializer.Serialize(original, JsonOptions);
        var deserialized = JsonSerializer.Deserialize<RecipeDietaryProfile>(json, JsonOptions);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Equal(original.PrimaryFoodGroup, deserialized.PrimaryFoodGroup);
        Assert.Equal(original.SecondaryFoodGroups, deserialized.SecondaryFoodGroups);
        Assert.Equal(original.ProteinSource, deserialized.ProteinSource);
        Assert.Equal(original.CuisineType, deserialized.CuisineType);
        Assert.Equal(original.MealTypes, deserialized.MealTypes);
        Assert.Equal(original.PrimaryMealType, deserialized.PrimaryMealType);
        Assert.Equal(original.WholeGrainConfident, deserialized.WholeGrainConfident);
        Assert.Equal(original.Confidence, deserialized.Confidence);
        Assert.Equal(original.Source, deserialized.Source);
        Assert.NotNull(deserialized.FopFlags);
        Assert.Equal(original.FopFlags.HighInSaturatedFat, deserialized.FopFlags.HighInSaturatedFat);
        Assert.Equal(original.FopFlags.HighInSugars, deserialized.FopFlags.HighInSugars);
        Assert.Equal(original.FopFlags.HighInSodium, deserialized.FopFlags.HighInSodium);
    }

    [Fact]
    public void RecipeDietaryProfile_RoundTrip_WithNullFopFlags()
    {
        // Arrange
        var original = new RecipeDietaryProfile(
            PrimaryFoodGroup: "VegetablesAndFruits",
            SecondaryFoodGroups: Array.Empty<string>(),
            ProteinSource: "None",
            CuisineType: "Italian",
            MealTypes: new[] { "Lunch" },
            PrimaryMealType: "Lunch",
            WholeGrainConfident: false,
            Confidence: 0.85,
            Source: "llm",
            FopFlags: null
        );

        // Act
        var json = JsonSerializer.Serialize(original, JsonOptions);
        var deserialized = JsonSerializer.Deserialize<RecipeDietaryProfile>(json, JsonOptions);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Null(deserialized.FopFlags);
    }

    [Fact]
    public void RecipeDietaryProfile_NullFopFlags_SerializesAsNull()
    {
        // Arrange
        var profile = new RecipeDietaryProfile(
            PrimaryFoodGroup: "Mixed",
            SecondaryFoodGroups: Array.Empty<string>(),
            ProteinSource: "Mixed",
            CuisineType: "Asian",
            MealTypes: new[] { "Dinner" },
            PrimaryMealType: "Dinner",
            WholeGrainConfident: false,
            Confidence: 0.7,
            Source: "llm",
            FopFlags: null
        );

        // Act
        var json = JsonSerializer.Serialize(profile, JsonOptions);

        // Assert
        Assert.Contains("\"fopFlags\":null", json);
    }

    [Fact]
    public void WeeklyBalanceSummary_RoundTrip_WithAllFields()
    {
        // Arrange
        var fopWeekSummary = new FopWeekSummary(
            HighInSaturatedFatDays: 2,
            HighInSugarsDays: 1,
            HighInSodiumDays: 3
        );

        var original = new WeeklyBalanceSummary(
            ProteinDays: 5,
            VeggieDays: 6,
            GrainDays: 3,
            PlantProteinDays: 2,
            RedMeatDays: 1,
            MaxConsecutiveSame: 2,
            IsBalanced: true,
            Recommendations: new[] { "Recommendation 1", "Recommendation 2" },
            FopWeekSummary: fopWeekSummary
        );

        // Act
        var json = JsonSerializer.Serialize(original, JsonOptions);
        var deserialized = JsonSerializer.Deserialize<WeeklyBalanceSummary>(json, JsonOptions);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Equal(original.ProteinDays, deserialized.ProteinDays);
        Assert.Equal(original.VeggieDays, deserialized.VeggieDays);
        Assert.Equal(original.GrainDays, deserialized.GrainDays);
        Assert.Equal(original.PlantProteinDays, deserialized.PlantProteinDays);
        Assert.Equal(original.RedMeatDays, deserialized.RedMeatDays);
        Assert.Equal(original.MaxConsecutiveSame, deserialized.MaxConsecutiveSame);
        Assert.Equal(original.IsBalanced, deserialized.IsBalanced);
        Assert.Equal(original.Recommendations, deserialized.Recommendations);
        Assert.NotNull(deserialized.FopWeekSummary);
        Assert.Equal(original.FopWeekSummary.HighInSaturatedFatDays, deserialized.FopWeekSummary.HighInSaturatedFatDays);
        Assert.Equal(original.FopWeekSummary.HighInSugarsDays, deserialized.FopWeekSummary.HighInSugarsDays);
        Assert.Equal(original.FopWeekSummary.HighInSodiumDays, deserialized.FopWeekSummary.HighInSodiumDays);
    }

    [Fact]
    public void RecipeDietaryProfile_EmptySecondaryFoodGroups_SerializesAsEmptyArray()
    {
        // Arrange
        var profile = new RecipeDietaryProfile(
            PrimaryFoodGroup: "ProteinFoods",
            SecondaryFoodGroups: Array.Empty<string>(),
            ProteinSource: "Seafood",
            CuisineType: "Mediterranean",
            MealTypes: new[] { "Dinner" },
            PrimaryMealType: "Dinner",
            WholeGrainConfident: false,
            Confidence: 0.9,
            Source: "llm",
            FopFlags: null
        );

        // Act
        var json = JsonSerializer.Serialize(profile, JsonOptions);
        var deserialized = JsonSerializer.Deserialize<RecipeDietaryProfile>(json, JsonOptions);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Empty(deserialized.SecondaryFoodGroups);
    }
}
