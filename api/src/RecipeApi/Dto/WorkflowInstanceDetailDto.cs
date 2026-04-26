using RecipeApi.Models;

namespace RecipeApi.Dto;

public class WorkflowInstanceDetailDto
{
    public Guid Id { get; set; }
    public string WorkflowId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Dictionary<string, string>? Parameters { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
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
