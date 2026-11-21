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
    ILogger<WorkflowProcessor> logger,
    DemoWorkflowSeeder demoSeeder) : IWorkflowProcessor
{
    public string ProcessorName => "StartWorkflow";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        var payload = ParsePayload(task.Payload);
        if (payload.WorkflowId == "demo-restore")
            return await demoSeeder.EnsureNextAsync(task.InstanceId, ct);
        var instance = await orchestrator.ResumeChildAsync(task, ct);
        if (instance is null)
            instance = await orchestrator.TriggerChildAsync(task, payload.WorkflowId, payload.Parameters ?? [],
                ResolveScheduledAt(payload.Schedule?.Cron), ct);
        var scheduledAt = instance.Tasks.FirstOrDefault(x => x.DependsOn.Length == 0)?.ScheduledAt;

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

    internal static void ValidateOriginalHistory(string? payload, string? returned, WorkflowInstance? child)
    {
        var input = ParsePayload(payload);
        // Demo seeding has its own lifecycle; it does not return a selected
        // StartWorkflow child receipt. Preserve that observation unqualified.
        if (input.WorkflowId == "demo-restore")
        {
            if (child is not null) throw new InvalidDataException("Demo seed is not a selected child launch.");
            return;
        }
        using var result = JsonDocument.Parse(returned ?? "null");
        var value = result.RootElement;
        if (child is null || child.WorkflowId != input.WorkflowId || value.ValueKind != JsonValueKind.Object
            || !value.TryGetProperty("workflowId", out var workflow) || workflow.GetString() != child.WorkflowId
            || !value.TryGetProperty("instanceId", out var instance) || instance.GetGuid() != child.Id
            || !value.TryGetProperty("scheduledAt", out var scheduled)
            || (scheduled.ValueKind == JsonValueKind.Null ? (DateTimeOffset?)null : scheduled.GetDateTimeOffset())
                != child.Tasks.FirstOrDefault(x => x.DependsOn.Length == 0)?.ScheduledAt
            || CanonicalRecipeContentStore.NormalizeJson(child.Parameters)
                != CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(input.Parameters ?? [])))
            throw new InvalidDataException("Started workflow receipt differs from its original child command.");
        // The retained selected schedule is observed. No current clock or cron
        // definition reconstructs a missing original scheduling decision.
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
