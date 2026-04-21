using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/discovery")]
public class DiscoveryController(DiscoveryService discoveryService) : ControllerBase
{
    private readonly DiscoveryService _discoveryService = discoveryService;

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(
        [FromHeader(Name = "X-Family-Member-Id")] Guid? familyMemberId)
    {
        if (familyMemberId is null)
            return BadRequest(new { message = "X-Family-Member-Id header is required." });

        var categories = await _discoveryService.GetAvailableCategoriesAsync(familyMemberId.Value);
        return Ok(categories);
    }

    [HttpGet]
    public async Task<IActionResult> GetDiscoveryStack(
        [FromHeader(Name = "X-Family-Member-Id")] Guid? familyMemberId,
        [FromQuery] string? category)
    {
        if (familyMemberId is null)
            return BadRequest(new { message = "X-Family-Member-Id header is required." });

        var recipes = await _discoveryService.GetRecipesForDiscoveryAsync(familyMemberId.Value, category);
        return Ok(recipes);
    }

    [HttpPost("{id:guid}/vote")]
    public async Task<IActionResult> Vote(
        Guid id,
        [FromHeader(Name = "X-Family-Member-Id")] Guid? familyMemberId,
        [FromBody] VoteDto dto)
    {
        if (familyMemberId is null)
            return BadRequest(new { message = "X-Family-Member-Id header is required." });

        if (dto == null)
            return BadRequest(new { message = "Vote body is required." });

        await _discoveryService.SubmitVoteAsync(id, familyMemberId.Value, dto.Vote);
        return Ok(new { message = "Vote recorded." });
    }
}
