using RecipeApi.Models;

namespace RecipeApi.Workflow;

public interface IWorkflowProcessor
{
    string ProcessorName { get; }
    Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct);
}
