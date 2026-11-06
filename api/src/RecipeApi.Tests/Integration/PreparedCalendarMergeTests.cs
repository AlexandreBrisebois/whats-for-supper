using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class PreparedCalendarMergeTests
{
    [Theory]
    [InlineData("partial")]
    [InlineData("count")]
    [InlineData("plan")]
    [InlineData("version")]
    [InlineData("status")]
    [InlineData("recipe")]
    [InlineData("time")]
    public async Task PreparedCalendarMerge_MalformedPreparationRejectsCalendarBatch(string malformed)
    {
        await using var app = await TestWebApplicationFactory.CreateAsync();
        await Malformed(app, malformed);
    }

    internal static async Task Malformed(TestWebApplicationFactory app, string malformed)
    {
        using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Keep", Servings = 2 }; db.Recipes.Add(recipe);
        var retained = new CalendarEvent { Id = Guid.NewGuid(), Date = new(2026,10,15), RecipeId = recipe.Id }; db.CalendarEvents.Add(retained); await db.SaveChangesAsync();
        var valid = Entry(recipe.Id); var invalid = JsonSerializer.SerializeToNode(Entry(recipe.Id), JsonDefaults.CamelCase)!.AsObject();
        invalid["id"] = Guid.NewGuid(); invalid["date"] = "2026-10-17";
        switch (malformed) {
            case "partial": invalid.Remove("preparationServingVersion"); break;
            case "count": invalid["preparedServings"] = 0; break;
            case "plan": invalid["preparationPlanToken"] = "bad"; break;
            case "version": invalid["preparationServingVersion"] = "bad"; break;
            case "status": invalid["status"] = "planned"; break;
            case "recipe": invalid["recipeId"] = null; break;
            case "time": invalid["preparedAtUtc"] = "0001-01-01T00:00:00Z"; break;
        }
        var rows = new JsonArray(JsonSerializer.SerializeToNode(valid, JsonDefaults.CamelCase), invalid);
        await File.WriteAllTextAsync(Path.Combine(scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root,"calendar-events.json"), rows.ToJsonString());
        var result = await scope.ServiceProvider.GetRequiredService<ManagementService>().RestoreAsync();
        Assert.Equal(1, result.Errors); Assert.Equal(0, result.CalendarEventsRestored);
        db.ChangeTracker.Clear(); Assert.Equal(retained.Id, (await db.CalendarEvents.SingleAsync()).Id);
    }

    internal static CalendarEvent Entry(Guid recipe) => new() {
        Id = Guid.NewGuid(), Date = new(2026,10,16), RecipeId = recipe, Status = CalendarEventStatus.Cooked,
        PreparedOn = new(2026,10,13), PreparedAtUtc = DateTimeOffset.Parse("2026-10-13T12:00:00Z"), PreparedServings = 6, PreparedOriginalServings = 2,
        PreparationPlanToken = "v1." + new string('A',43), PreparationServingVersion = new string('A',64)
    };

    [Fact]
    public async Task PreparedCalendarMerge_LegacyNullArtifactRemainsNoOp()
    {
        await using var app = await TestWebApplicationFactory.CreateAsync();
        await LegacyNull(app);
    }

    internal static async Task LegacyNull(TestWebApplicationFactory app)
    {
        using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var retained = new CalendarEvent { Id = Guid.NewGuid(), Date = new(2026, 10, 15) }; db.CalendarEvents.Add(retained); await db.SaveChangesAsync();
        await File.WriteAllTextAsync(Path.Combine(scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root, "calendar-events.json"), "null");
        var result = await scope.ServiceProvider.GetRequiredService<ManagementService>().RestoreAsync();
        Assert.Equal(0, result.Errors); Assert.Equal(retained.Id, (await db.CalendarEvents.SingleAsync()).Id);
    }

    [Fact]
    public async Task PreparedCalendarMerge_RoundTripRepeatAndLegacyAbsencePreserveRepresentedAssociation()
    {
        await using var app = await TestWebApplicationFactory.CreateAsync();
        await RoundTrip(app);
    }

    internal static async Task RoundTrip(TestWebApplicationFactory app)
    {
        using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Prepared pasta", IsSynthesized = true, Servings = 2, Ingredients = "[\"200 g pasta\"]" }; db.Recipes.Add(recipe);
        var entry = Entry(recipe.Id); recipe.LastCookedDate = entry.PreparedAtUtc; db.CalendarEvents.Add(entry); await db.SaveChangesAsync();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>(); await service.BackupAsync();
        var path = Path.Combine(scope.ServiceProvider.GetRequiredService<DataRootResolver>().Root,"calendar-events.json");
        var wire = await File.ReadAllTextAsync(path); Assert.Contains("\"preparedAtUtc\"", wire); Assert.DoesNotContain("\"PreparedAtUtc\"",wire);
        db.CalendarEvents.Remove(entry); await db.SaveChangesAsync();
        for (var i=0;i<2;i++) {
            var result = await service.RestoreAsync(); Assert.Equal(0,result.Errors); db.ChangeTracker.Clear();
            var saved = await db.CalendarEvents.SingleAsync(); Assert.Equal(entry.Id,saved.Id); Assert.Equal(entry.PreparedAtUtc,saved.PreparedAtUtc); Assert.Equal(6,saved.PreparedServings); Assert.Equal(entry.PreparationPlanToken,saved.PreparationPlanToken);
            Assert.Equal(entry.PreparedAtUtc,(await db.Recipes.SingleAsync()).LastCookedDate);
            Assert.Equal(2,(await db.Recipes.SingleAsync()).Servings); Assert.Contains("200 g",(await db.Recipes.SingleAsync()).Ingredients);
        }
        var legacy = JsonNode.Parse(wire)!.AsArray();
        foreach (var field in new[]{"preparedOn","preparedAtUtc","preparedServings","preparedOriginalServings","preparationPlanToken","preparationServingVersion"}) legacy[0]!.AsObject().Remove(field);
        await File.WriteAllTextAsync(path,legacy.ToJsonString()); await service.RestoreAsync(); db.ChangeTracker.Clear();
        var restored = await db.CalendarEvents.SingleAsync(); Assert.Equal(CalendarEventStatus.Cooked,restored.Status); Assert.Null(restored.PreparedOn); Assert.Null(restored.PreparedAtUtc); Assert.Null(restored.PreparedServings);
    }
}
