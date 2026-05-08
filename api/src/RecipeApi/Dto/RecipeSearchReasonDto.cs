using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeSearchReasonDto
{
    [JsonPropertyName("source")]
    public string Source { get; set; } = string.Empty;

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;
}
