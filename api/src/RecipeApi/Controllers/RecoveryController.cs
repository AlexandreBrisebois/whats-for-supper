using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http.Features;
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
    public Task<IActionResult> Restore(Guid snapshotId, CancellationToken ct) => Execute(async () =>
    {
        RecoveryRestoreRequest? request = null;
        if (HttpContext.Features.Get<IHttpRequestBodyDetectionFeature>()?.CanHaveBody == true)
        {
            using var reader = new StreamReader(Request.Body, new System.Text.UTF8Encoding(false, true), detectEncodingFromByteOrderMarks: true, leaveOpen: true);
            var raw = await reader.ReadToEndAsync(ct);
            if (!string.IsNullOrWhiteSpace(raw))
            {
                if (!Request.HasJsonContentType()) throw new InvalidDataException("Restore request content must be JSON.");
                using var body = System.Text.Json.JsonDocument.Parse(raw);
                if (body.RootElement.ValueKind != System.Text.Json.JsonValueKind.Object)
                    throw new InvalidDataException("Restore request must be an object.");
                request = FoodVocabularyDefinitions.ReadStrict<RecoveryRestoreRequest>(body.RootElement.GetRawText());
            }
        }
        return await recovery.RestoreExactAsync(snapshotId, ct, request?.ExpectedDestinationRevision);
    });

    [HttpGet("restore/{snapshotId:guid}/preflight")]
    [DemoManagementAction]
    public Task<IActionResult> Preflight(Guid snapshotId, CancellationToken ct) => Execute(() => recovery.PreflightRestoreAsync(snapshotId, ct));

    [HttpPost("resume")]
    public Task<IActionResult> Resume(CancellationToken ct) => Execute(() => recovery.ResumeAsync(ct));

    [HttpGet("status")]
    public Task<IActionResult> Status(CancellationToken ct) => Execute(() => recovery.StatusAsync(ct));

    private async Task<IActionResult> Execute<T>(Func<Task<T>> operation)
    {
        try { return Ok(await operation()); }
        catch (OperationCanceledException) when (!HttpContext.RequestAborted.IsCancellationRequested)
        { Response.Headers.RetryAfter = "5"; return StatusCode(503, new RecoveryError("timed-out", "Recovery coordination duration exceeded; prior or committed state was reconciled. Check recovery status before retrying.")); }
        catch (RecoveryDestinationConflictException ex) { return Conflict(new RecoveryError("destination-conflict", ex.Message)); }
        catch (RecoveryBusyException ex) { Response.Headers.RetryAfter = "5"; return Conflict(new RecoveryError("busy", ex.Message)); }
        catch (Exception ex) when (ex is InvalidDataException or System.Text.Json.JsonException or System.Text.DecoderFallbackException or KeyNotFoundException or FormatException)
        { return BadRequest(new RecoveryError("invalid", ex.Message)); }
        catch (InvalidOperationException ex) { return StatusCode(503, new RecoveryError("unavailable", ex.Message)); }
    }
}
