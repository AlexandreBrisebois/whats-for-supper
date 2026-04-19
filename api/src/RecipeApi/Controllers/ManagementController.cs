using Microsoft.AspNetCore.Mvc;
using RecipeApi.Models;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/management")]
public class ManagementController(ManagementTaskStore taskStore) : ControllerBase
{
    /// <summary>
    /// POST /api/management/backup — trigger an asynchronous export.
    /// </summary>
    [HttpPost("backup")]
    public IActionResult Backup()
    {
        if (!taskStore.TryEnqueue(ManagementTaskType.Backup, out var task))
        {
            return Conflict(new { message = "A management task is already in progress. Please wait." });
        }

        return Accepted(new { message = "Backup task enqueued.", taskId = task!.Id });
    }

    /// <summary>
    /// POST /api/management/seed — trigger an asynchronous restore.
    /// </summary>
    [HttpPost("seed")]
    public IActionResult Restore()
    {
        if (!taskStore.TryEnqueue(ManagementTaskType.Restore, out var task))
        {
            return Conflict(new { message = "A management task is already in progress. Please wait." });
        }

        return Accepted(new { message = "Restore task enqueued.", taskId = task!.Id });
    }

    /// <summary>
    /// POST /api/management/disaster-recovery — trigger an asynchronous disaster recovery.
    /// </summary>
    [HttpPost("disaster-recovery")]
    public IActionResult DisasterRecovery()
    {
        if (!taskStore.TryEnqueue(ManagementTaskType.DisasterRecovery, out var task))
        {
            return Conflict(new { message = "A management task is already in progress. Please wait." });
        }

        return Accepted(new { message = "Disaster recovery task enqueued.", taskId = task!.Id });
    }

    /// <summary>
    /// GET /api/management/status — get the status of the current or most recent task.
    /// </summary>
    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var task = taskStore.GetCurrentTask();
        if (task == null)
        {
            return NotFound(new { message = "No management tasks have been run yet." });
        }

        return Ok(task);
    }
}
