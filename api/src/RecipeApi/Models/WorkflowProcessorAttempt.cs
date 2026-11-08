using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

// Independent observations, not execution authority or a downstream delivery receipt.
[Table("workflow_processor_attempts")]
public sealed class WorkflowProcessorAttempt
{
    [Key, Column("id")] public Guid Id { get; set; }
    [Column("task_id")] public Guid TaskId { get; set; }
    [Column("instance_id")] public Guid InstanceId { get; set; }
    [Column("request", TypeName = "jsonb")] public string Request { get; set; } = "";
    [Column("request_hash")] public string RequestHash { get; set; } = "";
    [Column("outcome", TypeName = "jsonb")] public string? Outcome { get; set; }
    [Column("outcome_hash")] public string? OutcomeHash { get; set; }
    [Column("observed_at")] public DateTimeOffset? ObservedAt { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
}
