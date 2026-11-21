using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

/// <summary>Original physical retirement intent and independent delivery receipt. No cascading foreign keys.</summary>
[Table("recipe_physical_deletions")]
public sealed class RecipePhysicalDeletion
{
    [Key, Column("recipe_id")] public Guid RecipeId { get; set; }
    [Column("operation_id")] public Guid OperationId { get; set; }
    [Column("kind")] public required string Kind { get; set; }
    [Column("payload", TypeName = "jsonb")] public required string Payload { get; set; }
    [Column("payload_hash")] public required string PayloadHash { get; set; }
    [Column("recipe_hash")] public required string RecipeHash { get; set; }
    [Column("files_removed")] public bool? FilesRemoved { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
    [Column("files_delivered_at")] public DateTimeOffset? FilesDeliveredAt { get; set; }
    [Column("completed_at")] public DateTimeOffset? CompletedAt { get; set; }
}
