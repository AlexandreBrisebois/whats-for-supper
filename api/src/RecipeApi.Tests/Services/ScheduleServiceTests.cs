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
        _factory = await TestWebApplicationFactory.CreateAsync(new RecipeApi.Tests.Integration.DeploymentCalendarIntegrationTests.CalendarClock());
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var logger = _scope.ServiceProvider.GetRequiredService<ILogger<ScheduleService>>();
        _publisherMock = new Mock<IScheduleEventPublisher>();
        var groceryRecomputeService = _scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>();
        _service = new ScheduleService(_db, logger, _publisherMock.Object, groceryRecomputeService, _scope.ServiceProvider.GetRequiredService<IClock>(), new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager()), RecipeApi.Tests.Infrastructure.TestHistoricalInterest.Create(_db, _scope.ServiceProvider.GetRequiredService<IClock>(), new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager())));
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    public static IEnumerable<object[]> CoverageCases() =>
        from required in Enumerable.Range(0, 8)
        from candidates in Enumerable.Range(0, 10)
        select new object[] { required, candidates };

    [Theory]
    [MemberData(nameof(CoverageCases))]
    public async Task SmartDefaults_BoundedDistinctCoverage(int required, int candidates)
    {
        var monday = new DateOnly(2026, 10, 19);
        var selected = new Recipe { Id = Guid.NewGuid(), Name = "Selected consensus" };
        var recipes = Enumerable.Range(0, candidates).Select(i => new Recipe
            { Id = Guid.NewGuid(), Name = $"Candidate {i}" }).ToArray();
        _db.Recipes.AddRange(recipes.Append(selected));
        foreach (var recipe in recipes.Append(selected))
            _db.RecipeVotes.Add(new RecipeVote { RecipeId = recipe.Id,
                FamilyMemberId = _factory.DefaultFamilyMemberId, Vote = VoteType.Like });
        var occupied = Enumerable.Range(0, 7 - required).ToHashSet();
        foreach (var day in occupied)
            _db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), Date = monday.AddDays(day),
                RecipeId = day == 0 ? selected.Id : null,
                Status = day == 0 ? CalendarEventStatus.Planned : CalendarEventStatus.Skipped,
                NonCookingKind = day == 0 ? null : "eating_out" });
        // In the fully empty case there is no selected recipe identity to exclude.
        if (required == 7) _db.RecipeVotes.Remove(_db.RecipeVotes.Local.Single(v => v.RecipeId == selected.Id));
        await _db.SaveChangesAsync();

        var defaults = await _service.GetSmartDefaultsAsync(1);

        Assert.Equal(candidates, defaults.ConsensusRecipesCount);
        Assert.Equal(Math.Min(required, candidates), defaults.PreSelectedRecipes.Count);
        Assert.Equal(required - Math.Min(required, candidates), defaults.OpenSlots.Count);
        Assert.Equal(defaults.PreSelectedRecipes.Count,
            defaults.PreSelectedRecipes.Select(x => x.RecipeId).Distinct().Count());
        Assert.All(defaults.PreSelectedRecipes, x =>
        {
            Assert.InRange(x.DayIndex, 0, 6);
            Assert.DoesNotContain(x.DayIndex, occupied);
            Assert.NotEqual(selected.Id, x.RecipeId);
        });
        Assert.Equal(required, defaults.PreSelectedRecipes.Select(x => x.DayIndex)
            .Concat(defaults.OpenSlots.Select(x => x.DayIndex)).Distinct().Count());
        Assert.Equal(occupied.Count, _db.CalendarEvents.Count());
    }

    [Fact]
    public async Task SmartDefaults_ExcludesSelectedIdentityFromPlacementAndCandidateCount()
    {
        var monday = new DateOnly(2026, 10, 19);
        var selected = new Recipe { Id = Guid.NewGuid(), Name = "Already saved" };
        var candidate = new Recipe { Id = Guid.NewGuid(), Name = "New candidate" };
        _db.Recipes.AddRange(selected, candidate);
        foreach (var recipe in new[] { selected, candidate })
            _db.RecipeVotes.Add(new RecipeVote { RecipeId = recipe.Id,
                FamilyMemberId = _factory.DefaultFamilyMemberId, Vote = VoteType.Like });
        _db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), Date = monday,
            RecipeId = selected.Id, Status = CalendarEventStatus.Planned });
        await _db.SaveChangesAsync();

        var defaults = await _service.GetSmartDefaultsAsync(1);

        Assert.Equal(monday, defaults.WeekStartDate);
        Assert.Equal(1, defaults.ConsensusRecipesCount);
        var placement = Assert.Single(defaults.PreSelectedRecipes);
        Assert.Equal(candidate.Id, placement.RecipeId);
        Assert.Equal(1, placement.DayIndex);
        Assert.Equal(5, defaults.OpenSlots.Count);
    }

    [Fact]
    public async Task SmartDefaults_FourOtherPlansLeaveExactlyThreePlacementsInRequestedWeek()
    {
        var monday = new DateOnly(2026, 10, 19);
        for (var i = 0; i < 4; i++)
            _db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), Date = monday.AddDays(i),
                Status = CalendarEventStatus.Skipped, NonCookingKind = "eating_out" });
        for (var i = 0; i < 3; i++)
        {
            var recipe = new Recipe { Id = Guid.NewGuid(), Name = $"Candidate {i}" };
            _db.Recipes.Add(recipe);
            _db.RecipeVotes.Add(new RecipeVote { RecipeId = recipe.Id,
                FamilyMemberId = _factory.DefaultFamilyMemberId, Vote = VoteType.Like });
        }
        await _db.SaveChangesAsync();

        var defaults = await _service.GetSmartDefaultsAsync(1);

        Assert.Equal(monday, defaults.WeekStartDate);
        Assert.Equal(3, defaults.ConsensusRecipesCount);
        Assert.Equal(new[] { 4, 5, 6 }, defaults.PreSelectedRecipes.Select(x => x.DayIndex));
        Assert.Empty(defaults.OpenSlots);
        Assert.Equal(4, _db.CalendarEvents.Count());
    }

    [Fact]
    public async Task SmartDefaults_FourMembersStillRequireThreeLikes()
    {
        var others = Enumerable.Range(0, 3).Select(i => new FamilyMember
            { Id = Guid.NewGuid(), Name = $"Member {i}" }).ToArray();
        _db.FamilyMembers.AddRange(others);
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Not yet consensus" };
        _db.Recipes.Add(recipe);
        _db.RecipeVotes.AddRange(
            new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = _factory.DefaultFamilyMemberId, Vote = VoteType.Like },
            new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = others[0].Id, Vote = VoteType.Like });
        await _db.SaveChangesAsync();

        var defaults = await _service.GetSmartDefaultsAsync(1);

        Assert.Equal(4, defaults.FamilySize);
        Assert.Equal(3, defaults.ConsensusThreshold);
        Assert.Equal(0, defaults.ConsensusRecipesCount);
        Assert.Empty(defaults.PreSelectedRecipes);
    }

    [Fact]
    public async Task WeeklyInterest_RevoteReplacesTouchedRowsRemovesZeroAndPreservesUntouched()
    {
        var a = new Recipe { Id = Guid.NewGuid(), Name = "Touched" };
        var b = new Recipe { Id = Guid.NewGuid(), Name = "Untouched" };
        var c = new Recipe { Id = Guid.NewGuid(), Name = "Zero" };
        _db.Recipes.AddRange(a, b, c);
        foreach (var recipe in new[] { a, b, c })
            _db.RecipeVotes.Add(new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = _factory.DefaultFamilyMemberId, Vote = VoteType.Like });
        await _db.SaveChangesAsync();
        await _service.OpenVotingAsync(0);
        var first = (await _service.GetScheduleAsync(0)).VotingRoundId;
        await _service.LockScheduleAsync(0, votingRoundId: first);
        var original = _db.WeeklyHouseholdInterests.Single(x => x.RecipeId == b.Id);
        var originalClose = original.CloseId;
        await _service.OpenVotingAsync(0);
        var second = (await _service.GetScheduleAsync(0)).VotingRoundId;
        Assert.NotEqual(first, second);
        _db.RecipeVotes.AddRange(
            new RecipeVote { RecipeId = a.Id, FamilyMemberId = _factory.DefaultFamilyMemberId, Vote = VoteType.Like },
            new RecipeVote { RecipeId = c.Id, FamilyMemberId = _factory.DefaultFamilyMemberId, Vote = VoteType.Dislike });
        await _db.SaveChangesAsync();
        await _service.LockScheduleAsync(0, votingRoundId: first);
        Assert.Equal(2, _db.RecipeVotes.Count());
        await Assert.ThrowsAsync<VotingConflictException>(() => _service.LockScheduleAsync(0));
        await _service.LockScheduleAsync(0, votingRoundId: second);
        Assert.Equal(2, _db.WeeklyHouseholdInterests.Count());
        Assert.Equal(1, _db.WeeklyHouseholdInterests.Single(x => x.RecipeId == a.Id).PositiveCount);
        Assert.Equal(originalClose, original.CloseId);
        Assert.DoesNotContain(_db.WeeklyHouseholdInterests, x => x.RecipeId == c.Id);
        await _service.OpenVotingAsync(0);
        await _service.LockScheduleAsync(0, votingRoundId: (await _service.GetScheduleAsync(0)).VotingRoundId);
        Assert.Equal(2, _db.WeeklyHouseholdInterests.Count());
    }

    [Fact]
    public async Task WeeklyInterest_ConflictingOpenPreservesTheActiveWeekAndVotes()
    {
        await _service.OpenVotingAsync(0);
        var first = (await _service.GetScheduleAsync(0)).VotingRoundId;
        await _service.OpenVotingAsync(0);
        Assert.Equal(first, (await _service.GetScheduleAsync(0)).VotingRoundId);
        await Assert.ThrowsAsync<VotingConflictException>(() => _service.OpenVotingAsync(1));
        Assert.Single(_db.WeeklyPlans);
    }

    [Fact]
    public async Task WeeklyInterest_CloseCapturesSelectedAndUnselectedPositiveTotals()
    {
        var selected = new Recipe { Id = Guid.NewGuid(), Name = "Selected" };
        var overlooked = new Recipe { Id = Guid.NewGuid(), Name = "Overlooked" };
        var passed = new Recipe { Id = Guid.NewGuid(), Name = "Passed" };
        _db.Recipes.AddRange(selected, overlooked, passed);
        foreach (var recipe in new[] { selected, overlooked, passed })
            _db.RecipeVotes.Add(new RecipeVote { RecipeId = recipe.Id, FamilyMemberId = _factory.DefaultFamilyMemberId,
                Vote = recipe == passed ? VoteType.Dislike : VoteType.Like });
        _db.CalendarEvents.Add(new CalendarEvent { RecipeId = selected.Id, Date = new(2026, 10, 12) });
        await _db.SaveChangesAsync();
        await _service.OpenVotingAsync(0);
        Assert.Equal(3, _db.RecipeVotes.Count());

        await _service.LockScheduleAsync(0);

        var history = _db.WeeklyHouseholdInterests.ToList();
        Assert.Equal(2, history.Count);
        Assert.True(history.Single(x => x.RecipeId == selected.Id).Selected);
        Assert.False(history.Single(x => x.RecipeId == overlooked.Id).Selected);
        Assert.All(history, row => { Assert.Equal(1, row.PositiveCount); Assert.Equal(new DateOnly(2026, 10, 12), row.WeekStartDate); });
        Assert.Empty(_db.RecipeVotes);
        Assert.Null(selected.LastCookedDate);
    }

    [Fact]
    public async Task WeeklyInterest_CompletedCloseRetryPreservesSubsequentEarlyVotes()
    {
        await _service.OpenVotingAsync(0);
        await _service.LockScheduleAsync(0);
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Next round" };
        _db.Recipes.Add(recipe);
        _db.RecipeVotes.Add(new RecipeVote
        {
            RecipeId = recipe.Id, FamilyMemberId = _factory.DefaultFamilyMemberId, Vote = VoteType.Like
        });
        await _db.SaveChangesAsync();

        await _service.LockScheduleAsync(0);

        Assert.Single(_db.RecipeVotes);
    }

    [Fact]
    public async Task TonightReplacement_GuardConflictHasNoPlanOrPublicationSideEffects()
    {
        var recipe = Guid.NewGuid();
        _db.Recipes.Add(new Recipe { Id = recipe, Name = "Retained supper", Ingredients = "[]" });
        _db.CalendarEvents.Add(new CalendarEvent { Date = new(2026, 10, 11), RecipeId = recipe });
        await _db.SaveChangesAsync();
        var plansBefore = _db.WeeklyPlans.Count();
        await Assert.ThrowsAsync<AssignmentConflictException>(() => _service.AssignRecipeAsync(
            new AssignScheduleDto(0, 6, recipe, RequireEmpty: true), referenceWeekStartDate: new(2026, 10, 5)));
        Assert.Equal(plansBefore, _db.WeeklyPlans.Count());
        _publisherMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task TomorrowPush_FirstGapStopsMovementAndPublicationFailureNeverMeansRollback()
    {
        var sunday = new DateOnly(2026,10,11);var recipe=Guid.NewGuid();
        _db.Recipes.Add(new Recipe {Id=recipe,Name="First gap",Ingredients="[]"});
        var source=new CalendarEvent {Id=Guid.NewGuid(),Date=sunday,RecipeId=recipe};
        var monday=new CalendarEvent {Id=Guid.NewGuid(),Date=sunday.AddDays(1),RecipeId=recipe,Status=CalendarEventStatus.Locked,VoteCount=7};
        var sentinel=new CalendarEvent {Id=Guid.NewGuid(),Date=sunday.AddDays(3),RecipeId=recipe};
        _db.CalendarEvents.AddRange(source,monday,sentinel);await _db.SaveChangesAsync();
        using var cancellation=new CancellationTokenSource();
        _publisherMock.Setup(p=>p.PublishWeekUpdatedAsync(It.IsAny<ScheduleDays>(),It.IsAny<string?>(),It.IsAny<int?>()))
            .Callback(()=>cancellation.Cancel()).ThrowsAsync(new IOException("injected publication failure"));
        var result=await _service.MoveScheduleEventAsync(new MoveScheduleDto(0,recipe,0,"tomorrow",1,6),referenceWeekStartDate:new DateOnly(2026,10,5),ct:cancellation.Token);
        Assert.True(cancellation.IsCancellationRequested);
        Assert.NotNull(result);Assert.True(result.Moved);Assert.False(result.RefreshComplete);
        Assert.Equal(sunday.AddDays(1),source.Date);Assert.Equal(sunday.AddDays(2),monday.Date);Assert.Equal(7,monday.VoteCount);Assert.Equal(CalendarEventStatus.Locked,monday.Status);
        Assert.Equal(sunday.AddDays(3),sentinel.Date);
        _publisherMock.Verify(p=>p.PublishFillTheGapInvalidatedAsync(It.IsAny<int>(),It.IsAny<DateOnly>(),It.IsAny<string?>()),Times.Exactly(2));
    }

    [Fact]
    public async Task TomorrowPush_CancellationBeforeCommitLeavesSourceUntouched()
    {
        var recipe=Guid.NewGuid();var source=new CalendarEvent {Date=new(2026,10,11),RecipeId=recipe};
        _db.Recipes.Add(new Recipe {Id=recipe,Name="Cancelled",Ingredients="[]"});_db.CalendarEvents.Add(source);await _db.SaveChangesAsync();
        using var cancellation=new CancellationTokenSource();cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(()=>_service.MoveScheduleEventAsync(new MoveScheduleDto(0,recipe,0,"tomorrow",1,6),referenceWeekStartDate:new DateOnly(2026,10,5),ct:cancellation.Token));
        Assert.Equal(new DateOnly(2026,10,11),source.Date);
        _publisherMock.Verify(p=>p.PublishWeekUpdatedAsync(It.IsAny<ScheduleDays>(),It.IsAny<string?>(),It.IsAny<int?>()),Times.Never);
    }

    [Fact]
    public async Task Should_Open_Voting_And_Create_WeeklyPlan()
    {
        // Act
        await _service.OpenVotingAsync(0);

        // Assert
        var today = DateOnly.FromDateTime(new DateTime(2026, 10, 12, 1, 30, 0, DateTimeKind.Utc));
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
        var date = DateOnly.FromDateTime(new DateTime(2026, 10, 12, 1, 30, 0, DateTimeKind.Utc));
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

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Cooking_UnscheduledRecipe_UpdatesItsHistoryWithoutCookingSupper(bool hasSupper)
    {
        var lunchId = Guid.NewGuid();
        var supperId = Guid.NewGuid();
        var date = new DateOnly(2026, 10, 11);
        var clock = new FixedClock(new DateTimeOffset(2026, 10, 11, 12, 0, 0, TimeSpan.Zero));
        _db.Recipes.AddRange(new Recipe { Id = lunchId, Name = "Lunch" }, new Recipe { Id = supperId, Name = "Supper" });
        if (hasSupper)
            _db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), RecipeId = supperId, Date = date, Status = CalendarEventStatus.Planned });
        await _db.SaveChangesAsync();

        await CreateService(clock).ValidateDayAsync(date.ToString("yyyy-MM-dd"), new ValidationDto(2, lunchId));

        Assert.Equal(clock.UtcNow, _db.Recipes.Single(r => r.Id == lunchId).LastCookedDate);
        Assert.Null(_db.Recipes.Single(r => r.Id == supperId).LastCookedDate);
        if (hasSupper)
            Assert.Equal(CalendarEventStatus.Planned, _db.CalendarEvents.Single(e => e.Date == date).Status);
        else
            Assert.Empty(_db.CalendarEvents.Where(e => e.Date == date));
        _publisherMock.Verify(p => p.PublishSlotUpdatedAsync(It.IsAny<DateOnly>(), It.IsAny<ScheduleRecipeDto>(), It.IsAny<int>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Cooking_MatchingRecipe_StillCompletesPlannedSupper()
    {
        var recipeId = Guid.NewGuid();
        var date = new DateOnly(2026, 10, 11);
        var clock = new FixedClock(new DateTimeOffset(2026, 10, 11, 18, 0, 0, TimeSpan.Zero));
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Supper" });
        _db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), RecipeId = recipeId, Date = date, Status = CalendarEventStatus.Planned });
        await _db.SaveChangesAsync();

        await CreateService(clock).ValidateDayAsync(date.ToString("yyyy-MM-dd"), new ValidationDto(2, recipeId));

        Assert.Equal(CalendarEventStatus.Cooked, _db.CalendarEvents.Single(e => e.Date == date).Status);
        Assert.Equal(clock.UtcNow, _db.Recipes.Single(r => r.Id == recipeId).LastCookedDate);
        _publisherMock.Verify(p => p.PublishSlotUpdatedAsync(date, It.Is<ScheduleRecipeDto>(r => r.Id == recipeId), 2, null), Times.Once);
    }

    [Fact]
    public async Task DeferRecipe_MovesLockedSourceToFirstFreeDateAndPublishesBothWeeks()
    {
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Soup" });
        var today = DateOnly.FromDateTime(new DateTime(2026, 10, 12, 1, 30, 0, DateTimeKind.Utc));
        var nextMonday = today.AddDays(7 - ((int)today.DayOfWeek + 6) % 7);
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(), RecipeId = recipeId, Date = today,
            Status = CalendarEventStatus.Locked, VoteCount = 4
        });
        await _db.SaveChangesAsync();

        var result = await _service.DeferRecipeAsync(new DeferScheduleDto(today, recipeId), "connection", 12);

        Assert.Equal(nextMonday, result.ScheduledDate);
        var moved = Assert.Single(_db.CalendarEvents);
        Assert.Equal(CalendarEventStatus.Planned, moved.Status);
        Assert.Equal(4, moved.VoteCount);
        _publisherMock.Verify(p => p.PublishWeekUpdatedAsync(It.IsAny<ScheduleDays>(), "connection", 12), Times.Exactly(2));
    }

    [Fact]
    public async Task DeferRecipe_PreservesSkippedSourceVoteCountAndCreatesPlannedDestination()
    {
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Soup" });
        var sourceDate = DateOnly.FromDateTime(new DateTime(2026, 10, 12, 1, 30, 0, DateTimeKind.Utc));
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(), RecipeId = recipeId, Date = sourceDate,
            Status = CalendarEventStatus.Skipped, VoteCount = 3
        });
        await _db.SaveChangesAsync();

        await _service.DeferRecipeAsync(new DeferScheduleDto(sourceDate, recipeId));

        var source = Assert.Single(_db.CalendarEvents.Where(e => e.Date == sourceDate));
        Assert.Null(source.RecipeId);
        Assert.Equal(CalendarEventStatus.Skipped, source.Status);
        Assert.Equal(3, source.VoteCount);
        var destination = Assert.Single(_db.CalendarEvents.Where(e => e.Date != sourceDate));
        Assert.Equal(recipeId, destination.RecipeId);
        Assert.Equal(CalendarEventStatus.Planned, destination.Status);
        Assert.Equal(3, destination.VoteCount);
    }

    [Fact]
    public async Task DeferRecipe_RecalculatesLastCookedDateAfterMovingTheOnlyCookedEvent()
    {
        var recipeId = Guid.NewGuid();
        var cookedDate = new DateOnly(2026, 5, 13);
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Soup", LastCookedDate = new DateTimeOffset(2026, 5, 13, 0, 0, 0, TimeSpan.Zero) });
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(), RecipeId = recipeId, Date = cookedDate, Status = CalendarEventStatus.Cooked
        });
        await _db.SaveChangesAsync();

        var service = CreateService(new FixedClock(new DateTimeOffset(2026, 5, 13, 12, 0, 0, TimeSpan.Zero)));

        await service.DeferRecipeAsync(new DeferScheduleDto(cookedDate, recipeId));

        Assert.Null(_db.Recipes.Single(r => r.Id == recipeId).LastCookedDate);
    }

    [Fact]
    public async Task FinalizeOverdueMeals_OnlyCooksPastPlannedAndLockedRecipeEvents()
    {
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Soup" });
        var yesterday = DateOnly.FromDateTime(new DateTime(2026, 10, 12, 1, 30, 0, DateTimeKind.Utc)).AddDays(-1);
        var today = DateOnly.FromDateTime(new DateTime(2026, 10, 12, 1, 30, 0, DateTimeKind.Utc));
        _db.CalendarEvents.AddRange(
            new CalendarEvent { Id = Guid.NewGuid(), RecipeId = recipeId, Date = yesterday, Status = CalendarEventStatus.Planned },
            new CalendarEvent { Id = Guid.NewGuid(), RecipeId = recipeId, Date = today, Status = CalendarEventStatus.Locked },
            new CalendarEvent { Id = Guid.NewGuid(), RecipeId = recipeId, Date = yesterday.AddDays(-1), Status = CalendarEventStatus.Skipped });
        await _db.SaveChangesAsync();

        await _service.FinalizeOverdueMealsAsync();
        await _service.FinalizeOverdueMealsAsync();

        Assert.Equal(CalendarEventStatus.Cooked, _db.CalendarEvents.Single(e => e.Date == yesterday).Status);
        Assert.Equal(CalendarEventStatus.Locked, _db.CalendarEvents.Single(e => e.Date == today).Status);
        Assert.Equal(CalendarEventStatus.Skipped, _db.CalendarEvents.Single(e => e.Date == yesterday.AddDays(-1)).Status);
    }

    [Fact]
    public async Task FinalizeOverdueMeals_RecalculatesLastCookedDateFromNewlyCookedEventDate()
    {
        var recipeId = Guid.NewGuid();
        var cookedDate = new DateOnly(2026, 5, 12);
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Soup" });
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(), RecipeId = recipeId, Date = cookedDate, Status = CalendarEventStatus.Planned
        });
        await _db.SaveChangesAsync();

        var service = CreateService(new FixedClock(new DateTimeOffset(2026, 5, 13, 12, 0, 0, TimeSpan.Zero)));

        await service.FinalizeOverdueMealsAsync();

        Assert.Equal(
            new DateTimeOffset(2026, 5, 12, 0, 0, 0, TimeSpan.Zero),
            _db.Recipes.Single(r => r.Id == recipeId).LastCookedDate);
    }

    [Fact]
    public async Task ValidateDay_UsesInjectedClockForLastCookedDate()
    {
        var recipeId = Guid.NewGuid();
        var scheduledDate = new DateOnly(2026, 5, 12);
        var clock = new FixedClock(new DateTimeOffset(2026, 5, 13, 12, 0, 0, TimeSpan.Zero));
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Soup" });
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(), RecipeId = recipeId, Date = scheduledDate, Status = CalendarEventStatus.Planned
        });
        await _db.SaveChangesAsync();

        await CreateService(clock).ValidateDayAsync(scheduledDate.ToString("yyyy-MM-dd"), new ValidationDto(2));

        Assert.Equal(clock.UtcNow, _db.Recipes.Single(r => r.Id == recipeId).LastCookedDate);
    }

    [Fact]
    public async Task RemoveRecipe_UsesInjectedClockToPublishTheAffectedWeek()
    {
        var recipeId = Guid.NewGuid();
        var scheduledDate = new DateOnly(2026, 5, 12);
        var clock = new FixedClock(new DateTimeOffset(2026, 5, 13, 12, 0, 0, TimeSpan.Zero));
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Soup" });
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(), RecipeId = recipeId, Date = scheduledDate, Status = CalendarEventStatus.Planned
        });
        await _db.SaveChangesAsync();

        await CreateService(clock).RemoveRecipeAsync(scheduledDate);

        _publisherMock.Verify(
            publisher => publisher.PublishWeekUpdatedAsync(
                It.Is<ScheduleDays>(schedule => schedule.WeekOffset == 0), null, null),
            Times.Once);
    }

    private ScheduleService CreateService(IClock clock)
    {
        var logger = _scope.ServiceProvider.GetRequiredService<ILogger<ScheduleService>>();
        var groceryRecomputeService = _scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>();
        return new ScheduleService(_db, logger, _publisherMock.Object, groceryRecomputeService, clock, new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager()), RecipeApi.Tests.Infrastructure.TestHistoricalInterest.Create(_db, clock, new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager())));
    }

    private sealed class FixedClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow => now;
    }

    [Fact]
    public async Task Should_Swap_Recipes_When_Moving_To_Occupied_Slot()
    {
        // Arrange
        var recipe1Id = Guid.NewGuid();
        var recipe2Id = Guid.NewGuid();
        _db.Recipes.AddRange(new Recipe { Id = recipe1Id, Name = "R1" }, new Recipe { Id = recipe2Id, Name = "R2" });
        
        var today = DateOnly.FromDateTime(new DateTime(2026, 10, 12, 1, 30, 0, DateTimeKind.Utc));
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
        
        var today = DateOnly.FromDateTime(new DateTime(2026, 10, 12, 1, 30, 0, DateTimeKind.Utc));
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

        var today = DateOnly.FromDateTime(new DateTime(2026, 10, 12, 1, 30, 0, DateTimeKind.Utc));
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

        var today = DateOnly.FromDateTime(new DateTime(2026, 10, 12, 1, 30, 0, DateTimeKind.Utc));
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

        var today = DateOnly.FromDateTime(new DateTime(2026, 10, 12, 1, 30, 0, DateTimeKind.Utc));
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

        var today = DateOnly.FromDateTime(new DateTime(2026, 10, 12, 1, 30, 0, DateTimeKind.Utc));
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
        
        var date = DateOnly.FromDateTime(new DateTime(2026, 10, 12, 1, 30, 0, DateTimeKind.Utc));
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
        var today = DateOnly.FromDateTime(new DateTime(2026, 10, 12, 1, 30, 0, DateTimeKind.Utc));
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
