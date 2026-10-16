using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class DeploymentCalendarIntegrationTests
{
    internal sealed class CalendarClock : IClock
    {
        private long _ticks = DateTimeOffset.Parse("2026-10-12T01:30:00Z").UtcTicks;
        public DateTimeOffset UtcNow
        {
            get => new(Interlocked.Read(ref _ticks), TimeSpan.Zero);
            set => Interlocked.Exchange(ref _ticks, value.UtcTicks);
        }
    }

    internal static Task<TestWebApplicationFactory> CreateAsync(string? zone = "America/Toronto") =>
        TestWebApplicationFactory.CreateWithAuthAsync(new CalendarClock(),
            new Dictionary<string, string?> { ["Calendar:TimeZone"] = zone });

    [Theory]
    [InlineData(0, "2026-10-05", "2026-10-11")]
    [InlineData(1, "2026-10-12", "2026-10-18")]
    public async Task Read_UsesDeploymentWeekAndReturnsExactRecipeIdentity(int offset, string monday, string sunday)
    {
        await using var factory = await CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var first = new Recipe { Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440101"), Name = "October 11", Ingredients = "[\"Carrot\"]" };
        var second = new Recipe { Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440102"), Name = "October 18", Ingredients = "[\"Potato\"]" };
        db.Recipes.AddRange(first, second);
        db.CalendarEvents.AddRange(
            new CalendarEvent { Date = new DateOnly(2026, 10, 11), RecipeId = first.Id },
            new CalendarEvent { Date = new DateOnly(2026, 10, 18), RecipeId = second.Id });
        await db.SaveChangesAsync();
        using var client = factory.CreateAuthenticatedClient();
        var response = await client.GetAsync($"/api/schedule?weekOffset={offset}");
        response.EnsureSuccessStatusCode();
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = body.RootElement.GetProperty("data");
        Assert.Equal(monday, data.GetProperty("days")[0].GetProperty("date").GetString());
        Assert.Equal(sunday, data.GetProperty("days")[6].GetProperty("date").GetString());
        Assert.Equal(offset == 0 ? first.Id : second.Id, data.GetProperty("days")[6].GetProperty("recipe").GetProperty("id").GetGuid());
        Assert.Equal(monday, data.GetProperty("weekStartDate").GetString());
        var calendar = data.GetProperty("calendar");
        Assert.Equal("America/Toronto", calendar.GetProperty("timeZone").GetString());
        Assert.Equal("2026-10-11", calendar.GetProperty("today").GetString());
        Assert.Equal("2026-10-05", calendar.GetProperty("currentWeekStartDate").GetString());
        Assert.Equal("2026-10-05", calendar.GetProperty("referenceWeekStartDate").GetString());
        Assert.Equal(DateTimeOffset.Parse("2026-10-12T01:30:00Z"), calendar.GetProperty("capturedAtUtc").GetDateTimeOffset());
        Assert.Equal(DateTimeOffset.Parse("2026-10-12T04:00:00Z"), calendar.GetProperty("nextDayAtUtc").GetDateTimeOffset());
    }

    [Fact]
    public async Task Assign_PinsSundayAndPreservesNextSundayThroughReread()
    {
        await using var factory = await CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var selected = new Recipe { Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440101"), Name = "Selected", Ingredients = "[\"Carrot\"]" };
        var sentinel = new Recipe { Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440102"), Name = "Sentinel", Ingredients = "[\"Potato\"]" };
        db.Recipes.AddRange(selected, sentinel);
        db.CalendarEvents.Add(new CalendarEvent { Date = new DateOnly(2026, 10, 18), RecipeId = sentinel.Id });
        await db.SaveChangesAsync();
        using var client = factory.CreateAuthenticatedClient();
        var response = await client.PostAsJsonAsync("/api/schedule/assign?referenceWeekStartDate=2026-10-05",
            new { weekOffset = 0, dayIndex = 6, recipeId = selected.Id });
        response.EnsureSuccessStatusCode();
        var entries = await db.CalendarEvents.AsNoTracking().OrderBy(e => e.Date).ToListAsync();
        Assert.Collection(entries,
            e => { Assert.Equal(new DateOnly(2026, 10, 11), e.Date); Assert.Equal(selected.Id, e.RecipeId); },
            e => { Assert.Equal(new DateOnly(2026, 10, 18), e.Date); Assert.Equal(sentinel.Id, e.RecipeId); });
        using var read = JsonDocument.Parse(await client.GetStringAsync("/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05"));
        Assert.Equal(selected.Id, read.RootElement.GetProperty("data").GetProperty("days")[6].GetProperty("recipe").GetProperty("id").GetGuid());
    }

    [Theory]
    [InlineData("2026-10-06")]
    [InlineData("not-a-date")]
    [InlineData("")]
    [InlineData("%20")]
    public async Task InvalidReference_RejectsReadAndAssignWithoutMutation(string reference)
    {
        await using var factory = await CreateAsync();
        using var client = factory.CreateAuthenticatedClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync($"/api/schedule?referenceWeekStartDate={reference}")).StatusCode);
        var write = await client.PostAsJsonAsync($"/api/schedule/assign?referenceWeekStartDate={reference}",
            new { weekOffset = 0, dayIndex = 6, recipeId = Guid.Parse("550e8400-e29b-41d4-a716-446655440101") });
        Assert.Equal(HttpStatusCode.BadRequest, write.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.Empty(await db.CalendarEvents.ToListAsync());
        Assert.Empty(await db.WeeklyPlans.ToListAsync());
    }

    [Fact]
    public async Task CalendarEndpoints_RequireAuthentication()
    {
        await using var factory = await CreateAsync();
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/schedule")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/schedule/assign?referenceWeekStartDate=2026-10-05",
            new { weekOffset = 0, dayIndex = 6, recipeId = Guid.NewGuid() })).StatusCode);
    }
    [Theory]
    [InlineData("lock")]
    [InlineData("voting/open")]
    [InlineData("move")]
    [InlineData("defer")]
    public async Task RelativeMutations_RejectNonMondayBeforeWork(string operation)
    {
        await using var factory = await CreateAsync();
        using var client = factory.CreateAuthenticatedClient();
        var response = await client.PostAsJsonAsync($"/api/schedule/{operation}?referenceWeekStartDate=2026-10-06",
            new { weekOffset = 0, recipeId = Guid.NewGuid(), toIndex = 0, sourceDate = "2026-10-11" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("fill-the-gap")]
    [InlineData("0/smart-defaults")]
    public async Task RelativeSuggestions_RejectNonMonday(string operation)
    {
        await using var factory = await CreateAsync();
        using var client = factory.CreateAuthenticatedClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync($"/api/schedule/{operation}?referenceWeekStartDate=2026-10-06")).StatusCode);
    }

    [Theory]
    [InlineData("move")]
    [InlineData("defer")]
    public async Task Movement_UsesOneReferenceForSourceAndNextWeek(string operation)
    {
        await using var factory = await CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Sunday", Ingredients = "[\"Carrot\"]" };
        db.Recipes.Add(recipe);
        db.CalendarEvents.Add(new CalendarEvent { Date = new DateOnly(2026, 10, 11), RecipeId = recipe.Id });
        await db.SaveChangesAsync();
        using var client = factory.CreateAuthenticatedClient();
        var response = await client.PostAsJsonAsync($"/api/schedule/{operation}?referenceWeekStartDate=2026-10-05",
            new { weekOffset = 0, fromIndex = 6, toIndex = 0, targetWeekOffset = 1, recipeId = recipe.Id, sourceDate = "2026-10-11", intent = "push" });
        response.EnsureSuccessStatusCode();
        var saved = await db.CalendarEvents.AsNoTracking().SingleAsync();
        Assert.Equal(new DateOnly(2026, 10, 12), saved.Date);
        Assert.Equal(recipe.Id, saved.RecipeId);
    }

    [Theory]
    [InlineData("lock", 2)]
    [InlineData("voting/open", 1)]
    public async Task WeekTransitions_UseExplicitReference(string operation, int status)
    {
        await using var factory = await CreateAsync();
        using var client = factory.CreateAuthenticatedClient();
        (await client.PostAsync($"/api/schedule/{operation}?weekOffset=1&referenceWeekStartDate=2026-10-05", null)).EnsureSuccessStatusCode();
        using var scope = factory.Services.CreateScope();
        var plan = await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking().SingleAsync();
        Assert.Equal(new DateOnly(2026, 10, 12), plan.WeekStartDate);
        Assert.Equal(status, (int)plan.Status);
    }

}
