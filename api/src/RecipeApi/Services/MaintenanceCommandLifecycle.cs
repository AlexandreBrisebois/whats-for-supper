using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

// Observation only: neither a copied command nor a pruning event certifies physical completion.
internal static partial class MaintenanceCommandLifecycle
{
    internal static async Task RetainAsync(RecipeDbContext db, MaintenanceCommand command, string disposition,
        Guid operationId, DateTimeOffset now, CancellationToken ct)
    {
        var workflowRetirements = await db.WorkflowLifecycleRecords.AsNoTracking()
            .Where(x => x.OperationId == command.Id).OrderBy(x => x.Id)
            .Select(x => new { x.Id, x.OperationId, x.Disposition, x.PayloadHash }).ToArrayAsync(ct);
        var physicalRetirements = await db.RecipePhysicalDeletions.AsNoTracking()
            .Where(x => x.OperationId == command.Id).OrderBy(x => x.RecipeId)
            .Select(x => new { x.RecipeId, x.OperationId, x.Kind, x.PayloadHash, x.FilesRemoved, x.FilesDeliveredAt, x.CompletedAt }).ToArrayAsync(ct);
        var payload = JsonSerializer.Serialize(new { version = 1, executionDisposition = "inert", command, workflowRetirements, physicalRetirements }, JsonDefaults.CamelCase);
        db.MaintenanceCommandLifecycleRecords.Add(new MaintenanceCommandLifecycleRecord
        {
            Id = command.Id,
            OperationId = operationId,
            Disposition = disposition,
            Payload = payload,
            PayloadHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(CanonicalRecipeContentStore.NormalizeJson(payload)))),
            CreatedAt = now
        });
    }

    internal static async Task ReloadAttemptAsync(RecipeDbContext db, IReadOnlyCollection<Guid> commandIds)
    {
        var entries = db.ChangeTracker.Entries().Where(x => x.Entity switch
        {
            MaintenanceCommand command => commandIds.Contains(command.Id),
            MaintenanceCommandLifecycleRecord history => commandIds.Contains(history.Id),
            _ => false
        }).ToArray();
        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added) entry.State = EntityState.Detached;
            else await entry.ReloadAsync(CancellationToken.None);
        }
    }
    private sealed record RetainedCommand(Guid Id, string CommandType, string Status, string Payload, string? Result,
        int Attempts, Guid? RequestedBy, DateTimeOffset CreatedAt, DateTimeOffset? ScheduledFor,
        DateTimeOffset? StartedAt, DateTimeOffset? CompletedAt, string? LastError);
    private sealed record RetainedWorkflow(Guid Id, Guid OperationId, string Disposition, string PayloadHash);
    private sealed record RetainedPhysical(Guid RecipeId, Guid OperationId, string Kind, string PayloadHash,
        bool? FilesRemoved, DateTimeOffset? FilesDeliveredAt, DateTimeOffset? CompletedAt);
    private sealed record RetainedPayload(int Version, string ExecutionDisposition, RetainedCommand Command,
        RetainedWorkflow[] WorkflowRetirements, RetainedPhysical[] PhysicalRetirements);

    internal static void ValidateCurrentReferences(MaintenanceCommandObservation command,
        IReadOnlyList<WorkflowLifecycleRecord> workflows, IReadOnlyList<RecipePhysicalDeletion> physical)
    {
        var targets = ManagementService.ReadMaintenanceCommandAuthority(command);
        if (command.CommandType != CaptureFailureService.DeleteFailedCaptureResidueCommand) return;
        if (workflows.Any(x => x.OperationId == command.Id && x.Id != targets.WorkflowInstanceId)
            || physical.Any(x => x.OperationId == command.Id && x.RecipeId != targets.RecipeId))
            throw new InvalidDataException("Current maintenance authority conflicts with its retained lifecycle links.");
    }

    internal static void ValidateRetainedReferences(MaintenanceCommandLifecycleRecord record,
        IReadOnlyList<WorkflowLifecycleRecord> workflows, IReadOnlyList<RecipePhysicalDeletion> physical)
    {
        var json = new JsonSerializerOptions(JsonDefaults.CamelCase)
        {
            RespectRequiredConstructorParameters = true,
            UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow
        };
        var payload = WorkflowProcessorHistory.ReadObservation<RetainedPayload>(record.Payload, json);
        if (record.Id == Guid.Empty || record.OperationId == Guid.Empty || record.CreatedAt == default
            || record.Disposition is not ("retention-started" or "pruned") || record.PayloadHash != Convert.ToHexString(SHA256.HashData(
                Encoding.UTF8.GetBytes(CanonicalRecipeContentStore.NormalizeJson(record.Payload))))
            || payload.Version != 1 || payload.ExecutionDisposition != "inert" || payload.Command is null
            || payload.Command.Id != record.Id || payload.Command.Status is not ("completed" or "skipped")
            || payload.WorkflowRetirements is null || payload.PhysicalRetirements is null
            || payload.WorkflowRetirements.Select(x => x.Id).Distinct().Count() != payload.WorkflowRetirements.Length
            || payload.PhysicalRetirements.Select(x => x.RecipeId).Distinct().Count() != payload.PhysicalRetirements.Length)
            throw new InvalidDataException("Retained maintenance observation is inconsistent.");
        foreach (var link in payload.WorkflowRetirements)
        {
            var retained = workflows.SingleOrDefault(x => x.Id == link.Id);
            if (retained is null || link.OperationId != record.Id || retained.OperationId != link.OperationId
                || retained.Disposition != link.Disposition || retained.PayloadHash != link.PayloadHash)
                throw new InvalidDataException("Retained maintenance workflow link is unresolved.");
        }
        foreach (var link in payload.PhysicalRetirements)
        {
            var retained = physical.SingleOrDefault(x => x.RecipeId == link.RecipeId);
            if (retained is null || link.OperationId != record.Id || retained.OperationId != link.OperationId
                || retained.Kind != link.Kind || retained.PayloadHash != link.PayloadHash
                || link.FilesRemoved is not null && retained.FilesRemoved != link.FilesRemoved
                || link.FilesDeliveredAt is not null && retained.FilesDeliveredAt != link.FilesDeliveredAt
                || link.CompletedAt is not null && retained.CompletedAt != link.CompletedAt)
                throw new InvalidDataException("Retained maintenance physical link is unresolved.");
        }
    }

}
