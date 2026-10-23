using System.Data;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

/// <summary>Host-local, serialized projection. Persisted voting ownership remains with VotingBoundary.</summary>
public sealed class VotingSession(IServiceScopeFactory scopes, ILogger<VotingSession> logger)
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly Guid _incarnationId = Guid.NewGuid();
    private long _revision;
    private Guid? _roundId;
    private bool _converged;
    private DateOnly? _weekStartDate;

    public Task<VotingSessionSnapshot> ReadAsync(CancellationToken cancellationToken = default) =>
        ProjectAsync(false, cancellationToken);

    public async Task<VotingSessionSnapshot?> RefreshAfterMutationAsync(DateOnly? affectedWeek = null)
    {
        try { return await ProjectAsync(true, CancellationToken.None, affectedWeek); }
        catch (Exception error) { logger.LogWarning(error, "Voting session refresh failed after a committed mutation"); return null; }
    }

    private async Task<VotingSessionSnapshot> ProjectAsync(bool publish, CancellationToken cancellationToken, DateOnly? affectedWeek = null)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var previousWeek = _weekStartDate;
            VotingSessionSnapshot snapshot;
            await using (var scope = scopes.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var clock = scope.ServiceProvider.GetRequiredService<IClock>();
                var calendar = scope.ServiceProvider.GetRequiredService<DeploymentCalendar>();
                var context = calendar.Capture(clock.UtcNow);
                await using var transaction = db.Database.IsRelational()
                    ? await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, cancellationToken) : null;
                await using var boundary = await VotingBoundary.BeginAsync(db, cancellationToken);
                var state = await db.VotingRoundStates.AsNoTracking().SingleOrDefaultAsync(cancellationToken);
                var plans = await db.WeeklyPlans.AsNoTracking()
                    .Where(p => p.Status == Models.WeeklyPlanStatus.VotingOpen).ToListAsync(cancellationToken);
                var owner = state?.WeekStartDate is { } owningWeek
                    ? plans.SingleOrDefault(p => p.WeekStartDate == owningWeek)
                    : state is null && plans.Count == 1 ? plans[0] : null;
                var round = state?.RoundId ?? owner?.VotingRoundId;
                SmartDefaultsDto? defaults = null;
                if (owner is not null && round is not null)
                {
                    var offset = (owner.WeekStartDate.DayNumber - context.CurrentWeekStartDate.DayNumber) / 7;
                    defaults = await new SmartDefaultsReader(db).ReadAsync(offset, context);
                }
                if (transaction is not null) await transaction.CommitAsync(cancellationToken);
                // Only successful coherent reads may advance the host-local projection.
                var required = defaults is null ? (int?)null : defaults.PreSelectedRecipes.Count + defaults.OpenSlots.Count;
                var covered = defaults is null ? (int?)null : Math.Min(required!.Value, defaults.ConsensusRecipesCount);
                var converged = _roundId == round && _converged;
                converged |= defaults is not null && covered == required;
                snapshot = new VotingSessionSnapshot
                {
                    IncarnationId = _incarnationId,
                    Revision = ++_revision,
                    RoundId = round,
                    WeekStartDate = defaults?.WeekStartDate,
                    Phase = defaults is null ? "unowned" : converged ? "converged" : "collecting",
                    RequiredSlots = required,
                    CoveredSlots = covered,
                    CandidateCount = defaults?.ConsensusRecipesCount,
                    SmartDefaults = defaults
                };
                _roundId = round;
                _converged = converged;
                _weekStartDate = snapshot.WeekStartDate;

            }
            if (publish && (affectedWeek is null || previousWeek == affectedWeek || snapshot.WeekStartDate == affectedWeek))
            {
                await using var scope = scopes.CreateAsyncScope();
                var publisher = scope.ServiceProvider.GetRequiredService<IScheduleEventPublisher>();
                await publisher.PublishVotingSessionUpdatedAsync(snapshot);
                if (snapshot.SmartDefaults is { } defaults)
                    await publisher.PublishSmartDefaultsUpdatedAsync(defaults.WeekOffset, defaults);
            }
            return snapshot;
        }
        finally { _gate.Release(); }
    }
}
