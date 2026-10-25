using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;

namespace RecipeApi.Services;

/// <summary>Serializes normal grocery-map writes on this application instance.</summary>
public sealed class GroceryCheckCoordinator(IServiceScopeFactory scopes)
{
    private readonly SemaphoreSlim gate = new(1, 1);

    internal async Task<T> ProcessAsync<T>(Func<RecipeDbContext, Task<T>> operation, CancellationToken ct)
    {
        await gate.WaitAsync(ct);
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            return await operation(scope.ServiceProvider.GetRequiredService<RecipeDbContext>());
        }
        finally { gate.Release(); }
    }

    internal static void SynchronizeTrackedPlan(RecipeDbContext caller, DateOnly monday, string state, string items)
    {
        foreach (var entry in caller.ChangeTracker.Entries<Models.WeeklyPlan>().Where(e => e.Entity.WeekStartDate == monday).ToArray())
        {
            var checks = entry.Property(p => p.GroceryState);
            checks.CurrentValue = checks.OriginalValue = state;
            checks.IsModified = false;
            var lines = entry.Property(p => p.GroceryItems);
            lines.CurrentValue = lines.OriginalValue = items;
            lines.IsModified = false;
        }
    }
}
