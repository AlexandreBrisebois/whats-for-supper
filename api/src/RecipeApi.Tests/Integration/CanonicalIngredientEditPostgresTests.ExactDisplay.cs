using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientEditPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryExactDisplay_FractionAndRangesUseSavedOperandsShoppingLabelsAndReadOnlyContexts()
    {
        await WithEditor(async (factory, before) =>
        {
            RecipeIngredientLineInput Added(string clientId, string description, string shopping, string? amount, string unit) => new()
            {
                ClientId = clientId, Description = description,
                Amount = amount is null ? null : LegacyGroceryQuantity.Parse(amount), AmountText = amount,
                Unit = new(unit, null), Package = null, Scaling = "proportional",
                Shopping = new(shopping, null, null)
            };
            using var client = factory.CreateAuthenticatedClient();
            using var save = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = before.ContentRevision, servings = 3,
                ingredientLines = new[]
                {
                    Row(before.IngredientLines[0]), Row(before.IngredientLines[1]),
                    Added("fraction", "finely chopped walnuts", "walnuts", "⅓", "cup"),
                    Added("range-first", "whole garlic cloves", "garlic", "2–3", "cloves"),
                    Added("range-second", "additional garlic cloves", "garlic", "1–2", "cloves"),
                    Added("unknown", "garlic to taste", "garlic", null, "cloves")
                }
            });
            Assert.Equal(HttpStatusCode.OK, save.StatusCode);
            var current = await ReadDeclaredPackageContent(factory);
            Assert.Equal(3, current.Servings);
            Assert.Equal(before.SourceRevision, current.SourceRevision);
            Assert.Equal(JsonSerializer.Serialize(before.InstructionSections, Json), JsonSerializer.Serialize(current.InstructionSections, Json));
            for (var index = 0; index < before.IngredientLines.Count; index++)
                Assert.Equal(JsonSerializer.Serialize(before.IngredientLines[index], Json), JsonSerializer.Serialize(current.IngredientLines[index], Json));
            var fraction = current.IngredientLines[2];
            var firstRange = current.IngredientLines[3];
            Assert.Equal(LegacyGroceryQuantity.Parse("1/3"), fraction.Amount);
            Assert.Equal("⅓", fraction.AmountText);
            Assert.Null(fraction.Package);
            Assert.Equal("finely chopped walnuts", fraction.Description);
            Assert.Equal("walnuts", fraction.Shopping.Name);
            var canonicalSaved = JsonSerializer.Serialize(current, Json);
            var monday = new DateOnly(2026, 10, 12);
            var date = monday.AddDays(3);
            Guid occurrence;
            using (var scope = factory.Services.CreateScope())
                occurrence = (await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().CalendarEvents.AsNoTracking()
                    .SingleAsync(row => row.Date == date && row.MealSlot == 0 && row.RecipeId == Id)).Id;

            async Task<JsonElement> Get(string path)
            {
                using var response = await client.GetAsync(path);
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                return json.RootElement.Clone();
            }
            async Task<string> PersistedState()
            {
                using var scope = factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                return JsonSerializer.Serialize(new
                {
                    recipe = await db.Recipes.AsNoTracking().SingleAsync(row => row.Id == Id),
                    plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(row => row.WeekStartDate == monday),
                    servings = await db.SupperServings.AsNoTracking().OrderBy(row => row.Date).ToArrayAsync(),
                    events = await db.CalendarEvents.AsNoTracking().OrderBy(row => row.Id).ToArrayAsync(),
                    operations = await db.CanonicalRecipeOperations.CountAsync(),
                    groceryOutcomes = await db.GroceryMutationOutcomes.CountAsync(),
                    tasks = await db.WorkflowTasks.AsNoTracking().OrderBy(row => row.InstanceId).ThenBy(row => row.TaskId).ToArrayAsync()
                }, Json);
            }
            static JsonElement Line(JsonElement projection, int index) => projection.GetProperty("lines")[index];
            static void Exact(JsonElement line, string display, string original)
            {
                Assert.Equal(original, line.GetProperty("originalText").GetString());
                Assert.Equal("scaled", line.GetProperty("status").GetString());
                Assert.Equal(display, line.TryGetProperty("displayText", out var text) ? text.GetString() : null);
            }
            var datedPath = $"/api/recipes/{Id}/ingredient-projection?supperDate={date:yyyy-MM-dd}&context=assigned&occurrenceId={occurrence}";
            foreach (var target in new[] { 5, 3 })
            {
                // The existing preview API accepts only2/4/6. A dated context supplies C08's literal5→3.
                // These are explicit fixture context changes, before the read-only persistence boundary.
                using (var scope = factory.Services.CreateScope())
                {
                    var services = scope.ServiceProvider;
                    var db = services.GetRequiredService<RecipeDbContext>();
                    var serving = await db.SupperServings.SingleOrDefaultAsync(row => row.Date == date);
                    if (serving is null) db.SupperServings.Add(new SupperServing { Date = date, OverrideServings = target });
                    else serving.OverrideServings = target;
                    await db.SaveChangesAsync();
                    await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
                }
                await GroceryTestRows.CheckAsync(client, monday, "pasta");
                await GroceryTestRows.CheckAsync(client, monday, "sauce");
                var persistedBeforeReads = await PersistedState();
                var projected = await Get(datedPath);
                var repeated = await Get(datedPath);
                Assert.Equal(projected.GetProperty("version").GetString(), repeated.GetProperty("version").GetString());
                Assert.Equal(projected.GetProperty("contextKey").GetString(), repeated.GetProperty("contextKey").GetString());
                Assert.Equal(current.ContentRevision, projected.GetProperty("contentRevision").GetString());
                Assert.Equal(target, projected.GetProperty("targetServings").GetInt32());
                Assert.Equal(3, projected.GetProperty("baseServings").GetInt32());
                var preview = await Get($"/api/recipes/{Id}/ingredient-preview?targetServings=6");
                var savedRead = await Get($"/api/recipes/{Id}");
                var schedule = await GroceryTestRows.ReadAsync(client, monday);
                Assert.Equal(persistedBeforeReads, await PersistedState());
                Assert.Equal(canonicalSaved, JsonSerializer.Serialize(await ReadDeclaredPackageContent(factory), Json));
                Assert.Equal("⅓ cup finely chopped walnuts", savedRead.GetProperty("recipe").GetProperty("ingredients")[2].GetString());
                var garlic = Assert.Single(schedule.GetProperty("groceryItems").EnumerateArray(),
                    row => row.GetProperty("normalizedKey").GetString() == "garlic");
                Assert.False(garlic.GetProperty("quantityComplete").GetBoolean());
                Assert.Equal(LegacyGroceryQuantity.Parse(target == 5 ? "5–25/3" : "3–5"),
                    garlic.GetProperty("quantity").Deserialize<GroceryQuantity>(Json));
                output.WriteLine(JsonSerializer.Serialize(new { target, projected, preview,
                    garlic = garlic.Clone(), readOnlyPersistenceUnchanged = true }, Json));
                // Intended red is the actual public server field currently null, not internal exact arithmetic.
                Exact(Line(projected, 2), target == 5 ? "5/9 cup walnuts" : "1/3 cup walnuts", "⅓ cup finely chopped walnuts");
                Exact(Line(projected, 3), target == 5 ? "10/3–5 cloves garlic" : "2–3 cloves garlic", "2–3 cloves whole garlic cloves");
                Exact(Line(projected, 4), target == 5 ? "5/3–10/3 cloves garlic" : "1–2 cloves garlic", "1–2 cloves additional garlic cloves");
                Assert.Equal(JsonValueKind.Null, Line(projected, 3).GetProperty("quantity").ValueKind);
                Exact(Line(preview, 2), "2/3 cup walnuts", "⅓ cup finely chopped walnuts");
                Exact(Line(preview, 3), "4–6 cloves garlic", "2–3 cloves whole garlic cloves");
                Assert.Equal("unquantified", Line(projected, 5).GetProperty("status").GetString());
                Assert.Equal("cloves garlic to taste", Line(projected, 5).GetProperty("originalText").GetString());
                Assert.True(!Line(projected, 5).TryGetProperty("displayText", out var unknownText) || unknownText.ValueKind == JsonValueKind.Null);
                Assert.Equal("walnuts", Line(projected, 2).GetProperty("name").GetString());
            }
        });
    }
}
