using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;
using RecipeApi.Dto;
using Moq;
using RecipeApi.Infrastructure;

namespace RecipeApi.Tests.Services;

public class ScheduleServiceTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private ScheduleService _service = null!;
    private Mock<IScheduleEventPublisher> _publisherMock = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var logger = _scope.ServiceProvider.GetRequiredService<ILogger<ScheduleService>>();
        _publisherMock = new Mock<IScheduleEventPublisher>();
        var groceryRecomputeService = _scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>();
        _service = new ScheduleService(_db, logger, _publisherMock.Object, groceryRecomputeService);
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task Should_Open_Voting_And_Create_WeeklyPlan()
    {
        // Act
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
    public async Task Should_Purge_Votes_On_Lock()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var memberId = _factory.DefaultFamilyMemberId;
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Test" });
        _db.RecipeVotes.Add(new RecipeVote { RecipeId = recipeId, FamilyMemberId = memberId, Vote = VoteType.Like });
        await _db.SaveChangesAsync();

        // Act
        await _service.LockScheduleAsync(0);

        // Assert
        Assert.Empty(_db.RecipeVotes);
        var plan = _db.WeeklyPlans.FirstOrDefault();
        Assert.Equal(WeeklyPlanStatus.Locked, plan?.Status);
    }

    [Fact]
    public async Task Should_Update_LastCookedDate_On_Validation()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var recipe = new Recipe { Id = recipeId, Name = "Test" };
        _db.Recipes.Add(recipe);
        var date = DateOnly.FromDateTime(DateTime.UtcNow);
        _db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), RecipeId = recipeId, Date = date, Status = CalendarEventStatus.Planned });
        await _db.SaveChangesAsync();

        // Act
        await _service.ValidateDayAsync(date.ToString("yyyy-MM-dd"), new ValidationDto(2)); // 2 = Cooked

        // Assert
        var updatedRecipe = _db.Recipes.Find(recipeId);
        Assert.NotNull(updatedRecipe?.LastCookedDate);
        var updatedEvent = _db.CalendarEvents.First();
        Assert.Equal(CalendarEventStatus.Cooked, updatedEvent.Status);
    }

    [Fact]
    public async Task Should_Swap_Recipes_When_Moving_To_Occupied_Slot()
    {
        // Arrange
        var recipe1Id = Guid.NewGuid();
        var recipe2Id = Guid.NewGuid();
        _db.Recipes.AddRange(new Recipe { Id = recipe1Id, Name = "R1" }, new Recipe { Id = recipe2Id, Name = "R2" });
        
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday);
        
        _db.CalendarEvents.AddRange(
            new CalendarEvent { Id = Guid.NewGuid(), RecipeId = recipe1Id, Date = monday, Status = CalendarEventStatus.Planned },
            new CalendarEvent { Id = Guid.NewGuid(), RecipeId = recipe2Id, Date = monday.AddDays(1), Status = CalendarEventStatus.Planned }
        );
        await _db.SaveChangesAsync();

        // Act
        await _service.MoveScheduleEventAsync(new MoveScheduleDto(0, recipe1Id, 1, "swap"));

        // Assert
        var e1 = _db.CalendarEvents.First(e => e.Date == monday);
        var e2 = _db.CalendarEvents.First(e => e.Date == monday.AddDays(1));
        Assert.Equal(recipe2Id, e1.RecipeId);
        Assert.Equal(recipe1Id, e2.RecipeId);
    }

    [Fact]
    public async Task Should_Push_Recipe_To_Next_Available_Slot()
    {
        // Arrange
        var r1Id = Guid.NewGuid();
        var r2Id = Guid.NewGuid();
        _db.Recipes.AddRange(new Recipe { Id = r1Id, Name = "R1" }, new Recipe { Id = r2Id, Name = "R2" });
        
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday);
        
        // Slot 0: R1, Slot 1: R2, Slot 2: Empty
        _db.CalendarEvents.AddRange(
            new CalendarEvent { Id = Guid.NewGuid(), RecipeId = r1Id, Date = monday, Status = CalendarEventStatus.Planned },
            new CalendarEvent { Id = Guid.NewGuid(), RecipeId = r2Id, Date = monday.AddDays(1), Status = CalendarEventStatus.Planned }
        );
        await _db.SaveChangesAsync();

        // Act: Push Slot 0 (R1) to Slot 1. R2 should shift to Slot 2.
        await _service.MoveScheduleEventAsync(new MoveScheduleDto(0, r1Id, 1, "push"));

        // Assert
        var e1 = _db.CalendarEvents.FirstOrDefault(e => e.Date == monday);
        var e2 = _db.CalendarEvents.FirstOrDefault(e => e.Date == monday.AddDays(1));
        var e3 = _db.CalendarEvents.FirstOrDefault(e => e.Date == monday.AddDays(2));
        
        Assert.Null(e1);
        Assert.Equal(r1Id, e2?.RecipeId);
        Assert.Equal(r2Id, e3?.RecipeId);
    }

    [Fact]
    public async Task Should_Preserve_OrderedIn_Source_When_Pushing_Skipped_Recipe_To_Tomorrow()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "R1" });

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday);

        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = monday,
            Status = CalendarEventStatus.Skipped,
        });
        await _db.SaveChangesAsync();

        // Act
        await _service.MoveScheduleEventAsync(new MoveScheduleDto(0, recipeId, 1, "push"));

        // Assert: source day stays ordered-in, tomorrow gets the planned recipe
        var todayEvent = _db.CalendarEvents.FirstOrDefault(e => e.Date == monday);
        var tomorrowEvent = _db.CalendarEvents.FirstOrDefault(e => e.Date == monday.AddDays(1));

        Assert.NotNull(todayEvent);
        Assert.Equal(CalendarEventStatus.Skipped, todayEvent!.Status);
        Assert.Null(todayEvent.RecipeId);

        Assert.NotNull(tomorrowEvent);
        Assert.Equal(recipeId, tomorrowEvent!.RecipeId);
        Assert.Equal(CalendarEventStatus.Planned, tomorrowEvent.Status);
    }

    [Fact]
    public async Task Should_Preserve_OrderedIn_Source_After_Validating_Planned_Event_Then_Pushing_To_Tomorrow()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "R1" });

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday);

        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            Date = monday,
            Status = CalendarEventStatus.Planned,
        });
        await _db.SaveChangesAsync();

        // Act: mirror the live flow used by Home recovery
        await _service.ValidateDayAsync(monday.ToString("yyyy-MM-dd"), new ValidationDto(3));
        await _service.MoveScheduleEventAsync(new MoveScheduleDto(0, recipeId, 1, "push"));

        // Assert: source day stays ordered-in, tomorrow gets the planned recipe
        var todayEvent = _db.CalendarEvents.FirstOrDefault(e => e.Date == monday);
        var tomorrowEvent = _db.CalendarEvents.FirstOrDefault(e => e.Date == monday.AddDays(1));

        Assert.NotNull(todayEvent);
        Assert.Equal(CalendarEventStatus.Skipped, todayEvent!.Status);
        Assert.Null(todayEvent.RecipeId);

        Assert.NotNull(tomorrowEvent);
        Assert.Equal(recipeId, tomorrowEvent!.RecipeId);
        Assert.Equal(CalendarEventStatus.Planned, tomorrowEvent.Status);
    }

    [Fact]
    public async Task Should_Move_The_Explicit_Source_Slot_When_Recipe_Appears_Multiple_Times()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var otherRecipeId = Guid.NewGuid();
        _db.Recipes.AddRange(
            new Recipe { Id = recipeId, Name = "Repeated Recipe" },
            new Recipe { Id = otherRecipeId, Name = "Other Recipe" });

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday);

        _db.CalendarEvents.AddRange(
            new CalendarEvent
            {
                Id = Guid.NewGuid(),
                RecipeId = recipeId,
                Date = monday,
                Status = CalendarEventStatus.Planned,
            },
            new CalendarEvent
            {
                Id = Guid.NewGuid(),
                RecipeId = otherRecipeId,
                Date = monday.AddDays(1),
                Status = CalendarEventStatus.Planned,
            },
            new CalendarEvent
            {
                Id = Guid.NewGuid(),
                RecipeId = recipeId,
                Date = monday.AddDays(3),
                Status = CalendarEventStatus.Planned,
            });
        await _db.SaveChangesAsync();

        // Act: move the recipe from Thursday to Friday, not the matching Monday slot.
        await _service.MoveScheduleEventAsync(new MoveScheduleDto(0, recipeId, 4, "push", null, 3));

        // Assert
        Assert.NotNull(_db.CalendarEvents.FirstOrDefault(e => e.Date == monday && e.RecipeId == recipeId));
        Assert.Null(_db.CalendarEvents.FirstOrDefault(e => e.Date == monday.AddDays(3)));
        Assert.NotNull(_db.CalendarEvents.FirstOrDefault(e => e.Date == monday.AddDays(4) && e.RecipeId == recipeId));
    }

    [Fact]
    public async Task Should_Publish_EchoSeq_When_Move_Is_Confirmed()
    {
        // Arrange
        var recipe1Id = Guid.NewGuid();
        var recipe2Id = Guid.NewGuid();
        _db.Recipes.AddRange(new Recipe { Id = recipe1Id, Name = "R1" }, new Recipe { Id = recipe2Id, Name = "R2" });

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday);

        _db.CalendarEvents.AddRange(
            new CalendarEvent { Id = Guid.NewGuid(), RecipeId = recipe1Id, Date = monday, Status = CalendarEventStatus.Planned },
            new CalendarEvent { Id = Guid.NewGuid(), RecipeId = recipe2Id, Date = monday.AddDays(1), Status = CalendarEventStatus.Planned }
        );
        await _db.SaveChangesAsync();

        // Act
        await _service.MoveScheduleEventAsync(new MoveScheduleDto(0, recipe1Id, 1, "swap"), echoSeq: 9);

        // Assert
        _publisherMock.Verify(
            p => p.PublishWeekUpdatedAsync(It.IsAny<ScheduleDays>(), null, 9),
            Times.Once);
    }

    [Fact]
    public async Task Should_Purge_Recipe_Votes_On_Consensus()
    {
        // Arrange
        var recipeId = Guid.NewGuid();
        var memberId = _factory.DefaultFamilyMemberId;
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Test" });
        _db.RecipeVotes.Add(new RecipeVote { RecipeId = recipeId, FamilyMemberId = memberId, Vote = VoteType.Like });
        
        var date = DateOnly.FromDateTime(DateTime.UtcNow);
        _db.CalendarEvents.Add(new CalendarEvent 
        { 
            Id = Guid.NewGuid(), 
            RecipeId = recipeId, 
            Date = date, 
            Status = CalendarEventStatus.AwaitingConsensus 
        });
        await _db.SaveChangesAsync();

        // Act: Validate as Locked (status 1)
        await _service.ValidateDayAsync(date.ToString("yyyy-MM-dd"), new ValidationDto(1));

        // Assert
        var votes = _db.RecipeVotes.Where(v => v.RecipeId == recipeId).ToList();
        Assert.Empty(votes);
    }

    [Fact]
    public async Task GetScheduleAsync_IncludesGroceryState()
    {
        // Arrange
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday);

        var groceryMap = new Dictionary<string, bool>
        {
            { "Chicken", true },
            { "Broccoli", false }
        };

        _db.WeeklyPlans.Add(new WeeklyPlan
        {
            Id = Guid.NewGuid(),
            WeekStartDate = monday,
            Status = WeeklyPlanStatus.Draft,
            GroceryState = System.Text.Json.JsonSerializer.Serialize(groceryMap)
        });
        await _db.SaveChangesAsync();

        // Act
        var result = await _service.GetScheduleAsync(0);

        // Assert
        Assert.NotNull(result.GroceryState);
        Assert.Equal(2, result.GroceryState.Count);
        Assert.True(result.GroceryState["Chicken"]);
        Assert.False(result.GroceryState["Broccoli"]);
    }

    [Fact]
    public async Task GetScheduleAsync_ReturnsNullGroceryState_WhenNoWeeklyPlan()
    {
        // Arrange — no WeeklyPlan row for this week

        // Act
        var result = await _service.GetScheduleAsync(0);

        // Assert
        Assert.Null(result.GroceryState);
    }
}
