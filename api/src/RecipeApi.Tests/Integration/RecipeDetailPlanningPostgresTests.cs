using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public partial class RecipeDetailPlanningPostgresTests(ITestOutputHelper output)
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RecipeDetailPlanning_EmptyDatedTargetPersistsAndReadsGroceries()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var client = factory.CreateAuthenticatedClient();
            (await client.PostAsJsonAsync(TonightReplacementPostgresTests.AssignUrl,
                TonightReplacementPostgresTests.Assignment(2))).EnsureSuccessStatusCode();
            using var response = JsonDocument.Parse(await client.GetStringAsync("/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05"));
            var schedule = response.RootElement.GetProperty("data");
            var day = schedule.GetProperty("days")[2];
            Assert.Equal("2026-10-07", day.GetProperty("date").GetString());
            Assert.Equal(TomorrowPushPostgresTests.Other, day.GetProperty("recipe").GetProperty("id").GetGuid());
            var groceries = schedule.GetProperty("groceryItems").GetRawText();
            Assert.Contains("potato", groceries, StringComparison.OrdinalIgnoreCase);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            Assert.Equal(TomorrowPushPostgresTests.Other, (await db.CalendarEvents.SingleAsync(e => e.Date == new DateOnly(2026,10,7) && e.MealSlot == 0)).RecipeId);
            Assert.NotNull((await db.WeeklyPlans.SingleAsync(p => p.WeekStartDate == new DateOnly(2026,10,5))).GroceryItems);
            output.WriteLine($"Persisted 2026-10-07 recipe {TomorrowPushPostgresTests.Other}; schedule groceries: {groceries}");
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RecipeDetailPlanning_CompetingGuardedSavesKeepOneWinnerAndSundayUnchanged()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var first = factory.CreateAuthenticatedClient();
            using var second = factory.CreateAuthenticatedClient();
            var responses = await Task.WhenAll(
                first.PostAsJsonAsync(TonightReplacementPostgresTests.AssignUrl, TonightReplacementPostgresTests.Assignment(3)),
                second.PostAsJsonAsync(TonightReplacementPostgresTests.AssignUrl, TonightReplacementPostgresTests.Assignment(3, TomorrowPushPostgresTests.Selected)));
            Assert.Single(responses, response => response.StatusCode == HttpStatusCode.OK);
            Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Conflict);
            Assert.Equal(HttpStatusCode.Conflict, (await first.PostAsJsonAsync(TonightReplacementPostgresTests.AssignUrl, TonightReplacementPostgresTests.Assignment(6))).StatusCode);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var winner = Assert.Single(await db.CalendarEvents.Where(e => e.Date == new DateOnly(2026,10,8) && e.MealSlot == 0).ToListAsync());
            Assert.Equal(TomorrowPushPostgresTests.Selected, (await db.CalendarEvents.SingleAsync(e => e.Date == TomorrowPushPostgresTests.Sunday && e.MealSlot == 0)).RecipeId);
            using var read = JsonDocument.Parse(await second.GetStringAsync("/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05"));
            var data = read.RootElement.GetProperty("data");
            Assert.Equal(winner.RecipeId, data.GetProperty("days")[3].GetProperty("recipe").GetProperty("id").GetGuid());
            output.WriteLine($"Competing saves: one OK, one 409; 2026-10-08 winner {winner.RecipeId}; groceries: {data.GetProperty("groceryItems").GetRawText()}");
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RecipeDetailPlanning_FutureSourceSpilloverThenRejectedReplacementConservesOccurrenceAndGroceries()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            Guid occurrence;
            using (var scope = factory.Services.CreateScope()) {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var original = await db.CalendarEvents.SingleAsync(e => e.Date == new DateOnly(2026,10,14) && e.MealSlot == 0);
                original.RecipeId = TomorrowPushPostgresTests.Selected;
                original.VoteCount = 37;
                occurrence = original.Id;
                var nonCooking = await db.CalendarEvents.SingleAsync(e => e.Date == new DateOnly(2026,10,20) && e.MealSlot == 0);
                nonCooking.RecipeId = null;
                nonCooking.Status = CalendarEventStatus.Skipped;
                nonCooking.NonCookingKind = "eating_out";
                await db.SaveChangesAsync();
            }
            using var first = factory.CreateAuthenticatedClient();
            using var second = factory.CreateAuthenticatedClient();
            var moved = await first.PostAsJsonAsync("/api/schedule/defer?referenceWeekStartDate=2026-10-05&targetWeekOffset=2", new { sourceDate = "2026-10-14", recipeId = TomorrowPushPostgresTests.Selected });
            moved.EnsureSuccessStatusCode();
            using var result = JsonDocument.Parse(await moved.Content.ReadAsStringAsync());
            var data = result.RootElement.GetProperty("data");
            Assert.Equal("2026-10-26", data.GetProperty("scheduledDate").GetString());
            Assert.Equal(3, data.GetProperty("scheduledWeekOffset").GetInt32());
            Assert.Contains("full", data.GetProperty("message").GetString());
            (await second.PostAsJsonAsync(TonightReplacementPostgresTests.AssignUrl, new { weekOffset = 1, dayIndex = 2, recipeId = TomorrowPushPostgresTests.Other, requireEmpty = true })).EnsureSuccessStatusCode();
            Assert.Equal(HttpStatusCode.Conflict, (await first.PostAsJsonAsync(TonightReplacementPostgresTests.AssignUrl, new { weekOffset = 1, dayIndex = 2, recipeId = TomorrowPushPostgresTests.Selected, requireEmpty = true })).StatusCode);
            using var check = factory.Services.CreateScope();
            var stored = check.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var conserved = await stored.CalendarEvents.AsNoTracking().SingleAsync(e => e.Id == occurrence);
            Assert.Equal(new DateOnly(2026,10,26), conserved.Date);
            Assert.Equal(37, conserved.VoteCount);
            Assert.Equal(TomorrowPushPostgresTests.Selected, conserved.RecipeId);
            Assert.Equal("eating_out", (await stored.CalendarEvents.SingleAsync(e => e.Date == new DateOnly(2026,10,20))).NonCookingKind);
            Assert.Equal(TomorrowPushPostgresTests.Other, (await stored.CalendarEvents.SingleAsync(e => e.Date == new DateOnly(2026,10,14) && e.MealSlot == 0)).RecipeId);
            using var source = JsonDocument.Parse(await second.GetStringAsync("/api/schedule?weekOffset=1&referenceWeekStartDate=2026-10-05"));
            using var destination = JsonDocument.Parse(await second.GetStringAsync("/api/schedule?weekOffset=3&referenceWeekStartDate=2026-10-05"));
            Assert.Contains("potato", source.RootElement.GetProperty("data").GetProperty("groceryItems").GetRawText(), StringComparison.OrdinalIgnoreCase);
            Assert.Contains("carrot", destination.RootElement.GetProperty("data").GetProperty("groceryItems").GetRawText(), StringComparison.OrdinalIgnoreCase);
            var sourcePlan = await stored.WeeklyPlans.AsNoTracking().SingleAsync(p => p.WeekStartDate == new DateOnly(2026,10,12));
            Assert.DoesNotContain("carrot", JsonDocument.Parse(sourcePlan.GroceryState).RootElement.EnumerateObject().Select(x=>x.Name));
            Assert.All(JsonDocument.Parse(sourcePlan.GroceryState).RootElement.EnumerateObject(), x=>Assert.True(Guid.TryParse(x.Name,out _)));
            output.WriteLine($"Original occurrence {occurrence} conserved at 2026-10-26 with 37 votes; source competing winner {TomorrowPushPostgresTests.Other}; source groceries={source.RootElement.GetProperty("data").GetProperty("groceryItems").GetRawText()}; destination groceries={destination.RootElement.GetProperty("data").GetProperty("groceryItems").GetRawText()}");
        });
    }

    private const string ReadWeek = "/api/schedule?weekOffset=0&referenceWeekStartDate=2026-10-05";
    private const string RemoveSunday = "/api/schedule/day/2026-10-11/remove";

    private static async Task<string?> RemovalToken(HttpClient client, int day = 6)
    {
        using var read = JsonDocument.Parse(await client.GetStringAsync(ReadWeek));
        var value = read.RootElement.GetProperty("data").GetProperty("days")[day];
        Assert.True(value.TryGetProperty("removalToken", out var token), "Schedule reads must expose removalToken, including null for absent supper.");
        return token.GetString();
    }

    [Fact]
    public async Task RecipeDetailPlanning_GuardedRemovalValidatesSuppliedTokensAndPreservesLegacyOmission()
    {
        await using var factory = await DeploymentCalendarIntegrationTests.CreateAsync();
        await TomorrowPushPostgresTests.Seed(factory);
        using var client = factory.CreateAuthenticatedClient();
        foreach (var token in new[] { "", "garbage", "v1." + new string('a', 44), "v2." + new string('a', 43), "v1." + new string('+', 43) })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.DeleteAsync(RemoveSunday + "?expectedPlanToken=" + Uri.EscapeDataString(token))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync(RemoveSunday)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync(RemoveSunday)).StatusCode);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RecipeDetailPlanning_RemovalTokensTrackPersistedSupperAndRejectEveryChangedState()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var client = factory.CreateAuthenticatedClient();
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.CalendarEvents.Add(new CalendarEvent { Date = new(2026,10,5), MealSlot = 1, RecipeId = TomorrowPushPostgresTests.Other });
            await db.SaveChangesAsync();
            Assert.Null(await RemovalToken(client, 0));
            var token = await RemovalToken(client);
            Assert.Matches(@"^v1\.[A-Za-z0-9_-]{43}$", token!);
            Assert.Equal(token, await RemovalToken(client));
            var source = await db.CalendarEvents.SingleAsync(e => e.Date == TomorrowPushPostgresTests.Sunday && e.MealSlot == 0);
            Action<CalendarEvent>[] changes = [
                e => e.RecipeId = TomorrowPushPostgresTests.Other,
                e => e.Status = CalendarEventStatus.Skipped,
                e => { e.RecipeId = null; e.NonCookingKind = "custom"; e.NonCookingLabel = "Take Out"; },
                e => e.NonCookingLabel = "Changed plan",
                e => e.VoteCount = 87,
                e => e.CandidateIds = [TomorrowPushPostgresTests.Other],
            ];
            foreach (var change in changes) {
                change(source);
                await db.SaveChangesAsync();
                var before = await TonightReplacementPostgresTests.Snapshot(db);
                Assert.NotEqual(token, await RemovalToken(client));
                Assert.Equal(HttpStatusCode.Conflict, (await client.DeleteAsync(RemoveSunday + "?expectedPlanToken=" + token)).StatusCode);
                Assert.Equal(before, await TonightReplacementPostgresTests.Snapshot(db));
                source = await db.CalendarEvents.SingleAsync(e => e.Date == TomorrowPushPostgresTests.Sunday && e.MealSlot == 0);
                token = await RemovalToken(client);
            }
            // Recreating identical content must still invalidate the old occurrence token.
            db.CalendarEvents.Remove(source);
            await db.SaveChangesAsync();
            source.Id = Guid.NewGuid();
            db.CalendarEvents.Add(source);
            await db.SaveChangesAsync();
            Assert.Equal(HttpStatusCode.Conflict, (await client.DeleteAsync(RemoveSunday + "?expectedPlanToken=" + token)).StatusCode);
            output.WriteLine("Persisted supper content changes and recreated occurrence rejected without calendar or grocery mutation; other meal-slot token absent.");
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RecipeDetailPlanning_GuardedTakeOutRemovalCommitsOnceAndKeepsOtherMealSlotsAndRecipe()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var source = await db.CalendarEvents.SingleAsync(e => e.Date == TomorrowPushPostgresTests.Sunday && e.MealSlot == 0);
            source.RecipeId = null; source.Status = CalendarEventStatus.Skipped; source.NonCookingKind = "order_in";
            db.CalendarEvents.Add(new CalendarEvent { Date = TomorrowPushPostgresTests.Sunday, MealSlot = 1, RecipeId = TomorrowPushPostgresTests.Other });
            await db.SaveChangesAsync();
            using var first = factory.CreateAuthenticatedClient();
            using var second = factory.CreateAuthenticatedClient();
            var token = await RemovalToken(first);
            var url = RemoveSunday + "?expectedPlanToken=" + token;
            var responses = await Task.WhenAll(first.DeleteAsync(url), second.DeleteAsync(url));
            Assert.Single(responses, r => r.StatusCode == HttpStatusCode.NoContent);
            Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Conflict);
            Assert.Null(await RemovalToken(first));
            db.ChangeTracker.Clear();
            Assert.False(await db.CalendarEvents.AnyAsync(e => e.Date == TomorrowPushPostgresTests.Sunday && e.MealSlot == 0));
            Assert.True(await db.CalendarEvents.AnyAsync(e => e.Date == TomorrowPushPostgresTests.Sunday && e.MealSlot == 1));
            Assert.True(await db.Recipes.AnyAsync(e => e.Id == TomorrowPushPostgresTests.Selected));
            (await first.PostAsJsonAsync(TonightReplacementPostgresTests.AssignUrl, TonightReplacementPostgresTests.Assignment())).EnsureSuccessStatusCode();
            using var read = JsonDocument.Parse(await first.GetStringAsync(ReadWeek));
            Assert.Contains("potato", read.RootElement.GetProperty("data").GetProperty("groceryItems").GetRawText(), StringComparison.OrdinalIgnoreCase);
            output.WriteLine("One committed guarded Take Out deletion, one 409; recipe and lunch preserved; replacement Sunday and potato groceries persisted.");
        });
    }

    [Fact]
    public async Task RecipeDetailPlanning_GuardedRemovalDoesNotTrustAnEarlierTrackedRead()
    {
        await using var factory = await DeploymentCalendarIntegrationTests.CreateAsync();
        await CheckTrackedRemoval(factory);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task RecipeDetailPlanning_GuardedRemovalReadsPersistedStateInAnExistingPostgresContext()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await CheckTrackedRemoval(factory);
        });
    }

    private static async Task CheckTrackedRemoval(TestWebApplicationFactory factory)
    {
        await TomorrowPushPostgresTests.Seed(factory);
        using var firstScope = factory.Services.CreateScope();
        var service = firstScope.ServiceProvider.GetRequiredService<RecipeApi.Services.ScheduleService>();
        var read = await service.GetScheduleAsync(0, new DateOnly(2026,10,5));
        var token = read.Days[6].RemovalToken;
        using (var secondScope = factory.Services.CreateScope()) {
            var db = secondScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var source = await db.CalendarEvents.SingleAsync(e => e.Date == TomorrowPushPostgresTests.Sunday && e.MealSlot == 0);
            source.RecipeId = TomorrowPushPostgresTests.Other;
            await db.SaveChangesAsync();
        }
        await Assert.ThrowsAsync<RecipeApi.Services.RemovalConflictException>(() => service.RemoveRecipeAsync(TomorrowPushPostgresTests.Sunday, expectedPlanToken: token));
        using var checkScope = factory.Services.CreateScope();
        var check = checkScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Assert.Equal(TomorrowPushPostgresTests.Other, (await check.CalendarEvents.SingleAsync(e => e.Date == TomorrowPushPostgresTests.Sunday && e.MealSlot == 0)).RecipeId);
    }
}
