using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Ai;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

public class WorkflowWorkerReaperTests
{
    private readonly RecipeApi.Tests.Integration.DeploymentCalendarIntegrationTests.CalendarClock _clock = new() { UtcNow = new DateTimeOffset(2026, 10, 12, 12, 0, 0, TimeSpan.Zero) };

    [Theory]
    [InlineData(-1, true)]
    [InlineData(0, false)]
    [InlineData(1, false)]
    public async Task ZombieReaper_ShouldReclaimOnlyStrictlyStaleTasks(int cutoffTicks, bool reclaimed)
    {
        // Arrange
        var services = new ServiceCollection();
        var dbName = $"ZombieReaperTest_{Guid.NewGuid():N}";
        services.AddDbContext<RecipeDbContext>(opts => opts.UseInMemoryDatabase(dbName));
        services.AddLogging();

        var serviceProvider = services.BuildServiceProvider();
        var db = serviceProvider.GetRequiredService<RecipeDbContext>();
        var scopeFactory = serviceProvider.GetRequiredService<IServiceScopeFactory>();

        var testWorker = new WorkflowWorker(
            _clock, scopeFactory,
            new Mock<ILogger<WorkflowWorker>>().Object, 
            new AiExceptionHandler(_clock, new Mock<ILogger<AiExceptionHandler>>().Object),
            Options.Create(new WorkflowRetryOptions()));

        var now = _clock.UtcNow;
        var staleTime = now.AddMinutes(-15).AddTicks(cutoffTicks);
        
        var instance = new WorkflowInstance 
        { 
            Id = Guid.NewGuid(), 
            WorkflowId = "zombie", 
            Status = WorkflowStatus.Processing,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.WorkflowInstances.Add(instance);

        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            TaskName = "stale-task",
            ProcessorName = "ExtractRecipe",
            Status = TaskStatus.Processing,
            UpdatedAt = staleTime,
            CreatedAt = staleTime,
            RetryCount = 0,
            DependsOn = []
        };
        db.WorkflowTasks.Add(task);
        await db.SaveChangesAsync();

        // Act - Trigger the reaper via reflection since it's private
        var reapMethod = typeof(WorkflowWorker).GetMethod("ReapStaleTasksAsync", 
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        
        Assert.NotNull(reapMethod);
        await (Task)reapMethod.Invoke(testWorker, [CancellationToken.None])!;

        // Assert
        using var queryScope = serviceProvider.CreateScope();
        var queryDb = queryScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var updatedTask = await queryDb.WorkflowTasks.FirstAsync(t => t.TaskId == task.TaskId);

        if (!reclaimed)
        {
            Assert.Equal(TaskStatus.Processing, updatedTask.Status);
            Assert.Equal(0, updatedTask.RetryCount);
            Assert.Equal(staleTime, updatedTask.UpdatedAt);
            return;
        }
        Assert.Equal(now, updatedTask.UpdatedAt);
        Assert.Equal(TaskStatus.Pending, updatedTask.Status);
        Assert.Equal(1, updatedTask.RetryCount);
        Assert.Contains("Reclaimed by Zombie Reaper", updatedTask.ErrorMessage);
        Assert.Contains(staleTime.ToString("u"), updatedTask.ErrorMessage);
    }
}
