using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;

namespace RecipeApi.Tests.Integration;

public partial class DemoShowcaseLoopPostgresTests
{
    [PostgresFact]
    public async Task PreparedSupper_DemoDeclaredPolicyClearsCapturedAndVisitorPreparationRestoresDefaultAndRecipeBasis()
    {
        using var scope=app.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe=new Recipe{Name="Prepared pasta",Servings=2,Ingredients="[\"200 g pasta\"]",LastCookedDate=DateTimeOffset.Parse("2026-10-13T12:00:00Z")};db.Recipes.Add(recipe);
        db.CalendarEvents.Add(PreparedCalendarMergeTests.Entry(recipe.Id));db.FamilySettings.Add(new FamilySetting{Key=SupperServingsService.DefaultKey,Value=JsonSerializer.SerializeToElement(new {servings=4})});await db.SaveChangesAsync();
        var management=scope.ServiceProvider.GetRequiredService<ManagementService>();await management.CaptureDemoStateAsync();var baseline=SelectedBaseline(scope);
        using(var disposition=JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(baseline,"dispositions.json"))))Assert.Equal("clear",disposition.RootElement.GetProperty("calendar_events").GetString());
        Assert.Equal("[]",await File.ReadAllTextAsync(Path.Combine(baseline,"tables/calendar_events.json")));
        var visitor=PreparedCalendarMergeTests.Entry(recipe.Id);visitor.Date=new(2026,10,18);db.CalendarEvents.Add(visitor);recipe.Servings=9;
        (await db.FamilySettings.SingleAsync(x=>x.Key==SupperServingsService.DefaultKey)).Value=JsonSerializer.SerializeToElement(new {servings=8});await db.SaveChangesAsync();
        await management.RestoreDemoStateAsync();db.ChangeTracker.Clear();Assert.Empty(await db.CalendarEvents.ToListAsync());
        var restored=await db.Recipes.SingleAsync();Assert.Null(restored.LastCookedDate);Assert.Equal(2,restored.Servings);Assert.Contains("200 g",restored.Ingredients);
        Assert.Equal(4,(await db.FamilySettings.SingleAsync(x=>x.Key==SupperServingsService.DefaultKey)).Value.GetProperty("servings").GetInt32());
        Assert.Empty(await db.SupperServings.ToListAsync());Assert.Equal("[]",(await db.WeeklyPlans.SingleAsync()).GroceryItems);
    }
}
