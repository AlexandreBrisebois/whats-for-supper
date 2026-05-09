using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeSearchRequestDto
{
    [JsonPropertyName("query")]
    public string Query { get; set; } = string.Empty;

    [JsonPropertyName("mode")]
    public string? Mode { get; set; }

    [JsonPropertyName("originalQuery")]
    public string? OriginalQuery { get; set; }

    [JsonPropertyName("similarToRecipeId")]
    public Guid? SimilarToRecipeId { get; set; }

    [JsonPropertyName("pantrySnapshotId")]
    public Guid? PantrySnapshotId { get; set; }

    [JsonPropertyName("weekOffset")]
    public int? WeekOffset { get; set; }

    [JsonPropertyName("dayIndex")]
    public int? DayIndex { get; set; }

    [JsonPropertyName("limit")]
    public int? Limit { get; set; }

    [JsonPropertyName("filters")]
    public RecipeSearchFiltersDto? Filters { get; set; }
}
