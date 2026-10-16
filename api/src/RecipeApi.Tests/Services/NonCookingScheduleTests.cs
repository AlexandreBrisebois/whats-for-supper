using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class NonCookingScheduleTests : IDisposable
{
    private readonly RecipeDbContext _db = new(new DbContextOptionsBuilder<RecipeDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options);
    private readonly ScheduleService _service;
    private readonly DateOnly _monday = new(2026, 10, 12);

    public NonCookingScheduleTests()
    {
        var publisher = new Mock<IScheduleEventPublisher>();
        var clock = new FixedClock(new DateTimeOffset(2026, 10, 12, 12, 0, 0, TimeSpan.Zero));
        var grocery = new GroceryRecomputeService(_db, new AisleMapper(), NullLogger<GroceryRecomputeService>.Instance, clock, new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager()), publisher.Object);
        _service = new ScheduleService(_db, NullLogger<ScheduleService>.Instance, publisher.Object, grocery, clock, new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager()));
    }

    private static ValidationDto Plan(string kind, string? label = null, int status = 3) =>
        JsonSerializer.Deserialize<ValidationDto>(JsonSerializer.Serialize(new { status, nonCooking = new { kind, customLabel = label } }))!;

    private async Task<JsonElement> Day(int index = 0) => JsonSerializer.SerializeToElement((await _service.GetScheduleAsync(0)).Days[index]);

    [Theory]
    [InlineData("order_in")]
    [InlineData("eating_out")]
    public async Task OptionalNote_PersistsTrimmedTextAndCanBeCleared(string kind)
    {
        await _service.ValidateDayAsync("2026-10-12", Plan(kind, "  Luigi’s  "));
        _db.ChangeTracker.Clear();
        Assert.Equal("Luigi’s", (await Day()).GetProperty("nonCooking").GetProperty("customLabel").GetString());
        Assert.Equal(kind, _db.CalendarEvents.Single().NonCookingKind);
        await Assert.ThrowsAsync<ArgumentException>(() => _service.ValidateDayAsync("2026-10-12", Plan(kind, new string('x', 81))));
        Assert.Equal("Luigi’s", _db.CalendarEvents.Single().NonCookingLabel);
        await _service.ValidateDayAsync("2026-10-12", Plan(kind, "   "));
        Assert.Null(_db.CalendarEvents.Single().NonCookingLabel);
        await _service.ValidateDayAsync("2026-10-12", Plan(kind, string.Concat(Enumerable.Repeat("🍕", 80))));
        Assert.Equal(80, _db.CalendarEvents.Single().NonCookingLabel!.EnumerateRunes().Count());
        await _service.ValidateDayAsync("2026-10-12", Plan(kind));
        Assert.Null(_db.CalendarEvents.Single().NonCookingLabel);
    }

    [Fact]
    public async Task MysteryNight_SurvivesVotingLockAndExcludesAutomaticPlacement()
    {
        await _service.ValidateDayAsync("2026-10-12", Plan("mystery"));
        await _service.OpenVotingAsync(0);
        await _service.LockScheduleAsync(0);
        _db.ChangeTracker.Clear();
        var day = await Day();
        Assert.Equal("mystery", day.GetProperty("nonCooking").GetProperty("kind").GetString());
        Assert.Equal(3, day.GetProperty("status").GetInt32());
        Assert.Null(_db.CalendarEvents.Single().RecipeId);
        Assert.Null(_db.CalendarEvents.Single().NonCookingLabel);
        Assert.DoesNotContain((await _service.GetSmartDefaultsAsync(0)).OpenSlots, slot => slot.DayIndex == 0);
    }

    [Theory]
    [InlineData(WeeklyPlanStatus.Draft)]
    [InlineData(WeeklyPlanStatus.VotingOpen)]
    [InlineData(WeeklyPlanStatus.Locked)]
    public async Task CustomPlan_SurvivesReadVotingAndLock_InAllWeekStates(WeeklyPlanStatus state)
    {
        _db.WeeklyPlans.Add(new WeeklyPlan { Id = Guid.NewGuid(), WeekStartDate = _monday, Status = state });
        await _db.SaveChangesAsync();
        await _service.ValidateDayAsync("2026-10-12", Plan("custom", "  Supper at Grandma’s  "));
        await _service.OpenVotingAsync(0);
        await _service.LockScheduleAsync(0);
        var day = await Day();
        Assert.Equal(3, day.GetProperty("status").GetInt32());
        Assert.Equal("Supper at Grandma’s", day.GetProperty("nonCooking").GetProperty("customLabel").GetString());
        Assert.Null(_db.CalendarEvents.Single().RecipeId);
    }

    [Theory]
    [InlineData("order_in", "Luigi’s")]
    [InlineData("eating_out", "Try the new café")]
    [InlineData("order_in", null)]
    [InlineData("eating_out", null)]
    [InlineData("mystery", null)]
    [InlineData("custom", "Emma’s birthday supper")]
    public async Task DragOntoPlan_SwapsSkippedPlanAndMessageToSource(string kind, string? label)
    {
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Pasta", Ingredients = "[]" });
        _db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), Date = _monday, RecipeId = recipeId, Status = CalendarEventStatus.Planned });
        await _db.SaveChangesAsync();
        await _service.ValidateDayAsync("2026-10-13", Plan(kind, label));
        await _service.MoveScheduleEventAsync(new MoveScheduleDto(0, recipeId, 1, FromIndex: 0));
        var source = await Day();
        Assert.Equal(3, source.GetProperty("status").GetInt32());
        Assert.Equal(kind, source.GetProperty("nonCooking").GetProperty("kind").GetString());
        Assert.Equal(label, source.GetProperty("nonCooking").GetProperty("customLabel").GetString());
        Assert.Equal(recipeId, _db.CalendarEvents.Single(e => e.Date == _monday.AddDays(1)).RecipeId);
        Assert.Equal(JsonValueKind.Null, (await Day(1)).GetProperty("nonCooking").ValueKind);
    }

    [Theory]
    [InlineData("custom", " ", 3)]
    [InlineData("unexpected", null, 3)]
    [InlineData("eating_out", "not applicable", 2)]
    [InlineData("mystery", "not applicable", 3)]
    [InlineData("custom", "Birthday", 2)]
    public async Task InvalidPlan_DoesNotMutate(string kind, string? label, int status)
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _service.ValidateDayAsync("2026-10-12", Plan(kind, label, status)));
        Assert.Empty(_db.CalendarEvents);
    }

    [Fact]
    public async Task LabelLimit_CountsUnicodeScalarsAndRejectsOverlength()
    {
        await _service.ValidateDayAsync("2026-10-12", Plan("custom", string.Concat(Enumerable.Repeat("🎂", 80))));
        await Assert.ThrowsAsync<ArgumentException>(() => _service.ValidateDayAsync("2026-10-12", Plan("custom", new string('x', 81))));
        Assert.Equal(string.Concat(Enumerable.Repeat("🎂", 80)), (await Day()).GetProperty("nonCooking").GetProperty("customLabel").GetString());
    }

    [Fact]
    public async Task ExplicitAssignment_ClearsLabel_AndLegacyRequestPreservesIt()
    {
        await _service.ValidateDayAsync("2026-10-12", Plan("custom", "Birthday supper"));
        await _service.ValidateDayAsync("2026-10-12", new ValidationDto(3));
        Assert.Equal("Birthday supper", (await Day()).GetProperty("nonCooking").GetProperty("customLabel").GetString());
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Soup", Ingredients = "[]" });
        await _db.SaveChangesAsync();
        await _service.AssignRecipeAsync(new AssignScheduleDto(0, 0, recipeId));
        Assert.Equal(JsonValueKind.Null, (await Day()).GetProperty("nonCooking").ValueKind);
    }

    [Fact]
    public async Task LegacySkippedPlan_ProjectsOrderInAndSurvivesBackupRoundTrip()
    {
        await _service.ValidateDayAsync("2026-10-12", new ValidationDto(3));
        Assert.Equal("order_in", (await Day()).GetProperty("nonCooking").GetProperty("kind").GetString());
        await _service.ValidateDayAsync("2026-10-12", Plan("custom", "<Birthday>"));
        var restored = JsonSerializer.Deserialize<CalendarEvent>(JsonSerializer.Serialize(_db.CalendarEvents.Single()))!;
        _db.ChangeTracker.Clear();
        _db.CalendarEvents.RemoveRange(_db.CalendarEvents);
        await _db.SaveChangesAsync();
        _db.CalendarEvents.Add(restored);
        await _db.SaveChangesAsync();
        Assert.Equal("<Birthday>", (await Day()).GetProperty("nonCooking").GetProperty("customLabel").GetString());
    }

    [Fact]
    public async Task NonCookingSave_CannotOverwriteRecipe()
    {
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe { Id = recipeId, Name = "Pasta" });
        _db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), Date = _monday, RecipeId = recipeId, Status = CalendarEventStatus.Planned });
        await _db.SaveChangesAsync();
        await Assert.ThrowsAsync<NonCookingPlanConflictException>(() => _service.ValidateDayAsync("2026-10-12", Plan("custom", "Birthday")));
        Assert.Equal(recipeId, _db.CalendarEvents.Single().RecipeId);
        Assert.Equal(CalendarEventStatus.Planned, _db.CalendarEvents.Single().Status);
    }

    [Fact]
    public async Task AllMarkedWeek_HasNoOpenSlotsOrRecipeSideEffects()
    {
        for (var i = 0; i < 7; i++) await _service.ValidateDayAsync(_monday.AddDays(i).ToString("yyyy-MM-dd"), Plan("eating_out"));
        var defaults = await _service.GetSmartDefaultsAsync(0);
        Assert.Empty(defaults.OpenSlots);
        Assert.Empty(defaults.PreSelectedRecipes);
        Assert.Empty(_db.RecipeVotes);
        Assert.Empty(_db.Recipes);
    }

    [Fact]
    public async Task Push_ShiftsTheWholeCustomPlan()
    {
        var recipeId = await AddRecipe(_monday);
        await _service.ValidateDayAsync("2026-10-13", Plan("custom", "Birthday"));
        await _service.MoveScheduleEventAsync(new MoveScheduleDto(0, recipeId, 1, "push", FromIndex: 0));
        Assert.Equal("Birthday", _db.CalendarEvents.Single(e => e.Date == _monday.AddDays(2)).NonCookingLabel);
        Assert.Equal(recipeId, _db.CalendarEvents.Single(e => e.Date == _monday.AddDays(1)).RecipeId);
    }

    [Fact]
    public async Task FullPush_FallsBackToSwapIncludingCustomMessage()
    {
        var recipeId = await AddRecipe(_monday);
        for (var i = 1; i < 14; i++) await _service.ValidateDayAsync(_monday.AddDays(i).ToString("yyyy-MM-dd"), Plan("custom", $"Plan {i}"));
        await _service.MoveScheduleEventAsync(new MoveScheduleDto(0, recipeId, 1, "push", FromIndex: 0));
        Assert.Equal("Plan 1", _db.CalendarEvents.Single(e => e.Date == _monday).NonCookingLabel);
        Assert.Equal(recipeId, _db.CalendarEvents.Single(e => e.Date == _monday.AddDays(1)).RecipeId);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task CrossWeekAndDefer_LeaveOccupiedCustomPlanInPlace(bool defer)
    {
        var recipeId = await AddRecipe(_monday);
        await _service.ValidateDayAsync("2026-10-19", Plan("custom", "Grandma"));
        if (defer) await _service.DeferRecipeAsync(new DeferScheduleDto(_monday, recipeId));
        else await _service.MoveScheduleEventAsync(new MoveScheduleDto(0, recipeId, 0, TargetWeekOffset: 1, FromIndex: 0));
        Assert.Equal("Grandma", _db.CalendarEvents.Single(e => e.Date == _monday.AddDays(7)).NonCookingLabel);
        Assert.Equal(recipeId, _db.CalendarEvents.Single(e => e.Date == _monday.AddDays(8)).RecipeId);
    }

    [Fact]
    public async Task SundayDisplacement_ClearsMetadataOnExistingNextMondayTarget()
    {
        var displaced = await AddRecipe(_monday.AddDays(6));
        await _service.ValidateDayAsync("2026-10-19", Plan("custom", "Grandma"));
        var replacement = Guid.NewGuid();
        _db.Recipes.Add(new Recipe { Id = replacement, Name = "Soup", Ingredients = "[]" });
        await _db.SaveChangesAsync();
        await _service.AssignRecipeAsync(new AssignScheduleDto(0, 6, replacement));
        var target = _db.CalendarEvents.Single(e => e.Date == _monday.AddDays(7));
        Assert.Equal(displaced, target.RecipeId);
        Assert.Null(target.NonCookingKind);
        Assert.Null(target.NonCookingLabel);
    }

    private async Task<Guid> AddRecipe(DateOnly date)
    {
        var id = Guid.NewGuid();
        _db.Recipes.Add(new Recipe { Id = id, Name = "Pasta", Ingredients = "[]" });
        _db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), Date = date, RecipeId = id, Status = CalendarEventStatus.Planned });
        await _db.SaveChangesAsync();
        return id;
    }

    public void Dispose() => _db.Dispose();
    private sealed class FixedClock(DateTimeOffset now) : IClock { public DateTimeOffset UtcNow => now; }
}
