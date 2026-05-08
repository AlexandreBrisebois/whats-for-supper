using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeLibrarySummaryDto
{
    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("neverCooked")]
    public int NeverCooked { get; set; }

    [JsonPropertyName("ratings")]
    public RecipeLibraryRatingsDto Ratings { get; set; } = new();
}

public class RecipeLibraryRatingsDto
{
    [JsonPropertyName("love")]
    public int Love { get; set; }

    [JsonPropertyName("like")]
    public int Like { get; set; }

    [JsonPropertyName("dislike")]
    public int Dislike { get; set; }

    [JsonPropertyName("unrated")]
    public int Unrated { get; set; }
}
