using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientEditPostgresTests
{
    private static async Task<CanonicalRecipeContent> SeedCookingAllocation(TestWebApplicationFactory factory, CanonicalRecipeContent before, bool splitOil, bool exhaustive = false)
    {
        var row = before.IngredientLines[0] with
        {
            Description = splitOil ? "oil" : "pasta", Amount = LegacyGroceryQuantity.Parse(splitOil ? "2" : "200"),
            AmountText = splitOil ? "2" : "200", Unit = new(splitOil ? "tbsp" : "g", null),
            Shopping = new(splitOil ? "oil" : "pasta", null, null)
        };
        var revision = Guid.NewGuid().ToString("N");
        var steps = Enumerable.Range(0, splitOil ? 2 : 1).Select(index =>
        {
            var step = new RecipeInstructionStepDto(Guid.NewGuid(), splitOil ?
                (index == 0 ? "Heat 1 tbsp oil." : "Finish with 1 tbsp oil.") :
                "Add 50 g pasta from a 400 g package; cook 20 minutes at 180 °C.", Guid.NewGuid().ToString("N"), []);
            var expected = splitOil ? "1 tbsp" : "50 g";
            var start = step.Text.IndexOf(expected, StringComparison.Ordinal);
            return step with { Bindings = [JsonSerializer.SerializeToElement(new
            {
                id = Guid.NewGuid(), ingredientLineId = row.Id, stepId = step.Id,
                validatedContentRevision = revision, validatedTextRevision = step.TextRevision,
                span = new { start, end = start + expected.Length, expectedText = expected }, role = "absolute",
                payload = new { amount = LegacyGroceryQuantity.Parse(splitOil ? "1" : "50"), unit = row.Unit }, status = "validated"
            }, Json)] };
        }).ToArray();
        if (exhaustive)
        {
            var group = new { id = Guid.NewGuid(), exhaustive = true,
                bindingIds = steps.Select(x => x.Bindings[0].GetProperty("id").GetGuid()).ToArray() };
            steps = steps.Select(step => step with { Bindings = step.Bindings.Select(raw => {
                var node = System.Text.Json.Nodes.JsonNode.Parse(raw.GetRawText())!;
                node["payload"]!["allocationGroup"] = JsonSerializer.SerializeToNode(group, Json);
                return JsonSerializer.SerializeToElement(node, Json);
            }).ToArray() }).ToArray();
        }
        var seeded = before with { ContentRevision = revision, IngredientLines = [row, before.IngredientLines[1]],
            InstructionSections = [before.InstructionSections[0] with { Steps = steps }] };
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
        recipe.CanonicalContent = JsonSerializer.Serialize(seeded, Json);
        recipe.Ingredients = JsonSerializer.Serialize(seeded.IngredientLines.Select(CanonicalRecipeContentStore.Render));
        await db.SaveChangesAsync();
        return seeded;
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task CookingStepScalingPostgres_SplitOilCountsIngredientDemandOnce() => CheckCookingAllocation(true);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task CookingStepScalingPostgres_CorrectedTotalPreservesExplicitPartialUse() => CheckCookingAllocation(false);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CookingStepScalingPostgres_ReducedExhaustiveTotalRetainsOriginalUses()
    {
        await WithEditor(async (factory, before) =>
        {
            before = await SeedCookingAllocation(factory, before, true, exhaustive: true);
            using var client = factory.CreateAuthenticatedClient();
            Assert.Equal(2, CookingStepProjection.Read(before, 8).ValidatedUses);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new {
                expectedContentRevision = before.ContentRevision,
                ingredientLines = new[] { Row(before.IngredientLines[0], "1"), Row(before.IngredientLines[1]) }
            })).StatusCode);
            var projection = await client.GetFromJsonAsync<JsonElement>($"/api/recipes/{Id}/ingredient-preview?targetServings=6");
            var instructions = projection.GetProperty("instructionProjection");
            Assert.Equal(0, instructions.GetProperty("validatedUses").GetInt32());
            Assert.Equal(2, instructions.GetProperty("uncertainUses").GetInt32());
            Assert.Equal("Heat 1 tbsp oil.", instructions.GetProperty("sections")[0].GetProperty("steps")[0].GetProperty("text").GetString());
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var current = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
            Assert.Equal(before.InstructionSections[0].Steps.Select(x => x.Text), current.InstructionSections[0].Steps.Select(x => x.Text));
            Assert.All(current.InstructionSections[0].Steps, step => Assert.Equal("1", step.Bindings[0].GetProperty("payload").GetProperty("amount").GetProperty("value").GetProperty("n").GetString()));
        });
    }

    private async Task CheckCookingAllocation(bool splitOil)
    {
        await WithEditor(async (factory, before) =>
        {
            before = await SeedCookingAllocation(factory, before, splitOil);
            using var client = factory.CreateAuthenticatedClient();
            if (!splitOil)
                Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
                { expectedContentRevision = before.ContentRevision, ingredientLines = new[] { Row(before.IngredientLines[0], "250"), Row(before.IngredientLines[1]) } })).StatusCode);
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            var current = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
            Assert.Equal(before.InstructionSections[0].Steps.Select(x => x.Text), current.InstructionSections[0].Steps.Select(x => x.Text));
            db.FamilySettings.Add(new RecipeApi.Models.FamilySetting { Key = SupperServingsService.DefaultKey,
                Value = JsonSerializer.SerializeToElement(new { servings = splitOil ? 8 : 6, version = Guid.NewGuid() }) });
            await db.SaveChangesAsync();
            var projection = await client.GetFromJsonAsync<JsonElement>($"/api/recipes/{Id}/ingredient-projection?supperDate=2026-10-13&context=proposed");
            Assert.Equal(current.ContentRevision, projection.GetProperty("contentRevision").GetString());
            Assert.Equal(splitOil ? 4 : 375, projection.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
            var instructions = projection.GetProperty("instructionProjection");
            Assert.Equal(splitOil ? 2 : 1, instructions.GetProperty("validatedUses").GetInt32());
            Assert.Equal(0, instructions.GetProperty("uncertainUses").GetInt32());
            var projected = instructions.GetProperty("sections")[0].GetProperty("steps");
            Assert.Equal(splitOil ? "Heat 2 tbsp oil." : "Add 75 g pasta from a 400 g package; cook 20 minutes at 180 °C.", projected[0].GetProperty("text").GetString());
            if (splitOil) Assert.Equal("Finish with 2 tbsp oil.", projected[1].GetProperty("text").GetString());
            else Assert.Equal("50", current.InstructionSections[0].Steps[0].Bindings[0].GetProperty("payload").GetProperty("amount").GetProperty("value").GetProperty("n").GetString());
            await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new DateOnly(2026, 10, 12), default);
            var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == new DateOnly(2026, 10, 12));
            using var groceries = JsonDocument.Parse(plan.GroceryItems);
            var row = Assert.Single(groceries.RootElement.EnumerateArray(), x => x.GetProperty("normalizedKey").GetString() == (splitOil ? "oil" : "pasta"));
            Assert.Equal(splitOil ? "4" : "375", row.GetProperty("quantity").GetProperty("value").GetProperty("n").GetString());
        });
    }
}
