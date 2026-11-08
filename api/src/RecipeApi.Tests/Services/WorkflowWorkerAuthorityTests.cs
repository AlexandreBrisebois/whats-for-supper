using System.Collections.Concurrent;
using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using RecipeApi.Controllers;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Ai;
using RecipeApi.Tests.Integration;
using RecipeApi.Workflow;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

public sealed partial class WorkflowWorkerAuthorityTests
{
    [Fact]
    public Task PausedWorkflow_DoesNotDispatchOrRewritePendingTask() =>
        CheckPickupAsync(Memory(), WorkflowStatus.Paused, "AuthorityProbe", false);

    [Theory]
    [InlineData(WorkflowStatus.Pending)]
    [InlineData(WorkflowStatus.Processing)]
    public Task ActiveWorkflow_DispatchesDueTask(WorkflowStatus status) =>
        CheckPickupAsync(Memory(), status, "AuthorityProbe", true);

    [Theory]
    [InlineData("UrlCaptureInitialization")]
    [InlineData("RecipeFollowupInitialization")]
    public Task InitializationPlaceholder_CannotBecomeProcessorWorkByStatusReset(string processor) =>
        CheckPickupAsync(Memory(), WorkflowStatus.Processing, processor, false);

    internal static async Task CheckPickupAsync(Action<DbContextOptionsBuilder> configure,
        WorkflowStatus status, string processor, bool executes)
    {
        await using var fixture = new Fixture(configure, processor);
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, status, processor);
        await db.SaveChangesAsync();
        // Compare committed facts; PostgreSQL owns JSONB representation.
        var before = Snapshot(await db.WorkflowTasks.AsNoTracking().Include(t => t.Instance)
            .SingleAsync(t => t.TaskId == task.TaskId));
        if (db.Database.IsRelational())
        {
            // Exercise the raw PostgreSQL owner directly: the worker's fallback
            // must not hide a malformed locking query as a passing database test.
            var query = typeof(WorkflowWorker).GetMethod("QueryBatchWithSkipLocked", BindingFlags.NonPublic | BindingFlags.Static)!;
            var selected = await (Task<List<WorkflowTask>>)query.Invoke(null, [db, fixture.Clock.UtcNow, Array.Empty<Guid>(), CancellationToken.None])!;
            Assert.Equal(executes ? new[] { task.TaskId } : [], selected.Select(t => t.TaskId).ToArray());
        }
        var picked = await fixture.Worker.ProcessPendingTasksAsync(default);
        await using var read = fixture.CreateDb();
        var saved = await read.WorkflowTasks.Include(t => t.Instance).SingleAsync(t => t.TaskId == task.TaskId);
        if (executes)
        {
            Assert.Equal(1, picked);
            Assert.Equal(new[] { task.TaskId }, fixture.Executed.ToArray());
            Assert.Equal(TaskStatus.Completed, saved.Status);
        }
        else
        {
            Assert.Equal(0, picked);
            Assert.Empty(fixture.Executed);
            Assert.Equal(before, Snapshot(saved));
        }
    }

    [Theory]
    [InlineData("paused")]
    [InlineData("processing-task")]
    [InlineData("future")]
    public Task ThrottleWait_RereadsExecutionEligibility(string change) =>
        CheckThrottleAsync(Memory(), change);

    internal static async Task CheckThrottleAsync(Action<DbContextOptionsBuilder> configure, string change)
    {
        await using var fixture = new Fixture(configure, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var first = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
        var waiting = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
        first.ScheduledAt = fixture.Clock.UtcNow.AddMinutes(-2);
        await db.SaveChangesAsync();
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        fixture.OnExecute = async task =>
        {
            if (task.TaskId != first.TaskId) return;
            entered.TrySetResult();
            await release.Task.WaitAsync(TimeSpan.FromSeconds(10));
        };
        var throttles = (Dictionary<string, SemaphoreSlim>)typeof(WorkflowWorker)
            .GetField("_processorThrottles", BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(fixture.Worker)!;
        throttles.Add("AuthorityProbe", new SemaphoreSlim(1, 1));
        var processing = fixture.Worker.ProcessPendingTasksAsync(default);
        string before;
        try
        {
            await entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            await using var update = fixture.CreateDb();
            var selected = await update.WorkflowTasks.Include(t => t.Instance).SingleAsync(t => t.TaskId == waiting.TaskId);
            if (change == "processing-task") selected.Status = TaskStatus.Processing;
            else if (change == "future") selected.ScheduledAt = fixture.Clock.UtcNow.AddHours(1);
            else selected.Instance.Status = WorkflowStatus.Paused;
            await update.SaveChangesAsync();
            before = Snapshot(selected);
        }
        finally
        {
            release.TrySetResult();
            await processing;
        }
        await using var read = fixture.CreateDb();
        var saved = await read.WorkflowTasks.Include(t => t.Instance).SingleAsync(t => t.TaskId == waiting.TaskId);
        Assert.Equal(new[] { first.TaskId }, fixture.Executed.ToArray());
        Assert.Equal(before, Snapshot(saved));
    }

    [Fact]
    public Task Completion_PreservesParentPausedDuringProcessorExecution() =>
        CheckConcurrentPauseAsync(Memory());

    internal static async Task CheckConcurrentPauseAsync(Action<DbContextOptionsBuilder> configure)
    {
        await using var fixture = new Fixture(configure, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
        await db.SaveChangesAsync();
        fixture.OnExecute = async _ =>
        {
            await using var pause = fixture.CreateDb();
            var instance = await pause.WorkflowInstances.SingleAsync(i => i.Id == task.InstanceId);
            instance.Status = WorkflowStatus.Paused;
            await pause.SaveChangesAsync();
        };
        await fixture.Worker.ProcessPendingTasksAsync(default);
        await using var read = fixture.CreateDb();
        Assert.Equal(TaskStatus.Completed, (await read.WorkflowTasks.SingleAsync(t => t.TaskId == task.TaskId)).Status);
        Assert.Equal(WorkflowStatus.Paused, (await read.WorkflowInstances.SingleAsync(i => i.Id == task.InstanceId)).Status);
    }

    [Theory]
    [InlineData(WorkflowStatus.Completed)]
    [InlineData(WorkflowStatus.Failed)]
    public Task ExplicitReset_RetainsExistingTerminalParentExecution(WorkflowStatus status) =>
        CheckResetAsync(Memory(), status);

    internal static async Task CheckResetAsync(Action<DbContextOptionsBuilder> configure, WorkflowStatus status)
    {
        await using var fixture = new Fixture(configure, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, status, "AuthorityProbe");
        task.Status = status == WorkflowStatus.Completed ? TaskStatus.Completed : TaskStatus.Failed;
        await db.SaveChangesAsync();
        Assert.Equal(0, await fixture.Worker.ProcessPendingTasksAsync(default));
        var controller = new WorkflowController(fixture.Clock, Mock.Of<IWorkflowOrchestrator>(), db,
            new DemoModeOptions(new ConfigurationManager()));
        Assert.IsType<OkObjectResult>(await controller.ResetTask(task.TaskId));
        await using var before = fixture.CreateDb();
        Assert.Equal(status, (await before.WorkflowInstances.SingleAsync(i => i.Id == task.InstanceId)).Status);
        Assert.Equal(1, await fixture.Worker.ProcessPendingTasksAsync(default));
        Assert.Equal(new[] { task.TaskId }, fixture.Executed.ToArray());
        await using var after = fixture.CreateDb();
        Assert.Equal(TaskStatus.Completed, (await after.WorkflowTasks.SingleAsync(t => t.TaskId == task.TaskId)).Status);
    }

    [Fact]
    public Task FreshAttempt_RefreshesStalenessTimestampBeforeProcessorDispatch() => CheckFreshAttemptAsync(Memory());

    internal static async Task CheckFreshAttemptAsync(Action<DbContextOptionsBuilder> configure)
    {
        await using var fixture = new Fixture(configure, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
        task.UpdatedAt = fixture.Clock.UtcNow.AddHours(-2);
        await db.SaveChangesAsync();
        DateTimeOffset? startedAt = null;
        TaskStatus? stateAfterReaping = null;
        fixture.OnExecute = async _ =>
        {
            await using var started = fixture.CreateDb();
            startedAt = (await started.WorkflowTasks.AsNoTracking().SingleAsync(t => t.TaskId == task.TaskId)).UpdatedAt;
            var reap = typeof(WorkflowWorker).GetMethod("ReapStaleTasksAsync", BindingFlags.NonPublic | BindingFlags.Instance)!;
            await (Task)reap.Invoke(fixture.Worker, [CancellationToken.None])!;
            stateAfterReaping = (await started.WorkflowTasks.AsNoTracking().SingleAsync(t => t.TaskId == task.TaskId)).Status;
        };
        await fixture.Worker.ProcessPendingTasksAsync(default);
        Assert.Equal(fixture.Clock.UtcNow, startedAt);
        Assert.Equal(TaskStatus.Processing, stateAfterReaping);
        await using var read = fixture.CreateDb();
        var saved = await read.WorkflowTasks.SingleAsync(t => t.TaskId == task.TaskId);
        Assert.Equal(TaskStatus.Completed, saved.Status);
        Assert.Equal(0, saved.RetryCount);
    }

    private static Action<DbContextOptionsBuilder> Memory()
    {
        var name = Guid.NewGuid().ToString();
        return b => b.UseInMemoryDatabase(name);
    }

    private static string Snapshot(WorkflowTask task) => JsonSerializer.Serialize(new
    {
        task.TaskId, task.InstanceId, task.TaskName, task.ProcessorName, task.Payload,
        task.Status, task.DependsOn, task.RetryCount, task.ScheduledAt, task.ErrorMessage,
        task.StackTrace, task.Result, task.CreatedAt, task.UpdatedAt,
        Instance = new { task.Instance.Id, task.Instance.WorkflowId, task.Instance.Status,
            task.Instance.Parameters, task.Instance.RecipePublicationCapture,
            task.Instance.CreatedAt, task.Instance.UpdatedAt }
    });

    private sealed class Fixture : IAsyncDisposable
    {
        private readonly ServiceProvider services;
        public DeploymentCalendarIntegrationTests.CalendarClock Clock { get; } = new()
        {
            UtcNow = new DateTimeOffset(2026, 11, 8, 8, 0, 0, TimeSpan.Zero)
        };
        public ConcurrentQueue<Guid> Executed { get; } = new();
        public Func<WorkflowTask, Task>? OnExecute { get; set; }
        public Func<WorkflowTask, object?> Result { get; set; } = task => new { Executed = task.TaskId };
        public WorkflowWorker Worker { get; }

        public Fixture(Action<DbContextOptionsBuilder> configure, string processor)
        {
            var collection = new ServiceCollection();
            collection.AddDbContext<RecipeDbContext>(configure);
            collection.AddSingleton<IWorkflowProcessor>(new Probe(processor, this));
            services = collection.BuildServiceProvider();
            Worker = new WorkflowWorker(Clock, services.GetRequiredService<IServiceScopeFactory>(),
                NullLogger<WorkflowWorker>.Instance,
                new AiExceptionHandler(Clock, NullLogger<AiExceptionHandler>.Instance),
                Options.Create(new WorkflowRetryOptions()));
        }

        public RecipeDbContext CreateDb() => new(services.GetRequiredService<DbContextOptions<RecipeDbContext>>());

        public async Task<WorkflowTask> AddAsync(RecipeDbContext db, WorkflowStatus status, string processor, Guid? recipeId = null)
        {
            var instance = new WorkflowInstance
            {
                Id = Guid.NewGuid(), WorkflowId = "authority-probe", Status = status,
                Parameters = recipeId is { } id ? JsonSerializer.Serialize(new { recipeId = id.ToString() }) : "{}",
                CreatedAt = Clock.UtcNow, UpdatedAt = Clock.UtcNow
            };
            var task = new WorkflowTask
            {
                TaskId = Guid.NewGuid(), InstanceId = instance.Id, Instance = instance,
                TaskName = "probe", ProcessorName = processor, Payload = "{}",
                Status = TaskStatus.Pending, ScheduledAt = Clock.UtcNow.AddMinutes(-1),
                CreatedAt = Clock.UtcNow, UpdatedAt = Clock.UtcNow,
                ErrorMessage = "retained prior error", StackTrace = "retained stack", Result = "{\"prior\":true}"
            };
            db.WorkflowTasks.Add(task);
            var storage = new InMemoryStorageProvider();
            if (recipeId is { } storedId)
                await storage.SaveAsync("recipes", $"{storedId}/recipe.info",
                    JsonSerializer.Serialize(new RecipeInfo { Id = storedId }, JsonDefaults.CamelCase));
            await TestPublicationStore.Create(db, storage, Clock).CaptureLaunchAsync(instance);
            return task;
        }

        public async ValueTask DisposeAsync()
        {
            Worker.Dispose();
            await services.DisposeAsync();
        }

        private sealed class Probe(string name, Fixture owner) : IWorkflowProcessor
        {
            public string ProcessorName => name;
            public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
            {
                owner.Executed.Enqueue(task.TaskId);
                if (owner.OnExecute is not null) await owner.OnExecute(task);
                return owner.Result(task);
            }
        }
    }
}
