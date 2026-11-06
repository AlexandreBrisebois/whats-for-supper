using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class SupperServingsPostgresTests
{
    private async Task WithLifecycle(Func<TestWebApplicationFactory, string, Task> action)
    {
        var root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "wfs-serving-lifecycle-" + Guid.NewGuid().ToString("N"));
        try {
            await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
                await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(), new() {
                    ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                    ["Tests:LocalRecipeStore"] = "true", ["DataRoot"] = Path.Combine(root, "data"),
                    ["RecipesRoot"] = Path.Combine(root, "recipes"), ["Recovery:BackupRoot"] = Path.Combine(root, "backup")
                });
                await action(app, root);
            });
        } finally { if (Directory.Exists(root)) Directory.Delete(root, true); }
    }

    private static SupperServing Serving(DateOnly date, int? count) => new() { Date = date, OverrideServings = count, InheritedServings = 4, CreatedAt = DateTimeOffset.Parse("2026-10-10T12:00:00Z"), UpdatedAt = DateTimeOffset.Parse("2026-10-11T12:00:00Z") };
    private static int? Portions(FamilySetting? setting) => setting?.Value.GetProperty("servings").ValueKind == JsonValueKind.Number ? setting.Value.GetProperty("servings").GetInt32() : null;
    private static FamilySetting Usual(int? count) => new() { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = count, version = Guid.NewGuid() }) };

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_OrdinaryExportMergePreservesFactsDestinationDatesAndOriginalRecipeBasis()
    {
        await WithLifecycle(async (app, root) => {
            using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var management = scope.ServiceProvider.GetRequiredService<ManagementService>();
            var recipe = new Recipe { Name = "Pasta", IsSynthesized = true, Servings = 2, Ingredients = "[\"200 g pasta\"]", RawMetadata = "{\"recipeYield\":\"2 portions\",\"recipeIngredient\":[\"200 g pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"}]}" };
            var saved = Serving(new(2026,10,17), 6); var inherited = Serving(Wednesday, null);
            db.Recipes.Add(recipe); db.SupperServings.AddRange(saved, inherited); db.FamilySettings.Add(Usual(4)); await db.SaveChangesAsync();
            await management.BackupAsync();
            var artifact = Path.Combine(root,"data","supper-servings.json"); Assert.True(File.Exists(artifact));
            using (var json = JsonDocument.Parse(await File.ReadAllTextAsync(artifact))) { Assert.Equal(1,json.RootElement.GetProperty("version").GetInt32()); Assert.Equal(4,json.RootElement.GetProperty("defaultServings").GetInt32()); Assert.Equal(2,json.RootElement.GetProperty("days").GetArrayLength()); }
            var original = await scope.ServiceProvider.GetRequiredService<IRecipeStore>().ReadRecipeJsonAsync(recipe.Id);
            Assert.Contains("200 g pasta", original); Assert.Equal(2,JsonDocument.Parse(original!).RootElement.GetProperty("servings").GetInt32());
            saved.OverrideServings=9; inherited.InheritedServings=9; db.FamilySettings.Single(x=>x.Key==SupperServingsService.DefaultKey).Value=Usual(9).Value;
            var destination=Serving(new(2026,10,18),8); db.SupperServings.Add(destination); await db.SaveChangesAsync();
            for(var attempt=0;attempt<2;attempt++) { Assert.Equal(0,(await management.RestoreAsync()).Errors); db.ChangeTracker.Clear(); }
            var rows=await db.SupperServings.OrderBy(x=>x.Date).ToListAsync(); Assert.Equal(3,rows.Count);
            var restored=rows.Single(x=>x.Date==saved.Date); Assert.Equal(6,restored.OverrideServings); Assert.Equal(saved.Version,restored.Version); Assert.Equal(saved.CreatedAt,restored.CreatedAt); Assert.Equal(saved.UpdatedAt,restored.UpdatedAt);
            Assert.Equal(4,rows.Single(x=>x.Date==Wednesday).InheritedServings); Assert.Equal(8,rows.Single(x=>x.Date==destination.Date).OverrideServings);
            Assert.Equal(4,Portions(await db.FamilySettings.SingleAsync(x=>x.Key==SupperServingsService.DefaultKey)));
            File.Delete(artifact); await management.RestoreAsync(); Assert.Equal(3,await db.SupperServings.CountAsync());
            db.SupperServings.RemoveRange(db.SupperServings); db.FamilySettings.RemoveRange(db.FamilySettings.Where(x=>x.Key==SupperServingsService.DefaultKey)); await db.SaveChangesAsync();
            await management.BackupAsync(); using var empty=JsonDocument.Parse(await File.ReadAllTextAsync(artifact)); Assert.Equal(0,empty.RootElement.GetProperty("days").GetArrayLength()); Assert.Equal(JsonValueKind.Null,empty.RootElement.GetProperty("defaultServings").ValueKind);
            db.FamilySettings.Add(Usual(7)); db.SupperServings.Add(destination); await db.SaveChangesAsync(); await management.RestoreAsync(); db.ChangeTracker.Clear();
            Assert.Null(Portions(await db.FamilySettings.SingleOrDefaultAsync(x=>x.Key==SupperServingsService.DefaultKey))); Assert.Single(await db.SupperServings.ToListAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_InvalidPresentArtifactNeverPartiallyAppliesDefaultOrDates()
    {
        await WithLifecycle(async (app, root) => {
            using var scope=app.Services.CreateScope(); var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>(); var management=scope.ServiceProvider.GetRequiredService<ManagementService>();
            db.SupperServings.Add(Serving(Wednesday,6)); db.FamilySettings.Add(Usual(4)); await db.SaveChangesAsync(); Directory.CreateDirectory(Path.Combine(root,"data"));
            var validFirst = JsonSerializer.Serialize(Serving(new(2026,10,17),8), JsonDefaults.CamelCase);
            var invalidSecond = JsonSerializer.Serialize(Serving(new(2026,10,18),0), JsonDefaults.CamelCase);
            foreach(var invalid in new[]{ $"{{\"version\":1,\"defaultServings\":8,\"days\":[{validFirst},{invalidSecond}]}}", "{", "{\"version\":99,\"defaultServings\":8,\"days\":[]}", "{\"version\":1,\"days\":[]}", "{\"version\":1,\"defaultServings\":8,\"days\":[{\"date\":\"2026-10-17\",\"overrideServings\":6},{\"date\":\"2026-10-18\",\"overrideServings\":0}]}" }) {
                await File.WriteAllTextAsync(Path.Combine(root,"data","supper-servings.json"),invalid); Assert.Equal(1,(await management.RestoreAsync()).Errors); db.ChangeTracker.Clear(); Assert.Equal(6,(await db.SupperServings.SingleAsync()).OverrideServings); Assert.Equal(4,Portions(await db.FamilySettings.SingleAsync(x=>x.Key==SupperServingsService.DefaultKey)));
            }
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_ExactRecoveryIncludesRequiredDatesAndReplacesDestinationMembership()
    {
        await WithLifecycle(async (app, root) => {
            using var scope=app.Services.CreateScope(); var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>(); var service=scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>();
            var row=Serving(Wednesday,6); db.SupperServings.Add(row); db.FamilySettings.Add(Usual(null)); await db.SaveChangesAsync(); var capture=await service.CaptureAsync(default);
            var artifact=Path.Combine(root,"backup",capture.SnapshotId!.Value.ToString("N"),"tables","supper_servings.json"); Assert.True(File.Exists(artifact));
            db.SupperServings.Add(Serving(new(2026,10,17),9)); row.OverrideServings=10; await db.SaveChangesAsync(); await service.RestoreExactAsync(capture.SnapshotId.Value,default); db.ChangeTracker.Clear(); Assert.Equal(6,(await db.SupperServings.SingleAsync()).OverrideServings); Assert.Null(Portions(await db.FamilySettings.SingleAsync(x=>x.Key==SupperServingsService.DefaultKey)));
            File.Delete(artifact); (await db.SupperServings.SingleAsync()).OverrideServings=8; await db.SaveChangesAsync(); await Assert.ThrowsAsync<InvalidDataException>(()=>service.RestoreExactAsync(capture.SnapshotId.Value,default)); db.ChangeTracker.Clear(); Assert.Equal(8,(await db.SupperServings.SingleAsync()).OverrideServings);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_LegacyMergeRequeuesRestoredGroceryCacheWithoutChangingServingIntent()
    {
        await WithLifecycle(async (app, root) => {
            using var scope=app.Services.CreateScope(); var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>(); var management=scope.ServiceProvider.GetRequiredService<ManagementService>();
            var recipe=new Recipe { Name="Pasta", IsSynthesized=true, Servings=2, Ingredients="[\"200 g pasta\"]", RawMetadata="{\"recipeIngredient\":[\"200 g pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"}]}" }; db.Recipes.Add(recipe); db.CalendarEvents.Add(new CalendarEvent { Date=Wednesday,RecipeId=recipe.Id }); await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default); await management.BackupAsync();
            db.SupperServings.Add(Serving(Wednesday,6)); await db.SaveChangesAsync(); File.Delete(Path.Combine(root,"data","supper-servings.json")); await management.RestoreAsync(); db.ChangeTracker.Clear();
            Assert.Equal(6,(await db.SupperServings.SingleAsync()).OverrideServings); var plan=await db.WeeklyPlans.SingleAsync(); Assert.Equal("updating",plan.ServingRefreshStatus); Assert.NotEqual(plan.ServingInputVersion,plan.ServingAppliedVersion);
            Assert.NotNull(plan.ServingRefreshWorkflowId); Assert.Contains(await db.WorkflowTasks.ToListAsync(),x=>x.InstanceId==plan.ServingRefreshWorkflowId && x.ProcessorName=="RefreshSupperGroceries");
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default); db.ChangeTracker.Clear(); Assert.Contains("600",(await db.WeeklyPlans.SingleAsync()).GroceryItems);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_ExactPendingSnapshotRequeuesAfterOldWorkFenceAndFreshSnapshotDoesNot()
    {
        await WithLifecycle(async (app, root) => {
            using var scope=app.Services.CreateScope(); var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>(); var recovery=scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>();
            var recipe=new Recipe { Name="Pasta", Servings=2, Ingredients="[\"200 g pasta\"]", RawMetadata="{\"recipeIngredient\":[\"200 g pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"}]}" }; db.Recipes.Add(recipe); db.CalendarEvents.Add(new CalendarEvent { Date=Wednesday,RecipeId=recipe.Id }); await db.SaveChangesAsync();
            using var client=app.CreateAuthenticatedClient(); var before=await Read(client); var response=await client.PutAsync("/api/schedule/servings",new StringContent(JsonSerializer.Serialize(new{referenceWeekStartDate="2026-10-12",weekOffset=0,expectedVersion=before.GetProperty("version").GetString(),days=new[]{new{date="2026-10-14",servings=6}}}),System.Text.Encoding.UTF8,"application/json")); response.EnsureSuccessStatusCode();
            db.ChangeTracker.Clear(); var old=(await db.WeeklyPlans.SingleAsync()).ServingRefreshWorkflowId; var snapshot=await recovery.CaptureAsync(default); await recovery.RestoreExactAsync(snapshot.SnapshotId!.Value,default); db.ChangeTracker.Clear(); var pending=await db.WeeklyPlans.SingleAsync(); Assert.NotEqual(old,pending.ServingRefreshWorkflowId); Assert.Equal("updating",pending.ServingRefreshStatus);
            var job=await db.WorkflowInstances.Include(x=>x.Tasks).SingleAsync(x=>x.Id==pending.ServingRefreshWorkflowId); Assert.Equal(WorkflowStatus.Pending,job.Status); Assert.Contains(job.Tasks,x=>x.ProcessorName=="RefreshSupperGroceries");
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026,10,12),default); db.ChangeTracker.Clear(); var fresh=await db.WeeklyPlans.SingleAsync(); Assert.Contains("600",fresh.GroceryItems); Assert.Equal(fresh.ServingInputVersion,fresh.ServingAppliedVersion); var freshId=fresh.ServingRefreshWorkflowId;
            var coherent=await recovery.CaptureAsync(default); await recovery.RestoreExactAsync(coherent.SnapshotId!.Value,default); db.ChangeTracker.Clear(); fresh=await db.WeeklyPlans.SingleAsync(); Assert.Equal(freshId,fresh.ServingRefreshWorkflowId); Assert.Equal(fresh.ServingInputVersion,fresh.ServingAppliedVersion);
        });
    }
}
