using System.Text;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services.Management;

internal sealed class ManagementDreamingReportService(
    RecipeDbContext db,
    DataRootResolver dataRoot,
    IClock clock,
    ILogger logger)
{
    private string DataRoot => dataRoot.Root;

    public async Task<DreamingReportResult> GenerateDreamingReportAsync(
        WorkflowPruneResult? pruneResult = null,
        MaintenanceCommandBatchResult? maintenanceResult = null,
        MaintenanceCommandPruneResult? maintenancePruneResult = null,
        GroceryExtraRolloverResult? groceryExtraRolloverResult = null,
        CancellationToken ct = default)
    {
        pruneResult ??= new WorkflowPruneResult(0, 0);
        maintenanceResult ??= new MaintenanceCommandBatchResult(0, 0, 0, 0, []);
        var now = clock.UtcNow;
        maintenancePruneResult ??= new MaintenanceCommandPruneResult(0, 0, now.AddDays(-30));
        var since = now.AddHours(-24);
        var stuckCutoff = now.AddHours(-1);
        var dreamingStuckCutoff = now.AddHours(-24);

        var recentFailures = await db.WorkflowInstances
            .AsNoTracking()
            .Include(i => i.Tasks)
            .Where(i => i.Status == WorkflowStatus.Failed && i.UpdatedAt >= since)
            .OrderByDescending(i => i.UpdatedAt)
            .ToListAsync(ct);

        var stuckWorkflows = await db.WorkflowInstances
            .AsNoTracking()
            .Include(i => i.Tasks)
            .Where(i =>
                (i.Status == WorkflowStatus.Processing || i.Status == WorkflowStatus.Pending)
                && ((i.WorkflowId == "dreaming" && i.UpdatedAt < dreamingStuckCutoff)
                    || (i.WorkflowId != "dreaming" && i.UpdatedAt < stuckCutoff)))
            .OrderBy(i => i.UpdatedAt)
            .ToListAsync(ct);

        var latestBackup = await db.WorkflowInstances
            .AsNoTracking()
            .Where(i => i.WorkflowId == "db-backup")
            .OrderByDescending(i => i.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        var reportsRoot = Path.Combine(DataRoot, "reports");
        Directory.CreateDirectory(reportsRoot);
        var reportPath = Path.Combine(reportsRoot, $"dreaming-{now:yyyy-MM-dd}.md");

        var pendingMaintenanceCommands = await db.MaintenanceCommands
            .AsNoTracking()
            .Where(c => c.Status == "pending" || c.Status == "failed")
            .OrderBy(c => c.CreatedAt)
            .Take(20)
            .ToListAsync(ct);

        var markdown = BuildDreamingReport(
            now,
            pruneResult,
            maintenanceResult,
            maintenancePruneResult,
            groceryExtraRolloverResult,
            pendingMaintenanceCommands,
            latestBackup,
            recentFailures,
            stuckWorkflows);
        await File.WriteAllTextAsync(reportPath, markdown, ct);

        logger.LogInformation(
            "Generated Dreaming report at {Path}; failures={Failures}; stuck={Stuck}",
            reportPath,
            recentFailures.Count,
            stuckWorkflows.Count);

        return new DreamingReportResult(reportPath, recentFailures.Count, stuckWorkflows.Count);
    }

    private static string BuildDreamingReport(
        DateTimeOffset now,
        WorkflowPruneResult pruneResult,
        MaintenanceCommandBatchResult maintenanceResult,
        MaintenanceCommandPruneResult maintenancePruneResult,
        GroceryExtraRolloverResult? groceryExtraRolloverResult,
        List<MaintenanceCommand> pendingMaintenanceCommands,
        WorkflowInstance? latestBackup,
        List<WorkflowInstance> recentFailures,
        List<WorkflowInstance> stuckWorkflows)
    {
        var report = new StringBuilder();
        report.AppendLine("# Dreaming Report");
        report.AppendLine();
        report.AppendLine($"Generated: {now:O}");
        report.AppendLine();
        report.AppendLine("## Summary");
        report.AppendLine();
        report.AppendLine($"- Pruned workflow instances: {pruneResult.PrunedInstances}");
        report.AppendLine($"- Pruned workflow tasks: {pruneResult.PrunedTasks}");
        report.AppendLine($"- Maintenance commands completed: {maintenanceResult.Completed}");
        report.AppendLine($"- Maintenance commands skipped: {maintenanceResult.Skipped}");
        report.AppendLine($"- Maintenance commands failed: {maintenanceResult.Failed}");
        report.AppendLine($"- Terminal maintenance commands pruned: {maintenancePruneResult.PrunedCommands}");
        report.AppendLine($"- Legacy completion timestamps initialized: {maintenancePruneResult.InitializedCompletionTimestamps}");
        report.AppendLine(groceryExtraRolloverResult switch
        {
            null => "- Grocery-extra rollover: no completed result",
            { Succeeded: false } => $"- Grocery-extra rollover: failed (not completed); code={groceryExtraRolloverResult.FailureCode ?? "Unknown"}",
            _ => $"- Grocery-extra rollover: {groceryExtraRolloverResult.Created} occurrence(s) created through {groceryExtraRolloverResult.ThroughWeek:yyyy-MM-dd}"
        });
        report.AppendLine($"- Failed workflows in last 24h: {recentFailures.Count}");
        report.AppendLine($"- Stuck workflows: {stuckWorkflows.Count}");
        report.AppendLine();
        report.AppendLine("## Maintenance Commands");
        report.AppendLine();
        report.AppendLine($"- Pending at start: {maintenanceResult.PendingAtStart}");
        report.AppendLine($"- Completed: {maintenanceResult.Completed}");
        report.AppendLine($"- Skipped: {maintenanceResult.Skipped}");
        report.AppendLine($"- Failed: {maintenanceResult.Failed}");
        report.AppendLine($"- Terminal history pruned: {maintenancePruneResult.PrunedCommands}");
        report.AppendLine($"- Completion timestamps initialized: {maintenancePruneResult.InitializedCompletionTimestamps}");
        report.AppendLine($"- Retention cutoff (inclusive): {maintenancePruneResult.Cutoff:O}");
        report.AppendLine($"- Pending/failed after run: {pendingMaintenanceCommands.Count}");
        report.AppendLine();
        if (maintenanceResult.Items.Count == 0)
        {
            report.AppendLine("- No maintenance commands processed.");
        }
        else
        {
            foreach (var item in maintenanceResult.Items)
            {
                report.AppendLine($"- {item.Status}: {item.CommandType} command={item.CommandId} recipe={item.RecipeId?.ToString() ?? "n/a"} workflow={item.WorkflowInstanceId?.ToString() ?? "n/a"} reason={item.Reason ?? "n/a"}");
            }
        }
        if (pendingMaintenanceCommands.Count > 0)
        {
            report.AppendLine();
            report.AppendLine("### Pending Or Failed Commands");
            foreach (var command in pendingMaintenanceCommands)
            {
                report.AppendLine($"- {command.Status}: {command.CommandType} command={command.Id} attempts={command.Attempts} error={command.LastError ?? "n/a"}");
            }
        }
        report.AppendLine();
        report.AppendLine("## Backup Status");
        report.AppendLine();
        if (latestBackup == null)
        {
            report.AppendLine("- No db-backup workflow history found.");
        }
        else
        {
            report.AppendLine($"- db-backup: {latestBackup.Status} at {latestBackup.UpdatedAt:O}");
        }

        report.AppendLine();
        report.AppendLine("## Failed Workflows");
        report.AppendLine();
        if (recentFailures.Count == 0)
        {
            report.AppendLine("- None.");
        }
        else
        {
            foreach (var failure in recentFailures)
            {
                var errors = failure.Tasks
                    .Where(t => !string.IsNullOrWhiteSpace(t.ErrorMessage))
                    .Select(t => $"{t.TaskName}: {t.ErrorMessage}");
                report.AppendLine($"- {failure.WorkflowId} ({failure.Id}) at {failure.UpdatedAt:O}");
                foreach (var error in errors)
                {
                    report.AppendLine($"  - {error}");
                }
            }
        }

        report.AppendLine();
        report.AppendLine("## Keep an eye on these");
        report.AppendLine();
        if (stuckWorkflows.Count == 0)
        {
            report.AppendLine("- None.");
        }
        else
        {
            foreach (var stuck in stuckWorkflows)
            {
                report.AppendLine($"- {stuck.WorkflowId} ({stuck.Id}) has been {stuck.Status} since {stuck.UpdatedAt:O}");
            }
        }

        return report.ToString();
    }
}
