using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

[Table("workflow_child_intents")]
public sealed class WorkflowChildIntent
{
    [Key, Column("id")] public Guid Id { get; set; }
    [Column("parent_task_id")] public Guid ParentTaskId { get; set; }
    [Column("request", TypeName = "jsonb")] public string Request { get; set; } = "";
    [Column("request_hash")] public string RequestHash { get; set; } = "";
    [Column("prepared", TypeName = "jsonb")] public string? Prepared { get; set; }
    [Column("prepared_hash")] public string? PreparedHash { get; set; }
    [Column("accepted_at")] public DateTimeOffset? AcceptedAt { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
}
