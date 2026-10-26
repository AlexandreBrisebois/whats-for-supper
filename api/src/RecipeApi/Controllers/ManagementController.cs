using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using RecipeApi.Services;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/management")]
[SkipWrapping]
public class ManagementController(
    IClock clock,
    IWorkflowOrchestrator orchestrator,
    RecipeDbContext db,
    DemoModeOptions demoModeOptions,
    RecoverySnapshotService recovery,
    CronScheduleCalculator scheduleCalculator) : ControllerBase
{
    /// <summary>
    /// POST /api/management/backup — trigger an asynchronous export.
    /// </summary>
    [HttpPost("backup")]
    public async Task<IActionResult> Backup()
    {
        var instance = await orchestrator.TriggerAsync("db-backup", []);
        return Accepted(new { message = "Backup task enqueued.", taskId = instance.Id });
    }

    /// <summary>
    /// POST /api/management/seed — trigger an asynchronous restore.
    /// </summary>
    [HttpPost("seed")]
    [DemoManagementAction]
    public async Task<IActionResult> Restore()
    {
        var instance = await orchestrator.TriggerAsync("db-restore", []);
        return Accepted(new { message = "Restore task enqueued.", taskId = instance.Id });
    }

    /// <summary>
    /// POST /api/management/disaster-recovery — trigger an asynchronous disaster recovery.
    /// </summary>
    [HttpPost("disaster-recovery")]
    [DemoManagementAction]
    public async Task<IActionResult> DisasterRecovery()
    {
        var instance = await orchestrator.TriggerAsync("db-disaster-recovery", []);
        return Accepted(new { message = "Disaster recovery task enqueued.", taskId = instance.Id });
    }

    /// <summary>
    /// POST /api/management/demo-capture — capture the Demo Mode master snapshot.
    /// </summary>
    [HttpPost("demo-capture")]
    [DemoManagementAction]
    public async Task<IActionResult> DemoCapture()
    {
        var instance = await orchestrator.TriggerAsync("demo-capture", []);
        return Accepted(new { message = "Demo capture task enqueued.", taskId = instance.Id });
    }

    /// <summary>
    /// POST /api/management/demo-restore — restore the Demo Mode master snapshot.
    /// </summary>
    [HttpPost("demo-restore")]
    [DemoManagementAction]
    public async Task<IActionResult> DemoRestore()
    {
        var instance = await orchestrator.TriggerAsync("demo-restore", []);
        return Accepted(new { message = "Demo restore task enqueued.", taskId = instance.Id });
    }

    /// <summary>
    /// POST /api/management/backfill-search — trigger a search index backfill.
    /// </summary>
    [HttpPost("backfill-search")]
    public async Task<IActionResult> BackfillSearch()
    {
        // Persist acceptance while the request still owns its mutation lease.
        await orchestrator.TriggerAsync("search-reconciliation", []);
        return Accepted(new { message = "Search index backfill triggered in the background." });
    }

    /// <summary>
    /// GET /api/management/status — get the status of the most recent management workflow.
    /// </summary>
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var managementWorkflows = new[] { "db-backup", "db-restore", "db-disaster-recovery", "demo-capture", "demo-restore" };
        var lastInstance = await db.WorkflowInstances
            .Where(i => managementWorkflows.Contains(i.WorkflowId))
            .Include(i => i.Tasks)
            .OrderByDescending(i => i.CreatedAt)
            .FirstOrDefaultAsync();

        if (lastInstance == null)
        {
            return NotFound(new { message = "No management tasks have been run yet." });
        }

        var lastTaskResult = lastInstance.Tasks
            .Where(t => t.Status == Models.TaskStatus.Completed && t.Result != null)
            .OrderByDescending(t => t.UpdatedAt)
            .Select(t => JsonSerializer.Deserialize<object>(t.Result!, JsonDefaults.CamelCase))
            .FirstOrDefault();
        var baseline = await recovery.InspectDemoAsync(HttpContext.RequestAborted);
        var cronIsValid = IsCronValid();
        var now = clock.UtcNow;
        var nextRestore = await db.WorkflowTasks.AsNoTracking()
            .Where(t => t.ProcessorName == "RestoreDemoState" && t.Status == Models.TaskStatus.Pending
                && t.ScheduledAt > now && t.Instance.WorkflowId == "demo-restore"
                && (t.Instance.Status == WorkflowStatus.Pending || t.Instance.Status == WorkflowStatus.Processing))
            .OrderBy(t => t.ScheduledAt).Select(t => t.ScheduledAt).FirstOrDefaultAsync();
        var lastReset = await db.WorkflowTasks.AsNoTracking().Where(t => t.ProcessorName == "RestoreDemoState"
                && (t.Status == Models.TaskStatus.Completed || t.Status == Models.TaskStatus.Processing
                    || t.Status == Models.TaskStatus.Failed || t.RetryCount > 0))
            .OrderByDescending(t => t.UpdatedAt).FirstOrDefaultAsync();

        var status = new ManagementStatus
        {
            WorkflowId = lastInstance.Id,
            WorkflowType = lastInstance.WorkflowId,
            Status = lastInstance.Status,
            CreatedAt = lastInstance.CreatedAt,
            UpdatedAt = lastInstance.UpdatedAt,
            Result = lastTaskResult,
            DemoSnapshotReady = baseline.Ready,
            DemoSnapshotMissing = baseline.Missing.ToList(),
            DemoBaselineId = baseline.BaselineId,
            DemoSnapshotErrorCode = baseline.ErrorCode,
            DemoRecoveryState = baseline.RecoveryState,
            DemoRestoreCronValid = cronIsValid,
            DemoNextRestoreAt = nextRestore,
            DemoLastResetTaskId = lastReset?.TaskId,
            DemoLastResetStatus = lastReset?.Status.ToString(),
            DemoRestoreSeederHealthy = demoModeOptions.Enabled && cronIsValid && nextRestore.HasValue,
            DemoRestoreSeederErrorCode = !cronIsValid ? "INVALID_CRON" : !demoModeOptions.Enabled ? "DEMO_DISABLED" : !nextRestore.HasValue ? "NO_CONFIRMED_SUCCESSOR" : null
        };

        return Ok(status);
    }

    private bool IsCronValid()
    {
        try
        {
            _ = scheduleCalculator.GetNextOccurrence(demoModeOptions.RestoreCronUtc, clock.UtcNow);
            return true;
        }
        catch
        {
            return false;
        }
    }

}
