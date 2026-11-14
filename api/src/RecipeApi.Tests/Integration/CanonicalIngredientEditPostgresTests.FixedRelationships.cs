using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientEditPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryFixedUse_GuardedSavePreservesFixedDoseThroughSmallerTotalsAndExplicitClears()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            async Task<CanonicalRecipeContent> Read()
            {
                using var scope = factory.Services.CreateScope();
                return CanonicalRecipeContentStore.Read(await scope.ServiceProvider.GetRequiredService<RecipeDbContext>()
                    .Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
            }
            const string fixedText = "For any number of portions, use exactly 1 tbsp oil.";
            object Steps(CanonicalRecipeContent current, string text) => new
            {
                expectedContentRevision = current.ContentRevision,
                instructionSections = new[] { new { id = current.InstructionSections[0].Id,
                    name = current.InstructionSections[0].Name,
                    steps = current.InstructionSections[0].Steps.Select((step, index) => new
                        { id = step.Id, text = index == 0 ? text : step.Text }).ToArray() } }
            };
            var oil = Row(before.IngredientLines[0], "2") with
            {
                Description = "oil", Unit = new("tbsp", null), Shopping = new("oil", null, null)
            };
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = before.ContentRevision,
                ingredientLines = new[] { oil, Row(before.IngredientLines[1]) },
                instructionSections = new[] { new { id = before.InstructionSections[0].Id, name = (string?)null,
                    steps = new object[] {
                        new { id = before.InstructionSections[0].Steps[0].Id, text = fixedText },
                        new { clientId = "independent-sauce", text = "Add all 100 ml sauce." } } } }
            })).StatusCode);
            var current = await Read();
            var binding = Assert.Single(current.InstructionSections[0].Steps[0].Bindings);
            Assert.Equal("fixed", binding.GetProperty("role").GetString());
            var fixedId = binding.GetProperty("id").GetGuid();
            var sauceId = Assert.Single(current.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid();
            var originalIds = current.InstructionSections[0].Steps.Select(step => step.Id).ToArray();
            foreach (var amount in new[] { "3", "1/2" })
            {
                Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
                {
                    expectedContentRevision = current.ContentRevision,
                    ingredientLines = new[] { Row(current.IngredientLines[0], amount), Row(current.IngredientLines[1]) }
                })).StatusCode);
                current = await Read();
                Assert.Equal(before.SourceRevision, current.SourceRevision);
                Assert.Equal(fixedId, Assert.Single(current.InstructionSections[0].Steps[0].Bindings).GetProperty("id").GetGuid());
                Assert.Equal(sauceId, Assert.Single(current.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid());
                foreach (var target in new[] { 6, 2, 4, 6 })
                {
                    var response = await client.GetFromJsonAsync<JsonElement>($"/api/recipes/{Id}/ingredient-preview?targetServings={target}");
                    var projection = response.GetProperty("instructionProjection");
                    Assert.Equal(current.ContentRevision, response.GetProperty("contentRevision").GetString());
                    Assert.Equal(2, projection.GetProperty("validatedUses").GetInt32());
                    Assert.Equal(fixedText, projection.GetProperty("sections")[0].GetProperty("steps")[0].GetProperty("text").GetString());
                }
                Assert.Equal(fixedText, current.InstructionSections[0].Steps[0].Text);
                Assert.Equal(originalIds, current.InstructionSections[0].Steps.Select(step => step.Id));
                Assert.Equal("human", current.IngredientLines[0].Provenance.Origin);
            }
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new { notes = "Unrelated note" })).StatusCode);
            Assert.Equal(current.ContentRevision, (await Read()).ContentRevision);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Steps(current, fixedText))).StatusCode);
            var unchanged = await Read();
            Assert.Equal(fixedId, Assert.Single(unchanged.InstructionSections[0].Steps[0].Bindings).GetProperty("id").GetGuid());
            using (var scope = factory.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                var db = services.GetRequiredService<RecipeDbContext>();
                db.FamilySettings.Add(new RecipeApi.Models.FamilySetting
                {
                    Key = SupperServingsService.DefaultKey,
                    Value = JsonSerializer.SerializeToElement(new { servings = 8, version = Guid.NewGuid() })
                });
                await db.SaveChangesAsync();
                var monday = new DateOnly(2026, 10, 12);
                await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
                var groceries = JsonSerializer.Deserialize<List<GroceryLineItemDto>>((await db.WeeklyPlans.AsNoTracking()
                    .SingleAsync(x => x.WeekStartDate == monday)).GroceryItems)!;
                Assert.Equal(LegacyGroceryQuantity.Parse("1"), Assert.Single(groceries,
                    row => row.NormalizedKey == "oil" && row.RecipeIds.Contains(Id)).ExactQuantity);
            }

            const string replacement = "For any number of portions, use exactly 1/2 tbsp oil.";
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Steps(unchanged, replacement))).StatusCode);
            current = await Read();
            var replacedId = Assert.Single(current.InstructionSections[0].Steps[0].Bindings).GetProperty("id").GetGuid();
            Assert.NotEqual(fixedId, replacedId);
            Assert.Equal(sauceId, Assert.Single(current.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid());
            Assert.Equal(HttpStatusCode.Conflict, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Steps(unchanged, fixedText))).StatusCode);
            Assert.Equal(current.ContentRevision, (await Read()).ContentRevision);

            var clear = Row(current.IngredientLines[0]) with { Amount = null, AmountText = null };
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = current.ContentRevision,
                ingredientLines = new[] { clear, Row(current.IngredientLines[1]) }
            })).StatusCode);
            current = await Read();
            Assert.Null(current.IngredientLines[0].Amount);
            Assert.Null(current.IngredientLines[0].AmountText);
            Assert.Equal(replacement, CookingStepProjection.Read(current, 8).Sections[0].Steps[0].Text);
            Assert.Equal(1, CookingStepProjection.Read(current, 8).ValidatedUses);
            Assert.Equal(sauceId, Assert.Single(current.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid());
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Steps(current, ""))).StatusCode);
            var cleared = await Read();
            Assert.Equal("", cleared.InstructionSections[0].Steps[0].Text);
            Assert.Empty(cleared.InstructionSections[0].Steps[0].Bindings);
            Assert.Null(cleared.IngredientLines[0].Amount);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryFixedUse_FrenchConcurrentEditsPreserveOneWinnerAndInvalidateChangedUnits()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            async Task<CanonicalRecipeContent> Read()
            {
                using var scope = factory.Services.CreateScope();
                return CanonicalRecipeContentStore.Read(await scope.ServiceProvider.GetRequiredService<RecipeDbContext>()
                    .Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
            }
            const string fixedText = "Quel que soit le nombre de portions, utilisez exactement 1 c. à soupe d’huile.";
            const string correctedText = "Quel que soit le nombre de portions, utilisez exactement 1/2 c. à soupe d’huile.";
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = before.ContentRevision,
                ingredientLines = new[] { Row(before.IngredientLines[0], "2") with
                { Description = "huile", Unit = new("c. à soupe", null), Shopping = new("huile", null, null) }, Row(before.IngredientLines[1]) },
                instructionSections = new[] { new { id = before.InstructionSections[0].Id, name = (string?)null,
                    steps = new object[] {
                        new { id = before.InstructionSections[0].Steps[0].Id, text = fixedText },
                        new { clientId = "independent-sauce", text = "Add all 100 ml sauce." } } } }
            })).StatusCode);
            var current = await Read();
            Assert.Equal("fixed", Assert.Single(current.InstructionSections[0].Steps[0].Bindings).GetProperty("role").GetString());
            var sauceId = Assert.Single(current.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid();
            var section = current.InstructionSections[0];
            var stepInput = new
            {
                expectedContentRevision = current.ContentRevision, name = "Instruction winner",
                instructionSections = new[] { new { id = section.Id, name = section.Name,
                    steps = section.Steps.Select((step, index) => new
                    { id = step.Id, text = index == 0 ? correctedText : step.Text }).ToArray() } }
            };
            using var other = factory.CreateAuthenticatedClient();
            var writes = await Task.WhenAll(
                client.PatchAsJsonAsync($"/api/recipes/{Id}", new
                {
                    expectedContentRevision = current.ContentRevision, name = "Ingredient winner",
                    ingredientLines = new[] { Row(current.IngredientLines[0], "1/2"), Row(current.IngredientLines[1]) }
                }), other.PatchAsJsonAsync($"/api/recipes/{Id}", stepInput));
            Assert.Single(writes, reply => reply.StatusCode == HttpStatusCode.OK);
            Assert.Single(writes, reply => reply.StatusCode == HttpStatusCode.Conflict);
            var winner = Array.FindIndex(writes, reply => reply.StatusCode == HttpStatusCode.OK);
            using var readScope = factory.Services.CreateScope();
            var db = readScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            current = CanonicalRecipeContentStore.Read(saved)!;
            Assert.Equal(winner == 0 ? "Ingredient winner" : "Instruction winner", saved.Name);
            Assert.Equal(winner == 0 ? "1/2" : "2", current.IngredientLines[0].AmountText);
            Assert.Equal(winner == 0 ? fixedText : correctedText, current.InstructionSections[0].Steps[0].Text);
            Assert.Equal(2, CookingStepProjection.Read(current, 8).ValidatedUses);
            Assert.Equal(before.SourceRevision, current.SourceRevision);
            var preserved = JsonSerializer.Serialize(saved);
            var operations = await db.CanonicalRecipeOperations.CountAsync();
            Assert.Equal(HttpStatusCode.Conflict, (await other.PatchAsJsonAsync($"/api/recipes/{Id}", stepInput)).StatusCode);
            db.ChangeTracker.Clear();
            Assert.Equal(preserved, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)));
            Assert.Equal(operations, await db.CanonicalRecipeOperations.CountAsync());
            foreach (var response in writes) response.Dispose();

            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = current.ContentRevision,
                ingredientLines = new[] { Row(current.IngredientLines[0]) with { Unit = new("tsp", null) }, Row(current.IngredientLines[1]) }
            })).StatusCode);
            var changed = await Read();
            Assert.Equal(current.InstructionSections[0].Steps[0].Text, CookingStepProjection.Read(changed, 8).Sections[0].Steps[0].Text);
            Assert.Equal(1, CookingStepProjection.Read(changed, 8).ValidatedUses);
            Assert.Equal(sauceId, Assert.Single(changed.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid());
        });
    }
}
