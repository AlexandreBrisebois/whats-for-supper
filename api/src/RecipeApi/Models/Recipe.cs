using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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
    public RecipeRating Rating { get; set; } = RecipeRating.Unknown;

    /// <summary>NULL when the capturing family member has since been deleted.</summary>
    [Column("added_by")]
    public Guid? AddedBy { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    /// <summary>Number of images saved for this recipe. Cached to avoid filesystem reads on listing.</summary>
    [Column("image_count")]
    public int ImageCount { get; set; } = 0;

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

    [ForeignKey(nameof(AddedBy))]
    public FamilyMember? AddedByMember { get; set; }
}
