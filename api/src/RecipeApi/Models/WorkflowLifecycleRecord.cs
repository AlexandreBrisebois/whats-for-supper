using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

// Independent, nonexecuting history. Removing a workflow must not cascade away
// its original command, selected occurrence or final observed task facts.
[Table("workflow_lifecycle_records")]
public sealed class WorkflowLifecycleRecord
{
    [Column("id")] public Guid Id { get; set; }
    [Column("operation_id")] public Guid OperationId { get; set; }
    [Column("disposition")] public required string Disposition { get; set; }
    [Column("payload", TypeName = "jsonb")] public required string Payload { get; set; }
    [Column("payload_hash")] public required string PayloadHash { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
}
