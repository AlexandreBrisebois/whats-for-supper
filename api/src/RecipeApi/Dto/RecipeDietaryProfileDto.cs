using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeDietaryProfileDto
{
    [JsonPropertyName("primaryFoodGroup")]
    public required string PrimaryFoodGroup { get; set; }

    [JsonPropertyName("secondaryFoodGroups")]
    public required List<string> SecondaryFoodGroups { get; set; }

    [JsonPropertyName("proteinSource")]
    public required string ProteinSource { get; set; }

    [JsonPropertyName("cuisineType")]
    public required string CuisineType { get; set; }

    [JsonPropertyName("mealTypes")]
    public required List<string> MealTypes { get; set; }

    [JsonPropertyName("primaryMealType")]
    public required string PrimaryMealType { get; set; }

    [JsonPropertyName("wholeGrainConfident")]
    public required bool WholeGrainConfident { get; set; }

    [JsonPropertyName("confidence")]
    public required double Confidence { get; set; }

    [JsonPropertyName("source")]
    public required string Source { get; set; }

    [JsonPropertyName("fopFlags")]
    public FopFlagsDto? FopFlags { get; set; }
}

public class FopFlagsDto
{
    [JsonPropertyName("highInSaturatedFat")]
    public required bool HighInSaturatedFat { get; set; }

    [JsonPropertyName("highInSugars")]
    public required bool HighInSugars { get; set; }

    [JsonPropertyName("highInSodium")]
    public required bool HighInSodium { get; set; }
}

public class WeeklyBalanceSummaryDto
{
    [JsonPropertyName("proteinDays")]
    public required int ProteinDays { get; set; }

    [JsonPropertyName("veggieDays")]
    public required int VeggieDays { get; set; }

    [JsonPropertyName("grainDays")]
    public required int GrainDays { get; set; }

    [JsonPropertyName("plantProteinDays")]
    public required int PlantProteinDays { get; set; }

    [JsonPropertyName("redMeatDays")]
    public required int RedMeatDays { get; set; }

    [JsonPropertyName("maxConsecutiveSame")]
    public required int MaxConsecutiveSame { get; set; }

    [JsonPropertyName("isBalanced")]
    public required bool IsBalanced { get; set; }

    [JsonPropertyName("recommendations")]
    public required List<string> Recommendations { get; set; }

    [JsonPropertyName("fopWeekSummary")]
    public required FopWeekSummaryDto FopWeekSummary { get; set; }
}

public class FopWeekSummaryDto
{
    [JsonPropertyName("highInSaturatedFatDays")]
    public required int HighInSaturatedFatDays { get; set; }

    [JsonPropertyName("highInSugarsDays")]
    public required int HighInSugarsDays { get; set; }

    [JsonPropertyName("highInSodiumDays")]
    public required int HighInSodiumDays { get; set; }
}
