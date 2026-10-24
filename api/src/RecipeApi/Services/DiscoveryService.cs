using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public class DiscoveryService(RecipeDbContext dbContext, IScheduleEventPublisher publisher, IClock clock, DeploymentCalendar calendar, HistoricalInterestService historicalInterest, VotingSession? votingSession = null)
{
    private readonly RecipeDbContext _dbContext = dbContext;
    private readonly IScheduleEventPublisher _publisher = publisher;

    public async Task<List<RecipeDto>> GetRecipesForDiscoveryAsync(Guid familyMemberId, string? category = null, string? cuisine = null)
    {
        await using var rankingBoundary = await VotingBoundary.BeginAsync(_dbContext);
        var history = await historicalInterest.CaptureAsync();
        var query = EligibleQueue(familyMemberId);

        if (!string.IsNullOrEmpty(category))
        {
            query = category == "Supper"
                ? query.Where(r => r.SupperSuitable ?? (r.Category == "Supper" || (r.MealTypes != null && r.MealTypes.Contains("Supper"))))
                : query.Where(r => r.Category == category);
        }

        if (!string.IsNullOrEmpty(cuisine))
        {
            query = query.Where(r => r.CuisineType == cuisine);
        }

        // Exclude recipes already voted on by this user
        query = query.Where(r => !_dbContext.RecipeVotes.Any(v => v.RecipeId == r.Id
                                                                && v.FamilyMemberId == familyMemberId));

        // Apply ordering: VoteCount DESC, then within same vote count: never-cooked first
        // (NULL treated as DateTimeOffset.MinValue so it sorts before any real date),
        // then oldest last-cooked date first (ASC) — surfaces recipes that haven't been
        // on the table in a while, driving conversion toward high-momentum picks.
        query = query
            .OrderByDescending(r => r.VoteCount)
            .ThenBy(r => r.LastCookedDate ?? DateTimeOffset.MinValue)
            .ThenByDescending(history.OrderKey<DiscoveryRecipe>())
            .ThenBy(r => r.Id);

        var results = await query.ToListAsync();

        return results.Select(r =>
        {
            var dto = RecipeService.MapToDto(r.ToRecipe());
            dto.VoteCount = r.VoteCount;
            return dto;
        }).ToList();
    }

    public async Task<List<string>> GetAvailableCategoriesAsync(Guid familyMemberId)
    {
        var eligible = EligibleQueue(familyMemberId);
        return await eligible.Where(r => r.Category != null && r.Category != "Supper").Select(r => r.Category!)
            .Union(eligible.Where(r => r.SupperSuitable ?? (r.Category == "Supper" || (r.MealTypes != null && r.MealTypes.Contains("Supper"))))
                .Select(r => "Supper")).ToListAsync();
    }

    private IQueryable<DiscoveryRecipe> EligibleQueue(Guid memberId)
    {
        var monday = calendar.Capture(clock.UtcNow).CurrentWeekStartDate;
        var sunday = monday.AddDays(6);
        return _dbContext.DiscoveryRecipes.Where(r =>
            !_dbContext.CalendarEvents.Any(e => e.RecipeId == r.Id && e.Date >= monday && e.Date <= sunday &&
                (e.Status == CalendarEventStatus.Planned || e.Status == CalendarEventStatus.Locked || e.Status == CalendarEventStatus.Cooked)) &&
            !_dbContext.RecipeVotes.Any(v => v.RecipeId == r.Id && v.FamilyMemberId == memberId));
    }

    public async Task SubmitVoteAsync(Guid recipeId, Guid familyMemberId, VoteType vote)
    {
        var context = calendar.Capture(clock.UtcNow);
        await using (var transaction = await VotingBoundary.BeginAsync(_dbContext))
        {
            var existingVote = await _dbContext.RecipeVotes
                .FirstOrDefaultAsync(v => v.RecipeId == recipeId && v.FamilyMemberId == familyMemberId);

            if (existingVote != null)
            {
                existingVote.Vote = vote;
                existingVote.VotedAt = clock.UtcNow;
            }
            else
            {
                _dbContext.RecipeVotes.Add(new RecipeVote
                {
                    RecipeId = recipeId,
                    FamilyMemberId = familyMemberId,
                    Vote = vote,
                    VotedAt = clock.UtcNow
                });
            }

            await _dbContext.SaveChangesAsync();
            if (transaction is not null) await transaction.CommitAsync();
        }

        // Publish live vote count
        var voteCount = await _dbContext.RecipeVotes
            .CountAsync(v => v.RecipeId == recipeId && v.Vote == VoteType.Like);
        await _publisher.PublishVoteUpdatedAsync(recipeId, voteCount);

        // The active session publishes shared defaults for every committed vote, including late votes.
        if (votingSession is not null &&
            (await votingSession.RefreshAfterMutationAsync())?.WeekStartDate is not null) return;

        // Check if the vote crossed (or dropped below) the consensus threshold.
        // Threshold = ceil((familySize + 1) / 2). Publish smart_defaults_updated
        // when the count lands exactly on the threshold or one below it — those are
        // the two boundary values where the set of consensus recipes changes.
        var familySize = await _dbContext.FamilyMembers.CountAsync();
        var threshold = (int)Math.Ceiling((familySize + 1.0) / 2);
        if (voteCount == threshold || voteCount == threshold - 1)
        {
            var owner = await _dbContext.WeeklyPlans.AsNoTracking()
                .Where(p => p.Status == WeeklyPlanStatus.VotingOpen).Select(p => (DateOnly?)p.WeekStartDate).SingleOrDefaultAsync();
            var offset = owner.HasValue ? (owner.Value.DayNumber - context.CurrentWeekStartDate.DayNumber) / 7 : 0;
            var defaults = await new SmartDefaultsReader(_dbContext).ReadAsync(offset, context);
            await _publisher.PublishSmartDefaultsUpdatedAsync(offset, defaults);
        }
    }

    private int ParseIso8601Duration(string? duration)
    {
        if (string.IsNullOrEmpty(duration)) return 0;

        try
        {
            // Simple ISO 8601 duration parser for "PTxxM", "PTxxHxxM", etc.
            // Example: PT30M -> 30, PT1H10M -> 70
            var timeSpan = System.Xml.XmlConvert.ToTimeSpan(duration);
            return (int)timeSpan.TotalMinutes;
        }
        catch
        {
            return 0;
        }
    }

    public async Task<bool> IsMatchAsync(Guid recipeId)
        => await _dbContext.RecipeMatches.AnyAsync(m => m.RecipeId == recipeId);
}
