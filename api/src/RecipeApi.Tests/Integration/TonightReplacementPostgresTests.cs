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

public partial class TonightReplacementPostgresTests(ITestOutputHelper output)
{
    internal static readonly Guid Original = TomorrowPushPostgresTests.Selected;
    internal static readonly Guid Replacement = TomorrowPushPostgresTests.Other;
    internal const string AssignUrl = "/api/schedule/assign?referenceWeekStartDate=2026-10-05";
    internal static object Assignment(int index = 6, Guid? recipe = null) => new {
        weekOffset = 0, dayIndex = index, recipeId = recipe ?? Replacement, requireEmpty = true,
    };

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task TonightReplacement_MoveThenGuardedSavePreservesEveryOccurrence()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var client = factory.CreateAuthenticatedClient();
            (await client.PostAsJsonAsync(TomorrowPushPostgresTests.MoveUrl, TomorrowPushPostgresTests.Request())).EnsureSuccessStatusCode();
            var saved = await client.PostAsJsonAsync(AssignUrl, Assignment());
            saved.EnsureSuccessStatusCode();
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var beforeRetry = await Snapshot(db);
            Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(AssignUrl, Assignment())).StatusCode);
            Assert.Equal(beforeRetry, await Snapshot(db));
            Assert.Equal(Replacement, (await db.CalendarEvents.SingleAsync(e => e.Date == TomorrowPushPostgresTests.Sunday && e.MealSlot == 0)).RecipeId);
            Assert.Equal(Original, (await db.CalendarEvents.SingleAsync(e => e.Date == TomorrowPushPostgresTests.Sunday.AddDays(1) && e.MealSlot == 0)).RecipeId);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task TonightReplacement_GuardedOccupiedSundayDoesNotDisplaceOrPublish()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var before = await Snapshot(db);
            using var client = factory.CreateAuthenticatedClient();
            Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(AssignUrl, Assignment())).StatusCode);
            Assert.Equal(before, await Snapshot(db));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task TonightReplacement_GuardValidatesTargetsAndLeavesOtherMealSlots()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            using var client = factory.CreateAuthenticatedClient();
            var before = await Snapshot(db);
            foreach (var url in new[] { "/api/schedule/assign", AssignUrl.Replace("2026-10-05", "2026-10-06"), AssignUrl.Replace("2026-10-05", "oops") })
                Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync(url, Assignment())).StatusCode);
            foreach (var index in new[] { -1, 7, int.MaxValue })
                Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync(AssignUrl, Assignment(index))).StatusCode);
            Assert.Equal(before, await Snapshot(db));
            db.CalendarEvents.Add(new CalendarEvent { Date = new(2026, 10, 5), MealSlot = 1, RecipeId = Original, VoteCount = 99 });
            await db.SaveChangesAsync();
            (await client.PostAsJsonAsync(AssignUrl, Assignment(0))).EnsureSuccessStatusCode();
            db.ChangeTracker.Clear();
            var slots = await db.CalendarEvents.Where(e => e.Date == new DateOnly(2026, 10, 5)).OrderBy(e => e.MealSlot).ToListAsync();
            Assert.Equal(2, slots.Count);
            Assert.Equal(Replacement, slots[0].RecipeId);
            Assert.Equal(Original, slots[1].RecipeId);
            Assert.Equal(99, slots[1].VoteCount);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task TonightReplacement_GuardRejectsAllExistingContentAndConcurrentSave()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            using var client = factory.CreateAuthenticatedClient();
            foreach (var status in Enum.GetValues<CalendarEventStatus>()) {
                db.ChangeTracker.Clear();
                var source = await db.CalendarEvents.SingleAsync(e => e.Date == TomorrowPushPostgresTests.Sunday && e.MealSlot == 0);
                source.Status = status;
                source.RecipeId = status == CalendarEventStatus.Skipped ? null : Replacement;
                source.NonCookingKind = status == CalendarEventStatus.Skipped ? "order_in" : null;
                await db.SaveChangesAsync();
                var before = await Snapshot(db);
                Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(AssignUrl, Assignment())).StatusCode);
                Assert.Equal(before, await Snapshot(db));
            }
            using var other = factory.CreateAuthenticatedClient();
            var responses = await Task.WhenAll(client.PostAsJsonAsync(AssignUrl, Assignment(0)), other.PostAsJsonAsync(AssignUrl, Assignment(0, Original)));
            Assert.Single(responses, r => r.StatusCode == HttpStatusCode.OK);
            Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Conflict);
            db.ChangeTracker.Clear();
            Assert.Equal(1, await db.CalendarEvents.CountAsync(e => e.Date == new DateOnly(2026, 10, 5) && e.MealSlot == 0));
        });
    }

    internal static async Task<string> Snapshot(RecipeDbContext db)
    {
        db.ChangeTracker.Clear();
        return JsonSerializer.Serialize(new {
            Events = await db.CalendarEvents.AsNoTracking().OrderBy(e => e.Id).Select(e => new { e.Id, e.Date, e.RecipeId, e.Status, e.MealSlot, e.VoteCount, e.CandidateIds, e.NonCookingKind, e.NonCookingLabel }).ToListAsync(),
            Plans = await db.WeeklyPlans.AsNoTracking().OrderBy(e => e.Id).ToListAsync(),
        });
    }
}
