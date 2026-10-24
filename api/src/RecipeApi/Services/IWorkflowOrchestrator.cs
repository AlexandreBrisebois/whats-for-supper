using RecipeApi.Models;

namespace RecipeApi.Services;

public interface IWorkflowOrchestrator
{
    Task<WorkflowInstance> TriggerAsync(
        string workflowId,
        Dictionary<string, string> parameters,
        DateTimeOffset? scheduledAt = null);

    Task<WorkflowInstance?> InitializeUrlCaptureAsync(Guid instanceId, CancellationToken ct = default);

    Task<WorkflowDefinition> GetDefinitionAsync(string workflowId);
}
