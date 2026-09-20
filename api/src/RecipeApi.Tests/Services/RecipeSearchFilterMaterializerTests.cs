using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class RecipeSearchFilterMaterializerTests : IDisposable
{
    private readonly RecipeDbContext _db = TestDbContextFactory.Create();
    private readonly FixedClock _clock = new(new DateTimeOffset(2026, 9, 19, 12, 0, 0, TimeSpan.Zero));

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task MaterializeAsync_UsesOnlyEligibleStoredCuisines_AndSeparatesRecipeFacts()
    {
        var italian = await AddRecipeAsync("Italian");
        var japanese = await AddRecipeAsync("Japanese");
        await AddRecipeAsync("Hidden", ready: false);
        await AddRecipeAsync("Deleted", deleted: true);
        await AddRecipeAsync(null);
        _db.RecipeVotes.AddRange(
            new RecipeVote { RecipeId = italian.Id, FamilyMemberId = Guid.NewGuid(), Vote = VoteType.Like },
            new RecipeVote { RecipeId = italian.Id, FamilyMemberId = Guid.NewGuid(), Vote = VoteType.Like },
            new RecipeVote { RecipeId = japanese.Id, FamilyMemberId = Guid.NewGuid(), Vote = VoteType.Dislike });
        _db.CalendarEvents.AddRange(
            Cooked(italian.Id, DateOnly.FromDateTime(_clock.UtcNow.Date).AddDays(-90)),
            Cooked(italian.Id, DateOnly.FromDateTime(_clock.UtcNow.Date).AddDays(-2)),
            Cooked(japanese.Id, DateOnly.FromDateTime(_clock.UtcNow.Date).AddDays(-70)));
        await _db.SaveChangesAsync();

        var snapshot = await new RecipeSearchFilterMaterializer(_db, _clock).MaterializeAsync(CancellationToken.None);

        Assert.Equal(["Italian", "Japanese"], snapshot.AllCuisines);
        Assert.Contains("Japanese", snapshot.PromotedCuisines);
        Assert.DoesNotContain("Hidden", snapshot.AllCuisines);
        Assert.Equal(2, await _db.RecipeSearchAffinityFacts.CountAsync());
        Assert.Empty(await _db.RecipeSearchAffinityFacts.Where(f => f.RecipeId != italian.Id && f.RecipeId != japanese.Id).ToListAsync());
        var italianFact = await _db.RecipeSearchAffinityFacts.SingleAsync(f => f.RecipeId == italian.Id);
        var japaneseFact = await _db.RecipeSearchAffinityFacts.SingleAsync(f => f.RecipeId == japanese.Id);
        Assert.True(italianFact.Affinity > japaneseFact.Affinity);
        Assert.Equal(new DateOnly(2026, 9, 17), italianFact.LastCookedOn);
        Assert.Equal(snapshot.GeneratedAt, (await _db.RecipeSearchFilterStates.SingleAsync()).GeneratedAt);
    }

    [Fact]
    public async Task MaterializeAsync_RecentCookingLowersPromotionWithoutErasingAffinity_AndIsClockDeterministic()
    {
        var recent = await AddRecipeAsync("Recent");
        var old = await AddRecipeAsync("Old");
        _db.RecipeVotes.AddRange(
            new RecipeVote { RecipeId = recent.Id, FamilyMemberId = Guid.NewGuid(), Vote = VoteType.Like },
            new RecipeVote { RecipeId = old.Id, FamilyMemberId = Guid.NewGuid(), Vote = VoteType.Like });
        _db.CalendarEvents.AddRange(
            Cooked(recent.Id, DateOnly.FromDateTime(_clock.UtcNow.Date).AddDays(-1)),
            Cooked(old.Id, DateOnly.FromDateTime(_clock.UtcNow.Date).AddDays(-60)));
        await _db.SaveChangesAsync();

        var materializer = new RecipeSearchFilterMaterializer(_db, _clock);
        var first = await materializer.MaterializeAsync(CancellationToken.None);
        var firstFacts = await _db.RecipeSearchAffinityFacts.AsNoTracking().OrderBy(f => f.RecipeId).ToListAsync();
        var second = await materializer.MaterializeAsync(CancellationToken.None);
        var secondFacts = await _db.RecipeSearchAffinityFacts.AsNoTracking().OrderBy(f => f.RecipeId).ToListAsync();

        Assert.Equal(first.AllCuisines, second.AllCuisines);
        Assert.Equal(first.PromotedCuisines, second.PromotedCuisines);
        Assert.Equal(firstFacts.Select(f => f.Affinity), secondFacts.Select(f => f.Affinity));
        Assert.True(first.PromotedCuisines.ToList().IndexOf("Old") < first.PromotedCuisines.ToList().IndexOf("Recent"));
        Assert.Equal(firstFacts.Single(f => f.RecipeId == recent.Id).Affinity, firstFacts.Single(f => f.RecipeId == old.Id).Affinity);
    }

    [Fact]
    public async Task MaterializeAsync_FailureLeavesThePreviousGoodSnapshotUntouched()
    {
        await AddRecipeAsync("Italian");
        await _db.SaveChangesAsync();
        var materializer = new RecipeSearchFilterMaterializer(_db, _clock);
        var previous = await materializer.MaterializeAsync(CancellationToken.None);
        using var cancelled = new CancellationTokenSource();
        cancelled.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => materializer.MaterializeAsync(cancelled.Token));

        var retained = await _db.RecipeSearchFilterStates.SingleAsync();
        Assert.Equal(previous.GeneratedAt, retained.GeneratedAt);
        Assert.Single(await _db.RecipeSearchFilterStates.ToListAsync());
    }

    [Fact]
    public async Task InitialBackfill_FinalizesOverdueMealsThenReusesAtomicMaterializationOnRetry()
    {
        var recipe = await AddRecipeAsync("Italian");
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(), RecipeId = recipe.Id, Date = DateOnly.FromDateTime(_clock.UtcNow.Date).AddDays(-1), Status = CalendarEventStatus.Planned
        });
        await _db.SaveChangesAsync();
        var grocery = new GroceryRecomputeService(_db, new AisleMapper(), NullLogger<GroceryRecomputeService>.Instance);
        var schedule = new ScheduleService(_db, NullLogger<ScheduleService>.Instance, new Mock<IScheduleEventPublisher>().Object, grocery, _clock);
        var backfill = new RecipeSearchFilterBackfillService(schedule, new RecipeSearchFilterMaterializer(_db, _clock));

        await backfill.InitializeAsync(CancellationToken.None);
        await backfill.InitializeAsync(CancellationToken.None);

        Assert.Equal(CalendarEventStatus.Cooked, (await _db.CalendarEvents.SingleAsync()).Status);
        Assert.Single(await _db.RecipeSearchFilterStates.ToListAsync());
        Assert.Equal(new DateOnly(2026, 9, 18), (await _db.RecipeSearchAffinityFacts.SingleAsync()).LastCookedOn);
    }

    private async Task<Recipe> AddRecipeAsync(string? cuisine, bool ready = true, bool deleted = false)
    {
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(), Name = cuisine ?? "No cuisine", CuisineType = cuisine, IsReady = ready,
            DeletedAt = deleted ? _clock.UtcNow : null, CreatedAt = _clock.UtcNow, UpdatedAt = _clock.UtcNow
        };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();
        return recipe;
    }

    private static CalendarEvent Cooked(Guid recipeId, DateOnly date) => new()
    {
        Id = Guid.NewGuid(), RecipeId = recipeId, Date = date, Status = CalendarEventStatus.Cooked
    };

    private sealed class FixedClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow => now;
    }
}
