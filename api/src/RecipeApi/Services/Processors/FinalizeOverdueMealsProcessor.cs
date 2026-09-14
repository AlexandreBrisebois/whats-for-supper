using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public class FinalizeOverdueMealsProcessor(ScheduleService scheduleService) : IWorkflowProcessor
{
    public string ProcessorName => "FinalizeOverdueMeals";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        await scheduleService.FinalizeOverdueMealsAsync(ct);
        return null;
    }
}
