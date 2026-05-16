using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class HowToSectionDto
{
    [JsonPropertyName("@type")]
    public string Type { get; set; } = "HowToSection";

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("itemListElement")]
    public List<HowToStepDto> ItemListElement { get; set; } = [];
}
