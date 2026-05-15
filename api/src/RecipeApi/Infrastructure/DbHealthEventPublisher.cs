using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Infrastructure;

public class DbHealthEventPublisher(RecipeDbContext dbContext) : IHealthEventPublisher
{
    public async Task PublishRecipeChangedAsync(Guid recipeId, CancellationToken ct)
    {
        var healthEvent = new HealthEvent
        {
            EventType = "recipe_changed",
            EntityId = recipeId.ToString(),
            Status = "pending",
            CreatedAt = DateTimeOffset.UtcNow,
            ScheduledFor = DateTimeOffset.UtcNow
        };

        dbContext.HealthEvents.Add(healthEvent);
        await dbContext.SaveChangesAsync(ct);
    }

    public async Task PublishWeekChangedAsync(DateOnly monday, CancellationToken ct)
    {
        var healthEvent = new HealthEvent
        {
            EventType = "week_changed",
            EntityId = monday.ToString("yyyy-MM-dd"),
            Status = "pending",
            CreatedAt = DateTimeOffset.UtcNow,
            ScheduledFor = DateTimeOffset.UtcNow
        };

        dbContext.HealthEvents.Add(healthEvent);
        await dbContext.SaveChangesAsync(ct);
    }
}
