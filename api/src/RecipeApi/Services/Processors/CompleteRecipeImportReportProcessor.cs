using System.Text.Json;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public class CompleteRecipeImportReportProcessor(RecipeImportReportService reportService)
    : IWorkflowProcessor
{
    public string ProcessorName => "CompleteRecipeImportReport";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(task.Payload))
            throw new ArgumentException("Task payload is empty.");

        using var document = JsonDocument.Parse(task.Payload);
        if (!document.RootElement.TryGetProperty("recipeId", out var recipeIdProperty)
            && !document.RootElement.TryGetProperty("RecipeId", out recipeIdProperty))
        {
            throw new ArgumentException("Task payload does not contain recipeId.");
        }

        var recipeId = recipeIdProperty.GetGuid();
        await reportService.MarkSucceededAsync(recipeId, task.InstanceId);
        return new { RecipeId = recipeId, WorkflowInstanceId = task.InstanceId };
    }
}
