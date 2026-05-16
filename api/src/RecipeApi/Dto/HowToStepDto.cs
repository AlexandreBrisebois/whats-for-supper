using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class HowToStepDto
{
    [JsonPropertyName("@type")]
    public string Type { get; set; } = "HowToStep";

    [JsonPropertyName("text")]
    public required string Text { get; set; }
}
