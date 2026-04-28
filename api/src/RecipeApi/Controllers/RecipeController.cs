using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/recipes")]
public class RecipeController(
    RecipeService recipeService,
    ImageService imageService,
    RecipeImportService importService,
    RecipeImportBulkService bulkImportService) : ControllerBase
{
    /// <summary>POST /api/recipes — upload images and create a new recipe.</summary>
    [HttpPost]
    [RequestSizeLimit(500 * 1024 * 1024)] // 500 MB outer limit (20 images × 20 MB)
    public async Task<IActionResult> Create(
        [FromHeader(Name = "X-Family-Member-Id")] Guid? familyMemberId,
        [FromForm] CreateRecipeDto dto,
        [FromForm] IFormFileCollection files)
    {
        if (familyMemberId is null)
            return BadRequest(new { message = "X-Family-Member-Id header is required." });

        var recipeId = await recipeService.CreateRecipe(familyMemberId.Value, files, dto);
        return Ok(new { id = recipeId });
    }

    /// <summary>GET /api/recipes — paginated list, newest first.</summary>
    [HttpGet]
    [SkipWrapping]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        var result = await recipeService.GetRecipesList(page, limit);
        return Ok(result);
    }

    /// <summary>GET /api/recipes/{id} — full detail for a single recipe.</summary>
    [HttpGet("{id:guid}")]
    [SkipWrapping]
    public async Task<IActionResult> Detail(Guid id)
    {
        var result = await recipeService.GetRecipeDetail(id);
        return Ok(result);
    }

    /// <summary>
    /// PATCH /api/recipes/{id} — partial update for notes and/or rating.
    /// Changes are persisted to both the database and the recipe.info file on disk.
    /// Only fields included in the request body are applied; null fields are ignored.
    /// </summary>
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRecipeDto dto)
    {
        var result = await recipeService.UpdateRecipe(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// POST /api/recipes/{id}/import — trigger a manual recipe import.
    /// </summary>
    [HttpPost("{id:guid}/import")]
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
    [HttpGet("{id:guid}/import")]
    public async Task<IActionResult> GetImportStatus(Guid id)
    {
        var result = await importService.GetImportStatus(id);
        return result == null
            ? NotFound(new { message = "No import status found for this recipe." })
            : Ok(result);
    }

    /// <summary>
    /// GET /api/recipes/import-status — get a summary of the import pipeline's health.
    /// </summary>
    [HttpGet("import-status")]
    [SkipWrapping]
    public async Task<IActionResult> GetImportSummary()
    {
        var summary = await importService.GetImportSummary();
        return Ok(summary);
    }

    /// <summary>
    /// POST /api/recipes/imports/bulk — queue a recipe-import workflow for every unimported recipe.
    /// </summary>
    [HttpPost("imports/bulk")]
    [SkipWrapping]
    public async Task<IActionResult> BulkTriggerImport()
    {
        var result = await bulkImportService.TriggerAllPendingAsync();
        return Accepted(result);
    }

    /// <summary>GET /api/recipes/recommendations — mock recommendations (100% mocked data for development).</summary>
    [HttpGet("recommendations")]
    public IActionResult GetRecommendations()
    {
        var response = new RecommendationsResponseDto
        {
            TopPick = new TopPickDto
            {
                Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440010"),
                Name = "Homemade Lasagna",
                Description = "The ultimate comfort food, layered with rich meat sauce and creamy béchamel.",
                ImageUrl = "https://images.unsplash.com/photo-1574894709920-11b28e7367e3",
                PrepTime = "45 mins",
                Difficulty = "Medium",
            },
            Results = new List<RecommendationResultDto>
            {
                new RecommendationResultDto
                {
                    Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440011"),
                    Name = "Zesty Lemon Chicken",
                    Time = "30m",
                    Image = "https://images.unsplash.com/photo-1532550907401-a500c9a57435",
                },
                new RecommendationResultDto
                {
                    Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440012"),
                    Name = "Creamy Pesto Pasta",
                    Time = "15m",
                    Image = "https://images.unsplash.com/photo-1473093226795-af9932fe5856",
                },
            },
        };
        return Ok(response);
    }

    /// <summary>GET /api/recipes/{id}/original/{photoIndex} — raw image binary.</summary>
    [HttpGet("{recipeId:guid}/original/{photoIndex:int}")]
    public IActionResult GetImage(Guid recipeId, int photoIndex)
    {
        var (stream, contentType) = imageService.GetImage(recipeId, photoIndex);
        return File(stream, contentType);
    }

    /// <summary>
    /// GET /api/recipes/{id}/hero — AI-generated hero thumbnail (JPEG).
    /// Returns 404 until a recipe import has been completed.
    /// </summary>
    [HttpGet("{id:guid}/hero")]
    public IActionResult GetHero(Guid id)
    {
        var (stream, contentType) = imageService.GetHeroImage(id);
        return File(stream, contentType);
    }

    /// <summary>DELETE /api/recipes/{id} — delete a recipe and its associated files.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await recipeService.DeleteRecipe(id);
        return NoContent();
    }
}
