using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
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
    private static async Task<CanonicalRecipeContent> SeedCookingFixed(TestWebApplicationFactory factory, CanonicalRecipeContent before)
    {
        before = await SeedCookingAllocation(factory, before, true);
        var steps = before.InstructionSections[0].Steps.ToArray();
        var node = JsonNode.Parse(steps[0].Bindings[0].GetRawText())!;
        node["role"] = "fixed";
        node["span"] = JsonSerializer.SerializeToNode(new { start = 5, end = 13, expectedText = "one tbsp" });
        steps[0] = steps[0] with { Text = "Heat one tbsp oil from a 400 g package; cook 20 minutes at 180 °C.", Bindings = [JsonSerializer.SerializeToElement(node, Json)] };
        var revision = Guid.NewGuid().ToString("N");
        steps = steps.Select(step => step with { Bindings = step.Bindings.Select(raw => {
            var value = JsonNode.Parse(raw.GetRawText())!; value["validatedContentRevision"] = revision;
            return JsonSerializer.SerializeToElement(value, Json);
        }).ToArray() }).ToArray();
        var content = before with { ContentRevision = revision, IngredientLines = [before.IngredientLines[0]], InstructionSections = [before.InstructionSections[0] with { Steps = steps }] };
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
        recipe.CanonicalContent = JsonSerializer.Serialize(content, Json);
        recipe.Ingredients = JsonSerializer.Serialize(content.IngredientLines.Select(CanonicalRecipeContentStore.Render));
        await db.SaveChangesAsync(); return content;
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CookingStepScalingPostgres_StandaloneFixedSurvivesGuardedTotalAndRejectsChangedUnit()
    {
        await WithEditor(async (factory, before) => {
            before = await SeedCookingFixed(factory, before); var current = before;
            using var client = factory.CreateAuthenticatedClient();
            foreach (var phase in new[] { "original", "corrected", "uncertain" }) {
                if (phase != "original") {
                    var row = Row(current.IngredientLines[0], "3");
                    if (phase == "uncertain") row = row with { Unit = new("tsp", null) };
                    var response = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new {
                        expectedContentRevision = current.ContentRevision, ingredientLines = new[] { row }
                    });
                    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                    using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                    current = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
                    Assert.Equal(HttpStatusCode.Conflict, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new {
                        expectedContentRevision = before.ContentRevision, ingredientLines = new[] { Row(before.IngredientLines[0], "9") }
                    })).StatusCode);
                }
                foreach (var target in new[] { 6, 4, 2, 6 }) {
                    var preview = await client.GetFromJsonAsync<JsonElement>($"/api/recipes/{Id}/ingredient-preview?targetServings={target}");
                    var projection = preview.GetProperty("instructionProjection");
                    Assert.Equal(phase == "uncertain" ? 0 : 2, projection.GetProperty("validatedUses").GetInt32());
                    Assert.Equal(phase == "uncertain" ? 2 : 0, projection.GetProperty("uncertainUses").GetInt32());
                    Assert.Equal(before.InstructionSections[0].Steps[0].Text, projection.GetProperty("sections")[0].GetProperty("steps")[0].GetProperty("text").GetString());
                    if (phase != "uncertain") Assert.Equal(target == 6 ? "Finish with 3/2 tbsp oil." : target == 4 ? "Finish with 1 tbsp oil." : "Finish with 1/2 tbsp oil.", projection.GetProperty("sections")[0].GetProperty("steps")[1].GetProperty("text").GetString());
                }
                Assert.Equal(before.InstructionSections[0].Steps.Select(x => (x.Id, x.Text)), current.InstructionSections[0].Steps.Select(x => (x.Id, x.Text)));
                Assert.Equal(before.InstructionSections[0].Steps[0].Bindings[0].GetProperty("id").GetGuid(), current.InstructionSections[0].Steps[0].Bindings[0].GetProperty("id").GetGuid());
                Assert.True(JsonElement.DeepEquals(before.InstructionSections[0].Steps[0].Bindings[0].GetProperty("payload"), current.InstructionSections[0].Steps[0].Bindings[0].GetProperty("payload")));
            }
        });
    }
}
