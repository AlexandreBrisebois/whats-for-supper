using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>Returns live migration counts through the existing workflow-instance result surface.</summary>
public sealed class VegetarianClassificationStatusProcessor(RecipeDbContext db) : IWorkflowProcessor
{
    public string ProcessorName => "VegetarianClassificationStatus";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct) =>
        await VegetarianClassificationMetrics.FromDatabaseAsync(db, ct);
}
