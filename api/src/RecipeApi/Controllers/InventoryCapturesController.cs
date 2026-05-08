using Microsoft.AspNetCore.Mvc;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/inventory-captures")]
public class InventoryCapturesController(InventoryCaptureService captureService) : ControllerBase
{
    /// <summary>
    /// POST /api/inventory-captures — submit pantry photos and receive an in-memory snapshot.
    /// Temp files are deleted after processing. Returns 202 when the vision model is busy.
    /// </summary>
    [HttpPost]
    [RequestSizeLimit(100 * 1024 * 1024)]
    public async Task<IActionResult> Create(
        IFormFileCollection files,
        CancellationToken ct)
    {
        var photos = new List<byte[]>();
        foreach (var file in files)
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms, ct);
            photos.Add(ms.ToArray());
        }

        var (snapshot, busy) = await captureService.ProcessAsync(photos, ct);

        if (busy)
        {
            return StatusCode(202, new
            {
                status = "busy",
                retryAfterSeconds = 30,
                message = "We're processing a lot right now. Try again in a moment."
            });
        }

        return Ok(new
        {
            snapshotId = snapshot!.SnapshotId,
            inferredIngredients = snapshot.InferredIngredients,
            confidence = snapshot.Confidence
        });
    }

    /// <summary>
    /// GET /api/inventory-captures/{id} — retrieve a previously built pantry snapshot by ID.
    /// Snapshots are in-memory only and expire after 60 seconds.
    /// </summary>
    [HttpGet("{id:guid}")]
    [SkipWrapping]
    public IActionResult Get(Guid id)
    {
        var snapshot = captureService.GetSnapshot(id);
        if (snapshot is null)
            return NotFound();

        return Ok(new
        {
            data = new
            {
                snapshotId = snapshot.SnapshotId,
                inferredIngredients = snapshot.InferredIngredients,
                confidence = snapshot.Confidence
            }
        });
    }
}
