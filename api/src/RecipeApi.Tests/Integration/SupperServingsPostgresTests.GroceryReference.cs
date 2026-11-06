using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
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
            var captured = new DateOnly(2026, 10, 12); var later = captured.AddDays(7);
            db.WeeklyPlans.AddRange(new WeeklyPlan { WeekStartDate = captured, GroceryState = "{\"pasta\":false,\"other\":true}" },
                new WeeklyPlan { WeekStartDate = later, GroceryState = "{\"sentinel\":true}" });
            await db.SaveChangesAsync();
            clock.UtcNow = DateTimeOffset.Parse("2026-10-12T05:00:00Z");
            using var client = factory.CreateAuthenticatedClient();
            foreach (var item in new[] { true, false }) {
                var path = "/api/schedule/1/grocery" + (item ? "/item" : "");
                object body = item ? new { ingredientName = "pasta", @checked = true } : new Dictionary<string, bool> { ["pasta"] = true, ["explicitFalse"] = false };
                var response = await client.PatchAsJsonAsync(path + "?referenceWeekStartDate=2026-10-05", body);
                Assert.Equal(item ? HttpStatusCode.NoContent : HttpStatusCode.OK, response.StatusCode);
                db.ChangeTracker.Clear();
                var state = JsonDocument.Parse((await db.WeeklyPlans.SingleAsync(x => x.WeekStartDate == captured)).GroceryState).RootElement;
                Assert.True(state.GetProperty("pasta").GetBoolean());
                if (item) Assert.True(state.GetProperty("other").GetBoolean());
                else { Assert.False(state.GetProperty("explicitFalse").GetBoolean()); Assert.False(state.TryGetProperty("other", out _)); }
                var untouched = JsonDocument.Parse((await db.WeeklyPlans.SingleAsync(x => x.WeekStartDate == later)).GroceryState).RootElement;
                Assert.True(untouched.GetProperty("sentinel").GetBoolean());
                Assert.Single(untouched.EnumerateObject());
                foreach (var invalid in new[] { "", "invalid", "2026-10-06" })
                    Assert.Equal(HttpStatusCode.BadRequest, (await client.PatchAsJsonAsync(path + "?referenceWeekStartDate=" + invalid, body)).StatusCode);
            }
            // Legacy omission still resolves from the deployment's current Monday.
            Assert.Equal(HttpStatusCode.NoContent, (await client.PatchAsJsonAsync("/api/schedule/1/grocery/item", new { ingredientName = "legacy", @checked = true })).StatusCode);
            db.ChangeTracker.Clear();
            Assert.True(JsonDocument.Parse((await db.WeeklyPlans.SingleAsync(x => x.WeekStartDate == later)).GroceryState).RootElement.GetProperty("legacy").GetBoolean());
        });
    }
}
