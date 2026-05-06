using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class IngredientCategoryService(
    RecipeDbContext db,
    GroceryRecomputeService groceryRecompute,
    ILogger<IngredientCategoryService> logger)
{
    /// <summary>
    /// Upserts the ingredient_categories row for <paramref name="normalizedKey"/>,
    /// sets source = "human", then recomputes all affected weekly grocery lists.
    /// </summary>
    public async Task ReclassifyAsync(
        string normalizedKey,
        string grocerySection,
        CancellationToken ct)
    {
        var existing = await db.IngredientCategories
            .FirstOrDefaultAsync(ic => ic.NormalizedKey == normalizedKey, ct);

        if (existing is null)
        {
            db.IngredientCategories.Add(new IngredientCategory
            {
                NormalizedKey = normalizedKey,
                GrocerySection = grocerySection,
                Confidence = 1.0,
                Source = "human",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            });
        }
        else
        {
            existing.GrocerySection = grocerySection;
            existing.Source = "human";
            existing.Confidence = 1.0;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "Ingredient '{Key}' reclassified to '{Section}' by human",
            normalizedKey, grocerySection);

        await groceryRecompute.RecomputeForIngredientAsync(normalizedKey, ct);
    }
}
