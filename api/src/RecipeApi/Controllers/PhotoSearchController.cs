using Microsoft.AspNetCore.Mvc;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/photo-search")]
public class PhotoSearchController(InventoryCaptureService captureService) : ControllerBase
{
    /// <summary>
    /// POST /api/photo-search — classify recipe vs inventory photos with a single vision call.
    /// Recipe photos return an extracted query for library search. Inventory photos return
    /// a short-lived pantry snapshot used by pantry-assisted search.
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

        var (result, busy) = await captureService.ProcessPhotoSearchAsync(photos, ct);

        if (busy)
        {
            return StatusCode(202, new
            {
                status = "busy",
                retryAfterSeconds = 30,
                message = "We're processing a lot right now. Try again in a moment."
            });
        }

        return Ok(result);
    }
}
