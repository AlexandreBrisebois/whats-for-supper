using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

internal static class UrlCaptureInitialization
{
    public const string TaskName = "initialize_url_import";
    private const string ProcessorName = "UrlCaptureInitialization";

    public static WorkflowInstance Create(Guid recipeId, string url, DateTimeOffset now)
    {
        var instance = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "url-import",
            Status = WorkflowStatus.Paused,
            Parameters = JsonSerializer.Serialize(new Dictionary<string, string>
            {
                ["recipeId"] = recipeId.ToString(),
                ["url"] = url
            }),
            CreatedAt = now,
            UpdatedAt = now
        };
        instance.Tasks.Add(new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            TaskName = TaskName,
            ProcessorName = ProcessorName,
            Status = Models.TaskStatus.Failed,
            CreatedAt = now,
            UpdatedAt = now
        });
        return instance;
    }

    public static bool IsPending(WorkflowInstance instance) =>
        instance.WorkflowId == "url-import" && instance.Status == WorkflowStatus.Paused
        && instance.Tasks.Count == 1 && instance.Tasks.Any(t =>
            t.TaskName == TaskName && t.ProcessorName == ProcessorName && t.Status == Models.TaskStatus.Failed);

    public static async Task<WorkflowInstance?> LoadLockedAsync(RecipeDbContext db, Guid id, CancellationToken ct)
    {
        // Reread after acquiring the database lock, including after an uncertain prior commit.
        foreach (var entry in db.ChangeTracker.Entries<WorkflowTask>().Where(e => e.Entity.InstanceId == id).ToList())
            entry.State = EntityState.Detached;
        foreach (var entry in db.ChangeTracker.Entries<WorkflowInstance>().Where(e => e.Entity.Id == id).ToList())
            entry.State = EntityState.Detached;

        var query = db.Database.IsNpgsql()
            ? db.WorkflowInstances.FromSql($"SELECT * FROM workflow_instances WHERE id = {id} FOR UPDATE")
            : db.WorkflowInstances.AsQueryable();
        var instance = await query.SingleOrDefaultAsync(i => i.Id == id, ct);
        if (instance is not null) await db.Entry(instance).Collection(i => i.Tasks).LoadAsync(ct);
        return instance;
    }
}
