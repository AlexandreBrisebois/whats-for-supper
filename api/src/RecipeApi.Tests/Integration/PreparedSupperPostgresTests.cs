using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public partial class PreparedSupperPostgresTests(ITestOutputHelper output)
{
    private static readonly DateOnly Friday = new(2026, 10, 16);
    private const string PrepareUrl = "/api/schedule/day/2026-10-16/prepare";
    private static readonly DateTimeOffset Tuesday = DateTimeOffset.Parse("2026-10-13T12:00:00Z");

    private static async Task<Guid> Seed(TestWebApplicationFactory app, bool configured = true)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Name = "Friday pasta", Servings = 2, Ingredients = "[\"200 g pasta\"]", RawMetadata = "{\"recipeIngredient\":[\"200 g pasta\"],\"supply\":[{\"name\":\"pasta\",\"quantity\":200,\"unitText\":\"g\"}]}" };
        var other = new Recipe { Name = "Tuesday soup", Ingredients = "[]" };
        db.Recipes.AddRange(recipe, other);
        db.CalendarEvents.AddRange(new CalendarEvent { Id = Guid.NewGuid(), Date = Friday, RecipeId = recipe.Id }, new CalendarEvent { Id = Guid.NewGuid(), Date = Friday.AddDays(-2), RecipeId = recipe.Id }, new CalendarEvent { Id = Guid.NewGuid(), Date = Friday.AddDays(-3), RecipeId = other.Id, Status = CalendarEventStatus.Locked });
        if (configured) {
            db.FamilySettings.Add(new FamilySetting { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 4 }) });
            db.SupperServings.Add(new SupperServing { Date = Friday, OverrideServings = 6, InheritedServings = 4, CreatedAt = Tuesday, UpdatedAt = Tuesday });
        }
        await db.SaveChangesAsync();
        return recipe.Id;
    }

    private static async Task<Dictionary<string, object>> Capture(HttpClient client, Guid recipe)
    {
        var schedule = JsonDocument.Parse(await client.GetStringAsync("/api/schedule?referenceWeekStartDate=2026-10-12")).RootElement.GetProperty("data");
        var day = schedule.GetProperty("days")[4];
        var id = day.GetProperty("occurrenceId").GetGuid();
        var projection = await Projection(client, recipe, id);
        return new() { ["expectedOccurrenceId"] = id, ["recipeId"] = recipe,
            ["expectedPlanToken"] = projection.TryGetProperty("preparationPlanToken", out var token) ? token.GetString()! : day.GetProperty("removalToken").GetString()!,
            ["expectedServingVersion"] = projection.TryGetProperty("preparationServingVersion", out var version) ? version.GetString()! : projection.GetProperty("version").GetString()! };
    }
    private static async Task<JsonElement> Projection(HttpClient client, Guid recipe, Guid occurrence) => JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{recipe}/ingredient-projection?supperDate=2026-10-16&context=assigned&occurrenceId={occurrence}")).RootElement.Clone();
    private static async Task<JsonElement> Prepare(HttpClient client, Dictionary<string, object> request)
    {
        var response = await client.PostAsJsonAsync(PrepareUrl, request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("data").Clone();
    }
    private static Task<TestWebApplicationFactory> Factory(string? connection = null, DeploymentCalendarIntegrationTests.CalendarClock? clock = null) => TestWebApplicationFactory.CreateWithAuthAsync(clock ?? new() { UtcNow = Tuesday }, new() { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = connection });

    [Fact]
    public async Task PreparedSupper_HttpTracer_PreparesFridayOnTuesdayWithoutCompletingOtherOccurrences()
    {
        await using var app = await Factory();
        await Tracer(app);
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PreparedSupper_AtomicPostgresTracer_FrozenSixHistoryAndExactRetry()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => { await using var app = await Factory(settings.ConnectionString); await Tracer(app); });
    }
    private static async Task Tracer(TestWebApplicationFactory app)
    {
        var recipe = await Seed(app); using var client = app.CreateAuthenticatedClient();
        var request = await Capture(client, recipe);
        var result = await Prepare(client, request);
        Assert.Equal("2026-10-16", result.GetProperty("supperDate").GetString());
        var prepared = result.GetProperty("preparation");
        Assert.Equal("2026-10-13", prepared.GetProperty("preparedOn").GetString());
        Assert.Equal(Tuesday, prepared.GetProperty("preparedAtUtc").GetDateTimeOffset());
        Assert.Equal(6, prepared.GetProperty("servings").GetInt32());
        Assert.Equal("dated", prepared.GetProperty("portionContext").GetString());
        using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var entries = await db.CalendarEvents.OrderBy(x => x.Date).ToListAsync();
        Assert.Equal(CalendarEventStatus.Locked, entries[0].Status); Assert.Equal(CalendarEventStatus.Planned, entries[1].Status); Assert.Equal(CalendarEventStatus.Cooked, entries[2].Status);
        Assert.Equal(Tuesday, (await db.Recipes.FindAsync(recipe))!.LastCookedDate);
        // Change the default after the receipt; exact retry must return the original outcome.
        var setting = await db.FamilySettings.SingleAsync(); setting.Value = JsonSerializer.SerializeToElement(new { servings = 9 }); await db.SaveChangesAsync();
        Assert.Equal(prepared.GetRawText(), (await Prepare(client, request)).GetProperty("preparation").GetRawText());
        var projection = await Projection(client, recipe, (Guid)request["expectedOccurrenceId"]);
        Assert.Equal(6, projection.GetProperty("targetServings").GetInt32()); Assert.False(projection.GetProperty("editable").GetBoolean());
        Assert.Equal(600, projection.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
        var changed = new Dictionary<string, object>(request) { ["expectedServingVersion"] = new string('A', 64) };
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(PrepareUrl, changed)).StatusCode);
        var schedule = JsonDocument.Parse(await client.GetStringAsync("/api/schedule?referenceWeekStartDate=2026-10-12")).RootElement.GetProperty("data");
        Assert.Equal("2026-10-13", schedule.GetProperty("days")[4].GetProperty("preparation").GetProperty("preparedOn").GetString());
        var corrected = (await db.Recipes.FindAsync(recipe))!;
        corrected.Servings = 3; corrected.Ingredients = "[\"300 g pasta\"]"; await db.SaveChangesAsync();
        ((DeploymentCalendarIntegrationTests.CalendarClock)scope.ServiceProvider.GetRequiredService<IClock>()).UtcNow = Tuesday.AddDays(2);
        Assert.Equal(prepared.GetRawText(), (await Prepare(client, request)).GetProperty("preparation").GetRawText());

    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PreparedSupper_ChangedCountSourceOrRecreatedOccurrenceConflictsWithoutMutation()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var app = await Factory(settings.ConnectionString); var recipe = await Seed(app); using var client = app.CreateAuthenticatedClient();
            var captured = await Capture(client, recipe);
            using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var row = await db.SupperServings.SingleAsync(); row.OverrideServings = 7; await db.SaveChangesAsync();
            Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(PrepareUrl, captured)).StatusCode);
            row.OverrideServings = 6; await db.SaveChangesAsync();
            var source = await db.Recipes.FindAsync(recipe); source!.Ingredients = "[\"300 g pasta\"]"; await db.SaveChangesAsync();
            Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(PrepareUrl, captured)).StatusCode);
            var entry = await db.CalendarEvents.SingleAsync(x => x.Date == Friday); db.CalendarEvents.Remove(entry); await db.SaveChangesAsync();
            db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), Date = Friday, RecipeId = recipe }); await db.SaveChangesAsync();
            Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(PrepareUrl, captured)).StatusCode);
            db.ChangeTracker.Clear(); Assert.All(await db.CalendarEvents.ToListAsync(), x => Assert.NotEqual(CalendarEventStatus.Cooked, x.Status)); Assert.Null((await db.Recipes.FindAsync(recipe))!.LastCookedDate);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PreparedSupper_UnrelatedEditsDoNotConflict_AndUnconfiguredContextDoesNotAcquireLaterDefault()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            await using var app = await Factory(settings.ConnectionString); var recipe = await Seed(app, false);
            using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            // Preserve the original/unavailable preparation journey with an honestly empty roster.
            db.FamilyMembers.RemoveRange(await db.FamilyMembers.ToListAsync()); await db.SaveChangesAsync();
            using var client = app.CreateAuthenticatedClient();
            var usual = JsonDocument.Parse(await client.GetStringAsync("/api/schedule/servings?referenceWeekStartDate=2026-10-12")).RootElement.GetProperty("data");
            Assert.Equal("family", usual.GetProperty("defaultServingsSource").GetString()); Assert.Equal(JsonValueKind.Null, usual.GetProperty("defaultServings").ValueKind);
            var captured = await Capture(client, recipe);
            db.SupperServings.Add(new SupperServing { Date = Friday.AddDays(-1), OverrideServings = 8 }); await db.SaveChangesAsync();
            var result = await Prepare(client, captured); Assert.Equal("original", result.GetProperty("preparation").GetProperty("portionContext").GetString());
            db.FamilySettings.Add(new FamilySetting { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 4 }) }); await db.SaveChangesAsync();
            var projection = await Projection(client, recipe, (Guid)captured["expectedOccurrenceId"]);
            Assert.Equal(JsonValueKind.Null, projection.GetProperty("targetServings").ValueKind); Assert.Equal(200, projection.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
            Assert.Equal(result.GetProperty("preparation").GetRawText(), (await Prepare(client, captured)).GetProperty("preparation").GetRawText());
        });
    }
}
