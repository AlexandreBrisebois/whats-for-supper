using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/captures")]
public class CapturesController(CaptureFailureService captureFailureService) : ControllerBase
{
    /// <summary>GET /api/captures/failures — list active failed capture records.</summary>
    [HttpGet("failures")]
    public async Task<IActionResult> GetFailures(CancellationToken ct)
    {
        var failures = await captureFailureService.GetActiveFailuresAsync(ct);
        var items = failures.Select(f => new CaptureFailureDto
        {
            Id = f.Id,
            FamilyMemberId = f.FamilyMemberId,
            SourceType = f.SourceType,
            PreviewText = f.PreviewText,
            FriendlyReason = f.FriendlyReason,
            FailureCode = f.FailureCode,
            Status = f.Status,
            RetryCount = f.RetryCount,
            CreatedAt = f.CreatedAt,
            LastFailedAt = f.LastFailedAt,
        }).ToList();

        return Ok(new { data = new { items } });
    }

    /// <summary>POST /api/captures/failures/{id}/retry — retry a failed capture.</summary>
    [HttpPost("failures/{id:guid}/retry")]
    public async Task<IActionResult> Retry(Guid id, CancellationToken ct)
    {
        var result = await captureFailureService.RetryAsync(id, ct);

        return result switch
        {
            RetryResult.Queued => StatusCode(202, new { data = new { queued = true } }),
            RetryResult.AlreadyRetrying => Conflict(new
            {
                errorCode = "ALREADY_RETRYING",
                message = "A retry is already in progress.",
            }),
            RetryResult.UnsupportedPayloadVersion => UnprocessableEntity(new
            {
                errorCode = "UNSUPPORTED_PAYLOAD_VERSION",
                message = "This capture record uses an unsupported payload version and cannot be retried.",
            }),
            RetryResult.NotFound => NotFound(new { message = "Capture failure not found." }),
            _ => StatusCode(500, new { message = "Unexpected result." }),
        };
    }
}
