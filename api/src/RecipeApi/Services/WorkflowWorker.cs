using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;
using RecipeApi.Workflow.Exceptions;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Services;

/// <summary>
/// Generic workflow worker that handles high-concurrency task pickup with PostgreSQL row-level locking
/// and per-processor throttling using semaphores.
/// </summary>
public class WorkflowWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<WorkflowWorker> logger) : BackgroundService
{
    private readonly Dictionary<string, SemaphoreSlim> _processorThrottles = [];
    private volatile bool _initialized = false;
    private int _maxRetries = 3;
    private int _idleCount = 0;
    private const int MinDelayMs = 500;
    private const int MaxDelayMs = 60_000;

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

        // Initialize retry configuration
        var retryConfig = configuration.GetSection("WorkflowRetry");
        _maxRetries = retryConfig.GetValue<int>("MaxRetries", 3);
        logger.LogInformation("WorkflowWorker retry policy initialized: MaxRetries={MaxRetries}", _maxRetries);
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

        var now = DateTimeOffset.UtcNow;
        List<WorkflowTask> pendingTasks = [];

        // Try to use PostgreSQL's FOR UPDATE SKIP LOCKED for high concurrency.
        // For in-memory DB (tests), fall back to simple SELECT.
        try
        {
            pendingTasks = await QueryWithSkipLocked(db, now, ct);
        }
        catch (Exception ex)
        {
            // Fallback for databases that don't support FOR UPDATE SKIP LOCKED
            // (like in-memory DB for tests).
            logger.LogDebug(ex, "SKIP LOCKED query failed, using fallback");
            pendingTasks = await db.WorkflowTasks
                .Where(t => t.Status == TaskStatus.Pending &&
                            (t.ScheduledAt == null || t.ScheduledAt <= now))
                .OrderBy(t => t.ScheduledAt)
                .Take(10)
                .Include(t => t.Instance)
                .ToListAsync(ct);
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

    private static async Task<List<WorkflowTask>> QueryWithSkipLocked(
        RecipeDbContext db, DateTimeOffset now, CancellationToken ct)
    {
        // PostgreSQL-specific query using raw SQL with FOR UPDATE SKIP LOCKED
        return await db.WorkflowTasks
            .FromSqlInterpolated($@"
                SELECT t.task_id, t.instance_id, t.processor_name, t.payload,
                       t.status, t.depends_on, t.retry_count, t.scheduled_at,
                       t.error_message, t.stack_trace, t.created_at, t.updated_at, 
                       t.result
                FROM workflow_tasks t
                WHERE t.status = {(int)TaskStatus.Pending}
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
        try
        {
            // Reload task in case it's from a different context
            task = await db.WorkflowTasks.FindAsync([task.TaskId], cancellationToken: ct)
                ?? throw new InvalidOperationException($"Task {task.TaskId} not found");

            // Mark as processing
            task.Status = TaskStatus.Processing;
            task.ErrorMessage = null;
            task.StackTrace = null;
            await db.SaveChangesAsync(ct);

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
            await processor.ExecuteAsync(task, ct);

            // Mark as completed and handle promotion in a single transaction
            task.Status = TaskStatus.Completed;
            task.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);

            // Handle promotion and completion in a single consolidated step
            await HandleTaskCompletionAsync(task.InstanceId, db, ct);

            logger.LogInformation("Completed task {TaskId} with processor {ProcessorName}",
                task.TaskId, task.ProcessorName);
        }
        catch (TransientWorkflowException ex) when (task.RetryCount < _maxRetries)
        {
            task.RetryCount++;
            task.Status = TaskStatus.Pending;
            task.ScheduledAt = DateTimeOffset.UtcNow.AddMinutes(Math.Pow(2, task.RetryCount));
            task.ErrorMessage = ex.Message;
            task.UpdatedAt = DateTimeOffset.UtcNow;

            logger.LogWarning(ex, "Transient failure on task {TaskId}, retry {Retry}/{Max}, next at {ScheduledAt}",
                task.TaskId, task.RetryCount, _maxRetries, task.ScheduledAt);

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (Exception saveEx)
            {
                logger.LogError(saveEx, "Failed to save retry state for task {TaskId}", task.TaskId);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Fatal failure on task {TaskId}", task.TaskId);

            task.Status = TaskStatus.Failed;
            task.ErrorMessage = ex.Message;
            task.StackTrace = ex.StackTrace;
            task.UpdatedAt = DateTimeOffset.UtcNow;

            var instance = task.Instance
                ?? await db.WorkflowInstances.FindAsync([task.InstanceId], ct);
            if (instance != null)
            {
                instance.Status = WorkflowStatus.Paused;
                instance.UpdatedAt = DateTimeOffset.UtcNow;
            }

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (Exception saveEx)
            {
                logger.LogError(saveEx, "Failed to save fatal error state for task {TaskId}", task.TaskId);
            }
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
                    task.UpdatedAt = DateTimeOffset.UtcNow;
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
                        instance.UpdatedAt = DateTimeOffset.UtcNow;
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

    public override void Dispose()
    {
        foreach (var throttle in _processorThrottles.Values)
        {
            if (throttle != null)
                throttle.Dispose();
        }
        base.Dispose();
    }
}
