namespace RecipeApi.Dto;

public class RecipeDto
{
    public Guid Id { get; set; }
    public int Rating { get; set; }
    public Guid? AddedBy { get; set; }

    /// <summary>Zero-based photo indices available for this recipe.</summary>
    public List<int> Images { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; }
}
