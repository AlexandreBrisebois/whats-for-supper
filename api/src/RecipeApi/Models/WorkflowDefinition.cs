using YamlDotNet.Serialization;

namespace RecipeApi.Models;

public class WorkflowDefinition
{
    public string Name { get; set; } = string.Empty;
    public List<string> Parameters { get; set; } = new();
    public List<WorkflowTaskDefinition> Tasks { get; set; } = new();
}

public class WorkflowTaskDefinition
{
    public string Name { get; set; } = string.Empty;
    public string Processor { get; set; } = string.Empty;

    [YamlMember(Alias = "depends_on")]
    public List<string> DependsOn { get; set; } = new();

    public Dictionary<string, object> Payload { get; set; } = new();
}
