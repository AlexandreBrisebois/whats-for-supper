using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

// The caller owns execution coordination across recording and application. A
// reset receipt establishes reset application only, never processor completion.
internal static class WorkflowReset
{
    private static readonly JsonSerializerOptions Json = new()
    {
        RespectRequiredConstructorParameters = true,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
    };
    private sealed record TaskBefore(Guid TaskId, Guid InstanceId, string TaskName, string ProcessorName,
        string? Payload, Models.TaskStatus Status, string[] DependsOn, int RetryCount,
        DateTimeOffset? ScheduledAt, string? ErrorMessage, string? StackTrace, string? Result,
        Guid? ChildLaunchIntentId, Guid? ResetIntentId, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
    private sealed record Request(int Version, Guid Id, Guid TaskId, Guid InstanceId, string WorkflowId,
        string? Parameters, string? Capture, WorkflowStatus ParentStatus, TaskBefore Before,
        Guid? RecoveryOperationId, DateTimeOffset ScheduledAt);

    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(
        Encoding.UTF8.GetBytes(CanonicalRecipeContentStore.NormalizeJson(value))));
    private static TaskBefore Observe(WorkflowTask task) => new(task.TaskId, task.InstanceId, task.TaskName,
        task.ProcessorName, task.Payload, task.Status, task.DependsOn, task.RetryCount, task.ScheduledAt,
        task.ErrorMessage, task.StackTrace, task.Result, task.ChildLaunchIntentId, task.ResetIntentId, task.CreatedAt, task.UpdatedAt);
    private static Task<Guid?> RecoveryAsync(RecipeDbContext db, CancellationToken ct) => db.RecoveryPublications.AsNoTracking()
        .Where(x => x.Id == 1).Select(x => (Guid?)x.OperationId).SingleOrDefaultAsync(ct);

