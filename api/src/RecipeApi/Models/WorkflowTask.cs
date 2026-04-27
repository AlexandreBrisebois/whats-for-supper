using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

public enum TaskStatus { Waiting, Pending, Processing, Completed, Failed }

[Table("workflow_tasks")]
public class WorkflowTask
{
    [Key]
    [Column("task_id")]
    public Guid TaskId { get; set; }

    [Column("instance_id")]
    public Guid InstanceId { get; set; }

    [Column("processor_name")]
    public string ProcessorName { get; set; } = string.Empty;

    [Column("payload", TypeName = "jsonb")]
    public string? Payload { get; set; }

    [Column("status")]
    public TaskStatus Status { get; set; }

    [Column("depends_on", TypeName = "text[]")]
    public string[] DependsOn { get; set; } = [];

    [Column("retry_count")]
    public int RetryCount { get; set; } = 0;

    [Column("scheduled_at")]
    public DateTimeOffset? ScheduledAt { get; set; }

    [Column("error_message")]
    public string? ErrorMessage { get; set; }

    [Column("stack_trace")]
    public string? StackTrace { get; set; }

    [Column("result", TypeName = "jsonb")]
    public string? Result { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }

    public WorkflowInstance Instance { get; set; } = null!;
}
