using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

// Independent inert history; terminal command removal cannot erase its observed result.
[Table("maintenance_command_lifecycle_records")]
public sealed class MaintenanceCommandLifecycleRecord
{
    [Column("id")] public Guid Id { get; set; }
    [Column("operation_id")] public Guid OperationId { get; set; }
    [Column("disposition")] public required string Disposition { get; set; }
    [Column("payload", TypeName = "jsonb")] public required string Payload { get; set; }
    [Column("payload_hash")] public required string PayloadHash { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
}
