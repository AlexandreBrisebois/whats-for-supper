using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class DemoWorkflowSeeder(
    RecipeDbContext db,
    IWorkflowOrchestrator orchestrator,
    DemoModeOptions demoMode,
    CronScheduleCalculator scheduleCalculator,
    IClock clock,
    ILogger<DemoWorkflowSeeder> logger)
{
    private const string DemoRestoreWorkflowId = "demo-restore";

    public async Task SeedAsync(CancellationToken ct)
    {
        if (!demoMode.Enabled)
        {
            logger.LogDebug("Demo Mode is disabled; skipping demo restore seed.");
            return;
        }

        var hasActiveRestore = await db.WorkflowInstances.AnyAsync(i =>
            i.WorkflowId == DemoRestoreWorkflowId
            && (i.Status == WorkflowStatus.Pending || i.Status == WorkflowStatus.Processing),
            ct);

        if (hasActiveRestore)
        {
            logger.LogDebug("Demo restore workflow is already pending or processing; skipping initial seed.");
            return;
        }

        var scheduledAt = scheduleCalculator.GetNextOccurrence(demoMode.RestoreCronUtc, clock.UtcNow);
        var instance = await orchestrator.TriggerAsync(DemoRestoreWorkflowId, [], scheduledAt);

        logger.LogInformation(
            "Seeded Demo restore workflow instance {InstanceId} scheduled at {ScheduledAt}",
            instance.Id,
            scheduledAt);
    }
}

public class DemoWorkflowSeederHostedService(IServiceScopeFactory scopeFactory, ILogger<DemoWorkflowSeederHostedService> logger)
    : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var seeder = scope.ServiceProvider.GetRequiredService<DemoWorkflowSeeder>();
            await seeder.SeedAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to seed the Demo restore workflow.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
