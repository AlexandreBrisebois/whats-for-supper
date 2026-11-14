using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/foods")]
public sealed class FoodsController(HouseholdFoodOverrideStore overrides) : ControllerBase
{
    [HttpPatch("{foodId}/category")]
    public async Task<IActionResult> ReclassifyCategory(string foodId, [FromBody] ReclassifyFoodCategoryDto request, CancellationToken ct)
    {
        if (!Guid.TryParseExact(foodId, "D", out var id) || id == Guid.Empty
            || !GrocerySections.TryGetCanonicalName(request.GrocerySection, out var section))
            return BadRequest(new { message = "A valid food identifier and grocery section are required." });
        if (!request.HasExpectedCategoryRevision) return Conflict(new { code = "upgrade_required", categoryRevision = (string?)null });
        try { await overrides.ReclassifyCategoryAsync(id, section, request.ExpectedCategoryRevision, ct); }
        catch (FoodCategoryConflictException conflict) { return Conflict(new { code = conflict.Code, categoryRevision = conflict.CategoryRevision }); }
        return NoContent();
    }
}