    // Enlisted in the controller's locked transaction; the original commits
    // separately before task mutation. An unresolved generation is never replaced.
    public static async Task<Guid> RecordAsync(RecipeDbContext db, WorkflowTask task, WorkflowInstance instance,
        DateTimeOffset now, CancellationToken ct)
    {
        await WorkflowLifecycle.RequireActiveIdentityAsync(db, instance.Id, ct);
        var pending = await db.Set<WorkflowResetIntent>().AsNoTracking()
            .Where(x => x.TaskId == task.TaskId && x.AppliedAt == null).OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).FirstOrDefaultAsync(ct);
        if (pending is not null) return pending.Id;
        var id = Guid.NewGuid();
        var request = JsonSerializer.Serialize(new Request(1, id, task.TaskId, task.InstanceId, instance.WorkflowId,
            instance.Parameters, instance.RecipePublicationCapture, instance.Status, Observe(task), await RecoveryAsync(db, ct), now));
        db.Set<WorkflowResetIntent>().Add(new()
        {
            Id = id,
            TaskId = task.TaskId,
            InstanceId = task.InstanceId,
            Request = request,
            RequestHash = Hash(request),
            CreatedAt = now
        });
        return id;
    }

    private static Request Read(WorkflowResetIntent intent)
    {
        var request = WorkflowProcessorHistory.ReadObservation<Request>(intent.Request, Json);
        if (request.Version != 1 || request.Id == Guid.Empty || request.Id != intent.Id || request.TaskId != intent.TaskId
            || request.InstanceId != intent.InstanceId || request.Before is null || request.Before.TaskId != intent.TaskId
            || request.Before.InstanceId != intent.InstanceId || request.Before.DependsOn is null
            || intent.RequestHash != Hash(intent.Request))
            throw new InvalidDataException("Original reset generation is inconsistent.");
        return request;
    }

    // Execution lease must already be held. Lifecycle identity precedes row locks,
    // matching retirement; no transaction spans a processor or definition read.
    public static async Task ApplyAsync(RecipeDbContext db, Guid id, IClock clock, CancellationToken ct)
    {
        var observed = await db.Set<WorkflowResetIntent>().AsNoTracking().SingleAsync(x => x.Id == id, ct);
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        try
        {
            await WorkflowLifecycle.LockIdentityAsync(db, observed.InstanceId, ct);
            await WorkflowLifecycle.RequireActiveIdentityAsync(db, observed.InstanceId, ct);
            if (db.Database.IsNpgsql())
                await db.Database.ExecuteSqlAsync($"SELECT task_id FROM workflow_tasks WHERE task_id = {observed.TaskId} FOR UPDATE", ct);
            var intent = await db.Set<WorkflowResetIntent>().SingleAsync(x => x.Id == id, ct);
            await db.Entry(intent).ReloadAsync(ct);
            var request = Read(intent);
            var task = await db.WorkflowTasks.SingleOrDefaultAsync(x => x.TaskId == intent.TaskId, ct)
                ?? throw new InvalidDataException("Reset task is missing; replacement is not authorized.");
            await db.Entry(task).ReloadAsync(ct);
            var parent = await db.WorkflowInstances.SingleOrDefaultAsync(x => x.Id == intent.InstanceId, ct)
                ?? throw new InvalidDataException("Reset parent is missing.");
            await db.Entry(parent).ReloadAsync(ct);
            if (intent.AppliedAt is not null)
            {
                // Later generations or processor changes are independent. Never
                // replay an applied reset over them or require Pending forever.
                if (transaction is not null) await transaction.CommitAsync(ct);
                return;
            }
            if (request.RecoveryOperationId != await RecoveryAsync(db, ct)
                || request.WorkflowId != parent.WorkflowId || request.Parameters != parent.Parameters
                || request.Capture != parent.RecipePublicationCapture || request.ParentStatus != parent.Status
                || Hash(JsonSerializer.Serialize(request.Before)) != Hash(JsonSerializer.Serialize(Observe(task))))
                throw new InvalidDataException("Pending reset differs from its captured original generation.");
            if (task.Status is Models.TaskStatus.Completed or Models.TaskStatus.Failed) task.ChildLaunchIntentId = null;
            task.ResetIntentId = id;
            task.Status = Models.TaskStatus.Pending;
            task.RetryCount = 0;
            task.ScheduledAt = request.ScheduledAt;
            task.ErrorMessage = null;
            task.StackTrace = null;
            if (parent.Status == WorkflowStatus.Paused) parent.Status = WorkflowStatus.Processing;
            intent.AppliedAt = clock.UtcNow;
            await db.SaveChangesAsync(ct);
            if (transaction is not null) await transaction.CommitAsync(ct);
        }
        catch
        {
            if (transaction is not null) await transaction.DisposeAsync();
            await ReloadAsync(db, observed.TaskId, observed.InstanceId, CancellationToken.None);
            // Lost acknowledgement can follow the atomic reset+receipt commit.
            var committed = await db.Set<WorkflowResetIntent>().AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, CancellationToken.None);
            if (committed?.AppliedAt is not null && committed.RequestHash == observed.RequestHash)
            { Read(committed); return; }
            throw;
        }
    }

    public static async Task ReloadAsync(RecipeDbContext db, Guid taskId, Guid instanceId, CancellationToken ct)
    {
        foreach (var entry in db.ChangeTracker.Entries().Where(x => x.Entity switch
        {
            WorkflowTask task => task.TaskId == taskId,
            WorkflowInstance parent => parent.Id == instanceId,
            WorkflowResetIntent intent => intent.TaskId == taskId,
            _ => false
        }).ToArray())
        {
            if (entry.State == EntityState.Added) entry.State = EntityState.Detached;
            else await entry.ReloadAsync(ct);
        }
    }

    public static async Task<int> ReconcilePendingAsync(RecipeDbContext db, IClock clock, CancellationToken ct)
    {
        var applied = 0;
        var considered = new List<Guid>();
        while (applied < 10)
        {
            var batch = await db.Set<WorkflowResetIntent>().AsNoTracking().Where(x => x.AppliedAt == null
                && !considered.Contains(x.Id) && !db.WorkflowLifecycleRecords.Any(h => h.Id == x.InstanceId))
                .OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).Take(10).ToArrayAsync(ct);
            if (batch.Length == 0) break;
            foreach (var intent in batch)
            {
                considered.Add(intent.Id);
                await using var execution = await WorkflowExecutionLease.EnterAsync(db, intent.TaskId, wait: false, ct);
                if (execution is null) continue;
                try { await ApplyAsync(db, intent.Id, clock, ct); applied++; }
                catch (Exception ex) when (ex is InvalidDataException or JsonException)
                { /* Keep absent/divergent original facts; never recapture today's authority. */ }
                if (applied == 10) break;
            }
            if (batch.Length < 10) break;
        }
        return applied;
    }
    internal static WorkflowTask RetainedTask(WorkflowResetIntent intent)
    {
        var request = Read(intent);
        var task = request.Before;
        return new()
        {
            TaskId = task.TaskId,
            InstanceId = task.InstanceId,
            TaskName = task.TaskName,
            ProcessorName = task.ProcessorName,
            Payload = task.Payload,
            DependsOn = task.DependsOn,
            ResetIntentId = task.ResetIntentId,
            ChildLaunchIntentId = task.ChildLaunchIntentId
        };
    }

    internal static FoodVocabularyReference[] VocabularyReferences(WorkflowResetIntent intent)
    {
        var request = Read(intent);
        return RecipeFilePublicationStore.RetainedLaunchVocabularyReferences(intent.InstanceId,
            request.WorkflowId, request.Parameters, request.Capture, RetainedTask(intent));
    }

}
