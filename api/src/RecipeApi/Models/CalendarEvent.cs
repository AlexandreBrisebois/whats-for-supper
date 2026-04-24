using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

[Table("calendar_events")]
public class CalendarEvent
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("recipe_id")]
    public Guid RecipeId { get; set; }

    [Column("date")]
    public DateOnly Date { get; set; }

    [Column("status")]
    public CalendarEventStatus Status { get; set; }

    [ForeignKey(nameof(RecipeId))]
    public Recipe? Recipe { get; set; }

    [Column("vote_count")]
    public int? VoteCount { get; set; }
}

public enum CalendarEventStatus : short
{
    Planned = 0,
    Locked = 1,
    Cooked = 2,
    Skipped = 3
}
