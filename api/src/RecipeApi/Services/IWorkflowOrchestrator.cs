using RecipeApi.Models;

namespace RecipeApi.Services;

public interface IWorkflowOrchestrator
{
    Task<WorkflowInstance> TriggerAsync(string workflowId, Dictionary<string, string> parameters);
    WorkflowDefinition GetDefinition(string workflowId);
}
