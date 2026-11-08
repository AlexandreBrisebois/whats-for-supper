using System.Reflection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Moq;
using Npgsql;
using RecipeApi.Controllers;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

public sealed partial class WorkflowWorkerAuthorityTests
{
    [Fact]
    public Task ConcurrentPickup_OnlyOneProcessorOwnsThePendingTask() => CheckConcurrentExecutionAsync(Memory());

    internal static async Task CheckConcurrentExecutionAsync(Action<DbContextOptionsBuilder> configure)
    {
        var barrier = new ProcessingBarrier();
        await using var fixture = new Fixture(b => { configure(b); b.AddInterceptors(barrier); }, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
        await db.SaveChangesAsync();
        barrier.Armed = true;
        var first = fixture.Worker.ProcessPendingTasksAsync(default);
        try
        {
            await barrier.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            // First pickup has read Pending but not committed Processing. A second
            // pickup must finish without dispatching the same original command.
            await fixture.Worker.ProcessPendingTasksAsync(default).WaitAsync(TimeSpan.FromSeconds(10));
            Assert.Empty(fixture.Executed);
        }
        finally
        {
            barrier.Release.TrySetResult();
            await first;
        }
        Assert.Equal(new[] { task.TaskId }, fixture.Executed.ToArray());
        await using var read = fixture.CreateDb();
        Assert.Equal(TaskStatus.Completed, (await read.WorkflowTasks.SingleAsync(x => x.TaskId == task.TaskId)).Status);
    }

    [Fact]
    public Task LiveProcessor_OldTimestampIsNotAnAbandonedAttempt() => CheckLiveReaperAsync(Memory());

    internal static async Task CheckLiveReaperAsync(Action<DbContextOptionsBuilder> configure)
    {
        await using var fixture = new Fixture(configure, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
        await db.SaveChangesAsync();
        fixture.OnExecute = async _ =>
        {
            fixture.Clock.UtcNow = fixture.Clock.UtcNow.AddHours(1);
            await ReapAsync(fixture.Worker);
            await using var read = fixture.CreateDb();
            var live = await read.WorkflowTasks.SingleAsync(x => x.TaskId == task.TaskId);
            Assert.Equal(TaskStatus.Processing, live.Status);
            Assert.Equal(0, live.RetryCount);
            Assert.Equal(0, await fixture.Worker.ProcessPendingTasksAsync(default));
        };
        await fixture.Worker.ProcessPendingTasksAsync(default);
        await using var after = fixture.CreateDb();
        Assert.Equal(TaskStatus.Completed, (await after.WorkflowTasks.SingleAsync(x => x.TaskId == task.TaskId)).Status);
        Assert.Equal(new[] { task.TaskId }, fixture.Executed.ToArray());
    }

    [Fact]
    public Task ResetDuringExecution_DrainsOldAttemptBeforeCreatingPendingWork() => CheckExecutingResetAsync(Memory());

    internal static async Task CheckExecutingResetAsync(Action<DbContextOptionsBuilder> configure)
    {
        await using var fixture = new Fixture(configure, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
        await db.SaveChangesAsync();
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        fixture.OnExecute = async _ => { entered.TrySetResult(); await release.Task.WaitAsync(TimeSpan.FromSeconds(10)); };
        var running = fixture.Worker.ProcessPendingTasksAsync(default);
        Task<IActionResult>? reset = null;
        await using var resetDb = fixture.CreateDb();
        try
        {
            await entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            // A stale tracked row must also be refreshed after the execution wait.
            await resetDb.WorkflowTasks.SingleAsync(x => x.TaskId == task.TaskId);
            var controller = new WorkflowController(fixture.Clock, Mock.Of<IWorkflowOrchestrator>(), resetDb,
                new DemoModeOptions(new ConfigurationManager()));
            reset = controller.ResetTask(task.TaskId);
            var completed = await Task.WhenAny(reset, Task.Delay(150));
            Assert.NotSame(reset, completed);
        }
        finally
        {
            release.TrySetResult();
            await running;
            if (reset is not null) Assert.IsType<OkObjectResult>(await reset);
        }
        await using var read = fixture.CreateDb();
        Assert.Equal(TaskStatus.Pending, (await read.WorkflowTasks.SingleAsync(x => x.TaskId == task.TaskId)).Status);
        fixture.OnExecute = null;
        await fixture.Worker.ProcessPendingTasksAsync(default);
        Assert.Equal(new[] { task.TaskId, task.TaskId }, fixture.Executed.ToArray());
    }

    private static Task ReapAsync(WorkflowWorker worker) => (Task)typeof(WorkflowWorker)
        .GetMethod("ReapStaleTasksAsync", BindingFlags.NonPublic | BindingFlags.Instance)!
        .Invoke(worker, [CancellationToken.None])!;

    [Theory]
    [InlineData("CaptureDemoState", false)]
    [InlineData("RestoreDemoState", false)]
    [InlineData("CaptureDemoState", true)]
    public Task RecoveryProcessorReset_DoesNotWaitUnderAWriteLease(string processor, bool demo) =>
        CheckRecoveryResetAsync(Memory(), processor, demo);

    internal static async Task CheckRecoveryResetAsync(Action<DbContextOptionsBuilder> configure, string processor, bool demo)
    {
        await using var fixture = new Fixture(configure, processor);
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, processor);
        await db.SaveChangesAsync();
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        fixture.OnExecute = async _ => { entered.TrySetResult(); await release.Task.WaitAsync(TimeSpan.FromSeconds(10)); };
        var running = fixture.Worker.ProcessPendingTasksAsync(default);
        Task<IActionResult>? reset = null;
        await using var resetDb = fixture.CreateDb();
        try
        {
            await entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            var config = new ConfigurationManager { ["DEMO_MODE"] = demo.ToString() };
            var controller = new WorkflowController(fixture.Clock, Mock.Of<IWorkflowOrchestrator>(), resetDb,
                new DemoModeOptions(config)) { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };
            reset = controller.ResetTask(task.TaskId);
            var completed = await Task.WhenAny(reset, Task.Delay(200));
            Assert.Same(reset, completed);
            var response = Assert.IsType<ObjectResult>(await reset);
            Assert.Equal(demo ? 403 : 503, response.StatusCode);
            if (!demo) Assert.Equal("5", controller.Response.Headers.RetryAfter);
            await using var read = fixture.CreateDb();
            Assert.Equal(TaskStatus.Processing, (await read.WorkflowTasks.SingleAsync(x => x.TaskId == task.TaskId)).Status);
        }
        finally
        {
            release.TrySetResult();
            await running;
            if (reset is not null) await reset;
        }
    }

    internal static async Task CheckExternalLeaseAsync(string connectionString, bool abandoned)
    {
        await using var fixture = new Fixture(b => b.UseNpgsql(connectionString), "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
        if (abandoned)
        {
            task.Status = TaskStatus.Processing;
            task.UpdatedAt = fixture.Clock.UtcNow.AddHours(-2);
        }
        await db.SaveChangesAsync();
        var baseline = await db.WorkflowTasks.AsNoTracking().SingleAsync(x => x.TaskId == task.TaskId);
        await using (var owner = new NpgsqlConnection(new NpgsqlConnectionStringBuilder(connectionString) { Pooling = false }.ConnectionString))
        {
            await owner.OpenAsync();
            await using var hold = new NpgsqlCommand("SELECT pg_advisory_lock(hashtextextended(@identity, 0))", owner);
            hold.Parameters.AddWithValue("identity", "workflow-execution:" + task.TaskId.ToString("D"));
            await hold.ExecuteNonQueryAsync();
            if (abandoned) await ReapAsync(fixture.Worker);
            else await fixture.Worker.ProcessPendingTasksAsync(default);
            await using var read = fixture.CreateDb();
            var saved = await read.WorkflowTasks.SingleAsync(x => x.TaskId == task.TaskId);
            Assert.Equal(abandoned ? TaskStatus.Processing : TaskStatus.Pending, saved.Status);
            Assert.Equal(0, saved.RetryCount);
            Assert.Empty(fixture.Executed);
        }
        // Closing the owning session releases its lock. Only a now-unowned stale
        // attempt is reclaimable, with its saved command/result/child intact.
        if (abandoned)
        {
            await ReapAsync(fixture.Worker);
            await using var read = fixture.CreateDb();
            var saved = await read.WorkflowTasks.SingleAsync(x => x.TaskId == task.TaskId);
            Assert.Equal(TaskStatus.Pending, saved.Status);
            Assert.Equal(1, saved.RetryCount);
            Assert.Equal(baseline.Payload, saved.Payload);
            Assert.Equal(baseline.Result, saved.Result);
            Assert.Equal(baseline.ChildLaunchIntentId, saved.ChildLaunchIntentId);
        }
        fixture.OnExecute = async _ =>
        {
            await using var observer = new NpgsqlConnection(connectionString);
            await observer.OpenAsync();
            await using var check = new NpgsqlCommand("SELECT pg_try_advisory_lock(hashtextextended(@identity, 0))", observer);
            check.Parameters.AddWithValue("identity", "workflow-execution:" + task.TaskId.ToString("D"));
            Assert.Equal(false, await check.ExecuteScalarAsync());
        };
        await fixture.Worker.ProcessPendingTasksAsync(default);
        await using var after = fixture.CreateDb();
        Assert.Equal(TaskStatus.Completed, (await after.WorkflowTasks.SingleAsync(x => x.TaskId == task.TaskId)).Status);
        Assert.Equal(new[] { task.TaskId }, fixture.Executed.ToArray());
        await using var released = new NpgsqlConnection(new NpgsqlConnectionStringBuilder(connectionString) { Pooling = false }.ConnectionString);
        await released.OpenAsync();
        await using var unlocked = new NpgsqlCommand("SELECT pg_try_advisory_lock(hashtextextended(@identity, 0))", released);
        unlocked.Parameters.AddWithValue("identity", "workflow-execution:" + task.TaskId.ToString("D"));
        Assert.Equal(true, await unlocked.ExecuteScalarAsync());
    }

    private sealed class ProcessingBarrier : SaveChangesInterceptor
    {
        public bool Armed { get; set; }
        private int calls;
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData data,
            InterceptionResult<int> result, CancellationToken ct = default)
        {
            if (Armed && data.Context!.ChangeTracker.Entries<WorkflowTask>()
                .Any(x => x.State == EntityState.Modified && x.Entity.Status == TaskStatus.Processing)
                && Interlocked.Increment(ref calls) == 1)
            {
                Entered.TrySetResult();
                await Release.Task.WaitAsync(TimeSpan.FromSeconds(10), ct);
            }
            return result;
        }
    }
}
