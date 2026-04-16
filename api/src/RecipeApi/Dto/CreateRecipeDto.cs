using System.ComponentModel.DataAnnotations;

namespace RecipeApi.Dto;

public class CreateRecipeDto
{
    /// <summary>Rating 0–3 (0=Unknown, 1=Dislike, 2=Like, 3=Love).</summary>
    [Range(0, 3)]
    public int Rating { get; set; } = 0;

    /// <summary>Index of the image that shows the finished dish. -1 means none selected.</summary>
    public int FinishedDishImageIndex { get; set; } = -1;

    /// <summary>Optional notes captured during recipe creation.</summary>
    public string? Notes { get; set; }
}
