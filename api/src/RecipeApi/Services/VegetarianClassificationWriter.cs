using RecipeApi.Models;

namespace RecipeApi.Services;

/// <summary>Atomic mutation rules for the WFS-owned vegetarian fact.</summary>
public sealed class VegetarianClassificationWriter
{
    public void ApplySuccess(Recipe recipe, bool isVegetarian, int version, DateTimeOffset classifiedAt)
    {
        recipe.IsVegetarian = isVegetarian;
        recipe.VegetarianClassificationVersion = version;
        recipe.VegetarianClassifiedAt = classifiedAt;
        recipe.VegetarianClassificationFailedAt = null;
        recipe.VegetarianClassificationFailureReason = null;
    }

    public void ApplyFailure(Recipe recipe, string reason, DateTimeOffset failedAt)
    {
        recipe.VegetarianClassificationFailedAt = failedAt;
        recipe.VegetarianClassificationFailureReason = reason.Length <= 500 ? reason : reason[..500];
    }
}
