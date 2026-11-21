using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

// Original generations survive task/workflow retirement; no cascading foreign key.
[Table("workflow_reset_intents")]
public sealed class WorkflowResetIntent
{
    [Key, Column("id")] public Guid Id { get; set; }
    [Column("task_id")] public Guid TaskId { get; set; }
    [Column("instance_id")] public Guid InstanceId { get; set; }
    [Column("request", TypeName = "jsonb")] public string Request { get; set; } = "";
    [Column("request_hash")] public string RequestHash { get; set; } = "";
    [Column("applied_at")] public DateTimeOffset? AppliedAt { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
}
