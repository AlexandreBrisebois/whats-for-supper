using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

public sealed partial class WorkflowWorkerAuthorityTests
{
    [Theory]
    [InlineData("missing")]
    [InlineData("malformed")]
    [InlineData("parameters")]
    [InlineData("workflow")]
    [InlineData("payload")]
    [InlineData("processor")]
    [InlineData("name")]
    [InlineData("dependencies")]
    [InlineData("sibling-payload")]
    [InlineData("removed-sibling")]
    public Task Dispatch_RefusesMissingOrDivergentOriginalAuthorityWithoutRewritingFacts(string mutation) =>
        CheckDispatchAuthorityAsync(Memory(), mutation);

    internal static async Task CheckDispatchAuthorityAsync(Action<DbContextOptionsBuilder> configure, string mutation)
    {
        await using var fixture = new Fixture(configure, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
        var instance = task.Instance;
        // Capture the complete original aggregate, including a non-runnable sibling.
        var sibling = new WorkflowTask
        {
            TaskId = Guid.NewGuid(), InstanceId = instance.Id, Instance = instance,
            TaskName = "later", ProcessorName = "AuthorityProbe", Payload = "{}", Status = TaskStatus.Waiting
        };
        db.WorkflowTasks.Add(sibling);
        instance.RecipePublicationCapture = null;
        await TestPublicationStore.Create(db, new InMemoryStorageProvider(), fixture.Clock).CaptureLaunchAsync(instance);
        switch (mutation)
        {
            case "missing": instance.RecipePublicationCapture = null; break;
            case "malformed": instance.RecipePublicationCapture = "{}"; break;
            case "parameters": instance.Parameters = """{"new":"intent"}"""; break;
            case "workflow": instance.WorkflowId = "different"; break;
            case "payload": task.Payload = """{"new":"intent"}"""; break;
            case "processor": task.ProcessorName = "UnacceptedProcessor"; break;
            case "name": task.TaskName = "changed"; break;
            case "dependencies": task.DependsOn = ["later"]; break;
            case "sibling-payload": sibling.Payload = """{"new":"intent"}"""; break;
            case "removed-sibling": db.WorkflowTasks.Remove(sibling); break;
        }
        await db.SaveChangesAsync();
        await using var before = fixture.CreateDb();
        var baseline = Snapshot(await before.WorkflowTasks.AsNoTracking().Include(x => x.Instance)
            .SingleAsync(x => x.TaskId == task.TaskId));
        await fixture.Worker.ProcessPendingTasksAsync(default);
        await using var read = fixture.CreateDb();
        Assert.Empty(fixture.Executed);
        Assert.Equal(baseline, Snapshot(await read.WorkflowTasks.Include(x => x.Instance)
            .SingleAsync(x => x.TaskId == task.TaskId)));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public Task WriterDispatch_RequiresCurrentFullLaunch(bool historical) => CheckWriterAuthorityAsync(Memory(), historical);

    internal static async Task CheckWriterAuthorityAsync(Action<DbContextOptionsBuilder> configure, bool historical)
    {
        await using var fixture = new Fixture(configure, "ExtractRecipe");
        await using var db = fixture.CreateDb();
        var recipe = new Recipe { Name = "Original writer intent" };
        db.Recipes.Add(recipe); await db.SaveChangesAsync();
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "ExtractRecipe", recipe.Id);
        if (historical)
        {
            using var current = JsonDocument.Parse(task.Instance.RecipePublicationCapture!);
            var capture = current.RootElement.GetProperty("capture").Clone();
            var tasks = current.RootElement.GetProperty("tasks").Clone();
            // Old v1 retained records have a valid hash but lack full parameter authority.
            object? Sort(JsonElement value) => value.ValueKind switch
            {
                JsonValueKind.Object => value.EnumerateObject().OrderBy(x => x.Name, StringComparer.Ordinal)
                    .ToDictionary(x => x.Name, x => Sort(x.Value)),
                JsonValueKind.Array => value.EnumerateArray().Select(Sort).ToArray(),
                _ => value.Clone()
            };
            var bytes = System.Text.Encoding.UTF8.GetBytes(JsonSerializer.Serialize(Sort(
                JsonSerializer.SerializeToElement(new { capture, tasks }))));
            var inputHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(bytes));
            task.Instance.RecipePublicationCapture = JsonSerializer.Serialize(new { capture, tasks, inputHash });
            var validate = typeof(RecipeFilePublicationStore).GetMethod("ValidateRecoveryLaunch", BindingFlags.NonPublic | BindingFlags.Static)!;
            validate.Invoke(null, [task.Instance, true]); // Historical retention remains supported.
        }
        await db.SaveChangesAsync();
        var baseline = Snapshot(await db.WorkflowTasks.AsNoTracking().Include(x => x.Instance).SingleAsync(x => x.TaskId == task.TaskId));
        await fixture.Worker.ProcessPendingTasksAsync(default);
        await using var read = fixture.CreateDb();
        var saved = await read.WorkflowTasks.Include(x => x.Instance).SingleAsync(x => x.TaskId == task.TaskId);
        if (historical)
        {
            Assert.Empty(fixture.Executed);
            Assert.Equal(baseline, Snapshot(saved));
        }
        else
        {
            Assert.Equal(new[] { task.TaskId }, fixture.Executed.ToArray());
            Assert.Equal(TaskStatus.Completed, saved.Status);
        }
    }

