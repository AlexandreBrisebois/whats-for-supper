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
    private static async Task<CanonicalRecipeContent> SeedCookingPerItem(TestWebApplicationFactory factory, CanonicalRecipeContent before)
    {
        var revision = Guid.NewGuid().ToString("N"); var countId = Guid.NewGuid();
        var count = before.IngredientLines[0] with { Description = "pieces", Amount = LegacyGroceryQuantity.Parse("4"), AmountText = "4",
            Unit = new("pieces", null), Shopping = new("pieces", null, null) };
        var oil = before.IngredientLines[1] with { Description = "oil", Amount = LegacyGroceryQuantity.Parse("2"), AmountText = "2",
            Unit = new("tsp", null), Shopping = new("oil", null, null) };
        var step = new RecipeInstructionStepDto(Guid.NewGuid(),
            "Spread 1/2 tsp on each of 4 pieces from a 400 g package; cook 20 minutes at 180 °C in a 20 cm pan.", Guid.NewGuid().ToString("N"), []);
        step = step with { Bindings = [JsonSerializer.SerializeToElement(new { id = countId, ingredientLineId = count.Id, stepId = step.Id,
            validatedContentRevision = revision, validatedTextRevision = step.TextRevision,
            span = new { start = 26, end = 34, expectedText = "4 pieces" }, role = "whole", payload = new { }, status = "validated" }, Json),
            JsonSerializer.SerializeToElement(new { id = Guid.NewGuid(), ingredientLineId = oil.Id, stepId = step.Id,
            validatedContentRevision = revision, validatedTextRevision = step.TextRevision,
            span = new { start = 7, end = 14, expectedText = "1/2 tsp" }, role = "perItem",
            payload = new { dose = new { amount = LegacyGroceryQuantity.Parse("1/2"), unit = oil.Unit }, countBindingId = countId }, status = "validated" }, Json)] };
        var seeded = before with { ContentRevision = revision, IngredientLines = [count, oil],
            InstructionSections = [before.InstructionSections[0] with { Steps = [step] }] };
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
        recipe.CanonicalContent = JsonSerializer.Serialize(seeded, Json);
        recipe.Ingredients = JsonSerializer.Serialize(seeded.IngredientLines.Select(CanonicalRecipeContentStore.Render));
        await db.SaveChangesAsync(); return seeded;
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CookingStepScalingPostgres_PerItemPreservesDoseThroughCountAndTotalEdits()
    {
        await WithEditor(async (factory, before) => {
            before = await SeedCookingPerItem(factory, before); var current = before;
            using var client = factory.CreateAuthenticatedClient();
            foreach (var count in new[] { "4", "6" }) {
                if (count == "6") Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new {
                    expectedContentRevision = current.ContentRevision, ingredientLines = new[] { Row(current.IngredientLines[0], count), Row(current.IngredientLines[1], "3") }
                })).StatusCode);
                using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                current = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
                foreach (var target in new[] { 6, 4, 2 }) {
                    var preview = await client.GetFromJsonAsync<JsonElement>($"/api/recipes/{Id}/ingredient-preview?targetServings={target}");
                    var projection = preview.GetProperty("instructionProjection");
                    Assert.Equal(2, projection.GetProperty("validatedUses").GetInt32());
                    Assert.Equal(0, projection.GetProperty("uncertainUses").GetInt32());
                    var expectedCount = CanonicalRecipeContentStore.Render(current.IngredientLines[0] with { Amount = LegacyGroceryQuantity.Scale(current.IngredientLines[0].Amount, target, 4), Description = "", AmountText = null }).TrimEnd();
                    Assert.Equal(before.InstructionSections[0].Steps[0].Text.Replace("4 pieces", expectedCount), projection.GetProperty("sections")[0].GetProperty("steps")[0].GetProperty("text").GetString());
                }
                Assert.Equal(before.InstructionSections[0].Steps[0].Text, current.InstructionSections[0].Steps[0].Text);
                Assert.Equal(before.InstructionSections[0].Steps[0].Bindings.Select(x => x.GetProperty("id").GetGuid()), current.InstructionSections[0].Steps[0].Bindings.Select(x => x.GetProperty("id").GetGuid()));
                Assert.True(JsonElement.DeepEquals(before.InstructionSections[0].Steps[0].Bindings[1].GetProperty("payload"), current.InstructionSections[0].Steps[0].Bindings[1].GetProperty("payload")));
            }
        });
    }
}
