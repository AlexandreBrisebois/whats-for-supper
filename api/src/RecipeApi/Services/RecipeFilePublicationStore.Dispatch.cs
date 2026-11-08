using System.Text.Json;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class RecipeFilePublicationStore
{
    private sealed record DispatchTask(string Name, string Processor, string Payload, string[] DependsOn,
        DateTimeOffset? ScheduledAt);
    private sealed record DispatchLaunch(int Version, string Kind, Guid InstanceId, string WorkflowId,
        Dictionary<string, string> Parameters, Dictionary<Guid, DispatchTask> Tasks, string InputHash);

    private static bool RequiresDispatchIntent(string processor) => processor is
        "StartWorkflow" or "CompleteRecipeImportReport" or "QueueRecipeSearchIndex" or "UrlCaptureInitialization" or "RecipeFollowupInitialization";

    private static bool IsDispatchLaunch(string json)
    {
        using var document = JsonDocument.Parse(json);
        return document.RootElement.ValueKind == JsonValueKind.Object
            && document.RootElement.TryGetProperty("kind", out var kind) && kind.ValueKind == JsonValueKind.String
            && kind.GetString() == "dispatch";
    }

    // No recipe baseline is read or manufactured for nonwriters. This records
    // the original command, not child/report completion or publication authority.
    internal static void CaptureDispatchLaunch(WorkflowInstance instance)
    {
        if (instance.RecipePublicationCapture is not null)
        {
            ValidateDispatchLaunch(instance);
            return;
        }
        var parameters = JsonSerializer.Deserialize<Dictionary<string, string>>(instance.Parameters ?? "null")
            ?? throw new InvalidWorkflowException("Workflow dispatch requires parameters.");
        var tasks = instance.Tasks.ToDictionary(x => x.TaskId, x => new DispatchTask(x.TaskName,
            x.ProcessorName, CanonicalRecipeContentStore.NormalizeJson(x.Payload), x.DependsOn, x.ScheduledAt));
        var launch = new DispatchLaunch(1, "dispatch", instance.Id, instance.WorkflowId, parameters, tasks, "");
        instance.RecipePublicationCapture = JsonSerializer.Serialize(launch with { InputHash = DispatchHash(launch) }, Json);
        ValidateDispatchLaunch(instance);
    }

    private static string DispatchHash(DispatchLaunch launch) => Hash(new
    {
        version = launch.Version,
        kind = launch.Kind,
        instanceId = launch.InstanceId,
        workflowId = launch.WorkflowId,
        parameters = launch.Parameters,
        tasks = launch.Tasks
    });

    private static void ValidateDispatchLaunch(WorkflowInstance instance, bool retainHistoricalReady = false)
    {
        var launch = ReadRecoveryJson<DispatchLaunch>(instance.RecipePublicationCapture!);
        if (launch.Version != 1 || launch.Kind != "dispatch" || launch.InstanceId == Guid.Empty
            || launch.InstanceId != instance.Id || string.IsNullOrWhiteSpace(launch.WorkflowId)
            || launch.WorkflowId != instance.WorkflowId || launch.Parameters is null || launch.Tasks is null
            || launch.Parameters.Any(x => string.IsNullOrWhiteSpace(x.Key) || x.Value is null)
            || CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(launch.Parameters))
                != CanonicalRecipeContentStore.NormalizeJson(instance.Parameters)
            || launch.InputHash != DispatchHash(launch) || launch.Tasks.Count != instance.Tasks.Count)
            throw new InvalidDataException("Workflow differs from captured dispatch intent.");
        // Earlier readiness-only launches captured dispatch intent but no source
        // baseline. Preserve those exact facts only under an inert recovery
        // disposition; ordinary validation/execution still requires writer capture.
        foreach (var task in instance.Tasks)
            if (task.InstanceId != instance.Id || (Writers.Contains(task.ProcessorName)
                && !(retainHistoricalReady && task.ProcessorName == "RecipeReady"))
                || !launch.Tasks.TryGetValue(task.TaskId, out var input) || input is null
                || string.IsNullOrWhiteSpace(input.Name) || string.IsNullOrWhiteSpace(input.Processor)
                || input.Name != task.TaskName || input.Processor != task.ProcessorName
                || input.Payload != CanonicalRecipeContentStore.NormalizeJson(task.Payload)
                || input.DependsOn is null || !input.DependsOn.SequenceEqual(task.DependsOn)
                || input.ScheduledAt == default(DateTimeOffset))
                throw new InvalidDataException("Task differs from captured dispatch intent.");
        // ScheduledAt, retry/status/error/result and timestamps on live tasks are
        // mutable lifecycle facts. The original schedule remains in the hash,
        // without comparing it to a later retry or manufacturing a receipt.
    }
}
