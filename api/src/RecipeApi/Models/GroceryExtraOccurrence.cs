namespace RecipeApi.Models;

public sealed class GroceryExtraOccurrence
{
    public Guid Id { get; set; }
    public Guid LineageId { get; set; }
    public Guid? PredecessorId { get; set; }
    public DateOnly WeekStartDate { get; set; }
    public string Name { get; set; } = "";
    public string? CreationName { get; set; }
    public string NormalizedKey { get; set; } = "";
    public string GrocerySection { get; set; } = "Grocery";
    public bool Checked { get; set; }
    public DateTimeOffset? RemovedAt { get; set; }
    public int Version { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public static GroceryExtraOccurrence Create(Guid id, Guid lineageId, DateOnly week, string name,
        string normalizedKey, string section, DateTimeOffset now, Guid? predecessorId = null) => new()
        {
            Id = id,
            LineageId = lineageId,
            PredecessorId = predecessorId,
            WeekStartDate = week,
            Name = name,
            CreationName = name,
            NormalizedKey = normalizedKey,
            GrocerySection = section,
            CreatedAt = now,
            UpdatedAt = now
        };
}
