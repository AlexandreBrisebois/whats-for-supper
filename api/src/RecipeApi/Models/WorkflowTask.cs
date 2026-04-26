namespace RecipeApi.Models;

public enum TaskStatus { Waiting, Pending, Processing, Completed, Failed }

public class WorkflowTask
{
    public Guid TaskId { get; set; }
    public Guid InstanceId { get; set; }
    public string ProcessorName { get; set; } = string.Empty;
    public string? Payload { get; set; } // Store as JSONB
    public TaskStatus Status { get; set; }
    public string[] DependsOn { get; set; } = [];
    public int RetryCount { get; set; } = 0;
    public DateTimeOffset? ScheduledAt { get; set; }
    public string? ErrorMessage { get; set; }
    public string? StackTrace { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public WorkflowInstance Instance { get; set; } = null!;
}
