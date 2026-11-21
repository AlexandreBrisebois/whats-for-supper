using System.Text.Json;
using System.Text.Json.Serialization;
using RecipeApi.Models;

namespace RecipeApi.Services;

public partial class WorkflowOrchestrator
{
    private static readonly JsonSerializerOptions ChildHistoryJson = new()
    {
        RespectRequiredConstructorParameters = true,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
    };

    // Read the retained command with its own original launch owner. This does
    // not inspect a live graph, accept a child, or complete any child work.
    internal static WorkflowInstance? ValidateOriginalChildCommand(WorkflowChildIntent intent, WorkflowTask parent)
    {
        if (intent.Id == Guid.Empty || intent.CreatedAt == default
            || parent.ProcessorName is not ("StartWorkflow" or "QueueRecipeSearchIndex"))
            throw new InvalidDataException("Original child observation is inconsistent.");
        var request = WorkflowProcessorHistory.ReadObservation<ChildRequest>(intent.Request, ChildHistoryJson);
        ReadChildRequest(intent, parent);
        if (request.ResetIntentId != parent.ResetIntentId
            || request.Parameters.Any(x => string.IsNullOrWhiteSpace(x.Key) || x.Value is null))
            throw new InvalidDataException("Original child generation or parameters differ.");
        if (intent.Prepared is null)
        {
            if (intent.PreparedHash is not null || intent.AcceptedAt is not null)
                throw new InvalidDataException("Unprepared child has a later receipt.");
            return null;
        }
        var prepared = WorkflowProcessorHistory.ReadObservation<ChildPrepared>(intent.Prepared, ChildHistoryJson);
        if (prepared.CreatedAt == default || string.IsNullOrWhiteSpace(prepared.Capture)
            || prepared.Tasks is null || prepared.Tasks.Length == 0
            || prepared.Tasks.Any(x => x is null || x.Id == Guid.Empty || x.DependsOn is null)
            || prepared.Tasks.Select(x => x.Id).Distinct().Count() != prepared.Tasks.Length)
            throw new InvalidDataException("Original prepared child is inconsistent.");
        return InitializeChild(intent, request);
    }
    internal static FoodVocabularyReference[] VocabularyReferences(WorkflowChildIntent intent,
        IReadOnlyList<WorkflowTask> parentObservations)
    {
        var request = WorkflowProcessorHistory.ReadObservation<ChildRequest>(intent.Request, ChildHistoryJson);
        var parent = parentObservations.FirstOrDefault(x => x.TaskId == intent.ParentTaskId
            && x.TaskId == request.TaskId && x.InstanceId == request.ParentId && x.ProcessorName == request.Processor
            && x.ResetIntentId == request.ResetIntentId
            && CanonicalRecipeContentStore.NormalizeJson(x.Payload) == request.Payload)
            ?? throw new InvalidDataException("Retained child requires its independently observed parent generation.");
        var original = ValidateOriginalChildCommand(intent, parent);
        return original is null ? [] : RecipeFilePublicationStore.VocabularyReferences(original);
    }

}
