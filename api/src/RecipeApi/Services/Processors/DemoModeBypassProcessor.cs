using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public class DemoModeBypassProcessor(string processorName, DemoModeOptions demoMode) : IWorkflowProcessor
{
    public string ProcessorName => processorName;

    public Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (!demoMode.Enabled)
        {
            throw new InvalidOperationException($"{ProcessorName} demo bypass processor was invoked while Demo Mode is disabled.");
        }

        return Task.FromResult<object?>(new
        {
            Message = "Demo Mode Bypass",
            ProcessorName
        });
    }
}
