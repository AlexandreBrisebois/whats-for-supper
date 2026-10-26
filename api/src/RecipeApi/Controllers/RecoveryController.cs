using Microsoft.AspNetCore.Mvc;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/management/recovery")]
[SkipWrapping]
public sealed class RecoveryController(RecoverySnapshotService recovery) : ControllerBase
{
    [HttpPost("snapshots")]
    public Task<IActionResult> Capture(CancellationToken ct) => Execute(() => recovery.CaptureAsync(ct));

    [HttpPost("restore/{snapshotId:guid}")]
    [DemoManagementAction]
    public Task<IActionResult> Restore(Guid snapshotId, CancellationToken ct) => Execute(() => recovery.RestoreExactAsync(snapshotId, ct));

    [HttpPost("resume")]
    public Task<IActionResult> Resume(CancellationToken ct) => Execute(() => recovery.ResumeAsync(ct));

    [HttpGet("status")]
    public Task<IActionResult> Status(CancellationToken ct) => Execute(() => recovery.StatusAsync(ct));

    private async Task<IActionResult> Execute(Func<Task<RecoveryResult>> operation)
    {
        try { return Ok(await operation()); }
        catch (OperationCanceledException) when (!HttpContext.RequestAborted.IsCancellationRequested)
        { Response.Headers.RetryAfter = "5"; return StatusCode(503, new RecoveryError("timed-out", "Recovery coordination duration exceeded; prior or committed state was reconciled. Check recovery status before retrying.")); }
        catch (RecoveryBusyException ex) { Response.Headers.RetryAfter = "5"; return Conflict(new RecoveryError("busy", ex.Message)); }
        catch (Exception ex) when (ex is InvalidDataException or System.Text.Json.JsonException or KeyNotFoundException or FormatException)
        { return BadRequest(new RecoveryError("invalid", ex.Message)); }
        catch (InvalidOperationException ex) { return StatusCode(503, new RecoveryError("unavailable", ex.Message)); }
    }
}
