using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

public class DemoWorkflowSeederTests : IDisposable
{
    private readonly RecipeDbContext _db = TestDbContextFactory.Create();
    private readonly InMemoryStorageProvider _storage = new();
    private readonly FixedClock _clock = new(new DateTimeOffset(2026, 5, 9, 3, 0, 0, TimeSpan.Zero));

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public async Task SeedAsync_WhenDemoModeDisabled_DoesNotScheduleRestore()
    {
        await SaveDemoRestoreWorkflowAsync();
        var seeder = CreateSeeder(demoMode: false);

        await seeder.SeedAsync(CancellationToken.None);

        Assert.Empty(_db.WorkflowInstances.Where(i => i.WorkflowId == "demo-restore"));
    }

    [Fact]
    public async Task SeedAsync_WhenDemoModeEnabled_SchedulesFirstRestore()
    {
        await SaveDemoRestoreWorkflowAsync();
        var seeder = CreateSeeder(demoMode: true);

        await seeder.SeedAsync(CancellationToken.None);

        var instance = Assert.Single(_db.WorkflowInstances.Where(i => i.WorkflowId == "demo-restore"));
        var task = Assert.Single(_db.WorkflowTasks.Where(t => t.InstanceId == instance.Id));
        Assert.Equal(TaskStatus.Pending, task.Status);
        Assert.Equal(new DateTimeOffset(2026, 5, 10, 3, 0, 0, TimeSpan.Zero), task.ScheduledAt);
    }

    [Fact]
    public async Task SeedAsync_WhenRestoreAlreadyPending_DoesNotCreateDuplicate()
    {
        _db.WorkflowInstances.Add(new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "demo-restore",
            Status = WorkflowStatus.Pending,
            CreatedAt = _clock.UtcNow,
            UpdatedAt = _clock.UtcNow
        });
        await _db.SaveChangesAsync();
        await SaveDemoRestoreWorkflowAsync();
        var seeder = CreateSeeder(demoMode: true);

        await seeder.SeedAsync(CancellationToken.None);

        Assert.Single(_db.WorkflowInstances.Where(i => i.WorkflowId == "demo-restore"));
    }

    private DemoWorkflowSeeder CreateSeeder(bool demoMode)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DEMO_MODE"] = demoMode ? "true" : "false",
                ["DEMO_RESTORE_CRON_UTC"] = "0 3 * * *"
            })
            .Build();
        var orchestrator = new WorkflowOrchestrator(new WorkflowRepository(_storage), _db);

        return new DemoWorkflowSeeder(
            _db,
            orchestrator,
            new DemoModeOptions(configuration),
            new CronScheduleCalculator(configuration),
            _clock,
            NullLogger<DemoWorkflowSeeder>.Instance);
    }

    private async Task SaveDemoRestoreWorkflowAsync()
    {
        var yaml = """
            name: demo-restore
            parameters: []
            tasks:
              - name: restore
                processor: RestoreDemoState
            """;
        await _storage.SaveAsync("workflows", "demo-restore.yaml", yaml);
    }

    private sealed class FixedClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow => now;
    }
}
