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

    internal static void ValidateOriginalHistory(string? payload, string? returned, WorkflowInstance? child)
    {
        using var input = JsonDocument.Parse(payload ?? "null");
        var recipeId = input.RootElement.GetProperty("recipeId").GetGuid();
        using var result = JsonDocument.Parse(returned ?? "null");
        var value = result.RootElement;
        if (value.ValueKind != JsonValueKind.Object || !value.TryGetProperty("recipeId", out var recipe)
            || recipe.GetGuid() != recipeId)
            throw new InvalidDataException("Search queue receipt differs from its original recipe.");
        if (child is null)
        {
            if (!value.TryGetProperty("status", out var status) || status.GetString() != "Skipped"
                || value.TryGetProperty("workflowInstanceId", out _))
                throw new InvalidDataException("Search queue has no original child command.");
            // No original recipe-state snapshot proves absence/deletion here.
            // The skipped message remains an observation, not state authority.
            return;
        }
        var parameters = JsonSerializer.Deserialize<Dictionary<string, string>>(child.Parameters!)!;
        if (child.WorkflowId != "index-recipe-search"
            || !parameters.TryGetValue("recipeId", out var originalRecipe) || !Guid.TryParse(originalRecipe, out var id) || id != recipeId
            || !parameters.TryGetValue("fingerprint", out var fingerprint) || string.IsNullOrWhiteSpace(fingerprint)
            || !value.TryGetProperty("workflowInstanceId", out var instance) || instance.GetGuid() != child.Id
            || value.TryGetProperty("status", out _))
            throw new InvalidDataException("Search queue receipt differs from its original child command.");
        // This preserves the original fingerprint selection. Its computation
        // requires original source facts; today's recipe cannot certify it.
    }

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        using var payload = JsonDocument.Parse(task.Payload ?? throw new ArgumentException("Task payload is empty."));
        var recipeId = payload.RootElement.GetProperty("recipeId").GetGuid();
        var original = await orchestrator.ResumeChildAsync(task, ct);
        if (original is not null)
            return new { RecipeId = recipeId, WorkflowInstanceId = original.Id };
        var recipe = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(r => r.Id == recipeId, ct);
        if (recipe is null || recipe.DeletedAt is not null)
            return new { Status = "Skipped", RecipeId = recipeId };
        if (!recipe.IsReady)
            throw new InvalidOperationException("Search indexing must be queued after recipe import is ready.");

        var instance = await orchestrator.TriggerChildAsync(task, "index-recipe-search", new()
        {
            ["recipeId"] = recipeId.ToString(),
            ["fingerprint"] = SearchFingerprintService.ComputeSourceFingerprint(recipe)
        }, ct: ct);
        return new { RecipeId = recipeId, WorkflowInstanceId = instance.Id };
    }
}
