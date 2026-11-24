using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Ai;
using RecipeApi.Tests.Services;
using RecipeApi.Workflow;
using Xunit;
using Xunit.Abstractions;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Integration;

public sealed class WorkflowWorkerDispatchPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Dispatch_AdmitsDuePendingTasksWithoutPublicationCapture_AndExcludesFutureAndPaused()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var clock = new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = DateTimeOffset.Parse("2026-10-12T16:00:00Z") };
            var executed = new List<string>();
            var services = new ServiceCollection();
            services.AddDbContext<RecipeDbContext>(opts => opts.UseNpgsql(settings.ConnectionString));
            services.AddSingleton<IConfiguration>(new ConfigurationBuilder().Build());
            services.AddScoped<IWorkflowProcessor>(_ => new MockWorkflowProcessor("MockNoCapture", executed));
            services.AddLogging();

            using var sp = services.BuildServiceProvider();
            using (var seedScope = sp.CreateScope())
            {
                var db = seedScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var dueInstance = new WorkflowInstance
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = "v0140-preupgrade",
                    Status = WorkflowStatus.Pending,
                    RecipePublicationCapture = null,
                    CreatedAt = clock.UtcNow,
                    UpdatedAt = clock.UtcNow
                };
                var pausedInstance = new WorkflowInstance
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = "paused-workflow",
                    Status = WorkflowStatus.Paused,
                    RecipePublicationCapture = null,
                    CreatedAt = clock.UtcNow,
                    UpdatedAt = clock.UtcNow
                };
                db.WorkflowInstances.AddRange(dueInstance, pausedInstance);
                db.WorkflowTasks.AddRange(
                    new WorkflowTask
                    {
                        TaskId = Guid.NewGuid(),
                        InstanceId = dueInstance.Id,
                        TaskName = "due-task",
                        ProcessorName = "MockNoCapture",
                        Status = TaskStatus.Pending,
                        ScheduledAt = clock.UtcNow.AddMinutes(-1),
                        CreatedAt = clock.UtcNow,
                        UpdatedAt = clock.UtcNow
                    },
                    new WorkflowTask
                    {
                        TaskId = Guid.NewGuid(),
                        InstanceId = dueInstance.Id,
                        TaskName = "future-task",
                        ProcessorName = "MockNoCapture",
                        Status = TaskStatus.Pending,
                        ScheduledAt = clock.UtcNow.AddMinutes(10),
                        CreatedAt = clock.UtcNow,
                        UpdatedAt = clock.UtcNow
                    },
                    new WorkflowTask
                    {
                        TaskId = Guid.NewGuid(),
                        InstanceId = pausedInstance.Id,
                        TaskName = "paused-task",
                        ProcessorName = "MockNoCapture",
                        Status = TaskStatus.Pending,
                        ScheduledAt = clock.UtcNow.AddMinutes(-1),
                        CreatedAt = clock.UtcNow,
                        UpdatedAt = clock.UtcNow
                    });
                await db.SaveChangesAsync();
            }

            var worker = new WorkflowWorker(
                clock,
                sp.GetRequiredService<IServiceScopeFactory>(),
                new Mock<ILogger<WorkflowWorker>>().Object,
                new AiExceptionHandler(clock, new Mock<ILogger<AiExceptionHandler>>().Object),
                Options.Create(new WorkflowRetryOptions { RetryScheduleMinutes = [1], MaxRetries = 3 }));

            var count = await worker.ProcessPendingTasksAsync(CancellationToken.None);
            Assert.Equal(1, count);
            Assert.Single(executed);
            worker.Dispose();
        });
    }
}
