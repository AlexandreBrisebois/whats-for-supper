using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/ingredients")]
public class IngredientsController(IngredientCategoryService ingredientCategoryService) : ControllerBase
{
    [HttpPatch("{normalizedKey}/category")]
    public async Task<IActionResult> ReclassifyCategory(
        [FromRoute] string normalizedKey,
        [FromBody] ReclassifyIngredientDto dto,
        CancellationToken ct)
    {
        if (!GrocerySections.TryGetCanonicalName(dto?.GrocerySection, out var canonicalSection))
        {
            return Problem(
                statusCode: 400,
                title: "Invalid grocery section",
                detail: $"'{dto?.GrocerySection}' is not a valid GrocerySection. " +
                        $"Valid values: {string.Join(", ", GrocerySections.Names)}.");
        }

        await ingredientCategoryService.ReclassifyAsync(normalizedKey, canonicalSection, ct);
        return NoContent();
    }
}
