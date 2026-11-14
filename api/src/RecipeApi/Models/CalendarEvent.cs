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
    public Guid? RecipeId { get; set; }

    [Column("date")]
    public DateOnly Date { get; set; }

    [Column("status")]
    public CalendarEventStatus Status { get; set; }

    [Column("meal_slot")]
    public short MealSlot { get; set; }

    [ForeignKey(nameof(RecipeId))]
    public Recipe? Recipe { get; set; }

    [Column("non_cooking_kind")]
    public string? NonCookingKind { get; set; }

    [Column("non_cooking_label")]
    public string? NonCookingLabel { get; set; }

    [Column("prepared_on")]
    public DateOnly? PreparedOn { get; set; }
    [Column("prepared_at_utc")]
    public DateTimeOffset? PreparedAtUtc { get; set; }
    [Column("prepared_servings")]
    public int? PreparedServings { get; set; }
    [Column("prepared_original_servings")]
    public int? PreparedOriginalServings { get; set; }
    [Column("preparation_plan_token")]
    public string? PreparationPlanToken { get; set; }
    [Column("preparation_serving_version")]
    public string? PreparationServingVersion { get; set; }

    [Column("vote_count")]
    public int? VoteCount { get; set; }

    [Column("candidate_ids")]
    public Guid[]? CandidateIds { get; set; }
}

public enum CalendarEventStatus : short
{
    Planned = 0,
    Locked = 1,
    Cooked = 2,
    Skipped = 3,
    AwaitingConsensus = 4
}
