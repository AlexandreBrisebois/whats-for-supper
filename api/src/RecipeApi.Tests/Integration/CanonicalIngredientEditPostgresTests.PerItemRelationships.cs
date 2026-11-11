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
    private static string PerItemEditorText(bool french, string count = "4", string dose = "1/2") => french
        ? $"Pour tous les {count} morceaux de tofu, utilisez exactement {dose} c. à thé d’huile sur chaque morceau."
        : $"For all {count} pieces of tofu, use exactly {dose} tsp of oil on each piece.";

    private static async Task<CanonicalRecipeContent> ReadPerItemEditor(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        return CanonicalRecipeContentStore.Read(await scope.ServiceProvider.GetRequiredService<RecipeDbContext>()
            .Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == Id))!;
    }

    private static object PerItemEditorSteps(CanonicalRecipeContent current, string text) => new
    {
        expectedContentRevision = current.ContentRevision,
        instructionSections = new[] { new { id = current.InstructionSections[0].Id,
            name = current.InstructionSections[0].Name,
            steps = current.InstructionSections[0].Steps.Select((step, index) => new
                { id = step.Id, text = index == 0 ? text : step.Text }).ToArray() } }
    };

    private static async Task<CanonicalRecipeContent> CreateOrdinaryPerItemEdit(TestWebApplicationFactory factory,
        CanonicalRecipeContent before, bool french)
    {
        using var client = factory.CreateAuthenticatedClient();
        var tofu = Row(before.IngredientLines[0], "4") with
        {
            Description = "tofu", Unit = new(french ? "morceaux" : "pieces", null), Shopping = new("tofu", null, null)
        };
        var oil = new RecipeIngredientLineInput
        {
            ClientId = "per-item-oil", Description = french ? "huile" : "oil", Amount = LegacyGroceryQuantity.Parse("2"),
            AmountText = "2", Unit = new(french ? "c. à thé" : "tsp", null), Scaling = "proportional", Package = null,
            Shopping = new(french ? "huile" : "oil", null, null)
        };
        Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
        {
            expectedContentRevision = before.ContentRevision,
            ingredientLines = new[] { tofu, oil, Row(before.IngredientLines[1]) },
            instructionSections = new[] { new { id = before.InstructionSections[0].Id, name = (string?)null,
                steps = new object[] {
                    new { id = before.InstructionSections[0].Steps[0].Id, text = PerItemEditorText(french) },
                    new { clientId = "per-item-independent-sauce", text = "Add all 100 ml sauce." },
                    new { clientId = "per-item-neutral", text = "Cook for 20 minutes at 180 °C in a 20 cm pan; retain the 400 g package label." } } } }
        })).StatusCode);
        var current = await ReadPerItemEditor(factory);
        AssertEditorPerItemGraph(current, "1/2");
        return current;
    }

    private static void AssertEditorPerItemGraph(CanonicalRecipeContent content, string dose)
    {
        var step = content.InstructionSections[0].Steps[0];
        Assert.Equal(2, step.Bindings.Count);
        var count = step.Bindings[0];
        var use = step.Bindings[1];
        Assert.Equal("whole", count.GetProperty("role").GetString());
        Assert.Equal("perItem", use.GetProperty("role").GetString());
        Assert.Equal(content.IngredientLines[0].Id, count.GetProperty("ingredientLineId").GetGuid());
        Assert.Equal(content.IngredientLines[1].Id, use.GetProperty("ingredientLineId").GetGuid());
        Assert.Equal(count.GetProperty("id").GetGuid(), use.GetProperty("payload").GetProperty("countBindingId").GetGuid());
        Assert.Equal(LegacyGroceryQuantity.Parse(dose), use.GetProperty("payload").GetProperty("dose")
            .GetProperty("amount").Deserialize<GroceryQuantity>(Json));
        Assert.Equal(content.IngredientLines[1].Unit, use.GetProperty("payload").GetProperty("dose")
            .GetProperty("unit").Deserialize<RecipeUnitDto>(Json));
        foreach (var binding in step.Bindings)
        {
            Assert.Equal(content.ContentRevision, binding.GetProperty("validatedContentRevision").GetString());
            Assert.Equal(step.TextRevision, binding.GetProperty("validatedTextRevision").GetString());
            Assert.Equal(step.Id, binding.GetProperty("stepId").GetGuid());
            var span = binding.GetProperty("span");
            Assert.Equal(span.GetProperty("expectedText").GetString(), step.Text[span.GetProperty("start").GetInt32()..span.GetProperty("end").GetInt32()]);
            Assert.Equal(content.SourceRevision, binding.GetProperty("payload").GetProperty("relationshipEvidence").GetProperty("sourceRevision").GetString());
        }
        Assert.Equal(3, CookingStepProjection.Read(content, 8).ValidatedUses);
        Assert.Equal(0, CookingStepProjection.Read(content, 8).UncertainUses);
        Assert.Empty(content.InstructionSections[0].Steps[2].Bindings);
    }

    private static async Task AssertPerItemGroceries(TestWebApplicationFactory factory, string tofu, string? oil, string oilKey)
    {
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<RecipeDbContext>();
        var monday = new DateOnly(2026, 10, 12);
        await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
        var groceries = JsonSerializer.Deserialize<List<GroceryLineItemDto>>((await db.WeeklyPlans.AsNoTracking()
            .SingleAsync(plan => plan.WeekStartDate == monday)).GroceryItems)!;
        foreach (var (key, amount) in new[] { ("tofu", tofu), (oilKey, oil), ("sauce", "200") })
        {
            var row = Assert.Single(groceries, row => row.NormalizedKey == key && row.RecipeIds.Contains(Id));
            Assert.Equal(amount is null ? null : LegacyGroceryQuantity.Parse(amount), row.ExactQuantity);
            if (amount is null) Assert.False(row.QuantityComplete);
        }
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryPerItemUse_GuardedSaveCarriesCountAndDoseTotalsThenReplacesExplicitStep()
    {
        foreach (var french in new[] { false, true })
            await WithEditor(async (factory, before) =>
            {
                using var client = factory.CreateAuthenticatedClient();
                var current = await CreateOrdinaryPerItemEdit(factory, before, french);
                using (var scope = factory.Services.CreateScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                    db.FamilySettings.Add(new RecipeApi.Models.FamilySetting
                    {
                        Key = SupperServingsService.DefaultKey,
                        Value = JsonSerializer.SerializeToElement(new { servings = 8, version = Guid.NewGuid() })
                    });
                    await db.SaveChangesAsync();
                }
                var originalText = current.InstructionSections[0].Steps[0].Text;
                var originalTextRevision = current.InstructionSections[0].Steps[0].TextRevision;
                var ids = current.InstructionSections[0].Steps[0].Bindings.Select(binding => binding.GetProperty("id").GetGuid()).ToArray();
                var dosePayload = current.InstructionSections[0].Steps[0].Bindings[1].GetProperty("payload").Clone();
                var sauceId = Assert.Single(current.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid();
                var sauce = JsonSerializer.Serialize(current.IngredientLines[2], Json);
                var neutral = current.InstructionSections[0].Steps[2];
                await AssertPerItemGroceries(factory, "8", "4", french ? "huile" : "oil");
                foreach (var (countTotal, oilTotal) in new[] { ("6", "2"), ("6", "3") })
                {
                    Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
                    {
                        expectedContentRevision = current.ContentRevision,
                        ingredientLines = new[] { Row(current.IngredientLines[0], countTotal), Row(current.IngredientLines[1], oilTotal), Row(current.IngredientLines[2]) }
                    })).StatusCode);
                    current = await ReadPerItemEditor(factory);
                    AssertEditorPerItemGraph(current, "1/2");
                    Assert.Equal(ids, current.InstructionSections[0].Steps[0].Bindings.Select(binding => binding.GetProperty("id").GetGuid()));
                    Assert.True(JsonElement.DeepEquals(dosePayload, current.InstructionSections[0].Steps[0].Bindings[1].GetProperty("payload")));
                    Assert.Equal(originalText, current.InstructionSections[0].Steps[0].Text);
                    Assert.Equal(originalTextRevision, current.InstructionSections[0].Steps[0].TextRevision);
                    Assert.Equal(before.SourceRevision, current.SourceRevision);
                    Assert.Equal(sauce, JsonSerializer.Serialize(current.IngredientLines[2], Json));
                    Assert.Equal(sauceId, Assert.Single(current.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid());
                    Assert.Equal(JsonSerializer.Serialize(neutral), JsonSerializer.Serialize(current.InstructionSections[0].Steps[2]));
                    foreach (var target in new[] { 6, 2, 4, 6 })
                    {
                        var preview = await client.GetFromJsonAsync<JsonElement>($"/api/recipes/{Id}/ingredient-preview?targetServings={target}");
                        Assert.Equal(current.ContentRevision, preview.GetProperty("contentRevision").GetString());
                        var projection = preview.GetProperty("instructionProjection");
                        Assert.Equal(3, projection.GetProperty("validatedUses").GetInt32());
                        Assert.Equal(originalText.Replace(french ? "4 morceaux" : "4 pieces", $"{6 * target / 4} {(french ? "morceaux" : "pieces")}", StringComparison.Ordinal),
                            projection.GetProperty("sections")[0].GetProperty("steps")[0].GetProperty("text").GetString());
                    }
                    Assert.Equal(originalText.Replace(french ? "4 morceaux" : "4 pieces", french ? "12 morceaux" : "12 pieces", StringComparison.Ordinal),
                        CookingStepProjection.Read(current, 8).Sections[0].Steps[0].Text);
                    await AssertPerItemGroceries(factory, "12", oilTotal == "2" ? "4" : "6", french ? "huile" : "oil");
                }
                var beforeNoOp = current;
                Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new { notes = "Unrelated note" })).StatusCode);
                Assert.Equal(beforeNoOp.ContentRevision, (await ReadPerItemEditor(factory)).ContentRevision);
                Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", PerItemEditorSteps(current, originalText))).StatusCode);
                current = await ReadPerItemEditor(factory);
                Assert.Equal(ids, current.InstructionSections[0].Steps[0].Bindings.Select(binding => binding.GetProperty("id").GetGuid()));

                var prior = current;
                var replacement = PerItemEditorText(french, "6", "1/3");
                Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", PerItemEditorSteps(prior, replacement))).StatusCode);
                current = await ReadPerItemEditor(factory);
                AssertEditorPerItemGraph(current, "1/3");
                Assert.All(current.InstructionSections[0].Steps[0].Bindings, binding => Assert.DoesNotContain(binding.GetProperty("id").GetGuid(), ids));
                Assert.NotEqual(originalTextRevision, current.InstructionSections[0].Steps[0].TextRevision);
                Assert.Equal(sauceId, Assert.Single(current.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid());
                Assert.Equal(JsonSerializer.Serialize(prior.IngredientLines, Json), JsonSerializer.Serialize(current.IngredientLines, Json));
                Assert.Equal(replacement.Replace(french ? "6 morceaux" : "6 pieces", french ? "12 morceaux" : "12 pieces", StringComparison.Ordinal),
                    CookingStepProjection.Read(current, 8).Sections[0].Steps[0].Text);
                Assert.Equal(HttpStatusCode.Conflict, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", PerItemEditorSteps(prior, originalText))).StatusCode);
                Assert.Equal(current.ContentRevision, (await ReadPerItemEditor(factory)).ContentRevision);
                await AssertPerItemGroceries(factory, "12", "6", french ? "huile" : "oil");

                Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
                {
                    expectedContentRevision = current.ContentRevision,
                    ingredientLines = new[] { Row(current.IngredientLines[0]), Row(current.IngredientLines[1]) with { Amount = null, AmountText = null }, Row(current.IngredientLines[2]) }
                })).StatusCode);
                current = await ReadPerItemEditor(factory);
                Assert.Null(current.IngredientLines[1].Amount);
                Assert.Null(current.IngredientLines[1].AmountText);
                AssertEditorPerItemGraph(current, "1/3");
                await AssertPerItemGroceries(factory, "12", null, french ? "huile" : "oil");
                Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", PerItemEditorSteps(current, ""))).StatusCode);
                current = await ReadPerItemEditor(factory);
                Assert.Empty(current.InstructionSections[0].Steps[0].Bindings);
                Assert.Equal(1, CookingStepProjection.Read(current, 8).ValidatedUses);
                Assert.Equal(sauceId, Assert.Single(current.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid());
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryPerItemUse_ConcurrentCountAndStepWritersKeepOneAtomicWinner()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            using var other = factory.CreateAuthenticatedClient();
            var current = await CreateOrdinaryPerItemEdit(factory, before, french: true);
            var section = current.InstructionSections[0];
            var stepInput = new
            {
                expectedContentRevision = current.ContentRevision, name = "Instruction winner",
                instructionSections = new[] { new { id = section.Id, name = section.Name,
                    steps = section.Steps.Select((step, index) => new
                        { id = step.Id, text = index == 0 ? PerItemEditorText(true, "4", "1/3") : step.Text }).ToArray() } }
            };
            var responses = await Task.WhenAll(client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = current.ContentRevision, name = "Count winner",
                ingredientLines = new[] { Row(current.IngredientLines[0], "6"), Row(current.IngredientLines[1]), Row(current.IngredientLines[2]) }
            }), other.PatchAsJsonAsync($"/api/recipes/{Id}", stepInput));
            Assert.Single(responses, response => response.StatusCode == HttpStatusCode.OK);
            Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Conflict);
            var winner = Array.FindIndex(responses, response => response.StatusCode == HttpStatusCode.OK);
            current = await ReadPerItemEditor(factory);
            Assert.Equal(winner == 0 ? "6" : "4", current.IngredientLines[0].AmountText);
            Assert.Equal("2", current.IngredientLines[1].AmountText);
            Assert.Equal(PerItemEditorText(true, "4", winner == 0 ? "1/2" : "1/3"), current.InstructionSections[0].Steps[0].Text);
            AssertEditorPerItemGraph(current, winner == 0 ? "1/2" : "1/3");
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var saved = await db.Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == Id);
            Assert.Equal(winner == 0 ? "Count winner" : "Instruction winner", saved.Name);
            var beforeReplay = JsonSerializer.Serialize(saved);
            var operations = await db.CanonicalRecipeOperations.CountAsync();
            Assert.Equal(HttpStatusCode.Conflict, (await other.PatchAsJsonAsync($"/api/recipes/{Id}", stepInput)).StatusCode);
            db.ChangeTracker.Clear();
            Assert.Equal(beforeReplay, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == Id)));
            Assert.Equal(operations, await db.CanonicalRecipeOperations.CountAsync());
            foreach (var response in responses) response.Dispose();
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryPerItemUse_FreshTextCannotBorrowCorrectedCountAndChangedUnitsInvalidateDoseOnly()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            var current = await CreateOrdinaryPerItemEdit(factory, before, french: false);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = current.ContentRevision,
                ingredientLines = new[] { Row(current.IngredientLines[0], "6"), Row(current.IngredientLines[1]), Row(current.IngredientLines[2]) }
            })).StatusCode);
            current = await ReadPerItemEditor(factory);
            AssertEditorPerItemGraph(current, "1/2");
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", PerItemEditorSteps(current, PerItemEditorText(false, "4", "1/3")))).StatusCode);
            current = await ReadPerItemEditor(factory);
            Assert.DoesNotContain(current.InstructionSections[0].Steps[0].Bindings, binding => binding.GetProperty("role").GetString() == "perItem");
            Assert.Equal(PerItemEditorText(false, "4", "1/3"), CookingStepProjection.Read(current, 8).Sections[0].Steps[0].Text);
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", PerItemEditorSteps(current, PerItemEditorText(false, "6", "1/3")))).StatusCode);
            current = await ReadPerItemEditor(factory);
            AssertEditorPerItemGraph(current, "1/3");
            var countId = current.InstructionSections[0].Steps[0].Bindings[0].GetProperty("id").GetGuid();
            var sauceId = Assert.Single(current.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid();
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = current.ContentRevision,
                ingredientLines = new[] { Row(current.IngredientLines[0]), Row(current.IngredientLines[1]) with { Unit = new("tbsp", null) }, Row(current.IngredientLines[2]) }
            })).StatusCode);
            current = await ReadPerItemEditor(factory);
            Assert.Contains(current.InstructionSections[0].Steps[0].Bindings, binding => binding.GetProperty("id").GetGuid() == countId);
            Assert.Equal(sauceId, Assert.Single(current.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid());
            Assert.Equal(2, CookingStepProjection.Read(current, 8).ValidatedUses);
            Assert.Equal(PerItemEditorText(false, "12", "1/3"), CookingStepProjection.Read(current, 8).Sections[0].Steps[0].Text);
        });
    }
}
