using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public sealed class QueueRecipeSearchIndexProcessor(
    RecipeDbContext db,
    IWorkflowOrchestrator orchestrator) : IWorkflowProcessor
{
    public string ProcessorName => "QueueRecipeSearchIndex";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        using var payload = JsonDocument.Parse(task.Payload ?? throw new ArgumentException("Task payload is empty."));
        var recipeId = payload.RootElement.GetProperty("recipeId").GetGuid();
        var recipe = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(r => r.Id == recipeId, ct);
        if (recipe is null || recipe.DeletedAt is not null)
            return new { Status = "Skipped", RecipeId = recipeId };
        if (!recipe.IsReady)
            throw new InvalidOperationException("Search indexing must be queued after recipe import is ready.");

        var instance = await orchestrator.TriggerAsync("index-recipe-search", new()
        {
            ["recipeId"] = recipeId.ToString(),
            ["fingerprint"] = SearchFingerprintService.ComputeSourceFingerprint(recipe)
        });
        return new { RecipeId = recipeId, WorkflowInstanceId = instance.Id };
    }
}
