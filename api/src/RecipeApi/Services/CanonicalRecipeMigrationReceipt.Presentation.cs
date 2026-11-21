using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;

namespace RecipeApi.Services;

public static partial class CanonicalRecipeMigrationReceipt
{
    // This is only a stale-writer fence. An inert plan never certifies conversion,
    // a completed week, household eligibility or permission to reopen.
    internal static async Task<Guid> BindPresentationEpochAsync(RecipeDbContext db, Guid prior, CancellationToken ct)
    {
        var observations = new List<MaintenanceCommandObservation>();
        observations.AddRange((await db.MaintenanceCommands.AsNoTracking().Where(x => x.CommandType == CommandType).ToArrayAsync(ct)).Select(MaintenanceCommandObservation.From));
        var retained = await db.MaintenanceCommandLifecycleRecords.AsNoTracking().ToArrayAsync(ct);
        if (retained.Length != 0)
        {
            var workflows = await db.WorkflowLifecycleRecords.AsNoTracking().ToArrayAsync(ct);
            var physical = await db.RecipePhysicalDeletions.AsNoTracking().ToArrayAsync(ct);
            foreach (var row in retained)
            {
                var command = MaintenanceCommandLifecycle.ReadValidatedRetainedCommand(row, workflows, physical);
                if (command.CommandType == CommandType) observations.Add(command);
            }
        }
        var plans = new List<string>();
        foreach (var group in observations.GroupBy(x => x.Id))
        {
            var first = group.First();
            foreach (var copy in group)
            {
                _ = Read(copy);
                Require(CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(first, Json))
                    == CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(copy, Json)));
            }
            var payload = Read(first).Payload;
            if (payload.Phase == "plan") plans.Add(first.Id.ToString("D") + "/" + payload.RequestSha256);
        }
        if (plans.Count == 0) return prior;
        plans.Sort(StringComparer.Ordinal);
        var bytes = Encoding.UTF8.GetBytes("wfs/grocery-presentation/migration/v1\0" + prior.ToString("D") + "\0" + string.Join("\0", plans));
        return Guid.ParseExact(Convert.ToHexStringLower(SHA256.HashData(bytes))[..32], "N");
    }
}
