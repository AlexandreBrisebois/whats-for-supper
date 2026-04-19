namespace RecipeApi.Models;

/// <summary>
/// Metadata file stored alongside recipe images at {recipesRoot}/{id}/recipe.info.
/// Contains data that supplements the DB record (e.g. which image shows the finished dish).
/// </summary>
public class RecipeInfo
{
    public Guid Id { get; set; }
    public int FinishedDishImageIndex { get; set; } = -1;
    public int ImageCount { get; set; }
    public Guid? AddedBy { get; set; }
    public string? Notes { get; set; }
    public RecipeRating Rating { get; set; } = RecipeRating.Unknown;
    public DateTimeOffset CreatedAt { get; set; }
}
