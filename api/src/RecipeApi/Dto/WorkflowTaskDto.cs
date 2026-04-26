using RecipeApi.Models;

namespace RecipeApi.Dto;

public class WorkflowTaskDto
{
    public Guid TaskId { get; set; }
    public string ProcessorName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string[]? DependsOn { get; set; }
    public int RetryCount { get; set; }
    public DateTimeOffset? ScheduledAt { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
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