    [Fact]
    public Task ReclaimedHistoricalWork_DoesNotAcquireExecutionAuthority() => CheckReclaimedAuthorityAsync(Memory());

    internal static async Task CheckReclaimedAuthorityAsync(Action<DbContextOptionsBuilder> configure)
    {
        await using var fixture = new Fixture(configure, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
        task.Instance.RecipePublicationCapture = null;
        task.Status = TaskStatus.Processing; task.UpdatedAt = fixture.Clock.UtcNow.AddHours(-2);
        await db.SaveChangesAsync();
        var reap = typeof(WorkflowWorker).GetMethod("ReapStaleTasksAsync", BindingFlags.NonPublic | BindingFlags.Instance)!;
        await (Task)reap.Invoke(fixture.Worker, [CancellationToken.None])!;
        await using var before = fixture.CreateDb();
        var reclaimed = await before.WorkflowTasks.AsNoTracking().Include(x => x.Instance).SingleAsync(x => x.TaskId == task.TaskId);
        Assert.Equal(TaskStatus.Pending, reclaimed.Status); Assert.Equal(1, reclaimed.RetryCount);
        var baseline = Snapshot(reclaimed);
        await fixture.Worker.ProcessPendingTasksAsync(default);
        await using var read = fixture.CreateDb();
        Assert.Empty(fixture.Executed);
        Assert.Equal(baseline, Snapshot(await read.WorkflowTasks.Include(x => x.Instance).SingleAsync(x => x.TaskId == task.TaskId)));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public Task RefusedHistoricalBatch_DoesNotStarveCurrentAcceptedWork(bool missing) =>
        CheckRefusedBatchAsync(Memory(), missing);

    internal static async Task CheckRefusedBatchAsync(Action<DbContextOptionsBuilder> configure, bool missing)
    {
        await using var fixture = new Fixture(configure, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var refused = new List<Guid>();
        for (var index = 0; index < 10; index++)
        {
            var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
            task.ScheduledAt = fixture.Clock.UtcNow.AddMinutes(-2);
            if (missing) task.Instance.RecipePublicationCapture = null;
            else task.Payload = "{\"changed\":true}";
            refused.Add(task.TaskId);
        }
        var accepted = new List<Guid>();
        for (var index = 0; index < 12; index++)
            accepted.Add((await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe")).TaskId);
        await db.SaveChangesAsync();
        await using var before = fixture.CreateDb();
        var baseline = (await before.WorkflowTasks.AsNoTracking().Include(x => x.Instance)
            .Where(x => refused.Contains(x.TaskId)).ToListAsync()).ToDictionary(x => x.TaskId, Snapshot);
        if (db.Database.IsRelational())
        {
            // Exercise a nonempty UUID exclusion array in the raw SQL owner:
            // successful provider fallback must not hide a broken later-page query.
            var query = typeof(WorkflowWorker).GetMethod("QueryBatchWithSkipLocked", BindingFlags.NonPublic | BindingFlags.Static)!;
            var selected = await (Task<List<WorkflowTask>>)query.Invoke(null,
                [db, fixture.Clock.UtcNow, refused.ToArray(), CancellationToken.None])!;
            Assert.Equal(10, selected.Count);
            Assert.All(selected, task => Assert.Contains(task.TaskId, accepted));
        }
        Assert.Equal(10, await fixture.Worker.ProcessPendingTasksAsync(default));
        Assert.Equal(10, fixture.Executed.Count);
        Assert.Equal(2, await fixture.Worker.ProcessPendingTasksAsync(default));
        Assert.Equal(accepted.Order(), fixture.Executed.Order());
        await using var read = fixture.CreateDb();
        foreach (var task in await read.WorkflowTasks.Include(x => x.Instance).Where(x => refused.Contains(x.TaskId)).ToListAsync())
            Assert.Equal(baseline[task.TaskId], Snapshot(task));
    }

    [Fact]
    public Task Dispatch_RefusesParameterChangeWhileWaitingForThrottle() => CheckDispatchThrottleAsync(Memory());

    internal static async Task CheckDispatchThrottleAsync(Action<DbContextOptionsBuilder> configure)
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
            if (task.TaskId == first.TaskId)
            { entered.TrySetResult(); await release.Task.WaitAsync(TimeSpan.FromSeconds(10)); }
        };
        var throttles = (Dictionary<string, SemaphoreSlim>)typeof(WorkflowWorker)
            .GetField("_processorThrottles", BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(fixture.Worker)!;
        throttles.Add("AuthorityProbe", new SemaphoreSlim(1, 1));
        var processing = fixture.Worker.ProcessPendingTasksAsync(default);
        string baseline;
        try
        {
            await entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            await using var change = fixture.CreateDb();
            var instance = await change.WorkflowInstances.SingleAsync(x => x.Id == waiting.InstanceId);
            instance.Parameters = """{"new":"intent"}""";
            await change.SaveChangesAsync();
            baseline = Snapshot(await change.WorkflowTasks.AsNoTracking().Include(x => x.Instance)
                .SingleAsync(x => x.TaskId == waiting.TaskId));
        }
        finally { release.TrySetResult(); await processing; }
        await using var read = fixture.CreateDb();
        Assert.Equal(new[] { first.TaskId }, fixture.Executed.ToArray());
        Assert.Equal(baseline, Snapshot(await read.WorkflowTasks.Include(x => x.Instance)
            .SingleAsync(x => x.TaskId == waiting.TaskId)));
    }
}
