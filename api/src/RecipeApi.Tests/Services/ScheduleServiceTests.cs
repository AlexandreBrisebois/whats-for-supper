using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public class ScheduleServiceTests
{
    [Fact]
    public async Task GetScheduleAsync_ReturnsEmptyDays_WhenNoEvents()
    {
        var dbContext = TestDbContextFactory.Create();
        var service = new ScheduleService(dbContext);

        var schedule = await service.GetScheduleAsync(0);

        Assert.NotNull(schedule);
        Assert.Equal(0, schedule.WeekOffset);
        Assert.False(schedule.Locked);
        Assert.Equal(7, schedule.Days.Count);
        Assert.All(schedule.Days, day => Assert.Null(day.Recipe));
    }

    [Fact]
    public async Task GetScheduleAsync_PopulatesRecipe_WhenEventExists()
    {
        var dbContext = TestDbContextFactory.Create();
        var service = new ScheduleService(dbContext);

        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Test Recipe",
            IsDiscoverable = true,
            Rating = RecipeRating.Like,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday);
        var wednesdayOfWeek = monday.AddDays(2);

        var @event = new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipe.Id,
            Date = wednesdayOfWeek,
            Status = CalendarEventStatus.Planned,
            Recipe = recipe
        };

        dbContext.Recipes.Add(recipe);
        dbContext.CalendarEvents.Add(@event);
        await dbContext.SaveChangesAsync();

        var schedule = await service.GetScheduleAsync(0);

        Assert.Equal(7, schedule.Days.Count);
        var wednesdayDto = schedule.Days[2];
        Assert.NotNull(wednesdayDto.Recipe);
        Assert.Equal(recipe.Id, wednesdayDto.Recipe.Id);
        Assert.Equal("Test Recipe", wednesdayDto.Recipe.Name);
        Assert.Equal($"/api/recipes/{recipe.Id}/hero", wednesdayDto.Recipe.Image);
    }

    [Fact]
    public async Task LockScheduleAsync_SetsStatusLocked_AndPurgesVotes()
    {
        var dbContext = TestDbContextFactory.Create();
        var service = new ScheduleService(dbContext);

        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Test Recipe",
            IsDiscoverable = true,
            Rating = RecipeRating.Like,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var familyMember = new FamilyMember { Id = Guid.NewGuid(), Name = "Test Member" };

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday);

        var @event = new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipe.Id,
            Date = monday,
            Status = CalendarEventStatus.Planned
        };

        var vote = new RecipeVote
        {
            RecipeId = recipe.Id,
            FamilyMemberId = familyMember.Id,
            Vote = VoteType.Like
        };

        dbContext.Recipes.Add(recipe);
        dbContext.FamilyMembers.Add(familyMember);
        dbContext.CalendarEvents.Add(@event);
        dbContext.RecipeVotes.Add(vote);
        await dbContext.SaveChangesAsync();

        await service.LockScheduleAsync(0);

        var updatedEvent = await dbContext.CalendarEvents.FindAsync(@event.Id);
        Assert.NotNull(updatedEvent);
        Assert.Equal(CalendarEventStatus.Locked, updatedEvent.Status);

        var voteCount = dbContext.RecipeVotes.Count();
        Assert.Equal(0, voteCount);

        var updatedRecipe = await dbContext.Recipes.FindAsync(recipe.Id);
        Assert.NotNull(updatedRecipe);
        Assert.NotNull(updatedRecipe.LastCookedDate);
    }

    [Fact]
    public async Task MoveScheduleEventAsync_SwapsRecipes()
    {
        var dbContext = TestDbContextFactory.Create();
        var service = new ScheduleService(dbContext);

        var recipe1 = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Recipe 1",
            IsDiscoverable = true,
            Rating = RecipeRating.Like,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var recipe2 = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Recipe 2",
            IsDiscoverable = true,
            Rating = RecipeRating.Like,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysToMonday = ((int)today.DayOfWeek - 1 + 7) % 7;
        var monday = today.AddDays(-daysToMonday);

        var event1 = new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipe1.Id,
            Date = monday,
            Status = CalendarEventStatus.Planned
        };

        var event2 = new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipe2.Id,
            Date = monday.AddDays(1),
            Status = CalendarEventStatus.Planned
        };

        dbContext.Recipes.AddRange(recipe1, recipe2);
        dbContext.CalendarEvents.AddRange(event1, event2);
        await dbContext.SaveChangesAsync();

        await service.MoveScheduleEventAsync(new(0, 0, 1));

        var updatedEvent1 = await dbContext.CalendarEvents.FindAsync(event1.Id);
        var updatedEvent2 = await dbContext.CalendarEvents.FindAsync(event2.Id);

        Assert.Equal(recipe2.Id, updatedEvent1!.RecipeId);
        Assert.Equal(recipe1.Id, updatedEvent2!.RecipeId);
    }

    [Fact]
    public async Task AssignRecipeAsync_Upserts()
    {
        var dbContext = TestDbContextFactory.Create();
        var service = new ScheduleService(dbContext);

        var recipe1 = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Recipe 1",
            IsDiscoverable = true,
            Rating = RecipeRating.Like,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var recipe2 = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Recipe 2",
            IsDiscoverable = true,
            Rating = RecipeRating.Like,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Recipes.AddRange(recipe1, recipe2);
        await dbContext.SaveChangesAsync();

        await service.AssignRecipeAsync(new(0, 0, recipe1.Id));

        var events = dbContext.CalendarEvents.ToList();
        Assert.Single(events);
        Assert.Equal(recipe1.Id, events[0].RecipeId);

        await service.AssignRecipeAsync(new(0, 0, recipe2.Id));

        events = dbContext.CalendarEvents.ToList();
        Assert.Single(events);
        Assert.Equal(recipe2.Id, events[0].RecipeId);
    }
}
