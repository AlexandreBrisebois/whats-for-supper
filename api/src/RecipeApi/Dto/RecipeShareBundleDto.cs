using System.Text.Json;
using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class RecipeShareBundleDto
{
    [JsonPropertyName("version")]
    public required string Version { get; set; } = "1.0";

    [JsonPropertyName("recipe")]
    public required RecipeDto Recipe { get; set; }

    [JsonPropertyName("info")]
    public required JsonElement Info { get; set; }

    [JsonPropertyName("hero")]
    public required string? Hero { get; set; }

    [JsonPropertyName("originals")]
    public required List<string> Originals { get; set; } = [];
}
