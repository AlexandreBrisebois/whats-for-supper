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
    public bool IsSynthesized { get; set; } = false;
    public Guid? AddedBy { get; set; }
    public string? Notes { get; set; }
    public string? Description { get; set; }
    public string? Name { get; set; }
    public RecipeRating Rating { get; set; } = RecipeRating.Unknown;
    public string? Language { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? Category { get; set; }
    public string? CuisineType { get; set; }
    public string[]? MealTypes { get; set; }
    public bool IsDiscoverable { get; set; } = false;
    public int RotationVersion { get; set; }
    public bool RotationHumanOff { get; set; }
    public string RotationSource { get; set; } = "Unknown";
    public bool CookedSuppressed { get; set; }
    public bool? SupperSuitable { get; set; }
    // PDF recovery must distinguish extracted metadata from workflow completion.
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public bool? IsReady { get; set; }
    public bool? IsVegetarian { get; set; }
    public string? TotalTime { get; set; }
    public DateTimeOffset? LastCookedDate { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public string? SourceUrl { get; set; }
    public object? RecipeInstructions { get; set; }
}
