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
public class ManagementController(IWorkflowOrchestrator orchestrator, RecipeDbContext db) : ControllerBase
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
    public async Task<IActionResult> Restore()
    {
        var instance = await orchestrator.TriggerAsync("db-restore", []);
        return Accepted(new { message = "Restore task enqueued.", taskId = instance.Id });
    }

    /// <summary>
    /// POST /api/management/disaster-recovery — trigger an asynchronous disaster recovery.
    /// </summary>
    [HttpPost("disaster-recovery")]
    public async Task<IActionResult> DisasterRecovery()
    {
        var instance = await orchestrator.TriggerAsync("db-disaster-recovery", []);
        return Accepted(new { message = "Disaster recovery task enqueued.", taskId = instance.Id });
    }

    /// <summary>
    /// GET /api/management/status — get the status of the most recent management workflow.
    /// </summary>
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var managementWorkflows = new[] { "db-backup", "db-restore", "db-disaster-recovery" };
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

        var status = new ManagementStatus
        {
            WorkflowId = lastInstance.Id,
            WorkflowType = lastInstance.WorkflowId,
            Status = lastInstance.Status,
            CreatedAt = lastInstance.CreatedAt,
            UpdatedAt = lastInstance.UpdatedAt,
            Result = lastTaskResult,
        };

        return Ok(status);
    }

}

