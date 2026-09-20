using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public class MaterializeRecipeSearchFiltersProcessor(RecipeSearchFilterMaterializer materializer) : IWorkflowProcessor
{
    public string ProcessorName => "MaterializeRecipeSearchFilters";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        var snapshot = await materializer.MaterializeAsync(ct);
        return new
        {
            snapshot.GeneratedAt,
            cuisineCount = snapshot.AllCuisines.Count,
            promotedCuisineCount = snapshot.PromotedCuisines.Count
        };
    }
}
