using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class RecipeFilePublicationStore
{
    internal static FoodVocabularyReference[] VocabularyReferencesForInventory(WorkflowInstance instance,
        IReadOnlySet<Guid> observedTaskIds, bool prospectiveDemoInvalidation)
    {
        if (instance.WorkflowId != "dreaming" || instance.RecipePublicationCapture is null
            || !IsDispatchLaunch(instance.RecipePublicationCapture)) return VocabularyReferences(instance);
        var launch = ReadRecoveryJson<DispatchLaunch>(instance.RecipePublicationCapture);
        if (launch.Tasks is null || launch.Tasks.Count >= instance.Tasks.Count) return VocabularyReferences(instance);
        var captured = new WorkflowInstance
        {
            Id = instance.Id,
            WorkflowId = instance.WorkflowId,
            Parameters = instance.Parameters,
            RecipePublicationCapture = instance.RecipePublicationCapture,
            Tasks = instance.Tasks.Where(x => launch.Tasks.ContainsKey(x.TaskId)).ToArray()
        };
        // Validate the original closed command and every accepted task through its owner.
        // The projection never becomes execution authority or replaces retained rows.
        ValidateDispatchLaunch(captured);
        if (captured.Tasks.Count == 0 || !RecoverySnapshotService.IsReviewedDemoMaintenanceGraph(captured))
            throw new InvalidDataException("Demo invalidation requires reviewed original maintenance intent.");
        var beforeReset = prospectiveDemoInvalidation && instance.Status is WorkflowStatus.Pending or WorkflowStatus.Paused;
        var afterReset = instance.Status == WorkflowStatus.Failed;
        if (!beforeReset && !afterReset)
            throw new InvalidDataException("Unaccepted demo tasks lack an inert invalidation disposition.");
        foreach (var task in instance.Tasks.Where(x => !launch.Tasks.ContainsKey(x.TaskId)))
        {
            if (task.TaskId == Guid.Empty || task.InstanceId != instance.Id || string.IsNullOrWhiteSpace(task.TaskName)
                || string.IsNullOrWhiteSpace(task.ProcessorName) || task.Payload is not null || task.Result is not null
                || task.DependsOn is null || task.DependsOn.Length != 0 || task.ChildLaunchIntentId is not null
                || task.ResetIntentId is not null || task.RetryCount != 0 || observedTaskIds.Contains(task.TaskId)
                || (beforeReset && (task.Status is not (Models.TaskStatus.Waiting or Models.TaskStatus.Pending)
                    || task.ErrorMessage is not null || task.StackTrace is not null))
                || (afterReset && (task.Status != Models.TaskStatus.Failed
                    || task.ErrorMessage != "Invalidated by demo reset" || task.StackTrace is not null)))
                throw new InvalidDataException("Unaccepted demo task contains authority or lacks exact invalidation facts.");
        }
        return [];
    }
}
