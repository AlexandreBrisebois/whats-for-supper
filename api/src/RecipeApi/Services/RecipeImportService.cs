using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class RecipeImportService(RecipeDbContext db, IWorkflowOrchestrator orchestrator)
{
    public async Task<Guid> TriggerImport(Guid recipeId)
    {
        var recipe = await db.Recipes.FindAsync(recipeId)
            ?? throw new KeyNotFoundException($"Recipe {recipeId} not found.");

        string workflowId;
        var parameters = new Dictionary<string, string> { ["recipeId"] = recipeId.ToString() };

        if (!string.IsNullOrEmpty(recipe.SourceUrl))
        {
            workflowId = "url-import";
            parameters["url"] = recipe.SourceUrl;
        }
        else if (recipe.ImageCount > 0)
        {
            workflowId = "recipe-import";
        }
        else
        {
            // Synthesized recipes cannot be reimported
            throw new InvalidOperationException("Synthesized recipes cannot be reimported.");
        }

        var instance = await orchestrator.TriggerAsync(workflowId, parameters);
        return instance.Id;
    }

    public async Task<RecipeImportStatusResponseDto?> GetImportStatus(Guid recipeId)
    {
        var idString = recipeId.ToString();
        // Simple string matching for now, as Parameters is stored as serialized JSON string in the model
        var instance = await db.WorkflowInstances
            .Where(i => i.WorkflowId == "recipe-import" && i.Parameters != null && i.Parameters.Contains(idString))
            .OrderByDescending(i => i.CreatedAt)
            .Include(i => i.Tasks)
            .FirstOrDefaultAsync();

        if (instance == null) return null;

        var failedTask = instance.Tasks.FirstOrDefault(t => t.Status == Models.TaskStatus.Failed);

        return new RecipeImportStatusResponseDto
        {
            Status = instance.Status.ToString(),
            ErrorMessage = failedTask?.ErrorMessage
        };
    }

    public async Task<RecipeImportSummaryDto> GetImportSummary()
    {
        var statuses = await db.WorkflowInstances
            .Where(i => i.WorkflowId == "recipe-import")
            .GroupBy(i => i.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        return new RecipeImportSummaryDto
        {
            ImportedCount = statuses.Where(s => s.Status == WorkflowStatus.Completed).Sum(s => s.Count),
            QueueCount = statuses.Where(s => s.Status == WorkflowStatus.Pending || s.Status == WorkflowStatus.Processing).Sum(s => s.Count),
            FailedCount = statuses.Where(s => s.Status == WorkflowStatus.Failed).Sum(s => s.Count)
        };
    }
}
