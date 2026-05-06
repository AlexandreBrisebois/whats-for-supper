namespace RecipeApi.Models;

public record WeeklyBalanceSummary(
    int ProteinDays,
    int VeggieDays,
    int GrainDays,
    int PlantProteinDays,
    int RedMeatDays,
    int MaxConsecutiveSame,
    bool IsBalanced,
    string[] Recommendations,
    FopWeekSummary FopWeekSummary
);
