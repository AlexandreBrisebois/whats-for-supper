using System.Text.Json.Serialization;
using RecipeApi.Models;

namespace RecipeApi.Dto;

public class WorkflowInstanceDetailDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("workflowId")]
    public string WorkflowId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("parameters")]
    public Dictionary<string, string>? Parameters { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; }

    [JsonPropertyName("tasks")]
    public List<WorkflowTaskDto> Tasks { get; set; } = new();

    public static WorkflowInstanceDetailDto FromModel(WorkflowInstance instance)
    {
        var parameters = instance.Parameters != null
            ? System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(instance.Parameters)
            : null;

        return new()
        {
            Id = instance.Id,
            WorkflowId = instance.WorkflowId,
            Status = instance.Status.ToString(),
            Parameters = parameters,
            CreatedAt = instance.CreatedAt,
            UpdatedAt = instance.UpdatedAt,
            Tasks = instance.Tasks.Select(WorkflowTaskDto.FromModel).ToList()
        };
    }
}
