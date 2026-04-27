namespace RecipeApi.Models;

public class ManagementStatus
{
    public Guid WorkflowId { get; set; }
    public string WorkflowType { get; set; } = string.Empty;
    public WorkflowStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
}
