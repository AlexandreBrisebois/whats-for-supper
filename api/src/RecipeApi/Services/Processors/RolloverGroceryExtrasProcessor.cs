using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public sealed class RolloverGroceryExtrasProcessor(
    GroceryExtraRolloverService rollover,
    ILogger<RolloverGroceryExtrasProcessor> logger) : IWorkflowProcessor
{
    public string ProcessorName => "RolloverGroceryExtras";

    public Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct) => ExecuteCoreAsync(ct);

    private async Task<object?> ExecuteCoreAsync(CancellationToken ct)
    {
        try
        {
            return await rollover.ReconcileCurrentAsync(ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Grocery-extra rollover failed; Dreaming will report the failed outcome.");
            return new GroceryExtraRolloverResult(0, default, false, ex.GetType().Name);
        }
    }
}
