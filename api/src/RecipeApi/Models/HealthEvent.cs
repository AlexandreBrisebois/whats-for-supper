using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

[Table("health_events")]
public class HealthEvent
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("event_type")]
    [MaxLength(50)]
    public string EventType { get; set; } = string.Empty; // 'recipe_changed', 'week_changed'

    [Column("entity_id")]
    [MaxLength(100)]
    public string EntityId { get; set; } = string.Empty; // GUID for recipes, 'YYYY-MM-DD' for weeks

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "pending"; // 'pending', 'processing', 'completed', 'failed'

    [Column("attempts")]
    public int Attempts { get; set; } = 0;

    [Column("error_message")]
    public string? ErrorMessage { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Column("scheduled_for")]
    public DateTimeOffset ScheduledFor { get; set; } = DateTimeOffset.UtcNow;
}
