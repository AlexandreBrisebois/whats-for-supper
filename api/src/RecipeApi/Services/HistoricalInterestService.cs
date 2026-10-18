using System.Linq.Expressions;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed class HistoricalInterestOptions
{
    public int Weeks { get; }
    public bool Enabled { get; }
    public HistoricalInterestOptions(IConfiguration configuration)
    {
        var setting = configuration["HISTORICAL_INTEREST_WEEKS"];
        if (setting is null) Weeks = 4;
        else if (int.TryParse(setting, out var weeks) && weeks is > 0 and <= 5200) Weeks = weeks;
        else throw new InvalidOperationException("HISTORICAL_INTEREST_WEEKS must be an integer from 1 to 5200.");
        var enabled = configuration["HISTORICAL_INTEREST_ENABLED"];
        if (enabled is null) Enabled = true;
        else if (bool.TryParse(enabled, out var value)) Enabled = value;
        else throw new InvalidOperationException("HISTORICAL_INTEREST_ENABLED must be true or false.");
    }
}

public sealed record HistoricalInterestSnapshot(string Generation, int Weeks, IReadOnlyDictionary<Guid, int> Counts)
{
    public double Signal(Guid id) => Counts.GetValueOrDefault(id) / (double)Weeks;

    // Express the captured input as SQL predicates so ranking precedes pagination.
    public Expression<Func<T, int>> OrderKey<T>()
    {
        var item = Expression.Parameter(typeof(T), "recipe");
        Expression score = Expression.Constant(0);
        foreach (var group in Counts.GroupBy(x => x.Value))
        {
            var ids = group.Select(x => x.Key).ToArray();
            var contains = Expression.Call(typeof(Enumerable), nameof(Enumerable.Contains), [typeof(Guid)],
                Expression.Constant(ids), Expression.Property(item, "Id"));
            score = Expression.Condition(contains, Expression.Constant(group.Key), score);
        }
        return Expression.Lambda<Func<T, int>>(score, item);
    }
}

public sealed class HistoricalInterestService(RecipeDbContext db, IClock clock, DeploymentCalendar calendar, HistoricalInterestOptions options)
{
    public async Task<HistoricalInterestSnapshot> CaptureAsync(CancellationToken ct = default)
    {
        var monday = calendar.Capture(clock.UtcNow).CurrentWeekStartDate;
        var cutoff = monday.AddDays(-7 * options.Weeks);
        await using var transaction = await VotingBoundary.BeginAsync(db, ct);
        var generation = await db.VotingRoundStates.AsNoTracking().Select(s => s.HistoryGeneration).SingleOrDefaultAsync(ct);
        var active = await db.WeeklyPlans.AsNoTracking().Where(p => p.Status == WeeklyPlanStatus.VotingOpen)
            .Select(p => p.WeekStartDate).OrderBy(x => x).ToArrayAsync(ct);
        var counts = options.Enabled
            ? await db.WeeklyHouseholdInterests.AsNoTracking()
                .Where(h => h.WeekStartDate >= cutoff && h.WeekStartDate < monday && !active.Contains(h.WeekStartDate) && !h.Selected && h.PositiveCount > 0)
                .GroupBy(h => h.RecipeId).Select(g => new { Id = g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Id, x => x.Count, ct)
            : new Dictionary<Guid, int>();
        if (transaction is not null) await transaction.CommitAsync(ct);
        var fingerprint = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"v1/{generation}/{monday:yyyy-MM-dd}/{options.Weeks}/{options.Enabled}/{string.Join(',', active)}")));
        return new(fingerprint, options.Weeks, counts);
    }
}
