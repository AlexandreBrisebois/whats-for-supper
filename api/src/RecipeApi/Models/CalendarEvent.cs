namespace RecipeApi.Models;

public class CalendarEvent
{
    public Guid Id { get; set; }
    public Guid RecipeId { get; set; }
    public DateOnly Date { get; set; }
    public CalendarEventStatus Status { get; set; }
    public Recipe? Recipe { get; set; }
}

public enum CalendarEventStatus : short
{
    Planned = 0,
    Locked = 1,
    Cooked = 2,
    Skipped = 3
}
