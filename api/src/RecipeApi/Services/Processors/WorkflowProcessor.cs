using System.Text.Json;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public record StartedWorkflowResult(string WorkflowId, Guid InstanceId, DateTimeOffset? ScheduledAt);

public class WorkflowProcessor(
    IWorkflowOrchestrator orchestrator,
    CronScheduleCalculator scheduleCalculator,
    IClock clock,
    ILogger<WorkflowProcessor> logger) : IWorkflowProcessor
{
    public string ProcessorName => "StartWorkflow";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        var payload = ParsePayload(task.Payload);
        var scheduledAt = ResolveScheduledAt(payload.Schedule?.Cron);
        var instance = await orchestrator.TriggerAsync(payload.WorkflowId, payload.Parameters ?? [], scheduledAt);

        logger.LogInformation(
            "Started workflow {WorkflowId} from task {TaskId}; instance {InstanceId}; scheduled at {ScheduledAt}",
            payload.WorkflowId,
            task.TaskId,
            instance.Id,
            scheduledAt);

        return new StartedWorkflowResult(payload.WorkflowId, instance.Id, scheduledAt);
    }

    private DateTimeOffset? ResolveScheduledAt(string? cronExpression)
    {
        if (string.IsNullOrWhiteSpace(cronExpression))
        {
            return null;
        }

        return scheduleCalculator.GetNextOccurrence(cronExpression, clock.UtcNow);
    }

    private static StartWorkflowPayload ParsePayload(string? rawPayload)
    {
        if (string.IsNullOrWhiteSpace(rawPayload))
        {
            throw new InvalidOperationException("StartWorkflow requires a payload.");
        }

        var payload = JsonSerializer.Deserialize<StartWorkflowPayload>(rawPayload, JsonDefaults.CamelCase);
        if (payload == null || string.IsNullOrWhiteSpace(payload.WorkflowId))
        {
            throw new InvalidOperationException("StartWorkflow payload must include workflowId.");
        }

        return payload;
    }

    private sealed class StartWorkflowPayload
    {
        public string WorkflowId { get; set; } = string.Empty;
        public Dictionary<string, string>? Parameters { get; set; }
        public StartWorkflowSchedule? Schedule { get; set; }
    }

    private sealed class StartWorkflowSchedule
    {
        public string? Cron { get; set; }
    }
}
