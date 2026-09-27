using System.Text.Json.Serialization;
using RecipeApi.Models;

namespace RecipeApi.Dto;

/// <summary>
/// Internal diagnostics for a workflow task. This deliberately includes the
/// stored exception stack trace and must not be used in family-facing APIs.
/// </summary>
public class WorkflowTaskDiagnosticsDto
{
    [JsonPropertyName("taskId")]
    public Guid TaskId { get; init; }

    [JsonPropertyName("instanceId")]
    public Guid InstanceId { get; init; }

    [JsonPropertyName("workflowId")]
    public string WorkflowId { get; init; } = string.Empty;

    [JsonPropertyName("taskName")]
    public string TaskName { get; init; } = string.Empty;

    [JsonPropertyName("processorName")]
    public string ProcessorName { get; init; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; init; } = string.Empty;

    [JsonPropertyName("retryCount")]
    public int RetryCount { get; init; }

    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; init; }

    [JsonPropertyName("stackTrace")]
    public string? StackTrace { get; init; }

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; init; }

    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; init; }

    public static WorkflowTaskDiagnosticsDto FromModel(WorkflowTask task) => new()
    {
        TaskId = task.TaskId,
        InstanceId = task.InstanceId,
        WorkflowId = task.Instance.WorkflowId,
        TaskName = task.TaskName,
        ProcessorName = task.ProcessorName,
        Status = task.Status.ToString(),
        RetryCount = task.RetryCount,
        ErrorMessage = task.ErrorMessage,
        StackTrace = task.StackTrace,
        CreatedAt = task.CreatedAt,
        UpdatedAt = task.UpdatedAt
    };
}
