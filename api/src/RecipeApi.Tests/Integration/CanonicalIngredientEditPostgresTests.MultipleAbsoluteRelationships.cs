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
    public async Task OrdinaryMultipleAbsoluteUses_GuardedCorrectionRetainsIndependentUsesAndReplacesOnlyEditedProof()
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
            var firstStep = before.InstructionSections[0].Steps[0].Id;
            var secondStep = Guid.Empty;
            object Steps(CanonicalRecipeContent current, string first = "Add 1 tbsp oil.", string second = "Use 1 tbsp oil.") => new
            {
                expectedContentRevision = current.ContentRevision,
                instructionSections = new[] { new { id = current.InstructionSections[0].Id,
                    name = current.InstructionSections[0].Name,
                    steps = new object[] { new { id = firstStep, text = first }, secondStep == Guid.Empty
                        ? new { clientId = "oil-second", text = second } : (object)new { id = secondStep, text = second } } } }
            };
            var oil = new RecipeIngredientLineInput
            {
                Id = before.IngredientLines[0].Id, Description = "oil", Amount = LegacyGroceryQuantity.Parse("2"), AmountText = "2",
                Unit = new("tbsp", null), Scaling = "proportional", Package = null, Shopping = new("oil", null, null)
            };
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            { expectedContentRevision = before.ContentRevision, ingredientLines = new[] { oil, Row(before.IngredientLines[1]) } })).StatusCode);
            var ingredients = await Read();
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Steps(ingredients))).StatusCode);
            var discovered = await Read();
            var steps = discovered.InstructionSections[0].Steps;
            secondStep = steps[1].Id;
            var ids = steps.Select(step => Assert.Single(step.Bindings).GetProperty("id").GetGuid()).ToArray();
            Assert.NotEqual(ids[0], ids[1]);
            var projection = CookingStepProjection.Read(discovered, 8);
            Assert.Equal(2, projection.ValidatedUses);
            Assert.Equal(new[] { "Add 2 tbsp oil.", "Use 2 tbsp oil." }, projection.Sections[0].Steps.Select(x => x.Text));

            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = discovered.ContentRevision,
                ingredientLines = new[] { Row(discovered.IngredientLines[0], "3"), Row(discovered.IngredientLines[1]) }
            })).StatusCode);
            var corrected = await Read();
            Assert.Equal(before.SourceRevision, corrected.SourceRevision);
            Assert.Equal(ids, corrected.InstructionSections[0].Steps.Select(step => Assert.Single(step.Bindings).GetProperty("id").GetGuid()));
            Assert.Equal(new[] { "Add 2 tbsp oil.", "Use 2 tbsp oil." }, CookingStepProjection.Read(corrected, 8).Sections[0].Steps.Select(x => x.Text));
            Assert.Equal("100", corrected.IngredientLines[1].AmountText);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Steps(corrected))).StatusCode);
            var unchanged = await Read();
            Assert.Equal(ids, unchanged.InstructionSections[0].Steps.Select(step => Assert.Single(step.Bindings).GetProperty("id").GetGuid()));
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new { notes = "Unrelated" })).StatusCode);
            Assert.Equal(unchanged.ContentRevision, (await Read()).ContentRevision);

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
                    x => x.NormalizedKey == "oil" && x.RecipeIds.Contains(Id)).ExactQuantity);
            }
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Steps(unchanged, "Add 0.5 tbsp oil."))).StatusCode);
            var changed = await Read();
            Assert.NotEqual(ids[0], Assert.Single(changed.InstructionSections[0].Steps[0].Bindings).GetProperty("id").GetGuid());
            Assert.Equal(ids[1], Assert.Single(changed.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid());
            Assert.Equal(new[] { "Add 1 tbsp oil.", "Use 2 tbsp oil." }, CookingStepProjection.Read(changed, 8).Sections[0].Steps.Select(x => x.Text));
            Assert.Equal(HttpStatusCode.Conflict, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Steps(unchanged))).StatusCode);
            Assert.Equal(changed.ContentRevision, (await Read()).ContentRevision);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", Steps(changed, second: ""))).StatusCode);
            var cleared = await Read();
            Assert.Empty(cleared.InstructionSections[0].Steps[1].Bindings);
            Assert.Equal("", cleared.InstructionSections[0].Steps[1].Text);
            Assert.Equal("3", cleared.IngredientLines[0].AmountText);
        });
    }
}
