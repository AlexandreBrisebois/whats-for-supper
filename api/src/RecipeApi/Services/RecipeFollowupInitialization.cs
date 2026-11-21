using System.Text.Json;
using RecipeApi.Models;

namespace RecipeApi.Services;

// A retained accepted command, deliberately unavailable to ordinary processor pickup.
// A delivered image/PDF/description is not completed extraction or generation.
internal static class RecipeFollowupInitialization
{
    public const string TaskName = "initialize_recipe_followup";
    public const string ProcessorName = "RecipeFollowupInitialization";

    public static WorkflowInstance Create(string workflowId, Dictionary<string, string> parameters, DateTimeOffset now)
    {
        var instance = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = workflowId,
            Parameters = JsonSerializer.Serialize(parameters),
            Status = WorkflowStatus.Paused,
            CreatedAt = now,
            UpdatedAt = now
        };
        instance.Tasks.Add(new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            TaskName = TaskName,
            ProcessorName = ProcessorName,
            Status = Models.TaskStatus.Failed,
            CreatedAt = now,
            UpdatedAt = now
        });
        return instance;
    }

    public static bool IsPending(WorkflowInstance instance) => instance.Status == WorkflowStatus.Paused
        && instance.Tasks.Count == 1 && instance.Tasks.Any(x => x.TaskName == TaskName
            && x.ProcessorName == ProcessorName && x.Status == Models.TaskStatus.Failed);
}
