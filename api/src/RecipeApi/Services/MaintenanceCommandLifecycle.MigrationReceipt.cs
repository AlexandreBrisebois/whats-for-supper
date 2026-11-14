using RecipeApi.Models;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

internal static partial class MaintenanceCommandLifecycle
{
    // Decode through the existing closed owner only after its hash and actual
    // workflow/physical closure validation. This observation never re-enqueues work.
    internal static MaintenanceCommandObservation ReadValidatedRetainedCommand(MaintenanceCommandLifecycleRecord record,
        IReadOnlyList<WorkflowLifecycleRecord> workflows, IReadOnlyList<RecipePhysicalDeletion> physical)
    {
        ValidateRetainedReferences(record, workflows, physical);
        var json = new System.Text.Json.JsonSerializerOptions(JsonDefaults.CamelCase)
        {
            RespectRequiredConstructorParameters = true,
            UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow
        };
        var command = WorkflowProcessorHistory.ReadObservation<RetainedPayload>(record.Payload, json).Command;
        return new(command.Id, command.CommandType, command.Status, command.Payload, command.Result,
            command.Attempts, command.RequestedBy, command.CreatedAt, command.ScheduledFor,
            command.StartedAt, command.CompletedAt, command.LastError);
    }
}
