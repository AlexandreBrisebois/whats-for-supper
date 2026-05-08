using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeSearchResponseDto
{
    [JsonPropertyName("topPick")]
    public RecipeSearchResultDto? TopPick { get; set; }

    [JsonPropertyName("results")]
    public List<RecipeSearchResultDto> Results { get; set; } = [];

    [JsonPropertyName("appliedFilters")]
    public RecipeSearchFiltersDto AppliedFilters { get; set; } = new();

    [JsonPropertyName("searchMode")]
    public string SearchMode { get; set; } = "standard";

    [JsonPropertyName("resultPath")]
    public string ResultPath { get; set; } = "lexical-only";
}
