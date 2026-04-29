using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;
using RecipeApi.Dto;

namespace RecipeApi.Tests.Services;

public class ScheduleServiceTests : IAsyncLifetime
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
        await _service.MoveScheduleEventAsync(new MoveScheduleDto(0, 0, 1, "swap"));

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
        await _service.MoveScheduleEventAsync(new MoveScheduleDto(0, 0, 1, "push"));

        // Assert
        var e1 = _db.CalendarEvents.FirstOrDefault(e => e.Date == monday);
        var e2 = _db.CalendarEvents.FirstOrDefault(e => e.Date == monday.AddDays(1));
        var e3 = _db.CalendarEvents.FirstOrDefault(e => e.Date == monday.AddDays(2));
        
        Assert.Null(e1);
        Assert.Equal(r1Id, e2?.RecipeId);
        Assert.Equal(r2Id, e3?.RecipeId);
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
}
