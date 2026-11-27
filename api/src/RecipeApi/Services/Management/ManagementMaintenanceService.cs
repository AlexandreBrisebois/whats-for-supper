using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services.Management;

internal sealed class ManagementMaintenanceService(
    RecipeDbContext db,
    RecipesRootResolver recipesRoot,
    IClock clock,
    ILogger logger)
{
    private string ActiveRecipesRoot => recipesRoot.Root;

    public async Task<WorkflowPruneResult> PruneWorkflowsAsync(int retentionDays, CancellationToken ct = default)
    {
        var cutoff = clock.UtcNow.AddDays(-retentionDays);
        var instances = await db.WorkflowInstances
            .Include(i => i.Tasks)
            .Where(i =>
                (i.Status == WorkflowStatus.Completed || i.Status == WorkflowStatus.Failed)
                && i.UpdatedAt < cutoff)
            .ToListAsync(ct);

        var taskCount = 0;
        var instanceCount = 0;
        foreach (var candidate in instances)
        {
            await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
            try
            {
                var instance = await WorkflowLifecycle.LoadLockedAsync(db, candidate.Id, ct);
                if (instance is null || instance.Status is not (WorkflowStatus.Completed or WorkflowStatus.Failed) || instance.UpdatedAt >= cutoff)
                    continue;
                await WorkflowLifecycle.RetainAsync(db, instance, "pruned", Guid.NewGuid(), clock.UtcNow, ct);
                taskCount += instance.Tasks.Count;
                db.WorkflowInstances.Remove(instance);
                await db.SaveChangesAsync(ct);
                if (transaction is not null) await transaction.CommitAsync(ct);
                instanceCount++;
            }
            catch
            {
                if (transaction is not null)
                {
                    try { await transaction.RollbackAsync(CancellationToken.None); } catch { /* Reconcile without compensation. */ }
                    await transaction.DisposeAsync();
                }
                await WorkflowLifecycle.ReloadAttemptAsync(db, candidate.Id);
                throw;
            }
        }

        logger.LogInformation(
            "Pruned {InstanceCount} workflow instances and {TaskCount} workflow tasks older than {Cutoff}",
            instanceCount,
            taskCount,
            cutoff);

        return new WorkflowPruneResult(instanceCount, taskCount);
    }

    public async Task<MaintenanceCommandBatchResult> ProcessMaintenanceCommandsAsync(CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var commands = await db.MaintenanceCommands
            .Where(c => c.Status == "pending" && (c.ScheduledFor == null || c.ScheduledFor <= now))
            .OrderBy(c => c.CreatedAt)
            .Take(50)
            .ToListAsync(ct);

        var items = new List<MaintenanceCommandReportItem>();

        foreach (var command in commands)
        {
            command.Status = "processing";
            command.Attempts++;
            command.StartedAt = now;
            command.LastError = null;
            await db.SaveChangesAsync(ct);

            try
            {
                var item = command.CommandType switch
                {
                    CaptureFailureService.DeleteFailedCaptureResidueCommand => await ProcessDeleteFailedCaptureResidueAsync(command, ct),
                    _ => await SkipUnsupportedCommandAsync(command, ct),
                };
                items.Add(item);
            }
            catch (Exception ex)
            {
                command.Status = "failed";
                command.LastError = ex.Message;
                command.CompletedAt = clock.UtcNow;
                command.Result = JsonSerializer.Serialize(new { error = ex.Message }, JsonDefaults.CamelCase);
                await db.SaveChangesAsync(ct);

                items.Add(new(command.Id, command.CommandType, "failed", null, null, ex.Message));
                logger.LogError(ex, "Maintenance command {CommandId} ({CommandType}) failed", command.Id, command.CommandType);
            }
        }

        return new MaintenanceCommandBatchResult(
            PendingAtStart: commands.Count,
            Completed: items.Count(i => i.Status == "completed"),
            Skipped: items.Count(i => i.Status == "skipped"),
            Failed: items.Count(i => i.Status == "failed"),
            Items: items);
    }

    public async Task<MaintenanceCommandPruneResult> PruneMaintenanceCommandsAsync(
        int retentionDays = 30,
        int batchSize = 500,
        CancellationToken ct = default)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(retentionDays, 1);
        ArgumentOutOfRangeException.ThrowIfLessThan(batchSize, 1);

        var now = clock.UtcNow;
        var cutoff = now.AddDays(-retentionDays);
        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(ct)
            : null;

        var operationId = Guid.NewGuid();
        var attempted = new HashSet<Guid>();
        try
        {
            // Drain terminal writers before observing final command/result facts.
            // Keep the same bounded batch and completion-clock policy.
            if (db.Database.IsNpgsql())
                await db.Database.ExecuteSqlRawAsync("LOCK TABLE maintenance_commands IN SHARE ROW EXCLUSIVE MODE", ct);
            // Legacy terminal rows and recovery-invalidated rows from older releases did
            // not always have a completion time. Start their retention clock now rather
            // than treating an old creation time as evidence that they are safe to erase.
            var missingCompletionTimes = await db.MaintenanceCommands
                .Where(c =>
                    (c.Status == "completed" || c.Status == "skipped")
                    && c.CompletedAt == null)
                .OrderBy(c => c.CreatedAt)
                .ThenBy(c => c.Id)
                .Take(batchSize)
                .ToListAsync(ct);
            foreach (var command in missingCompletionTimes)
            {
                attempted.Add(command.Id);
                if (db.Database.IsRelational()) await db.Entry(command).ReloadAsync(ct);
                if (command.Status is not ("completed" or "skipped") || command.CompletedAt is not null) continue;
                await MaintenanceCommandLifecycle.RetainAsync(db, command, "retention-started", operationId, now, ct);
                command.CompletedAt = now;
            }

            var expired = await db.MaintenanceCommands
                .Where(c =>
                    (c.Status == "completed" || c.Status == "skipped")
                    && c.CompletedAt != null
                    && c.CompletedAt <= cutoff)
                .OrderBy(c => c.CompletedAt)
                .ThenBy(c => c.Id)
                .Take(batchSize)
                .ToListAsync(ct);

            foreach (var command in expired)
            {
                attempted.Add(command.Id);
                if (db.Database.IsRelational()) await db.Entry(command).ReloadAsync(ct);
                if (command.Status is not ("completed" or "skipped") || command.CompletedAt is null || command.CompletedAt > cutoff) continue;
                await MaintenanceCommandLifecycle.RetainAsync(db, command, "pruned", operationId, now, ct);
                db.MaintenanceCommands.Remove(command);
            }
            await db.SaveChangesAsync(ct);
            if (transaction is not null)
            {
                ct.ThrowIfCancellationRequested();
                await transaction.CommitAsync(CancellationToken.None);
            }

            logger.LogInformation(
                "Pruned {PrunedCount} terminal maintenance commands at or before {Cutoff}; initialized {InitializedCount} missing completion timestamps; retentionDays={RetentionDays}; batchSize={BatchSize}",
                expired.Count,
                cutoff,
                missingCompletionTimes.Count,
                retentionDays,
                batchSize);

            return new MaintenanceCommandPruneResult(expired.Count, missingCompletionTimes.Count, cutoff);
        }
        catch
        {
            if (transaction is not null)
            {
                try { await transaction.RollbackAsync(CancellationToken.None); } catch { /* Read back an uncertain commit; never compensate. */ }
                await transaction.DisposeAsync();
            }
            await MaintenanceCommandLifecycle.ReloadAttemptAsync(db, attempted);
            throw;
        }
    }

    private async Task<MaintenanceCommandReportItem> ProcessDeleteFailedCaptureResidueAsync(MaintenanceCommand command, CancellationToken ct)
    {
        var payload = JsonSerializer.Deserialize<ManagementService.DeleteFailedCaptureResiduePayload>(command.Payload, JsonDefaults.CamelCase)
            ?? new ManagementService.DeleteFailedCaptureResiduePayload();
        async Task RetireWorkflow()
        {
            if (payload.WorkflowInstanceId is not Guid workflowId) return;
            var workflow = await WorkflowLifecycle.LoadLockedAsync(db, workflowId, ct);
            if (workflow is null) return;
            await WorkflowLifecycle.RetainAsync(db, workflow, "cleared", command.Id, clock.UtcNow, ct, command);
            db.WorkflowInstances.Remove(workflow);
        }
        try
        {
            RecipePhysicalResult physical = new("no-recipe-id");
            if (payload.RecipeId is Guid recipeId)
            {
                try
                {
                    physical = await RecipePhysicalLifecycle.DeleteAsync(
                        db,
                        recipeId,
                        "failed-capture",
                        clock,
                        recipesRoot,
                        recipe => !CaptureFailureService.ShouldRetainRecipe(db, recipe),
                        () => Task.FromResult<bool?>(LocalRecipeStore.DeleteDirectory(ActiveRecipesRoot, recipeId)),
                        enlistRetirement: RetireWorkflow,
                        command: command,
                        ct: ct);
                }
                catch
                {
                    // A lost final commit acknowledgement is reconciled only from
                    // this original command's independently committed physical receipt.
                    var receipt = await db.RecipePhysicalDeletions.AsNoTracking().SingleOrDefaultAsync(
                        x => x.RecipeId == recipeId && x.OperationId == command.Id && x.CompletedAt != null,
                        CancellationToken.None);
                    if (receipt is null) throw;
                    physical = RecipePhysicalLifecycle.CompletedResult(receipt, command);
                }
            }
            if (!physical.Deleted)
            {
                // Skipped/missing recipes retain the original workflow cleanup behavior.
                await using var retirement = await SupperServingsService.BeginAsync(db, ct);
                try
                {
                    await RetireWorkflow();
                    await db.SaveChangesAsync(ct);
                    if (retirement is not null) await retirement.CommitAsync(ct);
                }
                catch
                {
                    if (retirement is not null)
                    {
                        try { await retirement.RollbackAsync(CancellationToken.None); } catch { }
                        await retirement.DisposeAsync();
                    }
                    await WorkflowLifecycle.ReloadAttemptAsync(db, payload.WorkflowInstanceId.GetValueOrDefault(), command.Id, payload.RecipeId);
                    throw;
                }
            }
            var reason = physical.Outcome == "ineligible" ? "recipe-retained" : physical.Outcome;
            var status = physical.Outcome == "ineligible" ? "skipped" : "completed";
            command.Status = status;
            command.CompletedAt = clock.UtcNow;
            command.Result = JsonSerializer.Serialize(new
            {
                payload.RecipeId,
                payload.WorkflowInstanceId,
                payload.SourceWorkflowId,
                payload.Reason,
                filesDeleted = physical.FilesRemoved == true,
                recipeDeleted = physical.Deleted,
                outcome = reason
            }, JsonDefaults.CamelCase);
            await db.SaveChangesAsync(ct);
            return new(command.Id, command.CommandType, status, payload.RecipeId, payload.WorkflowInstanceId, reason);
        }
        catch
        {
            await WorkflowLifecycle.ReloadAttemptAsync(db, payload.WorkflowInstanceId.GetValueOrDefault(), command.Id, payload.RecipeId);
            if (command.Status is "completed" or "skipped" && command.Result is not null)
            {
                using var saved = JsonDocument.Parse(command.Result);
                return new(
                    command.Id,
                    command.CommandType,
                    command.Status,
                    payload.RecipeId,
                    payload.WorkflowInstanceId,
                    saved.RootElement.GetProperty("outcome").GetString());
            }
            throw;
        }
    }

    private async Task<MaintenanceCommandReportItem> SkipUnsupportedCommandAsync(MaintenanceCommand command, CancellationToken ct)
    {
        command.Status = "skipped";
        command.CompletedAt = clock.UtcNow;
        command.Result = JsonSerializer.Serialize(new { outcome = "unsupported-command-type" }, JsonDefaults.CamelCase);
        await db.SaveChangesAsync(ct);
        return new(command.Id, command.CommandType, "skipped", null, null, "unsupported-command-type");
    }
}
