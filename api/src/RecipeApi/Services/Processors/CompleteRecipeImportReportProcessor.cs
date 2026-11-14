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
        var recipeId = ReadRecipeId(task.Payload);
        await reportService.MarkSucceededAsync(recipeId, task.InstanceId);
        return new { RecipeId = recipeId, WorkflowInstanceId = task.InstanceId };
    }

    private static Guid ReadRecipeId(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload))
            throw new ArgumentException("Task payload is empty.");

        using var document = JsonDocument.Parse(payload);
        if (!document.RootElement.TryGetProperty("recipeId", out var recipeIdProperty)
            && !document.RootElement.TryGetProperty("RecipeId", out recipeIdProperty))
        {
            throw new ArgumentException("Task payload does not contain recipeId.");
        }

        return recipeIdProperty.GetGuid();
    }

    internal static Guid ValidateOriginalHistory(string? payload, string? returned, Guid instanceId)
    {
        // Validate duplicate properties before interpreting the original strings.
        WorkflowProcessorHistory.ReadObservation<JsonElement>(payload ?? "null");
        var recipeId = ReadRecipeId(payload);
        var result = WorkflowProcessorHistory.ReadObservation<JsonElement>(returned ?? "null");
        if (recipeId == Guid.Empty || instanceId == Guid.Empty || result.ValueKind != JsonValueKind.Object
            || !result.TryGetProperty("recipeId", out var recipe) || recipe.ValueKind != JsonValueKind.String
            || !recipe.TryGetGuid(out var observedRecipe) || observedRecipe != recipeId
            || !result.TryGetProperty("workflowInstanceId", out var workflow) || workflow.ValueKind != JsonValueKind.String
            || !workflow.TryGetGuid(out var observedWorkflow) || observedWorkflow != instanceId)
            throw new InvalidDataException("Original report completion receipt differs from its invocation.");
        // MarkSucceededAsync is conditional and can update no report. These IDs
        // prove neither a transition nor historical membership/status/feedback.
        // Unknown result extensions remain retained, without qualification.
        return recipeId;
    }
}
