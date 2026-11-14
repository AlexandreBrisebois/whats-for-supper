using System.Data.Common;
using Moq;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Workflow;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public partial class SupperServingsPostgresTests(ITestOutputHelper output)
{
    private const string Url = "/api/schedule/servings?weekOffset=0&referenceWeekStartDate=2026-10-12";
    private static readonly DateOnly Wednesday = new(2026, 10, 14);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_SaveAcknowledgesBeforeRefresh_ThenRestartedWorkPersists600gAndUnchecksOnlyPasta()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            Guid recipeId;
            Guid jobId;
            await using (var factory = await TomorrowPushPostgresTests.CreateFactory(settings)) {
                using var scope = factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = new Recipe { Name = "Pasta", Servings = 2, Ingredients = "[\"200 g pasta\"]", RawMetadata = "{\"recipeIngredient\":[\"200 g pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"}]}" };
                recipeId = recipe.Id;
                db.Recipes.Add(recipe);
                var unrelated = new Recipe { Name = "Unrelated lunch", Ingredients = "[\"1 g salt\"]", RawMetadata = "{\"recipeIngredient\":[\"1 g salt\"],\"supply\":[{\"name\":\"salt\",\"quantity\":1,\"unitText\":\"g\"}]}" };
                db.Recipes.Add(unrelated); db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, MealSlot = 1, RecipeId = unrelated.Id });
                db.FamilySettings.Add(new() { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 2 }) });
                db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id, Status = CalendarEventStatus.Planned, VoteCount = 7 });
                await db.SaveChangesAsync();
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12), default);
                using var client = factory.CreateAuthenticatedClient();
                await GroceryTestRows.CheckAsync(client, new(2026,10,12));
                await GroceryTestRows.CheckAsync(client, new(2026,10,12), "salt");
                var baseline = await Read(client);
                Assert.Equal(2, baseline.GetProperty("defaultServings").GetInt32());
                Assert.Equal("explicit", baseline.GetProperty("defaultServingsSource").GetString());
                var events = new MemoryStream();
                var context = new Microsoft.AspNetCore.Http.DefaultHttpContext();
                context.Response.Body = events;
                factory.Services.GetRequiredService<RecipeApi.Infrastructure.SseConnectionManager>().AddConnection(context.Response);
                var response = await client.PutAsJsonAsync("/api/schedule/servings", new { referenceWeekStartDate = "2026-10-12", weekOffset = 0, expectedVersion = baseline.GetProperty("version").GetString(), days = new[] { new { date = "2026-10-14", servings = 6 } } });
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                var saved = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("data");
                Assert.Equal(6, saved.GetProperty("days")[2].GetProperty("servings").GetInt32());
                Assert.Equal("updating", saved.GetProperty("groceryRefresh").GetProperty("status").GetString());
                Assert.Contains("event: week_updated", System.Text.Encoding.UTF8.GetString(events.ToArray()));
                jobId = saved.GetProperty("groceryRefresh").GetProperty("workflowId").GetGuid();
                db.ChangeTracker.Clear();
                var job = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == jobId);
                Assert.Single(job.Tasks, x => x.ProcessorName == "RefreshSupperGroceries");
                var beforeWorker = await db.WeeklyPlans.SingleAsync();
                Assert.Contains("200", beforeWorker.GroceryItems);
                Assert.True(GroceryTestRows.Checked(beforeWorker,"pasta"));
                output.WriteLine("Portions acknowledged and durable pending work exists while groceries remain at 200 g; host stops before execution.");
            }
            // A new application scope/host resumes the committed task rather than replaying PUT.
            await using var resumed = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var resumedScope = resumed.Services.CreateScope();
            var stored = resumedScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var task = await stored.WorkflowTasks.SingleAsync(x => x.InstanceId == jobId);
            var processor = resumedScope.ServiceProvider.GetServices<IWorkflowProcessor>().Single(x => x.ProcessorName == "RefreshSupperGroceries");
            await processor.ExecuteAsync(task, default);
            using var reader = resumed.CreateAuthenticatedClient();
            var current = await Read(reader);
            Assert.Equal("current", current.GetProperty("groceryRefresh").GetProperty("status").GetString());
            using var schedule = JsonDocument.Parse(await reader.GetStringAsync("/api/schedule?referenceWeekStartDate=2026-10-12"));
            var groceries = schedule.RootElement.GetProperty("data");
            Assert.Equal(600, groceries.GetProperty("groceryItems")[0].GetProperty("quantity").ExactScalar());
            Assert.False(GroceryTestRows.Checked(groceries,"pasta"));
            Assert.True(GroceryTestRows.Checked(groceries,"salt"));
            Assert.NotEqual(JsonValueKind.Null, current.GetProperty("groceryRefresh").GetProperty("resetSummaryVersion").ValueKind);
            stored.ChangeTracker.Clear();
            var original = await stored.Recipes.SingleAsync(x => x.Id == recipeId);
            Assert.Equal(2, original.Servings); Assert.Equal("[\"200 g pasta\"]", original.Ingredients);
            var occurrence = await stored.CalendarEvents.SingleAsync(x=>x.MealSlot==0);
            Assert.Equal(Wednesday, occurrence.Date); Assert.Equal(7, occurrence.VoteCount);
            // A later shopper check must survive an unchanged retry of the task.
            await GroceryTestRows.CheckAsync(reader,new(2026,10,12));
            await processor.ExecuteAsync(task, default);
            stored.ChangeTracker.Clear();
            Assert.True(GroceryTestRows.Checked(await stored.WeeklyPlans.SingleAsync(),"pasta"));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_PublicationFailureDoesNotFailCommittedSave()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            using var client = factory.CreateAuthenticatedClient();
            var baseline = await Read(client);
            var publisher = new Moq.Mock<RecipeApi.Infrastructure.IScheduleEventPublisher>();
            publisher.Setup(p => p.PublishWeekUpdatedAsync(Moq.It.IsAny<RecipeApi.Dto.ScheduleDays>(), null, null)).ThrowsAsync(new IOException("Publication unavailable"));
            var controller = new RecipeApi.Controllers.SupperServingsController(
                scope.ServiceProvider.GetRequiredService<SupperServingsService>(),
                scope.ServiceProvider.GetRequiredService<ScheduleService>(), publisher.Object,
                Microsoft.Extensions.Logging.Abstractions.NullLogger<RecipeApi.Controllers.SupperServingsController>.Instance);
            controller.ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext {HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext()};
            var result = await controller.Save(new RecipeApi.Dto.SupperServingsSaveDto(new(2026,10,12),0,baseline.GetProperty("version").GetString()!,
                [new(Wednesday,JsonSerializer.SerializeToElement(6))],default));
            Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.ChangeTracker.Clear();
            Assert.Equal(6,(await db.SupperServings.SingleAsync()).OverrideServings);
            Assert.Single(await db.WorkflowInstances.ToListAsync());
            Assert.Equal("updating",(await db.WeeklyPlans.SingleAsync()).ServingRefreshStatus);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_EmptyReadIsReadOnly_AndReservedSettingCannotBypassTypedSave()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var client = factory.CreateAuthenticatedClient();
            var state = await Read(client);
            Assert.Equal(7, state.GetProperty("days").GetArrayLength());
            Assert.True(!state.TryGetProperty("affectedWeekStartDates", out var affected) || affected.ValueKind == JsonValueKind.Array, "Optional affected weeks must be absent or a schema-valid array, never null.");
            Assert.Equal("family", state.GetProperty("defaultServingsSource").GetString());
            Assert.All(state.GetProperty("days").EnumerateArray(), d => Assert.Equal(1, d.GetProperty("servings").GetInt32()));
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/settings/supper_servings_default", new { value = 6 })).StatusCode);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            Assert.Empty(await db.CalendarEvents.ToListAsync()); Assert.Empty(await db.FamilySettings.ToListAsync()); Assert.Empty(await db.WeeklyPlans.ToListAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_OldWorkerFailureCannotOverwriteNewerPendingRefresh()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var race = new BeforeFailureStateRead();
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(),
                new() { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString },
                configureServices: services => services.AddDbContext<RecipeDbContext>(options => options.AddInterceptors(race)));
            // Different counts need a real supper contribution to create distinct derived inputs.
            // Empty-week count edits deliberately share the same effective grocery identity.
            using (var setup = factory.Services.CreateScope()) {
                var seeded = setup.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = CorrectionRecipe(); seeded.Recipes.Add(recipe);
                seeded.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id });
                await seeded.SaveChangesAsync();
                await setup.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            }
            using var client = factory.CreateAuthenticatedClient();
            async Task Save(int count) {
                var before = await Read(client);
                (await client.PutAsJsonAsync("/api/schedule/servings", new { referenceWeekStartDate = "2026-10-12", weekOffset = 0, expectedVersion = before.GetProperty("version").GetString(), days = new[] { new { date = "2026-10-14", servings = count } } })).EnsureSuccessStatusCode();
            }
            await Save(6);
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var old = await db.WorkflowTasks.SingleAsync();
            var oldInput = (await db.WeeklyPlans.AsNoTracking().SingleAsync()).ServingInputVersion;
            race.AfterRead = () => Save(8);
            var processor = scope.ServiceProvider.GetServices<IWorkflowProcessor>().Single(x => x.ProcessorName == "RefreshSupperGroceries");
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => processor.ExecuteAsync(old, new CancellationToken(true)));
            Assert.True(race.Ran);
            var current = await Read(client);
            Assert.Equal(8, current.GetProperty("days")[2].GetProperty("servings").GetInt32());
            Assert.Equal("updating", current.GetProperty("groceryRefresh").GetProperty("status").GetString());
            db.ChangeTracker.Clear(); var plan = await db.WeeklyPlans.SingleAsync();
            Assert.NotEqual(old.InstanceId, plan.ServingRefreshWorkflowId);
            Assert.NotEqual(oldInput, plan.ServingInputVersion);
            Assert.Equal(2, await db.WorkflowTasks.CountAsync());
            var newer = await db.WorkflowTasks.SingleAsync(x => x.InstanceId == plan.ServingRefreshWorkflowId);
            await processor.ExecuteAsync(newer, default);
            db.ChangeTracker.Clear(); plan = await db.WeeklyPlans.SingleAsync();
            Assert.Equal("current", plan.ServingRefreshStatus); Assert.Contains("800",plan.GroceryItems);
            Assert.Equal(plan.ServingInputVersion, plan.ServingAppliedVersion);

        });
    }

    private sealed class BeforeFailureStateRead : DbCommandInterceptor
    {
        public Func<Task>? AfterRead { get; set; }
        public bool Ran { get; private set; }
        public override async ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(DbCommand command, CommandEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (!Ran && AfterRead is not null && command.CommandText.Contains("SET serving_refresh_status", StringComparison.Ordinal)) { Ran = true; await AfterRead(); }
            return result;
        }
        public override async ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand command, CommandExecutedEventData eventData, DbDataReader result, CancellationToken cancellationToken = default)
        {
            if (!Ran && AfterRead is not null && command.CommandText.Contains("FROM weekly_plans", StringComparison.Ordinal)) { Ran = true; await AfterRead(); }
            return result;
        }
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_OmittedDefaultPreservesUsual_ExplicitNullSelectsFamily()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using (var scope = factory.Services.CreateScope()) {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                db.FamilySettings.Add(new FamilySetting { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 4, version = Guid.NewGuid() }), UpdatedAt = DateTimeOffset.UtcNow });
                await db.SaveChangesAsync();
            }
            using var client = factory.CreateAuthenticatedClient();
            var before = await Read(client);
            (await client.PutAsJsonAsync("/api/schedule/servings", new { referenceWeekStartDate = "2026-10-12", weekOffset = 0, expectedVersion = before.GetProperty("version").GetString(), days = new[] { new { date = "2026-10-14", servings = 6 } } })).EnsureSuccessStatusCode();
            var after = await Read(client); Assert.Equal(4, after.GetProperty("defaultServings").GetInt32());
            (await client.PutAsJsonAsync("/api/schedule/servings", new { referenceWeekStartDate = "2026-10-12", weekOffset = 0, expectedVersion = after.GetProperty("version").GetString(), defaultServings = (int?)null, days = Array.Empty<object>() })).EnsureSuccessStatusCode();
            var automatic = await Read(client); Assert.Equal(1, automatic.GetProperty("defaultServings").GetInt32()); Assert.Equal("family", automatic.GetProperty("defaultServingsSource").GetString());
        });
    }

    private static async Task<JsonElement> Read(HttpClient client)
    {
        var response = await client.GetAsync(Url); Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("data").Clone();
    }
}
