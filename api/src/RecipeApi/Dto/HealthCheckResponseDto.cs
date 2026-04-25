using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class HealthCheckResponseDto
{
    [JsonPropertyName("status")]
    public required string Status { get; set; }

    [JsonPropertyName("timestamp")]
    public required DateTimeOffset Timestamp { get; set; }

    [JsonPropertyName("checks")]
    public required Dictionary<string, object> Checks { get; set; }
}
