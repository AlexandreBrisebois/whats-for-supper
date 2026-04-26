using RecipeApi.Models;

namespace RecipeApi.Dto;

public class WorkflowInstanceSummaryDto
{
    public Guid Id { get; set; }
    public string WorkflowId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public int TaskCount { get; set; }

    public static WorkflowInstanceSummaryDto FromModel(WorkflowInstance instance) => new()
    {
        Id = instance.Id,
        WorkflowId = instance.WorkflowId,
        Status = instance.Status.ToString(),
        CreatedAt = instance.CreatedAt,
        UpdatedAt = instance.UpdatedAt,
        TaskCount = instance.Tasks.Count
    };
}
