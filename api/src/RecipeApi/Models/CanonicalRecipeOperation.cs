using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

[Table("canonical_recipe_operations")]
public sealed class CanonicalRecipeOperation
{
    [Column("recipe_id")] public Guid RecipeId { get; set; }
    [Column("operation_id")] public Guid OperationId { get; set; }
    [Column("input_hash")] public required string InputHash { get; set; }
    // Absent on old operations. Never backfill from current recipe state.
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    [Column("original_request")] public string? OriginalRequest { get; set; }
    [Column("result", TypeName = "jsonb")] public required string Result { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
}
