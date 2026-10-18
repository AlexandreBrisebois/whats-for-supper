using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

[Table("weekly_household_interest")]
public class WeeklyHouseholdInterest
{
    [Column("week_start_date")] public DateOnly WeekStartDate { get; set; }
    [Column("recipe_id")] public Guid RecipeId { get; set; }
    [Column("positive_count")] public int PositiveCount { get; set; }
    [Column("selected")] public bool Selected { get; set; }
    [Column("captured_at")] public DateTimeOffset CapturedAt { get; set; }
    [Column("close_id")] public Guid CloseId { get; set; }
}

[Table("voting_round_state")]
public class VotingRoundState
{
    [Column("id")] public int Id { get; set; } = 1;
    [Column("round_id")] public Guid RoundId { get; set; } = Guid.NewGuid();
    [Column("week_start_date")] public DateOnly? WeekStartDate { get; set; }
    [Column("history_generation")] public Guid HistoryGeneration { get; set; } = Guid.NewGuid();
    [Column("requires_round_identity")] public bool RequiresRoundIdentity { get; set; }
}
