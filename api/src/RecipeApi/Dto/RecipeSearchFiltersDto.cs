using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeSearchFiltersDto
{
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

    [JsonPropertyName("healthyOnly")]
    public bool? HealthyOnly { get; set; }

    [JsonPropertyName("reportedOnly")]
    public bool? ReportedOnly { get; set; }

    [JsonPropertyName("readyToReviewOnly")]
    public bool? ReadyToReviewOnly { get; set; }

    [JsonPropertyName("discoverableOnly")]
    public bool? DiscoverableOnly { get; set; }
}
