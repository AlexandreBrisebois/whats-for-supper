using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

// Observation only: neither a copied command nor a pruning event certifies physical completion.
internal static class MaintenanceCommandLifecycle
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
}
