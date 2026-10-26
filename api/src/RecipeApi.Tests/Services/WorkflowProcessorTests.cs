using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class WorkflowProcessorTests : IDisposable
{
    private readonly InMemoryStorageProvider _storage = new();
    private readonly RecipeDbContext _db = TestDbContextFactory.Create();
    private readonly WorkflowOrchestrator _orchestrator;

    public WorkflowProcessorTests()
    {
        _orchestrator = new WorkflowOrchestrator(new RecipeApi.Services.SystemClock(), new WorkflowRepository(_storage), _db);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public async Task StartWorkflow_WithoutSchedule_TriggersImmediateWorkflow()
    {
        // Arrange
        await SaveWorkflowAsync("child");
        var processor = CreateProcessor();
        var task = new WorkflowTask
        {
            Payload = """
                {
                  "workflowId": "child"
                }
                """
        };

        // Act
        var result = await processor.ExecuteAsync(task, CancellationToken.None);

        // Assert
        var child = Assert.IsType<StartedWorkflowResult>(result);
        Assert.Equal("child", child.WorkflowId);
        Assert.Null(child.ScheduledAt);

        var childTask = Assert.Single(_db.WorkflowTasks);
        Assert.Equal(RecipeApi.Models.TaskStatus.Pending, childTask.Status);
        Assert.Null(childTask.ScheduledAt);
    }

    [Fact]
    public async Task StartWorkflow_WithCronSchedule_TriggersWorkflowWithScheduledRootTask()
    {
        // Arrange
        await SaveWorkflowAsync("dreaming");
        var processor = CreateProcessor(new Dictionary<string, string?>
        {
            ["DREAMING_CRON_UTC"] = "30 4 * * *"
        }, new DateTimeOffset(2026, 5, 9, 3, 0, 0, TimeSpan.Zero));
        var task = new WorkflowTask
        {
            Payload = """
                {
                  "workflowId": "dreaming",
                  "schedule": {
                    "cron": "${DREAMING_CRON_UTC:-0 3 * * *}"
                  }
                }
                """
        };

        // Act
        var result = await processor.ExecuteAsync(task, CancellationToken.None);

        // Assert
        var child = Assert.IsType<StartedWorkflowResult>(result);
        Assert.Equal("dreaming", child.WorkflowId);
        Assert.Equal(new DateTimeOffset(2026, 5, 9, 4, 30, 0, TimeSpan.Zero), child.ScheduledAt);

        var childTask = Assert.Single(_db.WorkflowTasks);
        Assert.Equal(RecipeApi.Models.TaskStatus.Pending, childTask.Status);
        Assert.Equal(child.ScheduledAt, childTask.ScheduledAt);
    }

    [Fact]
    public async Task Manual_demo_restore_does_not_start_recurrence_when_demo_is_disabled()
    {
        await SaveWorkflowAsync("demo-restore");
        var processor = CreateProcessor(new() { ["DEMO_MODE"] = "false" });
        await processor.ExecuteAsync(new WorkflowTask
        {
            InstanceId = Guid.NewGuid(), Payload = """{"workflowId":"demo-restore","schedule":{"cron":"0 3 * * *"}}"""
        }, CancellationToken.None);
        Assert.Empty(_db.WorkflowInstances);
    }

    [Fact]
    public async Task Retried_demo_successor_acceptance_keeps_one_future_occurrence()
    {
        await SaveWorkflowAsync("demo-restore");
        var processor = CreateProcessor(new() { ["DEMO_MODE"] = "true" });
        var task = new WorkflowTask
        {
            InstanceId = Guid.NewGuid(), Payload = """{"workflowId":"demo-restore","schedule":{"cron":"0 3 * * *"}}"""
        };
        await processor.ExecuteAsync(task, CancellationToken.None);
        await processor.ExecuteAsync(task, CancellationToken.None);
        Assert.Single(_db.WorkflowInstances);
    }

    private WorkflowProcessor CreateProcessor(
        Dictionary<string, string?>? configurationValues = null,
        DateTimeOffset? now = null)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configurationValues ?? [])
            .Build();
        var clock = new FixedClock(now ?? new DateTimeOffset(2026, 5, 9, 1, 0, 0, TimeSpan.Zero));

        return new WorkflowProcessor(
            _orchestrator,
            new CronScheduleCalculator(configuration),
            clock,
            NullLogger<WorkflowProcessor>.Instance,
            new DemoWorkflowSeeder(_db, _orchestrator, new DemoModeOptions(configuration), new CronScheduleCalculator(configuration), clock, NullLogger<DemoWorkflowSeeder>.Instance));
    }

    private async Task SaveWorkflowAsync(string workflowId)
    {
        var yaml = $"""
            name: {workflowId}
            parameters: []
            tasks:
              - name: child
                processor: {(workflowId == "demo-restore" ? "RestoreDemoState" : "Noop")}
            """;
        await _storage.SaveAsync("workflows", $"{workflowId}.yaml", yaml);
    }

    private sealed class FixedClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow => now;
    }
}
