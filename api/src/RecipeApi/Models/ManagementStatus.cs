namespace RecipeApi.Models;

public class ManagementStatus
{
    public Guid WorkflowId { get; set; }
    public string WorkflowType { get; set; } = string.Empty;
    public WorkflowStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public object? Result { get; set; }
}
