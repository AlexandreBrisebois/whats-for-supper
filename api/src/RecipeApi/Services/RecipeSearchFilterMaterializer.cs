using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed record RecipeSearchFilterSnapshot(
    DateTimeOffset GeneratedAt,
    IReadOnlyList<string> PromotedCuisines,
    IReadOnlyList<string> AllCuisines);

/// <summary>Builds the durable Dreaming-only facts consumed later by Search and filter serving.</summary>
public class RecipeSearchFilterMaterializer(RecipeDbContext db, IClock clock)
{
    private const int PromotedCuisineLimit = 6;
    private const int RotationWindowDays = 28;

    public async Task<RecipeSearchFilterSnapshot> MaterializeAsync(CancellationToken ct)
    {
        var generatedAt = clock.UtcNow;
        var eligibleRecipes = await db.Recipes
            .Where(recipe => recipe.IsReady && !string.IsNullOrWhiteSpace(recipe.CuisineType))
            .Select(recipe => new EligibleRecipe(recipe.Id, recipe.CuisineType!))
            .ToListAsync(ct);
        var recipeIds = eligibleRecipes.Select(recipe => recipe.Id).ToArray();
        var votes = await db.RecipeVotes
            .Where(vote => recipeIds.Contains(vote.RecipeId))
            .Select(vote => new VoteEvidence(vote.RecipeId, vote.Vote))
            .ToListAsync(ct);
        var cookedEvents = await db.CalendarEvents
            .Where(@event => @event.RecipeId != null
                && recipeIds.Contains(@event.RecipeId.Value)
                && @event.Status == CalendarEventStatus.Cooked)
            .Select(@event => new CookEvidence(@event.RecipeId!.Value, @event.Date))
            .ToListAsync(ct);

        var facts = eligibleRecipes
            .Select(recipe => BuildFact(recipe, votes, cookedEvents, generatedAt))
            .OrderBy(fact => fact.RecipeId)
            .ToList();
        var snapshot = BuildSnapshot(eligibleRecipes, facts, cookedEvents, generatedAt);

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        db.RecipeSearchAffinityFacts.RemoveRange(db.RecipeSearchAffinityFacts);
        db.RecipeSearchAffinityFacts.AddRange(facts);
        var state = await db.RecipeSearchFilterStates.SingleOrDefaultAsync(item => item.Id == RecipeSearchFilterState.SingletonId, ct);
        if (state is null)
        {
            state = new RecipeSearchFilterState();
            db.RecipeSearchFilterStates.Add(state);
        }

        state.GeneratedAt = snapshot.GeneratedAt;
        state.CuisinePayload = JsonSerializer.Serialize(new CuisinePayload(snapshot.PromotedCuisines, snapshot.AllCuisines));
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return snapshot;
    }

    private static RecipeSearchAffinityFact BuildFact(
        EligibleRecipe recipe,
        IReadOnlyCollection<VoteEvidence> votes,
        IReadOnlyCollection<CookEvidence> cookedEvents,
        DateTimeOffset generatedAt)
    {
        var recipeVotes = votes.Where(vote => vote.RecipeId == recipe.Id).ToList();
        var recipeCooks = cookedEvents.Where(@event => @event.RecipeId == recipe.Id).ToList();
        var affinity = recipeVotes.Count(vote => vote.Vote == VoteType.Like)
            - recipeVotes.Count(vote => vote.Vote == VoteType.Dislike)
            + recipeCooks.Count;
        return new RecipeSearchAffinityFact
        {
            RecipeId = recipe.Id,
            Affinity = affinity,
            LastCookedOn = recipeCooks.Select(@event => (DateOnly?)@event.Date).Max(),
            GeneratedAt = generatedAt
        };
    }

    private static RecipeSearchFilterSnapshot BuildSnapshot(
        IReadOnlyCollection<EligibleRecipe> recipes,
        IReadOnlyCollection<RecipeSearchAffinityFact> facts,
        IReadOnlyCollection<CookEvidence> cookedEvents,
        DateTimeOffset generatedAt)
    {
        var today = DateOnly.FromDateTime(generatedAt.UtcDateTime);
        var all = recipes.Select(recipe => recipe.Cuisine).Distinct(StringComparer.Ordinal).OrderBy(cuisine => cuisine, StringComparer.Ordinal).ToList();
        var cuisineScores = recipes
            .GroupBy(recipe => recipe.Cuisine, StringComparer.Ordinal)
            .Select(group => new CuisineScore(
                group.Key,
                group.Sum(recipe => facts.Single(fact => fact.RecipeId == recipe.Id).Affinity),
                group.Sum(recipe => cookedEvents.Count(@event => @event.RecipeId == recipe.Id && @event.Date >= today.AddDays(-RotationWindowDays)))))
            .OrderByDescending(score => score.Affinity - score.RecentCookCount * 2)
            .ThenByDescending(score => score.Affinity)
            .ThenBy(score => score.Cuisine, StringComparer.Ordinal)
            .Take(PromotedCuisineLimit)
            .Select(score => score.Cuisine)
            .ToList();
        return new RecipeSearchFilterSnapshot(generatedAt, cuisineScores, all);
    }

    private sealed record EligibleRecipe(Guid Id, string Cuisine);
    private sealed record VoteEvidence(Guid RecipeId, VoteType Vote);
    private sealed record CookEvidence(Guid RecipeId, DateOnly Date);
    private sealed record CuisineScore(string Cuisine, int Affinity, int RecentCookCount);
    private sealed record CuisinePayload(IReadOnlyList<string> Promoted, IReadOnlyList<string> All);
}

/// <summary>Startup-only retryable initialization; Search never invokes this path.</summary>
public class RecipeSearchFilterBackfillService(ScheduleService scheduleService, RecipeSearchFilterMaterializer materializer)
{
    public async Task InitializeAsync(CancellationToken ct)
    {
        await scheduleService.FinalizeOverdueMealsAsync(ct);
        await materializer.MaterializeAsync(ct);
    }
}

public class RecipeSearchFilterBackfillHostedService(
    IServiceScopeFactory scopeFactory,
    ILogger<RecipeSearchFilterBackfillHostedService> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            await scope.ServiceProvider.GetRequiredService<RecipeSearchFilterBackfillService>().InitializeAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Recipe-search filter backfill failed; the previous materialization remains available and startup will retry.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
