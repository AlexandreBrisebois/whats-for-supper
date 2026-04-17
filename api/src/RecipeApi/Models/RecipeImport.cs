using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

public enum RecipeImportStatus : short
{
    Pending = 0,
    Processing = 1,
    Failed = 2
}

[Table("recipe_imports")]
public class RecipeImport
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("recipe_id")]
    public Guid RecipeId { get; set; }

    [Column("status")]
    public RecipeImportStatus Status { get; set; } = RecipeImportStatus.Pending;

    [Column("error_message")]
    public string? ErrorMessage { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    [ForeignKey(nameof(RecipeId))]
    public Recipe? Recipe { get; set; }
}
