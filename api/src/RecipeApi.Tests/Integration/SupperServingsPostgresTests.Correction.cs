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
    public async Task SupperServings_CurrentCookedWithoutReceipt_AllowsCorrectionAndKeepsOccurrence()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var clock = new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = DateTimeOffset.Parse("2026-10-14T16:00:00Z") };
            await using var factory = await RecipeApi.Tests.Infrastructure.TestWebApplicationFactory.CreateWithAuthAsync(clock, new() {
                ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString,
            });
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = CorrectionRecipe();
            var occurrence = new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id, Status = CalendarEventStatus.Cooked };
            db.Recipes.Add(recipe); db.CalendarEvents.Add(occurrence);
            db.SupperServings.Add(new SupperServing { Date = Wednesday, OverrideServings = 5 });
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            var baseline = await Read(client);
            Assert.True(baseline.GetProperty("days")[2].GetProperty("editable").GetBoolean());
            Assert.Equal(5, baseline.GetProperty("days")[2].GetProperty("servings").GetInt32());
            var response = await client.PutAsJsonAsync("/api/schedule/servings", new { referenceWeekStartDate = "2026-10-12", weekOffset = 0, expectedVersion = baseline.GetProperty("version").GetString(), days = new[] { new { date = "2026-10-14", servings = 6 } } });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(6, (await Read(client)).GetProperty("days")[2].GetProperty("servings").GetInt32());
            db.ChangeTracker.Clear();
            var stored = await db.CalendarEvents.SingleAsync();
            Assert.Equal(occurrence.Id, stored.Id); Assert.Equal(recipe.Id, stored.RecipeId);
            Assert.Equal(CalendarEventStatus.Cooked, stored.Status); Assert.Null(stored.PreparedAtUtc);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_OrdinaryToday_RemainsEditable()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var clock = new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = DateTimeOffset.Parse("2026-10-14T16:00:00Z") };
            await using var factory = await RecipeApi.Tests.Infrastructure.TestWebApplicationFactory.CreateWithAuthAsync(clock, new() {
                ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString,
            });
            using var client = factory.CreateAuthenticatedClient();
            Assert.True((await Read(client)).GetProperty("days")[2].GetProperty("editable").GetBoolean());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Correction_EffectiveIdentityIgnoresOtherDatesAndInstructionMetadata()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = CorrectionRecipe(); db.Recipes.Add(recipe);
            db.FamilySettings.Add(new FamilySetting { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 4 }) });
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            async Task<JsonElement> Project() => JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{recipe.Id}/ingredient-projection?supperDate=2026-10-14&context=proposed")).RootElement.Clone();
            var before = await Project();
            db.SupperServings.Add(new SupperServing { Date = Wednesday.AddDays(3), OverrideServings = 9 });
            recipe.RawMetadata = recipe.RawMetadata!.Replace("\"supply\"", "\"recipeInstructions\":[\"Use 200 g\"],\"supply\"");
            await db.SaveChangesAsync();
            var after = await Project();
            Assert.NotEqual(before.GetProperty("servingVersion").GetString(), after.GetProperty("servingVersion").GetString());
            Assert.Equal(before.GetProperty("version").GetString(), after.GetProperty("version").GetString());
            recipe.Servings = 4; await db.SaveChangesAsync();
            var corrected = await Project();
            Assert.NotEqual(after.GetProperty("version").GetString(), corrected.GetProperty("version").GetString());
            Assert.Equal(200, corrected.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Correction_CommitsDurableFutureRefreshAndStaleTextBeforeWorker()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            Guid recipeId;
            await using (var factory = await TomorrowPushPostgresTests.CreateFactory(settings)) {
                using var scope = factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = CorrectionRecipe(); recipeId = recipe.Id; db.Recipes.Add(recipe);
                db.FamilySettings.Add(new FamilySetting {Key=SupperServingsService.DefaultKey,Value=JsonSerializer.SerializeToElement(new {servings=4})});
                db.CalendarEvents.AddRange(new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id},new CalendarEvent {Date=Wednesday.AddDays(7),RecipeId=recipe.Id},new CalendarEvent {Date=Wednesday.AddDays(-7),RecipeId=recipe.Id,Status=CalendarEventStatus.Cooked});
                await db.SaveChangesAsync();
                foreach(var week in new[]{new DateOnly(2026,10,5),new DateOnly(2026,10,12),new DateOnly(2026,10,19)}) await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(week,default);
                using var client = factory.CreateAuthenticatedClient();
                var events = new MemoryStream(); var context = new Microsoft.AspNetCore.Http.DefaultHttpContext();context.Response.Body=events;
                factory.Services.GetRequiredService<RecipeApi.Infrastructure.SseConnectionManager>().AddConnection(context.Response);
                var response=await client.PatchAsJsonAsync($"/api/recipes/{recipe.Id}",new {servings=1});
                Assert.Equal(HttpStatusCode.OK,response.StatusCode);
                db.ChangeTracker.Clear();
                Assert.Equal(1,(await db.Recipes.SingleAsync()).Servings);
                var plans=await db.WeeklyPlans.OrderBy(x=>x.WeekStartDate).ToListAsync();
                Assert.Equal("current",plans[0].ServingRefreshStatus);
                Assert.All(plans.Skip(1),plan=> {Assert.Equal("updating",plan.ServingRefreshStatus);Assert.NotEqual(plan.ServingAppliedVersion,plan.ServingInputVersion);Assert.Contains("400",plan.GroceryItems);});
                Assert.Equal(2,await db.WorkflowTasks.CountAsync(x=>x.ProcessorName=="RefreshSupperGroceries"));
                Assert.Contains("event: week_updated",System.Text.Encoding.UTF8.GetString(events.ToArray()));
            }
            // New host resumes committed obligations: no repeated recipe PATCH or count save.
            await using var resumed=await TomorrowPushPostgresTests.CreateFactory(settings);
            using var resumedScope=resumed.Services.CreateScope(); var stored=resumedScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var processor=resumedScope.ServiceProvider.GetServices<IWorkflowProcessor>().Single(x=>x.ProcessorName=="RefreshSupperGroceries");
            foreach(var task in await stored.WorkflowTasks.Where(x=>x.ProcessorName=="RefreshSupperGroceries").ToListAsync()) await processor.ExecuteAsync(task,default);
            stored.ChangeTracker.Clear();
            Assert.All(await stored.WeeklyPlans.Where(x=>x.WeekStartDate>=new DateOnly(2026,10,12)).ToListAsync(),p=>Assert.Contains("800",p.GroceryItems));
            using var reader=resumed.CreateAuthenticatedClient();
            var changed=await reader.PatchAsJsonAsync($"/api/recipes/{recipeId}",new {ingredients=new[]{"current sauce"}});Assert.Equal(HttpStatusCode.OK,changed.StatusCode);
            using var projection=JsonDocument.Parse(await reader.GetStringAsync($"/api/recipes/{recipeId}/ingredient-projection?supperDate=2026-10-14&context=proposed"));
            var line=projection.RootElement.GetProperty("lines")[0];Assert.Equal("current sauce",line.GetProperty("originalText").GetString());Assert.Equal(JsonValueKind.Null,line.GetProperty("quantity").ValueKind);Assert.Equal("unresolved",line.GetProperty("status").GetString());
            stored.ChangeTracker.Clear();
            foreach(var task in await stored.WorkflowTasks.Where(x=>x.ProcessorName=="RefreshSupperGroceries").ToListAsync()) await processor.ExecuteAsync(task,default);
            stored.ChangeTracker.Clear();
            var current=await stored.WeeklyPlans.SingleAsync(x=>x.WeekStartDate==new DateOnly(2026,10,12));
            using var groceries=JsonDocument.Parse(current.GroceryItems);Assert.Equal(JsonValueKind.Null,groceries.RootElement[0].GetProperty("quantity").ValueKind);Assert.False(groceries.RootElement[0].GetProperty("quantityComplete").GetBoolean());
            Assert.Empty(await stored.SupperServings.ToListAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Correction_ConcurrentCountAndBasisEditsKeepLatestInputsAndDurableWork()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = CorrectionRecipe();db.Recipes.Add(recipe);db.CalendarEvents.Add(new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id});await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            using var client = factory.CreateAuthenticatedClient(); var before = await Read(client);
            var correction=client.PatchAsJsonAsync($"/api/recipes/{recipe.Id}",new {servings=1});
            var count=client.PutAsJsonAsync("/api/schedule/servings",new {referenceWeekStartDate="2026-10-12",weekOffset=0,expectedVersion=before.GetProperty("version").GetString(),days=new[]{new {date="2026-10-14",servings=6}}});
            var replies=await Task.WhenAll(correction,count).WaitAsync(TimeSpan.FromSeconds(15));Assert.All(replies,r=>Assert.Equal(HttpStatusCode.OK,r.StatusCode));
            db.ChangeTracker.Clear();Assert.Equal(1,(await db.Recipes.SingleAsync()).Servings);Assert.Equal(6,(await db.SupperServings.SingleAsync()).OverrideServings);
            var pending=await db.WeeklyPlans.SingleAsync();Assert.NotEqual(pending.ServingInputVersion,pending.ServingAppliedVersion);Assert.Equal("updating",pending.ServingRefreshStatus);
            var processor=scope.ServiceProvider.GetServices<IWorkflowProcessor>().Single(x=>x.ProcessorName=="RefreshSupperGroceries");
            foreach(var task in await db.WorkflowTasks.Where(x=>x.ProcessorName=="RefreshSupperGroceries").ToListAsync()) await processor.ExecuteAsync(task,default);
            db.ChangeTracker.Clear();var current=await db.WeeklyPlans.SingleAsync();Assert.Equal(current.ServingInputVersion,current.ServingAppliedVersion);Assert.Contains("1200",current.GroceryItems);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Correction_RefreshEnqueueFailureRollsBackRecipeAndFreshness()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            db.FamilySettings.Add(new() { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 2 }) });
            var recipe=CorrectionRecipe();db.Recipes.Add(recipe);db.CalendarEvents.Add(new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id});await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            var originalVersion=(await db.WeeklyPlans.SingleAsync()).ServingInputVersion;
            await db.Database.ExecuteSqlRawAsync("CREATE FUNCTION reject_supper_refresh() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test enqueue unavailable'; END $$; CREATE TRIGGER reject_supper_refresh BEFORE INSERT ON workflow_instances FOR EACH ROW EXECUTE FUNCTION reject_supper_refresh()");
            using var client=factory.CreateAuthenticatedClient();var response=await client.PatchAsJsonAsync($"/api/recipes/{recipe.Id}",new {servings=1});
            Assert.Equal(HttpStatusCode.InternalServerError,response.StatusCode);
            db.ChangeTracker.Clear();Assert.Equal(2,(await db.Recipes.SingleAsync()).Servings);Assert.Empty(await db.WorkflowInstances.ToListAsync());
            var plan=await db.WeeklyPlans.SingleAsync();Assert.Equal(originalVersion,plan.ServingInputVersion);Assert.Equal("current",plan.ServingRefreshStatus);Assert.Contains("200",plan.GroceryItems);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Correction_DiskSyncUsesSameDurableRefreshOwner()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory=await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe=CorrectionRecipe();db.Recipes.Add(recipe);db.CalendarEvents.Add(new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id});
            db.FamilySettings.Add(new FamilySetting {Key=SupperServingsService.DefaultKey,Value=JsonSerializer.SerializeToElement(new {servings=4})});await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            var storage=new RecipeApi.Infrastructure.InMemoryStorageProvider();var repository=new RecipeRepository(storage);
            await storage.SaveAsync("recipes",$"{recipe.Id}/recipe.info",JsonSerializer.Serialize(new RecipeInfo {Id=recipe.Id,ImageCount=0},RecipeApi.Infrastructure.JsonDefaults.CamelCase));
            await storage.SaveAsync("recipes",$"{recipe.Id}/recipe.json",recipe.RawMetadata!.Insert(1,"\"recipeYield\":\"4 portions\","));
            var sync=new RecipeApi.Services.Processors.SyncRecipeProcessor(scope.ServiceProvider.GetRequiredService<IClock>(),db,repository,scope.ServiceProvider.GetRequiredService<SupperProjectionInvalidation>(),scope.ServiceProvider.GetRequiredService<ISupperProjectionPublisher>(),Microsoft.Extensions.Logging.Abstractions.NullLogger<RecipeApi.Services.Processors.SyncRecipeProcessor>.Instance);
            var task=new WorkflowTask {Payload=JsonSerializer.Serialize(new {recipeId=recipe.Id})};await sync.ExecuteAsync(task,default);
            db.ChangeTracker.Clear();Assert.Equal(4,(await db.Recipes.SingleAsync()).Servings);var plan=await db.WeeklyPlans.SingleAsync();Assert.Equal("updating",plan.ServingRefreshStatus);Assert.Contains("400",plan.GroceryItems);Assert.Single(await db.WorkflowTasks.Where(x=>x.ProcessorName=="RefreshSupperGroceries").ToListAsync());
            await sync.ExecuteAsync(task,default);Assert.Single(await db.WorkflowTasks.Where(x=>x.ProcessorName=="RefreshSupperGroceries").ToListAsync());
            var processor=scope.ServiceProvider.GetServices<IWorkflowProcessor>().Single(x=>x.ProcessorName=="RefreshSupperGroceries");await processor.ExecuteAsync(await db.WorkflowTasks.SingleAsync(),default);
            db.ChangeTracker.Clear();Assert.Contains("200",(await db.WeeklyPlans.SingleAsync()).GroceryItems);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Correction_FutureCookedKeepsPortionsAndRefreshesChangedRecipeBasis()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory=await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe=CorrectionRecipe();db.Recipes.Add(recipe);
            var occurrence=new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id,Status=CalendarEventStatus.Cooked};db.CalendarEvents.Add(occurrence);
            db.SupperServings.Add(new SupperServing {Date=Wednesday,InheritedServings=6});await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            using var client=factory.CreateAuthenticatedClient();(await client.PatchAsJsonAsync($"/api/recipes/{recipe.Id}",new {servings=4})).EnsureSuccessStatusCode();
            db.ChangeTracker.Clear();Assert.Equal("updating",(await db.WeeklyPlans.SingleAsync()).ServingRefreshStatus);
            var task=await db.WorkflowTasks.SingleAsync(x=>x.ProcessorName=="RefreshSupperGroceries");
            await scope.ServiceProvider.GetServices<IWorkflowProcessor>().Single(x=>x.ProcessorName=="RefreshSupperGroceries").ExecuteAsync(task,default);
            using var projection=JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{recipe.Id}/ingredient-projection?supperDate=2026-10-14&context=assigned&occurrenceId={occurrence.Id}"));
            Assert.Equal(6,projection.RootElement.GetProperty("targetServings").GetInt32());Assert.Equal(300,projection.RootElement.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
            db.ChangeTracker.Clear();Assert.Contains("300",(await db.WeeklyPlans.SingleAsync()).GroceryItems);Assert.Equal(6,(await db.SupperServings.SingleAsync()).InheritedServings);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Correction_OnlySupperUsesDatedPortionsAlongsideOriginalOtherMeals()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory=await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe=CorrectionRecipe();db.Recipes.Add(recipe);
            db.CalendarEvents.AddRange(new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id,MealSlot=0},new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id,MealSlot=1});
            db.FamilySettings.Add(new FamilySetting {Key=SupperServingsService.DefaultKey,Value=JsonSerializer.SerializeToElement(new {servings=4})});await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            db.ChangeTracker.Clear();using var groceries=JsonDocument.Parse((await db.WeeklyPlans.SingleAsync()).GroceryItems);
            Assert.Equal(600,groceries.RootElement[0].GetProperty("quantity").GetDouble());Assert.Equal(2,await db.CalendarEvents.CountAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Correction_OtherMealOriginalAmountsIgnoreSupperCountsAndBasisButRefreshCurrentText()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory=await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe=CorrectionRecipe();db.Recipes.Add(recipe);db.CalendarEvents.Add(new CalendarEvent {Date=Wednesday.AddDays(7),RecipeId=recipe.Id,MealSlot=1});
            db.FamilySettings.Add(new FamilySetting {Key=SupperServingsService.DefaultKey,Value=JsonSerializer.SerializeToElement(new {servings=4})});await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,19),default);
            using var client=factory.CreateAuthenticatedClient();(await client.PatchAsJsonAsync($"/api/recipes/{recipe.Id}",new {servings=1})).EnsureSuccessStatusCode();
            db.ChangeTracker.Clear();var before=await db.WeeklyPlans.SingleAsync();Assert.Equal("current",before.ServingRefreshStatus);Assert.Empty(await db.WorkflowInstances.ToListAsync());
            using(var groceries=JsonDocument.Parse(before.GroceryItems))Assert.Equal(200,groceries.RootElement[0].GetProperty("quantity").GetDouble());
            (await client.PatchAsJsonAsync($"/api/recipes/{recipe.Id}",new {ingredients=new[]{"current sauce"}})).EnsureSuccessStatusCode();
            db.ChangeTracker.Clear();Assert.Equal("updating",(await db.WeeklyPlans.SingleAsync()).ServingRefreshStatus);
            var task=await db.WorkflowTasks.SingleAsync(x=>x.ProcessorName=="RefreshSupperGroceries");await scope.ServiceProvider.GetServices<IWorkflowProcessor>().Single(x=>x.ProcessorName=="RefreshSupperGroceries").ExecuteAsync(task,default);
            db.ChangeTracker.Clear();using var current=JsonDocument.Parse((await db.WeeklyPlans.SingleAsync()).GroceryItems);Assert.Equal(JsonValueKind.Null,current.RootElement[0].GetProperty("quantity").ValueKind);Assert.False(current.RootElement[0].GetProperty("quantityComplete").GetBoolean());Assert.Equal((short)1,(await db.CalendarEvents.SingleAsync()).MealSlot);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Correction_LegacyRecipeBackedSkippedKeepsOriginalAmountsWithDormantCount()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory=await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();var recipe=CorrectionRecipe();db.Recipes.Add(recipe);
            db.CalendarEvents.Add(new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id,Status=CalendarEventStatus.Skipped});
            db.FamilySettings.Add(new FamilySetting {Key=SupperServingsService.DefaultKey,Value=JsonSerializer.SerializeToElement(new {servings=4})});await db.SaveChangesAsync();
            using(var reader=factory.CreateAuthenticatedClient()) {
                var occurrence=await db.CalendarEvents.SingleAsync();
                using var assigned=JsonDocument.Parse(await reader.GetStringAsync($"/api/recipes/{recipe.Id}/ingredient-projection?supperDate=2026-10-14&context=assigned&occurrenceId={occurrence.Id}"));
                Assert.Equal(JsonValueKind.Null,assigned.RootElement.GetProperty("targetServings").ValueKind);Assert.False(assigned.RootElement.GetProperty("editable").GetBoolean());Assert.Equal(200,assigned.RootElement.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
                using var proposed=JsonDocument.Parse(await reader.GetStringAsync($"/api/recipes/{recipe.Id}/ingredient-projection?supperDate=2026-10-14&context=proposed"));Assert.Equal(4,proposed.RootElement.GetProperty("targetServings").GetInt32());Assert.Equal(400,proposed.RootElement.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
            }
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            db.ChangeTracker.Clear();using var groceries=JsonDocument.Parse((await db.WeeklyPlans.SingleAsync()).GroceryItems);Assert.Equal(200,groceries.RootElement[0].GetProperty("quantity").GetDouble());
            using var client=factory.CreateAuthenticatedClient();(await client.PatchAsJsonAsync($"/api/recipes/{recipe.Id}",new {servings=1})).EnsureSuccessStatusCode();
            db.ChangeTracker.Clear();Assert.Equal("current",(await db.WeeklyPlans.SingleAsync()).ServingRefreshStatus);Assert.Empty(await db.WorkflowInstances.ToListAsync());Assert.Equal(CalendarEventStatus.Skipped,(await db.CalendarEvents.SingleAsync()).Status);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Correction_LegacyRecipeBackedSkippedSourceChangeEnlistsRefresh()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory=await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();var recipe=CorrectionRecipe();db.Recipes.Add(recipe);
            db.CalendarEvents.Add(new CalendarEvent {Date=Wednesday,RecipeId=recipe.Id,Status=CalendarEventStatus.Skipped});await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default);
            using var client=factory.CreateAuthenticatedClient();(await client.PatchAsJsonAsync($"/api/recipes/{recipe.Id}",new {ingredients=new[]{"current sauce"}})).EnsureSuccessStatusCode();
            db.ChangeTracker.Clear();Assert.Equal("updating",(await db.WeeklyPlans.SingleAsync()).ServingRefreshStatus);
            var task=await db.WorkflowTasks.SingleAsync(x=>x.ProcessorName=="RefreshSupperGroceries");await scope.ServiceProvider.GetServices<IWorkflowProcessor>().Single(x=>x.ProcessorName=="RefreshSupperGroceries").ExecuteAsync(task,default);
            db.ChangeTracker.Clear();using var groceries=JsonDocument.Parse((await db.WeeklyPlans.SingleAsync()).GroceryItems);Assert.Equal(JsonValueKind.Null,groceries.RootElement[0].GetProperty("quantity").ValueKind);Assert.Equal(recipe.Id,(await db.CalendarEvents.SingleAsync()).RecipeId);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SupperServings_Correction_EmptyDefaultPublishesReadInvalidationWithoutDerivedWork() => EmptyProjectionHint(false);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SupperServings_Correction_UnassignedRecipePublishesReadInvalidationWithoutDerivedWork() => EmptyProjectionHint(true);

    private async Task EmptyProjectionHint(bool correctRecipe)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = CorrectionRecipe(); db.Recipes.Add(recipe);
            db.FamilySettings.Add(new FamilySetting { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 4 }) });
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            var baseline = await Read(client);
            var events = new MemoryStream(); var context = new Microsoft.AspNetCore.Http.DefaultHttpContext(); context.Response.Body = events;
            factory.Services.GetRequiredService<RecipeApi.Infrastructure.SseConnectionManager>().AddConnection(context.Response);
            var response = await client.PutAsJsonAsync("/api/schedule/servings", new { referenceWeekStartDate = "2026-10-12", weekOffset = 0, expectedVersion = baseline.GetProperty("version").GetString(), defaultServings = 5, days = Array.Empty<object>() });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            if (!correctRecipe) Assert.Contains("event: week_updated", System.Text.Encoding.UTF8.GetString(events.ToArray()));
            events.SetLength(0);
            var corrected = await client.PatchAsJsonAsync($"/api/recipes/{recipe.Id}", new { servings = 1 });
            Assert.Equal(HttpStatusCode.OK, corrected.StatusCode);
            if (correctRecipe) Assert.Contains("event: week_updated", System.Text.Encoding.UTF8.GetString(events.ToArray()));
            db.ChangeTracker.Clear();
            Assert.Empty(await db.CalendarEvents.ToListAsync()); Assert.Empty(await db.SupperServings.ToListAsync());
            Assert.Empty(await db.WorkflowTasks.Where(x => x.ProcessorName == "RefreshSupperGroceries").ToListAsync());
            Assert.Empty(await db.WeeklyPlans.ToListAsync());
            using var projection = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{recipe.Id}/ingredient-projection?supperDate=2026-10-28&context=proposed"));
            Assert.Equal(5, projection.RootElement.GetProperty("targetServings").GetInt32());
            Assert.Equal(1000, projection.RootElement.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SupperServings_CurrentCookedInherited_ResetPersistsAndFreezesAgainstLaterDefaults() =>
        AssertCurrentCookedInheritedCorrection(null);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task SupperServings_CurrentCookedInherited_NumericCorrectionPersistsAndFreezesAgainstLaterDefaults() =>
        AssertCurrentCookedInheritedCorrection(4);

    private async Task AssertCurrentCookedInheritedCorrection(int? correction)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var clock = new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = DateTimeOffset.Parse("2026-10-14T16:00:00Z") };
            await using var factory = await RecipeApi.Tests.Infrastructure.TestWebApplicationFactory.CreateWithAuthAsync(clock, new() {
                ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString,
            });
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = CorrectionRecipe();
            recipe.LastCookedDate = clock.UtcNow;
            var occurrence = new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id, Status = CalendarEventStatus.Cooked };
            db.Recipes.Add(recipe); db.CalendarEvents.Add(occurrence);
            db.FamilySettings.Add(new FamilySetting { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 4 }) });
            db.SupperServings.Add(new SupperServing { Date = Wednesday, InheritedServings = 5 });
            await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026, 10, 12), default);
            (await db.WeeklyPlans.SingleAsync()).GroceryState = "{\"pasta\":true}";
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            var baseline = await Read(client);
            Assert.Equal(5, baseline.GetProperty("days")[2].GetProperty("servings").GetInt32());
            Assert.True(baseline.GetProperty("days")[2].GetProperty("editable").GetBoolean());
            (await Put(client, baseline, null, [new { date = "2026-10-14", servings = correction }], false)).EnsureSuccessStatusCode();
            var after = await Read(client);
            Assert.Equal(4, after.GetProperty("days")[2].GetProperty("servings").GetInt32());
            var savedOverride = after.GetProperty("days")[2].GetProperty("overrideServings");
            if (correction is null) Assert.Equal(JsonValueKind.Null, savedOverride.ValueKind);
            else Assert.Equal(correction.Value, savedOverride.GetInt32());
            using var projection = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{recipe.Id}/ingredient-projection?supperDate=2026-10-14&context=assigned&occurrenceId={occurrence.Id}"));
            Assert.Equal(4, projection.RootElement.GetProperty("targetServings").GetInt32());
            Assert.Equal(400, projection.RootElement.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
            db.ChangeTracker.Clear();
            foreach (var task in await db.WorkflowTasks.Where(x => x.ProcessorName == "RefreshSupperGroceries").ToListAsync())
                await scope.ServiceProvider.GetServices<IWorkflowProcessor>().Single(x => x.ProcessorName == task.ProcessorName).ExecuteAsync(task, default);
            using var grocery = JsonDocument.Parse(await client.GetStringAsync("/api/schedule?referenceWeekStartDate=2026-10-12"));
            Assert.Equal(400, grocery.RootElement.GetProperty("data").GetProperty("groceryItems")[0].GetProperty("quantity").GetDouble());
            Assert.True(grocery.RootElement.GetProperty("data").GetProperty("groceryState").GetProperty("pasta").GetBoolean());
            Assert.Equal(4, (await db.SupperServings.SingleAsync()).InheritedServings);
            var stored = await db.CalendarEvents.SingleAsync();
            Assert.Equal(occurrence.Id, stored.Id); Assert.Equal(recipe.Id, stored.RecipeId);
            Assert.Equal(CalendarEventStatus.Cooked, stored.Status); Assert.Null(stored.PreparedAtUtc);
            Assert.Equal(clock.UtcNow, (await db.Recipes.SingleAsync()).LastCookedDate);
            (await Put(client, after, 6, [])).EnsureSuccessStatusCode();
            Assert.Equal(4, (await Read(client)).GetProperty("days")[2].GetProperty("servings").GetInt32());
            Assert.Equal(2, (await db.Recipes.AsNoTracking().SingleAsync()).Servings);
        });
    }

    private static Recipe CorrectionRecipe() => new() {Name="Pasta",Servings=2,Ingredients="[\"200 g pasta\"]",RawMetadata="{\"recipeIngredient\":[\"200 g pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"}]}"};
}
