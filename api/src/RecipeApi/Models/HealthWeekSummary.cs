using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApi.Models;

[Table("health_week_summaries")]
public class HealthWeekSummary
{
    [Key]
    [Column("week_start_date")]
    public DateOnly WeekStartDate { get; set; }

    [Column("balance_summary", TypeName = "jsonb")]
    public string? BalanceSummary { get; set; }

    [Column("fop_week_summary", TypeName = "jsonb")]
    public string? FopWeekSummary { get; set; }

    [Column("last_recomputed_at")]
    public DateTimeOffset LastRecomputedAt { get; set; } = DateTimeOffset.UtcNow;
}
