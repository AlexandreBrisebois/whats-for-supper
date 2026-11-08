using System.Reflection;
using System.Data.Common;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using RecipeApi.Services.Ai;
using RecipeApi.Workflow;
using RecipeApi.Controllers;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

public sealed class WorkflowResetIntentTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public Task Reset_RetainsOriginalGenerationAndSelectedChild(bool terminal) => CheckLedger(terminal);

    internal static async Task CheckLedger(bool terminal, Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        await using var f = await WorkflowChildReceiptTests.Fixture.Create(false, configure);
        await f.Execute();
        f.Parent.Status = terminal ? TaskStatus.Completed : TaskStatus.Processing;
        f.Parent.Result = "{\"original\":true}";
        f.Parent.ErrorMessage = "original diagnostic";
        var instance = await f.Db.WorkflowInstances.SingleAsync(x => x.Id == f.Parent.InstanceId);
        instance.Status = WorkflowStatus.Completed;
        await f.Db.SaveChangesAsync();
        var original = await f.Db.WorkflowTasks.AsNoTracking().SingleAsync(x => x.TaskId == f.Parent.TaskId);
        Assert.IsType<OkObjectResult>(await Controller(f, f.Db).ResetTask(f.Parent.TaskId));
        var type = f.Db.Model.FindEntityType("RecipeApi.Models.WorkflowResetIntent");
        Assert.NotNull(type);
        var selected = Assert.IsType<Guid>(f.Db.Entry(f.Parent).Property("ResetIntentId").CurrentValue);
        var intent = await f.Db.FindAsync(type.ClrType, selected);
        Assert.NotNull(intent);
        var entry = f.Db.Entry(intent);
        Assert.NotNull(entry.Property("AppliedAt").CurrentValue);
        var request = Assert.IsType<string>(entry.Property("Request").CurrentValue);
        using var document = JsonDocument.Parse(request);
        var before = document.RootElement.GetProperty("Before");
        Assert.Equal(original.ChildLaunchIntentId, before.GetProperty("ChildLaunchIntentId").GetGuid());
        Assert.Equal(original.Result, before.GetProperty("Result").GetString());
        Assert.Equal(original.ErrorMessage, before.GetProperty("ErrorMessage").GetString());
        Assert.Equal(terminal ? null : original.ChildLaunchIntentId, f.Parent.ChildLaunchIntentId);
        Assert.Equal(WorkflowStatus.Completed, instance.Status);
        // Every explicit reset is retained; resetting Pending does not clear its
        // selected child or replace an earlier independent command.
        Assert.IsType<OkObjectResult>(await Controller(f, f.Db).ResetTask(f.Parent.TaskId));
        var next = Assert.IsType<Guid>(f.Db.Entry(f.Parent).Property("ResetIntentId").CurrentValue);
        Assert.NotEqual(selected, next);
        Assert.Equal(request, entry.Property("Request").CurrentValue);
        var nextIntent = await f.Db.FindAsync(type.ClrType, next);
        using var nextDoc = JsonDocument.Parse((string)f.Db.Entry(nextIntent!).Property("Request").CurrentValue!);
        Assert.Equal(selected, nextDoc.RootElement.GetProperty("Before").GetProperty("ResetIntentId").GetGuid());
    }

    [Theory]
    [InlineData("unchanged")]
    [InlineData("publication")]
    [InlineData("payload")]
    [InlineData("missingSelection")]
    [InlineData("missingTask")]
    [InlineData("retired")]
    public Task PendingOriginal_ResumesOnlyItsCapturedGeneration(string change) => CheckPending(change);

    internal static async Task CheckPending(string change, Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        var interruption = new RejectResetApplication();
        await using var f = await WorkflowChildReceiptTests.Fixture.Create(false, b =>
        {
            if (configure is null) b.UseInMemoryDatabase(Guid.NewGuid().ToString()).ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning));
            else configure(b);
            b.AddInterceptors(interruption);
        });
        await f.Execute();
        f.Parent.Status = TaskStatus.Failed;
        f.Parent.Result = "{\"retained\":true}";
        await f.Db.SaveChangesAsync();
        var before = await f.Db.WorkflowTasks.AsNoTracking().SingleAsync(x => x.TaskId == f.Parent.TaskId);
        interruption.Armed = true;
        await Assert.ThrowsAsync<IOException>(() => Controller(f, f.Db).ResetTask(f.Parent.TaskId));
        var type = f.Db.Model.FindEntityType("RecipeApi.Models.WorkflowResetIntent");
        Assert.NotNull(type);
        // A failed application must be reloaded before unrelated later saves.
        (await f.Db.Recipes.SingleAsync()).Name = "Later human name";
        await f.Db.SaveChangesAsync();
        await using var restarted = f.Read();
        var saved = await restarted.WorkflowTasks.SingleAsync(x => x.TaskId == f.Parent.TaskId);
        Assert.Equal(TaskStatus.Failed, saved.Status);
        Assert.Equal(before.ChildLaunchIntentId, saved.ChildLaunchIntentId);
        if (change == "publication") restarted.RecoveryPublications.Add(new RecoveryPublication { OperationId = Guid.NewGuid(), SnapshotId = Guid.NewGuid() });
        if (change == "payload") saved.Payload = "{\"workflowId\":\"different\"}";
        if (change == "missingTask") restarted.WorkflowTasks.Remove(saved);
        if (change == "retired") restarted.WorkflowLifecycleRecords.Add(new WorkflowLifecycleRecord
        {
            Id = saved.InstanceId, OperationId = Guid.NewGuid(), Disposition = "pruned", Payload = "{}", PayloadHash = "synthetic retirement fence", CreatedAt = DateTimeOffset.UtcNow
        });
        if (change == "missingSelection")
        {
            var intent = await restarted.WorkflowResetIntents.SingleAsync();
            var json = JsonNode.Parse(intent.Request)!.AsObject();
            json["Before"]!.AsObject().Remove("ResetIntentId");
            intent.Request = json.ToJsonString();
            intent.RequestHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes((string)typeof(CanonicalRecipeContentStore).GetMethod("NormalizeJson", BindingFlags.NonPublic | BindingFlags.Static)!.Invoke(null, [intent.Request])!)));
        }
        await restarted.SaveChangesAsync();
        // Today's child definition is unusable: reset recovery must not read it.
        await f.Storage.SaveAsync("workflows", "child.yaml", "invalid: [");
        Assert.Equal(change == "unchanged" ? 1 : 0, await Reconcile(restarted));
        Assert.Equal(0, await Reconcile(restarted));
        if (change == "missingTask")
        {
            Assert.Empty(await restarted.WorkflowTasks.Where(x => x.TaskId == f.Parent.TaskId).ToListAsync());
            Assert.Null((await restarted.WorkflowResetIntents.SingleAsync()).AppliedAt);
            return;
        }
        await restarted.Entry(saved).ReloadAsync();
        Assert.Equal(change == "unchanged" ? TaskStatus.Pending : TaskStatus.Failed, saved.Status);
        Assert.Equal(change == "unchanged" ? null : before.ChildLaunchIntentId, saved.ChildLaunchIntentId);
        Assert.Equal(before.Result, saved.Result);
    }

    [Fact]
    public Task PendingReset_ReaperCannotChangeItsOriginalProcessingSnapshot() => CheckPendingReaper();

    internal static async Task CheckPendingReaper(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        var interruption = new RejectResetApplication();
        await using var f = await WorkflowChildReceiptTests.Fixture.Create(false, b =>
        {
            if (configure is null) b.UseInMemoryDatabase(Guid.NewGuid().ToString()).ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning));
            else configure(b);
            b.AddInterceptors(interruption);
        });
        f.Parent.UpdatedAt = DateTimeOffset.UtcNow.AddHours(-2);
        await f.Db.SaveChangesAsync();
        interruption.Armed = true;
        await Assert.ThrowsAsync<IOException>(() => Controller(f, f.Db).ResetTask(f.Parent.TaskId));
        var services = new ServiceCollection();
        services.AddScoped(_ => f.Read());
        await using var provider = services.BuildServiceProvider();
        var clock = new SystemClock();
        using var worker = new WorkflowWorker(clock, provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<WorkflowWorker>.Instance, new AiExceptionHandler(clock, NullLogger<AiExceptionHandler>.Instance),
            Options.Create(new WorkflowRetryOptions()));
        await (Task)typeof(WorkflowWorker).GetMethod("ReapStaleTasksAsync", BindingFlags.NonPublic | BindingFlags.Instance)!.Invoke(worker, [CancellationToken.None])!;
        await using var read = f.Read();
        var original = await read.WorkflowTasks.SingleAsync(x => x.TaskId == f.Parent.TaskId);
        Assert.Equal(TaskStatus.Processing, original.Status);
        Assert.Equal(0, original.RetryCount);
        Assert.Equal(1, await Reconcile(read));
    }

    [Fact]
    public Task Worker_ReconcilesResetBeforeDispatch() => CheckWorker();

    internal static async Task CheckWorker(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        var interruption = new RejectResetApplication();
        await using var f = await WorkflowChildReceiptTests.Fixture.Create(false, b =>
        {
            if (configure is null) b.UseInMemoryDatabase(Guid.NewGuid().ToString()).ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning));
            else configure(b);
            b.AddInterceptors(interruption);
        });
        f.Parent.Status = TaskStatus.Failed;
        await f.Db.SaveChangesAsync();
        interruption.Armed = true;
        await Assert.ThrowsAsync<IOException>(() => Controller(f, f.Db).ResetTask(f.Parent.TaskId));
        Assert.Equal(1, await f.Pickup());
        await using var read = f.Read();
        var reset = await read.WorkflowResetIntents.SingleAsync();
        Assert.NotNull(reset.AppliedAt);
        var task = await read.WorkflowTasks.SingleAsync(x => x.TaskId == f.Parent.TaskId);
        Assert.Equal(reset.Id, task.ResetIntentId);
        Assert.Equal(TaskStatus.Completed, task.Status);
        Assert.NotNull(task.ChildLaunchIntentId);
        var child = await read.WorkflowChildIntents.SingleAsync(x => x.Id == task.ChildLaunchIntentId);
        using var request = JsonDocument.Parse(child.Request);
        Assert.Equal(reset.Id, request.RootElement.GetProperty("ResetIntentId").GetGuid());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public Task LostAcknowledgement_ReadsOriginalRequestOrAppliedReceipt(bool application) => CheckLostAcknowledgement(application);

    internal static async Task CheckLostAcknowledgement(bool application, Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        var lost = new LostCommit();
        var probe = new SaveObservation();
        await using var f = await WorkflowChildReceiptTests.Fixture.Create(false, b =>
        {
            if (configure is null) b.UseInMemoryDatabase(Guid.NewGuid().ToString()).ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning));
            else configure(b);
            b.AddInterceptors(probe);
        }, lost);
        f.Parent.Status = TaskStatus.Failed;
        await f.Db.SaveChangesAsync();
        probe.AfterSave = applying =>
        {
            if (applying != application) return;
            probe.AfterSave = null;
            if (configure is null) throw new IOException("Synthetic lost reset acknowledgement");
            lost.Armed = true;
        };
        if (application) Assert.IsType<OkObjectResult>(await Controller(f, f.Db).ResetTask(f.Parent.TaskId));
        else
        {
            await Assert.ThrowsAsync<IOException>(() => Controller(f, f.Db).ResetTask(f.Parent.TaskId));
            await using var read = f.Read();
            Assert.Null((await read.WorkflowResetIntents.SingleAsync()).AppliedAt);
            Assert.Equal(TaskStatus.Failed, (await read.WorkflowTasks.SingleAsync()).Status);
            Assert.IsType<OkObjectResult>(await Controller(f, f.Db).ResetTask(f.Parent.TaskId));
        }
        await using var final = f.Read();
        Assert.NotNull((await final.WorkflowResetIntents.SingleAsync()).AppliedAt);
        Assert.Equal(TaskStatus.Pending, (await final.WorkflowTasks.SingleAsync()).Status);
        Assert.Equal(0, await Reconcile(final));
    }

    [Fact]
    public Task MalformedPendingOriginal_FencesOtherwiseExecutableTask() => CheckMalformed();

    internal static async Task CheckMalformed(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        var interruption = new RejectResetApplication();
        await using var f = await WorkflowChildReceiptTests.Fixture.Create(false, b =>
        {
            if (configure is null) b.UseInMemoryDatabase(Guid.NewGuid().ToString()).ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning));
            else configure(b);
            b.AddInterceptors(interruption);
        });
        f.Parent.Status = TaskStatus.Pending;
        await f.Db.SaveChangesAsync();
        interruption.Armed = true;
        await Assert.ThrowsAsync<IOException>(() => Controller(f, f.Db).ResetTask(f.Parent.TaskId));
        var intent = await f.Db.WorkflowResetIntents.SingleAsync();
        intent.RequestHash = "unqualified original";
        await f.Db.SaveChangesAsync();
        Assert.Equal(0, await f.Pickup());
        await using var read = f.Read();
        Assert.Null((await read.WorkflowResetIntents.SingleAsync()).AppliedAt);
        Assert.Equal(TaskStatus.Pending, (await read.WorkflowTasks.SingleAsync()).Status);
        Assert.Empty(await read.WorkflowChildIntents.ToListAsync());
    }

    private sealed class LostCommit : DbTransactionInterceptor
    {
        internal bool Armed;
        public override Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken ct = default)
        {
            if (Armed) { Armed = false; throw new IOException("Synthetic lost committed reset acknowledgement"); }
            return Task.CompletedTask;
        }
    }

    private sealed class SaveObservation : SaveChangesInterceptor
    {
        internal Action<bool>? AfterSave;
        private bool? application;
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData data, InterceptionResult<int> result, CancellationToken ct = default)
        {
            application = data.Context!.ChangeTracker.Entries<WorkflowResetIntent>()
                .Where(x => x.State is EntityState.Added or EntityState.Modified).Select(x => (bool?)(x.Entity.AppliedAt is not null)).SingleOrDefault();
            return ValueTask.FromResult(result);
        }
        public override ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData data, int result, CancellationToken ct = default)
        {
            if (application is { } applying) AfterSave?.Invoke(applying);
            return ValueTask.FromResult(result);
        }
    }

    internal static async Task<int> Reconcile(RecipeDbContext db)
    {
        var type = typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.WorkflowReset");
        Assert.NotNull(type);
        var method = type.GetMethod("ReconcilePendingAsync", BindingFlags.Public | BindingFlags.Static);
        Assert.NotNull(method);
        return await (Task<int>)method.Invoke(null, [db, new SystemClock(), CancellationToken.None])!;
    }

    private static WorkflowController Controller(WorkflowChildReceiptTests.Fixture f, RecipeDbContext db) =>
        new(new SystemClock(), f.Orchestrator(db), db, new DemoModeOptions(new ConfigurationManager()));

    private sealed class RejectResetApplication : SaveChangesInterceptor
    {
        internal bool Armed;
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData data, InterceptionResult<int> result, CancellationToken ct = default)
        {
            if (Armed && data.Context!.ChangeTracker.Entries<WorkflowTask>().Any(x => x.State == EntityState.Modified && x.Entity.Status == TaskStatus.Pending))
            { Armed = false; throw new IOException("Synthetic reset application interruption"); }
            return ValueTask.FromResult(result);
        }
    }
}
