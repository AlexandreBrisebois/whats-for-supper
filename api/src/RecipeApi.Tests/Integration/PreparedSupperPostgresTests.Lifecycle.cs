using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class PreparedSupperPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PreparedSupper_CalendarMerge_PostgresRoundTripRepeatLegacyAndMalformedBatch()
    {
        foreach (var scenario in new[] { "roundtrip", "partial", "count", "null" })
            await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
                await using var app = await Factory(settings.ConnectionString);
                if (scenario == "roundtrip") await PreparedCalendarMergeTests.RoundTrip(app);
                else if (scenario == "null") await PreparedCalendarMergeTests.LegacyNull(app);
                else await PreparedCalendarMergeTests.Malformed(app, scenario);
            });
    }

    [Theory]
    [InlineData("replace")]
    [InlineData("defer")]
    [InlineData("swap")]
    [InlineData("sunday")]
    public async Task PreparedSupper_MetadataAssociation_Http(string operation)
    {
        await using var app = await Factory();
        await MetadataAssociation(app, operation);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PreparedSupper_MetadataAssociation_PostgresReplacementDeferralSwapAndSunday()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            foreach (var operation in new[] { "replace", "defer", "swap", "sunday" }) {
                await using var app = await Factory(settings.ConnectionString);
                // Each scenario owns its rows; keep a separate captured Friday/Tuesday fixture.
                using (var clean = app.Services.CreateScope()) {
                    var db = clean.ServiceProvider.GetRequiredService<RecipeDbContext>();
                    db.CalendarEvents.RemoveRange(db.CalendarEvents); db.SupperServings.RemoveRange(db.SupperServings);
                    db.FamilySettings.RemoveRange(db.FamilySettings); db.WeeklyPlans.RemoveRange(db.WeeklyPlans);
                    db.Recipes.RemoveRange(db.Recipes); await db.SaveChangesAsync();
                }
                await MetadataAssociation(app, operation);
            }
        });
    }

    private static async Task MetadataAssociation(RecipeApi.Tests.Infrastructure.TestWebApplicationFactory app, string operation)
    {
        var recipe = await Seed(app); using var client = app.CreateAuthenticatedClient();
        var request = await Capture(client, recipe); var receipt = await Prepare(client, request);
        using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var entry = await db.CalendarEvents.SingleAsync(x => x.Date == Friday);
        var id = entry.Id; var other = await db.CalendarEvents.SingleAsync(x => x.Date == Friday.AddDays(-3));
        HttpResponseMessage response;
        if (operation == "defer")
            response = await client.PostAsJsonAsync("/api/schedule/defer?referenceWeekStartDate=2026-10-12", new { sourceDate = "2026-10-16", recipeId = recipe });
        else if (operation == "swap")
            response = await client.PostAsJsonAsync("/api/schedule/move?referenceWeekStartDate=2026-10-12", new { weekOffset = 0, fromIndex = 4, toIndex = 1, recipeId = recipe });
        else if (operation == "sunday") {
            // Exercise both the replaced Sunday receipt and a different prepared Monday target.
            entry.Date = Friday.AddDays(2);
            var target = new CalendarEvent { Id = Guid.NewGuid(), Date = Friday.AddDays(3), RecipeId = other.RecipeId, Status = CalendarEventStatus.Cooked,
                PreparedOn = entry.PreparedOn, PreparedAtUtc = entry.PreparedAtUtc, PreparedServings = 3, PreparedOriginalServings = 1,
                PreparationPlanToken = entry.PreparationPlanToken, PreparationServingVersion = entry.PreparationServingVersion };
            db.CalendarEvents.Add(target); (await db.Recipes.FindAsync(other.RecipeId))!.LastCookedDate = Tuesday; await db.SaveChangesAsync();
            response = await client.PostAsJsonAsync("/api/schedule/assign?referenceWeekStartDate=2026-10-12", new { weekOffset = 0, dayIndex = 6, recipeId = other.RecipeId });
        }
        else response = await client.PostAsJsonAsync("/api/schedule/assign?referenceWeekStartDate=2026-10-12", new { weekOffset = 0, dayIndex = 4, recipeId = other.RecipeId });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode); db.ChangeTracker.Clear();
        var saved = await db.CalendarEvents.SingleAsync(x => x.Id == id);
        if (operation == "swap") {
            Assert.Equal(other.RecipeId, saved.RecipeId); Assert.Null(saved.PreparedAtUtc);
            var destination = await db.CalendarEvents.SingleAsync(x => x.Id == other.Id);
            Assert.Equal(recipe, destination.RecipeId); Assert.Equal(CalendarEventStatus.Cooked, destination.Status);
            Assert.Equal(Tuesday, destination.PreparedAtUtc); Assert.Equal(6, destination.PreparedServings);
            Assert.Equal(receipt.GetProperty("preparation").GetProperty("planToken").GetString(), destination.PreparationPlanToken);
            Assert.Equal(Tuesday, (await db.Recipes.FindAsync(recipe))!.LastCookedDate);
        } else {
            Assert.Equal(CalendarEventStatus.Planned, saved.Status);
            Assert.Null(saved.PreparedAtUtc); Assert.Null(saved.PreparedOn); Assert.Null(saved.PreparedServings);
            Assert.Null(saved.PreparedOriginalServings); Assert.Null(saved.PreparationPlanToken); Assert.Null(saved.PreparationServingVersion);
            Assert.Null((await db.Recipes.FindAsync(recipe))!.LastCookedDate);
            if (operation == "sunday") {
                var monday = await db.CalendarEvents.SingleAsync(x => x.Date == Friday.AddDays(3));
                Assert.Equal(recipe, monday.RecipeId); Assert.Equal(CalendarEventStatus.Planned, monday.Status); Assert.Null(monday.PreparedAtUtc);
                Assert.Null((await db.Recipes.FindAsync(other.RecipeId))!.LastCookedDate);
            }
        }
    }
}
