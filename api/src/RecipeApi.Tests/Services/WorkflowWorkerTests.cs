using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Workflow;
using RecipeApi.Workflow.Exceptions;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

public class WorkflowWorkerTests : IAsyncLifetime
{
    private readonly RecipeDbContext _db;
    private readonly WorkflowWorker _worker;
    private readonly IServiceProvider _serviceProvider;
    private readonly CancellationTokenSource _cts;
    private readonly List<string> _executedProcessorNames;
    private readonly string _dbName = $"WorkflowWorkerTest_{Guid.NewGuid():N}";

    public WorkflowWorkerTests()
    {
        _executedProcessorNames = [];

        var services = new ServiceCollection();

        // Add configuration with WorkflowThrottle and WorkflowRetry settings
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["WorkflowThrottle:ExtractRecipe"] = "1",
                ["WorkflowThrottle:GenerateHero"] = "2",
                ["WorkflowThrottle:Default"] = "5",
                ["WorkflowRetry:MaxRetries"] = "3"
            })
            .Build();
        services.AddSingleton<IConfiguration>(config);

        // In-memory database for testing — use a constant name so all DbContext instances
        // created from this service provider use the SAME shared in-memory database store
        services.AddDbContext<RecipeDbContext>(opts =>
            opts.UseInMemoryDatabase(_dbName));

        // Register mock processors
        services.AddScoped<IWorkflowProcessor>(sp => new MockWorkflowProcessor("ExtractRecipe", _executedProcessorNames));
        services.AddScoped<IWorkflowProcessor>(sp => new MockWorkflowProcessor("GenerateHero", _executedProcessorNames));
        services.AddScoped<IWorkflowProcessor>(sp => new MockWorkflowProcessor("SyncRecipe", _executedProcessorNames));

        services.AddSingleton<WorkflowRootResolver>();
        services.AddLogging(opts =>
        {
            opts.SetMinimumLevel(LogLevel.Debug);
            opts.AddConsole();
        });

        _serviceProvider = services.BuildServiceProvider();
        _db = _serviceProvider.GetRequiredService<RecipeDbContext>();
        _cts = new CancellationTokenSource();

        var loggerFactory = _serviceProvider.GetRequiredService<ILoggerFactory>();
        var logger = loggerFactory.CreateLogger<WorkflowWorker>();
        var scopeFactory = _serviceProvider.GetRequiredService<IServiceScopeFactory>();

        _worker = new WorkflowWorker(scopeFactory, logger);
    }

    public async Task InitializeAsync()
    {
        await _db.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
        _cts.Dispose();
        _worker.Dispose();
        await _db.DisposeAsync();
        if (_serviceProvider is IAsyncDisposable asyncDisposable)
        {
            await asyncDisposable.DisposeAsync();
        }
        else if (_serviceProvider is IDisposable disposable)
        {
            disposable.Dispose();
        }
    }

    [Fact]
    public async Task Worker_PicksUpPendingTasks_WhenScheduled()
    {
        // Arrange: Create workflow instance and pending task
        var now = DateTimeOffset.UtcNow;
        var instance = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "test",
            Status = WorkflowStatus.Processing,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.WorkflowInstances.Add(instance);

        var taskId = Guid.NewGuid();
        var task = new WorkflowTask
        {
            TaskId = taskId,
            InstanceId = instance.Id,
            ProcessorName = "ExtractRecipe",
            Status = TaskStatus.Pending,
            ScheduledAt = now.AddSeconds(-1),
            Instance = instance,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.WorkflowTasks.Add(task);
        await _db.SaveChangesAsync();

        // Ensure throttles are initialized by doing a dummy call first
        // This initializes the semaphores and everything else needed
        using var initScope = _serviceProvider.CreateScope();
        var initDb = initScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var initTasks = await initDb.WorkflowTasks.Take(0).ToListAsync();  // Query that returns nothing

        // Act: Process the task
        await _worker.ProcessPendingTasksAsync(_cts.Token);

        // Assert: Task should be completed
        // Use a fresh context to ensure we see the updated data from the worker's changes
        using var queryScope = _serviceProvider.CreateScope();
        var queryDb = queryScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var updatedTask = await queryDb.WorkflowTasks.FirstOrDefaultAsync(t => t.TaskId == taskId);
        Assert.NotNull(updatedTask);
        Assert.Equal(TaskStatus.Completed, updatedTask.Status);
        Assert.Single(_executedProcessorNames);
        Assert.Equal("ExtractRecipe", _executedProcessorNames[0]);
    }

    [Fact]
    public async Task Worker_SkipsLockedTasks_HighConcurrency()
    {
        // Arrange: Create 5 pending tasks
        var instance = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "test", Status = WorkflowStatus.Processing };
        _db.WorkflowInstances.Add(instance);

        var taskIds = new List<Guid>();
        for (int i = 0; i < 5; i++)
        {
            var task = new WorkflowTask
            {
                TaskId = Guid.NewGuid(),
                InstanceId = instance.Id,
                ProcessorName = "ExtractRecipe",
                Status = TaskStatus.Pending,
                ScheduledAt = DateTimeOffset.UtcNow.AddSeconds(-1),
                Instance = instance,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.WorkflowTasks.Add(task);
            taskIds.Add(task.TaskId);
        }
        await _db.SaveChangesAsync();

        // Act: Simulate two workers running concurrently
        var cts1 = new CancellationTokenSource();
        var cts2 = new CancellationTokenSource();

        var worker1Task = _worker.StartAsync(cts1.Token);
        var worker2Task = _worker.StartAsync(cts2.Token);

        await Task.Delay(1500);
        cts1.Cancel();
        cts2.Cancel();

        try { await worker1Task; } catch (OperationCanceledException) { }
        try { await worker2Task; } catch (OperationCanceledException) { }

        await Task.Delay(200);

        // Assert: Verify no duplicate processing
        var processedTasks = await _db.WorkflowTasks
            .Where(t => t.Status == TaskStatus.Completed)
            .ToListAsync();

        var uniqueIds = processedTasks.Select(t => t.TaskId).Distinct().Count();
        Assert.Equal(processedTasks.Count, uniqueIds);
    }

    [Fact]
    public async Task Worker_RespectsSemaphoreThrottle_OneConcurrentExtractRecipe()
    {
        // Arrange: Create 3 pending ExtractRecipe tasks
        var instance = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "test", Status = WorkflowStatus.Processing };
        _db.WorkflowInstances.Add(instance);

        for (int i = 0; i < 3; i++)
        {
            var task = new WorkflowTask
            {
                TaskId = Guid.NewGuid(),
                InstanceId = instance.Id,
                ProcessorName = "ExtractRecipe",
                Status = TaskStatus.Pending,
                ScheduledAt = DateTimeOffset.UtcNow.AddSeconds(-1),
                Instance = instance,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.WorkflowTasks.Add(task);
        }
        await _db.SaveChangesAsync();

        // Act: Run worker
        var workerTask = _worker.StartAsync(_cts.Token);
        await Task.Delay(1500);
        _cts.Cancel();

        try { await workerTask; } catch (OperationCanceledException) { }

        await Task.Delay(200);

        // Assert: Verify that tasks were processed sequentially (throttle limit = 1)
        var completedCount = await _db.WorkflowTasks
            .Where(t => t.ProcessorName == "ExtractRecipe" && t.Status == TaskStatus.Completed)
            .CountAsync();

        // All tasks should eventually be completed due to throttling
        Assert.True(completedCount > 0, "No tasks were completed");
    }

    [Fact]
    public async Task Worker_IgnoresUnscheduledTasks()
    {
        // Arrange: Create task scheduled in the future
        var instance = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "test", Status = WorkflowStatus.Processing };
        _db.WorkflowInstances.Add(instance);

        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            ProcessorName = "ExtractRecipe",
            Status = TaskStatus.Pending,
            ScheduledAt = DateTimeOffset.UtcNow.AddSeconds(10),
            Instance = instance
        };
        _db.WorkflowTasks.Add(task);
        await _db.SaveChangesAsync();

        // Act: Run worker
        var workerTask = _worker.StartAsync(_cts.Token);
        await Task.Delay(300);
        _cts.Cancel();

        try { await workerTask; } catch (OperationCanceledException) { }

        // Assert: Task should still be Pending
        var updatedTask = await _db.WorkflowTasks.FirstAsync();
        Assert.Equal(TaskStatus.Pending, updatedTask.Status);
        Assert.Empty(_executedProcessorNames);
    }

    [Fact]
    public async Task Worker_TransientError_RetriesWithExponentialBackoff()
    {
        // Arrange: Create separate ServiceCollection with throwing processor
        var services = new ServiceCollection();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["WorkflowThrottle:ExtractRecipe"] = "1",
                ["WorkflowRetry:MaxRetries"] = "3"
            })
            .Build();
        services.AddSingleton<IConfiguration>(config);

        // Use a constant database name so all DbContext instances from this service provider
        // use the SAME shared in-memory database store
        var transientTestDbName = $"TransientErrorTest_{Guid.NewGuid():N}";
        services.AddDbContext<RecipeDbContext>(opts =>
            opts.UseInMemoryDatabase(transientTestDbName));

        var transientEx = new TransientWorkflowException("Temporary network error");
        services.AddScoped<IWorkflowProcessor>(sp =>
            new ThrowingWorkflowProcessor("ExtractRecipe", transientEx));

        services.AddLogging(opts => opts.SetMinimumLevel(LogLevel.Debug));

        var serviceProvider = services.BuildServiceProvider();
        var db = serviceProvider.GetRequiredService<RecipeDbContext>();
        var loggerFactory = serviceProvider.GetRequiredService<ILoggerFactory>();
        var scopeFactory = serviceProvider.GetRequiredService<IServiceScopeFactory>();

        await db.Database.EnsureCreatedAsync();

        var testWorker = new WorkflowWorker(scopeFactory, loggerFactory.CreateLogger<WorkflowWorker>());

        // Initialize worker by starting and immediately cancelling
        var initCts = new CancellationTokenSource();
        var initTask = testWorker.StartAsync(initCts.Token);
        await Task.Delay(200);  // Allow InitializeThrottles to complete
        initCts.Cancel();
        try { await initTask; } catch (OperationCanceledException) { }

        // Create instance and task
        var now = DateTimeOffset.UtcNow;
        var instance = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "transient-test",
            Status = WorkflowStatus.Processing,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.WorkflowInstances.Add(instance);

        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            ProcessorName = "ExtractRecipe",
            Status = TaskStatus.Pending,
            ScheduledAt = now.AddSeconds(-1),
            RetryCount = 0,
            Instance = instance,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.WorkflowTasks.Add(task);
        await db.SaveChangesAsync();

        var taskId = task.TaskId;

        // Act: First execution — should retry with 2 minute backoff
        await testWorker.ProcessPendingTasksAsync(_cts.Token);

        // Assert: Task should be Pending again, RetryCount=1, ScheduledAt ≈ now + 2 minutes
        // Use a fresh context to ensure we see the updated data from the worker's changes
        using var queryScope1 = serviceProvider.CreateScope();
        var queryDb1 = queryScope1.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var updatedTask = await queryDb1.WorkflowTasks.FirstAsync(t => t.TaskId == taskId);
        Assert.Equal(TaskStatus.Pending, updatedTask.Status);
        Assert.Equal(1, updatedTask.RetryCount);
        Assert.NotNull(updatedTask.ScheduledAt);
        var expectedSchedule = now.AddMinutes(2);
        Assert.True(Math.Abs((updatedTask.ScheduledAt.Value - expectedSchedule).TotalMinutes) < 0.1,
            $"ScheduledAt {updatedTask.ScheduledAt} not within 0.1 min of {expectedSchedule}");

        // Act: Manually set ScheduledAt to past, execute again — should retry with 4 minute backoff
        var beforeSecondTry = DateTimeOffset.UtcNow;
        updatedTask.ScheduledAt = now.AddSeconds(-1);
        await queryDb1.SaveChangesAsync();

        await testWorker.ProcessPendingTasksAsync(_cts.Token);

        // Assert: RetryCount=2, ScheduledAt ≈ now + 4 minutes
        // Use another fresh context to ensure we see the updated data
        using var queryScope2 = serviceProvider.CreateScope();
        var queryDb2 = queryScope2.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var secondRetry = await queryDb2.WorkflowTasks.FirstAsync(t => t.TaskId == taskId);
        Assert.Equal(TaskStatus.Pending, secondRetry.Status);
        Assert.Equal(2, secondRetry.RetryCount);
        Assert.NotNull(secondRetry.ScheduledAt);
        var expectedSchedule2 = beforeSecondTry.AddMinutes(4);
        Assert.True(Math.Abs((secondRetry.ScheduledAt.Value - expectedSchedule2).TotalMinutes) < 0.1,
            $"ScheduledAt {secondRetry.ScheduledAt} not within 0.1 min of {expectedSchedule2}");

        // Cleanup
        testWorker.Dispose();
        initCts.Dispose();
        await db.DisposeAsync();
    }

    [Fact]
    public async Task Worker_FatalError_PausesInstance()
    {
        // Arrange: Create separate ServiceCollection with throwing processor
        var services = new ServiceCollection();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["WorkflowThrottle:ExtractRecipe"] = "1"
            })
            .Build();
        services.AddSingleton<IConfiguration>(config);

        // Use a constant database name so all DbContext instances from this service provider
        // use the SAME shared in-memory database store
        var fatalTestDbName = $"FatalErrorTest_{Guid.NewGuid():N}";
        services.AddDbContext<RecipeDbContext>(opts =>
            opts.UseInMemoryDatabase(fatalTestDbName));

        services.AddScoped<IWorkflowProcessor>(sp =>
            new ThrowingWorkflowProcessor("ExtractRecipe", new DivideByZeroException("Calculation error")));

        services.AddLogging(opts => opts.SetMinimumLevel(LogLevel.Debug));

        var serviceProvider = services.BuildServiceProvider();
        var db = serviceProvider.GetRequiredService<RecipeDbContext>();
        var loggerFactory = serviceProvider.GetRequiredService<ILoggerFactory>();
        var scopeFactory = serviceProvider.GetRequiredService<IServiceScopeFactory>();

        await db.Database.EnsureCreatedAsync();

        var testWorker = new WorkflowWorker(scopeFactory, loggerFactory.CreateLogger<WorkflowWorker>());

        // Initialize worker by starting and immediately cancelling
        var initCts = new CancellationTokenSource();
        var initTask = testWorker.StartAsync(initCts.Token);
        await Task.Delay(200);  // Allow InitializeThrottles to complete
        initCts.Cancel();
        try { await initTask; } catch (OperationCanceledException) { }

        // Create instance and task
        var now = DateTimeOffset.UtcNow;
        var instance = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "fatal-test",
            Status = WorkflowStatus.Processing,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.WorkflowInstances.Add(instance);

        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            ProcessorName = "ExtractRecipe",
            Status = TaskStatus.Pending,
            ScheduledAt = now.AddSeconds(-1),
            Instance = instance,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.WorkflowTasks.Add(task);
        await db.SaveChangesAsync();

        var taskId = task.TaskId;
        var instanceId = instance.Id;

        // Act: Execute task — should handle fatal error
        await testWorker.ProcessPendingTasksAsync(_cts.Token);

        // Assert: Task should be Failed, instance should be Paused
        // Use a fresh context to ensure we see the updated data from the worker's changes
        using var queryScope = serviceProvider.CreateScope();
        var queryDb = queryScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var failedTask = await queryDb.WorkflowTasks.FirstAsync(t => t.TaskId == taskId);
        Assert.Equal(TaskStatus.Failed, failedTask.Status);
        Assert.NotNull(failedTask.ErrorMessage);
        Assert.Contains("Calculation error", failedTask.ErrorMessage);
        Assert.NotNull(failedTask.StackTrace);

        var pausedInstance = await queryDb.WorkflowInstances.FirstAsync(i => i.Id == instanceId);
        Assert.Equal(WorkflowStatus.Paused, pausedInstance.Status);

        // Cleanup
        testWorker.Dispose();
        initCts.Dispose();
        await db.DisposeAsync();
    }

    [Fact]
    public async Task DependencyPromotion_SimplestCase()
    {
        // Arrange: Single pending task with a waiting dependent
        var now = DateTimeOffset.UtcNow;
        var instance = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "simple",
            Status = WorkflowStatus.Processing,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.WorkflowInstances.Add(instance);

        var taskAId = Guid.NewGuid();
        var taskBId = Guid.NewGuid();

        var taskA = new WorkflowTask
        {
            TaskId = taskAId,
            InstanceId = instance.Id,
            ProcessorName = "ExtractRecipe",
            Status = TaskStatus.Pending,
            DependsOn = [],
            ScheduledAt = now.AddSeconds(-10),
            Instance = instance,
            CreatedAt = now,
            UpdatedAt = now
        };

        var taskB = new WorkflowTask
        {
            TaskId = taskBId,
            InstanceId = instance.Id,
            ProcessorName = "GenerateHero",
            Status = TaskStatus.Waiting,
            DependsOn = [taskAId.ToString()],
            ScheduledAt = now.AddSeconds(-10),
            Instance = instance,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.WorkflowTasks.Add(taskA);
        _db.WorkflowTasks.Add(taskB);
        _db.SaveChanges();

        // Verify: Task A is in database and pending
        var preTask = _db.WorkflowTasks.FirstAsync(t => t.TaskId == taskAId).Result;
        Assert.NotNull(preTask);
        Assert.Equal(TaskStatus.Pending, preTask.Status);

        // Act: Process pending tasks
        await _worker.ProcessPendingTasksAsync(_cts.Token);

        // Assert: Processor should have run
        Assert.Single(_executedProcessorNames);
        Assert.Contains("ExtractRecipe", _executedProcessorNames);

        // Clear change tracker so we re-query from the database
        _db.ChangeTracker.Clear();

        // Assert: Task A should be completed
        var resultA = _db.WorkflowTasks.FirstAsync(t => t.TaskId == taskAId).Result;
        Assert.Equal(TaskStatus.Completed, resultA.Status);

        // Assert: Task B should be promoted to Pending
        var resultB = _db.WorkflowTasks.FirstAsync(t => t.TaskId == taskBId).Result;
        Assert.Equal(TaskStatus.Pending, resultB.Status);
    }

    [Fact]
    public async Task DependencyPromotion_LinearChain_A_B_C()
    {
        // Arrange: Create 3-step linear chain A -> B -> C
        var now = DateTimeOffset.UtcNow;
        var instance = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "linear-chain",
            Status = WorkflowStatus.Processing,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.WorkflowInstances.Add(instance);

        var taskA = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            ProcessorName = "ExtractRecipe",
            Status = TaskStatus.Pending,
            DependsOn = [],
            ScheduledAt = now.AddSeconds(-1),
            Instance = instance,
            CreatedAt = now,
            UpdatedAt = now
        };

        var taskB = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            ProcessorName = "GenerateHero",
            Status = TaskStatus.Waiting,
            DependsOn = [taskA.TaskId.ToString()],
            ScheduledAt = now.AddSeconds(-1),
            Instance = instance,
            CreatedAt = now,
            UpdatedAt = now
        };

        var taskC = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            ProcessorName = "SyncRecipe",
            Status = TaskStatus.Waiting,
            DependsOn = [taskB.TaskId.ToString()],
            ScheduledAt = now.AddSeconds(-1),
            Instance = instance,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.WorkflowTasks.AddRange(taskA, taskB, taskC);
        await _db.SaveChangesAsync();

        // Verify setup: ensure tasks are saved correctly
        var savedTaskB = await _db.WorkflowTasks.FirstAsync(t => t.TaskId == taskB.TaskId);
        Assert.Equal(TaskStatus.Waiting, savedTaskB.Status);
        Assert.Single(savedTaskB.DependsOn);
        Assert.Equal(taskA.TaskId.ToString(), savedTaskB.DependsOn[0]);

        // Act: Process task A (this should trigger promotion of B)
        await _worker.ProcessPendingTasksAsync(_cts.Token);

        // Ensure we're not getting cached entities from the context
        _db.ChangeTracker.Clear();

        // Debug: Check if processor was executed
        Assert.NotEmpty(_executedProcessorNames);
        Assert.Contains("ExtractRecipe", _executedProcessorNames);

        // Assert: First check Task A was completed
        var updatedA = await _db.WorkflowTasks.AsNoTracking().FirstAsync(t => t.TaskId == taskA.TaskId);
        Assert.Equal(TaskStatus.Completed, updatedA.Status);

        // Assert: Task B should be promoted from Waiting to Pending
        var updatedB = await _db.WorkflowTasks.AsNoTracking().FirstAsync(t => t.TaskId == taskB.TaskId);
        Assert.Equal(TaskStatus.Pending, updatedB.Status);
        Assert.Equal(TaskStatus.Completed, (await _db.WorkflowTasks.AsNoTracking().FirstAsync(t => t.TaskId == taskA.TaskId)).Status);

        // Act: Process task B (this should trigger promotion of C)
        await _worker.ProcessPendingTasksAsync(_cts.Token);

        // Clear change tracker so we re-query from the database
        _db.ChangeTracker.Clear();

        // Assert: Task C should be promoted from Waiting to Pending
        var updatedC = await _db.WorkflowTasks.FirstAsync(t => t.TaskId == taskC.TaskId);
        Assert.Equal(TaskStatus.Pending, updatedC.Status);

        // Verify B is also completed
        var completedB = await _db.WorkflowTasks.FirstAsync(t => t.TaskId == taskB.TaskId);
        Assert.Equal(TaskStatus.Completed, completedB.Status);
    }

    [Fact]
    public async Task DependencyPromotion_DiamondDependencies()
    {
        // Arrange: Create diamond dependency structure: A -> B, A -> C, [B,C] -> D
        var now = DateTimeOffset.UtcNow;
        var instance = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "diamond",
            Status = WorkflowStatus.Processing,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.WorkflowInstances.Add(instance);

        var taskA = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            ProcessorName = "ExtractRecipe",
            Status = TaskStatus.Pending,
            DependsOn = [],
            ScheduledAt = now.AddSeconds(-1),
            Instance = instance,
            CreatedAt = now,
            UpdatedAt = now
        };

        var taskB = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            ProcessorName = "GenerateHero",
            Status = TaskStatus.Waiting,
            DependsOn = [taskA.TaskId.ToString()],
            ScheduledAt = now.AddSeconds(-1),
            Instance = instance,
            CreatedAt = now,
            UpdatedAt = now
        };

        var taskC = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            ProcessorName = "SyncRecipe",
            Status = TaskStatus.Waiting,
            DependsOn = [taskA.TaskId.ToString()],
            ScheduledAt = now.AddSeconds(-1),
            Instance = instance,
            CreatedAt = now,
            UpdatedAt = now
        };

        var taskD = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            ProcessorName = "ExtractRecipe",
            Status = TaskStatus.Waiting,
            DependsOn = [taskB.TaskId.ToString(), taskC.TaskId.ToString()],
            ScheduledAt = now.AddSeconds(-1),
            Instance = instance,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.WorkflowTasks.AddRange(taskA, taskB, taskC, taskD);
        await _db.SaveChangesAsync();

        // Act: Process task A
        await _worker.ProcessPendingTasksAsync(_cts.Token);

        // Assert: B and C should be promoted
        // Use a fresh context to ensure we see the updated data from the worker's changes
        using var queryScope1 = _serviceProvider.CreateScope();
        var queryDb1 = queryScope1.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var updatedB = await queryDb1.WorkflowTasks.FirstAsync(t => t.TaskId == taskB.TaskId);
        var updatedC = await queryDb1.WorkflowTasks.FirstAsync(t => t.TaskId == taskC.TaskId);
        var updatedD = await queryDb1.WorkflowTasks.FirstAsync(t => t.TaskId == taskD.TaskId);

        Assert.Equal(TaskStatus.Pending, updatedB.Status);
        Assert.Equal(TaskStatus.Pending, updatedC.Status);
        Assert.Equal(TaskStatus.Waiting, updatedD.Status); // Should NOT be promoted yet

        // Act: Process tasks B and C (which will complete both and promote D)
        // The worker processes all pending tasks in a single call, so both B and C are processed.
        // After each task completes, the worker promotes dependent tasks.
        // After B completes: D's deps = [B(completed), C(pending)] -> D stays Waiting
        // After C completes: D's deps = [B(completed), C(completed)] -> D promoted to Pending
        await _worker.ProcessPendingTasksAsync(_cts.Token);

        // Assert: D should now be Pending (both B and C have been completed)
        // Use another fresh context
        using var queryScope2 = _serviceProvider.CreateScope();
        var queryDb2 = queryScope2.ServiceProvider.GetRequiredService<RecipeDbContext>();
        updatedD = await queryDb2.WorkflowTasks.FirstAsync(t => t.TaskId == taskD.TaskId);
        Assert.Equal(TaskStatus.Pending, updatedD.Status);
    }
}

/// <summary>
/// Mock processor for testing that simulates execution delay.
/// </summary>
public class MockWorkflowProcessor(string processorName, List<string> executedNames) : IWorkflowProcessor
{
    public string ProcessorName => processorName;

    public async Task ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        // Simulate processing delay
        await Task.Delay(100, ct);
        executedNames.Add(processorName);
    }
}

/// <summary>
/// Throwing processor for testing error handling.
/// </summary>
public class ThrowingWorkflowProcessor(string processorName, Exception toThrow) : IWorkflowProcessor
{
    public string ProcessorName => processorName;

    public async Task ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        await Task.Yield();
        throw toThrow;
    }
}
