namespace RecipeApi.Dto;

public class RecipeDto
{
    public Guid Id { get; set; }
    public int Rating { get; set; }
    public Guid? AddedBy { get; set; }

    /// <summary>Zero-based photo indices available for this recipe.</summary>
    public List<int> Images { get; set; } = [];

    public string? Description { get; set; }
    public string? Name { get; set; }
    public string? TotalTime { get; set; }
    public string? Category { get; set; }
    public string? Difficulty { get; set; }
    public bool IsVegetarian { get; set; }
    public bool IsHealthyChoice { get; set; }

    public List<string>? Ingredients { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
