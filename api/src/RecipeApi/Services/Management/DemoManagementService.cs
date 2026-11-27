using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services.Management;

internal sealed class DemoManagementService(
    RecipeDbContext db,
    DemoModeOptions demoMode,
    RecoverySnapshotService recovery,
    IScheduleEventPublisher? publisher)
{
    public async Task<DemoStateResult> CaptureDemoStateAsync(CancellationToken ct = default)
    {
        demoMode.EnsureManagementAvailable();
        var result = await recovery.CaptureDemoAsync(ct);
        return await DemoResultAsync(result, ct);
    }

    public async Task<DemoStateResult> RestoreDemoStateAsync(CancellationToken ct = default, Guid? workflowInstanceId = null)
    {
        if (demoMode.Enabled)
        {
            var instance = workflowInstanceId.HasValue
                ? await db.WorkflowInstances.AsNoTracking().SingleOrDefaultAsync(i => i.Id == workflowInstanceId.Value, ct)
                : null;
            if (instance?.WorkflowId != "demo-restore" || !DemoWorkflowSeeder.IsAutomatic(instance.Parameters))
                throw new InvalidOperationException(DemoModeOptions.ManagementUnavailableMessage);
        }
        var result = await recovery.RestoreDemoAsync(workflowInstanceId, ct);
        db.ChangeTracker.Clear();
        if (publisher is not null)
        {
            if (result.OperationId is { } generation) await publisher.PublishDemoResetAsync(generation);
            await publisher.PublishAllSuggestionsInvalidatedAsync();
        }
        return await DemoResultAsync(result, ct);
    }

    private async Task<DemoStateResult> DemoResultAsync(RecoveryResult result, CancellationToken ct)
    {
        if (result.StateCounts is { } published)
            return new(result.Message, published["family_members"], published["recipes"], published["recipe_search_documents"], result.SnapshotId, result.OperationId, published);
        var counts = new Dictionary<string, int>();
        var source = Path.Combine(recovery.DemoBaselineRoot, result.SnapshotId!.Value.ToString("N"));
        foreach (var table in RecoverySnapshotService.DemoTables)
        {
            using var document = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(source, "tables", table + ".json"), ct));
            counts[table] = document.RootElement.GetArrayLength();
        }
        return new(result.Message, counts["family_members"], counts["recipes"], counts["recipe_search_documents"], result.SnapshotId, result.OperationId, counts);
    }
}
