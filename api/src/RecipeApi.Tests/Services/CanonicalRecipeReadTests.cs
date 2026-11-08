using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CanonicalRecipeReadTests
{
    [Fact]
    public void CompatibleInstructions_RenderCanonicalStepsWithSchemaOrgKeys()
    {
        var content = new CanonicalRecipeContent(2, "saved-content", "saved-source", null, [],
            [new(Guid.NewGuid(), "Sauce", [new(Guid.NewGuid(), "Current step", "text-revision", [])])]);
        var recipe = new Recipe { CanonicalContent = JsonSerializer.Serialize(content), RawMetadata = """{"recipeInstructions":["Stale source step"]}""" };
        var dto = JsonSerializer.SerializeToElement(RecipeService.MapToDto(recipe));
        var section = dto.GetProperty("recipeInstructions")[0];
        Assert.Equal("HowToSection", section.GetProperty("@type").GetString());
        Assert.Equal("Sauce", section.GetProperty("name").GetString());
        var step = section.GetProperty("itemListElement")[0];
        Assert.Equal("HowToStep", step.GetProperty("@type").GetString());
        Assert.Equal("Current step", step.GetProperty("text").GetString());
    }

    [Fact]
    public void ExactProjection_ScalesCanonicalOriginalsWithoutReplayingSourceOrChangingThem()
    {
        RecipeIngredientLineDto Line(string description, string? amount, string scaling = "proportional") => new() {
            Id = Guid.NewGuid(), Description = description, Amount = amount is null ? null : LegacyGroceryQuantity.Parse(amount),
            AmountText = amount, Unit = new("cup", null), Scaling = scaling, Package = null,
            Shopping = new(description, null, null), Provenance = new("human", null, ["amount"]) };
        var content = new CanonicalRecipeContent(2, "saved-content", "saved-source", 3,
            [Line("flour", "⅓"), Line("oil", "2–3"), Line("herbs", null), Line("fixed", "1", "fixed")], []);
        var recipe = new Recipe { Servings = 3, CanonicalContent = JsonSerializer.Serialize(content), Ingredients = "[]",
            RawMetadata = """{"recipeIngredient":["9 cup stale"],"supply":[{"name":"stale","quantity":9,"unitText":"cup"}]}""" };
        var before = JsonSerializer.Serialize(recipe);
        var projected = SupperIngredientProjection.Read(recipe, 5);
        Assert.Equal(LegacyGroceryQuantity.Parse("5/9"), projected[0].GroceryObservation.Quantity);
        Assert.Equal(LegacyGroceryQuantity.Parse("10/3–5"), projected[1].GroceryObservation.Quantity);
        Assert.Null(projected[2].GroceryObservation.Quantity);
        Assert.Empty(projected[2].Issues);
        Assert.Equal(LegacyGroceryQuantity.Parse("1"), projected[3].GroceryObservation.Quantity);
        Assert.Equal(LegacyGroceryQuantity.Parse("1/3"), SupperIngredientProjection.Read(recipe, 3)[0].GroceryObservation.Quantity);
        Assert.Equal(before, JsonSerializer.Serialize(recipe));
    }
}
