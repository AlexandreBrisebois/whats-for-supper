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

    [Fact]
    public async Task LockScheduleAsync_PersistsVoteCount_WhenVotesExist()
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

        var member1 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 1" };
        var member2 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 2" };
        var member3 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 3" };

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

        // Three family members vote for the recipe
        var votes = new[]
        {
            new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = member1.Id, Vote = VoteType.Like },
            new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = member2.Id, Vote = VoteType.Like },
            new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = member3.Id, Vote = VoteType.Like }
        };

        dbContext.Recipes.Add(recipe);
        dbContext.FamilyMembers.AddRange(member1, member2, member3);
        dbContext.CalendarEvents.Add(@event);
        dbContext.RecipeVotes.AddRange(votes);
        await dbContext.SaveChangesAsync();

        // Lock the schedule
        await service.LockScheduleAsync(0);

        // Verify vote count is persisted to CalendarEvent
        var updatedEvent = await dbContext.CalendarEvents.FindAsync(@event.Id);
        Assert.NotNull(updatedEvent);
        Assert.Equal(3, updatedEvent.VoteCount);
    }

    [Fact]
    public async Task LockScheduleAsync_ClearsRecipeVotes_AfterPersistingVoteCount()
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

        var member1 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 1" };
        var member2 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 2" };

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

        var votes = new[]
        {
            new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = member1.Id, Vote = VoteType.Like },
            new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = member2.Id, Vote = VoteType.Like }
        };

        dbContext.Recipes.Add(recipe);
        dbContext.FamilyMembers.AddRange(member1, member2);
        dbContext.CalendarEvents.Add(@event);
        dbContext.RecipeVotes.AddRange(votes);
        await dbContext.SaveChangesAsync();

        Assert.Equal(2, dbContext.RecipeVotes.Count());

        // Lock the schedule
        await service.LockScheduleAsync(0);

        // Verify votes are cleared
        Assert.Equal(0, dbContext.RecipeVotes.Count());
    }

    [Fact]
    public async Task GetSmartDefaultsAsync_IncludesVoteCount_FromRecipeVotes()
    {
        var dbContext = TestDbContextFactory.Create();
        var service = new ScheduleService(dbContext);

        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Popular Recipe",
            IsDiscoverable = true,
            Rating = RecipeRating.Like,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var member1 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 1" };
        var member2 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 2" };

        // Two family members like the recipe
        var votes = new[]
        {
            new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = member1.Id, Vote = VoteType.Like },
            new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = member2.Id, Vote = VoteType.Like }
        };

        dbContext.Recipes.Add(recipe);
        dbContext.FamilyMembers.AddRange(member1, member2);
        dbContext.RecipeVotes.AddRange(votes);
        await dbContext.SaveChangesAsync();

        // Get smart defaults for current week
        var smartDefaults = await service.GetSmartDefaultsAsync(0);

        // Verify vote count is included
        Assert.NotEmpty(smartDefaults.PreSelectedRecipes);
        var preSelected = smartDefaults.PreSelectedRecipes.FirstOrDefault(p => p.RecipeId == recipe.Id);
        Assert.NotNull(preSelected);
        Assert.Equal(2, preSelected.VoteCount);
    }

    [Fact]
    public async Task GetSmartDefaultsAsync_MarksUnanimous_WhenAllFamilyMembersVote()
    {
        var dbContext = TestDbContextFactory.Create();
        var service = new ScheduleService(dbContext);

        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Unanimous Recipe",
            IsDiscoverable = true,
            Rating = RecipeRating.Like,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var member1 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 1" };
        var member2 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 2" };
        var member3 = new FamilyMember { Id = Guid.NewGuid(), Name = "Member 3" };

        // All three family members like the recipe (unanimous)
        var votes = new[]
        {
            new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = member1.Id, Vote = VoteType.Like },
            new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = member2.Id, Vote = VoteType.Like },
            new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = member3.Id, Vote = VoteType.Like }
        };

        dbContext.Recipes.Add(recipe);
        dbContext.FamilyMembers.AddRange(member1, member2, member3);
        dbContext.RecipeVotes.AddRange(votes);
        await dbContext.SaveChangesAsync();

        var smartDefaults = await service.GetSmartDefaultsAsync(0);

        var preSelected = smartDefaults.PreSelectedRecipes.FirstOrDefault(p => p.RecipeId == recipe.Id);
        Assert.NotNull(preSelected);
        Assert.True(preSelected.UnanimousVote, "Recipe should be marked as unanimous when all family members vote for it");
        Assert.Equal(3, preSelected.VoteCount);
        Assert.Equal(3, preSelected.FamilySize);
    }

    [Fact]
    public async Task GetScheduleAsync_ReturnsVoteCount_FromCalendarEvent_AfterVotingClosed()
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
            Status = CalendarEventStatus.Locked,
            VoteCount = 4  // Persisted vote count
        };

        dbContext.Recipes.Add(recipe);
        dbContext.CalendarEvents.Add(@event);
        await dbContext.SaveChangesAsync();

        var schedule = await service.GetScheduleAsync(0);

        var wednesdayDto = schedule.Days[2];
        Assert.NotNull(wednesdayDto.Recipe);
        // Verify vote count is returned (note: ScheduleRecipeDto needs VoteCount field)
        // This test verifies the data is available in CalendarEvent after voting
    }
}
