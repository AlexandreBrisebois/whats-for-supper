using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;

namespace RecipeApi.Services;

public class RecipeImportBulkService(RecipeDbContext db, IWorkflowOrchestrator orchestrator)
{
    public async Task<BulkImportTriggerResponseDto> TriggerAllPendingAsync()
    {
        var recipeIds = await db.Recipes
            .Where(r => r.Name == null)
            .Select(r => r.Id)
            .ToListAsync();

        var instanceIds = new List<Guid>();
        foreach (var id in recipeIds)
        {
            var instance = await orchestrator.TriggerAsync(
                "recipe-import",
                new Dictionary<string, string> { ["recipeId"] = id.ToString() });
            instanceIds.Add(instance.Id);
        }

        return new BulkImportTriggerResponseDto
        {
            QueuedCount = instanceIds.Count,
            InstanceIds = instanceIds
        };
    }
}
