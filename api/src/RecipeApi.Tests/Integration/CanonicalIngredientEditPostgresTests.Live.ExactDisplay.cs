using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientEditPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public async Task LiveBrowser_CanonicalExactDisplay()
    {
        foreach (var locale in new[] { "en", "fr" })
            await RunCanonicalBrowser(mixed: false, exactDisplayLocale: locale);
    }

    private static async Task AssertCanonicalExactDisplayBrowserResult(RecipeDbContext db, CanonicalRecipeContent before,
        Recipe saved, CanonicalRecipeContent content, DateOnly monday, string evidence, HttpClient client)
    {
        Assert.Equal(before.SourceRevision, content.SourceRevision);
        Assert.Equal(3, saved.Servings);
        Assert.Equal(3, content.Servings);
        Assert.Equal(5, content.IngredientLines.Count);
        for (var index = 0; index < before.IngredientLines.Count; index++)
            Assert.Equal(JsonSerializer.Serialize(before.IngredientLines[index], Json), JsonSerializer.Serialize(content.IngredientLines[index], Json));
        Assert.Equal(5, content.IngredientLines.Select(row => row.Id).Distinct().Count());
        var humanRows = content.IngredientLines.Skip(2).ToArray();
        foreach (var (row, description, amount, unit) in new[]
        {
            (humanRows[0], "flour", "2/3", "cup"),
            (humanRows[1], "lentils", "2–3", "g"),
            (humanRows[2], "lentils", "1–2", "g")
        })
        {
            Assert.NotEqual(Guid.Empty, row.Id);
            Assert.DoesNotContain(row.Id, before.IngredientLines.Select(original => original.Id));
            Assert.Equal(description, row.Description);
            Assert.Equal(description, row.Shopping.Name);
            Assert.Null(row.Shopping.FoodId);
            Assert.Null(row.Shopping.MappingRevision);
            Assert.Equal(LegacyGroceryQuantity.Parse(amount), row.Amount);
            Assert.Equal(amount, row.AmountText);
            Assert.Equal(new RecipeUnitDto(unit, null), row.Unit);
            Assert.Null(row.Package);
            Assert.Equal("proportional", row.Scaling);
            Assert.Equal("human", row.Provenance.Origin);
            Assert.Null(row.Provenance.SourceRef);
            Assert.Contains("amount", row.Provenance.ProtectedFields);
            Assert.Contains("unit", row.Provenance.ProtectedFields);
        }
        Assert.Equal(before.InstructionSections.Select(section => (section.Id, section.Name)),
            content.InstructionSections.Select(section => (section.Id, section.Name)));
        var originalSteps = before.InstructionSections.SelectMany(section => section.Steps).ToArray();
        var steps = content.InstructionSections.SelectMany(section => section.Steps).ToArray();
        Assert.Single(originalSteps);
        Assert.Equal(3, steps.Length);
        Assert.Equal(originalSteps[0].Id, steps[0].Id);
        Assert.Equal(originalSteps[0].Text, steps[0].Text);
        Assert.Equal(originalSteps[0].TextRevision, steps[0].TextRevision);
        Assert.Equal("Cook for 20 min at 180 °C in a 20 cm pan.", steps[1].Text);
        Assert.Equal("Serve with the sauce at the table.", steps[2].Text);
        Assert.Equal(3, steps.Select(step => step.Id).Distinct().Count());
        Assert.All(steps, step =>
        {
            Assert.NotEqual(Guid.Empty, step.Id);
            Assert.False(string.IsNullOrWhiteSpace(step.TextRevision));
            Assert.Empty(step.Bindings);
        });
        Assert.All(steps.Skip(1), step => Assert.DoesNotContain(step.Id, originalSteps.Select(original => original.Id)));
        var instructions = CookingStepProjection.Read(content, 3);
        Assert.Equal(0, instructions.ValidatedUses);
        Assert.Equal(steps.Select(step => step.Text), instructions.Sections.SelectMany(section => section.Steps).Select(step => step.Text));
        var usual = await db.FamilySettings.AsNoTracking().SingleAsync(setting => setting.Key == SupperServingsService.DefaultKey);
        Assert.Equal(3, usual.Value.GetProperty("servings").GetInt32());
        var projections = new List<JsonElement>();
        foreach (var date in new[] { monday.AddDays(-1), monday.AddDays(3) })
        {
            var occurrence = await db.CalendarEvents.AsNoTracking()
                .SingleAsync(row => row.Date == date && row.MealSlot == 0 && row.RecipeId == Id);
            using var response = await client.GetAsync($"/api/recipes/{Id}/ingredient-projection?supperDate={date:yyyy-MM-dd}&context=assigned&occurrenceId={occurrence.Id}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var projection = body.RootElement;
            Assert.Equal(content.ContentRevision, projection.GetProperty("contentRevision").GetString());
            Assert.Equal(3, projection.GetProperty("baseServings").GetInt32());
            Assert.Equal(3, projection.GetProperty("targetServings").GetInt32());
            Assert.Equal("assigned", projection.GetProperty("context").GetString());
            Assert.Equal(occurrence.Id, projection.GetProperty("occurrenceId").GetGuid());
            var lines = projection.GetProperty("lines");
            Assert.Equal(5, lines.GetArrayLength());
            Assert.Equal("2/3 cup flour", lines[2].GetProperty("displayText").GetString());
            Assert.Equal("2/3 cup flour", lines[2].GetProperty("originalText").GetString());
            Assert.Equal("2–3 g lentils", lines[3].GetProperty("displayText").GetString());
            Assert.Equal("1–2 g lentils", lines[4].GetProperty("displayText").GetString());
            Assert.Equal(JsonValueKind.Null, lines[3].GetProperty("quantity").ValueKind);
            projections.Add(projection.Clone());
        }
        var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(row => row.WeekStartDate == monday);
        var rows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!;
        var lentils = Assert.Single(rows, row => row.NormalizedKey == "lentils" && row.RecipeIds.Contains(Id));
        Assert.Equal(LegacyGroceryQuantity.Parse("3–5"), lentils.ExactQuantity);
        Assert.True(lentils.QuantityComplete);
        Assert.Equal("g", lentils.UnitText);
        Assert.Equal(new[] { Id }, lentils.RecipeIds);
        var flour = Assert.Single(rows, row => row.NormalizedKey == "flour" && row.RecipeIds.Contains(Id));
        Assert.Equal(LegacyGroceryQuantity.Parse("2/3"), flour.ExactQuantity);
        Assert.True(flour.QuantityComplete);
        var checks = JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!;
        using var baselines = JsonDocument.Parse(plan.GroceryCheckedDemandBaselines);
        foreach (var key in new[] { "pasta", "sauce" })
        {
            var row = Assert.Single(rows, row => row.NormalizedKey == key && row.RecipeIds.Contains(Id));
            Assert.True(checks[row.RowId!]);
            Assert.Equal(JsonValueKind.Object, baselines.RootElement.GetProperty(row.RowId!).ValueKind);
        }
        await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new
        {
            qualification = "Ordinary human Save and actual generated-client ingredient consumers; no new intake/provider claim",
            content, rows, checks, operations = await db.CanonicalRecipeOperations.CountAsync(), projections, instructions,
            source = new { saved.SourceUrl, saved.RawMetadata, content.SourceRevision },
            originalRows = before.IngredientLines, originalSteps, baselines = baselines.RootElement
        }, Json));
    }
}
