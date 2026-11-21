using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Data.Common;
using System.Text.Json;
using Moq;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Services;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed class WorkflowLifecyclePostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Clear_RetainsOriginalTaskFactsAndEveryChildOccurrence() =>
        Run(x => WorkflowLifecycleTests.CheckClear(x));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task RetiredImportIdentity_CannotBeAcceptedAgain() => Run(x => WorkflowLifecycleTests.CheckAdmission(x));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Prune_RetainsTerminalFactsAndLeavesActiveWork() => new TomorrowPushPostgresTests(output).WithDatabase(settings =>
        WorkflowLifecycleTests.CheckPrune(() => TomorrowPushPostgresTests.CreateFactory(settings)));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task LegacyMaintenance_RetainsWorkflowFacts() => new TomorrowPushPostgresTests(output).WithDatabase(settings =>
        WorkflowLifecycleTests.CheckMaintenance(() => TomorrowPushPostgresTests.CreateFactory(settings)));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Clear_RetentionFailureRollsBackEveryFactAndCannotResurrectOnLaterSave() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Disposable placeholder" };
            var workflow = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "url-import", Status = WorkflowStatus.Paused,
                Parameters = System.Text.Json.JsonSerializer.Serialize(new { recipeId = recipe.Id }) };
            workflow.Tasks.Add(new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = workflow.Id,
                TaskName = "failed", ProcessorName = "ExtractRecipe", Status = RecipeApi.Models.TaskStatus.Failed });
            db.Recipes.Add(recipe); db.WorkflowInstances.Add(workflow); await db.SaveChangesAsync();
            await db.Database.ExecuteSqlRawAsync("CREATE FUNCTION fail_retirement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic retention failure'; END $$; CREATE TRIGGER fail_retirement BEFORE INSERT ON workflow_lifecycle_records FOR EACH ROW EXECUTE FUNCTION fail_retirement()");
            await Assert.ThrowsAsync<DbUpdateException>(() => scope.ServiceProvider.GetRequiredService<CaptureFailureService>().ClearAsync(workflow.Id));
            await using (var read = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).Options))
            {
                Assert.NotNull(await read.WorkflowInstances.FindAsync(workflow.Id));
                Assert.Single(await read.WorkflowTasks.Where(x => x.InstanceId == workflow.Id).ToArrayAsync());
                Assert.Null((await read.Recipes.IgnoreQueryFilters().SingleAsync(x => x.Id == recipe.Id)).DeletedAt);
                Assert.Empty(await read.WorkflowLifecycleRecords.ToArrayAsync());
                Assert.Empty(await read.MaintenanceCommands.ToArrayAsync());
            }
            await db.Database.ExecuteSqlRawAsync("DROP TRIGGER fail_retirement ON workflow_lifecycle_records");
            db.FamilySettings.Add(new FamilySetting { Key = "unrelated-after-rollback", Value = System.Text.Json.JsonSerializer.SerializeToElement("retained") });
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
            Assert.NotNull(await db.WorkflowInstances.FindAsync(workflow.Id));
            Assert.Empty(await db.WorkflowLifecycleRecords.ToArrayAsync());
            Assert.Empty(await db.MaintenanceCommands.ToArrayAsync());
            Assert.Null((await db.Recipes.IgnoreQueryFilters().SingleAsync(x => x.Id == recipe.Id)).DeletedAt);
            Assert.Equal(CaptureFailureClearResultKind.Cleared, (await scope.ServiceProvider.GetRequiredService<CaptureFailureService>().ClearAsync(workflow.Id)).Kind);
        });

    private Task Run(Func<Action<DbContextOptionsBuilder<RecipeDbContext>>, Task> action) =>
        new TomorrowPushPostgresTests(output).WithDatabase(settings => action(builder => builder.UseNpgsql(settings.ConnectionString)));

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Prune_RetentionFailureCannotBeReappliedByLaterSave() => CheckFailedRemoval(false);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Maintenance_RetentionFailureCannotBeReappliedByFailureReporting() => CheckFailedRemoval(true);

    private Task CheckFailedRemoval(bool maintenance) => new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
    {
        await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var now = scope.ServiceProvider.GetRequiredService<IClock>().UtcNow;
        var workflow = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "url-import", Status = maintenance ? WorkflowStatus.Paused : WorkflowStatus.Failed,
            CreatedAt = now.AddDays(-10), UpdatedAt = now.AddDays(-8) };
        workflow.Tasks.Add(new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = workflow.Id, TaskName = "failed", ProcessorName = "ExtractRecipe",
            Status = RecipeApi.Models.TaskStatus.Failed, CreatedAt = workflow.CreatedAt, UpdatedAt = workflow.UpdatedAt });
        db.WorkflowInstances.Add(workflow);
        if (maintenance) db.MaintenanceCommands.Add(new MaintenanceCommand { Id = Guid.NewGuid(), Status = "pending",
            CommandType = CaptureFailureService.DeleteFailedCaptureResidueCommand,
            Payload = JsonSerializer.Serialize(new { workflowInstanceId = workflow.Id }) });
        await db.SaveChangesAsync();
        await db.Database.ExecuteSqlRawAsync("CREATE FUNCTION fail_retirement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic retention failure'; END $$; CREATE TRIGGER fail_retirement BEFORE INSERT ON workflow_lifecycle_records FOR EACH ROW EXECUTE FUNCTION fail_retirement()");
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        if (maintenance) Assert.Equal(1, (await service.ProcessMaintenanceCommandsAsync()).Failed);
        else await Assert.ThrowsAsync<DbUpdateException>(() => service.PruneWorkflowsAsync(7));
        await db.Database.ExecuteSqlRawAsync("DROP TRIGGER fail_retirement ON workflow_lifecycle_records");
        db.FamilySettings.Add(new FamilySetting { Key = "unrelated", Value = JsonSerializer.SerializeToElement("retained") });
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        Assert.NotNull(await db.WorkflowInstances.FindAsync(workflow.Id));
        Assert.Single(await db.WorkflowTasks.Where(x => x.InstanceId == workflow.Id).ToArrayAsync());
        Assert.Empty(await db.WorkflowLifecycleRecords.ToArrayAsync());
    });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Clear_LostAcknowledgementRetainsOneOriginalRemovalWithoutCompensation() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var lost = new LostCommit();
            var options = new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).AddInterceptors(lost).Options;
            await using var db = new RecipeDbContext(options);
            var workflow = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "url-import", Status = WorkflowStatus.Paused };
            workflow.Tasks.Add(new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = workflow.Id, TaskName = "failed", ProcessorName = "ExtractRecipe", Status = RecipeApi.Models.TaskStatus.Failed });
            db.WorkflowInstances.Add(workflow); await db.SaveChangesAsync();
            var service = new CaptureFailureService(db, new SystemClock(), Mock.Of<IWorkflowOrchestrator>());
            lost.Armed = true;
            await Assert.ThrowsAsync<IOException>(() => service.ClearAsync(workflow.Id));
            Assert.Equal(CaptureFailureClearResultKind.NotFound, (await service.ClearAsync(workflow.Id)).Kind);
            db.FamilySettings.Add(new FamilySetting { Key = "unrelated", Value = JsonSerializer.SerializeToElement("retained") });
            await db.SaveChangesAsync();
            await using var read = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).Options);
            Assert.Null(await read.WorkflowInstances.FindAsync(workflow.Id));
            var retained = await read.WorkflowLifecycleRecords.SingleAsync();
            Assert.Equal((await read.MaintenanceCommands.SingleAsync()).Id, retained.OperationId);
            Assert.Equal(workflow.Id, retained.Id);
        });

    private sealed class LostCommit : DbTransactionInterceptor
    {
        internal bool Armed;
        public override Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
        {
            if (Armed) { Armed = false; throw new IOException("Synthetic lost committed acknowledgement"); }
            return Task.CompletedTask;
        }
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Clear_DrainsTaskWritesAndRetainsTheFinalObservedOccurrence() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var options = new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).Options;
            await using var writer = new RecipeDbContext(options);
            var workflow = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "url-import", Status = WorkflowStatus.Paused };
            var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = workflow.Id, TaskName = "failed", ProcessorName = "ExtractRecipe",
                Result = "{\"observed\":1}", Status = RecipeApi.Models.TaskStatus.Failed };
            workflow.Tasks.Add(task); writer.WorkflowInstances.Add(workflow); await writer.SaveChangesAsync();
            await using var transaction = await writer.Database.BeginTransactionAsync();
            await writer.Database.ExecuteSqlAsync($"SELECT task_id FROM workflow_tasks WHERE task_id = {task.TaskId} FOR UPDATE");
            task.Result = "{\"observed\":2}"; task.ChildLaunchIntentId = Guid.NewGuid();
            await writer.SaveChangesAsync();
            await using var clearing = new RecipeDbContext(options);
            var clear = new CaptureFailureService(clearing, new SystemClock(), Mock.Of<IWorkflowOrchestrator>()).ClearAsync(workflow.Id);
            Assert.NotSame(clear, await Task.WhenAny(clear, Task.Delay(100)));
            await transaction.CommitAsync();
            Assert.Equal(CaptureFailureClearResultKind.Cleared, (await clear.WaitAsync(TimeSpan.FromSeconds(10))).Kind);
            await using var read = new RecipeDbContext(options);
            using var payload = JsonDocument.Parse((await read.WorkflowLifecycleRecords.SingleAsync()).Payload);
            var retained = Assert.Single(payload.RootElement.GetProperty("workflow").GetProperty("tasks").EnumerateArray());
            Assert.Equal(task.ChildLaunchIntentId, retained.GetProperty("childLaunchIntentId").GetGuid());
            using var expectedResult = JsonDocument.Parse(task.Result!);
            using var retainedResult = JsonDocument.Parse(retained.GetProperty("result").GetString()!);
            Assert.True(JsonElement.DeepEquals(expectedResult.RootElement, retainedResult.RootElement));
        });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Clear_ConcurrentOriginalAdmissionCannotRecreateTheRetiredIdentity() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var barrier = new CommitBarrier();
            var options = new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).Options;
            await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).AddInterceptors(barrier).Options);
            var recipe = new Recipe { Id = Guid.NewGuid(), IsReady = true };
            var workflow = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "url-import", Status = WorkflowStatus.Paused };
            workflow.Tasks.Add(new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = workflow.Id, TaskName = "failed", ProcessorName = "NoOp", Status = RecipeApi.Models.TaskStatus.Failed });
            db.Recipes.Add(recipe); db.WorkflowInstances.Add(workflow); await db.SaveChangesAsync();
            barrier.Armed = true;
            var clear = new CaptureFailureService(db, new SystemClock(), Mock.Of<IWorkflowOrchestrator>()).ClearAsync(workflow.Id);
            await barrier.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            try
            {
                await using var accepting = new RecipeDbContext(options);
                var storage = new InMemoryStorageProvider();
                await storage.SaveAsync("workflows", "url-import.yaml", """
                    name: url-import
                    parameters: [recipeId]
                    tasks:
                      - name: original
                        processor: NoOp
                    """);
                var clock = new SystemClock();
                var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), accepting,
                    RecipeApi.Tests.Infrastructure.TestPublicationStore.Create(accepting, storage, clock));
                var admit = orchestrator.TriggerImportAsync(workflow.Id, recipe.Id, "url-import", new() { ["recipeId"] = recipe.Id.ToString() });
                Assert.NotSame(admit, await Task.WhenAny(admit, Task.Delay(100)));
                barrier.Release.TrySetResult();
                Assert.Equal(CaptureFailureClearResultKind.Cleared, (await clear.WaitAsync(TimeSpan.FromSeconds(10))).Kind);
                await Assert.ThrowsAsync<InvalidDataException>(() => admit.WaitAsync(TimeSpan.FromSeconds(10)));
            }
            finally { barrier.Release.TrySetResult(); await clear; }
            await using var read = new RecipeDbContext(options);
            Assert.Empty(await read.WorkflowInstances.ToArrayAsync());
            Assert.Single(await read.WorkflowLifecycleRecords.ToArrayAsync());
        });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Clear_RetainsActualReadyJournalIndependentlyOfLaterRecipeCascade() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Disposable PDF", IsReady = false };
            db.Recipes.Add(recipe); await db.SaveChangesAsync();
            var repository = scope.ServiceProvider.GetRequiredService<RecipeRepository>();
            await repository.SaveInfoAsync(new RecipeInfo { Id = recipe.Id, Name = recipe.Name }, default);
            await scope.ServiceProvider.GetRequiredService<IStorageProvider>().SaveAsync("recipes", $"{recipe.Id}/original/source.pdf", "%PDF synthetic original");
            var workflow = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "url-import", Status = WorkflowStatus.Paused,
                Parameters = JsonSerializer.Serialize(new Dictionary<string, string> { ["recipeId"] = recipe.Id.ToString() }) };
            var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = workflow.Id, TaskName = "ready", ProcessorName = "RecipeReady",
                Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id }), Status = RecipeApi.Models.TaskStatus.Failed };
            workflow.Tasks.Add(task);
            var publications = scope.ServiceProvider.GetRequiredService<RecipeFilePublicationStore>();
            await publications.CaptureLaunchAsync(workflow); db.WorkflowInstances.Add(workflow); await db.SaveChangesAsync();
            Assert.True(await publications.CompleteReadinessAsync(task, recipe.Id));
            var original = await db.RecipeFilePublications.AsNoTracking().SingleAsync();
            Assert.True(original.Delivered);
            Assert.Equal(CaptureFailureClearResultKind.Cleared, (await scope.ServiceProvider.GetRequiredService<CaptureFailureService>().ClearAsync(workflow.Id)).Kind);
            db.Recipes.Remove(await db.Recipes.IgnoreQueryFilters().SingleAsync(x => x.Id == recipe.Id)); await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
            Assert.Empty(await db.RecipeFilePublications.ToArrayAsync());
            using var snapshot = JsonDocument.Parse((await db.WorkflowLifecycleRecords.SingleAsync()).Payload);
            var retained = Assert.Single(snapshot.RootElement.GetProperty("publications").EnumerateArray());
            Assert.Equal(original.InputHash, retained.GetProperty("inputHash").GetString());
            Assert.Equal(original.Payload, retained.GetProperty("payload").GetString());
            Assert.Equal(original.ResultHash, retained.GetProperty("resultHash").GetString());
            Assert.True(retained.GetProperty("delivered").GetBoolean());
            Assert.Equal(task.TaskId, retained.GetProperty("operationId").GetGuid());
        });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task Clear_DrainsActualReadinessPublicationAndRereadsRecipeBeforeMarkingDeletion() =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var barrier = new ReadinessCommitBarrier();
            var options = new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(settings.ConnectionString).Options;
            await using var publishing = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
                .UseNpgsql(settings.ConnectionString).AddInterceptors(barrier).Options);
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Disposable readiness race", Category = "Supper" };
            var workflow = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "url-import", Status = WorkflowStatus.Paused,
                Parameters = JsonSerializer.Serialize(new { recipeId = recipe.Id }) };
            workflow.Tasks.Add(new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = workflow.Id, TaskName = "failed",
                ProcessorName = "NoOp", Status = RecipeApi.Models.TaskStatus.Failed });
            publishing.Recipes.Add(recipe); publishing.WorkflowInstances.Add(workflow); await publishing.SaveChangesAsync();
            var storage = new InMemoryStorageProvider();
            await new RecipeRepository(storage).SaveInfoAsync(new RecipeInfo { Id = recipe.Id, Name = recipe.Name }, default);
            var readyTask = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = Guid.Empty, TaskName = "direct-ready",
                ProcessorName = "RecipeReady", Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id }) };
            var publication = RecipeApi.Tests.Infrastructure.TestPublicationStore.Create(publishing, storage, new SystemClock())
                .CompleteReadinessAsync(readyTask, recipe.Id);
            await barrier.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            await using var clearing = new RecipeDbContext(options);
            // This deliberately installs the old observed recipe in the clearing context.
            Assert.False((await clearing.Recipes.SingleAsync()).IsReady);
            var clear = new CaptureFailureService(clearing, new SystemClock(), Mock.Of<IWorkflowOrchestrator>()).ClearAsync(workflow.Id);
            try
            {
                Assert.NotSame(clear, await Task.WhenAny(clear, Task.Delay(100)));
            }
            finally { barrier.Release.TrySetResult(); }
            Assert.Equal(CaptureFailureClearResultKind.Cleared, (await clear.WaitAsync(TimeSpan.FromSeconds(10))).Kind);
            // Delivery may contend with Clear after publication commits, but readiness must remain visible.
            Assert.True(await publication.WaitAsync(TimeSpan.FromSeconds(10)));
            await using var read = new RecipeDbContext(options);
            var saved = await read.Recipes.IgnoreQueryFilters().SingleAsync(x => x.Id == recipe.Id);
            Assert.True(saved.IsReady);
            Assert.True(saved.IsDiscoverable);
            Assert.Null(saved.DeletedAt);
            Assert.Null(saved.DeleteNote);
            Assert.True((await read.RecipeFilePublications.SingleAsync()).Delivered);
            Assert.Single(await read.WorkflowLifecycleRecords.ToArrayAsync());
            Assert.Single(await read.MaintenanceCommands.ToArrayAsync());
        });

    private sealed class ReadinessCommitBarrier : DbTransactionInterceptor
    {
        internal TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        internal TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private bool entered;
        public override async ValueTask<InterceptionResult> TransactionCommittingAsync(DbTransaction transaction, TransactionEventData eventData,
            InterceptionResult result, CancellationToken cancellationToken = default)
        {
            if (!entered && eventData.Context!.ChangeTracker.Entries<RecipeFilePublication>().Any())
            {
                entered = true; Entered.TrySetResult();
                await Release.Task.WaitAsync(TimeSpan.FromSeconds(10), cancellationToken);
            }
            return result;
        }
    }

    private sealed class CommitBarrier : DbTransactionInterceptor
    {
        internal bool Armed;
        internal TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        internal TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override async ValueTask<InterceptionResult> TransactionCommittingAsync(DbTransaction transaction, TransactionEventData eventData,
            InterceptionResult result, CancellationToken cancellationToken = default)
        {
            if (Armed) { Armed = false; Entered.TrySetResult(); await Release.Task.WaitAsync(TimeSpan.FromSeconds(10), cancellationToken); }
            return result;
        }
    }
}
