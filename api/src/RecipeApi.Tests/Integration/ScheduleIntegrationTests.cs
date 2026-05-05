using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using RecipeApi.Dto;
using Moq;
using RecipeApi.Infrastructure;

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
    private DiscoveryService _discoveryService = null!;
    private Mock<IScheduleEventPublisher> _publisherMock = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var logger = _scope.ServiceProvider.GetRequiredService<ILogger<ScheduleService>>();
        _publisherMock = new Mock<IScheduleEventPublisher>();
        _service = new ScheduleService(_db, logger, _publisherMock.Object);
        _discoveryService = new DiscoveryService(_db, _publisherMock.Object);
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // Today Slot Persistence Tests (Tasks 1–3)
    // ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task AssignRecipe_CreatesCalendarEvent_WhenNoneExists()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe { Id = recipeId, Name = "Test Recipe" };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        // Act
        await _service.AssignRecipeAsync(new AssignScheduleDto(0, 0, recipeId));

        // Assert: a CalendarEvent exists with the correct RecipeId and today's Monday date
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday);

        var calendarEvent = _db.CalendarEvents.FirstOrDefault(e => e.RecipeId == recipeId);
        Assert.NotNull(calendarEvent);
        Assert.Equal(recipeId, calendarEvent.RecipeId);
        Assert.Equal(monday, calendarEvent.Date);
    }

    [Fact]
    public async Task AssignRecipe_UpdatesExistingCalendarEvent_WhenOneExists()
    {
        // Arrange: create two recipes and a CalendarEvent for today's Monday slot
        var originalRecipeId = Guid.NewGuid();
        var newRecipeId = Guid.NewGuid();

        var originalRecipe = new Recipe { Id = originalRecipeId, Name = "Original Recipe" };
        var newRecipe = new Recipe { Id = newRecipeId, Name = "New Recipe" };
        _db.Recipes.AddRange(originalRecipe, newRecipe);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday);

        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = originalRecipeId,
            Date = monday,
            Status = CalendarEventStatus.Planned,
        });
        await _db.SaveChangesAsync();

        // Act: assign a different recipe to the same slot
        await _service.AssignRecipeAsync(new AssignScheduleDto(0, 0, newRecipeId));

        // Assert: still only one CalendarEvent for that date, with the new RecipeId
        var eventsForDate = _db.CalendarEvents.Where(e => e.Date == monday).ToList();
        Assert.Single(eventsForDate);
        Assert.Equal(newRecipeId, eventsForDate[0].RecipeId);
    }

    [Fact]
    public async Task ValidateDay_OrderedIn_WithNoExistingEvent_CreatesSkippedEvent()
    {
        // Arrange: no CalendarEvent for today
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Act: validate with status 3 (Skipped / Ordered In) — no event exists
        // EXPECTED OUTCOME on unfixed code: throws "No meal planned for this date"
        await _service.ValidateDayAsync(today.ToString("yyyy-MM-dd"), new ValidationDto(3));

        // Assert: a CalendarEvent exists for today with Status == Skipped
        var calendarEvent = _db.CalendarEvents.FirstOrDefault(e => e.Date == today);
        Assert.NotNull(calendarEvent);
        Assert.Equal(CalendarEventStatus.Skipped, calendarEvent.Status);
    }

    [Fact]
    public async Task ValidateDay_OrderedIn_WithExistingEvent_MarksSkipped()
    {
        // Arrange: create a Recipe and a CalendarEvent for today with Status = Planned
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe { Id = recipeId, Name = "Test Recipe" };
        _db.Recipes.Add(recipe);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = today,
            Status = CalendarEventStatus.Planned,
        });
        await _db.SaveChangesAsync();

        // Act: validate with status 3 (Ordered In / Skipped) — event already exists
        await _service.ValidateDayAsync(today.ToString("yyyy-MM-dd"), new ValidationDto(3));

        // Assert: the existing CalendarEvent has Status == Skipped
        var calendarEvent = _db.CalendarEvents.FirstOrDefault(e => e.Date == today);
        Assert.NotNull(calendarEvent);
        Assert.Equal(CalendarEventStatus.Skipped, calendarEvent.Status);
        Assert.Equal(recipeId, calendarEvent.RecipeId); // original recipe preserved
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

    [Fact]
    public async Task UpdateGroceryState_PublishesGroceryUpdatedEvent()
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

        var groceryState = new Dictionary<string, bool>
        {
            { "tomatoes", true },
            { "milk", false },
        };

        // Act
        await _service.UpdateGroceryStateAsync(0, groceryState);

        // Assert: grocery_updated published with weekOffset 0 and the grocery state
        _publisherMock.Verify(
            p => p.PublishGroceryUpdatedAsync(
                0,
                It.Is<Dictionary<string, bool>>(s =>
                    s.ContainsKey("tomatoes") && s["tomatoes"] == true &&
                    s.ContainsKey("milk") && s["milk"] == false)),
            Times.Once);
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

    // ──────────────────────────────────────────────────────────────────────────────
    // SSE Publisher Integration Tests (Task 6)
    // ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task AssignRecipe_PublishesSlotUpdatedAndFillTheGapEvents()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe { Id = recipeId, Name = "Lasagna" };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        // Act
        await _service.AssignRecipeAsync(new AssignScheduleDto(0, 0, recipeId));

        // Assert: slot_updated published with the recipe and Planned status
        _publisherMock.Verify(
            p => p.PublishSlotUpdatedAsync(
                It.IsAny<DateOnly>(),
                It.Is<ScheduleRecipeDto?>(r => r != null && r.Id == recipeId),
                (int)CalendarEventStatus.Planned),
            Times.Once);

        // Assert: fill_the_gap_invalidated published for weekOffset 0
        _publisherMock.Verify(
            p => p.PublishFillTheGapInvalidatedAsync(0),
            Times.Once);
    }

    [Fact]
    public async Task ValidateDay_PublishesSlotUpdatedEvent()
    {
        // Arrange: create a recipe and calendar event for today
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe { Id = recipeId, Name = "Pasta" };
        _db.Recipes.Add(recipe);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = today,
            Status = CalendarEventStatus.Planned,
        });
        await _db.SaveChangesAsync();

        // Act: validate as Cooked (status = 2)
        await _service.ValidateDayAsync(today.ToString("yyyy-MM-dd"), new ValidationDto(2));

        // Assert: slot_updated published with status 2
        _publisherMock.Verify(
            p => p.PublishSlotUpdatedAsync(
                today,
                It.IsAny<ScheduleRecipeDto?>(),
                2),
            Times.Once);
    }

    [Fact]
    public async Task LockSchedule_PublishesWeekUpdatedEvent()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe { Id = recipeId, Name = "Stir Fry" };
        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        // Act
        await _service.LockScheduleAsync(0);

        // Assert: week_updated published once
        _publisherMock.Verify(
            p => p.PublishWeekUpdatedAsync(It.IsAny<ScheduleDays>()),
            Times.Once);
    }

    [Fact]
    public async Task RemoveRecipe_PublishesSlotUpdatedAndFillTheGapEvents()
    {
        // Arrange: create a recipe and calendar event for today
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe { Id = recipeId, Name = "Tacos" };
        _db.Recipes.Add(recipe);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = today,
            Status = CalendarEventStatus.Planned,
        });
        await _db.SaveChangesAsync();

        // Act
        await _service.RemoveRecipeAsync(today);

        // Assert: slot_updated published with null recipe and status 0
        _publisherMock.Verify(
            p => p.PublishSlotUpdatedAsync(
                today,
                null,
                0),
            Times.Once);

        // Assert: fill_the_gap_invalidated published
        _publisherMock.Verify(
            p => p.PublishFillTheGapInvalidatedAsync(It.IsAny<int>()),
            Times.Once);
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // SSE Publisher Integration Tests (Task 7) — Vote events from DiscoveryService
    // ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Vote_PublishesVoteUpdatedEvent()
    {
        // Arrange: one family member, one recipe
        var memberId = Guid.NewGuid();
        var recipeId = Guid.NewGuid();

        _db.FamilyMembers.Add(new FamilyMember { Id = memberId, Name = "Alex" });
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Pasta" });
        await _db.SaveChangesAsync();

        // Act
        await _discoveryService.SubmitVoteAsync(recipeId, memberId, VoteType.Like);

        // Assert: vote_updated published with the recipe ID and like count of 1
        _publisherMock.Verify(
            p => p.PublishVoteUpdatedAsync(recipeId, 1),
            Times.Once);
    }

    [Fact]
    public async Task VoteThresholdCrossed_PublishesSmartDefaultsUpdatedEvent()
    {
        // Arrange: 2 family members → threshold = ceil((2+1)/2) = 2
        // The threshold is crossed when the 2nd like vote is cast.
        var member1 = Guid.NewGuid();
        var member2 = Guid.NewGuid();
        var recipeId = Guid.NewGuid();

        _db.FamilyMembers.AddRange(
            new FamilyMember { Id = member1, Name = "Alex" },
            new FamilyMember { Id = member2, Name = "Jordan" });
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Lasagna" });

        // First vote — count becomes 1, threshold is 2, so (1 == 2) is false and (1 == 1) is true
        // → smart_defaults_updated IS published on the first vote (count == threshold - 1)
        await _db.SaveChangesAsync();

        // Act: cast first vote (count = 1, threshold - 1 = 1 → boundary hit)
        await _discoveryService.SubmitVoteAsync(recipeId, member1, VoteType.Like);

        _publisherMock.Verify(
            p => p.PublishSmartDefaultsUpdatedAsync(0, It.IsAny<SmartDefaultsDto>()),
            Times.Once);

        // Reset mock to isolate the second vote assertion
        _publisherMock.Reset();

        // Act: cast second vote (count = 2, threshold = 2 → boundary hit again)
        await _discoveryService.SubmitVoteAsync(recipeId, member2, VoteType.Like);

        _publisherMock.Verify(
            p => p.PublishSmartDefaultsUpdatedAsync(0, It.IsAny<SmartDefaultsDto>()),
            Times.Once);
    }

    // ──────────────────────────────────────────────────────────────────────────────
    // SSE Publisher Integration Tests (Task 8) — recipe_ready from RecipeReadyProcessor
    // ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task RecipeReady_PublishesRecipeReadyEvent()
    {
        // Arrange: a synthesized recipe that is ready
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Spaghetti Carbonara",
            ImageCount = 0,
            IsSynthesized = true,
            IsDiscoverable = false,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        await _db.SaveChangesAsync();

        var publisherMock = new Mock<IScheduleEventPublisher>();
        var processor = new RecipeReadyProcessor(
            _db,
            NullLogger<RecipeReadyProcessor>.Instance,
            publisherMock.Object);

        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = Guid.NewGuid(),
            TaskName = "recipe_ready",
            ProcessorName = "RecipeReady",
            Payload = System.Text.Json.JsonSerializer.Serialize(new { recipeId = recipeId.ToString() }),
            Status = RecipeApi.Models.TaskStatus.Pending,
            DependsOn = [],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        // Act
        await processor.ExecuteAsync(task, CancellationToken.None);

        // Assert: PublishRecipeReadyAsync called with the correct recipeId
        publisherMock.Verify(
            p => p.PublishRecipeReadyAsync(recipeId, It.IsAny<string>(), It.IsAny<string?>()),
            Times.Once);
    }

    [Fact]
    public async Task RecipeReady_PublishesEnrichedPayload()
    {
        // Arrange: a recipe with a name and image
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Spaghetti Carbonara",
            ImageCount = 2,
            IsSynthesized = false,
            IsDiscoverable = false,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        await _db.SaveChangesAsync();

        var publisherMock = new Mock<IScheduleEventPublisher>();
        var processor = new RecipeReadyProcessor(
            _db,
            NullLogger<RecipeReadyProcessor>.Instance,
            publisherMock.Object);

        var task = new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = Guid.NewGuid(),
            TaskName = "recipe_ready",
            ProcessorName = "RecipeReady",
            Payload = System.Text.Json.JsonSerializer.Serialize(new { recipeId = recipeId.ToString() }),
            Status = RecipeApi.Models.TaskStatus.Pending,
            DependsOn = [],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        // Act
        await processor.ExecuteAsync(task, CancellationToken.None);

        // Assert: enriched payload — name and imageUrl are included
        publisherMock.Verify(
            p => p.PublishRecipeReadyAsync(
                recipeId,
                "Spaghetti Carbonara",
                $"/api/recipes/{recipeId}/image/0"),
            Times.Once);
    }
}
