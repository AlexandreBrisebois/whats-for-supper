using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>
/// Background worker that processes health events from the health_events table.
/// This implements the asynchronous, event-driven side of the health service extraction.
/// </summary>
public class HealthWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<HealthWorker> logger) : BackgroundService
{
    private const int MinDelayMs = 1000;
    private const int MaxDelayMs = 30000;
    private int _idleCount = 0;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("HealthWorker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var processedCount = await ProcessPendingEventsAsync(stoppingToken);

                if (processedCount > 0)
                {
                    _idleCount = 0;
                    await Task.Delay(MinDelayMs, stoppingToken);
                }
                else
                {
                    _idleCount++;
                    var delay = (int)Math.Min(MinDelayMs * Math.Pow(2, _idleCount), MaxDelayMs);
                    await Task.Delay(delay, stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in HealthWorker loop");
                await Task.Delay(5000, stoppingToken);
            }
        }

        logger.LogInformation("HealthWorker stopped");
    }

    public async Task<int> ProcessPendingEventsAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var healthComputationService = scope.ServiceProvider.GetRequiredService<HealthComputationService>();

        var now = DateTimeOffset.UtcNow;

        // We pick up events that are pending and scheduled for now or in the past.
        // We use a small batch size to avoid long-running transactions.
        var events = await db.HealthEvents
            .Where(e => e.Status == "pending" && e.ScheduledFor <= now)
            .OrderBy(e => e.CreatedAt)
            .Take(5)
            .ToListAsync(ct);

        if (events.Count == 0) return 0;

        foreach (var @event in events)
        {
            try
            {
                @event.Status = "processing";
                @event.Attempts++;
                await db.SaveChangesAsync(ct);

                if (@event.EventType == "recipe_changed")
                {
                    if (Guid.TryParse(@event.EntityId, out var recipeId))
                    {
                        await healthComputationService.ProcessRecipeChangedAsync(recipeId, ct);
                    }
                    else
                    {
                        logger.LogWarning("Invalid EntityId for recipe_changed event: {EntityId}", @event.EntityId);
                    }
                }
                else if (@event.EventType == "week_changed")
                {
                    if (DateOnly.TryParse(@event.EntityId, out var weekStartDate))
                    {
                        await healthComputationService.ProcessWeekChangedAsync(weekStartDate, ct);
                    }
                    else
                    {
                        logger.LogWarning("Invalid EntityId for week_changed event: {EntityId}", @event.EntityId);
                    }
                }
                else
                {
                    logger.LogWarning("Unknown health event type: {EventType}", @event.EventType);
                }

                @event.Status = "completed";
                @event.UpdatedAt = DateTimeOffset.UtcNow;
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to process health event {EventId} (Type: {EventType}, Entity: {EntityId})",
                    @event.Id, @event.EventType, @event.EntityId);

                @event.ErrorMessage = ex.Message;
                @event.UpdatedAt = DateTimeOffset.UtcNow;

                // Simple linear backoff for retries
                if (@event.Attempts < 3)
                {
                    @event.Status = "pending";
                    @event.ScheduledFor = DateTimeOffset.UtcNow.AddMinutes(Math.Pow(2, @event.Attempts));
                    logger.LogInformation("Event {EventId} rescheduled for retry {Attempt}", @event.Id, @event.Attempts);
                }
                else
                {
                    @event.Status = "failed";
                    logger.LogError("Event {EventId} fatally failed after {Attempts} attempts", @event.Id, @event.Attempts);
                }

                await db.SaveChangesAsync(ct);
            }
        }

        return events.Count;
    }
}
