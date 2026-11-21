using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using Moq;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class WorkflowLifecycleTests
{
    [Fact]
    public Task Clear_RetainsOriginalTaskFactsAndEveryChildOccurrenceBeforeRemovingExecutionRows() => CheckClear();

    internal static async Task CheckClear(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        var builder = new DbContextOptionsBuilder<RecipeDbContext>();
        if (configure is null) builder.UseInMemoryDatabase(Guid.NewGuid().ToString()).ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning));
        else configure(builder);
        await using var db = new RecipeDbContext(builder.Options);
        var now = DateTimeOffset.UtcNow;
        var workflow = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "url-import", Status = WorkflowStatus.Paused,
            Parameters = "{\"url\":\"https://example.test/original\"}", RecipePublicationCapture = "{\"original\":true}", CreatedAt = now, UpdatedAt = now };
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = workflow.Id, TaskName = "child",
            ProcessorName = "StartWorkflow", Payload = "{\"original\":true}", Status = RecipeApi.Models.TaskStatus.Failed,
            Result = "{\"accepted\":true}", ErrorMessage = "interrupted", StackTrace = "original trace", RetryCount = 3,
            DependsOn = [], CreatedAt = now, UpdatedAt = now };
        workflow.Tasks.Add(task);
        var prior = new WorkflowChildIntent { Id = Guid.NewGuid(), ParentTaskId = task.TaskId, Request = "{\"generation\":1}",
            RequestHash = "old-request", Prepared = null, CreatedAt = now };
        var selected = new WorkflowChildIntent { Id = Guid.NewGuid(), ParentTaskId = task.TaskId, Request = "{\"generation\":2}",
            RequestHash = "new-request", Prepared = "{\"graph\":true}", PreparedHash = "prepared", AcceptedAt = now, CreatedAt = now };
        task.ChildLaunchIntentId = selected.Id;
        db.WorkflowInstances.Add(workflow); db.WorkflowChildIntents.AddRange(prior, selected);
        db.RecipeRepairIntents.Add(new RecipeRepairIntent { Id = workflow.Id, RecipeId = Guid.NewGuid(), Payload = "{\"prepared\":null}", InputHash = "original", CreatedAt = now });
        await db.SaveChangesAsync();
        var service = new CaptureFailureService(db, Mock.Of<IClock>(x => x.UtcNow == now), Mock.Of<IWorkflowOrchestrator>());

        var result = await service.ClearAsync(workflow.Id);

        Assert.Equal(CaptureFailureClearResultKind.Cleared, result.Kind);
        Assert.Empty(db.WorkflowInstances); Assert.Empty(db.WorkflowTasks);
        var retained = await db.WorkflowLifecycleRecords.SingleAsync();
        Assert.Equal(workflow.Id, retained.Id); Assert.Equal(result.CleanupCommandId, retained.OperationId);
        Assert.Equal("cleared", retained.Disposition);
        using var json = JsonDocument.Parse(retained.Payload);
        var facts = json.RootElement.GetProperty("workflow");
        JsonEqual(workflow.RecipePublicationCapture, facts.GetProperty("recipePublicationCapture").GetString());
        var savedTask = Assert.Single(facts.GetProperty("tasks").EnumerateArray());
        Assert.Equal(task.ChildLaunchIntentId, savedTask.GetProperty("childLaunchIntentId").GetGuid());
        JsonEqual(task.Payload, savedTask.GetProperty("payload").GetString());
        JsonEqual(task.Result, savedTask.GetProperty("result").GetString());
        Assert.Equal(task.ErrorMessage, savedTask.GetProperty("errorMessage").GetString());
        Assert.Equal(task.StackTrace, savedTask.GetProperty("stackTrace").GetString());
        Assert.Equal(3, savedTask.GetProperty("retryCount").GetInt32());
        Assert.Equal(2, json.RootElement.GetProperty("childCommands").GetArrayLength());
        Assert.Equal(result.CleanupCommandId, json.RootElement.GetProperty("maintenanceCommand").GetProperty("id").GetGuid());
        Assert.Equal("pending", json.RootElement.GetProperty("maintenanceCommand").GetProperty("status").GetString());
        JsonEqual("{\"prepared\":null}", Assert.Single(json.RootElement.GetProperty("repairCommands").EnumerateArray()).GetProperty("payload").GetString());
        Assert.Equal(2, await db.WorkflowChildIntents.CountAsync());
        var payload = retained.Payload;
        Assert.Equal(CaptureFailureClearResultKind.NotFound, (await service.ClearAsync(workflow.Id)).Kind);
        Assert.Equal(payload, (await db.WorkflowLifecycleRecords.SingleAsync()).Payload);
        Assert.Single(db.MaintenanceCommands);
        await using var fresh = new RecipeDbContext(builder.Options);
        Assert.Empty(await fresh.WorkflowInstances.ToArrayAsync());
        JsonEqual(payload, (await fresh.WorkflowLifecycleRecords.SingleAsync()).Payload);
    }

    private static void JsonEqual(string? expected, string? actual)
    {
        using var first = JsonDocument.Parse(expected!);
        using var second = JsonDocument.Parse(actual!);
        Assert.True(JsonElement.DeepEquals(first.RootElement, second.RootElement));
    }

    [Fact]
    public Task RetiredImportIdentity_CannotBeAcceptedAgain() => CheckAdmission();

    internal static async Task CheckAdmission(Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        var builder = new DbContextOptionsBuilder<RecipeDbContext>();
        if (configure is null) builder.UseInMemoryDatabase(Guid.NewGuid().ToString()).ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning));
        else configure(builder);
        await using var db = new RecipeDbContext(builder.Options);
        var id = Guid.NewGuid(); var recipeId = Guid.NewGuid();
        db.Recipes.Add(new Recipe { Id = recipeId, Name = "Original" });
        db.WorkflowLifecycleRecords.Add(new WorkflowLifecycleRecord { Id = id, OperationId = Guid.NewGuid(),
            Disposition = "cleared", Payload = "{\"version\":1}", PayloadHash = "retained", CreatedAt = DateTimeOffset.UtcNow });
        await db.SaveChangesAsync();
        var storage = new InMemoryStorageProvider();
        await storage.SaveAsync("workflows", "url-import.yaml", """
            name: url-import
            parameters: [recipeId]
            tasks:
              - name: original
                processor: NoOp
            """);
        var clock = new SystemClock();
        var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db, TestPublicationStore.Create(db, storage, clock));
        await Assert.ThrowsAsync<InvalidDataException>(() => orchestrator.TriggerImportAsync(id, recipeId, "url-import", new() { ["recipeId"] = recipeId.ToString() }));
        Assert.Empty(await db.WorkflowInstances.ToArrayAsync());
        Assert.Single(await db.WorkflowLifecycleRecords.ToArrayAsync());
    }

    [Fact]
    public Task Prune_RetainsTerminalFactsButDoesNotRetireActiveOrRecentWork() => CheckPrune();

    internal static async Task CheckPrune(Func<Task<TestWebApplicationFactory>>? create = null)
    {
        await using var factory = await (create?.Invoke() ?? TestWebApplicationFactory.CreateAsync());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var now = scope.ServiceProvider.GetRequiredService<IClock>().UtcNow;
        foreach (var status in new[] { WorkflowStatus.Completed, WorkflowStatus.Failed, WorkflowStatus.Processing })
        {
            var instance = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = status.ToString(), Status = status,
                RecipePublicationCapture = null, CreatedAt = now.AddDays(-10), UpdatedAt = now.AddDays(-8) };
            instance.Tasks.Add(new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = instance.Id, TaskName = "original", ProcessorName = "NoOp",
                Payload = null, Result = status == WorkflowStatus.Completed ? "{\"observed\":true}" : null,
                Status = status == WorkflowStatus.Completed ? RecipeApi.Models.TaskStatus.Completed : RecipeApi.Models.TaskStatus.Failed,
                CreatedAt = instance.CreatedAt, UpdatedAt = instance.UpdatedAt });
            db.WorkflowInstances.Add(instance);
        }
        await db.SaveChangesAsync();
        var result = await scope.ServiceProvider.GetRequiredService<ManagementService>().PruneWorkflowsAsync(7);
        Assert.Equal(2, result.PrunedInstances);
        var records = await db.WorkflowLifecycleRecords.ToArrayAsync();
        Assert.Equal(2, records.Length);
        Assert.All(records, record =>
        {
            Assert.Equal("pruned", record.Disposition);
            using var json = JsonDocument.Parse(record.Payload);
            Assert.Equal("inert", json.RootElement.GetProperty("executionDisposition").GetString());
            Assert.Equal(JsonValueKind.Null, json.RootElement.GetProperty("workflow").GetProperty("recipePublicationCapture").ValueKind);
        });
        Assert.Equal(WorkflowStatus.Processing, (await db.WorkflowInstances.SingleAsync()).Status);
        Assert.Equal(0, (await scope.ServiceProvider.GetRequiredService<ManagementService>().PruneWorkflowsAsync(7)).PrunedInstances);
    }

    [Fact]
    public Task LegacyMaintenance_RetainsWorkflowFactsWhenClearDidNotRun() => CheckMaintenance();

    internal static async Task CheckMaintenance(Func<Task<TestWebApplicationFactory>>? create = null)
    {
        await using var factory = await (create?.Invoke() ?? TestWebApplicationFactory.CreateAsync());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var id = Guid.NewGuid();
        var workflow = new WorkflowInstance { Id = id, WorkflowId = "url-import", Status = WorkflowStatus.Paused };
        workflow.Tasks.Add(new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = id, TaskName = "failed", ProcessorName = "ExtractRecipe",
            Status = RecipeApi.Models.TaskStatus.Failed, ErrorMessage = "original failure", Payload = null, Result = null });
        var command = new MaintenanceCommand { Id = Guid.NewGuid(), CommandType = CaptureFailureService.DeleteFailedCaptureResidueCommand,
            Status = "pending", Payload = JsonSerializer.Serialize(new { workflowInstanceId = id }) };
        db.WorkflowInstances.Add(workflow); db.MaintenanceCommands.Add(command); await db.SaveChangesAsync();
        Assert.Equal(1, (await scope.ServiceProvider.GetRequiredService<ManagementService>().ProcessMaintenanceCommandsAsync()).Completed);
        Assert.Empty(db.WorkflowInstances);
        var retained = await db.WorkflowLifecycleRecords.SingleAsync();
        Assert.Equal(command.Id, retained.OperationId); Assert.Equal(id, retained.Id);
        Assert.Contains("original failure", retained.Payload);
        using var json = JsonDocument.Parse(retained.Payload);
        Assert.Equal(JsonValueKind.Null, Assert.Single(json.RootElement.GetProperty("workflow").GetProperty("tasks").EnumerateArray()).GetProperty("payload").ValueKind);
    }
}
