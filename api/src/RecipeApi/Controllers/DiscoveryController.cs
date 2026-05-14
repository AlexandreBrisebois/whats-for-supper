using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/discovery")]
public class DiscoveryController(DiscoveryService discoveryService) : ControllerBase
{
    private readonly DiscoveryService _discoveryService = discoveryService;

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(
        [ModelBinder(BinderType = typeof(FamilyMemberIdModelBinder))] Guid? familyMemberId)
    {
        if (familyMemberId is null)
            return BadRequest(new { message = "X-Family-Member-Id header is required." });

        var categories = await _discoveryService.GetAvailableCategoriesAsync(familyMemberId.Value);
        return Ok(categories);
    }

    [HttpGet]
    public async Task<IActionResult> GetDiscoveryStack(
        [ModelBinder(BinderType = typeof(FamilyMemberIdModelBinder))] Guid? familyMemberId,
        [FromQuery] string? category,
        [FromQuery] string? cuisine)
    {
        if (familyMemberId is null)
            return BadRequest(new { message = "X-Family-Member-Id header is required." });

        var recipes = await _discoveryService.GetRecipesForDiscoveryAsync(familyMemberId.Value, category, cuisine);
        return Ok(recipes);
    }

    [HttpPost("{id:guid}/vote")]
    public async Task<IActionResult> Vote(
        Guid id,
        [ModelBinder(BinderType = typeof(FamilyMemberIdModelBinder))] Guid? familyMemberId,
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
