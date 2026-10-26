using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed record DemoScheduleResult(string State, string? ErrorCode = null, Guid? InstanceId = null, DateTimeOffset? ScheduledAt = null);

public class DemoWorkflowSeeder(
    RecipeDbContext db,
    IWorkflowOrchestrator orchestrator,
    DemoModeOptions demoMode,
    CronScheduleCalculator scheduleCalculator,
    IClock clock,
    ILogger<DemoWorkflowSeeder> logger)
{
    public const string AutomaticParameter = "automaticDemoReset";
    private const string WorkflowId = "demo-restore";

    public async Task SeedAsync(CancellationToken ct) => await EnsureNextAsync(null, ct);

    public async Task<DemoScheduleResult> EnsureNextAsync(Guid? currentInstance, CancellationToken ct)
    {
        if (!demoMode.Enabled) return new("disabled", "DEMO_DISABLED");
        NpgsqlConnection? scheduling = null;
        var locked = false;
        try
        {
            // This session lock spans shared workflow acceptance without nesting its transaction.
            if (db.Database.IsNpgsql())
            {
                scheduling = new NpgsqlConnection(db.Database.GetConnectionString());
                await scheduling.OpenAsync(ct);
                await using var command = new NpgsqlCommand("SELECT pg_advisory_lock(244003)", scheduling) { CommandTimeout = 5 };
                await command.ExecuteNonQueryAsync(ct);
                locked = true;
            }
            var candidates = await db.WorkflowInstances.Include(i => i.Tasks)
                .Where(i => i.WorkflowId == WorkflowId && i.Id != currentInstance
                    && (i.Status == WorkflowStatus.Pending || i.Status == WorkflowStatus.Processing))
                .ToListAsync(ct);
            foreach (var candidate in candidates)
            {
                var root = candidate.Tasks.FirstOrDefault(t => t.ProcessorName == "RestoreDemoState");
                if (!IsAutomatic(candidate.Parameters) || root is null)
                {
                    candidate.Status = WorkflowStatus.Paused;
                    candidate.UpdatedAt = clock.UtcNow;
                    foreach (var task in candidate.Tasks.Where(t => t.Status is Models.TaskStatus.Waiting or Models.TaskStatus.Pending))
                    {
                        task.Status = Models.TaskStatus.Failed;
                        task.ErrorMessage = "Unscheduled/legacy demo work is not eligible in visitor mode; use the automatic schedule.";
                        task.UpdatedAt = clock.UtcNow;
                    }
                    continue;
                }
                if (root.Status is Models.TaskStatus.Pending or Models.TaskStatus.Processing)
                {
                    await db.SaveChangesAsync(ct);
                    return new(root.ScheduledAt > clock.UtcNow ? "scheduled" : "running", null, candidate.Id, root.ScheduledAt);
                }
            }
            await db.SaveChangesAsync(ct);
            DateTimeOffset next;
            try { next = scheduleCalculator.GetNextOccurrence(demoMode.RestoreCronUtc, clock.UtcNow); }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Demo restore has no confirmed successor. ErrorCode=INVALID_CRON");
                return new("unhealthy", "INVALID_CRON");
            }
            var accepted = await orchestrator.TriggerAsync(WorkflowId, new() { [AutomaticParameter] = "true" }, next);
            logger.LogInformation("Confirmed demo restore {InstanceId} at {ScheduledAt}", accepted.Id, next);
            return new("scheduled", null, accepted.Id, next);
        }
        finally
        {
            if (scheduling is not null)
            {
                try
                {
                    if (locked)
                    {
                        await using var command = new NpgsqlCommand("SELECT pg_advisory_unlock(244003)", scheduling);
                        await command.ExecuteNonQueryAsync(CancellationToken.None);
                    }
                }
                finally { await scheduling.DisposeAsync(); }
            }
        }
    }

    public static bool IsAutomatic(string? parameters)
    {
        try
        {
            var values = JsonSerializer.Deserialize<Dictionary<string, string>>(parameters ?? "{}");
            return values?.GetValueOrDefault(AutomaticParameter) == "true";
        }
        catch (JsonException) { return false; }
    }
}

/// <summary>Reconcile future occurrences through the existing scheduling owner after startup and terminal failure.</summary>
public class DemoWorkflowSeederHostedService(
    IServiceScopeFactory scopeFactory,
    ILogger<DemoWorkflowSeederHostedService> logger,
    IConfiguration configuration) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Demo:ReconcileSeconds", 30), 1, 300)));
        do
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                await scope.ServiceProvider.GetRequiredService<DemoWorkflowSeeder>().SeedAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception ex) { logger.LogError(ex, "Demo reset recurrence is unconfirmed; reconciliation will retry."); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
