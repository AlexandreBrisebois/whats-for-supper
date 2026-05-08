using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeSearchResultDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("totalTime")]
    public string? TotalTime { get; set; }

    [JsonPropertyName("difficulty")]
    public string? Difficulty { get; set; }

    [JsonPropertyName("rating")]
    public int Rating { get; set; }

    [JsonPropertyName("isDiscoverable")]
    public bool IsDiscoverable { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("reasons")]
    public List<RecipeSearchReasonDto> Reasons { get; set; } = [];

    [JsonPropertyName("plannerFitNote")]
    public string? PlannerFitNote { get; set; }
}
