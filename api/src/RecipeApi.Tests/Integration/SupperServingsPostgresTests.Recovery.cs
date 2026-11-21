using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class SupperServingsPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SupperServings_Recovery_ReadsConfirmExactOverrideResetAndDefaultWithoutFurtherWrites()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var factory = await TomorrowPushPostgresTests.CreateFactory(settings);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var recipe = CorrectionRecipe(); db.Recipes.Add(recipe);
            db.CalendarEvents.Add(new CalendarEvent { Date = Wednesday, RecipeId = recipe.Id });
            db.FamilySettings.Add(new FamilySetting { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 4 }) });
            db.SupperServings.Add(new SupperServing { Date = Wednesday, OverrideServings = 6 });
            await db.SaveChangesAsync();
            using var client = factory.CreateAuthenticatedClient();
            // Discard the commit response, as a client with an unknown transport outcome must.
            using (var discarded = await Put(client, await Read(client), null, [new { date = "2026-10-14", servings = (int?)null }], false))
                Assert.Equal(HttpStatusCode.OK, discarded.StatusCode);
            var reset = await Read(client);
            Assert.Equal(4, reset.GetProperty("days")[2].GetProperty("servings").GetInt32());
            Assert.Equal(JsonValueKind.Null, reset.GetProperty("days")[2].GetProperty("overrideServings").ValueKind);
            using (var discarded = await Put(client, reset, 4, [new { date = "2026-10-14", servings = 4 }]))
                Assert.Equal(HttpStatusCode.OK, discarded.StatusCode);
            var explicitCount = await Read(client);
            Assert.Equal(4, explicitCount.GetProperty("defaultServings").GetInt32());
            Assert.Equal(4, explicitCount.GetProperty("days")[2].GetProperty("overrideServings").GetInt32());
            Assert.NotEqual(reset.GetProperty("version").GetString(), explicitCount.GetProperty("version").GetString());
            db.ChangeTracker.Clear();
            var row = await db.SupperServings.AsNoTracking().SingleAsync();
            var jobs = await db.WorkflowInstances.CountAsync();
            var events = await db.CalendarEvents.AsNoTracking().Select(x => x.Id).ToArrayAsync();
            for (var i = 0; i < 2; i++) {
                var current = await Read(client);
                Assert.Equal(explicitCount.GetRawText(), current.GetRawText());
            }
            db.ChangeTracker.Clear();
            Assert.Equal(row.Version, (await db.SupperServings.AsNoTracking().SingleAsync()).Version);
            Assert.Equal(jobs, await db.WorkflowInstances.CountAsync());
            Assert.Equal(events, await db.CalendarEvents.AsNoTracking().Select(x => x.Id).ToArrayAsync());
            Assert.Equal(2, (await db.Recipes.SingleAsync()).Servings);
        });
    }
}
