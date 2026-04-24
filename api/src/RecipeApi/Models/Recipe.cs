using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace RecipeApi.Models;

/// <summary>4-point rating scale: 0=Unknown 1=Dislike 2=Like 3=Love</summary>
public enum RecipeRating : short
{
    Unknown = 0,
    Dislike = 1,
    Like = 2,
    Love = 3
}

[Table("recipes")]
public class Recipe
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("rating")]
    [JsonIgnore]
    public RecipeRating Rating { get; set; } = RecipeRating.Unknown;

    /// <summary>NULL when the capturing family member has since been deleted.</summary>
    [Column("added_by")]
    public Guid? AddedBy { get; set; }

    [Column("notes")]
    [JsonIgnore]
    public string? Notes { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("name")]
    public string? Name { get; set; }

    [Column("total_time")]
    public string? TotalTime { get; set; }

    /// <summary>Number of images saved for this recipe. Cached to avoid filesystem reads on listing.</summary>
    [Column("image_count")]
    public int ImageCount { get; set; } = 0;

    [Column("is_discoverable")]
    public bool IsDiscoverable { get; set; } = false;

    [Column("category")]
    public string? Category { get; set; }

    [Column("difficulty")]
    public string? Difficulty { get; set; }

    [Column("is_vegetarian")]
    public bool IsVegetarian { get; set; } = false;

    [Column("is_healthy_choice")]
    public bool IsHealthyChoice { get; set; } = false;

    // Phase 1+ fields — populated by import worker / AI pipeline
    /// <summary>Raw metadata extracted by AI from recipe images (Phase 1).</summary>
    [Column("raw_metadata", TypeName = "jsonb")]
    public string? RawMetadata { get; set; }

    /// <summary>Structured ingredient list extracted by AI (Phase 1).</summary>
    [Column("ingredients", TypeName = "jsonb")]
    public string? Ingredients { get; set; }

    // Phase 3+: pgvector embedding — not mapped until vector extension is enabled
    // public Vector? Embedding { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Column("last_cooked_date")]
    public DateTimeOffset? LastCookedDate { get; set; }

    [ForeignKey(nameof(AddedBy))]
    public FamilyMember? AddedByMember { get; set; }
}
