using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

[Table("maintenance_commands")]
public class MaintenanceCommand
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("command_type")]
    public string CommandType { get; set; } = string.Empty;

    [Column("status")]
    public string Status { get; set; } = "pending";

    [Column("payload", TypeName = "jsonb")]
    public string Payload { get; set; } = "{}";

    [Column("result", TypeName = "jsonb")]
    public string? Result { get; set; }

    [Column("attempts")]
    public int Attempts { get; set; }

    [Column("requested_by")]
    public Guid? RequestedBy { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Column("scheduled_for")]
    public DateTimeOffset? ScheduledFor { get; set; }

    [Column("started_at")]
    public DateTimeOffset? StartedAt { get; set; }

    [Column("completed_at")]
    public DateTimeOffset? CompletedAt { get; set; }

    [Column("last_error")]
    public string? LastError { get; set; }
}
