using Microsoft.AspNetCore.Mvc;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/recipe-imports")]
public class RecipeImportController(RecipeImportService importService) : ControllerBase
{
    [HttpGet("{importId:guid}")]
    [SkipWrapping]
    public async Task<IActionResult> GetById(
        Guid importId,
        [ModelBinder(BinderType = typeof(FamilyMemberIdModelBinder))] Guid? familyMemberId = null)
    {
        if (familyMemberId is null)
            return BadRequest(new { status = StatusCodes.Status400BadRequest, message = "X-Family-Member-Id header is required." });

        try
        {
            var result = await importService.GetImportByIdAsync(importId, familyMemberId.Value);
            return result is null
                ? NotFound(new { message = "Recipe import not found." })
                : Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
