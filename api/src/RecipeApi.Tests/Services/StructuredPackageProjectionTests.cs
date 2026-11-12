using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class StructuredPackageProjectionTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static (Recipe Recipe, RecipeIngredientLineDto Row) Source(string? count = "2", string capacity = "400",
        string? unit = "cans", int? basis = 4, string scaling = "proportional", bool package = true)
    {
        var row = new RecipeIngredientLineDto { Id = Guid.NewGuid(), Description = "tomatoes",
            Amount = count is null ? null : LegacyGroceryQuantity.Parse(count), AmountText = count,
            Unit = unit is null ? null : new(unit, null), Scaling = scaling,
            Package = package ? new(new("cans", null), new(LegacyGroceryQuantity.Parse(capacity)!, new("g", null)), "net") : null,
            Shopping = new("tomatoes", null, null), Provenance = new("human", "retained-source", ["package"]) };
        var content = new CanonicalRecipeContent(2, "content", "source", basis, [row], []);
        return (new Recipe { Servings = basis, CanonicalContent = JsonSerializer.Serialize(content, Json),
            Ingredients = "[\"original source tomatoes\"]", RawMetadata = "{\"recipeIngredient\":[\"original source tomatoes\"]}" }, row);
    }

    [Theory]
    [InlineData("400")][InlineData("350–450")][InlineData("0")]
    public void PackageProjectionUsesScaledExactCountAndFixedCapacityWhileOriginalRetainsItsCount(string capacity)
    {
        var (recipe, row) = Source(capacity: capacity); var before = JsonSerializer.Serialize(recipe, Json);
        var line = Assert.Single(SupperIngredientProjection.Read(recipe, 8));
        Assert.Equal($"2 cans tomatoes ({capacity} g / cans; net)", line.OriginalText);
        Assert.Equal($"4 cans tomatoes ({capacity} g / cans; net)", line.DisplayText);
        Assert.Equal(line.OriginalText, CanonicalRecipeContentStore.Render(row));
        Assert.Equal(LegacyGroceryQuantity.Parse("4"), line.GroceryObservation.Quantity);
        Assert.Equal(row.Package, line.GroceryPackage);
        Assert.Equal("tomatoes", line.Name);
        Assert.Equal("cans", line.UnitText);
        Assert.Equal(before, JsonSerializer.Serialize(recipe, Json));
        Assert.False(JsonSerializer.SerializeToElement(line, Json).TryGetProperty("groceryPackage", out _));
    }

    [Theory]
    [InlineData("1/3", "1/2")][InlineData("2–3", "3–9/2")][InlineData("0", "0")]
    public void PackageProjectionKeepsFractionRangeAndZeroCountsExactWithoutPurchaseRounding(string count, string projected)
    {
        var (recipe, _) = Source(count);
        var line = Assert.Single(SupperIngredientProjection.Read(recipe, 6));
        Assert.Equal($"{projected} cans tomatoes (400 g / cans; net)", line.DisplayText);
        Assert.Equal(LegacyGroceryQuantity.Parse(projected), line.GroceryObservation.Quantity);
    }

    [Theory]
    [InlineData(null, "4 tomatoes (400 g / cans; net)")]
    [InlineData("pieces", "4 pieces tomatoes (400 g / cans; net)")]
    public void PackageCountLabelDoesNotReplaceIndependentNullableLineUnit(string? unit, string display)
    {
        var (recipe, _) = Source(unit: unit);
        var line = Assert.Single(SupperIngredientProjection.Read(recipe, 8));
        Assert.Equal(unit, line.UnitText);
        Assert.Equal(display, line.DisplayText);
    }

    [Theory]
    [InlineData("unknownCount")][InlineData("missingBasis")][InlineData("fixed")]
    public void PackageProjectionUnknownContextsFallBackToOriginalAndFixedCountsStayFixed(string context)
    {
        var (recipe, _) = Source(count: context == "unknownCount" ? null : "2", basis: context == "missingBasis" ? null : 4,
            scaling: context == "fixed" ? "fixed" : "proportional");
        var line = Assert.Single(SupperIngredientProjection.Read(recipe, 8));
        Assert.Equal(context == "unknownCount" ? "cans tomatoes (400 g / cans; net)" : "2 cans tomatoes (400 g / cans; net)", line.OriginalText);
        Assert.Equal(line.OriginalText, line.DisplayText);
        if (context == "fixed") Assert.Equal(LegacyGroceryQuantity.Parse("2"), line.GroceryObservation.Quantity);
        else Assert.Null(line.GroceryObservation.Quantity);
        if (context == "missingBasis") Assert.Contains("missing_basis", line.Issues);
    }

    [Fact]
    public void NonpackageProjectionKeepsOriginalRenderingAndOptionalDisplayAbsent()
    {
        var (recipe, row) = Source(package: false);
        var line = Assert.Single(SupperIngredientProjection.Read(recipe, 8));
        Assert.Equal("2 cans tomatoes", CanonicalRecipeContentStore.Render(row));
        Assert.Equal("2 cans tomatoes", line.OriginalText);
        Assert.Null(line.DisplayText);
        Assert.Null(line.GroceryPackage);
    }
    [Fact]
    public void ExistingValidatedPackageCountSpanRemainsQuantityOnlyWithoutInjectingCapacityCaption()
    {
        var (recipe, row) = Source();
        var content = CanonicalRecipeContentStore.Read(recipe)!;
        var stepId = Guid.NewGuid();
        const string text = "Add all 2 cans tomatoes from 400 g cans.";
        var binding = JsonSerializer.SerializeToElement(new { id = Guid.NewGuid(), ingredientLineId = row.Id, stepId,
            validatedContentRevision = content.ContentRevision, validatedTextRevision = "text",
            span = new { start = 8, end = 14, expectedText = "2 cans" }, role = "whole", payload = new { }, status = "validated" });
        content = content with { InstructionSections = [new(Guid.NewGuid(), null, [new(stepId, text, "text", [binding])])] };
        var projected = CookingStepProjection.Read(content, 8);
        Assert.Equal(1, projected.ValidatedUses);
        Assert.Equal("Add all 4 cans tomatoes from 400 g cans.", projected.Sections[0].Steps[0].Text);
        Assert.Equal(text, projected.Sections[0].Steps[0].OriginalText);
        Assert.Equal(text, content.InstructionSections[0].Steps[0].Text);
    }

}
