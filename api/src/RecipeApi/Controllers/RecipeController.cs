using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
public class RecipeController(RecipeService recipeService, ImageService imageService) : ControllerBase
{
    /// <summary>POST /api/recipes — upload images and create a new recipe.</summary>
    [HttpPost("api/recipes")]
    [RequestSizeLimit(500 * 1024 * 1024)] // 500 MB outer limit (20 images × 20 MB)
    public async Task<IActionResult> Create(
        [FromHeader(Name = "X-Family-Member-Id")] Guid? familyMemberId,
        [FromForm] CreateRecipeDto dto,
        [FromForm] IFormFileCollection files)
    {
        if (familyMemberId is null)
            return BadRequest(new { message = "X-Family-Member-Id header is required." });

        var recipeId = await recipeService.CreateRecipe(familyMemberId.Value, files, dto);
        return Ok(new { recipeId, message = "Recipe created." });
    }

    /// <summary>GET /api/recipes — paginated list, newest first.</summary>
    [HttpGet("api/recipes")]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        var result = await recipeService.GetRecipesList(page, limit);
        return Ok(result);
    }

    /// <summary>GET /api/recipes/{id} — full detail for a single recipe.</summary>
    [HttpGet("api/recipes/{id:guid}")]
    public async Task<IActionResult> Detail(Guid id)
    {
        var result = await recipeService.GetRecipeDetail(id);
        return Ok(result);
    }

    /// <summary>GET /recipe/{recipeId}/original/{photoIndex} — raw image binary.</summary>
    [HttpGet("recipe/{recipeId:guid}/original/{photoIndex:int}")]
    public IActionResult GetImage(Guid recipeId, int photoIndex)
    {
        var (stream, contentType) = imageService.GetImage(recipeId, photoIndex);
        return File(stream, contentType);
    }

    /// <summary>GET /recipe/{recipeId}/hero — hero image (Phase 1). Returns 404 in Phase 0.</summary>
    [HttpGet("recipe/{recipeId:guid}/hero")]
    public IActionResult GetHero(Guid recipeId)
    {
        return NotFound(new { message = "Hero images are generated in Phase 1." });
    }

    /// <summary>DELETE /api/recipes/{id} — delete a recipe and its associated files.</summary>
    [HttpDelete("api/recipes/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await recipeService.DeleteRecipe(id);
        return NoContent();
    }
}
