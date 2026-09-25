using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeSearchFiltersDto
{
    [JsonPropertyName("cuisines")]
    public List<string>? Cuisines { get; set; }

    [JsonPropertyName("mealTypes")]
    public List<string>? MealTypes { get; set; }

    [JsonPropertyName("includedIngredients")]
    public List<string>? IncludedIngredients { get; set; }

    [JsonPropertyName("categories")]
    public List<string>? Categories { get; set; }

    [JsonPropertyName("maximumTotalMinutes")]
    public int? MaximumTotalMinutes { get; set; }

    // Deliberately retained solely to return the documented unsupported-filter error.
    [JsonPropertyName("excludedIngredients")]
    public List<string>? ExcludedIngredients { get; set; }
    [JsonPropertyName("newRecipes")]
    public bool? NewRecipes { get; set; }

    [JsonPropertyName("neverCooked")]
    public bool? NeverCooked { get; set; }

    [JsonPropertyName("familyFavorite")]
    public bool? FamilyFavorite { get; set; }

    [JsonPropertyName("quickOnly")]
    public bool? QuickOnly { get; set; }

    [JsonPropertyName("notCookedInLongTime")]
    public bool? NotCookedInLongTime { get; set; }

    [JsonPropertyName("reportedOnly")]
    public bool? ReportedOnly { get; set; }

    [JsonPropertyName("readyToReviewOnly")]
    public bool? ReadyToReviewOnly { get; set; }

    [JsonPropertyName("discoverableOnly")]
    public bool? DiscoverableOnly { get; set; }
}
