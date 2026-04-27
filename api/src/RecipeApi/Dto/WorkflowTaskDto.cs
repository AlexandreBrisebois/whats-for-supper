using System.Text.Json.Serialization;
using RecipeApi.Models;

namespace RecipeApi.Dto;

public class WorkflowTaskDto
{
    [JsonPropertyName("taskId")]
    public Guid TaskId { get; set; }

    [JsonPropertyName("processorName")]
    public string ProcessorName { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("dependsOn")]
    public string[]? DependsOn { get; set; }

    [JsonPropertyName("retryCount")]
    public int RetryCount { get; set; }

    [JsonPropertyName("scheduledAt")]
    public DateTimeOffset? ScheduledAt { get; set; }

    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; }

    public static WorkflowTaskDto FromModel(WorkflowTask task) => new()
    {
        TaskId = task.TaskId,
        ProcessorName = task.ProcessorName,
        Status = task.Status.ToString(),
        DependsOn = task.DependsOn?.Length > 0 ? task.DependsOn : null,
        RetryCount = task.RetryCount,
        ScheduledAt = task.ScheduledAt,
        ErrorMessage = task.ErrorMessage,
        CreatedAt = task.CreatedAt,
        UpdatedAt = task.UpdatedAt
    };
}
