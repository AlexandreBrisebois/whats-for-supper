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

public class DreamingWorkflowSeederTests : IDisposable
{
    private readonly RecipeDbContext _db = TestDbContextFactory.Create();
    private readonly InMemoryStorageProvider _storage = new();
    private readonly FixedClock _clock = new(new DateTimeOffset(2026, 5, 9, 3, 0, 0, TimeSpan.Zero));

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public async Task SeedAsync_WhenNoDreamingIsActive_SchedulesFirstDreamingInstance()
    {
        // Arrange
        await SaveDreamingWorkflowAsync();
        var seeder = CreateSeeder();

        // Act
        await seeder.SeedAsync(CancellationToken.None);

        // Assert
        var instance = Assert.Single(_db.WorkflowInstances.Where(i => i.WorkflowId == "dreaming"));
        var task = Assert.Single(_db.WorkflowTasks.Where(t => t.InstanceId == instance.Id));
        Assert.Equal(TaskStatus.Pending, task.Status);
        Assert.Equal(new DateTimeOffset(2026, 5, 10, 3, 0, 0, TimeSpan.Zero), task.ScheduledAt);
    }

    [Fact]
    public async Task SeedAsync_WhenDreamingIsAlreadyPending_DoesNotCreateDuplicate()
    {
        // Arrange
        _db.WorkflowInstances.Add(new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "dreaming",
            Status = WorkflowStatus.Pending,
            CreatedAt = _clock.UtcNow,
            UpdatedAt = _clock.UtcNow
        });
        await _db.SaveChangesAsync();
        await SaveDreamingWorkflowAsync();
        var seeder = CreateSeeder();

        // Act
        await seeder.SeedAsync(CancellationToken.None);

        // Assert
        Assert.Single(_db.WorkflowInstances.Where(i => i.WorkflowId == "dreaming"));
    }

    private DreamingWorkflowSeeder CreateSeeder()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DREAMING_CRON_UTC"] = "0 3 * * *"
            })
            .Build();
        var orchestrator = new WorkflowOrchestrator(new WorkflowRepository(_storage), _db);

        return new DreamingWorkflowSeeder(
            _db,
            orchestrator,
            new CronScheduleCalculator(configuration),
            _clock,
            NullLogger<DreamingWorkflowSeeder>.Instance);
    }

    private async Task SaveDreamingWorkflowAsync()
    {
        var yaml = """
            name: dreaming
            parameters: []
            tasks:
              - name: prune
                processor: PruneWorkflows
            """;
        await _storage.SaveAsync("workflows", "dreaming.yaml", yaml);
    }

    private sealed class FixedClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow => now;
    }
}
