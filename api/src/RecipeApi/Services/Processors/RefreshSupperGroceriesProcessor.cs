using System.Text.Json;
using RecipeApi.Models;
using RecipeApi.Workflow;
namespace RecipeApi.Services.Processors;

public sealed class RefreshSupperGroceriesProcessor(GroceryRecomputeService groceries, SupperProjectionInvalidation invalidation) : IWorkflowProcessor
{
    public string ProcessorName => "RefreshSupperGroceries";
    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        var monday = DateOnly.Parse(JsonDocument.Parse(task.Payload!).RootElement.GetProperty("weekStartDate").GetString()!);
        try { await groceries.RecomputeForWeekAsync(monday, ct); }
        catch
        {
            // Failure cannot roll back saved counts. A fresh read exposes the durable retry obligation.
            await invalidation.MarkFailedAsync(monday, task.InstanceId, CancellationToken.None);
            throw;
        }
        return null;
    }
}
