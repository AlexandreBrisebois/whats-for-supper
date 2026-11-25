using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class CaptureActivityItemDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("workflowInstanceId")]
    public Guid? WorkflowInstanceId { get; set; }

    [JsonPropertyName("recipeId")]
    public Guid? RecipeId { get; set; }

    [JsonPropertyName("stage")]
    public string Stage { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("sourceWorkflowId")]
    public string? SourceWorkflowId { get; set; }

    [JsonPropertyName("sourceType")]
    public string? SourceType { get; set; }

    [JsonPropertyName("stepName")]
    public string? StepName { get; set; }

    [JsonPropertyName("stepLabel")]
    public string? StepLabel { get; set; }

    [JsonPropertyName("previewText")]
    public string? PreviewText { get; set; }

    [JsonPropertyName("friendlyReason")]
    public string? FriendlyReason { get; set; }

    [JsonPropertyName("retryCount")]
    public int RetryCount { get; set; }

    [JsonPropertyName("isReady")]
    public bool IsReady { get; set; }

    [JsonPropertyName("isSuspectedDuplicate")]
    public bool IsSuspectedDuplicate { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; }
}
