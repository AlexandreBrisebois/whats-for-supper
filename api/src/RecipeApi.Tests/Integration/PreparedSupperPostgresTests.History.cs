using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class PreparedSupperPostgresTests
{
    [Fact]
    public async Task PreparedSupper_History_HttpLegacyRepeatOverdueRemovalAndStandalone()
    {
        var clock = new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = Tuesday };
        await using var app = await Factory(clock: clock); await History(app, clock);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PreparedSupper_History_PostgresActualUtcMaxLegacyFallbackAndRollover()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var clock = new DeploymentCalendarIntegrationTests.CalendarClock { UtcNow = Tuesday };
            await using var app = await Factory(settings.ConnectionString, clock); await History(app, clock);
        });
    }

    private static async Task History(RecipeApi.Tests.Infrastructure.TestWebApplicationFactory app, DeploymentCalendarIntegrationTests.CalendarClock clock)
    {
        var recipe = await Seed(app); using var client = app.CreateAuthenticatedClient();
        var request = await Capture(client, recipe); var result = await Prepare(client,request);
        using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var soup = await db.CalendarEvents.AsNoTracking().SingleAsync(x => x.Date == Friday.AddDays(-3));
        var standalone = new Recipe { Name = "Viewed unscheduled lunch" }; db.Recipes.Add(standalone); await db.SaveChangesAsync();
        var undated = await client.PostAsJsonAsync("/api/schedule/day/2026-10-13/validate",new {status=2,recipeId=standalone.Id});
        Assert.Equal(HttpStatusCode.OK,undated.StatusCode); Assert.False(JsonDocument.Parse(await undated.Content.ReadAsStringAsync()).RootElement.GetProperty("data").GetProperty("mealMarkedCooked").GetBoolean());
        db.ChangeTracker.Clear(); Assert.Equal(Tuesday,(await db.Recipes.FindAsync(standalone.Id))!.LastCookedDate);
        Assert.Equal(soup.Status,(await db.CalendarEvents.SingleAsync(x=>x.Id==soup.Id)).Status);
        clock.UtcNow = DateTimeOffset.Parse("2026-10-16T16:30:00Z");
        Assert.Equal(HttpStatusCode.OK,(await client.PostAsJsonAsync("/api/schedule/day/2026-10-16/validate",new {status=2,recipeId=recipe})).StatusCode);
        db.ChangeTracker.Clear(); Assert.Equal(Tuesday,(await db.Recipes.FindAsync(recipe))!.LastCookedDate);
        Assert.Equal(HttpStatusCode.OK,(await client.PostAsync("/api/schedule/lock?referenceWeekStartDate=2026-10-12",null)).StatusCode);
        clock.UtcNow = DateTimeOffset.Parse("2026-10-17T16:30:00Z");
        await scope.ServiceProvider.GetRequiredService<ScheduleService>().FinalizeOverdueMealsAsync(); db.ChangeTracker.Clear();
        var friday = await db.CalendarEvents.AsNoTracking().SingleAsync(x=>x.Date==Friday);
        Assert.Equal(Tuesday,friday.PreparedAtUtc); Assert.Equal(6,friday.PreparedServings); Assert.Equal(CalendarEventStatus.Cooked,friday.Status);
        var legacy = await db.CalendarEvents.AsNoTracking().SingleAsync(x=>x.Date==Friday.AddDays(-2));
        Assert.Equal(CalendarEventStatus.Cooked,legacy.Status); Assert.Null(legacy.PreparedAtUtc); Assert.Null(legacy.PreparedOn);
        Assert.Equal(DateTimeOffset.Parse("2026-10-14T00:00:00Z"),(await db.Recipes.FindAsync(recipe))!.LastCookedDate);
        Assert.Equal(HttpStatusCode.NoContent,(await client.DeleteAsync("/api/schedule/day/2026-10-14/remove")).StatusCode);
        db.ChangeTracker.Clear(); Assert.Equal(Tuesday,(await db.Recipes.FindAsync(recipe))!.LastCookedDate);
        var schedule=JsonDocument.Parse(await client.GetStringAsync("/api/schedule?referenceWeekStartDate=2026-10-12")).RootElement.GetProperty("data");
        var saved=schedule.GetProperty("days")[4]; Assert.Equal(result.GetProperty("preparation").GetRawText(),saved.GetProperty("preparation").GetRawText());
        var token=saved.GetProperty("removalToken").GetString();
        Assert.Equal(HttpStatusCode.NoContent,(await client.DeleteAsync("/api/schedule/day/2026-10-16/remove?expectedPlanToken="+token)).StatusCode);
        db.ChangeTracker.Clear(); Assert.Null((await db.Recipes.FindAsync(recipe))!.LastCookedDate);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PreparedSupper_MovesWholeOccurrenceRetainFrozenContextAndTomorrowStillRejectsCooked()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var app=await Factory(settings.ConnectionString);var recipe=await Seed(app);using var client=app.CreateAuthenticatedClient();
            var request=await Capture(client,recipe);await Prepare(client,request);
            Assert.Equal(HttpStatusCode.Conflict,(await client.PostAsJsonAsync("/api/schedule/move?referenceWeekStartDate=2026-10-12",new {weekOffset=0,fromIndex=4,toIndex=5,recipeId=recipe,intent="tomorrow"})).StatusCode);
            Assert.Equal(HttpStatusCode.OK,(await client.PostAsJsonAsync("/api/schedule/move?referenceWeekStartDate=2026-10-12",new {weekOffset=0,fromIndex=4,toIndex=3,recipeId=recipe})).StatusCode);
            Assert.Equal(HttpStatusCode.OK,(await client.PostAsJsonAsync("/api/schedule/move?referenceWeekStartDate=2026-10-12",new {weekOffset=0,targetWeekOffset=1,fromIndex=3,toIndex=0,recipeId=recipe})).StatusCode);
            using var scope=app.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var entry=await db.CalendarEvents.SingleAsync(x=>x.Id==(Guid)request["expectedOccurrenceId"]);
            Assert.Equal(new DateOnly(2026,10,19),entry.Date);Assert.Equal(CalendarEventStatus.Cooked,entry.Status);Assert.Equal(Tuesday,entry.PreparedAtUtc);Assert.Equal(6,entry.PreparedServings);
            Assert.Equal(Tuesday,(await db.Recipes.FindAsync(recipe))!.LastCookedDate);
        });
    }
}
