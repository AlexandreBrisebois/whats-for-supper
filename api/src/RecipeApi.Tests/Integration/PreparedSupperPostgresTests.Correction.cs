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

namespace RecipeApi.Tests.Integration;

public partial class PreparedSupperPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PreparedSupper_CanonicalCorrection_RecordedSixUsesCurrentContentAndBasis() => CurrentPreparedContent(configured: true);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task PreparedSupper_CanonicalCorrection_OriginalRemainsNullAfterDefaultAndRosterChanges() => CurrentPreparedContent(configured: false);

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CookingStepPreparedSix() => new CanonicalIngredientEditPostgresTests(output).RunCanonicalBrowser(false, stepScaling: true, preparedContext: "six");

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CookingStepPreparedOriginal() => new CanonicalIngredientEditPostgresTests(output).RunCanonicalBrowser(false, stepScaling: true, preparedContext: "original");

    internal static async Task<JsonElement> SeedCanonicalPreparation(TestWebApplicationFactory app, bool configured)
    {
        var recipe = TomorrowPushPostgresTests.Selected;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            ((DeploymentCalendarIntegrationTests.CalendarClock)scope.ServiceProvider.GetRequiredService<IClock>()).UtcNow = Tuesday;
            db.CalendarEvents.RemoveRange(db.CalendarEvents);
            db.SupperServings.RemoveRange(db.SupperServings);
            db.FamilySettings.RemoveRange(db.FamilySettings);
            if (!configured) db.FamilyMembers.RemoveRange(db.FamilyMembers);
            await db.SaveChangesAsync();
            db.CalendarEvents.Add(new CalendarEvent { Id = Guid.NewGuid(), Date = Friday, RecipeId = recipe });
            if (configured) db.FamilySettings.Add(new FamilySetting { Key = SupperServingsService.DefaultKey,
                Value = JsonSerializer.SerializeToElement(new { servings = 6, version = Guid.NewGuid() }) });
            await db.SaveChangesAsync();
        }
        using var client = app.CreateAuthenticatedClient();
        var request = await Capture(client, recipe);
        var receipt = await Prepare(client, request);
        Assert.Equal(configured ? 6 : (int?)null, receipt.GetProperty("preparation").GetProperty("servings").Deserialize<int?>());
        Assert.Equal(4, receipt.GetProperty("preparation").GetProperty("originalServings").GetInt32());
        return receipt;
    }

    private async Task CurrentPreparedContent(bool configured)
    {
        await new CanonicalIngredientEditPostgresTests(output).WithEditor(async (app, content) =>
        {
            content = await CanonicalIngredientEditPostgresTests.SeedCookingWholeUse(app, content);
            var receipt = await SeedCanonicalPreparation(app, configured);
            var recipeId = TomorrowPushPostgresTests.Selected;
            var occurrenceId = receipt.GetProperty("occurrenceId").GetGuid();
            using var client = app.CreateAuthenticatedClient();
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var occurrences = JsonSerializer.Serialize(await db.CalendarEvents.AsNoTracking().OrderBy(x => x.Id).ToListAsync());
            var histories = await db.Recipes.AsNoTracking().OrderBy(x => x.Id).Select(x => new { x.Id, x.LastCookedDate }).ToListAsync();
            var first = await Projection(client, recipeId, occurrenceId);
            Assert.Equal(configured ? 300 : 200, first.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
            // Later household defaults and roster changes must never infer a count for an original receipt.
            var state = (await client.GetFromJsonAsync<JsonElement>("/api/schedule/servings?referenceWeekStartDate=2026-10-12")).GetProperty("data");
            var changedDefault = await client.PutAsJsonAsync("/api/schedule/servings", new {
                referenceWeekStartDate = "2026-10-12", weekOffset = 0, expectedVersion = state.GetProperty("version").GetString(), defaultServings = 9, days = Array.Empty<object>() });
            Assert.Equal(HttpStatusCode.OK, changedDefault.StatusCode);
            db.FamilyMembers.Add(new FamilyMember { Id = Guid.NewGuid(), Name = "Later household member" });
            await db.SaveChangesAsync();
            var patch = await client.PatchAsJsonAsync($"/api/recipes/{recipeId}", new {
                expectedContentRevision = content.ContentRevision,
                ingredientLines = content.IngredientLines.Select((row, i) => new {
                    row.Id, row.Description, amount = i == 0 ? LegacyGroceryQuantity.Parse("250") : row.Amount,
                    amountText = i == 0 ? "250" : row.AmountText, row.Unit, row.Scaling, row.Package, row.Shopping }).ToArray() });
            Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
            var corrected = await Projection(client, recipeId, occurrenceId);
            Assert.NotEqual(first.GetProperty("contentRevision").GetString(), corrected.GetProperty("contentRevision").GetString());
            AssertCurrent(corrected, configured ? 375 : 250, configured, receipt);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{recipeId}", new { expectedContentRevision = corrected.GetProperty("contentRevision").GetString(), servings = 5 })).StatusCode);
            var rebased = await Projection(client, recipeId, occurrenceId);
            AssertCurrent(rebased, configured ? 300 : 250, configured, receipt);
            Assert.NotEqual(corrected.GetProperty("version").GetString(), rebased.GetProperty("version").GetString());
            // A real guarded instruction correction retains stable section/step IDs and original drafts.
            var detail = (await client.GetFromJsonAsync<JsonElement>($"/api/recipes/{recipeId}")).GetProperty("recipe");
            var section = content.InstructionSections[0]; var step = section.Steps[0];
            const string amended = "Add 200 g pasta from a 400 g package; cook 20 minutes at 180 °C. Stir gently.";
            var stepEdit = await client.PatchAsJsonAsync($"/api/recipes/{recipeId}", new {
                expectedContentRevision = detail.GetProperty("contentRevision").GetString(),
                instructionSections = new[] { new { section.Id, section.Name, steps = new[] { new { step.Id, text = amended } } } } });
            Assert.Equal(HttpStatusCode.OK, stepEdit.StatusCode);
            var final = await Projection(client, recipeId, occurrenceId);
            Assert.Contains("Stir gently.", final.GetProperty("instructionProjection").GetProperty("sections")[0].GetProperty("steps")[0].GetProperty("text").GetString());
            db.ChangeTracker.Clear();
            var saved = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipeId))!;
            Assert.Equal(section.Id, saved.InstructionSections[0].Id); Assert.Equal(step.Id, saved.InstructionSections[0].Steps[0].Id);
            Assert.Equal("250", saved.IngredientLines[0].AmountText); Assert.Equal(amended, saved.InstructionSections[0].Steps[0].Text);
            Assert.Equal(content.SourceRevision, saved.SourceRevision);
            Assert.Equal(saved.ContentRevision, final.GetProperty("contentRevision").GetString());
            Assert.Equal(saved.InstructionSections[0].Steps[0].TextRevision, final.GetProperty("instructionProjection").GetProperty("sections")[0].GetProperty("steps")[0].GetProperty("textRevision").GetString());
            Assert.Equal(occurrences, JsonSerializer.Serialize(await db.CalendarEvents.AsNoTracking().OrderBy(x => x.Id).ToListAsync()));
            Assert.Equal(JsonSerializer.Serialize(histories), JsonSerializer.Serialize(await db.Recipes.AsNoTracking().OrderBy(x => x.Id).Select(x => new { x.Id, x.LastCookedDate }).ToListAsync()));
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026, 10, 12), default);
            var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == new DateOnly(2026, 10, 12));
            using var grocery = JsonDocument.Parse(plan.GroceryItems);
            var pasta = Assert.Single(grocery.RootElement.EnumerateArray(), x => x.GetProperty("normalizedKey").GetString() == "pasta");
            Assert.Equal((configured ? 300 : 250).ToString(), pasta.GetProperty("quantity").GetProperty("value").GetProperty("n").GetString());
            Assert.Equal(receipt.GetProperty("preparation").GetRawText(), final.GetProperty("preparation").GetRawText());
        });
    }

    private static void AssertCurrent(JsonElement projection, int amount, bool configured, JsonElement receipt)
    {
        Assert.Equal(configured ? 6 : (int?)null, projection.GetProperty("targetServings").Deserialize<int?>());
        Assert.Equal(configured ? "scaled" : "original", projection.GetProperty("status").GetString());
        Assert.False(projection.GetProperty("editable").GetBoolean());
        Assert.Equal(amount, projection.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
        Assert.Contains($"Add {amount} g pasta", projection.GetProperty("instructionProjection").GetProperty("sections")[0].GetProperty("steps")[0].GetProperty("text").GetString());
        Assert.Equal(receipt.GetProperty("preparation").GetRawText(), projection.GetProperty("preparation").GetRawText());
    }
}
