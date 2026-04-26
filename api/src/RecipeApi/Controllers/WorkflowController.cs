using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/workflows")]
public class WorkflowController(
    IWorkflowOrchestrator orchestrator,
    RecipeDbContext db) : ControllerBase
{
    /// <summary>
    /// POST /api/workflows/{workflowId}/trigger — trigger a workflow execution.
    /// </summary>
    /// <param name="workflowId">The workflow ID to trigger.</param>
    /// <param name="request">The trigger request with parameters.</param>
    /// <returns>202 Accepted with the newly created instance ID.</returns>
    [HttpPost("{workflowId}/trigger")]
    public async Task<IActionResult> Trigger(string workflowId, [FromBody] WorkflowTriggerRequestDto request)
    {
        try
        {
            var instance = await orchestrator.TriggerAsync(workflowId, request.Parameters);
            return Accepted(new WorkflowTriggerResponseDto { InstanceId = instance.Id });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/workflows/instances/{instanceId} — get a workflow instance with all tasks.
    /// </summary>
    /// <param name="instanceId">The instance ID.</param>
    /// <returns>200 OK with the instance metadata and tasks.</returns>
    [HttpGet("instances/{instanceId:guid}")]
    public async Task<IActionResult> GetInstance(Guid instanceId)
    {
        var instance = await db.WorkflowInstances
            .Include(i => i.Tasks)
            .FirstOrDefaultAsync(i => i.Id == instanceId);

        if (instance == null)
        {
            return NotFound(new { message = "Workflow instance not found." });
        }

        var detail = WorkflowInstanceDetailDto.FromModel(instance);
        return Ok(detail);
    }

    /// <summary>
    /// GET /api/workflows/active — get all Processing or Paused workflow instances.
    /// </summary>
    /// <returns>200 OK with the list of active instances.</returns>
    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        var active = await db.WorkflowInstances
            .Where(i => i.Status == WorkflowStatus.Processing || i.Status == WorkflowStatus.Paused)
            .OrderByDescending(i => i.UpdatedAt)
            .ToListAsync();

        var summaries = active.Select(WorkflowInstanceSummaryDto.FromModel).ToList();
        return Ok(summaries);
    }

    /// <summary>
    /// POST /api/workflows/tasks/{taskId}/reset — reset a failed task to Pending.
    /// </summary>
    /// <param name="taskId">The task ID to reset.</param>
    /// <returns>200 OK on success.</returns>
    [HttpPost("tasks/{taskId:guid}/reset")]
    public async Task<IActionResult> ResetTask(Guid taskId)
    {
        var task = await db.WorkflowTasks.FirstOrDefaultAsync(t => t.TaskId == taskId);
        if (task == null)
        {
            return NotFound(new { message = "Task not found." });
        }

        task.Status = Models.TaskStatus.Pending;
        task.RetryCount = 0;
        task.ScheduledAt = DateTimeOffset.UtcNow;
        task.ErrorMessage = null;
        task.StackTrace = null;

        var instance = task.Instance ?? await db.WorkflowInstances.FirstOrDefaultAsync(i => i.Id == task.InstanceId);
        if (instance != null && instance.Status == WorkflowStatus.Paused)
        {
            instance.Status = WorkflowStatus.Processing;
        }

        await db.SaveChangesAsync();

        return Ok(new { message = "Task reset successfully." });
    }
}
