using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeSearchPreferencesDto
{
    [JsonPropertyName("ingredients")] public List<string>? Ingredients { get; set; }
    [JsonPropertyName("cuisines")] public List<string>? Cuisines { get; set; }
    [JsonPropertyName("concepts")] public List<string>? Concepts { get; set; }
}
