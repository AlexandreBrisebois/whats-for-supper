using RecipeApi.Models;

namespace RecipeApi.Services;

public interface IWorkflowOrchestrator
{
    Task<WorkflowInstance> TriggerAsync(
        string workflowId,
        Dictionary<string, string> parameters,
        DateTimeOffset? scheduledAt = null);

    Task<WorkflowInstance?> ResumeChildAsync(WorkflowTask parent, CancellationToken ct = default)
        => Task.FromResult<WorkflowInstance?>(null);

    Task<WorkflowInstance> TriggerChildAsync(WorkflowTask parent, string workflowId,
        Dictionary<string, string> parameters, DateTimeOffset? scheduledAt = null, CancellationToken ct = default)
        => throw new NotSupportedException("Durable child acceptance is unavailable.");

    Task<WorkflowInstance> TriggerImportAsync(Guid instanceId, Guid recipeId,
        string workflowId, Dictionary<string, string> parameters);

    Task<int> ReconcileLaunchesAsync(CancellationToken ct = default) => Task.FromResult(0);

    Task<WorkflowInstance> PrepareReportAsync(Guid instanceId, string workflowId, Dictionary<string, string> parameters)
        => throw new NotSupportedException("Original repair capture is unavailable.");

    Task<WorkflowInstance> TriggerReportAsync(Guid instanceId, Guid recipeId,
        string workflowId, Dictionary<string, string> parameters);

    Task<WorkflowInstance?> InitializeUrlCaptureAsync(Guid instanceId, CancellationToken ct = default);

    Task<WorkflowInstance?> InitializeRecipeFollowupAsync(Guid instanceId, CancellationToken ct = default);

    Task<WorkflowDefinition> GetDefinitionAsync(string workflowId);
}
