using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

// Captures observed history only. A retirement never supplies execution authority
// or fills missing historical input from current recipe/files/definitions.
internal static class WorkflowLifecycle
{
    public static async Task ReloadAttemptAsync(RecipeDbContext db, Guid workflowId, Guid? commandId = null, Guid? recipeId = null)
    {
        // A confirmed rollback must not leave Deleted/Added entries that a later
        // unrelated save can reapply. A lost commit acknowledgement is read back;
        // no compensation deletion of committed history or commands is permitted.
        var entries = db.ChangeTracker.Entries().Where(entry => entry.Entity switch
        {
            WorkflowInstance value => value.Id == workflowId,
            WorkflowTask value => value.InstanceId == workflowId,
            WorkflowLifecycleRecord value => value.Id == workflowId,
            MaintenanceCommand value => value.Id == commandId,
            Recipe value => value.Id == recipeId,
            _ => recipeId is not null && entry.Metadata.FindProperty("RecipeId") is not null
                && Equals(entry.Property("RecipeId").CurrentValue, recipeId)
        }).ToArray();
        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added) entry.State = EntityState.Detached;
            else await entry.ReloadAsync(CancellationToken.None);
        }
    }

    public static async Task LockIdentityAsync(RecipeDbContext db, Guid id, CancellationToken ct = default)
    {
        if (db.Database.IsNpgsql())
            await db.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock(hashtextextended({"workflow-lifecycle:" + id.ToString("D")}, 0))", ct);
    }

    public static async Task RequireActiveIdentityAsync(RecipeDbContext db, Guid id, CancellationToken ct = default)
    {
        if (await db.WorkflowLifecycleRecords.AsNoTracking().AnyAsync(x => x.Id == id, ct))
            throw new InvalidDataException("Retired workflow identity is retained as nonexecuting history.");
    }

    public static async Task<WorkflowInstance?> LoadLockedAsync(RecipeDbContext db, Guid id, CancellationToken ct)
    {
        await LockIdentityAsync(db, id, ct);
        var instance = await UrlCaptureInitialization.LoadLockedAsync(db, id, ct);
        if (instance is null) return null;
        // Child reservation/reset locks the task, not just the parent workflow.
        // Read all task facts again after those competing writes have drained.
        if (db.Database.IsNpgsql())
            await db.Database.ExecuteSqlAsync($"SELECT task_id FROM workflow_tasks WHERE instance_id = {id} ORDER BY task_id FOR UPDATE", ct);
        foreach (var entry in db.ChangeTracker.Entries<WorkflowTask>().Where(x => x.Entity.InstanceId == id).ToArray())
            entry.State = EntityState.Detached;
        instance.Tasks = await db.WorkflowTasks.Where(x => x.InstanceId == id).OrderBy(x => x.TaskId).ToListAsync(ct);
        return instance;
    }

    // Enlist in the caller's transaction. Snapshot and row removal must commit together.
    public static async Task RetainAsync(RecipeDbContext db, WorkflowInstance instance, string disposition,
        Guid operationId, DateTimeOffset now, CancellationToken ct, MaintenanceCommand? maintenanceCommand = null)
    {
        if (disposition is not ("cleared" or "pruned") || operationId == Guid.Empty)
            throw new ArgumentException("A retirement requires an explicit disposition and operation.");
        await RequireActiveIdentityAsync(db, instance.Id, ct);
        var taskIds = instance.Tasks.Select(x => x.TaskId).ToArray();
        var childCommands = await db.WorkflowChildIntents.AsNoTracking().Where(x => taskIds.Contains(x.ParentTaskId)).OrderBy(x => x.Id).ToArrayAsync(ct);
        var resetCommands = await db.WorkflowResetIntents.AsNoTracking().Where(x => taskIds.Contains(x.TaskId)).OrderBy(x => x.Id).ToArrayAsync(ct);
        var processorAttempts = await db.WorkflowProcessorAttempts.AsNoTracking().Where(x => x.InstanceId == instance.Id)
            .OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).ToArrayAsync(ct);
        var repairCommands = await db.RecipeRepairIntents.AsNoTracking().Where(x => x.Id == instance.Id).ToArrayAsync(ct);
        var publications = await db.RecipeFilePublications.AsNoTracking().Where(x => taskIds.Contains(x.OperationId) || x.OperationId == instance.Id)
            .OrderBy(x => x.RecipeId).ThenBy(x => x.OperationId).ToArrayAsync(ct);
        var canonicalOperations = await db.CanonicalRecipeOperations.AsNoTracking().Where(x => taskIds.Contains(x.OperationId) || x.OperationId == instance.Id)
            .OrderBy(x => x.RecipeId).ThenBy(x => x.OperationId).ToArrayAsync(ct);
        var reports = await db.RecipeImportReports.AsNoTracking().Where(x => x.LastWorkflowInstanceId == instance.Id || x.RepairIntentId == instance.Id)
            .Select(x => new { x.RecipeId, x.LastWorkflowInstanceId, x.RepairIntentId }).OrderBy(x => x.RecipeId).ToArrayAsync(ct);
        var payload = JsonSerializer.Serialize(new
        {
            version = 1,
            executionDisposition = "inert",
            workflow = new
            {
                instance.Id,
                instance.WorkflowId,
                instance.Status,
                instance.Parameters,
                instance.RecipePublicationCapture,
                instance.CreatedAt,
                instance.UpdatedAt,
                tasks = instance.Tasks.OrderBy(x => x.TaskId).Select(x => new
                {
                    x.TaskId,
                    x.InstanceId,
                    x.TaskName,
                    x.ProcessorName,
                    x.Payload,
                    x.Status,
                    x.DependsOn,
                    x.RetryCount,
                    x.ScheduledAt,
                    x.ErrorMessage,
                    x.StackTrace,
                    x.ChildLaunchIntentId,
                    x.ResetIntentId,
                    x.Result,
                    x.CreatedAt,
                    x.UpdatedAt
                }).ToArray()
            },
            childCommands,
            resetCommands,
            processorAttempts,
            repairCommands,
            publications,
            canonicalOperations,
            reports,
            maintenanceCommand
        }, JsonDefaults.CamelCase);
        db.WorkflowLifecycleRecords.Add(new WorkflowLifecycleRecord
        {
            Id = instance.Id,
            OperationId = operationId,
            Disposition = disposition,
            Payload = payload,
            PayloadHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(CanonicalRecipeContentStore.NormalizeJson(payload)))),
            CreatedAt = now
        });
    }
}
