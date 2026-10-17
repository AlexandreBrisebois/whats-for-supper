using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public sealed class ReconcileRecipeRotationProcessor(
    RecipeDbContext db, IClock clock, DeploymentCalendar calendar, RecipeRotationOptions options,
    IScheduleEventPublisher publisher, ILogger<ReconcileRecipeRotationProcessor> logger) : IWorkflowProcessor
{
    public string ProcessorName => "ReconcileRecipeRotation";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (!options.Enabled) return new { enabled = false };
        var context = calendar.Capture(clock.UtcNow);
        var cutoff = context.CurrentWeekStartDate.AddDays(-7 * options.CookedCooldownWeeks);
        var ids = await db.Recipes.AsNoTracking().Where(r => r.IsReady).OrderBy(r => r.Id).Select(r => r.Id).ToListAsync(ct);
        var changed = 0;
        foreach (var id in ids)
        {
            ct.ThrowIfCancellationRequested();
            var updated = false;
            await using (var transaction = await RecipeRotation.LockAsync(db, id, ct))
            {
                var recipe = await db.Recipes.SingleOrDefaultAsync(r => r.Id == id && r.IsReady, ct);
                if (recipe is null) continue;
                var suppressed = recipe.LastCookedDate is { } cooked && calendar.Capture(cooked).Today >= cutoff;
                var discoverable = RecipeRotation.Suitable(recipe) && !recipe.RotationHumanOff && !suppressed;
                if (recipe.CookedSuppressed != suppressed || recipe.IsDiscoverable != discoverable)
                {
                    recipe.CookedSuppressed = suppressed;
                    recipe.IsDiscoverable = discoverable;
                    if (!recipe.RotationHumanOff) recipe.RotationSource = "Dreaming";
                    recipe.UpdatedAt = clock.UtcNow;
                    await db.SaveChangesAsync(ct);
                    updated = true;
                }
                if (transaction is not null) await transaction.CommitAsync(ct);
            }
            if (updated)
            {
                changed++;
                await publisher.PublishAllSuggestionsInvalidatedAsync();
            }
        }
        logger.LogInformation("Dreaming rotation completed: cutoff {Cutoff}, weeks {Weeks}, evaluated {Evaluated}, changed {Changed}", cutoff, options.CookedCooldownWeeks, ids.Count, changed);
        return new { enabled = true, cutoff, weeks = options.CookedCooldownWeeks, evaluated = ids.Count, changed };
    }
}
