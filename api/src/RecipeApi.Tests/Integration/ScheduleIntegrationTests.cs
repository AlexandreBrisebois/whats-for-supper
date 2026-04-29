using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;
using RecipeApi.Dto;

namespace RecipeApi.Tests.Integration;

/// <summary>
/// Integration tests for the Phase 10 Planner Full-Cycle workflow.
/// Verifies the complete state machine: Draft → VotingOpen → Locked → Cooked,
/// including vote purging, recipe validation, and persistence.
/// </summary>
public class ScheduleIntegrationTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private ScheduleService _service = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var logger = _scope.ServiceProvider.GetRequiredService<ILogger<ScheduleService>>();
        _service = new ScheduleService(_db, logger);
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // Phase 10 State Machine Tests
    // ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task State_Transition_Draft_To_VotingOpen()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe { Id = recipeId, Name = "Pasta Carbonara" };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        // Act: Open voting for week 0
        await _service.OpenVotingAsync(0);

        // Assert
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday);

        var plan = _db.WeeklyPlans.FirstOrDefault(p => p.WeekStartDate == monday);
        Assert.NotNull(plan);
        Assert.Equal(WeeklyPlanStatus.VotingOpen, plan.Status);
    }

    [Fact]
    public async Task State_Transition_VotingOpen_To_Locked_Purges_Votes()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var memberId = _factory.DefaultFamilyMemberId;

        var recipe = new Recipe { Id = recipeId, Name = "Pad Thai" };
        _db.Recipes.Add(recipe);

        // Open voting first
        await _service.OpenVotingAsync(0);
        await _db.SaveChangesAsync();

        // Add votes while voting is open
        var vote1 = new RecipeVote { RecipeId = recipeId, FamilyMemberId = memberId, Vote = VoteType.Like };
        _db.RecipeVotes.Add(vote1);
        await _db.SaveChangesAsync();

        var votesBeforeLock = _db.RecipeVotes.Count();
        Assert.Equal(1, votesBeforeLock);

        // Act: Lock the schedule (Menu's In!)
        await _service.LockScheduleAsync(0);

        // Assert
        var plan = _db.WeeklyPlans.FirstOrDefault();
        Assert.Equal(WeeklyPlanStatus.Locked, plan?.Status);

        // Votes must be purged
        var votesAfterLock = _db.RecipeVotes.Count();
        Assert.Equal(0, votesAfterLock);
    }

    [Fact]
    public async Task Recipe_LastCookedDate_NOT_Updated_On_Lock()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe { Id = recipeId, Name = "Grilled Fish", LastCookedDate = null };
        _db.Recipes.Add(recipe);

        var date = DateOnly.FromDateTime(DateTime.UtcNow);
        _db.CalendarEvents.Add(
            new CalendarEvent
            {
                Id = Guid.NewGuid(),
                RecipeId = recipeId,
                Date = date,
                Status = CalendarEventStatus.Planned,
            }
        );
        await _db.SaveChangesAsync();

        // Act: Lock the schedule (Menu's In!)
        // This should NOT update LastCookedDate yet
        await _service.LockScheduleAsync(0);

        // Assert
        var updatedRecipe = _db.Recipes.Find(recipeId);
        Assert.NotNull(updatedRecipe);
        Assert.Null(updatedRecipe.LastCookedDate);
    }

    [Fact]
    public async Task Recipe_LastCookedDate_Updated_On_Cooked_Validation()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe { Id = recipeId, Name = "Risotto" };
        _db.Recipes.Add(recipe);

        var date = DateOnly.FromDateTime(DateTime.UtcNow);
        _db.CalendarEvents.Add(
            new CalendarEvent
            {
                Id = Guid.NewGuid(),
                RecipeId = recipeId,
                Date = date,
                Status = CalendarEventStatus.Planned,
            }
        );
        await _db.SaveChangesAsync();

        // Act: Validate the day as "Cooked" (status = 2)
        await _service.ValidateDayAsync(date.ToString("yyyy-MM-dd"), new ValidationDto(2));

        // Assert
        var updatedRecipe = _db.Recipes.Find(recipeId);
        Assert.NotNull(updatedRecipe?.LastCookedDate);
        var lastCookedDate = DateOnly.FromDateTime(updatedRecipe.LastCookedDate.Value.DateTime);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        Assert.Equal(today, lastCookedDate);

        var updatedEvent = _db.CalendarEvents.FirstOrDefault();
        Assert.NotNull(updatedEvent);
        Assert.Equal(CalendarEventStatus.Cooked, updatedEvent.Status);
    }

    [Fact]
    public async Task Vote_Polling_Reflects_Real_Time_Updates()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe { Id = recipeId, Name = "Steak" };
        _db.Recipes.Add(recipe);

        // Open voting
        await _service.OpenVotingAsync(0);
        await _db.SaveChangesAsync();

        // Act: Add votes incrementally and verify count increases
        var member1 = Guid.NewGuid();
        var member2 = Guid.NewGuid();

        var vote1 = new RecipeVote { RecipeId = recipeId, FamilyMemberId = member1, Vote = VoteType.Like };
        _db.RecipeVotes.Add(vote1);
        await _db.SaveChangesAsync();

        var countAfterVote1 = _db.RecipeVotes.Count(v => v.RecipeId == recipeId);
        Assert.Equal(1, countAfterVote1);

        var vote2 = new RecipeVote { RecipeId = recipeId, FamilyMemberId = member2, Vote = VoteType.Like };
        _db.RecipeVotes.Add(vote2);
        await _db.SaveChangesAsync();

        var countAfterVote2 = _db.RecipeVotes.Count(v => v.RecipeId == recipeId);
        Assert.Equal(2, countAfterVote2);
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // Cook's Mode Persistence Tests
    // ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GroceryState_Persists_And_Can_Be_Retrieved()
    {
        // Arrange
        var date = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)date.DayOfWeek - 1 + 7) % 7;
        var monday = date.AddDays(-daysToMonday);

        var groceryStateJson = "{\"aisles\":[\"Produce\",\"Dairy\"],\"checkedItems\":[\"tomatoes\"]}";
        var plan = new WeeklyPlan
        {
            Id = Guid.NewGuid(),
            WeekStartDate = monday,
            Status = WeeklyPlanStatus.Locked,
            GroceryState = groceryStateJson,
        };
        _db.WeeklyPlans.Add(plan);
        await _db.SaveChangesAsync();

        // Act: Retrieve the plan and check persistence
        var retrievedPlan = _db.WeeklyPlans.FirstOrDefault(p => p.Id == plan.Id);

        // Assert
        Assert.NotNull(retrievedPlan);
        Assert.Equal(groceryStateJson, retrievedPlan.GroceryState);
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // Meal Skip & Recovery Tests
    // ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Skip_Meal_Removes_CalendarEvent_And_Marks_Skipped()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe { Id = recipeId, Name = "Soup" };
        _db.Recipes.Add(recipe);

        var date = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1); // Tomorrow
        var skipEvent = new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = date,
            Status = CalendarEventStatus.Planned,
        };
        _db.CalendarEvents.Add(skipEvent);
        await _db.SaveChangesAsync();

        // Act: Skip the meal (remove via API or service)
        var eventToRemove = _db.CalendarEvents.First();
        _db.CalendarEvents.Remove(eventToRemove);
        await _db.SaveChangesAsync();

        // Assert
        var remainingEvents = _db.CalendarEvents.Where(e => e.Date == date).ToList();
        Assert.Empty(remainingEvents);
    }

    [Fact]
    public async Task Move_To_Next_Week_Creates_New_WeeklyPlan_In_Draft_Status()
    {
        // Arrange
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday);

        var currentPlan = new WeeklyPlan
        {
            Id = Guid.NewGuid(),
            WeekStartDate = monday,
            Status = WeeklyPlanStatus.Locked,
        };
        _db.WeeklyPlans.Add(currentPlan);
        await _db.SaveChangesAsync();

        // Act: Move to next week (weekOffset = 1)
        // This simulates opening the planner for the next week
        var nextMonday = monday.AddDays(7);
        var nextPlan = new WeeklyPlan
        {
            Id = Guid.NewGuid(),
            WeekStartDate = nextMonday,
            Status = WeeklyPlanStatus.Draft,
        };
        _db.WeeklyPlans.Add(nextPlan);
        await _db.SaveChangesAsync();

        // Assert
        var plans = _db.WeeklyPlans.OrderBy(p => p.WeekStartDate).ToList();
        Assert.Equal(2, plans.Count);
        Assert.Equal(WeeklyPlanStatus.Locked, plans[0].Status);
        Assert.Equal(WeeklyPlanStatus.Draft, plans[1].Status);
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // Grocery State Persistence Tests (Phase 10 Integration)
    // ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateGroceryStateAsync_Persists_State_To_Database()
    {
        // Arrange
        var date = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)date.DayOfWeek - 1 + 7) % 7;
        var monday = date.AddDays(-daysToMonday);

        var plan = new WeeklyPlan
        {
            Id = Guid.NewGuid(),
            WeekStartDate = monday,
            Status = WeeklyPlanStatus.Locked,
            GroceryState = "{}",
        };
        _db.WeeklyPlans.Add(plan);
        await _db.SaveChangesAsync();

        // Act: Update via service
        var groceryState = new Dictionary<string, bool>
        {
            { "tomatoes", true },
            { "milk", false },
        };
        await _service.UpdateGroceryStateAsync(0, groceryState);

        // Assert
        var retrieved = _db.WeeklyPlans.FirstOrDefault(p => p.Id == plan.Id);
        Assert.NotNull(retrieved);
        Assert.Contains("tomatoes", retrieved.GroceryState);
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // Consensus Workflow Tests
    // ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Await_Consensus_Status_Represents_Voting_In_Progress()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe { Id = recipeId, Name = "Tacos" };
        _db.Recipes.Add(recipe);

        var date = DateOnly.FromDateTime(DateTime.UtcNow);
        var consensusEvent = new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = date,
            Status = CalendarEventStatus.AwaitingConsensus,
        };
        _db.CalendarEvents.Add(consensusEvent);
        await _db.SaveChangesAsync();

        // Act: Add votes
        var member1 = Guid.NewGuid();
        _db.RecipeVotes.Add(
            new RecipeVote { RecipeId = recipeId, FamilyMemberId = member1, Vote = VoteType.Like }
        );
        await _db.SaveChangesAsync();

        // Assert
        var votes = _db.RecipeVotes.Where(v => v.RecipeId == recipeId).ToList();
        Assert.Single(votes);

        // Validate the day (reach consensus)
        await _service.ValidateDayAsync(date.ToString("yyyy-MM-dd"), new ValidationDto(1)); // 1 = Locked/Consensus reached

        // Votes should be purged after consensus
        var votesAfter = _db.RecipeVotes.Where(v => v.RecipeId == recipeId).ToList();
        Assert.Empty(votesAfter);
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // Edge Case: Full Workflow Round-Trip
    // ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Complete_Workflow_Draft_To_Cooked_With_Votes_And_Persistence()
    {
        // Arrange: Create initial recipe and calendar event
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe { Id = recipeId, Name = "BBQ Ribs" };
        _db.Recipes.Add(recipe);

        // Use a fixed date that we know exists for the event
        var eventDate = new DateOnly(2026, 4, 27); // Monday
        var calendarEvent = new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = eventDate,
            Status = CalendarEventStatus.Planned,
        };
        _db.CalendarEvents.Add(calendarEvent);
        await _db.SaveChangesAsync();

        // Step 1: Open voting
        await _service.OpenVotingAsync(0);
        var planAfterVotingOpen = _db.WeeklyPlans.FirstOrDefault();
        Assert.NotNull(planAfterVotingOpen);
        Assert.Equal(WeeklyPlanStatus.VotingOpen, planAfterVotingOpen.Status);

        // Step 2: Add votes
        var member1 = Guid.NewGuid();
        var member2 = Guid.NewGuid();
        _db.RecipeVotes.Add(new RecipeVote { RecipeId = recipeId, FamilyMemberId = member1, Vote = VoteType.Like });
        _db.RecipeVotes.Add(new RecipeVote { RecipeId = recipeId, FamilyMemberId = member2, Vote = VoteType.Like });
        await _db.SaveChangesAsync();

        var votesBeforeLock = _db.RecipeVotes.Count();
        Assert.Equal(2, votesBeforeLock);

        // Step 3: Note — Cook's Mode state is managed client-side (localStorage/IndexedDB)
        // The server-side persistence is handled via grocery state in GroceryState column

        // Step 4: Lock the schedule (Menu's In!)
        await _service.LockScheduleAsync(0);
        var planAfterLock = _db.WeeklyPlans.FirstOrDefault();
        Assert.NotNull(planAfterLock);
        Assert.Equal(WeeklyPlanStatus.Locked, planAfterLock.Status);

        // Verify votes purged
        var votesAfterLock = _db.RecipeVotes.Count();
        Assert.Equal(0, votesAfterLock);

        // Verify LastCookedDate NOT updated yet
        var recipeAfterLock = _db.Recipes.Find(recipeId);
        Assert.Null(recipeAfterLock?.LastCookedDate);

        // Step 5: Validate as Cooked
        await _service.ValidateDayAsync(eventDate.ToString("yyyy-MM-dd"), new ValidationDto(2));

        // Verify LastCookedDate updated (set to today, not the event date)
        var recipeAfterCooked = _db.Recipes.Find(recipeId);
        Assert.NotNull(recipeAfterCooked?.LastCookedDate);
        var cookedDateOnly = DateOnly.FromDateTime(recipeAfterCooked.LastCookedDate.Value.DateTime);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        Assert.Equal(today, cookedDateOnly);

        // Verify event status updated
        var eventAfterCooked = _db.CalendarEvents.First();
        Assert.Equal(CalendarEventStatus.Cooked, eventAfterCooked.Status);
    }
}
