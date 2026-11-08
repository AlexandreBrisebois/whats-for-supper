using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class RecipeImportService(
    RecipeDbContext db,
    IWorkflowOrchestrator orchestrator)
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

        // Reserve before the fallible commit so a lost acknowledgement can be
        // reconciled from the actual accepted aggregate, without launching again.
        var instanceId = Guid.NewGuid();
        try
        {
            var instance = await orchestrator.TriggerImportAsync(instanceId, recipeId, workflowId, parameters);
            return instance.Id;
        }
        catch
        {
            var committed = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
                .SingleOrDefaultAsync(x => x.Id == instanceId);
            if (committed is not null)
            {
                if (committed.WorkflowId != workflowId
                    || CanonicalRecipeContentStore.NormalizeJson(committed.Parameters)
                        != CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(parameters)))
                    throw new InvalidDataException("Import acceptance differs from the original command.");
                RecipeFilePublicationStore.ValidateExecutionLaunch(committed);
                if (await db.WorkflowLaunchIntents.AsNoTracking().AnyAsync(x => x.Id == instanceId))
                {
                    // Reuse the original acceptance owner to check its independent
                    // command/capture/receipt. A valid task graph alone cannot
                    // override missing or divergent retained launch authority.
                    return (await orchestrator.TriggerImportAsync(instanceId, recipeId, workflowId, parameters)).Id;
                }
                // Report state may already have independently advanced. Accepted
                // work remains accepted; reconciliation never rewrites its report.
                return instanceId;
            }

            // A confirmed rollback must not leave tracked attempted rows that a
            // subsequent save could accidentally publish outside acceptance.
            foreach (var entry in db.ChangeTracker.Entries<WorkflowTask>().Where(x => x.Entity.InstanceId == instanceId).ToList())
                entry.State = EntityState.Detached;
            foreach (var entry in db.ChangeTracker.Entries<WorkflowInstance>().Where(x => x.Entity.Id == instanceId).ToList())
                entry.State = EntityState.Detached;
            foreach (var entry in db.ChangeTracker.Entries<RecipeImportReport>().Where(x => x.Entity.RecipeId == recipeId).ToList())
                await entry.ReloadAsync();
            throw;
        }
    }

    public async Task<RecipeImportStatusResponseDto?> GetImportStatus(Guid recipeId)
    {
        var idString = recipeId.ToString();
        // Simple string matching for now, as Parameters is stored as serialized JSON string in the model.
        // PostgreSQL cannot use LIKE (~~) on jsonb columns without a cast.
        IQueryable<WorkflowInstance> query;
        if (db.Database.IsRelational())
        {
            query = db.WorkflowInstances
                .FromSql($"SELECT * FROM workflow_instances WHERE workflow_id IN ('recipe-import', 'url-import') AND parameters::text LIKE {"%" + idString + "%"}");
        }
        else
        {
            query = db.WorkflowInstances
                .Where(i =>
                    (i.WorkflowId == "recipe-import" || i.WorkflowId == "url-import")
                    && i.Parameters != null
                    && i.Parameters.Contains(idString));
        }

        var instance = await query
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

    public async Task<WorkflowInstanceDetailDto?> GetImportByIdAsync(Guid importId, Guid familyMemberId)
    {
        if (!await db.FamilyMembers.AnyAsync(member => member.Id == familyMemberId))
            throw new KeyNotFoundException($"Family member {familyMemberId} not found.");

        var instance = await db.WorkflowInstances
            .Include(entry => entry.Tasks)
            .SingleOrDefaultAsync(entry => entry.Id == importId);
        if (instance is null) return null;

        var parameters = instance.Parameters is null
            ? null
            : JsonSerializer.Deserialize<Dictionary<string, string>>(instance.Parameters);
        if (parameters is null
            || !parameters.TryGetValue("recipeId", out var recipeIdText)
            || !Guid.TryParse(recipeIdText, out var recipeId)
            || !await db.Recipes.AnyAsync(recipe => recipe.Id == recipeId && recipe.AddedBy == familyMemberId))
            return null;

        return WorkflowInstanceDetailDto.FromModel(instance);
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
