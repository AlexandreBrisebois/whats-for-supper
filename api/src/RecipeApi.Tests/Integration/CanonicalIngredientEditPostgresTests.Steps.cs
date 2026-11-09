using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientEditPostgresTests
{
    internal static async Task<CanonicalRecipeContent> SeedCookingWholeUse(RecipeApi.Tests.Infrastructure.TestWebApplicationFactory factory, CanonicalRecipeContent before, bool preparedReading = false)
    {
            before = before with { ContentRevision = Guid.NewGuid().ToString("N") };
            var source = "Add 200 g pasta from a 400 g package; cook 20 minutes at 180 °C.";
            if (preparedReading) source += string.Concat(Enumerable.Repeat(" Keep stirring gently and consult the original recipe for equipment and timing.", 16));
            var step = before.InstructionSections[0].Steps[0];
            var binding = JsonSerializer.SerializeToElement(new
            {
                id = Guid.NewGuid(), ingredientLineId = before.IngredientLines[0].Id, stepId = step.Id,
                validatedContentRevision = before.ContentRevision, validatedTextRevision = step.TextRevision,
                span = new { start = 4, end = 9, expectedText = "200 g" }, role = "whole", payload = new { }, status = "validated"
            });
            var seeded = before with { InstructionSections = [before.InstructionSections[0] with
                { Steps = [step with { Text = source, Bindings = [binding] }] }] };
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                recipe.CanonicalContent = JsonSerializer.Serialize(seeded, Json);
                await db.SaveChangesAsync();
            }
            return seeded;
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CookingStepScalingPostgres_WholeUseTracksCorrectedTotalWithoutExtraDemand()
    {
        await WithEditor(async (factory, before) =>
        {
            before = await SeedCookingWholeUse(factory, before);
            const string source = "Add 200 g pasta from a 400 g package; cook 20 minutes at 180 °C.";
            using var client = factory.CreateAuthenticatedClient();
            var saved = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            { expectedContentRevision = before.ContentRevision, ingredientLines = new[] { Row(before.IngredientLines[0], "250"), Row(before.IngredientLines[1]) } });
            Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
            using var scope2 = factory.Services.CreateScope();
            var services = scope2.ServiceProvider;
            var current = CanonicalRecipeContentStore.Read(await services.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
            Assert.Equal(source, current.InstructionSections[0].Steps[0].Text);
            var date = new DateOnly(2026, 10, 13);
            // Test projection at eight through the existing dated serving configuration.
            var db2 = services.GetRequiredService<RecipeDbContext>();
            db2.FamilySettings.Add(new RecipeApi.Models.FamilySetting { Key = SupperServingsService.DefaultKey,
                Value = JsonSerializer.SerializeToElement(new { servings = 8, version = Guid.NewGuid() }) });
            await db2.SaveChangesAsync();
            var projection = await client.GetFromJsonAsync<JsonElement>($"/api/recipes/{Id}/ingredient-projection?supperDate={date:yyyy-MM-dd}&context=proposed");
            Assert.Equal(current.ContentRevision, projection.GetProperty("contentRevision").GetString());
            Assert.Equal(500, projection.GetProperty("lines")[0].GetProperty("quantity").GetDouble());
            var instructions = projection.GetProperty("instructionProjection");
            Assert.Equal("Add 500 g pasta from a 400 g package; cook 20 minutes at 180 °C.",
                instructions.GetProperty("sections")[0].GetProperty("steps")[0].GetProperty("text").GetString());
            Assert.Equal(1, instructions.GetProperty("validatedUses").GetInt32());
            Assert.Equal(0, instructions.GetProperty("uncertainUses").GetInt32());
            await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new DateOnly(2026, 10, 12), default);
            var plan = await db2.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == new DateOnly(2026, 10, 12));
            using var groceries = JsonDocument.Parse(plan.GroceryItems);
            var pasta = Assert.Single(groceries.RootElement.EnumerateArray(), x => x.GetProperty("normalizedKey").GetString() == "pasta");
            Assert.Equal("500", pasta.GetProperty("quantity").GetProperty("value").GetProperty("n").GetString());
        });
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CookingStepScalingPostgres_ConcurrentIngredientAndInstructionWritersCannotOverwriteWinner()
    {
        await WithEditor(async (factory, before) =>
        {
            before = await SeedCookingWholeUse(factory, before);
            using var ingredientClient = factory.CreateAuthenticatedClient();
            using var instructionClient = factory.CreateAuthenticatedClient();
            var section = before.InstructionSections[0];
            var instructionInput = new
            {
                expectedContentRevision = before.ContentRevision, name = "Instruction winner",
                instructionSections = new[] { new { id = section.Id, name = section.Name,
                    steps = section.Steps.Select(step => new { id = step.Id, text = "Stir gently." }).ToArray() } }
            };
            var writes = await Task.WhenAll(
                ingredientClient.PatchAsJsonAsync($"/api/recipes/{Id}", new
                {
                    expectedContentRevision = before.ContentRevision, name = "Ingredient winner",
                    ingredientLines = new[] { Row(before.IngredientLines[0], "250"), Row(before.IngredientLines[1]) }
                }),
                instructionClient.PatchAsJsonAsync($"/api/recipes/{Id}", instructionInput));
            Assert.Single(writes, reply => reply.StatusCode == HttpStatusCode.OK);
            Assert.Single(writes, reply => reply.StatusCode == HttpStatusCode.Conflict);
            var winner = Array.FindIndex(writes, reply => reply.StatusCode == HttpStatusCode.OK);
            var returned = (await writes[winner].Content.ReadFromJsonAsync<JsonElement>()).GetProperty("recipe");
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            var content = CanonicalRecipeContentStore.Read(saved)!;
            Assert.Equal(returned.GetProperty("contentRevision").GetString(), content.ContentRevision);
            Assert.NotEqual(before.ContentRevision, content.ContentRevision);
            Assert.Equal(winner == 0 ? "Ingredient winner" : "Instruction winner", saved.Name);
            Assert.Equal(winner == 0 ? "250" : "200", content.IngredientLines[0].AmountText);
            Assert.Equal(winner == 0 ? section.Steps[0].Text : "Stir gently.", content.InstructionSections[0].Steps[0].Text);
            Assert.Equal(section.Id, content.InstructionSections[0].Id);
            Assert.Equal(section.Steps[0].Id, content.InstructionSections[0].Steps[0].Id);
            Assert.Equal(before.SourceRevision, content.SourceRevision);
            var persisted = JsonSerializer.Serialize(saved);
            var operations = await db.CanonicalRecipeOperations.CountAsync();
            // Replaying the losing baseline and an unversioned writer cannot partially change even metadata.
            Assert.Equal(HttpStatusCode.Conflict, (await instructionClient.PatchAsJsonAsync($"/api/recipes/{Id}", instructionInput)).StatusCode);
            Assert.Equal(HttpStatusCode.Conflict, (await instructionClient.PatchAsJsonAsync($"/api/recipes/{Id}", new
            { name = "Must not save", instructionSections = instructionInput.instructionSections })).StatusCode);
            db.ChangeTracker.Clear();
            Assert.Equal(persisted, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)));
            Assert.Equal(operations, await db.CanonicalRecipeOperations.CountAsync());
            foreach (var reply in writes) reply.Dispose();
        });
    }

}
