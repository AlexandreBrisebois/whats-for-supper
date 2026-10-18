using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

public enum WeeklyPlanStatus : short
{
    Draft = 0,
    VotingOpen = 1,
    Locked = 2
}

[Table("weekly_plans")]
public class WeeklyPlan
{
    [Column("voting_round_id")] public Guid? VotingRoundId { get; set; }
    [Column("last_closed_round_id")] public Guid? LastClosedRoundId { get; set; }
    [Column("requires_round_identity")] public bool RequiresRoundIdentity { get; set; }
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("week_start_date")]
    public DateOnly WeekStartDate { get; set; }

    [Column("status")]
    public WeeklyPlanStatus Status { get; set; } = WeeklyPlanStatus.Draft;

    [Column("notified_at")]
    public DateTimeOffset? NotifiedAt { get; set; }

    [Column("grocery_state", TypeName = "jsonb")]
    public string GroceryState { get; set; } = "{}";

    [Column("grocery_items", TypeName = "jsonb")]
    public string GroceryItems { get; set; } = "[]";

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}
