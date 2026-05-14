using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class TopPickDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("imageUrl")]
    public string ImageUrl { get; set; } = string.Empty;

    [JsonPropertyName("totalTime")]
    public string TotalTime { get; set; } = string.Empty;

}
