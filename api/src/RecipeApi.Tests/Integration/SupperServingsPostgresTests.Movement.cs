using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;
using RecipeApi.Tests.Infrastructure;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Workflow;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class SupperServingsPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Movement_SwapUsesDestinationCountsAndRetainsDateRows()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = CorrectionRecipe(); db.Recipes.Add(recipe);
            db.CalendarEvents.Add(new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id,VoteCount=7});
            db.SupperServings.AddRange(new SupperServing {Date=Wednesday,OverrideServings=6},new SupperServing {Date=Wednesday.AddDays(1),OverrideServings=4});
            await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            using var client=factory.CreateAuthenticatedClient();
            var response=await client.PostAsJsonAsync("/api/schedule/move?referenceWeekStartDate=2026-10-12",new {weekOffset=0,recipeId=recipe.Id,fromIndex=2,toIndex=3,intent="swap"}); response.EnsureSuccessStatusCode();
            db.ChangeTracker.Clear();
            var occurrence=await db.CalendarEvents.SingleAsync();Assert.Equal(Wednesday.AddDays(1),occurrence.Date);Assert.Equal(7,occurrence.VoteCount);
            Assert.Equal(new[]{6,4},await db.SupperServings.OrderBy(x=>x.Date).Select(x=>x.OverrideServings!.Value).ToArrayAsync());
            var plan=await db.WeeklyPlans.SingleAsync();
            Assert.Equal(400,JsonDocument.Parse(plan.GroceryItems!).RootElement[0].GetProperty("quantity").ExactScalar());
            Assert.Single(await db.WorkflowTasks.Where(x=>x.ProcessorName=="RefreshSupperGroceries").ToListAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Movement_TomorrowFailureRetainsDurableWorkAndDestinationSnapshot()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe=CorrectionRecipe();db.Recipes.Add(recipe);
            db.CalendarEvents.Add(new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id,VoteCount=7});
            db.FamilySettings.Add(new FamilySetting {Key=SupperServingsService.DefaultKey,Value=JsonSerializer.SerializeToElement(new {servings=4})});
            db.SupperServings.Add(new SupperServing {Date=Wednesday,OverrideServings=6}); await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            await db.Database.ExecuteSqlRawAsync("CREATE FUNCTION fail_serving_movement_grocery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected grocery failure'; END $$; CREATE TRIGGER fail_serving_movement_grocery BEFORE UPDATE OF grocery_items ON weekly_plans FOR EACH ROW EXECUTE FUNCTION fail_serving_movement_grocery()");
            using var client=factory.CreateAuthenticatedClient();
            var response=await client.PostAsJsonAsync("/api/schedule/move?referenceWeekStartDate=2026-10-12",new {weekOffset=0,recipeId=recipe.Id,fromIndex=2,toIndex=3,intent="tomorrow"});response.EnsureSuccessStatusCode();
            var result=JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("data");Assert.True(result.GetProperty("moved").GetBoolean());Assert.False(result.GetProperty("refreshComplete").GetBoolean());
            db.ChangeTracker.Clear();Assert.Equal(Wednesday.AddDays(1),(await db.CalendarEvents.SingleAsync()).Date);
            Assert.Equal(6,(await db.SupperServings.SingleAsync(x=>x.Date==Wednesday)).OverrideServings);
            Assert.Equal(4,(await db.SupperServings.SingleAsync(x=>x.Date==Wednesday.AddDays(1))).InheritedServings);
            var plan=await db.WeeklyPlans.SingleAsync();Assert.Equal("failed",plan.ServingRefreshStatus);Assert.NotEqual(plan.ServingAppliedVersion,plan.ServingInputVersion);
            Assert.Contains("600",plan.GroceryItems);Assert.Single(await db.WorkflowTasks.Where(x=>x.ProcessorName=="RefreshSupperGroceries").ToListAsync());
            await db.Database.ExecuteSqlRawAsync("DROP TRIGGER fail_serving_movement_grocery ON weekly_plans");
            var processor=scope.ServiceProvider.GetServices<IWorkflowProcessor>().Single(x=>x.ProcessorName=="RefreshSupperGroceries");await processor.ExecuteAsync(await db.WorkflowTasks.SingleAsync(),default);
            db.ChangeTracker.Clear();plan=await db.WeeklyPlans.SingleAsync();Assert.Equal("current",plan.ServingRefreshStatus);Assert.Contains("400",plan.GroceryItems);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Movement_AssignmentEnqueueFailureRollsBackOccurrenceAndSnapshot()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory=await TomorrowPushPostgresTests.CreateFactory(settings);using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe=CorrectionRecipe();db.Recipes.Add(recipe);db.FamilySettings.Add(new FamilySetting {Key=SupperServingsService.DefaultKey,Value=JsonSerializer.SerializeToElement(new {servings=4})});await db.SaveChangesAsync();
            await db.Database.ExecuteSqlRawAsync("CREATE FUNCTION reject_movement_refresh() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test enqueue unavailable'; END $$; CREATE TRIGGER reject_movement_refresh BEFORE INSERT ON workflow_instances FOR EACH ROW EXECUTE FUNCTION reject_movement_refresh()");
            using var client=factory.CreateAuthenticatedClient();var response=await client.PostAsJsonAsync("/api/schedule/assign?referenceWeekStartDate=2026-10-12",new {weekOffset=0,dayIndex=2,recipeId=recipe.Id,requireEmpty=true});
            Assert.Equal(HttpStatusCode.InternalServerError,response.StatusCode);db.ChangeTracker.Clear();Assert.Empty(await db.CalendarEvents.ToListAsync());Assert.Empty(await db.SupperServings.ToListAsync());Assert.Empty(await db.WorkflowTasks.ToListAsync());
        });
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Movement_ReplacementSnapshotsDefaultAndUnchecksKnownIncrease()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory=await TomorrowPushPostgresTests.CreateFactory(settings);using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var original=CorrectionRecipe();original.Servings=4;var replacement=CorrectionRecipe();db.Recipes.AddRange(original,replacement);
            db.CalendarEvents.Add(new CalendarEvent {Date=Wednesday,RecipeId=original.Id});
            db.FamilySettings.Add(new FamilySetting {Key=SupperServingsService.DefaultKey,Value=JsonSerializer.SerializeToElement(new {servings=4})});await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            using (var shopper = factory.CreateAuthenticatedClient()) await GroceryTestRows.CheckAsync(shopper, new(2026,10,12));
            var plan=await db.WeeklyPlans.SingleAsync();
            using var client=factory.CreateAuthenticatedClient();(await client.PostAsJsonAsync("/api/schedule/assign?referenceWeekStartDate=2026-10-12",new {weekOffset=0,dayIndex=2,recipeId=replacement.Id})).EnsureSuccessStatusCode();
            db.ChangeTracker.Clear();Assert.Equal(replacement.Id,(await db.CalendarEvents.SingleAsync()).RecipeId);Assert.Equal(4,(await db.SupperServings.SingleAsync()).InheritedServings);
            plan=await db.WeeklyPlans.SingleAsync();Assert.Equal(400,JsonDocument.Parse(plan.GroceryItems!).RootElement[0].GetProperty("quantity").ExactScalar());
            Assert.False(GroceryTestRows.Checked(plan,"pasta"));
            Assert.Single(await db.WorkflowTasks.Where(x=>x.ProcessorName=="RefreshSupperGroceries").ToListAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Movement_DeferUsesDestinationOverrideAndMaterialisesSnapshot()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory=await TomorrowPushPostgresTests.CreateFactory(settings);using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe=CorrectionRecipe();db.Recipes.Add(recipe);db.CalendarEvents.Add(new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id});
            db.FamilySettings.Add(new FamilySetting {Key=SupperServingsService.DefaultKey,Value=JsonSerializer.SerializeToElement(new {servings=4})});
            db.SupperServings.AddRange(new SupperServing {Date=Wednesday,OverrideServings=6},new SupperServing {Date=new(2026,10,19),OverrideServings=5});await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            using var client=factory.CreateAuthenticatedClient();(await client.PostAsJsonAsync("/api/schedule/defer?referenceWeekStartDate=2026-10-12",new {sourceDate="2026-10-14",recipeId=recipe.Id})).EnsureSuccessStatusCode();
            db.ChangeTracker.Clear();Assert.Equal(new DateOnly(2026,10,19),(await db.CalendarEvents.SingleAsync()).Date);
            Assert.Equal(6,(await db.SupperServings.SingleAsync(x=>x.Date==Wednesday)).OverrideServings);var destination=await db.SupperServings.SingleAsync(x=>x.Date==new DateOnly(2026,10,19));Assert.Equal(5,destination.OverrideServings);Assert.Equal(4,destination.InheritedServings);
            var plan=await db.WeeklyPlans.SingleAsync(x=>x.WeekStartDate==new DateOnly(2026,10,19));Assert.Equal(500,JsonDocument.Parse(plan.GroceryItems!).RootElement[0].GetProperty("quantity").ExactScalar());
            Assert.Equal(2,await db.WorkflowTasks.CountAsync(x=>x.ProcessorName=="RefreshSupperGroceries"));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Movement_RemovalRetainsDateIntentAndCheckedDecrease()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory=await TomorrowPushPostgresTests.CreateFactory(settings);using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe=CorrectionRecipe();db.Recipes.Add(recipe);db.CalendarEvents.AddRange(new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id},new CalendarEvent {Date=Wednesday.AddDays(2),RecipeId=recipe.Id});
            db.SupperServings.AddRange(new SupperServing {Date=Wednesday,OverrideServings=6},new SupperServing {Date=Wednesday.AddDays(2),OverrideServings=4});await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            var plan=await db.WeeklyPlans.SingleAsync();Assert.Equal(1000,JsonDocument.Parse(plan.GroceryItems!).RootElement[0].GetProperty("quantity").ExactScalar());using (var shopper = factory.CreateAuthenticatedClient()) await GroceryTestRows.CheckAsync(shopper, new(2026,10,12));
            using var client=factory.CreateAuthenticatedClient();(await client.DeleteAsync("/api/schedule/day/2026-10-14/remove")).EnsureSuccessStatusCode();
            db.ChangeTracker.Clear();Assert.Equal(2,await db.SupperServings.CountAsync());Assert.Equal(Wednesday.AddDays(2),(await db.CalendarEvents.SingleAsync()).Date);
            plan=await db.WeeklyPlans.SingleAsync();Assert.Equal(400,JsonDocument.Parse(plan.GroceryItems!).RootElement[0].GetProperty("quantity").ExactScalar());Assert.True(GroceryTestRows.Checked(plan,"pasta"));
            Assert.Single(await db.WorkflowTasks.Where(x=>x.ProcessorName=="RefreshSupperGroceries").ToListAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Movement_DelayedInlineFailureCannotFailNewJobForSameEffectiveInputs()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var race=new BeforeInlineFailureMark();
            await using var factory=await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(),
                new() {["Calendar:TimeZone"]="America/Toronto",["Tests:PostgresConnectionString"]=settings.ConnectionString},
                configureServices: services=>services.AddDbContext<RecipeDbContext>(options=>options.AddInterceptors(race)));
            using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe=CorrectionRecipe();db.Recipes.Add(recipe);db.CalendarEvents.Add(new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id});
            db.SupperServings.AddRange(new SupperServing {Date=Wednesday,OverrideServings=6},new SupperServing {Date=Wednesday.AddDays(1),OverrideServings=4});await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            await db.Database.ExecuteSqlRawAsync("CREATE FUNCTION fail_inline_race_grocery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected grocery failure'; END $$; CREATE TRIGGER fail_inline_race_grocery BEFORE UPDATE OF grocery_items ON weekly_plans FOR EACH ROW EXECUTE FUNCTION fail_inline_race_grocery()");
            using var client=factory.CreateAuthenticatedClient();Guid? latestJob=null;
            race.BeforeMark=async()=> {
                foreach(var count in new[]{5,4}) {
                    var before=await Read(client);
                    var reply=await client.PutAsJsonAsync("/api/schedule/servings",new {referenceWeekStartDate="2026-10-12",weekOffset=0,expectedVersion=before.GetProperty("version").GetString(),days=new[]{new {date="2026-10-15",servings=count}}});reply.EnsureSuccessStatusCode();
                    latestJob=JsonDocument.Parse(await reply.Content.ReadAsStringAsync()).RootElement.GetProperty("data").GetProperty("groceryRefresh").GetProperty("workflowId").GetGuid();
                }
            };
            (await client.PostAsJsonAsync("/api/schedule/move?referenceWeekStartDate=2026-10-12",new {weekOffset=0,recipeId=recipe.Id,fromIndex=2,toIndex=3,intent="tomorrow"})).EnsureSuccessStatusCode();
            Assert.True(race.Ran);var current=await Read(client);Assert.Equal(latestJob,current.GetProperty("groceryRefresh").GetProperty("workflowId").GetGuid());
            Assert.Equal("updating",current.GetProperty("groceryRefresh").GetProperty("status").GetString());
            db.ChangeTracker.Clear();Assert.Equal(3,await db.WorkflowTasks.CountAsync(x=>x.ProcessorName=="RefreshSupperGroceries"));
        });
    }


    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Movement_SecondaryFailureCannotEraseCommittedTomorrowReceipt()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var race=new BeforeInlineFailureMark();
            await using var factory=await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(),
                new() {["Calendar:TimeZone"]="America/Toronto",["Tests:PostgresConnectionString"]=settings.ConnectionString},
                configureServices: services=>services.AddDbContext<RecipeDbContext>(options=>options.AddInterceptors(race)));
            using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe=CorrectionRecipe();db.Recipes.Add(recipe);db.CalendarEvents.Add(new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id});
            db.SupperServings.AddRange(new SupperServing {Date=Wednesday,OverrideServings=6},new SupperServing {Date=Wednesday.AddDays(1),OverrideServings=4});await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            await db.Database.ExecuteSqlRawAsync("CREATE FUNCTION fail_secondary_grocery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected grocery failure'; END $$; CREATE TRIGGER fail_secondary_grocery BEFORE UPDATE OF grocery_items ON weekly_plans FOR EACH ROW EXECUTE FUNCTION fail_secondary_grocery()");
            race.BeforeMark=()=>throw new IOException("injected status persistence unavailable");
            using var client=factory.CreateAuthenticatedClient();var response=await client.PostAsJsonAsync("/api/schedule/move?referenceWeekStartDate=2026-10-12",new {weekOffset=0,recipeId=recipe.Id,fromIndex=2,toIndex=3,intent="tomorrow"});
            Assert.Equal(HttpStatusCode.OK,response.StatusCode);Assert.True(race.Ran);
            var result=JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("data");Assert.True(result.GetProperty("moved").GetBoolean());Assert.False(result.GetProperty("refreshComplete").GetBoolean());
            db.ChangeTracker.Clear();Assert.Equal(Wednesday.AddDays(1),(await db.CalendarEvents.SingleAsync()).Date);Assert.Single(await db.WorkflowTasks.Where(x=>x.ProcessorName=="RefreshSupperGroceries").ToListAsync());
            var plan=await db.WeeklyPlans.SingleAsync();Assert.NotEqual(plan.ServingAppliedVersion,plan.ServingInputVersion);Assert.Equal("updating",plan.ServingRefreshStatus);
        });
    }

    private sealed class BeforeInlineFailureMark : DbCommandInterceptor
    {
        public Func<Task>? BeforeMark {get;set;}
        public bool Ran {get;private set;}
        public override async ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(DbCommand command,CommandEventData eventData,InterceptionResult<int> result,CancellationToken cancellationToken=default)
        {
            if(!Ran&&BeforeMark is not null&&command.CommandText.Contains("SET serving_refresh_status",StringComparison.Ordinal)) {Ran=true;await BeforeMark();}
            return result;
        }
    }

}
