using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientEditPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public async Task LiveBrowser_CanonicalDeclaredPackages()
    {
        // Each locale receives a fresh canonical fixture. Packages are authored only by the ordinary browser editor.
        foreach (var locale in new[] { "en", "fr" })
            await RunCanonicalBrowser(mixed: false, packageLocale: locale);
    }

    private static async Task AssertCanonicalPackageBrowserResult(RecipeDbContext db, CanonicalRecipeContent before,
        CanonicalRecipeContent content, DateOnly monday, string evidence)
    {
        Assert.Equal(before.SourceRevision, content.SourceRevision);
        Assert.Equal(before.Servings, content.Servings);
        Assert.Equal(4, content.IngredientLines.Count);
        for (var index = 0; index < before.IngredientLines.Count; index++)
            Assert.Equal(JsonSerializer.Serialize(before.IngredientLines[index], Json), JsonSerializer.Serialize(content.IngredientLines[index], Json));
        Assert.Equal(JsonSerializer.Serialize(before.InstructionSections, Json), JsonSerializer.Serialize(content.InstructionSections, Json));
        var row = content.IngredientLines[2];
        Assert.NotEqual(Guid.Empty, row.Id);
        Assert.DoesNotContain(row.Id, before.IngredientLines.Select(original => original.Id));
        Assert.Equal("tomatoes", row.Description);
        Assert.Equal(LegacyGroceryQuantity.Parse("4"), row.Amount);
        Assert.Equal("4", row.AmountText);
        Assert.Equal(new RecipeUnitDto("cans", null), row.Unit);
        Assert.Null(row.Package);
        Assert.Equal("human", row.Provenance.Origin);
        Assert.Null(row.Provenance.SourceRef);
        Assert.Contains("package", row.Provenance.ProtectedFields);
        var other = content.IngredientLines[3];
        Assert.NotEqual(Guid.Empty, other.Id);
        Assert.NotEqual(row.Id, other.Id);
        Assert.DoesNotContain(other.Id, before.IngredientLines.Select(original => original.Id));
        Assert.Equal("tomatoes", other.Description);
        Assert.Equal(LegacyGroceryQuantity.Parse("2"), other.Amount);
        Assert.Equal("2", other.AmountText);
        Assert.Equal(new RecipeUnitDto("cans", null), other.Unit);
        Assert.Equal(new RecipePackageDto(new("cans", null),
            new(LegacyGroceryQuantity.Parse("800")!, new("g", null)), "net"), other.Package);
        foreach (var human in new[] { row, other })
        {
            Assert.Equal("proportional", human.Scaling);
            Assert.Equal("tomatoes", human.Shopping.Name);
            Assert.Null(human.Shopping.FoodId);
            Assert.Null(human.Shopping.MappingRevision);
            Assert.Equal("human", human.Provenance.Origin);
            Assert.Null(human.Provenance.SourceRef);
            Assert.Contains("package", human.Provenance.ProtectedFields);
            Assert.Contains("unit", human.Provenance.ProtectedFields);
            Assert.Contains("amount", human.Provenance.ProtectedFields);
        }
        var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(plan => plan.WeekStartDate == monday);
        var rows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!;
        var tomatoes = rows.Where(item => item.NormalizedKey == "tomato" && item.RecipeIds.Contains(Id)).ToArray();
        Assert.Equal(2, tomatoes.Length);
        var demand = Assert.Single(tomatoes, item => item.DisplayName == "tomato");
        var otherDemand = Assert.Single(tomatoes, item => item.DisplayName == "tomato (800 g / cans; net)");
        Assert.NotEqual(demand.RowId, otherDemand.RowId);
        Assert.NotEqual(demand.DemandIdentity, otherDemand.DemandIdentity);
        Assert.Equal(LegacyGroceryQuantity.Parse("8"), demand.ExactQuantity);
        Assert.Equal(LegacyGroceryQuantity.Parse("4"), otherDemand.ExactQuantity);
        Assert.All(tomatoes, item =>
        {
            Assert.Equal("cans", item.UnitText);
            Assert.True(item.QuantityComplete);
            Assert.Equal(new[] { Id }, item.RecipeIds);
        });
        Assert.Equal("tomato", demand.DisplayName);
        var checks = JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!;
        Assert.False(checks[demand.RowId!]);
        Assert.True(checks[otherDemand.RowId!]);
        using var baselines = JsonDocument.Parse(plan.GroceryCheckedDemandBaselines);
        Assert.False(baselines.RootElement.TryGetProperty(demand.RowId!, out _));
        Assert.Equal(JsonValueKind.Object, baselines.RootElement.GetProperty(otherDemand.RowId!).ValueKind);
        Assert.True(checks[Assert.Single(rows, item => item.NormalizedKey == "pasta").RowId]);
        Assert.True(checks[Assert.Single(rows, item => item.NormalizedKey == "sauce").RowId]);
        await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new
        {
            qualification = "ordinary human package Save and actual consumers; no source package extraction claim",
            content, rows, checks, baselines = baselines.RootElement,
            operations = await db.CanonicalRecipeOperations.CountAsync()
        }, Json));
    }
}
