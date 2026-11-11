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
    public async Task OrdinaryFractionUse_GuardedEditsDiscoverCarryReplaceAndClearWithoutChangingOriginals()
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
            object Instructions(CanonicalRecipeContent content, string text) => new
            {
                expectedContentRevision = content.ContentRevision,
                instructionSections = new[] { new { id = content.InstructionSections[0].Id,
                    name = content.InstructionSections[0].Name,
                    steps = new[] { new { id = content.InstructionSections[0].Steps[0].Id, text } } } }
            };
            const string original = "Add half of the pasta (100 g).";
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Instructions(before, original))).StatusCode);
            var discovered = await Read();
            var binding = Assert.Single(discovered.InstructionSections[0].Steps[0].Bindings);
            Assert.Equal("fraction", binding.GetProperty("role").GetString());
            var bindingId = binding.GetProperty("id").GetGuid();
            Assert.Equal("2", binding.GetProperty("payload").GetProperty("fraction").GetProperty("d").GetString());
            Assert.Equal(original, discovered.InstructionSections[0].Steps[0].Text);
            Assert.Equal("Add half of the pasta (150 g).", CookingStepProjection.Read(discovered, 6).Sections[0].Steps[0].Text);

            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = discovered.ContentRevision,
                ingredientLines = new[] { Row(discovered.IngredientLines[0], "250"), Row(discovered.IngredientLines[1]) }
            })).StatusCode);
            var corrected = await Read();
            Assert.Equal(original, corrected.InstructionSections[0].Steps[0].Text);
            Assert.Equal(bindingId, Assert.Single(corrected.InstructionSections[0].Steps[0].Bindings).GetProperty("id").GetGuid());
            Assert.Equal("100", corrected.IngredientLines[1].AmountText);
            Assert.Equal(before.SourceRevision, corrected.SourceRevision);

            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new { notes = "Unrelated note" })).StatusCode);
            var unrelated = await Read();
            Assert.Equal(corrected.ContentRevision, unrelated.ContentRevision);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Instructions(unrelated, original))).StatusCode);
            var unchanged = await Read();
            Assert.Equal(original, unchanged.InstructionSections[0].Steps[0].Text);
            Assert.Equal(bindingId, Assert.Single(unchanged.InstructionSections[0].Steps[0].Bindings).GetProperty("id").GetGuid());

            using (var scope = factory.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                var db = services.GetRequiredService<RecipeDbContext>();
                db.FamilySettings.Add(new RecipeApi.Models.FamilySetting
                {
                    Key = SupperServingsService.DefaultKey,
                    Value = JsonSerializer.SerializeToElement(new { servings = 6, version = Guid.NewGuid() })
                });
                await db.SaveChangesAsync();
                var projection = await client.GetFromJsonAsync<JsonElement>(
                    $"/api/recipes/{Id}/ingredient-projection?supperDate=2026-10-13&context=proposed");
                Assert.Equal(unchanged.ContentRevision, projection.GetProperty("contentRevision").GetString());
                Assert.Equal("Add half of the pasta (187.5 g).", projection.GetProperty("instructionProjection")
                    .GetProperty("sections")[0].GetProperty("steps")[0].GetProperty("text").GetString());
                Assert.Equal(1, projection.GetProperty("instructionProjection").GetProperty("validatedUses").GetInt32());
                var monday = new DateOnly(2026, 10, 12);
                await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
                var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                var groceries = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!;
                Assert.Equal(LegacyGroceryQuantity.Parse("375"), Assert.Single(groceries,
                    x => x.NormalizedKey == "pasta" && x.RecipeIds.Contains(Id)).ExactQuantity);
            }

            const string replacement = "Use half the pasta (125 g).";
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Instructions(unchanged, replacement))).StatusCode);
            var changed = await Read();
            Assert.NotEqual(bindingId, Assert.Single(changed.InstructionSections[0].Steps[0].Bindings).GetProperty("id").GetGuid());
            Assert.Equal("Use half the pasta (187.5 g).", CookingStepProjection.Read(changed, 6).Sections[0].Steps[0].Text);
            Assert.Equal(replacement, changed.InstructionSections[0].Steps[0].Text);
            Assert.Equal(HttpStatusCode.Conflict, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Instructions(unchanged, "Add half of the pasta (100 g)."))).StatusCode);
            Assert.Equal(changed.ContentRevision, (await Read()).ContentRevision);

            var cleared = changed.IngredientLines.Select((row, index) => index == 0 ? new RecipeIngredientLineInput
            {
                Id = row.Id, Description = row.Description, Amount = null, AmountText = null,
                Unit = row.Unit, Scaling = row.Scaling, Package = row.Package, Shopping = row.Shopping
            } : Row(row)).ToArray();
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            { expectedContentRevision = changed.ContentRevision, ingredientLines = cleared })).StatusCode);
            var final = await Read();
            Assert.Null(final.IngredientLines[0].Amount);
            Assert.Equal("human", final.IngredientLines[0].Provenance.Origin);
            Assert.Equal(replacement, final.InstructionSections[0].Steps[0].Text);
            var finalProjection = CookingStepProjection.Read(final, 6);
            Assert.Equal(0, finalProjection.ValidatedUses);
            Assert.Equal(replacement, finalProjection.Sections[0].Steps[0].Text);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Instructions(final, ""))).StatusCode);
            var blank = await Read();
            Assert.Equal("", blank.InstructionSections[0].Steps[0].Text);
            Assert.Empty(blank.InstructionSections[0].Steps[0].Bindings);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryFractionUse_UncertainStepsAbstainWithoutChangingFacts()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            var current = before;
            foreach (var text in new[]
            {
                "Add half of the pasta (100 g) or sauce.",
                "Add half of the pasta (90 g).",
                "If hungry, add half of the pasta (100 g).",
                "Add half of the pasta (100 g), then the rest.",
                "Add half of the pasta (100 ml).",
                "Add half of the pasta."
            })
            {
                var response = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
                {
                    expectedContentRevision = current.ContentRevision,
                    instructionSections = new[] { new { id = current.InstructionSections[0].Id,
                        name = current.InstructionSections[0].Name,
                        steps = new[] { new { id = current.InstructionSections[0].Steps[0].Id, text } } } }
                });
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                using var scope = factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                current = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
                Assert.Empty(current.InstructionSections[0].Steps[0].Bindings);
                Assert.Equal(text, CookingStepProjection.Read(current, 6).Sections[0].Steps[0].Text);
                Assert.Equal("200", current.IngredientLines[0].AmountText);
                Assert.Equal(before.SourceRevision, current.SourceRevision);
            }
        });
    }
}
