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
    public async Task OrdinaryRemainderUse_GuardedSaveCarriesCorrectsReplacesAndClearsOriginalSequence()
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
            object Steps(CanonicalRecipeContent current, string final = "Finally, use all the remaining oil.") => new
            {
                expectedContentRevision = current.ContentRevision,
                instructionSections = new[] { new { id = current.InstructionSections[0].Id,
                    name = current.InstructionSections[0].Name,
                    steps = current.InstructionSections[0].Steps.Select((step, index) => new
                        { id = step.Id, text = index == 1 ? final : step.Text }).ToArray() } }
            };
            var oil = new RecipeIngredientLineInput
            {
                Id = before.IngredientLines[0].Id, Description = "oil", Amount = LegacyGroceryQuantity.Parse("2"), AmountText = "2",
                Unit = new("tbsp", null), Scaling = "proportional", Package = null, Shopping = new("oil", null, null)
            };
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = before.ContentRevision,
                ingredientLines = new[] { oil, Row(before.IngredientLines[1]) },
                instructionSections = new[] { new { id = before.InstructionSections[0].Id, name = (string?)null,
                    steps = new object[] {
                        new { id = before.InstructionSections[0].Steps[0].Id, text = "Use 1 tbsp oil." },
                        new { clientId = "final-oil", text = "Finally, use all the remaining oil." },
                        new { clientId = "independent-sauce", text = "Add all 100 ml sauce." } } } }
            })).StatusCode);
            var discovered = await Read();
            var originals = discovered.InstructionSections[0].Steps.Select(step => step.Text).ToArray();
            var ids = discovered.InstructionSections[0].Steps.Select(step => Assert.Single(step.Bindings).GetProperty("id").GetGuid()).ToArray();
            Assert.Equal(new[] { "absolute", "remainder", "whole" }, discovered.InstructionSections[0].Steps
                .Select(step => Assert.Single(step.Bindings).GetProperty("role").GetString()));
            var projection = CookingStepProjection.Read(discovered, 8);
            Assert.Equal(3, projection.ValidatedUses);
            Assert.Equal(new[] { "Use 2 tbsp oil.", "Finally, use all the remaining (2 tbsp) oil.", "Add all 200 ml sauce." },
                projection.Sections[0].Steps.Select(step => step.Text));

            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            { expectedContentRevision = discovered.ContentRevision,
                ingredientLines = new[] { Row(discovered.IngredientLines[0], "3"), Row(discovered.IngredientLines[1]) } })).StatusCode);
            var corrected = await Read();
            Assert.Equal(before.SourceRevision, corrected.SourceRevision);
            Assert.Equal(originals, corrected.InstructionSections[0].Steps.Select(step => step.Text));
            Assert.Equal(ids, corrected.InstructionSections[0].Steps.Select(step => Assert.Single(step.Bindings).GetProperty("id").GetGuid()));
            Assert.Equal("Use 2 tbsp oil.", CookingStepProjection.Read(corrected, 8).Sections[0].Steps[0].Text);
            Assert.Equal("Finally, use all the remaining (4 tbsp) oil.", CookingStepProjection.Read(corrected, 8).Sections[0].Steps[1].Text);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new { notes = "Unrelated note" })).StatusCode);
            Assert.Equal(corrected.ContentRevision, (await Read()).ContentRevision);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Steps(corrected))).StatusCode);
            var unchanged = await Read();
            Assert.Equal(ids, unchanged.InstructionSections[0].Steps.Select(step => Assert.Single(step.Bindings).GetProperty("id").GetGuid()));

            using (var scope = factory.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                var db = services.GetRequiredService<RecipeDbContext>();
                db.FamilySettings.Add(new RecipeApi.Models.FamilySetting
                { Key = SupperServingsService.DefaultKey, Value = JsonSerializer.SerializeToElement(new { servings = 8, version = Guid.NewGuid() }) });
                await db.SaveChangesAsync();
                var monday = new DateOnly(2026, 10, 12);
                await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
                var groceries = JsonSerializer.Deserialize<List<GroceryLineItemDto>>((await db.WeeklyPlans.AsNoTracking()
                    .SingleAsync(x => x.WeekStartDate == monday)).GroceryItems)!;
                Assert.Equal(LegacyGroceryQuantity.Parse("6"), Assert.Single(groceries,
                    row => row.NormalizedKey == "oil" && row.RecipeIds.Contains(Id)).ExactQuantity);
            }

            const string replacement = "Finally, add all the remaining oil.";
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Steps(unchanged, replacement))).StatusCode);
            var edited = await Read();
            Assert.NotEqual(ids[1], Assert.Single(edited.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid());
            Assert.Equal(ids[2], Assert.Single(edited.InstructionSections[0].Steps[2].Bindings).GetProperty("id").GetGuid());
            Assert.Equal("Finally, add all the remaining (4 tbsp) oil.", CookingStepProjection.Read(edited, 8).Sections[0].Steps[1].Text);
            Assert.Equal(HttpStatusCode.Conflict, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Steps(unchanged))).StatusCode);
            Assert.Equal(edited.ContentRevision, (await Read()).ContentRevision);

            foreach (var amount in new[] { "1", "1/2" })
            {
                Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
                { expectedContentRevision = edited.ContentRevision,
                    ingredientLines = new[] { Row(edited.IngredientLines[0], amount), Row(edited.IngredientLines[1]) } })).StatusCode);
                edited = await Read();
                var result = CookingStepProjection.Read(edited, 8);
                Assert.Equal(amount == "1" ? 3 : 1, result.ValidatedUses);
                Assert.Equal(amount == "1" ? "Finally, add all the remaining (0 tbsp) oil." : replacement,
                    result.Sections[0].Steps[1].Text);
                Assert.Equal(amount == "1" ? "Use 2 tbsp oil." : originals[0], result.Sections[0].Steps[0].Text);
                Assert.Equal("Add all 200 ml sauce.", result.Sections[0].Steps[2].Text);
                Assert.Equal(ids[2], Assert.Single(edited.InstructionSections[0].Steps[2].Bindings).GetProperty("id").GetGuid());
            }
            var clearAmount = Row(edited.IngredientLines[0]) with { Amount = null, AmountText = null };
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = edited.ContentRevision,
                ingredientLines = new[] { clearAmount, Row(edited.IngredientLines[1]) }
            })).StatusCode);
            edited = await Read();
            Assert.Null(edited.IngredientLines[0].Amount);
            Assert.Null(edited.IngredientLines[0].AmountText);
            Assert.Equal("human", edited.IngredientLines[0].Provenance.Origin);
            Assert.Equal(originals[0], CookingStepProjection.Read(edited, 8).Sections[0].Steps[0].Text);
            Assert.Equal(replacement, CookingStepProjection.Read(edited, 8).Sections[0].Steps[1].Text);
            Assert.Equal(ids[2], Assert.Single(edited.InstructionSections[0].Steps[2].Bindings).GetProperty("id").GetGuid());
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Steps(edited, ""))).StatusCode);
            var cleared = await Read();
            Assert.Empty(cleared.InstructionSections[0].Steps[1].Bindings);
            Assert.Equal("", cleared.InstructionSections[0].Steps[1].Text);
            Assert.Null(cleared.IngredientLines[0].AmountText);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryRemainderUse_FrenchConcurrentWritersPreserveOneAtomicWinnerAndRejectStaleReplay()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = before.ContentRevision,
                ingredientLines = new[] { Row(before.IngredientLines[0], "2") with
                { Description = "huile", Unit = new("tbsp", null), Shopping = new("huile", null, null) }, Row(before.IngredientLines[1]) },
                instructionSections = new[] { new { id = before.InstructionSections[0].Id, name = (string?)null,
                    steps = new object[] {
                        new { id = before.InstructionSections[0].Steps[0].Id, text = "Utilisez 1 tbsp d’huile." },
                        new { clientId = "huile-finale", text = "Enfin, utilisez tout le reste d’huile." } } } }
            })).StatusCode);
            CanonicalRecipeContent current;
            using (var scope = factory.Services.CreateScope())
                current = CanonicalRecipeContentStore.Read(await scope.ServiceProvider.GetRequiredService<RecipeDbContext>()
                    .Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
            Assert.Equal(2, CookingStepProjection.Read(current, 8).ValidatedUses);
            Assert.Equal("Enfin, utilisez tout le reste (2 tbsp) d’huile.", CookingStepProjection.Read(current, 8).Sections[0].Steps[1].Text);
            var section = current.InstructionSections[0];
            var stepInput = new
            {
                expectedContentRevision = current.ContentRevision, name = "Instruction winner",
                instructionSections = new[] { new { id = section.Id, name = section.Name,
                    steps = section.Steps.Select((step, index) => new
                    { id = step.Id, text = index == 0 ? "Utilisez 0.5 tbsp d’huile." : step.Text }).ToArray() } }
            };
            using var other = factory.CreateAuthenticatedClient();
            var writes = await Task.WhenAll(
                client.PatchAsJsonAsync($"/api/recipes/{Id}", new
                {
                    expectedContentRevision = current.ContentRevision, name = "Ingredient winner",
                    ingredientLines = new[] { Row(current.IngredientLines[0], "3"), Row(current.IngredientLines[1]) }
                }), other.PatchAsJsonAsync($"/api/recipes/{Id}", stepInput));
            Assert.Single(writes, reply => reply.StatusCode == HttpStatusCode.OK);
            Assert.Single(writes, reply => reply.StatusCode == HttpStatusCode.Conflict);
            var winner = Array.FindIndex(writes, reply => reply.StatusCode == HttpStatusCode.OK);
            using var readScope = factory.Services.CreateScope();
            var db = readScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            var content = CanonicalRecipeContentStore.Read(saved)!;
            Assert.Equal(winner == 0 ? "Ingredient winner" : "Instruction winner", saved.Name);
            Assert.Equal(winner == 0 ? "3" : "2", content.IngredientLines[0].AmountText);
            Assert.Equal(winner == 0 ? "Utilisez 1 tbsp d’huile." : "Utilisez 0.5 tbsp d’huile.", content.InstructionSections[0].Steps[0].Text);
            Assert.Equal(section.Steps.Select(step => step.Id), content.InstructionSections[0].Steps.Select(step => step.Id));
            Assert.Equal(before.SourceRevision, content.SourceRevision);
            Assert.Equal(2, CookingStepProjection.Read(content, 8).ValidatedUses);
            Assert.Equal(winner == 0 ? "Enfin, utilisez tout le reste (4 tbsp) d’huile." : "Enfin, utilisez tout le reste (3 tbsp) d’huile.",
                CookingStepProjection.Read(content, 8).Sections[0].Steps[1].Text);
            var preserved = JsonSerializer.Serialize(saved);
            var operations = await db.CanonicalRecipeOperations.CountAsync();
            Assert.Equal(HttpStatusCode.Conflict, (await other.PatchAsJsonAsync($"/api/recipes/{Id}", stepInput)).StatusCode);
            db.ChangeTracker.Clear();
            Assert.Equal(preserved, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)));
            Assert.Equal(operations, await db.CanonicalRecipeOperations.CountAsync());
            foreach (var response in writes) response.Dispose();
        });
    }

}
