using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public partial class ManagementService
{
    private sealed record SupperServingsBackup(int Version, JsonElement DefaultServings, Guid? DefaultVersion, DateTimeOffset? DefaultUpdatedAt, List<SupperServing> Days);
    private string SupperServingsBackupPath => Path.Combine(DataRoot, "supper-servings.json");

    private async Task ExportSupperServingsAsync(CancellationToken ct)
    {
        var setting = await db.FamilySettings.AsNoTracking().SingleOrDefaultAsync(x => x.Key == SupperServingsService.DefaultKey, ct);
        var usual = setting is null ? null : SupperServingsService.ValidateDefaultSetting(setting.Value);
        Guid? version = setting?.Value.TryGetProperty("version", out var stored) == true ? stored.GetGuid() : null;
        var rows = await db.SupperServings.AsNoTracking().OrderBy(x => x.Date).ToListAsync(ct);
        var snapshot = new SupperServingsBackup(1, JsonSerializer.SerializeToElement(usual), version, setting?.UpdatedAt, rows);
        var temporary = SupperServingsBackupPath + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try { await WriteJsonAsync(temporary, snapshot, ct); File.Move(temporary, SupperServingsBackupPath, true); }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }

    private async Task<SupperServingsBackup?> ReadSupperServingsAsync(CancellationToken ct)
    {
        if (!File.Exists(SupperServingsBackupPath)) return null;
        using var document = JsonDocument.Parse(await File.ReadAllTextAsync(SupperServingsBackupPath, ct));
        var root = document.RootElement;
        if (root.ValueKind != JsonValueKind.Object || !root.TryGetProperty("defaultServings", out var usual)
            || (usual.ValueKind != JsonValueKind.Null && (usual.ValueKind != JsonValueKind.Number || !usual.TryGetInt32(out var count) || count < 1)))
            throw new InvalidDataException("Serving artifact requires an explicit valid default or null.");
        var snapshot = root.Deserialize<SupperServingsBackup>(JsonDefaults.CamelCase);
        if (snapshot is null || snapshot.Version != 1 || snapshot.Days is null
            || snapshot.DefaultVersion == Guid.Empty
            || snapshot.Days.Any(x => x is null || x.Date == default || x.OverrideServings <= 0 || x.InheritedServings <= 0 || x.Version == Guid.Empty
                || x.CreatedAt == default || x.UpdatedAt == default || x.UpdatedAt < x.CreatedAt)
            || snapshot.Days.Select(x => x.Date).Distinct().Count() != snapshot.Days.Count)
            throw new InvalidDataException("Unsupported or malformed serving artifact; portions were not merged.");
        // Missing fields must not silently receive model initializers or nullable defaults.
        foreach (var row in root.GetProperty("days").EnumerateArray())
            foreach (var property in new[] { "date", "overrideServings", "inheritedServings", "version", "createdAt", "updatedAt" })
                if (!row.TryGetProperty(property, out _)) throw new InvalidDataException("Serving row is incomplete.");
        return snapshot;
    }

    private async Task RestoreSupperServingsAsync(SupperServingsBackup? snapshot, CancellationToken ct)
    {
        await using var transaction = await SupperServingsService.BeginAsync(db, ct);
        if (snapshot is not null)
        {
            foreach (var row in snapshot.Days)
            {
                var destination = await db.SupperServings.SingleOrDefaultAsync(x => x.Date == row.Date, ct);
                if (destination is null) db.SupperServings.Add(row);
                else { destination.OverrideServings = row.OverrideServings; destination.InheritedServings = row.InheritedServings; destination.Version = row.Version; destination.CreatedAt = row.CreatedAt; destination.UpdatedAt = row.UpdatedAt; }
            }
            var setting = await db.FamilySettings.SingleOrDefaultAsync(x => x.Key == SupperServingsService.DefaultKey, ct);
            if (setting is null) { setting = new FamilySetting { Key = SupperServingsService.DefaultKey }; db.FamilySettings.Add(setting); }
            setting.Value = JsonSerializer.SerializeToElement(new { servings = snapshot.DefaultServings, version = snapshot.DefaultVersion ?? Guid.NewGuid() });
            setting.UpdatedAt = snapshot.DefaultUpdatedAt ?? clock.UtcNow;
            await db.SaveChangesAsync(ct);
        }
        // Ordinary restore can replace recipes, assignments and cached plans even when the
        // legacy serving artifact is absent. All materialised plans cross that boundary.
        var plans = await db.WeeklyPlans.ToListAsync(ct);
        var usual = await SupperServingsService.ReadUsualAsync(db, ct);
        await SupperServingsService.MaterializeInheritedAsync(db, clock, calendar, usual.Count, ct);
        var today = calendar.Capture(clock.UtcNow).Today;
        foreach (var plan in plans)
        {
            var version = SupperProjectionInputs.WeekVersion(await SupperProjectionInputs.ReadWeekAsync(db, plan.WeekStartDate, today, ct));
            // Even equal serving versions cannot establish freshness of restored recipe/cache inputs.
            plan.ServingAppliedVersion = null;
            SupperServingsService.Enqueue(db, plan, version, clock.UtcNow);
        }
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
    }
}
