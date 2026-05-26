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

    [JsonPropertyName("demoMode")]
    public required bool DemoMode { get; set; }

    [JsonPropertyName("demoModeRawValue")]
    public required string DemoModeRawValue { get; set; }

    [JsonPropertyName("demoRestoreCronValid")]
    public required bool DemoRestoreCronValid { get; set; }

    [JsonPropertyName("allowAgentSearch")]
    public required bool AllowAgentSearch { get; set; }

    [JsonPropertyName("allowPhotoSearch")]
    public required bool AllowPhotoSearch { get; set; }
}
