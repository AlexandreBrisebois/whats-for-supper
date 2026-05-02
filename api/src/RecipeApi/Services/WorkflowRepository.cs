namespace RecipeApi.Services;

using System.IO;
using System.Text;
using System.Threading.Tasks;
using RecipeApi.Infrastructure;

/// <summary>
/// Repository for loading YAML workflow definitions.
/// Decouples the WorkflowOrchestrator from the file system.
/// </summary>
public class WorkflowRepository(IStorageProvider storage)
{
    private const string Partition = "workflows";

    public async Task<string> GetWorkflowYamlAsync(string workflowId)
    {
        var data = await storage.LoadAsync(Partition, $"{workflowId}.yaml");
        if (data == null)
        {
            throw new FileNotFoundException($"Workflow definition {workflowId}.yaml not found");
        }

        return Encoding.UTF8.GetString(data);
    }
}
