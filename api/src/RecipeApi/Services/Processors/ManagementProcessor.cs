using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public class ManagementProcessor(ManagementService managementService, string processorName) : IWorkflowProcessor
{
    public string ProcessorName => processorName;

    public async Task ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        switch (ProcessorName)
        {
            case "BackupDatabase":
                await managementService.BackupAsync();
                break;
            case "RestoreDatabase":
                await managementService.RestoreAsync(ct);
                break;
            case "DisasterRecovery":
                await managementService.DisasterRecoveryAsync();
                break;
            default:
                throw new NotSupportedException($"Processor {ProcessorName} is not supported by ManagementProcessor.");
        }
    }
}
