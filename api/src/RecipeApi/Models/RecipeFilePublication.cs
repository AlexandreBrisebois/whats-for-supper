using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

/// <summary>Committed file delivery and its captured evidence; never proof of completed derived work.</summary>
[Table("recipe_file_publications")]
public sealed class RecipeFilePublication
{
    [Column("recipe_id")] public Guid RecipeId { get; set; }
    [Column("operation_id")] public Guid OperationId { get; set; }
    [Column("input_hash")] public required string InputHash { get; set; }
    [Column("payload", TypeName = "jsonb")] public required string Payload { get; set; }
    [Column("result_hash")] public required string ResultHash { get; set; }
    [Column("delivered")] public bool Delivered { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
}
