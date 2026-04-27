using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class WorkflowTriggerResponseDto
{
    [JsonPropertyName("instanceId")]
    public Guid InstanceId { get; set; }
}
