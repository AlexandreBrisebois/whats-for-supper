namespace RecipeApi.Models;

/// <summary>
/// Summary result returned by <see cref="Services.ManagementService"/> restore and disaster-recovery operations.
/// </summary>
public class SeedResult
{
    public int MembersAdded { get; set; }
    public int MembersUpdated { get; set; }
    public int RecipesAdded { get; set; }
    public int RecipesUpdated { get; set; }
    public int RecipesSkipped { get; set; }
    public int WeeklyPlansRestored { get; set; }
    public int CalendarEventsRestored { get; set; }
    public int Errors { get; set; }
}
