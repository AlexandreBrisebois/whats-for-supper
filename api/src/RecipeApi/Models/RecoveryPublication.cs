using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace RecipeApi.Models;

[Table("recovery_publication")]
public sealed class RecoveryPublication
{
    [Key, Column("id")] public int Id { get; set; } = 1;
    [Column("operation_id")] public Guid OperationId { get; set; }
    [Column("snapshot_id")] public Guid SnapshotId { get; set; }
}
