using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class DreamingWorkflowSeeder(
    RecipeDbContext db,
    IWorkflowOrchestrator orchestrator,
    CronScheduleCalculator scheduleCalculator,
    IClock clock,
    ILogger<DreamingWorkflowSeeder> logger)
{
    private const string DreamingWorkflowId = "dreaming";
    private const string DreamingCronExpression = "${DREAMING_CRON_UTC:-0 3 * * *}";

    public async Task SeedAsync(CancellationToken ct)
    {
        var hasActiveDreaming = await db.WorkflowInstances.AnyAsync(i =>
            i.WorkflowId == DreamingWorkflowId
            && (i.Status == WorkflowStatus.Pending || i.Status == WorkflowStatus.Processing),
            ct);

        if (hasActiveDreaming)
        {
            logger.LogDebug("Dreaming workflow is already pending or processing; skipping initial seed.");
            return;
        }

        var scheduledAt = scheduleCalculator.GetNextOccurrence(DreamingCronExpression, clock.UtcNow);
        var instance = await orchestrator.TriggerAsync(DreamingWorkflowId, [], scheduledAt);

        logger.LogInformation(
            "Seeded Dreaming workflow instance {InstanceId} scheduled at {ScheduledAt}",
            instance.Id,
            scheduledAt);
    }
}

public class DreamingWorkflowSeederHostedService(IServiceScopeFactory scopeFactory, ILogger<DreamingWorkflowSeederHostedService> logger)
    : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var seeder = scope.ServiceProvider.GetRequiredService<DreamingWorkflowSeeder>();
            await seeder.SeedAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to seed the Dreaming workflow.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
