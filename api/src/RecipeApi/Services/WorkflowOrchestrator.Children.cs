using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;

namespace RecipeApi.Services;

public partial class WorkflowOrchestrator
{
    private sealed record ChildRequest(int Version, Guid Id, Guid ParentId, Guid TaskId, string Processor,
        string Payload, string WorkflowId, Dictionary<string, string> Parameters, DateTimeOffset? ScheduledAt, Guid? ResetIntentId);
    private sealed record ChildTask(Guid Id, string Name, string Processor, string? Payload, string[] DependsOn,
        DateTimeOffset? ScheduledAt);
    private sealed record ChildPrepared(DateTimeOffset CreatedAt, string Capture, ChildTask[] Tasks);

    private static string ChildHash(string json) => Convert.ToHexString(SHA256.HashData(
        Encoding.UTF8.GetBytes(CanonicalRecipeContentStore.NormalizeJson(json))));

    public async Task<WorkflowInstance?> ResumeChildAsync(WorkflowTask parent, CancellationToken ct = default)
    {
        var selected = await _dbContext.WorkflowTasks.AsNoTracking().SingleOrDefaultAsync(x => x.TaskId == parent.TaskId, ct);
        if (selected?.ChildLaunchIntentId is null) return null;
        return await AcceptChildAsync(parent, selected.ChildLaunchIntentId.Value, ct);
    }

