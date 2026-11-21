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
    private static async Task<CanonicalRecipeContent> SeedCookingRemainder(TestWebApplicationFactory factory, CanonicalRecipeContent before)
    {
        before = await SeedCookingAllocation(factory, before, true);
        var revision = Guid.NewGuid().ToString("N");
        var steps = before.InstructionSections[0].Steps.ToArray();
        var ids = steps.Select(step => step.Bindings[0].GetProperty("id").GetGuid()).ToArray();
        var group = new { id = Guid.NewGuid(), exhaustive = true, bindingIds = ids };
        steps = steps.Select((step, index) => {
            var node = System.Text.Json.Nodes.JsonNode.Parse(step.Bindings[0].GetRawText())!;
            node["validatedContentRevision"] = revision;
            node["payload"]!["allocationGroup"] = JsonSerializer.SerializeToNode(group, Json);
            if (index == 1) {
                node["role"] = "remainder";
                node["payload"] = JsonSerializer.SerializeToNode(new { allocationGroup = group, allocationGroupId = group.id, predecessors = new[] { ids[0] } }, Json);
                node["span"] = JsonSerializer.SerializeToNode(new { start = 8, end = 17, expectedText = "remaining" }, Json);
            }
            return step with { Text = index == 1 ? "Use the remaining oil; cook 20 minutes at 180 °C." : step.Text,
                Bindings = [JsonSerializer.SerializeToElement(node, Json)] };
        }).ToArray();
        var seeded = before with { ContentRevision = revision, InstructionSections = [before.InstructionSections[0] with { Steps = steps }] };
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
        recipe.CanonicalContent = JsonSerializer.Serialize(seeded, Json);
        await db.SaveChangesAsync();
        return seeded;
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CookingStepScalingPostgres_RemainderFollowsCorrectedTotalAndInvalidatesReduction()
    {
        await WithEditor(async (factory, before) => {
            before = await SeedCookingRemainder(factory, before);
            using var client = factory.CreateAuthenticatedClient();
            var current = before;
            foreach (var total in new[] { "2", "3", "1/2" }) {
                if (total != "2") {
                    var saved = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new {
                        expectedContentRevision = current.ContentRevision,
                        ingredientLines = new[] { Row(current.IngredientLines[0], total), Row(current.IngredientLines[1]) }
                    });
                    Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
                }
                using var scope = factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                current = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
                var projection = await client.GetFromJsonAsync<JsonElement>($"/api/recipes/{Id}/ingredient-preview?targetServings=6");
                var instructions = projection.GetProperty("instructionProjection");
                Assert.Equal(total == "1/2" ? 0 : 2, instructions.GetProperty("validatedUses").GetInt32());
                Assert.Equal(total == "1/2" ? 2 : 0, instructions.GetProperty("uncertainUses").GetInt32());
                var text = instructions.GetProperty("sections")[0].GetProperty("steps")[1].GetProperty("text").GetString();
                Assert.Equal(total == "1/2" ? before.InstructionSections[0].Steps[1].Text :
                    $"Use the remaining ({(total == "2" ? "3/2" : "3")} tbsp) oil; cook 20 minutes at 180 °C.", text);
                Assert.Equal(before.InstructionSections[0].Steps.Select(x => x.Id), current.InstructionSections[0].Steps.Select(x => x.Id));
                Assert.Equal(before.InstructionSections[0].Steps.Select(x => x.Text), current.InstructionSections[0].Steps.Select(x => x.Text));
                Assert.True(JsonElement.DeepEquals(before.InstructionSections[0].Steps[1].Bindings[0].GetProperty("payload"), current.InstructionSections[0].Steps[1].Bindings[0].GetProperty("payload")));
            }
        });
    }
}
