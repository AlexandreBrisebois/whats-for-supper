using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

public class DiscoveryRecipe
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("name")]
    public string? Name { get; set; }

    [Column("category")]
    public string? Category { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("image_count")]
    public int ImageCount { get; set; }

    [Column("difficulty")]
    public string? Difficulty { get; set; }

    [Column("total_time")]
    public string? TotalTime { get; set; }

    [Column("last_cooked_date")]
    public DateTimeOffset? LastCookedDate { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("vote_count")]
    public int VoteCount { get; set; }

    // Map to Recipe for easy conversion if needed
    public Recipe ToRecipe() => new()
    {
        Id = Id,
        Name = Name,
        Category = Category,
        Description = Description,
        ImageCount = ImageCount,
        Difficulty = Difficulty,
        TotalTime = TotalTime,
        LastCookedDate = LastCookedDate,
        CreatedAt = CreatedAt
    };
}
