using System.Text.Json;
using System.Data.Common;
using Microsoft.AspNetCore.Mvc;
using RecipeApi.Controllers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using RecipeApi.Services.Ai;
using RecipeApi.Workflow;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class WorkflowChildReceiptTests
{
    [Fact]
    public Task Start_CrashBeforeParentResult_RetryUsesSameChild() => CheckRetry(false);
    [Fact]
    public Task Search_CrashBeforeParentResult_RetryUsesOriginalFingerprint() => CheckRetry(true);

    internal static async Task CheckRetry(bool search, Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        await using var f = await Fixture.Create(search, configure);
        var first = JsonSerializer.Serialize(await f.Execute());
        // Child accepted, but parent completion/result has not been saved. A fresh
        // scope represents pickup after the process dies at that boundary.
        Assert.Null((await f.Db.WorkflowTasks.SingleAsync(x => x.TaskId == f.Parent.TaskId)).Result);
        await f.Storage.SaveAsync("workflows", f.ChildId + ".yaml", "invalid: [");
        var recipe = await f.Db.Recipes.SingleAsync();
        recipe.Name = "Later human content";
        await f.Db.SaveChangesAsync();
        await using var resumed = f.Read();
        var second = JsonSerializer.Serialize(await f.Execute(resumed));
        Assert.Equal(first, second);
        Assert.Single(await resumed.WorkflowInstances.Where(x => x.WorkflowId == f.ChildId).ToListAsync());
        if (search)
        {
            var child = await resumed.WorkflowInstances.SingleAsync(x => x.WorkflowId == f.ChildId);
            Assert.Contains(f.OriginalFingerprint, child.Parameters);
        }
    }

    [Theory]
    [InlineData(WorkflowStatus.Completed)]
    [InlineData(WorkflowStatus.Failed)]
    public Task ExplicitTerminalReset_StartsNewOccurrenceAndRetainsPriorReceipt(WorkflowStatus status) => CheckReset(status);

    internal static async Task CheckReset(WorkflowStatus status, Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        await using var f = await Fixture.Create(false, configure);
        await f.Execute();
        var prior = await f.Db.WorkflowChildIntents.AsNoTracking().SingleAsync();
        var parent = await f.Db.WorkflowInstances.SingleAsync(x => x.Id == f.Parent.InstanceId);
        parent.Status = status;
        f.Parent.Status = status == WorkflowStatus.Completed ? RecipeApi.Models.TaskStatus.Completed : RecipeApi.Models.TaskStatus.Failed;
        await f.Db.SaveChangesAsync();
        var config = new ConfigurationBuilder().Build();
        var controller = new WorkflowController(new SystemClock(), f.Orchestrator(f.Db), f.Db, new DemoModeOptions(config));
        Assert.IsType<OkObjectResult>(await controller.ResetTask(f.Parent.TaskId));
        Assert.Equal(status, parent.Status); // Existing terminal-parent reset contract.
        await f.Execute();
        Assert.Equal(2, await f.Db.WorkflowInstances.CountAsync(x => x.WorkflowId == f.ChildId));
        Assert.Equal(2, await f.Db.WorkflowChildIntents.CountAsync());
        var retained = await f.Db.WorkflowChildIntents.AsNoTracking().SingleAsync(x => x.Id == prior.Id);
        Assert.Equal(prior.Request, retained.Request);
        Assert.Equal(prior.Prepared, retained.Prepared);
        Assert.Equal(prior.AcceptedAt, retained.AcceptedAt);
    }

    [Fact]
    public Task FailedOriginalCapture_RetryRemainsInert() => CheckFailedCapture();
    internal static async Task CheckFailedCapture(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        await using var f = await Fixture.Create(false, configure);
        var definition = System.Text.Encoding.UTF8.GetString((await f.Storage.LoadAsync("workflows", "child.yaml"))!);
        await f.Storage.SaveAsync("workflows", "child.yaml", "invalid: [");
        await Assert.ThrowsAnyAsync<Exception>(() => f.Execute());
        var intent = await f.Db.WorkflowChildIntents.AsNoTracking().SingleAsync();
        Assert.Null(intent.Prepared);
        await f.Storage.SaveAsync("workflows", "child.yaml", definition!);
        await using var resumed = f.Read();
        await Assert.ThrowsAsync<InvalidDataException>(() => f.Execute(resumed));
        Assert.Empty(await resumed.WorkflowInstances.Where(x => x.WorkflowId == "child").ToListAsync());
        Assert.Equal(intent.Request, (await resumed.WorkflowChildIntents.SingleAsync()).Request);
    }

    [Fact]
    public Task LostAcceptanceAcknowledgement_ReadsCommittedChildAndReceipt() => CheckLostAck();
    internal static async Task CheckLostAck(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        var probe = new LostCommit();
        await using var f = await Fixture.Create(false, configure, probe);
        ((ObservingContext)f.Db).AfterChildSave = () =>
        {
            if (configure is null) throw new IOException("Synthetic lost in-memory acknowledgement");
            probe.Armed = true;
            return Task.CompletedTask;
        };
        var first = JsonSerializer.Serialize(await f.Execute());
        await using var resumed = f.Read();
        Assert.Equal(first, JsonSerializer.Serialize(await f.Execute(resumed)));
        var intent = await resumed.WorkflowChildIntents.SingleAsync();
        Assert.NotNull(intent.AcceptedAt);
        Assert.Single(await resumed.WorkflowInstances.Where(x => x.WorkflowId == "child").ToListAsync());
    }

    [Fact]
    public Task MissingAcceptedChild_IsNotReplaced() => CheckMissingChild();
    internal static async Task CheckMissingChild(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        await using var f = await Fixture.Create(false, configure);
        await f.Execute();
        var child = await f.Db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == "child");
        f.Db.WorkflowInstances.Remove(child); // Disposable synthetic history only.
        await f.Db.SaveChangesAsync();
        await using var resumed = f.Read();
        await Assert.ThrowsAsync<InvalidDataException>(() => f.Execute(resumed));
        Assert.Single(await resumed.WorkflowChildIntents.ToListAsync());
        Assert.Empty(await resumed.WorkflowInstances.Where(x => x.WorkflowId == "child").ToListAsync());
    }

    [Fact]
    public async Task PausedParent_CannotBypassDispatchFenceThroughReceiptReconciliation()
    {
        await using var f = await Fixture.Create(false);
        await f.Execute();
        var instance = await f.Db.WorkflowInstances.SingleAsync(x => x.Id == f.Parent.InstanceId);
        instance.Status = WorkflowStatus.Paused;
        await f.Db.SaveChangesAsync();
        await using var resumed = f.Read();
        await Assert.ThrowsAsync<InvalidDataException>(() => f.Execute(resumed));
        Assert.Single(await resumed.WorkflowChildIntents.ToListAsync());
    }

    [Fact]
    public Task PreparedCommandCrash_RetryUsesOriginalGraph() => CheckPreparedCrash();
    internal static async Task CheckPreparedCrash(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        var probe = new LostCommit();
        await using var f = await Fixture.Create(false, configure, probe);
        ((ObservingContext)f.Db).AfterPreparedSave = () =>
        {
            if (configure is null) throw new IOException("Synthetic crash after original preparation save");
            probe.Armed = true;
            return Task.CompletedTask;
        };
        await Assert.ThrowsAsync<IOException>(() => f.Execute());
        await f.Storage.SaveAsync("workflows", "child.yaml", "invalid: [");
        await using var resumed = f.Read();
        Assert.Empty(await resumed.WorkflowInstances.Where(x => x.WorkflowId == "child").ToListAsync());
        Assert.NotNull((await resumed.WorkflowChildIntents.SingleAsync()).Prepared);
        await f.Execute(resumed);
        Assert.Equal("original-child", (await resumed.WorkflowTasks.SingleAsync(x => x.InstanceId != f.Parent.InstanceId)).TaskName);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public Task WorkerPickup_AfterCrashCompletesParentFromOriginalReceipt(bool search) => CheckWorker(search);
    internal static async Task CheckWorker(bool search, Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        await using var f = await Fixture.Create(search, configure);
        var originalResult = JsonSerializer.Serialize(await f.Execute(), JsonDefaults.CamelCase);
        var child = await f.Db.WorkflowInstances.SingleAsync(x => x.WorkflowId == f.ChildId);
        child.Status = WorkflowStatus.Paused; // Child lifecycle remains independent of launch receipt.
        f.Parent.Status = RecipeApi.Models.TaskStatus.Pending; // Simulate stale Processing reclamation.
        await f.Db.SaveChangesAsync();
        await f.Storage.SaveAsync("workflows", f.ChildId + ".yaml", "invalid: [");
        Assert.Equal(1, await f.Pickup());
        await using var observer = f.Read();
        var completed = await observer.WorkflowTasks.SingleAsync(x => x.TaskId == f.Parent.TaskId);
        Assert.Equal(RecipeApi.Models.TaskStatus.Completed, completed.Status);
        Assert.True(System.Text.Json.Nodes.JsonNode.DeepEquals(System.Text.Json.Nodes.JsonNode.Parse(originalResult),
            System.Text.Json.Nodes.JsonNode.Parse(completed.Result!)));
        Assert.Single(await observer.WorkflowInstances.Where(x => x.WorkflowId == f.ChildId).ToListAsync());
    }

    internal static async Task CheckRollback(Action<DbContextOptionsBuilder<RecipeDbContext>> configure)
    {
        await using var f = await Fixture.Create(false, configure);
        ((ObservingContext)f.Db).AfterChildSave = async () =>
        {
            await using var observer = f.Read();
            Assert.Empty(await observer.WorkflowInstances.Where(x => x.WorkflowId == "child").ToListAsync());
            var intent = await observer.WorkflowChildIntents.SingleAsync();
            Assert.NotNull(intent.Prepared);
            Assert.Null(intent.AcceptedAt);
            throw new IOException("Synthetic precommit interruption");
        };
        await Assert.ThrowsAsync<IOException>(() => f.Execute());
        (await f.Db.Recipes.SingleAsync()).Name = "Unrelated later write";
        await f.Db.SaveChangesAsync();
        await using (var observer = f.Read())
        {
            Assert.Empty(await observer.WorkflowInstances.Where(x => x.WorkflowId == "child").ToListAsync());
            Assert.Null((await observer.WorkflowChildIntents.SingleAsync()).AcceptedAt);
        }
        await f.Storage.SaveAsync("workflows", "child.yaml", "invalid: [");
        await f.Execute();
        Assert.Single(await f.Db.WorkflowInstances.Where(x => x.WorkflowId == "child").ToListAsync());
    }

    private sealed class LostCommit : DbTransactionInterceptor
    {
        internal bool Armed;
        public override Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
        {
            if (Armed) { Armed = false; throw new IOException("Synthetic lost committed acknowledgement"); }
            return Task.CompletedTask;
        }
    }
    private sealed class ObservingContext(DbContextOptions<RecipeDbContext> options) : RecipeDbContext(options)
    {
        internal Func<Task>? AfterChildSave;
        internal Func<Task>? AfterPreparedSave;
        public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
        {
            var child = ChangeTracker.Entries<WorkflowInstance>().Any(x => x.State == EntityState.Added && x.Entity.WorkflowId == "child");
            var prepared = ChangeTracker.Entries<WorkflowChildIntent>().Any(x => x.State == EntityState.Modified && x.Entity.Prepared is not null && x.Entity.AcceptedAt is null);
            var count = await base.SaveChangesAsync(ct);
            if (prepared && AfterPreparedSave is { } callback) { AfterPreparedSave = null; await callback(); }
            if (child && AfterChildSave is { } hook) { AfterChildSave = null; await hook(); }
            return count;
        }
    }

    internal sealed class Fixture : IAsyncDisposable
    {
        internal RecipeDbContext Db = null!;
        internal WorkflowTask Parent = null!;
        internal InMemoryStorageProvider Storage = new();
        internal string ChildId = "child";
        internal string OriginalFingerprint = "";
        private DbContextOptions<RecipeDbContext> Options = null!;
        private bool Search;
        internal static async Task<Fixture> Create(bool search, Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null, DbTransactionInterceptor? interceptor = null)
        {
            var builder = new DbContextOptionsBuilder<RecipeDbContext>();
            if (configure is null) builder.UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning));
            else configure(builder);
            if (interceptor is not null) builder.AddInterceptors(interceptor);
            var f = new Fixture { Options = builder.Options, Search = search, ChildId = search ? "index-recipe-search" : "child" };
            f.Db = new ObservingContext(f.Options);
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Original", IsReady = true };
            f.Db.Recipes.Add(recipe);
            f.OriginalFingerprint = SearchFingerprintService.ComputeSourceFingerprint(recipe);
            await f.Storage.SaveAsync("workflows", f.ChildId + ".yaml", search ? """
                name: index-recipe-search
                parameters: [recipeId, fingerprint]
                tasks:
                  - name: original-index
                    processor: IndexRecipeSearch
                    payload:
                      recipeId: "{{recipeId}}"
                      fingerprint: "{{fingerprint}}"
                """ : """
                name: child
                parameters: []
                tasks:
                  - name: original-child
                    processor: Noop
                """);
            f.Parent = new WorkflowTask
            {
                TaskId = Guid.NewGuid(), InstanceId = Guid.NewGuid(), TaskName = "launch",
                ProcessorName = search ? "QueueRecipeSearchIndex" : "StartWorkflow",
                Payload = search ? JsonSerializer.Serialize(new { recipeId = recipe.Id }) : """{"workflowId":"child"}""",
                Status = RecipeApi.Models.TaskStatus.Processing,
                CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
            };
            var parent = new WorkflowInstance
            {
                Id = f.Parent.InstanceId, WorkflowId = "parent", Status = WorkflowStatus.Processing,
                Parameters = "{}", Tasks = [f.Parent], CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
            };
            await TestPublicationStore.Create(f.Db, f.Storage, new SystemClock()).CaptureLaunchAsync(parent);
            f.Db.WorkflowInstances.Add(parent);
            await f.Db.SaveChangesAsync();
            return f;
        }
        internal RecipeDbContext Read() => new(Options);
        internal WorkflowOrchestrator Orchestrator(RecipeDbContext db) => new(new SystemClock(), new WorkflowRepository(Storage), db,
            TestPublicationStore.Create(db, Storage, new SystemClock()));
        internal async Task<object?> Execute(RecipeDbContext? context = null)
        {
            var db = context ?? Db;
            var clock = new SystemClock();
            var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(Storage), db, TestPublicationStore.Create(db, Storage, clock));
            var task = await db.WorkflowTasks.SingleAsync(x => x.TaskId == Parent.TaskId);
            if (Search) return await new QueueRecipeSearchIndexProcessor(db, orchestrator).ExecuteAsync(task, default);
            var config = new ConfigurationBuilder().Build();
            var schedule = new CronScheduleCalculator(config);
            var processor = new WorkflowProcessor(orchestrator, schedule, clock, NullLogger<WorkflowProcessor>.Instance,
                new DemoWorkflowSeeder(db, orchestrator, new DemoModeOptions(config), schedule, clock, NullLogger<DemoWorkflowSeeder>.Instance));
            return await processor.ExecuteAsync(task, default);
        }
        internal async Task<int> Pickup()
        {
            var clock = new SystemClock();
            var services = new ServiceCollection();
            services.AddScoped(_ => new RecipeDbContext(Options));
            services.AddScoped<IWorkflowOrchestrator>(sp => Orchestrator(sp.GetRequiredService<RecipeDbContext>()));
            services.AddScoped<IWorkflowProcessor>(sp => Search
                ? new QueueRecipeSearchIndexProcessor(sp.GetRequiredService<RecipeDbContext>(), sp.GetRequiredService<IWorkflowOrchestrator>())
                : CreateStartProcessor(sp.GetRequiredService<RecipeDbContext>(), sp.GetRequiredService<IWorkflowOrchestrator>(), clock));
            await using var provider = services.BuildServiceProvider();
            using var worker = new WorkflowWorker(clock, provider.GetRequiredService<IServiceScopeFactory>(),
                NullLogger<WorkflowWorker>.Instance, new AiExceptionHandler(clock, NullLogger<AiExceptionHandler>.Instance),
                Microsoft.Extensions.Options.Options.Create(new WorkflowRetryOptions()));
            return await worker.ProcessPendingTasksAsync(default);
        }
        private static WorkflowProcessor CreateStartProcessor(RecipeDbContext db, IWorkflowOrchestrator orchestrator, IClock clock)
        {
            var config = new ConfigurationBuilder().Build();
            var schedule = new CronScheduleCalculator(config);
            return new WorkflowProcessor(orchestrator, schedule, clock, NullLogger<WorkflowProcessor>.Instance,
                new DemoWorkflowSeeder(db, orchestrator, new DemoModeOptions(config), schedule, clock, NullLogger<DemoWorkflowSeeder>.Instance));
        }
        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }
}
