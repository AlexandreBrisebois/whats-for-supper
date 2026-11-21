using System.Text.Json;
using System.Text.Json.Serialization;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public partial class ManagementService
{
    internal static (Guid? RecipeId, Guid? WorkflowInstanceId) ReadMaintenanceCommandAuthority(MaintenanceCommandObservation command)
    {
        FoodVocabularyDefinitions.Require(command.Id != Guid.Empty && !string.IsNullOrWhiteSpace(command.CommandType)
            && command.Status is "pending" or "processing" or "completed" or "failed" or "skipped"
            && command.Attempts >= 0 && command.RequestedBy != Guid.Empty && command.Payload is not null);
        var json = new JsonSerializerOptions(JsonDefaults.CamelCase)
        { PropertyNameCaseInsensitive = false, UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow };
        _ = WorkflowProcessorHistory.ReadObservation<JsonElement>(command.Payload, json);
        if (command.Result is { } result) _ = WorkflowProcessorHistory.ReadObservation<JsonElement>(result, json);
        // The executor explicitly skips unsupported command types. Their raw
        // observations stay inert and cannot supply reference authority.
        if (command.CommandType != CaptureFailureService.DeleteFailedCaptureResidueCommand) return (null, null);
        var payload = WorkflowProcessorHistory.ReadObservation<DeleteFailedCaptureResiduePayload>(command.Payload, json);
        FoodVocabularyDefinitions.Require(payload.RecipeId != Guid.Empty && payload.WorkflowInstanceId != Guid.Empty);
        return (payload.RecipeId, payload.WorkflowInstanceId);
    }
}
