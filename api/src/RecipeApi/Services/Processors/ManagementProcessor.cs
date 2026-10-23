using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public class ManagementProcessor(
    ManagementService managementService,
    RecipeDbContext db,
    string processorName) : IWorkflowProcessor
{
    public string ProcessorName => processorName;

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        return ProcessorName switch
        {
            "BackupDatabase" => await managementService.BackupAsync(),
            "RestoreDatabase" => await managementService.RestoreAsync(ct),
            "DisasterRecovery" => await managementService.DisasterRecoveryAsync(),
            "CaptureDemoState" => await managementService.CaptureDemoStateAsync(ct),
            "RestoreDemoState" => await managementService.RestoreDemoStateAsync(ct),
            "PruneWorkflows" => await managementService.PruneWorkflowsAsync(GetRetentionDays(task.Payload), ct),
            "ProcessMaintenanceCommands" => await managementService.ProcessMaintenanceCommandsAsync(ct),
            "PruneMaintenanceCommands" => await managementService.PruneMaintenanceCommandsAsync(
                GetPositiveInt(task.Payload, "retentionDays", 30),
                GetPositiveInt(task.Payload, "batchSize", 500),
                ct),
            "GenerateDreamingReport" => await managementService.GenerateDreamingReportAsync(
                await GetPruneResultAsync(task, ct),
                await GetMaintenanceResultAsync(task, ct),
                await GetMaintenancePruneResultAsync(task, ct),
                await GetGroceryExtraRolloverResultAsync(task, ct),
                ct),
            _ => throw new NotSupportedException($"Processor {ProcessorName} is not supported by ManagementProcessor.")
        };
    }

    private static int GetRetentionDays(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload))
        {
            return 7;
        }

        using var document = JsonDocument.Parse(payload);
        if (document.RootElement.TryGetProperty("retentionDays", out var retentionDays)
            && retentionDays.TryGetInt32(out var value))
        {
            return value;
        }

        return 7;
    }

    private static int GetPositiveInt(string? payload, string propertyName, int defaultValue)
    {
        if (string.IsNullOrWhiteSpace(payload))
            return defaultValue;

        using var document = JsonDocument.Parse(payload);
        return document.RootElement.TryGetProperty(propertyName, out var property)
            && property.TryGetInt32(out var value)
            && value > 0
                ? value
                : defaultValue;
    }

    private async Task<WorkflowPruneResult?> GetPruneResultAsync(WorkflowTask task, CancellationToken ct)
    {
        var pruneTask = await db.WorkflowTasks
            .AsNoTracking()
            .Where(t => t.InstanceId == task.InstanceId && t.ProcessorName == "PruneWorkflows" && t.Result != null)
            .OrderByDescending(t => t.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        return string.IsNullOrWhiteSpace(pruneTask?.Result)
            ? null
            : JsonSerializer.Deserialize<WorkflowPruneResult>(pruneTask.Result, JsonDefaults.CamelCase);
    }

    private async Task<MaintenanceCommandBatchResult?> GetMaintenanceResultAsync(WorkflowTask task, CancellationToken ct)
    {
        var maintenanceTask = await db.WorkflowTasks
            .AsNoTracking()
            .Where(t => t.InstanceId == task.InstanceId && t.ProcessorName == "ProcessMaintenanceCommands" && t.Result != null)
            .OrderByDescending(t => t.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        return string.IsNullOrWhiteSpace(maintenanceTask?.Result)
            ? null
            : JsonSerializer.Deserialize<MaintenanceCommandBatchResult>(maintenanceTask.Result, JsonDefaults.CamelCase);
    }

    private async Task<MaintenanceCommandPruneResult?> GetMaintenancePruneResultAsync(WorkflowTask task, CancellationToken ct)
    {
        var pruneTask = await db.WorkflowTasks
            .AsNoTracking()
            .Where(t => t.InstanceId == task.InstanceId && t.ProcessorName == "PruneMaintenanceCommands" && t.Result != null)
            .OrderByDescending(t => t.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        return string.IsNullOrWhiteSpace(pruneTask?.Result)
            ? null
            : JsonSerializer.Deserialize<MaintenanceCommandPruneResult>(pruneTask.Result, JsonDefaults.CamelCase);
    }

    private async Task<GroceryExtraRolloverResult?> GetGroceryExtraRolloverResultAsync(WorkflowTask task, CancellationToken ct)
    {
        var rolloverTask = await db.WorkflowTasks
            .AsNoTracking()
            .Where(t => t.InstanceId == task.InstanceId && t.ProcessorName == "RolloverGroceryExtras" && t.Result != null)
            .OrderByDescending(t => t.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        return string.IsNullOrWhiteSpace(rolloverTask?.Result)
            ? null
            : JsonSerializer.Deserialize<GroceryExtraRolloverResult>(rolloverTask.Result, JsonDefaults.CamelCase);
    }
}
