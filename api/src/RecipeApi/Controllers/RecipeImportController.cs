using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
public class RecipeImportController(RecipeImportService importService) : ControllerBase
{
    /// <summary>
    /// POST /api/recipes/{id}/import — trigger a manual recipe import.
    /// </summary>
    /// <param name="id">The recipe ID to import.</param>
    /// <returns>202 Accepted with the newly created ImportId.</returns>
    [HttpPost("api/recipes/{id:guid}/import")]
    public async Task<IActionResult> TriggerImport(Guid id)
    {
        try
        {
            var importId = await importService.TriggerImport(id);
            return Accepted(new RecipeImportTriggerResponseDto { ImportId = importId });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/recipes/{id}/import — check the status of a recipe import.
    /// </summary>
    /// <param name="id">The recipe ID.</param>
    /// <returns>200 OK with the import status.</returns>
    [HttpGet("api/recipes/{id:guid}/import")]
    public async Task<IActionResult> GetImportStatus(Guid id)
    {
        var result = await importService.GetImportStatus(id);

        if (result == null)
        {
            return NotFound(new { message = "No import status found for this recipe." });
        }

        return Ok(result);
    }
}
