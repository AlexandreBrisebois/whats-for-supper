using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class CaptureFailureClearResponseDto
{
    [JsonPropertyName("cleared")]
    public bool Cleared { get; set; }

    [JsonPropertyName("cleanupCommandId")]
    public Guid CleanupCommandId { get; set; }
}
