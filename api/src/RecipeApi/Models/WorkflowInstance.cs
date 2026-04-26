namespace RecipeApi.Models;

public enum WorkflowStatus { Pending, Processing, Completed, Failed, Paused }

public class WorkflowInstance
{
    public Guid Id { get; set; }
    public string WorkflowId { get; set; } = string.Empty;
    public WorkflowStatus Status { get; set; }
    public string? Parameters { get; set; } // Store as JSONB in DB
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<WorkflowTask> Tasks { get; set; } = new List<WorkflowTask>();
}
