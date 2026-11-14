using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;
using PostgresFact = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresFactAttribute;
using PostgresTheory = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresTheoryAttribute;

namespace RecipeApi.Tests.Integration;

public partial class DemoShowcaseLoopPostgresTests
{
    [PostgresTheory]
    [InlineData(4)]
    [InlineData(null)]
    public async Task DemoServingResetRestoresDeclaredDefaultAndClearsVisitorDates(int? usual)
    {
        using var scope=app.Services.CreateScope(); var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>(); var management=scope.ServiceProvider.GetRequiredService<ManagementService>();
        db.FamilySettings.Add(new FamilySetting { Key=SupperServingsService.DefaultKey,Value=JsonSerializer.SerializeToElement(new { servings=usual,version=Guid.NewGuid() }) });
        db.SupperServings.Add(new SupperServing { Date=new(2026,10,14),OverrideServings=3,CreatedAt=DateTimeOffset.UtcNow,UpdatedAt=DateTimeOffset.UtcNow }); await db.SaveChangesAsync();
        await management.CaptureDemoStateAsync();
        (await db.FamilySettings.SingleAsync(x=>x.Key==SupperServingsService.DefaultKey)).Value=JsonSerializer.SerializeToElement(new { servings=6 }); (await db.SupperServings.SingleAsync()).OverrideServings=6; await db.SaveChangesAsync();
        await management.RestoreDemoStateAsync(); db.ChangeTracker.Clear(); Assert.Empty(await db.SupperServings.ToListAsync()); var saved=(await db.FamilySettings.SingleAsync(x=>x.Key==SupperServingsService.DefaultKey)).Value.GetProperty("servings");
        if(usual.HasValue) Assert.Equal(usual.Value,saved.GetInt32()); else Assert.Equal(JsonValueKind.Null,saved.ValueKind);
        Assert.Empty(await db.CalendarEvents.ToListAsync()); Assert.Equal("[]",(await db.WeeklyPlans.SingleAsync()).GroceryItems);
    }

    [PostgresFact]
    public async Task DemoServingDefaultRejectsMalformedTypedValueBeforeBaselineSelection()
    {
        using var scope=app.Services.CreateScope(); var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>(); var management=scope.ServiceProvider.GetRequiredService<ManagementService>();
        await management.CaptureDemoStateAsync(); var selected=SelectedBaseline(scope);
        foreach(var value in new[]{"{}","{\"servings\":0}","{\"servings\":1.5}","{\"servings\":\"six\"}"}) {
            db.FamilySettings.RemoveRange(db.FamilySettings); await db.SaveChangesAsync(); db.FamilySettings.Add(new FamilySetting { Key=SupperServingsService.DefaultKey,Value=JsonDocument.Parse(value).RootElement.Clone() }); await db.SaveChangesAsync();
            await Assert.ThrowsAsync<InvalidDataException>(()=>management.CaptureDemoStateAsync()); Assert.Equal(selected,SelectedBaseline(scope));
        }
    }
}
