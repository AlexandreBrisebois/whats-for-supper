using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

// Retained independently of report resolution and later attempts. No cascading
// relationship may silently discard the originally accepted command/evidence.
[Table("recipe_repair_intents")]
public sealed class RecipeRepairIntent
{
    [Column("id")] public Guid Id { get; set; }
    [Column("recipe_id")] public Guid RecipeId { get; set; }
    [Column("payload", TypeName = "jsonb")] public required string Payload { get; set; }
    [Column("input_hash")] public required string InputHash { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
}
