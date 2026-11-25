using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/captures")]
public class CapturesController(CaptureFailureService captureFailureService) : ControllerBase
{
    /// <summary>GET /api/captures/activity — list household capture activity across active, search-stage, and failed states.</summary>
    [HttpGet("activity")]
    public async Task<IActionResult> GetActivity(CancellationToken ct)
    {
        var items = await captureFailureService.GetActivityAsync(ct);
        return Ok(new { data = new { items } });
    }

    /// <summary>GET /api/captures/failures — list active failed capture records.</summary>
    [HttpGet("failures")]
    public async Task<IActionResult> GetFailures(CancellationToken ct)
    {
        var items = await captureFailureService.GetActiveFailuresAsync(ct);
        return Ok(new { data = new { items } });
    }

    /// <summary>GET /api/captures/failures/{id}/details — fetch on-demand failure diagnostics.</summary>
    [HttpGet("failures/{id:guid}/details")]
    public async Task<IActionResult> GetFailureDetails(Guid id, CancellationToken ct)
    {
        var details = await captureFailureService.GetFailureDetailsAsync(id, ct);
        return details is null
            ? NotFound(new { message = "Capture failure not found." })
            : Ok(new { data = details });
    }

    /// <summary>POST /api/captures/failures/{id}/retry — retry a failed capture.</summary>
    [HttpPost("failures/{id:guid}/retry")]
    [DemoAiAction]
    public async Task<IActionResult> Retry(Guid id, CancellationToken ct)
    {
        var result = await captureFailureService.RetryAsync(id, ct);

        return result switch
        {
            CaptureFailureRetryResult.Queued => StatusCode(202, new { data = new { queued = true } }),
            CaptureFailureRetryResult.AlreadyRetrying => Conflict(new
            {
                errorCode = "ALREADY_RETRYING",
                message = "A retry is already in progress.",
            }),
            CaptureFailureRetryResult.NotFailedCapture => UnprocessableEntity(new
            {
                errorCode = "NOT_FAILED_CAPTURE",
                message = "This capture workflow is not in a failed state.",
            }),
            CaptureFailureRetryResult.NotFound => NotFound(new { message = "Capture failure not found." }),
            _ => StatusCode(500, new { message = "Unexpected result." }),
        };
    }

    /// <summary>DELETE /api/captures/failures/{id} — clear a failed capture and queue cleanup.</summary>
    [HttpDelete("failures/{id:guid}")]
    public async Task<IActionResult> Clear(Guid id, CancellationToken ct)
    {
        var result = await captureFailureService.ClearAsync(id, ct: ct);

        return result.Kind switch
        {
            CaptureFailureClearResultKind.Cleared => StatusCode(202, new
            {
                data = new CaptureFailureClearResponseDto
                {
                    Cleared = true,
                    CleanupCommandId = result.CleanupCommandId!.Value,
                },
            }),
            CaptureFailureClearResultKind.NotFound => NotFound(new { message = "Capture failure not found." }),
            CaptureFailureClearResultKind.NotFailedCapture => Conflict(new
            {
                errorCode = "NOT_FAILED_CAPTURE",
                message = "This capture workflow is not in a clearable failed state.",
            }),
            _ => StatusCode(500, new { message = "Unexpected result." }),
        };
    }
}
