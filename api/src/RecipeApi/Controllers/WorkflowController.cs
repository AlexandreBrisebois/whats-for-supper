using System.Text.Json;
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
    IClock clock,
    IWorkflowOrchestrator orchestrator,
    RecipeDbContext db,
    DemoModeOptions demoMode) : ControllerBase
{
    /// <summary>
    /// POST /api/workflows/{workflowId}/trigger — trigger a workflow execution.
    /// </summary>
    /// <param name="workflowId">The workflow ID to trigger.</param>
    /// <param name="request">The trigger request with parameters.</param>
    /// <returns>202 Accepted with the newly created instance ID.</returns>
    [HttpPost("{workflowId}/trigger")]
    [ProducesResponseType(typeof(DemoManagementUnavailableError), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Trigger(string workflowId, [FromBody] WorkflowTriggerRequestDto request)
    {
        try
        {
            if (demoMode.Enabled && await ReferencesDemoManagementAsync(workflowId, request.Parameters, []))
                return StatusCode(StatusCodes.Status403Forbidden, new DemoManagementUnavailableError());
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
    /// GET /api/workflows/tasks/{taskId}/diagnostics — get internal failure diagnostics for one task.
    /// </summary>
    /// <param name="taskId">The task ID from the workflow instance's task list.</param>
    /// <returns>200 OK with the stored error and stack trace.</returns>
    [HttpGet("tasks/{taskId:guid}/diagnostics")]
    public async Task<IActionResult> GetTaskDiagnostics(Guid taskId)
    {
        var task = await db.WorkflowTasks
            .Include(t => t.Instance)
            .FirstOrDefaultAsync(t => t.TaskId == taskId);
        if (task == null)
        {
            return NotFound(new { message = "Task not found." });
        }

        return Ok(WorkflowTaskDiagnosticsDto.FromModel(task));
    }

    /// <summary>
    /// POST /api/workflows/tasks/{taskId}/reset — reset a failed task to Pending.
    /// </summary>
    /// <param name="taskId">The task ID to reset.</param>
    /// <returns>200 OK on success.</returns>
    [HttpPost("tasks/{taskId:guid}/reset")]
    [ProducesResponseType(typeof(DemoManagementUnavailableError), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ResetTask(Guid taskId)
    {
        var task = await db.WorkflowTasks.FirstOrDefaultAsync(t => t.TaskId == taskId);
        if (task == null)
        {
            return NotFound(new { message = "Task not found." });
        }

        var instance = task.Instance ?? await db.WorkflowInstances.FirstOrDefaultAsync(i => i.Id == task.InstanceId);
        if (demoMode.Enabled && (IsDemoManagementWorkflow(instance?.WorkflowId) || IsDemoManagementProcessor(task.ProcessorName)
            || await DispatchesDemoManagementAsync(task.ProcessorName, task.Payload, [], [])))
            return StatusCode(StatusCodes.Status403Forbidden, new DemoManagementUnavailableError());

        task.Status = Models.TaskStatus.Pending;
        task.RetryCount = 0;
        task.ScheduledAt = clock.UtcNow;
        task.ErrorMessage = null;
        task.StackTrace = null;

        if (instance != null && instance.Status == WorkflowStatus.Paused)
        {
            instance.Status = WorkflowStatus.Processing;
        }

        await db.SaveChangesAsync();

        return Ok(new { message = "Task reset successfully." });
    }

    private static bool IsDemoManagementWorkflow(string? id) => id is "demo-capture" or "demo-restore" or "db-restore" or "db-disaster-recovery";
    private static bool IsDemoManagementProcessor(string? processor) => processor is "CaptureDemoState" or "RestoreDemoState" or "RestoreDatabase" or "DisasterRecovery";

    private async Task<bool> ReferencesDemoManagementAsync(string id, Dictionary<string, string> parameters, HashSet<string> visited)
    {
        if (IsDemoManagementWorkflow(id)) return true;
        var dispatch = id + ":" + JsonSerializer.Serialize(parameters.OrderBy(p => p.Key, StringComparer.Ordinal));
        if (!visited.Add(dispatch)) return false;
        var definition = await orchestrator.GetDefinitionAsync(id);
        if (definition is null) return false;
        foreach (var task in definition.Tasks)
            if (IsDemoManagementProcessor(task.Processor)
                || await DispatchesDemoManagementAsync(task.Processor, System.Text.Json.JsonSerializer.Serialize(task.Payload), parameters, visited))
                return true;
        return false;
    }

    private async Task<bool> DispatchesDemoManagementAsync(string processor, string? payload, Dictionary<string, string> parameters, HashSet<string> visited)
    {
        if (processor != "StartWorkflow") return false;
        using var document = System.Text.Json.JsonDocument.Parse(payload ?? "{}");
        if (!document.RootElement.TryGetProperty("workflowId", out var workflow)) return true;
        var id = System.Text.RegularExpressions.Regex.Replace(workflow.GetString() ?? "", @"\{\{(.*?)\}\}",
            match => parameters.GetValueOrDefault(match.Groups[1].Value.Trim(), match.Value));
        // Unresolved dynamic dispatch cannot grant a visitor management authority.
        if (string.IsNullOrWhiteSpace(id) || id.Contains("{{", StringComparison.Ordinal)) return true;
        var childParameters = document.RootElement.TryGetProperty("parameters", out var values)
            ? values.Deserialize<Dictionary<string, string>>() ?? [] : new Dictionary<string, string>();
        return await ReferencesDemoManagementAsync(id, childParameters, visited);
    }
}
