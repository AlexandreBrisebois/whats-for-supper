using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class SupperServingsPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_GroceryChecksKeepCapturedWeekAcrossSundayForBothPatchBodies()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            var clock = new DeploymentCalendarIntegrationTests.CalendarClock();
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(clock,
                new() { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString });
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var captured = new DateOnly(2026,10,12); var later = captured.AddDays(7);
            var pasta = Guid.NewGuid().ToString(); var other = Guid.NewGuid().ToString(); var explicitFalse = Guid.NewGuid().ToString(); var sentinel = Guid.NewGuid().ToString();
            GroceryLineItemDto Row(string id, string name, DateOnly monday) => new(name,name,"Grocery",null,null,[]) { RowId=id,RowVersion="1",WeekStartDate=monday,DemandIdentity="fixture:"+id };
            db.WeeklyPlans.AddRange(new WeeklyPlan { WeekStartDate=captured,
                GroceryItems=JsonSerializer.Serialize(new[]{Row(pasta,"pasta",captured),Row(other,"other",captured),Row(explicitFalse,"explicitFalse",captured)}),
                GroceryState=JsonSerializer.Serialize(new Dictionary<string,bool>{[pasta]=false,[other]=true}) },
                new WeeklyPlan { WeekStartDate=later,GroceryItems=JsonSerializer.Serialize(new[]{Row(sentinel,"sentinel",later)}),GroceryState=JsonSerializer.Serialize(new Dictionary<string,bool>{[sentinel]=true}) });
            await db.SaveChangesAsync();
            clock.UtcNow=DateTimeOffset.Parse("2026-10-12T05:00:00Z");
            using var client=factory.CreateAuthenticatedClient();
            foreach(var item in new[]{true,false}) {
                var current=await GroceryTestRows.ReadAsync(client,captured);
                var row=current.GetProperty("groceryItems").EnumerateArray().Single(x=>x.GetProperty("rowId").GetString()==pasta);
                var path="/api/schedule/1/grocery"+(item?"/item":"");
                object body=item ? new {rowId=pasta,weekStartDate="2026-10-12",expectedRowVersion=row.GetProperty("rowVersion").GetString(),@checked=true,clientMutationId=Guid.NewGuid()}
                    : new {weekStartDate="2026-10-12",expectedListVersion=current.GetProperty("groceryListVersion").GetString(),checks=new Dictionary<string,bool>{[pasta]=true,[explicitFalse]=false},clientMutationId=Guid.NewGuid()};
                var response=await client.PatchAsJsonAsync(path+"?referenceWeekStartDate=2026-10-05",body); Assert.Equal(HttpStatusCode.OK,response.StatusCode);
                db.ChangeTracker.Clear();
                var state=JsonDocument.Parse((await db.WeeklyPlans.SingleAsync(x=>x.WeekStartDate==captured)).GroceryState).RootElement;
                Assert.True(state.GetProperty(pasta).GetBoolean());
                if(item) Assert.True(state.GetProperty(other).GetBoolean());
                else { Assert.False(state.GetProperty(explicitFalse).GetBoolean()); Assert.False(state.GetProperty(other).GetBoolean()); }
                var untouched=JsonDocument.Parse((await db.WeeklyPlans.SingleAsync(x=>x.WeekStartDate==later)).GroceryState).RootElement;
                Assert.True(untouched.GetProperty(sentinel).GetBoolean()); Assert.Single(untouched.EnumerateObject());
                foreach(var invalid in new[]{"","invalid","2026-10-06"})
                    Assert.Equal(HttpStatusCode.BadRequest,(await client.PatchAsJsonAsync(path+"?referenceWeekStartDate="+invalid,body)).StatusCode);
                // Omitting the captured reference now targets the later week and must conflict.
                Assert.Equal(HttpStatusCode.Conflict,(await client.PatchAsJsonAsync(path,body)).StatusCode);
            }
        });
    }
}
