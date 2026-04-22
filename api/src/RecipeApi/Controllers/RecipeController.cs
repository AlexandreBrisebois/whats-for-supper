using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/recipes")]
public class RecipeController(RecipeService recipeService, ImageService imageService) : ControllerBase
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
        return Ok(new { recipeId, message = "Recipe created." });
    }

    /// <summary>GET /api/recipes — paginated list, newest first.</summary>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        var result = await recipeService.GetRecipesList(page, limit);
        return Ok(result);
    }

    /// <summary>GET /api/recipes/{id} — full detail for a single recipe.</summary>
    [HttpGet("{id:guid}")]
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

    /// <summary>GET /api/recipes/recommendations — mock recommendations (100% mocked data for development).</summary>
    [HttpGet("recommendations")]
    public IActionResult GetRecommendations()
    {
        var response = new RecommendationsDto
        {
            TopPick = new TopPickDto
            {
                Id = "lasagna",
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
                    Id = "1",
                    Name = "Zesty Lemon Chicken",
                    Time = "30m",
                    Image = "https://images.unsplash.com/photo-1532550907401-a500c9a57435",
                },
                new RecommendationResultDto
                {
                    Id = "2",
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
    [HttpGet("{recipeId:guid}/hero")]
    public IActionResult GetHero(Guid recipeId)
    {
        var (stream, contentType) = imageService.GetHeroImage(recipeId);
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
