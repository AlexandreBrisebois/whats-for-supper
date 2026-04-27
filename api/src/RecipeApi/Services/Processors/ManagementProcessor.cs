using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public class ManagementProcessor(ManagementService managementService, string processorName) : IWorkflowProcessor
{
    public string ProcessorName => processorName;

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        return ProcessorName switch
        {
            "BackupDatabase" => await managementService.BackupAsync(),
            "RestoreDatabase" => await managementService.RestoreAsync(ct),
            "DisasterRecovery" => await managementService.DisasterRecoveryAsync(),
            _ => throw new NotSupportedException($"Processor {ProcessorName} is not supported by ManagementProcessor.")
        };
    }
}
