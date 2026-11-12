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
        Assert.Equal(3, content.IngredientLines.Count);
        for (var index = 0; index < before.IngredientLines.Count; index++)
            Assert.Equal(JsonSerializer.Serialize(before.IngredientLines[index], Json), JsonSerializer.Serialize(content.IngredientLines[index], Json));
        Assert.Equal(JsonSerializer.Serialize(before.InstructionSections, Json), JsonSerializer.Serialize(content.InstructionSections, Json));
        var row = content.IngredientLines[2];
        Assert.NotEqual(Guid.Empty, row.Id);
        Assert.DoesNotContain(row.Id, before.IngredientLines.Select(original => original.Id));
        Assert.Equal("tomatoes", row.Description);
        Assert.Equal(LegacyGroceryQuantity.Parse("3"), row.Amount);
        Assert.Null(row.Unit);
        Assert.Null(row.Package);
        Assert.Equal("human", row.Provenance.Origin);
        Assert.Null(row.Provenance.SourceRef);
        Assert.Contains("package", row.Provenance.ProtectedFields);
        var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(plan => plan.WeekStartDate == monday);
        var rows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!;
        var demand = Assert.Single(rows, item => item.NormalizedKey == "tomato" && item.RecipeIds.Contains(Id));
        Assert.Equal(LegacyGroceryQuantity.Parse("6"), demand.ExactQuantity);
        Assert.Null(demand.UnitText);
        Assert.Equal("tomato", demand.DisplayName);
        var checks = JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!;
        Assert.True(checks[Assert.Single(rows, item => item.NormalizedKey == "pasta").RowId]);
        Assert.True(checks[Assert.Single(rows, item => item.NormalizedKey == "sauce").RowId]);
        await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new
        {
            qualification = "ordinary human package Save and actual consumers; no source package extraction claim",
            content, rows, checks, operations = await db.CanonicalRecipeOperations.CountAsync()
        }, Json));
    }
}