    public async Task<WorkflowInstance> TriggerChildAsync(WorkflowTask parent, string workflowId,
        Dictionary<string, string> parameters, DateTimeOffset? scheduledAt = null, CancellationToken ct = default)
    {
        WorkflowChildIntent intent;
        bool created;
        await using (var transaction = await _dbContext.Database.BeginTransactionAsync(ct))
        {
            var current = await LockChildParentAsync(parent, ct);
            created = current.ChildLaunchIntentId is null;
            if (created)
            {
                var id = Guid.NewGuid();
                var request = JsonSerializer.Serialize(new ChildRequest(1, id, parent.InstanceId, parent.TaskId,
                    parent.ProcessorName, CanonicalRecipeContentStore.NormalizeJson(parent.Payload), workflowId,
                    parameters, scheduledAt, current.ResetIntentId));
                intent = new WorkflowChildIntent
                {
                    Id = id,
                    ParentTaskId = parent.TaskId,
                    Request = request,
                    RequestHash = ChildHash(request),
                    CreatedAt = clock.UtcNow
                };
                _dbContext.WorkflowChildIntents.Add(intent);
                current.ChildLaunchIntentId = id;
                await _dbContext.SaveChangesAsync(ct);
            }
            else intent = await _dbContext.WorkflowChildIntents.SingleAsync(x => x.Id == current.ChildLaunchIntentId, ct);
            await transaction.CommitAsync(ct);
        }
        if (created)
        {
            // Persist inputs before fallible definition/capture. A crash or failure
            // here leaves an explicitly non-executable original command. Retry never
            // fills missing authority from today's files, clock or recipe content.
            var request = ReadChildRequest(intent, parent);
            var definition = await GetDefinitionAsync(request.WorkflowId);
            var instance = ConstructInstance(request.WorkflowId, definition, request.Parameters, clock.UtcNow, request.ScheduledAt);
            instance.Id = intent.Id;
            foreach (var task in instance.Tasks) task.InstanceId = instance.Id;
            await publications.CaptureLaunchAsync(instance, ct);
            var prepared = JsonSerializer.Serialize(new ChildPrepared(instance.CreatedAt, instance.RecipePublicationCapture!,
                instance.Tasks.Select(x => new ChildTask(x.TaskId, x.TaskName, x.ProcessorName, x.Payload, x.DependsOn, x.ScheduledAt)).ToArray()));
            await using var transaction = await _dbContext.Database.BeginTransactionAsync(ct);
            var current = await LockChildParentAsync(parent, ct);
            if (current.ChildLaunchIntentId != intent.Id) throw new InvalidDataException("Child occurrence changed during original capture.");
            intent.Prepared = prepared;
            intent.PreparedHash = ChildHash(prepared);
            await _dbContext.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        return await AcceptChildAsync(parent, intent.Id, ct);
    }

    private async Task<WorkflowTask> LockChildParentAsync(WorkflowTask parent, CancellationToken ct)
    {
        if (parent.TaskId == Guid.Empty || parent.InstanceId == Guid.Empty
            || parent.ProcessorName is not ("StartWorkflow" or "QueueRecipeSearchIndex"))
            throw new InvalidDataException("Child acceptance requires a saved dispatch task.");
        if (_dbContext.Database.IsNpgsql())
            await _dbContext.Database.ExecuteSqlAsync($"SELECT task_id FROM workflow_tasks WHERE task_id = {parent.TaskId} FOR UPDATE", ct);
        var instance = await _dbContext.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
            .SingleOrDefaultAsync(x => x.Id == parent.InstanceId, ct)
            ?? throw new InvalidDataException("Child parent is missing.");
        RecipeFilePublicationStore.ValidateExecutionLaunch(instance);
        var snapshot = instance.Tasks.SingleOrDefault(x => x.TaskId == parent.TaskId);
        if (snapshot is null || snapshot.ProcessorName != parent.ProcessorName
            || CanonicalRecipeContentStore.NormalizeJson(snapshot.Payload) != CanonicalRecipeContentStore.NormalizeJson(parent.Payload)
            || instance.Status == WorkflowStatus.Paused
            || snapshot.Status is not (Models.TaskStatus.Processing or Models.TaskStatus.Pending))
            throw new InvalidDataException("Child parent no longer has dispatch authority.");
        var current = await _dbContext.WorkflowTasks.SingleAsync(x => x.TaskId == parent.TaskId, ct);
        await _dbContext.Entry(current).ReloadAsync(ct);
        return current;
    }

    private static ChildRequest ReadChildRequest(WorkflowChildIntent intent, WorkflowTask parent)
    {
        var request = JsonSerializer.Deserialize<ChildRequest>(intent.Request)
            ?? throw new InvalidDataException("Original child request is missing.");
        if (intent.RequestHash != ChildHash(intent.Request) || request.Version != 1 || request.Id != intent.Id
            || intent.ParentTaskId != parent.TaskId || request.TaskId != parent.TaskId || request.ParentId != parent.InstanceId
            || request.Processor != parent.ProcessorName || request.Payload != CanonicalRecipeContentStore.NormalizeJson(parent.Payload)
            || string.IsNullOrWhiteSpace(request.WorkflowId) || request.Parameters is null)
            throw new InvalidDataException("Original child request differs from its parent.");
        return request;
    }

    private static WorkflowInstance InitializeChild(WorkflowChildIntent intent, ChildRequest request)
    {
        if (intent.Prepared is null || intent.PreparedHash != ChildHash(intent.Prepared))
            throw new InvalidDataException("Original child command has no executable capture.");
        var prepared = JsonSerializer.Deserialize<ChildPrepared>(intent.Prepared)
            ?? throw new InvalidDataException("Original child capture is missing.");
        if (prepared.Tasks is null || prepared.Tasks.Length == 0) throw new InvalidDataException("Original child tasks are missing.");
        var child = new WorkflowInstance
        {
            Id = intent.Id,
            WorkflowId = request.WorkflowId,
            Parameters = JsonSerializer.Serialize(request.Parameters),
            Status = WorkflowStatus.Pending,
            RecipePublicationCapture = prepared.Capture,
            CreatedAt = prepared.CreatedAt,
            UpdatedAt = prepared.CreatedAt,
            Tasks = prepared.Tasks.Select(x => new WorkflowTask
            {
                TaskId = x.Id,
                InstanceId = intent.Id,
                TaskName = x.Name,
                ProcessorName = x.Processor,
                Payload = x.Payload,
                DependsOn = x.DependsOn,
                ScheduledAt = x.ScheduledAt,
                Status = x.DependsOn.Length == 0 ? Models.TaskStatus.Pending : Models.TaskStatus.Waiting,
                CreatedAt = prepared.CreatedAt,
                UpdatedAt = prepared.CreatedAt
            }).ToList()
        };
        RecipeFilePublicationStore.ValidateExecutionLaunch(child);
        return child;
    }

    private static void ValidateChild(WorkflowInstance original, WorkflowInstance actual)
    {
        RecipeFilePublicationStore.ValidateExecutionLaunch(actual);
        if (original.Id != actual.Id || original.WorkflowId != actual.WorkflowId
            || CanonicalRecipeContentStore.NormalizeJson(original.Parameters) != CanonicalRecipeContentStore.NormalizeJson(actual.Parameters)
            || CanonicalRecipeContentStore.NormalizeJson(original.RecipePublicationCapture) != CanonicalRecipeContentStore.NormalizeJson(actual.RecipePublicationCapture))
            throw new InvalidDataException("Accepted child differs from its retained original command.");
    }

    private async Task<WorkflowInstance> AcceptChildAsync(WorkflowTask parent, Guid intentId, CancellationToken ct)
    {
        var acceptanceAttempted = false;
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(ct);
        try
        {
            var current = await LockChildParentAsync(parent, ct);
            if (current.ChildLaunchIntentId != intentId) throw new InvalidDataException("Child occurrence is no longer selected.");
            var intent = await _dbContext.WorkflowChildIntents.SingleAsync(x => x.Id == intentId, ct);
            await _dbContext.Entry(intent).ReloadAsync(ct);
            var request = ReadChildRequest(intent, parent);
            var original = InitializeChild(intent, request);
            var actual = await _dbContext.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleOrDefaultAsync(x => x.Id == intentId, ct);
            if (actual is not null)
            {
                ValidateChild(original, actual);
                if (intent.AcceptedAt is null) throw new InvalidDataException("Child exists without its acceptance receipt.");
                await transaction.CommitAsync(ct);
                return original;
            }
            if (intent.AcceptedAt is not null) throw new InvalidDataException("Accepted child history is missing; no replacement is authorized.");
            _dbContext.WorkflowInstances.Add(original);
            intent.AcceptedAt = clock.UtcNow;
            acceptanceAttempted = true;
            await _dbContext.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return original;
        }
        catch
        {
            try { await transaction.RollbackAsync(CancellationToken.None); } catch { /* Outcome is reconciled below. */ }
            if (!acceptanceAttempted) throw;
            // No compensation deletion: the child and receipt may have committed.
            // Detach attempted rows before any unrelated save can resurrect them.
            foreach (var entry in _dbContext.ChangeTracker.Entries<WorkflowTask>().Where(x => x.Entity.InstanceId == intentId).ToArray())
                entry.State = EntityState.Detached;
            foreach (var entry in _dbContext.ChangeTracker.Entries<WorkflowInstance>().Where(x => x.Entity.Id == intentId).ToArray())
                entry.State = EntityState.Detached;
            await transaction.DisposeAsync();
            var accepted = await _dbContext.WorkflowChildIntents.AsNoTracking().SingleOrDefaultAsync(x => x.Id == intentId, ct);
            var selected = await _dbContext.WorkflowTasks.AsNoTracking().SingleOrDefaultAsync(x => x.TaskId == parent.TaskId, ct);
            var actual = await _dbContext.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleOrDefaultAsync(x => x.Id == intentId, ct);
            if (accepted?.AcceptedAt is not null && selected?.ChildLaunchIntentId == intentId && actual is not null)
            {
                var original = InitializeChild(accepted, ReadChildRequest(accepted, parent));
                ValidateChild(original, actual);
                return original;
            }
            foreach (var entry in _dbContext.ChangeTracker.Entries<WorkflowChildIntent>().Where(x => x.Entity.Id == intentId).ToArray())
                await entry.ReloadAsync(ct);
            throw;
        }
    }
}
