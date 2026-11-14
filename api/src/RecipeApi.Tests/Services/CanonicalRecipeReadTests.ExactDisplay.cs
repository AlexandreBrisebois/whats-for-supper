using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class CanonicalRecipeReadTests
{
    private static RecipeIngredientLineDto ExactDisplayLine(string description, string? amount,
        string? unit = "cup", string scaling = "proportional", string? shoppingName = null) => new()
        {
            Id = Guid.NewGuid(), Description = description,
            Amount = amount is null ? null : LegacyGroceryQuantity.Parse(amount), AmountText = amount,
            Unit = unit is null ? null : new(unit, null), Scaling = scaling, Package = null,
            Shopping = new(shoppingName ?? description, null, null), Provenance = new("human", null, ["amount", "unit"])
        };

    private static Recipe ExactDisplayRecipe(int? basis, params RecipeIngredientLineDto[] rows) => new()
    {
        Id = Guid.NewGuid(), Servings = basis, Ingredients = "[]",
        RawMetadata = """{"recipeIngredient":["77 tsp obsolete"],"supply":[{"name":"obsolete","quantity":77,"unitText":"tsp"}]}""",
        CanonicalContent = JsonSerializer.Serialize(new CanonicalRecipeContent(2, "saved-content", "saved-source", basis, rows,
            [new(Guid.NewGuid(), "Original steps", [new(Guid.NewGuid(), "Cook for 20 minutes at 180 °C in a 20 cm pan.", "saved-text", [])])]))
    };

    private static IReadOnlyList<IngredientProjectionLineDto> ExactDisplayRead(Recipe recipe, int? target)
    {
        var before = JsonSerializer.Serialize(recipe);
        var lines = SupperIngredientProjection.Read(recipe, target);
        Assert.Equal(before, JsonSerializer.Serialize(recipe));
        return lines;
    }

    private static void AssertExactDisplayWireText(IngredientProjectionLineDto line, string expected)
    {
        Assert.Equal(expected, line.DisplayText);
        var wire = JsonSerializer.SerializeToElement(line, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.Equal(expected, wire.GetProperty("displayText").GetString());
        Assert.False(wire.TryGetProperty("groceryObservation", out _));
        Assert.False(wire.TryGetProperty("groceryPurchaseIdentity", out _));
    }

    [Fact]
    public void ExactPublicDisplay_ThirdForThreeProjectsFiveThenThreeWithoutRoundedTextOrStoredDrift()
    {
        var recipe = ExactDisplayRecipe(3, ExactDisplayLine("flour", "⅓"));
        var five = Assert.Single(ExactDisplayRead(recipe, 5));
        var three = Assert.Single(ExactDisplayRead(recipe, 3));
        Assert.Equal(LegacyGroceryQuantity.Parse("5/9"), five.GroceryObservation.Quantity);
        Assert.Equal(LegacyGroceryQuantity.Parse("1/3"), three.GroceryObservation.Quantity);
        Assert.Equal("⅓ cup flour", five.OriginalText);
        Assert.Equal(five.OriginalText, three.OriginalText);
        Assert.Equal("scaled", five.Status);
        Assert.Empty(five.Issues);
        AssertExactDisplayWireText(five, "5/9 cup flour");
        AssertExactDisplayWireText(three, "1/3 cup flour");
    }

    [Fact]
    public void ExactPublicDisplay_RangeProjectsBothEndpointsWithoutUsingMidpointOrOriginalEndpoints()
    {
        var recipe = ExactDisplayRecipe(3, ExactDisplayLine("oil", "2–3"));
        var line = Assert.Single(ExactDisplayRead(recipe, 5));
        Assert.Equal(LegacyGroceryQuantity.Parse("10/3–5"), line.GroceryObservation.Quantity);
        Assert.Null(line.Quantity); // Compatibility scalar cannot represent this exact range.
        Assert.Equal("2–3 cup oil", line.OriginalText);
        AssertExactDisplayWireText(line, "10/3–5 cup oil");
    }

    [Fact]
    public void ExactPublicDisplay_FixedThirdRemainsKnownWithoutServingBasis()
    {
        var recipe = ExactDisplayRecipe(null, ExactDisplayLine("oil", "1/3", scaling: "fixed"));
        var line = Assert.Single(ExactDisplayRead(recipe, 5));
        Assert.Equal(LegacyGroceryQuantity.Parse("1/3"), line.GroceryObservation.Quantity);
        Assert.Equal("scaled", line.Status);
        Assert.Empty(line.Issues);
        AssertExactDisplayWireText(line, "1/3 cup oil");
    }

    [Theory]
    [InlineData("0", null, "0 salt")]
    [InlineData("0", "g", "0 g salt")]
    [InlineData("2", null, "10/3 salt")]
    public void ExactPublicDisplay_ZeroAndNullUnitStayIndependent(string amount, string? unit, string expected)
    {
        var line = Assert.Single(ExactDisplayRead(ExactDisplayRecipe(3, ExactDisplayLine("salt", amount, unit)), 5));
        Assert.Equal(unit, line.UnitText);
        Assert.Equal(LegacyGroceryQuantity.Parse(amount == "0" ? "0" : "10/3"), line.GroceryObservation.Quantity);
        AssertExactDisplayWireText(line, expected);
    }

    [Theory]
    [InlineData("⅓", "⅓ cup white flour")]
    [InlineData("0.50", "0.50 cup white flour")]
    public void ExactPublicDisplay_OriginalContextRetainsSupportedNotationAndDescription(string amount, string expected)
    {
        var line = Assert.Single(ExactDisplayRead(ExactDisplayRecipe(3,
            ExactDisplayLine("white flour", amount, shoppingName: "flour")), null));
        Assert.Equal(expected, line.OriginalText);
        Assert.Equal(line.OriginalText, line.DisplayText ?? line.OriginalText);
        Assert.Equal("original", line.Status);
        Assert.Equal(LegacyGroceryQuantity.Parse(amount), line.GroceryObservation.Quantity);
        Assert.Empty(line.Issues);
    }

    [Fact]
    public void ExactPublicDisplay_UnknownProportionalBasisRetainsOriginalWithoutInventingFactor()
    {
        var line = Assert.Single(ExactDisplayRead(ExactDisplayRecipe(null, ExactDisplayLine("flour", "⅓")), 5));
        Assert.Equal("⅓ cup flour", line.OriginalText);
        Assert.Equal(line.OriginalText, line.DisplayText ?? line.OriginalText);
        Assert.Null(line.Quantity);
        Assert.Null(line.GroceryObservation.Quantity);
        Assert.Equal("unresolved", line.Status);
        Assert.Equal(new[] { "missing_basis" }, line.Issues);
    }

    [Fact]
    public void ExactPublicDisplay_OverflowRetainsOriginalWithoutSaturationOrInventedText()
    {
        var amount = new string('9', 38);
        var row = ExactDisplayLine("flour", amount, "g");
        Assert.NotNull(row.Amount); // A valid original, not a malformed fixture or parse failure.
        var line = Assert.Single(ExactDisplayRead(ExactDisplayRecipe(1, row), 2));
        Assert.Equal(amount + " g flour", line.OriginalText);
        Assert.Equal(line.OriginalText, line.DisplayText ?? line.OriginalText);
        Assert.Null(line.Quantity);
        Assert.Null(line.GroceryObservation.Quantity);
        Assert.Equal("unresolved", line.Status);
        Assert.Equal(new[] { "unreliable_amount" }, line.Issues);
    }

    [Theory]
    [InlineData(null, "Fresh basil leaves")]
    [InlineData("g", "g Fresh basil leaves")]
    public void ExactPublicDisplay_UnquantifiedAndUnitOnlyRowsRemainOriginal(string? unit, string original)
    {
        var line = Assert.Single(ExactDisplayRead(ExactDisplayRecipe(3, ExactDisplayLine("Fresh basil leaves", null, unit)), 5));
        Assert.Equal(original, line.OriginalText);
        Assert.Equal(line.OriginalText, line.DisplayText ?? line.OriginalText);
        Assert.Null(line.Quantity);
        Assert.Null(line.GroceryObservation.Quantity);
        Assert.Equal("unquantified", line.Status);
        Assert.Empty(line.Issues);
    }

    [Fact]
    public void ExactPublicDisplay_ScaledShoppingLabelDoesNotReplaceOriginalDescription()
    {
        var row = ExactDisplayLine("white flour for dusting", "⅓", shoppingName: "flour");
        var line = Assert.Single(ExactDisplayRead(ExactDisplayRecipe(3, row), 5));
        Assert.Equal("⅓ cup white flour for dusting", line.OriginalText);
        Assert.Equal("flour", line.Name);
        AssertExactDisplayWireText(line, "5/9 cup flour");
    }

    [Fact]
    public void ExactPublicDisplay_DeclaredPackageKeepsExistingCountCapacityAndDescriptionPolicy()
    {
        var row = ExactDisplayLine("tomatoes", "2", "cans", shoppingName: "tomato") with
        {
            Package = new(new("cans", null), new(LegacyGroceryQuantity.Parse("400")!, new("g", null)), "net")
        };
        var recipe = ExactDisplayRecipe(3, row);
        var line = Assert.Single(ExactDisplayRead(recipe, 5));
        Assert.Equal(LegacyGroceryQuantity.Parse("10/3"), line.GroceryObservation.Quantity);
        Assert.Equal(row.Package, line.GroceryPackage);
        Assert.Equal("tomato", line.Name);
        Assert.Equal("2 cans tomatoes (400 g / cans; net)", line.OriginalText);
        AssertExactDisplayWireText(line, "10/3 cans tomatoes (400 g / cans; net)");
        AssertExactDisplayWireText(Assert.Single(ExactDisplayRead(recipe, null)), "2 cans tomatoes (400 g / cans; net)");
    }
}
