using RecipeApi.Models;

namespace RecipeApi.Workflow;

public interface IWorkflowProcessor {
    string ProcessorName { get; }
    Task ExecuteAsync(WorkflowTask task, CancellationToken ct);
}
