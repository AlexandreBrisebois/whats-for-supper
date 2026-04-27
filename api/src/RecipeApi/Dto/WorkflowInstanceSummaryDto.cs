using System.Text.Json.Serialization;
using RecipeApi.Models;

namespace RecipeApi.Dto;

public class WorkflowInstanceSummaryDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("workflowId")]
    public string WorkflowId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; }

    [JsonPropertyName("taskCount")]
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
