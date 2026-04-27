using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

public class WorkflowTriggerRequestDto
{
    [JsonPropertyName("parameters")]
    public Dictionary<string, string> Parameters { get; set; } = new();
}
