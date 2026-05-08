using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class CaptureFailureDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("familyMemberId")]
    public Guid? FamilyMemberId { get; set; }

    [JsonPropertyName("sourceType")]
    public string SourceType { get; set; } = string.Empty;

    [JsonPropertyName("previewText")]
    public string? PreviewText { get; set; }

    [JsonPropertyName("friendlyReason")]
    public string FriendlyReason { get; set; } = string.Empty;

    [JsonPropertyName("failureCode")]
    public string? FailureCode { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("retryCount")]
    public int RetryCount { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; set; }

    [JsonPropertyName("lastFailedAt")]
    public DateTimeOffset LastFailedAt { get; set; }
}
