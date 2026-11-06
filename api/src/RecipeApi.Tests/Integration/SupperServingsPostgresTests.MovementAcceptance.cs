using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Workflow;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class SupperServingsPostgresTests
{
    private static readonly DateOnly AcceptanceMonday = new(2026, 10, 12);
    private const string AcceptanceReference = "referenceWeekStartDate=2026-10-12";

    private Task WithMovementAcceptance(Func<TestWebApplicationFactory, RecipeDbContext, HttpClient, Task> check,
        Action<IServiceCollection>? services = null, Action<WebApplication>? application = null) =>
        new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var clock = new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = DateTimeOffset.Parse("2026-10-12T12:00:00Z") };
            await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(clock,
                new() { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString },
                configureServices: services, configureApplication: application);
            using var scope = app.Services.CreateScope();
            using var client = app.CreateAuthenticatedClient();
            await check(app, scope.ServiceProvider.GetRequiredService<RecipeDbContext>(), client);
        });

    private static Recipe AcceptanceRecipe(string name, int amount = 200) => new() {
        Name = name, Servings = 2, Ingredients = JsonSerializer.Serialize(new[] { $"{amount} g pasta" }),
        RawMetadata = JsonSerializer.Serialize(new { recipeIngredient = new[] { $"{amount} g pasta" }, supply = new[] { new { name = "pasta", quantity = amount, unitText = "g" } } }),
    };
    private static FamilySetting AcceptanceDefault(int count = 4) => new() { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = count }) };
    private static async Task<JsonElement> AcceptanceSchedule(HttpClient client, int offset = 0) =>
        JsonDocument.Parse(await client.GetStringAsync($"/api/schedule?weekOffset={offset}&{AcceptanceReference}")).RootElement.GetProperty("data").Clone();
    private static double AcceptancePasta(JsonElement schedule) => schedule.GetProperty("groceryItems").EnumerateArray().Where(x => x.GetProperty("normalizedKey").GetString() == "pasta").Sum(x => x.GetProperty("quantity").GetDouble());
    private static async Task AcceptanceCheck(HttpClient client) => Assert.Equal(HttpStatusCode.NoContent,
        (await client.PatchAsJsonAsync($"/api/schedule/0/grocery/item?{AcceptanceReference}", new { ingredientName = "pasta", @checked = true })).StatusCode);
    private static async Task AcceptanceRecompute(TestWebApplicationFactory app, params DateOnly[] mondays) {
        using var scope = app.Services.CreateScope();
        foreach (var monday in mondays) await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SupperServings_MovementAcceptance_SundayChainKeepsDateCountsAndExactFourWeekTotals() =>
        WithMovementAcceptance(async (app, db, client) => {
            var recipe = AcceptanceRecipe("Sunday chain"); db.Recipes.Add(recipe); db.FamilySettings.Add(AcceptanceDefault());
            var sunday = AcceptanceMonday.AddDays(6);
            var chain = Enumerable.Range(0, 15).Select(i => new CalendarEvent { Date = sunday.AddDays(i), RecipeId = recipe.Id, VoteCount = i }).ToArray();
            db.CalendarEvents.AddRange(chain);
            var lunch = new CalendarEvent { Date = sunday.AddDays(2), RecipeId = recipe.Id, MealSlot = 1, VoteCount = 90 };
            var legacySkipped = new CalendarEvent { Date = sunday.AddDays(17), RecipeId = recipe.Id, Status = CalendarEventStatus.Skipped, VoteCount = 91 };
            db.CalendarEvents.AddRange(lunch, legacySkipped);
            db.SupperServings.AddRange(new SupperServing { Date = sunday, OverrideServings = 6 },
                new SupperServing { Date = sunday.AddDays(1), OverrideServings = 3 }, new SupperServing { Date = sunday.AddDays(7), OverrideServings = 5 },
                new SupperServing { Date = sunday.AddDays(14), OverrideServings = 2 }, new SupperServing { Date = sunday.AddDays(15), OverrideServings = 7 },
                new SupperServing { Date = legacySkipped.Date, OverrideServings = 9 });
            await db.SaveChangesAsync();
            var originalCounts = await db.SupperServings.OrderBy(x => x.Date).Select(x => new { x.Date, x.OverrideServings }).ToArrayAsync();
            var original = chain.Select(x => (x.Id, x.Date, x.VoteCount)).ToArray();
            await AcceptanceRecompute(app, AcceptanceMonday, AcceptanceMonday.AddDays(7), AcceptanceMonday.AddDays(14), AcceptanceMonday.AddDays(21));
            var move = await client.PostAsJsonAsync($"/api/schedule/move?{AcceptanceReference}", new { weekOffset = 0, fromIndex = 6, toIndex = 0, targetWeekOffset = 1, recipeId = recipe.Id, intent = "tomorrow" });
            move.EnsureSuccessStatusCode();
            var result = JsonDocument.Parse(await move.Content.ReadAsStringAsync()).RootElement.GetProperty("data");
            Assert.True(result.GetProperty("refreshComplete").GetBoolean());
            Assert.Equal(4, result.GetProperty("affectedWeekStartDates").GetArrayLength());
            db.ChangeTracker.Clear();
            foreach (var before in original) {
                var after = await db.CalendarEvents.SingleAsync(x => x.Id == before.Id);
                Assert.Equal(before.Date.AddDays(1), after.Date); Assert.Equal(before.VoteCount, after.VoteCount);
                Assert.Equal(4, (await db.SupperServings.SingleAsync(x => x.Date == after.Date)).InheritedServings);
            }
            Assert.Equal(originalCounts, await db.SupperServings.Where(x => x.OverrideServings != null).OrderBy(x => x.Date).Select(x => new { x.Date, x.OverrideServings }).ToArrayAsync());
            Assert.Equal(lunch.Date, (await db.CalendarEvents.SingleAsync(x => x.Id == lunch.Id)).Date);
            Assert.Equal(legacySkipped.Date, (await db.CalendarEvents.SingleAsync(x => x.Id == legacySkipped.Id)).Date);
            Assert.Equal(17, await db.CalendarEvents.CountAsync());
            var expected = new[] { 0d, 3000d, 2600d, 900d }; // Other-meal and legacy Skipped occurrences each retain original 200 g.
            for (var offset = 0; offset < expected.Length; offset++) {
                var current = await AcceptanceSchedule(client, offset);
                Assert.Equal(expected[offset], AcceptancePasta(current)); Assert.Equal("current", current.GetProperty("groceryRefresh").GetProperty("status").GetString());
            }
            Assert.Equal(2, (await db.Recipes.SingleAsync()).Servings);
        });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_MovementAcceptance_FullNextWeekSpillsToActualDateOverrideOrDefault() {
        foreach (var targetCount in new int?[] { 8, null })
            await WithMovementAcceptance(async (app, db, client) => {
                var recipe = AcceptanceRecipe("Spillover"); db.Recipes.Add(recipe); db.FamilySettings.Add(AcceptanceDefault());
                db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id });
                for (var i = 0; i < 7; i++) db.CalendarEvents.Add(new CalendarEvent { Date = AcceptanceMonday.AddDays(7 + i), Status = CalendarEventStatus.Skipped });
                var destination = AcceptanceMonday.AddDays(14);
                db.SupperServings.Add(new SupperServing { Date = Wednesday, OverrideServings = 6 });
                if (targetCount is { } count) db.SupperServings.Add(new SupperServing { Date = destination, OverrideServings = count });
                await db.SaveChangesAsync(); await AcceptanceRecompute(app, AcceptanceMonday);
                var response = await client.PostAsJsonAsync($"/api/schedule/defer?{AcceptanceReference}", new { sourceDate = Wednesday.ToString("yyyy-MM-dd"), recipeId = recipe.Id }); response.EnsureSuccessStatusCode();
                var result = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("data");
                Assert.Equal("2026-10-26", result.GetProperty("scheduledDate").GetString()); Assert.Equal(2, result.GetProperty("scheduledWeekOffset").GetInt32());
                db.ChangeTracker.Clear(); Assert.Equal(destination, (await db.CalendarEvents.SingleAsync(x => x.RecipeId == recipe.Id)).Date);
                Assert.Equal(6, (await db.SupperServings.SingleAsync(x => x.Date == Wednesday)).OverrideServings);
                var row = await db.SupperServings.SingleAsync(x => x.Date == destination); Assert.Equal(targetCount, row.OverrideServings); Assert.Equal(4, row.InheritedServings);
                Assert.Equal(0, AcceptancePasta(await AcceptanceSchedule(client))); Assert.Equal((targetCount ?? 4) * 100, AcceptancePasta(await AcceptanceSchedule(client, 2)));
                Assert.Equal(7, await db.CalendarEvents.CountAsync(x => x.Status == CalendarEventStatus.Skipped));
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SupperServings_MovementAcceptance_OccupiedSwapUsesBothDestinationCounts() =>
        WithMovementAcceptance(async (app, db, client) => {
            var first = AcceptanceRecipe("First"); var second = AcceptanceRecipe("Second", 100); db.Recipes.AddRange(first, second);
            db.CalendarEvents.AddRange(new CalendarEvent { Date = Wednesday, RecipeId = first.Id, VoteCount = 3 }, new CalendarEvent { Date = Wednesday.AddDays(1), RecipeId = second.Id, VoteCount = 5 });
            db.SupperServings.AddRange(new SupperServing { Date = Wednesday, OverrideServings = 4 }, new SupperServing { Date = Wednesday.AddDays(1), OverrideServings = 6 });
            await db.SaveChangesAsync(); await AcceptanceRecompute(app, AcceptanceMonday); Assert.Equal(700, AcceptancePasta(await AcceptanceSchedule(client)));
            (await client.PostAsJsonAsync($"/api/schedule/move?{AcceptanceReference}", new { weekOffset = 0, recipeId = first.Id, fromIndex = 2, toIndex = 3, intent = "swap" })).EnsureSuccessStatusCode();
            db.ChangeTracker.Clear();
            var left = await db.CalendarEvents.SingleAsync(x => x.Date == Wednesday); var right = await db.CalendarEvents.SingleAsync(x => x.Date == Wednesday.AddDays(1));
            Assert.Equal(second.Id, left.RecipeId); Assert.Equal(5, left.VoteCount); Assert.Equal(first.Id, right.RecipeId); Assert.Equal(3, right.VoteCount);
            Assert.Equal(new[] { 4, 6 }, await db.SupperServings.OrderBy(x => x.Date).Select(x => x.OverrideServings!.Value).ToArrayAsync());
            Assert.Equal(800, AcceptancePasta(await AcceptanceSchedule(client)));
            foreach (var (entry, amount) in new[] { (left, 200d), (right, 600d) }) {
                var projection = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{entry.RecipeId}/ingredient-projection?supperDate={entry.Date:yyyy-MM-dd}&context=assigned&occurrenceId={entry.Id}"));
                Assert.Equal(amount, projection.RootElement.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
            }
        });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SupperServings_MovementAcceptance_MoveFourToSixUnchecksKnownIncreaseWithoutCountEdit() =>
        WithMovementAcceptance(async (app, db, client) => {
            var recipe = AcceptanceRecipe("Move larger"); db.Recipes.Add(recipe); db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id });
            db.SupperServings.AddRange(new SupperServing { Date = Wednesday, OverrideServings = 4 }, new SupperServing { Date = Wednesday.AddDays(1), OverrideServings = 6 });
            await db.SaveChangesAsync(); await AcceptanceRecompute(app, AcceptanceMonday);
            var plan = await db.WeeklyPlans.SingleAsync(); plan.GroceryState = "{\"pasta\":true,\"unrelated\":true}"; await db.SaveChangesAsync();
            Assert.Equal(400, AcceptancePasta(await AcceptanceSchedule(client)));
            (await client.PostAsJsonAsync($"/api/schedule/move?{AcceptanceReference}", new { weekOffset = 0, recipeId = recipe.Id, fromIndex = 2, toIndex = 3, intent = "tomorrow" })).EnsureSuccessStatusCode();
            var current = await AcceptanceSchedule(client); Assert.Equal(600, AcceptancePasta(current)); Assert.False(current.GetProperty("groceryState").GetProperty("pasta").GetBoolean()); Assert.True(current.GetProperty("groceryState").GetProperty("unrelated").GetBoolean());
            db.ChangeTracker.Clear(); Assert.Equal(new[] { 4, 6 }, await db.SupperServings.OrderBy(x => x.Date).Select(x => x.OverrideServings!.Value).ToArrayAsync());
            await AcceptanceCheck(client); await AcceptanceRecompute(app, AcceptanceMonday); Assert.True((await AcceptanceSchedule(client)).GetProperty("groceryState").GetProperty("pasta").GetBoolean());
        });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SupperServings_MovementAcceptance_NewAssignmentAddsSeparateScaledOccurrenceAndUnchecks() =>
        WithMovementAcceptance(async (app, db, client) => {
            var recipe = AcceptanceRecipe("Assigned twice"); db.Recipes.Add(recipe); db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id });
            db.SupperServings.AddRange(new SupperServing { Date = Wednesday, OverrideServings = 4 }, new SupperServing { Date = Wednesday.AddDays(2), OverrideServings = 6 });
            await db.SaveChangesAsync(); await AcceptanceRecompute(app, AcceptanceMonday);
            var plan = await db.WeeklyPlans.SingleAsync(); plan.GroceryState = "{\"pasta\":true,\"unrelated\":true}"; await db.SaveChangesAsync();
            Assert.Equal(400, AcceptancePasta(await AcceptanceSchedule(client)));
            (await client.PostAsJsonAsync($"/api/schedule/assign?{AcceptanceReference}", new { weekOffset = 0, dayIndex = 4, recipeId = recipe.Id, requireEmpty = true })).EnsureSuccessStatusCode();
            var current = await AcceptanceSchedule(client); Assert.Equal(1000, AcceptancePasta(current)); Assert.False(current.GetProperty("groceryState").GetProperty("pasta").GetBoolean()); Assert.True(current.GetProperty("groceryState").GetProperty("unrelated").GetBoolean());
            db.ChangeTracker.Clear(); Assert.Equal(2, await db.CalendarEvents.CountAsync(x => x.RecipeId == recipe.Id)); Assert.Equal(new[] { 4, 6 }, await db.SupperServings.OrderBy(x => x.Date).Select(x => x.OverrideServings!.Value).ToArrayAsync());
            await AcceptanceRecompute(app, AcceptanceMonday); Assert.Equal(1000, AcceptancePasta(await AcceptanceSchedule(client)));
        });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SupperServings_MovementAcceptance_ConcurrentCountBatchesHaveOneWinnerWithoutPartialDefault() =>
        WithMovementAcceptance(async (app, db, client) => {
            var recipe = AcceptanceRecipe("Batch race"); db.Recipes.Add(recipe); db.CalendarEvents.AddRange(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id }, new CalendarEvent { Date = Wednesday.AddDays(2), RecipeId = recipe.Id });
            await db.SaveChangesAsync(); await AcceptanceRecompute(app, AcceptanceMonday); var before = await Read(client);
            using var other = app.CreateAuthenticatedClient();
            var responses = await Task.WhenAll(Put(client, before, 4, new[] { new { date = "2026-10-14", servings = 6 }, new { date = "2026-10-16", servings = 3 } }),
                Put(other, before, 5, new[] { new { date = "2026-10-14", servings = 8 }, new { date = "2026-10-16", servings = 7 } })).WaitAsync(TimeSpan.FromSeconds(15));
            Assert.Single(responses, x => x.StatusCode == HttpStatusCode.OK); Assert.Single(responses, x => x.StatusCode == HttpStatusCode.Conflict);
            var firstWon = responses[0].StatusCode == HttpStatusCode.OK; var current = await Read(client);
            Assert.Equal(firstWon ? 4 : 5, current.GetProperty("defaultServings").GetInt32());
            db.ChangeTracker.Clear(); Assert.Equal(firstWon ? new[] { 6, 3 } : new[] { 8, 7 }, await db.SupperServings.OrderBy(x => x.Date).Select(x => x.OverrideServings!.Value).ToArrayAsync());
            var plan = await db.WeeklyPlans.SingleAsync(); var task = await db.WorkflowTasks.SingleAsync(x => x.ProcessorName == "RefreshSupperGroceries"); Assert.Equal(plan.ServingRefreshWorkflowId, task.InstanceId);
            using var worker = app.Services.CreateScope(); await worker.ServiceProvider.GetServices<IWorkflowProcessor>().Single(x => x.ProcessorName == "RefreshSupperGroceries").ExecuteAsync(task, default);
            var after = await AcceptanceSchedule(client); Assert.Equal(firstWon ? 900 : 1500, AcceptancePasta(after)); Assert.Equal("current", after.GetProperty("groceryRefresh").GetProperty("status").GetString());
        });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_MovementAcceptance_ScaledIncreaseOrdersActualCheckBeforeAndAfterAndPreservesExtra() {
        foreach (var checkAfter in new[] { false, true }) {
            var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously); var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var checkEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously); var armed = false; var publications = 0;
            var publisher = new Mock<IScheduleEventPublisher>();
            publisher.Setup(x => x.PublishGroceryUpdatedAsync(It.IsAny<int>(), It.IsAny<Dictionary<string, bool>>(), It.IsAny<DateOnly>(), It.IsAny<string?>()))
                .Returns(async () => { if (armed && Interlocked.Increment(ref publications) == 1) { entered.TrySetResult(); await release.Task.WaitAsync(TimeSpan.FromSeconds(15)); } });
            await WithMovementAcceptance(async (app, db, client) => {
                var recipe = AcceptanceRecipe("Ordered checks"); db.Recipes.Add(recipe); db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id });
                db.SupperServings.Add(new SupperServing { Date = Wednesday, OverrideServings = 4 }); await db.SaveChangesAsync(); await AcceptanceRecompute(app, AcceptanceMonday);
                var plan = await db.WeeklyPlans.SingleAsync(); plan.GroceryState = "{\"pasta\":true,\"unrelated\":true}";
                var extraId = Guid.NewGuid(); var extra = GroceryExtraOccurrence.Create(extraId, extraId, AcceptanceMonday, "Coffee", "coffee", "Grocery", DateTimeOffset.Parse("2026-10-12T12:00:00Z")); extra.Checked = true; db.GroceryExtraOccurrences.Add(extra); await db.SaveChangesAsync();
                (await Put(client, await Read(client), null, new[] { new { date = "2026-10-14", servings = 6 } }, false)).EnsureSuccessStatusCode();
                armed = true;
                Task first = checkAfter ? AcceptanceRecompute(app, AcceptanceMonday) : AcceptanceCheck(client);
                await entered.Task.WaitAsync(TimeSpan.FromSeconds(15));
                Task later = checkAfter ? AcceptanceCheck(client) : AcceptanceRecompute(app, AcceptanceMonday);
                if (checkAfter) await checkEntered.Task.WaitAsync(TimeSpan.FromSeconds(15));
                Assert.False(later.IsCompleted);
                var during = await AcceptanceSchedule(client); Assert.Equal(checkAfter ? 600 : 400, AcceptancePasta(during)); Assert.Equal(!checkAfter, during.GetProperty("groceryState").GetProperty("pasta").GetBoolean());
                release.TrySetResult(); await Task.WhenAll(first, later).WaitAsync(TimeSpan.FromSeconds(15));
                var after = await AcceptanceSchedule(client); Assert.Equal(600, AcceptancePasta(after)); Assert.Equal(checkAfter, after.GetProperty("groceryState").GetProperty("pasta").GetBoolean()); Assert.True(after.GetProperty("groceryState").GetProperty("unrelated").GetBoolean());
                await AcceptanceCheck(client); await AcceptanceRecompute(app, AcceptanceMonday);
                Assert.True((await AcceptanceSchedule(client)).GetProperty("groceryState").GetProperty("pasta").GetBoolean());
                db.ChangeTracker.Clear(); var retained = await db.GroceryExtraOccurrences.SingleAsync(); Assert.Equal(extraId, retained.Id); Assert.Equal("Coffee", retained.Name); Assert.True(retained.Checked); Assert.Equal(1, retained.Version);
            }, services: s => s.AddSingleton(publisher.Object), application: app => app.Use(async (context, next) => {
                if (armed && context.Request.Path.Value?.EndsWith("/grocery/item", StringComparison.Ordinal) == true) checkEntered.TrySetResult(); await next(context);
            }));
        }
    }
}
