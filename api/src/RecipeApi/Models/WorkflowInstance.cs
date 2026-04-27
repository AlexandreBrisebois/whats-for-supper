using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

public enum WorkflowStatus { Pending, Processing, Completed, Failed, Paused }

[Table("workflow_instances")]
public class WorkflowInstance
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("workflow_id")]
    public string WorkflowId { get; set; } = string.Empty;

    [Column("status")]
    public WorkflowStatus Status { get; set; }

    [Column("parameters")]
    public string? Parameters { get; set; } // Store as JSONB in DB

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<WorkflowTask> Tasks { get; set; } = new List<WorkflowTask>();
}
