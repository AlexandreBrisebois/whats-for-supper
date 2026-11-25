using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class CaptureFailureDetailsDto
{
    [JsonPropertyName("workflowInstanceId")]
    public Guid WorkflowInstanceId { get; set; }

    [JsonPropertyName("recipeId")]
    public Guid? RecipeId { get; set; }

    [JsonPropertyName("sourceWorkflowId")]
    public string SourceWorkflowId { get; set; } = string.Empty;

    [JsonPropertyName("sourceType")]
    public string SourceType { get; set; } = string.Empty;

    [JsonPropertyName("failedStep")]
    public string? FailedStep { get; set; }

    [JsonPropertyName("friendlyReason")]
    public string FriendlyReason { get; set; } = string.Empty;

    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }

    [JsonPropertyName("stackTrace")]
    public string? StackTrace { get; set; }

    [JsonPropertyName("retryCount")]
    public int RetryCount { get; set; }

    [JsonPropertyName("lastFailedAt")]
    public DateTimeOffset LastFailedAt { get; set; }
}
