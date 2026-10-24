using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

public sealed record GroceryExtraRolloverResult(
    int Created,
    DateOnly ThroughWeek,
    bool Succeeded = true,
    string? FailureCode = null);

public sealed class GroceryExtraRolloverService(RecipeDbContext db, IClock clock, DeploymentCalendar calendar,
    IScheduleEventPublisher? publisher = null, ILogger<GroceryExtraRolloverService>? logger = null)
{
    public Task<GroceryExtraRolloverResult> ReconcileCurrentAsync(CancellationToken ct = default) =>
        ReconcileAsync(calendar.Capture(clock.UtcNow).CurrentWeekStartDate, ct);

    public async Task<GroceryExtraRolloverResult> ReconcileAsync(DateOnly throughWeek, CancellationToken ct = default)
    {
        if (throughWeek.DayOfWeek != DayOfWeek.Monday) throw new ArgumentException("Rollover target must be Monday.", nameof(throughWeek));
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        if (db.Database.IsNpgsql()) await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(1196578386)", ct);
        var all = await db.GroceryExtraOccurrences.OrderBy(x => x.WeekStartDate).ThenBy(x => x.CreatedAt).ToListAsync(ct);
        var created = 0;
        foreach (var lineage in all.GroupBy(x => x.LineageId))
        {
            var latest = lineage.MaxBy(x => x.WeekStartDate)!;
            while (latest.WeekStartDate < throughWeek && !latest.Checked && latest.RemovedAt is null)
            {
                var nextWeek = latest.WeekStartDate.AddDays(7);
                var next = GroceryExtraOccurrence.Create(Guid.NewGuid(), latest.LineageId, nextWeek, latest.Name,
                    latest.NormalizedKey, latest.GrocerySection, clock.UtcNow, latest.Id);
                db.GroceryExtraOccurrences.Add(next); created++; latest = next;
            }
        }
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        if (created > 0 && publisher is not null)
        {
            try
            {
                var extras = await db.GroceryExtraOccurrences.AsNoTracking()
                    .Where(x => x.WeekStartDate == throughWeek && x.RemovedAt == null).OrderBy(x => x.CreatedAt)
                    .Select(x => GroceryExtraService.ToDto(x, false)).ToListAsync(ct);
                await publisher.PublishGroceryExtrasUpdatedAsync(throughWeek, extras);
            }
            catch (Exception ex) { logger?.LogWarning(ex, "Grocery extra rollover committed but live publication failed."); }
        }
        return new(created, throughWeek);
    }
}
