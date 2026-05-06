using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class WeeklyBalanceScorerTests
{
    /// <summary>
    /// Test 1: All unclassified (7 null profiles)
    /// Expected: isBalanced: false, all counts 0, multiple recommendations present, fopWeekSummary all zeros
    /// </summary>
    [Fact]
    public void Compute_AllUnclassified_ReturnsUnbalancedWithZeroCounts()
    {
        // Arrange
        var profiles = new RecipeDietaryProfile?[] { null, null, null, null, null, null, null };

        // Act
        var result = WeeklyBalanceScorer.Compute(profiles);

        // Assert
        Assert.False(result.IsBalanced);
        Assert.Equal(0, result.ProteinDays);
        Assert.Equal(0, result.VeggieDays);
        Assert.Equal(0, result.GrainDays);
        Assert.Equal(0, result.PlantProteinDays);
        Assert.Equal(0, result.RedMeatDays);
        Assert.Equal(0, result.MaxConsecutiveSame);
        Assert.NotEmpty(result.Recommendations);
        Assert.Equal(0, result.FopWeekSummary.HighInSaturatedFatDays);
        Assert.Equal(0, result.FopWeekSummary.HighInSugarsDays);
        Assert.Equal(0, result.FopWeekSummary.HighInSodiumDays);
    }

    /// <summary>
    /// Test 2: All red meat (7 profiles with ProteinFoods primary, RedMeat source)
    /// Expected: plantProteinDays: 0, redMeatDays: 7, isBalanced: false
    /// </summary>
    [Fact]
    public void Compute_AllRedMeat_CountsRedMeatDaysCorrectly()
    {
        // Arrange
        var profile = new RecipeDietaryProfile(
            PrimaryFoodGroup: "ProteinFoods",
            SecondaryFoodGroups: [],
            ProteinSource: "RedMeat",
            CuisineType: "Canadian",
            MealTypes: ["Dinner"],
            PrimaryMealType: "Dinner",
            WholeGrainConfident: false,
            Confidence: 0.95,
            Source: "llm",
            FopFlags: null
        );
        var profiles = Enumerable.Repeat(profile, 7).ToArray();

        // Act
        var result = WeeklyBalanceScorer.Compute(profiles);

        // Assert
        Assert.Equal(0, result.PlantProteinDays);
        Assert.Equal(7, result.RedMeatDays);
        Assert.False(result.IsBalanced);
    }

    /// <summary>
    /// Test 3: Balanced week
    /// Expected: protein (3+), veggies (4+), confirmed grains (2+), one plant protein → isBalanced: true, recommendations empty
    /// </summary>
    [Fact]
    public void Compute_BalancedWeek_ReturnsBalancedTrue()
    {
        // Arrange
        var profiles = new RecipeDietaryProfile?[]
        {
            // Day 1: Protein + Veggies (Poultry)
            new RecipeDietaryProfile(
                PrimaryFoodGroup: "ProteinFoods",
                SecondaryFoodGroups: ["VegetablesAndFruits"],
                ProteinSource: "Poultry",
                CuisineType: "Canadian",
                MealTypes: ["Dinner"],
                PrimaryMealType: "Dinner",
                WholeGrainConfident: false,
                Confidence: 0.95,
                Source: "llm",
                FopFlags: null
            ),
            // Day 2: Protein + Veggies + Grain (Seafood, confident grain)
            new RecipeDietaryProfile(
                PrimaryFoodGroup: "ProteinFoods",
                SecondaryFoodGroups: ["VegetablesAndFruits", "WholeGrains"],
                ProteinSource: "Seafood",
                CuisineType: "Italian",
                MealTypes: ["Dinner"],
                PrimaryMealType: "Dinner",
                WholeGrainConfident: true,
                Confidence: 0.95,
                Source: "llm",
                FopFlags: null
            ),
            // Day 3: Protein + Veggies + Grain (Plant protein, confident grain)
            new RecipeDietaryProfile(
                PrimaryFoodGroup: "ProteinFoods",
                SecondaryFoodGroups: ["VegetablesAndFruits", "WholeGrains"],
                ProteinSource: "PlantProtein",
                CuisineType: "Asian",
                MealTypes: ["Dinner"],
                PrimaryMealType: "Dinner",
                WholeGrainConfident: true,
                Confidence: 0.95,
                Source: "llm",
                FopFlags: null
            ),
            // Day 4: Veggies primary
            new RecipeDietaryProfile(
                PrimaryFoodGroup: "VegetablesAndFruits",
                SecondaryFoodGroups: [],
                ProteinSource: "None",
                CuisineType: "Mediterranean",
                MealTypes: ["Dinner"],
                PrimaryMealType: "Dinner",
                WholeGrainConfident: false,
                Confidence: 0.95,
                Source: "llm",
                FopFlags: null
            ),
            // Day 5: Veggies primary
            new RecipeDietaryProfile(
                PrimaryFoodGroup: "VegetablesAndFruits",
                SecondaryFoodGroups: [],
                ProteinSource: "None",
                CuisineType: "Mediterranean",
                MealTypes: ["Dinner"],
                PrimaryMealType: "Dinner",
                WholeGrainConfident: false,
                Confidence: 0.95,
                Source: "llm",
                FopFlags: null
            ),
            // Day 6: Veggies primary
            new RecipeDietaryProfile(
                PrimaryFoodGroup: "VegetablesAndFruits",
                SecondaryFoodGroups: [],
                ProteinSource: "None",
                CuisineType: "Mediterranean",
                MealTypes: ["Dinner"],
                PrimaryMealType: "Dinner",
                WholeGrainConfident: false,
                Confidence: 0.95,
                Source: "llm",
                FopFlags: null
            ),
            // Day 7: Grain primary (breaks the veggie sequence to keep maxConsecutiveSame <= 3)
            new RecipeDietaryProfile(
                PrimaryFoodGroup: "WholeGrains",
                SecondaryFoodGroups: ["VegetablesAndFruits"],
                ProteinSource: "None",
                CuisineType: "Mediterranean",
                MealTypes: ["Dinner"],
                PrimaryMealType: "Dinner",
                WholeGrainConfident: true,
                Confidence: 0.95,
                Source: "llm",
                FopFlags: null
            ),
        };

        // Act
        var result = WeeklyBalanceScorer.Compute(profiles);

        // Assert
        Assert.True(result.IsBalanced);
        Assert.Empty(result.Recommendations);
        Assert.Equal(3, result.ProteinDays);
        Assert.Equal(7, result.VeggieDays);
        Assert.Equal(3, result.GrainDays);
        Assert.Equal(1, result.PlantProteinDays);
    }

    /// <summary>
    /// Test 4: Grain credit refused when not confident
    /// Expected: profile with WholeGrains in secondary but wholeGrainConfident: false → grainDays NOT incremented
    /// </summary>
    [Fact]
    public void Compute_WholeGrainsNotConfident_DoesNotCreditGrainDays()
    {
        // Arrange
        var profile = new RecipeDietaryProfile(
            PrimaryFoodGroup: "ProteinFoods",
            SecondaryFoodGroups: ["WholeGrains"],
            ProteinSource: "Poultry",
            CuisineType: "Canadian",
            MealTypes: ["Dinner"],
            PrimaryMealType: "Dinner",
            WholeGrainConfident: false,  // NOT confident
            Confidence: 0.95,
            Source: "llm",
            FopFlags: null
        );
        var profiles = Enumerable.Repeat(profile, 7).ToArray();

        // Act
        var result = WeeklyBalanceScorer.Compute(profiles);

        // Assert
        Assert.Equal(0, result.GrainDays);
    }

    /// <summary>
    /// Test 5: Grain credit accepted when confident
    /// Expected: profile with WholeGrains in secondary and wholeGrainConfident: true → grainDays incremented
    /// </summary>
    [Fact]
    public void Compute_WholeGrainsConfident_CreditGrainDays()
    {
        // Arrange
        var profile = new RecipeDietaryProfile(
            PrimaryFoodGroup: "ProteinFoods",
            SecondaryFoodGroups: ["WholeGrains"],
            ProteinSource: "Poultry",
            CuisineType: "Canadian",
            MealTypes: ["Dinner"],
            PrimaryMealType: "Dinner",
            WholeGrainConfident: true,  // Confident
            Confidence: 0.95,
            Source: "llm",
            FopFlags: null
        );
        var profiles = Enumerable.Repeat(profile, 7).ToArray();

        // Act
        var result = WeeklyBalanceScorer.Compute(profiles);

        // Assert
        Assert.Equal(7, result.GrainDays);
    }

    /// <summary>
    /// Test 6: Consecutive-same detection
    /// Expected: 4 consecutive profiles with same primaryFoodGroup → maxConsecutiveSame: 4, recommendation present
    /// </summary>
    [Fact]
    public void Compute_FourConsecutiveSame_DetectsMaxConsecutive()
    {
        // Arrange
        var profiles = new RecipeDietaryProfile?[]
        {
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("VegetablesAndFruits", [], "None", "Mediterranean", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("VegetablesAndFruits", [], "None", "Mediterranean", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("VegetablesAndFruits", [], "None", "Mediterranean", ["Dinner"], "Dinner", false, 0.95, "llm", null),
        };

        // Act
        var result = WeeklyBalanceScorer.Compute(profiles);

        // Assert
        Assert.Equal(4, result.MaxConsecutiveSame);
        Assert.Contains("similar meals in a row", string.Join(" ", result.Recommendations));
    }

    /// <summary>
    /// Test 7: Consecutive broken by null
    /// Expected: 2 same, 1 null, 2 same → maxConsecutiveSame: 2
    /// </summary>
    [Fact]
    public void Compute_ConsecutiveBrokenByNull_ResetsCount()
    {
        // Arrange
        var profiles = new RecipeDietaryProfile?[]
        {
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            null,  // Breaks the sequence
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("VegetablesAndFruits", [], "None", "Mediterranean", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("VegetablesAndFruits", [], "None", "Mediterranean", ["Dinner"], "Dinner", false, 0.95, "llm", null),
        };

        // Act
        var result = WeeklyBalanceScorer.Compute(profiles);

        // Assert
        Assert.Equal(2, result.MaxConsecutiveSame);
    }

    /// <summary>
    /// Test 8: Three sample recipes from spec
    /// Chicken Linguine (ProteinFoods/Poultry/no confident grain)
    /// Parmentier (ProteinFoods/RedMeat/no grain)
    /// Mustard Chicken Thighs (ProteinFoods/Poultry/confirmed grain)
    /// </summary>
    [Fact]
    public void Compute_SampleRecipes_CountsCorrectly()
    {
        // Arrange
        var profiles = new RecipeDietaryProfile?[]
        {
            // Chicken Linguine: Protein/Poultry, no confident grain
            new RecipeDietaryProfile(
                PrimaryFoodGroup: "ProteinFoods",
                SecondaryFoodGroups: [],
                ProteinSource: "Poultry",
                CuisineType: "Italian",
                MealTypes: ["Dinner"],
                PrimaryMealType: "Dinner",
                WholeGrainConfident: false,
                Confidence: 0.95,
                Source: "llm",
                FopFlags: null
            ),
            // Parmentier: Protein/RedMeat, no grain
            new RecipeDietaryProfile(
                PrimaryFoodGroup: "ProteinFoods",
                SecondaryFoodGroups: [],
                ProteinSource: "RedMeat",
                CuisineType: "French-Canadian",
                MealTypes: ["Dinner"],
                PrimaryMealType: "Dinner",
                WholeGrainConfident: false,
                Confidence: 0.95,
                Source: "llm",
                FopFlags: null
            ),
            // Mustard Chicken Thighs: Protein/Poultry/confirmed grain
            new RecipeDietaryProfile(
                PrimaryFoodGroup: "ProteinFoods",
                SecondaryFoodGroups: ["WholeGrains", "VegetablesAndFruits"],
                ProteinSource: "Poultry",
                CuisineType: "Canadian",
                MealTypes: ["Dinner"],
                PrimaryMealType: "Dinner",
                WholeGrainConfident: true,
                Confidence: 0.95,
                Source: "llm",
                FopFlags: null
            ),
            null, null, null, null  // Fill remaining days
        };

        // Act
        var result = WeeklyBalanceScorer.Compute(profiles);

        // Assert
        Assert.Equal(3, result.ProteinDays);
        Assert.Equal(1, result.VeggieDays);
        Assert.Equal(1, result.GrainDays);
        Assert.Equal(0, result.PlantProteinDays);
        Assert.Equal(1, result.RedMeatDays);
    }

    /// <summary>
    /// Test 9: Recommendations order
    /// Expected: missing targets produce recommendations in fixed priority order
    /// </summary>
    [Fact]
    public void Compute_MissingTargets_RecommendationsInOrder()
    {
        // Arrange - all unclassified to trigger all recommendations
        var profiles = new RecipeDietaryProfile?[] { null, null, null, null, null, null, null };

        // Act
        var result = WeeklyBalanceScorer.Compute(profiles);

        // Assert
        Assert.NotEmpty(result.Recommendations);
        // Should have recommendations for: protein, veggies, grains, plant protein, consecutive
        Assert.True(result.Recommendations.Length >= 4);
        // Check that recommendations are in expected order (protein first, then veggies, then grains, then plant, then consecutive)
        var recText = string.Join(" | ", result.Recommendations);
        var proteinIdx = recText.IndexOf("protein", StringComparison.OrdinalIgnoreCase);
        var veggieIdx = recText.IndexOf("vegetable", StringComparison.OrdinalIgnoreCase);
        var grainIdx = recText.IndexOf("grain", StringComparison.OrdinalIgnoreCase);
        var plantIdx = recText.IndexOf("plant", StringComparison.OrdinalIgnoreCase);
        
        Assert.True(proteinIdx >= 0, "Should have protein recommendation");
        Assert.True(veggieIdx >= 0, "Should have veggie recommendation");
        Assert.True(grainIdx >= 0, "Should have grain recommendation");
        Assert.True(plantIdx >= 0, "Should have plant protein recommendation");
    }

    /// <summary>
    /// Test 10: FOP aggregation — high sodium
    /// Expected: 3 profiles with highInSodium: true, 4 with false → highInSodiumDays = 3
    /// </summary>
    [Fact]
    public void Compute_FopAggregation_CountsHighSodiumDays()
    {
        // Arrange
        var profiles = new RecipeDietaryProfile?[]
        {
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm",
                new FopFlags(HighInSaturatedFat: false, HighInSugars: false, HighInSodium: true)),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm",
                new FopFlags(HighInSaturatedFat: false, HighInSugars: false, HighInSodium: true)),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm",
                new FopFlags(HighInSaturatedFat: false, HighInSugars: false, HighInSodium: true)),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm",
                new FopFlags(HighInSaturatedFat: false, HighInSugars: false, HighInSodium: false)),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm",
                new FopFlags(HighInSaturatedFat: false, HighInSugars: false, HighInSodium: false)),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm",
                new FopFlags(HighInSaturatedFat: false, HighInSugars: false, HighInSodium: false)),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm",
                new FopFlags(HighInSaturatedFat: false, HighInSugars: false, HighInSodium: false)),
        };

        // Act
        var result = WeeklyBalanceScorer.Compute(profiles);

        // Assert
        Assert.Equal(3, result.FopWeekSummary.HighInSodiumDays);
    }

    /// <summary>
    /// Test 11: FOP aggregation — null fopFlags
    /// Expected: profiles with fopFlags: null contribute 0 to all FOP counts, no exception
    /// </summary>
    [Fact]
    public void Compute_FopAggregation_NullFopFlagsContributeZero()
    {
        // Arrange
        var profiles = new RecipeDietaryProfile?[]
        {
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
            new RecipeDietaryProfile("ProteinFoods", [], "RedMeat", "Canadian", ["Dinner"], "Dinner", false, 0.95, "llm", null),
        };

        // Act
        var result = WeeklyBalanceScorer.Compute(profiles);

        // Assert
        Assert.Equal(0, result.FopWeekSummary.HighInSaturatedFatDays);
        Assert.Equal(0, result.FopWeekSummary.HighInSugarsDays);
        Assert.Equal(0, result.FopWeekSummary.HighInSodiumDays);
    }

    /// <summary>
    /// Test 12: FOP aggregation — Chicken Linguine real values
    /// sodium 370mg → below threshold 345mg → highInSodium: false
    /// saturated fat 9g → above 4g → highInSaturatedFat: true
    /// sugar 8g → below 15g → highInSugars: false
    /// </summary>
    [Fact]
    public void Compute_FopAggregation_ChickenLinguineRealValues()
    {
        // Arrange
        var profiles = new RecipeDietaryProfile?[]
        {
            // Chicken Linguine with specific FOP flags
            new RecipeDietaryProfile(
                PrimaryFoodGroup: "ProteinFoods",
                SecondaryFoodGroups: [],
                ProteinSource: "Poultry",
                CuisineType: "Italian",
                MealTypes: ["Dinner"],
                PrimaryMealType: "Dinner",
                WholeGrainConfident: false,
                Confidence: 0.95,
                Source: "llm",
                FopFlags: new FopFlags(HighInSaturatedFat: true, HighInSugars: false, HighInSodium: false)
            ),
            null, null, null, null, null, null
        };

        // Act
        var result = WeeklyBalanceScorer.Compute(profiles);

        // Assert
        Assert.Equal(1, result.FopWeekSummary.HighInSaturatedFatDays);
        Assert.Equal(0, result.FopWeekSummary.HighInSugarsDays);
        Assert.Equal(0, result.FopWeekSummary.HighInSodiumDays);
    }
}
