using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Models.Ai;
using RecipeApi.Services.Ai;
using RecipeApi.Workflow;
using RecipeApi.Workflow.Exceptions;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Services;

/// <summary>
/// Generic workflow worker that handles high-concurrency task pickup with PostgreSQL row-level locking
/// and per-processor throttling using semaphores.
/// </summary>
public class WorkflowWorker(
    IClock clock,
    IServiceScopeFactory scopeFactory,
    ILogger<WorkflowWorker> logger,
    AiExceptionHandler aiExceptionHandler,
    IOptions<WorkflowRetryOptions> retryOptions) : BackgroundService
{
    private readonly Dictionary<string, SemaphoreSlim> _processorThrottles = [];
    private readonly RetryScheduler _retryScheduler = new RetryScheduler(retryOptions.Value);
    private readonly int _maxRetries = retryOptions.Value.MaxRetries;
    private volatile bool _initialized = false;
    private int _idleCount = 0;
    private DateTimeOffset _lastReapTime = DateTimeOffset.MinValue;
    private const int MinDelayMs = 500;
    private const int MaxDelayMs = 60_000;
    private const int ReapIntervalMinutes = 5;
    private const int StaleTimeoutMinutes = 15;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Initialize throttles from configuration
        if (!_initialized)
        {
            await InitializeThrottles(stoppingToken);
            _initialized = true;
        }

        logger.LogInformation("WorkflowWorker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // 1. Periodic cleanup of stale (zombie) tasks
                if (clock.UtcNow - _lastReapTime > TimeSpan.FromMinutes(ReapIntervalMinutes))
                {
                    await ReapStaleTasksAsync(stoppingToken);
                    _lastReapTime = clock.UtcNow;
                }

                // 2. Process regular pending tasks
                var taskCount = await ProcessPendingTasks(stoppingToken);

                if (taskCount > 0)
                {
                    _idleCount = 0;
                    await Task.Delay(MinDelayMs, stoppingToken);
                }
                else
                {
                    _idleCount++;
                    var delay = (int)Math.Min(MinDelayMs * Math.Pow(2, _idleCount), MaxDelayMs);
                    await Task.Delay(delay, stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in WorkflowWorker loop");
                // Continue processing despite errors
                await Task.Delay(1000, stoppingToken);
            }
        }

        logger.LogInformation("WorkflowWorker stopped");
    }

    private async Task InitializeThrottles(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var services = scope.ServiceProvider;
        var configuration = services.GetRequiredService<IConfiguration>();

        var throttleConfig = configuration.GetSection("WorkflowThrottle");
        var defaultThrottle = throttleConfig.GetValue<int>("Default", 5);

        // Initialize common processor throttles
        _processorThrottles["ExtractRecipe"] = new SemaphoreSlim(
            throttleConfig.GetValue<int>("ExtractRecipe", 1), 1);
        _processorThrottles["GenerateHero"] = new SemaphoreSlim(
            throttleConfig.GetValue<int>("GenerateHero", 2), 2);
        _processorThrottles["SyncRecipe"] = new SemaphoreSlim(
            throttleConfig.GetValue<int>("SyncRecipe", defaultThrottle), defaultThrottle);

        logger.LogInformation("WorkflowWorker throttles initialized: ExtractRecipe={ExtractRecipe}, GenerateHero={GenerateHero}, SyncRecipe={SyncRecipe}",
            _processorThrottles["ExtractRecipe"].CurrentCount,
            _processorThrottles["GenerateHero"].CurrentCount,
            _processorThrottles["SyncRecipe"].CurrentCount);

        logger.LogInformation(
            "WorkflowWorker retry schedule: [{Schedule}], MaxRetries={MaxRetries}, QuietWindow={Start}:00-{End}:00 UTC",
            string.Join(", ", retryOptions.Value.RetryScheduleMinutes),
            retryOptions.Value.MaxRetries,
            retryOptions.Value.QuietWindowStartHour,
            retryOptions.Value.QuietWindowEndHour);

        var schedule = retryOptions.Value.RetryScheduleMinutes;
        for (var i = 1; i < schedule.Length; i++)
        {
            if (schedule[i] < schedule[i - 1])
            {
                logger.LogWarning(
                    "WorkflowRetry.RetryScheduleMinutes is not monotonically non-decreasing at index {Index}: {Prev} > {Curr}. Using as-is.",
                    i, schedule[i - 1], schedule[i]);
                break;
            }
        }
    }

    // Public method for testing
    public async Task<int> ProcessPendingTasksAsync(CancellationToken ct)
    {
        return await ProcessPendingTasks(ct);
    }

    private SemaphoreSlim GetOrCreateThrottle(string processorName)
    {
        if (_processorThrottles.TryGetValue(processorName, out var semaphore))
        {
            return semaphore;
        }

        // Create default throttle (5 concurrent) for unknown processors
        var defaultThrottle = new SemaphoreSlim(5, 5);
        _processorThrottles[processorName] = defaultThrottle;
        logger.LogInformation("Created default throttle for processor {ProcessorName} with limit 5", processorName);
        return defaultThrottle;
    }

    private async Task<int> ProcessPendingTasks(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();

        await using (var resetRecovery = services.GetService<RecoveryBoundary>() is { } resetBoundary
            ? await resetBoundary.EnterAsync(RecoveryAccess.Write, ct) : null)
            await WorkflowReset.ReconcilePendingAsync(db, clock, ct);

        // Repair feedback and its original command can commit before acceptance.
        // Reconcile that durable gap before scanning executable workflow tasks.
        if (services.GetService<IWorkflowOrchestrator>() is not null
            || services.GetService<RecipeImportReportService>() is not null)
        {
            await using var recoveryLease = services.GetService<RecoveryBoundary>() is { } recovery
                ? await recovery.EnterAsync(RecoveryAccess.Write, ct) : null;
            if (services.GetService<RecipeImportReportService>() is { } reports)
                await reports.ReconcilePendingAsync(ct);
            if (services.GetService<IWorkflowOrchestrator>() is { } launches)
                await launches.ReconcileLaunchesAsync(ct);
        }
        var now = clock.UtcNow;
        List<WorkflowTask> pendingTasks = [];

        // Retained historical/divergent records must not occupy every slot forever.
        // Scan bounded candidate batches without changing them; admit at most ten
        // captured commands. Dispatch repeats validation after throttle/recovery waits.
        var considered = new HashSet<Guid>();
        while (pendingTasks.Count < 10)
        {
            var candidates = await ReadPendingBatchAsync(db, now, considered.ToArray(), ct);
            if (candidates.Count == 0) break;
            foreach (var candidate in candidates)
            {
                considered.Add(candidate.TaskId);
                var instance = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
                    .SingleOrDefaultAsync(x => x.Id == candidate.InstanceId, ct);
                if (!HasExecutionAuthority(instance, candidate.TaskId)
                    || await db.WorkflowResetIntents.AnyAsync(x => x.TaskId == candidate.TaskId && x.AppliedAt == null, ct)) continue;
                pendingTasks.Add(candidate);
                if (pendingTasks.Count == 10) break;
            }
            if (candidates.Count < 10) break;
        }

        if (!pendingTasks.Any())
        {
            logger.LogTrace("No pending tasks found at {Now}", now);
            return 0;
        }

        logger.LogInformation("Picked up {TaskCount} pending tasks", pendingTasks.Count);

        // Fire off execution tasks without waiting to maximize throughput
        // Each task gets its own scope/context to avoid concurrency issues during parallel execution
        var executionTasks = pendingTasks.Select(async task =>
        {
            await ExecuteTaskWithThrottle(task, ct);
        });

        // Wait for all executions to complete
        await Task.WhenAll(executionTasks);

        return pendingTasks.Count;
    }

    private async Task<List<WorkflowTask>> ReadPendingBatchAsync(RecipeDbContext db,
        DateTimeOffset now, Guid[] excludedTaskIds, CancellationToken ct)
    {
        try
        {
            return await QueryBatchWithSkipLocked(db, now, excludedTaskIds, ct);
        }
        catch (Exception ex)
        {
            // Preserve the existing fallback for providers without SKIP LOCKED.
            logger.LogDebug(ex, "SKIP LOCKED query failed, using fallback");
            return await db.WorkflowTasks
                .Where(t => t.Status == TaskStatus.Pending &&
                            !excludedTaskIds.Contains(t.TaskId) &&
                            t.Instance.Status != WorkflowStatus.Paused &&
                            t.ProcessorName != UrlCaptureInitialization.ProcessorName &&
                            t.ProcessorName != RecipeFollowupInitialization.ProcessorName &&
                            (t.ScheduledAt == null || t.ScheduledAt <= now))
                .OrderBy(t => t.ScheduledAt)
                .Take(10)
                .Include(t => t.Instance)
                .ToListAsync(ct);
        }
    }

    private bool HasExecutionAuthority(WorkflowInstance? instance, Guid taskId)
    {
        try
        {
            if (instance is null) throw new InvalidDataException("Workflow is unavailable.");
            RecipeFilePublicationStore.ValidateExecutionLaunch(instance);
            return true;
        }
        catch (Exception ex) when (ex is InvalidDataException or JsonException or ArgumentException)
        {
            // Do not clear results, advance retries, fail a parent or recapture
            // current inputs as though they were the originally accepted command.
            logger.LogWarning(ex, "Refusing workflow task {TaskId}: original launch authority is unavailable or divergent", taskId);
            return false;
        }
    }

    private static async Task<List<WorkflowTask>> QueryBatchWithSkipLocked(
        RecipeDbContext db, DateTimeOffset now, Guid[] excludedTaskIds, CancellationToken ct)
    {
        // PostgreSQL-specific query using raw SQL with FOR UPDATE SKIP LOCKED
        return await db.WorkflowTasks
            .FromSql($@"
                SELECT t.task_id, t.instance_id, t.task_name, t.processor_name, t.payload,
                       t.status, t.depends_on, t.retry_count, t.scheduled_at,
                       t.error_message, t.stack_trace, t.created_at, t.updated_at, 
                       t.result, t.child_launch_intent_id, t.reset_intent_id
                FROM workflow_tasks t
                WHERE t.status = {(int)TaskStatus.Pending}
                  AND NOT (t.task_id = ANY({excludedTaskIds}))
                  AND EXISTS (SELECT 1 FROM workflow_instances i
                              WHERE i.id = t.instance_id
                                AND i.status <> {(int)WorkflowStatus.Paused})
                  AND t.processor_name NOT IN ({UrlCaptureInitialization.ProcessorName}, {RecipeFollowupInitialization.ProcessorName})
                  AND (t.scheduled_at IS NULL OR t.scheduled_at <= {now})
                ORDER BY t.scheduled_at ASC
                LIMIT 10
                FOR UPDATE SKIP LOCKED")
            .Include(t => t.Instance)
            .ToListAsync(ct);
    }

    private async Task ExecuteTaskWithThrottle(WorkflowTask task, CancellationToken ct)
    {
        var throttle = GetOrCreateThrottle(task.ProcessorName);

        try
        {
            // Wait for slot available in throttle
            await throttle.WaitAsync(ct);

            try
            {
                // Create a new scope and context for each task execution to avoid concurrency issues
                // Each parallel task needs its own db context to see up-to-date state
                using var taskScope = scopeFactory.CreateScope();
                var services = taskScope.ServiceProvider;
                var db = services.GetRequiredService<RecipeDbContext>();
                // Capture/reset own Snapshot/Publish leases; a held Write lease cannot be upgraded.
                await using var recoveryLease = task.ProcessorName is not ("CaptureDemoState" or "RestoreDemoState")
                    && services.GetService<RecoveryBoundary>() is { } recovery
                    ? await recovery.EnterAsync(RecoveryAccess.Write, ct) : null;
                await using var executionLease = await WorkflowExecutionLease.EnterAsync(db, task.TaskId, wait: false, ct);
                if (executionLease is null) return;
                await ProcessTaskAsync(task, db, ct);
            }
            finally
            {
                // Release throttle slot
                throttle.Release();
            }
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error executing task {TaskId} with processor {ProcessorName}",
                task.TaskId, task.ProcessorName);
        }
    }

    private async Task ProcessTaskAsync(WorkflowTask task, RecipeDbContext db, CancellationToken ct)
    {
        WorkflowProcessorAttempt? attempt = null;
        var processorReturned = false;
        string? returnedResult = null;
        try
        {
            // Reload the complete aggregate after throttle/recovery waits. A matching
            // selected task alone cannot certify unchanged sibling or parameter intent.
            var instance = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
                .SingleOrDefaultAsync(x => x.Id == task.InstanceId, ct);
            var refreshedTask = instance?.Tasks.SingleOrDefault(x => x.TaskId == task.TaskId)
                ?? throw new InvalidOperationException($"Task {task.TaskId} not found");
            refreshedTask.Instance = instance!;

            // Selection precedes throttle acquisition. A paused parent
            // or another attempt's Processing state must still fence this pickup.
            // Initialization placeholders carry accepted intent only; resetting
            // their status never grants ordinary processor execution authority.
            if (refreshedTask.Status != TaskStatus.Pending
                || refreshedTask.Instance is null
                || refreshedTask.Instance.Status == WorkflowStatus.Paused
                || refreshedTask.ProcessorName is UrlCaptureInitialization.ProcessorName
                    or RecipeFollowupInitialization.ProcessorName) return;
            task = refreshedTask;

            // If the task was rescheduled (e.g. by a 429 from another parallel task) while we were waiting
            // for the throttle, skip it now so we don't hit the rate limit again immediately.
            if (task.ScheduledAt > clock.UtcNow)
            {
                logger.LogInformation("Task {TaskId} ({ProcessorName}) was rescheduled while waiting for throttle slot. Skipping execution.",
                    task.TaskId, task.ProcessorName);
                return;
            }

            if (!HasExecutionAuthority(instance, task.TaskId)
                || await db.WorkflowResetIntents.AnyAsync(x => x.TaskId == task.TaskId && x.AppliedAt == null, ct)) return;

            // Do not track the eligibility snapshot as the parent's current
            // state. A sibling may pause it while this processor is running;
            // completion/failure reconciliation must reread that stored state.
            task.Instance = null!;
            db.WorkflowTasks.Attach(task);

            attempt = WorkflowProcessorHistory.Begin(db, task, instance!, clock.UtcNow);
            // Mark as processing
            task.Status = TaskStatus.Processing;
            task.UpdatedAt = clock.UtcNow;
            task.ErrorMessage = null;
            task.StackTrace = null;
            try { await db.SaveChangesAsync(ct); }
            catch (Exception admissionEx)
            {
                // A lost acknowledgement must not dispatch an unacknowledged
                // attempt or publish a fabricated failure over a committed start.
                logger.LogError(admissionEx, "Processor admission was not acknowledged for task {TaskId}", task.TaskId);
                return;
            }

            logger.LogInformation("Processing task {TaskId} with processor {ProcessorName}",
                task.TaskId, task.ProcessorName);

            // Resolve and execute processor
            using var executionScope = scopeFactory.CreateScope();
            var processors = executionScope.ServiceProvider
                .GetServices<IWorkflowProcessor>()
                .ToList();

            var processor = processors.FirstOrDefault(p => p.ProcessorName == task.ProcessorName);
            if (processor == null)
            {
                throw new InvalidOperationException(
                    $"No processor found for '{task.ProcessorName}'. Available: {string.Join(", ", processors.Select(p => p.ProcessorName))}");
            }

            // Execute processor
            var result = await processor.ExecuteAsync(task, ct);
            returnedResult = result is null ? null : JsonSerializer.Serialize(result, JsonDefaults.CamelCase);
            processorReturned = true;

            // Mark as completed and handle promotion in a single transaction
            task.Status = TaskStatus.Completed;
            task.UpdatedAt = clock.UtcNow;

            if (result != null)
            {
                task.Result = returnedResult;
            }

            try
            {
                await WorkflowProcessorHistory.ObserveAsync(db, attempt, task, "succeeded", processorReturned, returnedResult, clock.UtcNow, ct);
                await db.SaveChangesAsync(ct);
            }
            catch (Exception outcomeEx)
            {
                // Outcome and task state share the save. Do not convert a lost
                // success acknowledgement into a second, contradictory outcome.
                logger.LogError(outcomeEx, "Processor outcome was not acknowledged for task {TaskId}", task.TaskId);
                try
                {
                    // Independently read the atomic receipt before promoting
                    // dependents. A rolled-back/unobserved outcome cannot do so.
                    var committed = await db.WorkflowProcessorAttempts.AsNoTracking()
                        .SingleOrDefaultAsync(x => x.Id == attempt.Id, CancellationToken.None);
                    if (committed?.Outcome is not null && committed.RequestHash == attempt.RequestHash
                        && committed.OutcomeHash == attempt.OutcomeHash)
                    {
                        WorkflowProcessorHistory.Validate(committed);
                        await db.Entry(task).ReloadAsync(CancellationToken.None);
                        await db.Entry(attempt).ReloadAsync(CancellationToken.None);
                        if (task.Status == TaskStatus.Completed)
                            await HandleTaskCompletionAsync(task.InstanceId, db, CancellationToken.None);
                    }
                }
                catch (Exception readbackEx)
                {
                    logger.LogWarning(readbackEx, "Processor outcome readback remains unresolved for task {TaskId}", task.TaskId);
                }
                return;
            }

            // Handle promotion and completion in a single consolidated step
            await HandleTaskCompletionAsync(task.InstanceId, db, ct);

            logger.LogInformation("Completed task {TaskId} with processor {ProcessorName}",
                task.TaskId, task.ProcessorName);
        }
        catch (Exception ex) when ((ex is TransientWorkflowException || aiExceptionHandler.IsTransient(ex) || Is429Exception(ex)) && task.RetryCount < _maxRetries)
        {
            var is429 = Is429Exception(ex);
            var failureType = is429 ? "rate-limit" : "transient";
            task.RetryCount++;
            task.Status = TaskStatus.Pending;
            task.ScheduledAt = _retryScheduler.ComputeNextScheduledAt(task.RetryCount, clock.UtcNow);
            task.ErrorMessage = ex.Message;
            task.UpdatedAt = clock.UtcNow;

            var isQuietWindow = task.RetryCount > retryOptions.Value.RetryScheduleMinutes.Length;
            var quietWindowLabel = isQuietWindow ? " [quiet-window]" : "";

            logger.LogWarning(ex,
                "Task {TaskId} ({ProcessorName}) {FailureType} failure, retry {Retry}/{Max}, next at {ScheduledAt}{QuietWindow}",
                task.TaskId, task.ProcessorName, failureType, task.RetryCount, _maxRetries, task.ScheduledAt, quietWindowLabel);

            // 1. SAVE THE PRIMARY TASK FIRST to ensure it doesn't get stuck in Processing state
            // even if proactive rescheduling of other tasks fails due to concurrency.
            try
            {
                if (attempt is not null)
                    await WorkflowProcessorHistory.ObserveAsync(db, attempt, task, "retry", processorReturned, returnedResult, clock.UtcNow, ct);
                await db.SaveChangesAsync(ct);
            }
            catch (Exception saveEx)
            {
                logger.LogError(saveEx, "Failed to save retry state for primary task {TaskId}. Task may be stuck.", task.TaskId);
                // If this fails, we can't reliably continue with proactive rescheduling
                return;
            }

            // 2. PROACTIVE STAGGERED RESCHEDULING (only for 429s)
            if (is429)
            {
                try
                {
                    // Fetch other pending tasks of the same type
                    var otherTasks = await db.WorkflowTasks
                        .Where(t => t.ProcessorName == task.ProcessorName && t.Status == TaskStatus.Pending && t.TaskId != task.TaskId)
                        .OrderBy(t => t.ScheduledAt)
                        .ToListAsync(ct);

                    if (otherTasks.Any())
                    {
                        // Stagger the other tasks starting from 1 minute after the current task's next retry
                        var staggerTime = task.ScheduledAt ?? clock.UtcNow;
                        foreach (var t in otherTasks)
                        {
                            staggerTime = staggerTime.AddMinutes(1);
                            t.ScheduledAt = staggerTime;
                            t.UpdatedAt = clock.UtcNow;
                        }

                        await db.SaveChangesAsync(ct);
                        logger.LogInformation("Proactively rescheduled {Count} other pending tasks of type {ProcessorName} with 1-minute staggering",
                            otherTasks.Count, task.ProcessorName);
                    }
                }
                catch (Exception rescheduleEx)
                {
                    // Log but do not fail the current task if proactive rescheduling fails (e.g. concurrency)
                    logger.LogWarning(rescheduleEx, "Failed to proactively reschedule other tasks of type {ProcessorName}. This is non-fatal.", task.ProcessorName);
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fatal failure on task {TaskId} ({ProcessorName}), retries exhausted after {RetryCount}: {Message}",
                task.TaskId, task.ProcessorName, task.RetryCount, ex.Message);

            task.Status = TaskStatus.Failed;

            var aiError = aiExceptionHandler.MapException(ex);
            task.ErrorMessage = aiError.ToString();
            task.StackTrace = ex.StackTrace;
            task.UpdatedAt = clock.UtcNow;

            // 1. SAVE THE TASK FAILURE FIRST
            try
            {
                if (attempt is not null)
                    await WorkflowProcessorHistory.ObserveAsync(db, attempt, task, "failed", processorReturned, returnedResult, clock.UtcNow, ct);
                await db.SaveChangesAsync(ct);
            }
            catch (Exception saveEx)
            {
                logger.LogError(saveEx, "Failed to save fatal error state for task {TaskId}. Task may be stuck in Processing.", task.TaskId);
                // Cannot reliably continue
                return;
            }

            // 2. PAUSE THE INSTANCE (Isolated)
            try
            {
                var instance = task.Instance
                    ?? await db.WorkflowInstances.FindAsync([task.InstanceId], ct);
                if (instance != null)
                {
                    instance.Status = WorkflowStatus.Paused;
                    instance.UpdatedAt = clock.UtcNow;
                    await db.SaveChangesAsync(ct);

                    await RecordImportReportFailureAsync(instance, task, ct);

                    // Publish recipe_failed SSE event — all retries exhausted, workflow is fatally failed.
                    // This fires on the fatal path only.
                    await PublishRecipeFailedEventAsync(instance, task, db, ct);
                }
            }
            catch (Exception instanceEx)
            {
                logger.LogWarning(instanceEx, "Failed to pause instance {InstanceId} for failed task {TaskId}. This is non-fatal.", task.InstanceId, task.TaskId);
            }
        }
    }

    private async Task ReapStaleTasksAsync(CancellationToken ct)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var boundary = scope.ServiceProvider.GetService<RecoveryBoundary>();
            await using var lease = boundary?.CoordinatesWrites == true
                ? await boundary.EnterAsync(RecoveryAccess.Write, ct) : null;

            var staleThreshold = clock.UtcNow.AddMinutes(-StaleTimeoutMinutes);

            // Find tasks stuck in Processing for too long.
            // We increment retry_count to ensure poison pills eventually stop.
            var staleTasks = await db.WorkflowTasks
                .Where(t => t.Status == TaskStatus.Processing && t.UpdatedAt < staleThreshold)
                .ToListAsync(ct);

            if (staleTasks.Any())
            {
                foreach (var task in staleTasks)
                {
                    // A slow live processor is not a zombie. Claim the same lease
                    // as dispatch/reset, then reread after any competing completion.
                    await using var executionLease = await WorkflowExecutionLease.EnterAsync(db, task.TaskId, wait: false, ct);
                    if (executionLease is null) continue;
                    await db.Entry(task).ReloadAsync(ct);
                    if (db.Entry(task).State == EntityState.Detached
                        || task.Status != TaskStatus.Processing || task.UpdatedAt >= staleThreshold
                        || await db.WorkflowResetIntents.AnyAsync(x => x.TaskId == task.TaskId && x.AppliedAt == null, ct)) continue;
                    var originalTime = task.UpdatedAt;
                    task.Status = TaskStatus.Pending;
                    task.RetryCount++;
                    task.UpdatedAt = clock.UtcNow;
                    task.ErrorMessage = $"Reclaimed by Zombie Reaper (stuck in Processing since {originalTime:u})";
                    await db.SaveChangesAsync(ct);
                }

                logger.LogInformation("Zombie Reaper inspected {Count} stale processing tasks.", staleTasks.Count);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error occurred during Zombie Reaper execution.");
        }
    }

    private async Task HandleTaskCompletionAsync(Guid instanceId, RecipeDbContext db, CancellationToken ct)
    {
        try
        {
            // Fetch all tasks for this instance to perform promotion and completion logic in memory.
            // This avoids complex EF Core translations for array properties and potential race conditions
            // in parallel execution. Since workflows typically have < 100 tasks, this is efficient.
            var allTasks = await db.WorkflowTasks
                .Where(t => t.InstanceId == instanceId)
                .ToListAsync(ct);

            var waitingTasks = allTasks.Where(t => t.Status == TaskStatus.Waiting).ToList();
            var completedTaskNames = allTasks
                .Where(t => t.Status == TaskStatus.Completed)
                .Select(t => t.TaskName)
                .ToHashSet();

            var anyChanges = false;

            // 1. Promote dependents
            foreach (var task in waitingTasks)
            {
                // A task can be promoted to Pending if all its dependencies are in the Completed set.
                // If it has no dependencies (DependsOn is empty), All() returns true.
                if (task.DependsOn.All(d => completedTaskNames.Contains(d)))
                {
                    task.Status = TaskStatus.Pending;
                    task.UpdatedAt = clock.UtcNow;
                    anyChanges = true;
                    logger.LogInformation("Promoted task {TaskId} ({TaskName}) from Waiting to Pending",
                        task.TaskId, task.TaskName);
                }
            }

            // 2. Check instance completion
            // The instance is completed if no tasks are in a "doing" state (Waiting, Pending, Processing).
            // IMPORTANT: We only mark as Completed if there are no Failed tasks.
            var hasActiveTasks = allTasks.Any(t =>
                t.Status == TaskStatus.Waiting ||
                t.Status == TaskStatus.Pending ||
                t.Status == TaskStatus.Processing);

            var hasFailedTasks = allTasks.Any(t => t.Status == TaskStatus.Failed);

            if (!hasActiveTasks)
            {
                var instance = await db.WorkflowInstances.FindAsync([instanceId], ct);
                if (instance != null)
                {
                    var targetStatus = hasFailedTasks ? WorkflowStatus.Failed : WorkflowStatus.Completed;

                    if (instance.Status != targetStatus && instance.Status != WorkflowStatus.Paused)
                    {
                        instance.Status = targetStatus;
                        instance.UpdatedAt = clock.UtcNow;
                        anyChanges = true;
                        logger.LogInformation("Workflow instance {InstanceId} marked as {Status}", instanceId, targetStatus);
                    }
                }
            }

            if (anyChanges)
            {
                await db.SaveChangesAsync(ct);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error handling task completion for instance {InstanceId}", instanceId);
        }
    }

    /// <summary>
    /// Publishes a <c>recipe_failed</c> SSE event when a workflow instance reaches
    /// <see cref="WorkflowStatus.Failed"/>. Fetches partial recipe data (name, imageUrl)
    /// from the DB to include in the payload so the client can show a meaningful retry prompt.
    /// </summary>
    private async Task PublishRecipeFailedEventAsync(
        WorkflowInstance instance,
        WorkflowTask failedTask,
        RecipeDbContext db,
        CancellationToken ct)
    {
        // Indexing runs independently of import. Its failure must not remove
        // the pending capture or offer an import Retry for a saved recipe.
        if (instance.WorkflowId == "index-recipe-search") return;

        try
        {
            // Resolve the recipe ID from the workflow instance's parameters.
            // Workflow instances store the recipe ID in their Parameters JSON.
            var recipeId = TryGetRecipeId(instance);

            if (recipeId is null)
            {
                logger.LogWarning("WorkflowFailed: no recipeId found in instance {InstanceId} — skipping recipe_failed SSE event", instance.Id);
                return;
            }

            // Fetch partial recipe data for the client retry prompt
            object? partialData = null;
            var recipe = await db.Recipes.FindAsync([recipeId.Value], ct);
            if (recipe != null)
            {
                // Build imageUrl from ImageCount — same convention used elsewhere in the API
                string? imageUrl = recipe.ImageCount > 0
                    ? $"/api/recipes/{recipe.Id}/image/0"
                    : null;

                partialData = new { name = recipe.Name, imageUrl };
            }

            // Resolve the scoped publisher via a new scope — WorkflowWorker is a singleton
            using var publishScope = scopeFactory.CreateScope();
            var publisher = publishScope.ServiceProvider.GetRequiredService<IScheduleEventPublisher>();

            await publisher.PublishRecipeFailedAsync(
                recipeId.Value,
                instance.Id,
                failedTask.ErrorMessage ?? "Unknown error",
                failedTask.TaskName,
                partialData);

            logger.LogInformation(
                "Published recipe_failed SSE event for recipe {RecipeId}, failed step {FailedStep}",
                recipeId.Value, failedTask.TaskName);
        }
        catch (Exception ex)
        {
            // Publishing failure must never crash the worker — log and continue
            logger.LogError(ex, "Failed to publish recipe_failed SSE event for workflow instance {InstanceId}", instance.Id);
        }
    }

    private async Task RecordImportReportFailureAsync(
        WorkflowInstance instance,
        WorkflowTask failedTask,
        CancellationToken ct)
    {
        if (instance.WorkflowId is not ("recipe-import" or "url-import")) return;

        var recipeId = TryGetRecipeId(instance);
        if (recipeId is null) return;

        try
        {
            using var failureScope = scopeFactory.CreateScope();
            var reportService = failureScope.ServiceProvider.GetService<RecipeImportReportService>();
            if (reportService is null) return;

            await reportService.MarkFailedAsync(
                recipeId.Value,
                instance.Id,
                failedTask.TaskName,
                failedTask.ErrorMessage ?? "Unknown error");
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Failed to record import-report diagnostics for workflow instance {InstanceId}. This is non-fatal.",
                instance.Id);
        }
    }

    private Guid? TryGetRecipeId(WorkflowInstance instance)
    {
        if (string.IsNullOrEmpty(instance.Parameters)) return null;

        try
        {
            using var document = JsonDocument.Parse(instance.Parameters);
            if (document.RootElement.TryGetProperty("recipeId", out var idProperty)
                || document.RootElement.TryGetProperty("RecipeId", out idProperty))
            {
                return idProperty.GetGuid();
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Could not parse recipeId from workflow instance {InstanceId} parameters",
                instance.Id);
        }

        return null;
    }

    public override void Dispose()
    {
        foreach (var throttle in _processorThrottles.Values)
        {
            if (throttle != null)
                throttle.Dispose();
        }
        base.Dispose();
    }

    private static bool Is429Exception(Exception ex) =>
        ex is HttpRequestException { StatusCode: HttpStatusCode.TooManyRequests }
        || ex.Message.Contains("429", StringComparison.OrdinalIgnoreCase)
        || ex.Message.Contains("high demand", StringComparison.OrdinalIgnoreCase)
        || ex.Message.Contains("TooManyRequests", StringComparison.OrdinalIgnoreCase);
}
