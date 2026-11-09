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
    private static async Task<CanonicalRecipeContent> SeedCookingFraction(TestWebApplicationFactory factory, CanonicalRecipeContent before)
    {
        before = await SeedCookingAllocation(factory, before, false);
        var first = before.InstructionSections[0].Steps[0];
        var half = new RecipeInstructionStepDto(Guid.NewGuid(), "Add half the pasta; cook 20 minutes at 180 °C.", Guid.NewGuid().ToString("N"), []);
        var binding = JsonSerializer.SerializeToElement(new {
            id = Guid.NewGuid(), ingredientLineId = before.IngredientLines[0].Id, stepId = half.Id,
            validatedContentRevision = before.ContentRevision, validatedTextRevision = half.TextRevision,
            span = new { start = 4, end = 8, expectedText = "half" }, role = "fraction",
            payload = new { fraction = new { n = "1", d = "2" } }, status = "validated"
        }, Json);
        half = half with { Bindings = [binding] };
        var invalid = half with { Id = Guid.NewGuid(), Text = "Keep half the pasta aside.", TextRevision = Guid.NewGuid().ToString("N") };
        var node = System.Text.Json.Nodes.JsonNode.Parse(binding.GetRawText())!;
        node["id"] = Guid.NewGuid(); node["stepId"] = invalid.Id; node["validatedTextRevision"] = invalid.TextRevision;
        node["span"] = JsonSerializer.SerializeToNode(new { start = 5, end = 9, expectedText = "half" });
        node["payload"]!["fraction"]!["d"] = "0";
        invalid = invalid with { Bindings = [JsonSerializer.SerializeToElement(node, Json)] };
        var stale = invalid with { Id = Guid.NewGuid(), Text = "Reserve half the pasta.", TextRevision = Guid.NewGuid().ToString("N") };
        node["id"] = Guid.NewGuid(); node["stepId"] = stale.Id; node["validatedTextRevision"] = "old-text";
        node["span"] = JsonSerializer.SerializeToNode(new { start = 8, end = 12, expectedText = "half" });
        node["payload"]!["fraction"]!["d"] = "2";
        stale = stale with { Bindings = [JsonSerializer.SerializeToElement(node, Json)] };
        var ambiguous = half with { Id = Guid.NewGuid(), Text = "Use half or half the pasta.", TextRevision = Guid.NewGuid().ToString("N") };
        node["id"] = Guid.NewGuid(); node["stepId"] = ambiguous.Id; node["validatedTextRevision"] = ambiguous.TextRevision;
        node["span"] = JsonSerializer.SerializeToNode(new { start = 4, end = 8, expectedText = "half" });
        node["payload"]!["allocationGroup"] = JsonSerializer.SerializeToNode(new { id = Guid.NewGuid(), exhaustive = false, bindingIds = new[] { node["id"]!.GetValue<Guid>() } });
        ambiguous = ambiguous with { Bindings = [JsonSerializer.SerializeToElement(node, Json)] };
        var revision = Guid.NewGuid().ToString("N");
        var seeded = before with { ContentRevision = revision, InstructionSections = [before.InstructionSections[0] with { Steps = [first, half, invalid, stale, ambiguous] }] };
        seeded = seeded with { InstructionSections = seeded.InstructionSections.Select(section => section with {
            Steps = section.Steps.Select(step => step with { Bindings = step.Bindings.Select(raw => {
                var proof = System.Text.Json.Nodes.JsonNode.Parse(raw.GetRawText())!;
                proof["validatedContentRevision"] = revision;
                return JsonSerializer.SerializeToElement(proof, Json);
            }).ToArray() }).ToArray()
        }).ToArray() };
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
        recipe.CanonicalContent = JsonSerializer.Serialize(seeded, Json);
        await db.SaveChangesAsync();
        return seeded;
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CookingStepScalingPostgres_HalfRemainsRelativeAfterTotalCorrection()
    {
        await WithEditor(async (factory, before) =>
        {
            before = await SeedCookingFraction(factory, before);
            using var client = factory.CreateAuthenticatedClient();
            foreach (var total in new[] { "200", "250" })
            {
                if (total == "250") Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/recipes/{Id}", new {
                    expectedContentRevision = before.ContentRevision,
                    ingredientLines = new[] { Row(before.IngredientLines[0], total), Row(before.IngredientLines[1]) }
                })).StatusCode);
                foreach (var target in new[] { 2, 4, 6 })
                {
                    var projection = await client.GetFromJsonAsync<JsonElement>($"/api/recipes/{Id}/ingredient-preview?targetServings={target}");
                    var instructions = projection.GetProperty("instructionProjection");
                    Assert.Equal(2, instructions.GetProperty("validatedUses").GetInt32());
                    Assert.Equal(3, instructions.GetProperty("uncertainUses").GetInt32());
                    var steps = instructions.GetProperty("sections")[0].GetProperty("steps");
                    Assert.Contains($"Add {50 * target / 4} g pasta", steps[0].GetProperty("text").GetString());
                    for (var i = 1; i < 5; i++) Assert.Equal(before.InstructionSections[0].Steps[i].Text, steps[i].GetProperty("text").GetString());
                }
            }
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var current = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
            Assert.Equal(before.SourceRevision, current.SourceRevision);
            Assert.Equal(before.InstructionSections[0].Steps.Select(x => x.Id), current.InstructionSections[0].Steps.Select(x => x.Id));
            Assert.Equal(before.InstructionSections[0].Steps.Select(x => x.Text), current.InstructionSections[0].Steps.Select(x => x.Text));
            var saved = current.InstructionSections[0].Steps[1].Bindings[0];
            Assert.Equal(before.InstructionSections[0].Steps[1].Bindings[0].GetProperty("id").GetGuid(), saved.GetProperty("id").GetGuid());
            Assert.Equal(current.ContentRevision, saved.GetProperty("validatedContentRevision").GetString());
            Assert.Equal("2", saved.GetProperty("payload").GetProperty("fraction").GetProperty("d").GetString());
            db.FamilySettings.Add(new RecipeApi.Models.FamilySetting { Key = SupperServingsService.DefaultKey,
                Value = JsonSerializer.SerializeToElement(new { servings = 6, version = Guid.NewGuid() }) });
            await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new DateOnly(2026, 10, 12), default);
            var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == new DateOnly(2026, 10, 12));
            using var groceries = JsonDocument.Parse(plan.GroceryItems);
            var row = Assert.Single(groceries.RootElement.EnumerateArray(), x => x.GetProperty("normalizedKey").GetString() == "pasta");
            Assert.Equal("375", row.GetProperty("quantity").GetProperty("value").GetProperty("n").GetString());
        });
    }
}
