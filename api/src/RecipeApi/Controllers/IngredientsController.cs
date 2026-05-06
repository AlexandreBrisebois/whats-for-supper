using Microsoft.AspNetCore.Mvc;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Controllers;

[ApiController]
[Route("api/ingredients")]
public class IngredientsController(IngredientCategoryService ingredientCategoryService) : ControllerBase
{
    private static readonly HashSet<string> ValidSections = new(StringComparer.OrdinalIgnoreCase)
    {
        "Produce", "Meat", "Seafood", "Dairy & Eggs",
        "Frozen", "Bakery", "Pantry", "Beverages", "Deli", "Grocery"
    };

    [HttpPatch("{normalizedKey}/category")]
    public async Task<IActionResult> ReclassifyCategory(
        [FromRoute] string normalizedKey,
        [FromBody] ReclassifyIngredientDto dto,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto?.GrocerySection) || !ValidSections.Contains(dto.GrocerySection))
        {
            return Problem(
                statusCode: 400,
                title: "Invalid grocery section",
                detail: $"'{dto?.GrocerySection}' is not a valid GrocerySection. " +
                        $"Valid values: {string.Join(", ", ValidSections)}.");
        }

        await ingredientCategoryService.ReclassifyAsync(normalizedKey, dto.GrocerySection, ct);
        return NoContent();
    }
}
