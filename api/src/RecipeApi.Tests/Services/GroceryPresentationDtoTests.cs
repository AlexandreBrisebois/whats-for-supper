using System.Text.Json;
using RecipeApi.Dto;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class GroceryPresentationDtoTests
{
    private static readonly string[] Fields = ["displayLabels", "labelStatus", "displayNameVariants", "categoryScope", "categoryStatus", "categoryRevision", "categoryChoices"];

    [Theory]
    [InlineData(null)]
    [InlineData("opaque.category.revision")]
    public void CapturedPresentation_FlatTypedMembersAreTheActualWireValuesIncludingExplicitNullRevision(string? revision)
    {
        var row = new GroceryLineItemDto("saved source", "onion", "Grocery", null, null, [])
        { Presentation = new(new("Onion", "Oignon"), "resolved", new([], []), "food", "conflict", revision, [new("oignon", "Produce", "legacy")]) };
        var json = JsonSerializer.SerializeToElement(row, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        foreach (var name in Fields)
        {
            var property = typeof(GroceryLineItemDto).GetProperty(char.ToUpperInvariant(name[0]) + name[1..]);
            Assert.NotNull(property);
            Assert.True(JsonElement.DeepEquals(json.GetProperty(name), JsonSerializer.SerializeToElement(property.GetValue(row), new JsonSerializerOptions(JsonSerializerDefaults.Web))));
        }
        Assert.Equal(revision, json.GetProperty("categoryRevision").GetString());
        Assert.Equal("Oignon", json.GetProperty("displayLabels").GetProperty("fr").GetString());
    }

    [Fact]
    public void UndecoratedPersistence_StillOmitsTransientFieldsAndRawTypedInspectionIsSafe()
    {
        var row = new GroceryLineItemDto("saved source", "onion", "Grocery", null, null, []) { RowId = "retained-row" };
        var persisted = JsonSerializer.SerializeToElement(row);
        foreach (var name in Fields)
        {
            Assert.False(persisted.TryGetProperty(name, out _));
            var property = typeof(GroceryLineItemDto).GetProperty(char.ToUpperInvariant(name[0]) + name[1..]);
            Assert.NotNull(property);
            _ = property.GetValue(row); // Record/debug inspection must not require decorated authority.
        }
        Assert.NotNull(row.ToString());
        Assert.Equal(new GroceryDisplayLabels("saved source", "saved source"), row.DisplayLabels);
        Assert.Equal("fallback", row.LabelStatus);
        Assert.Equal("fallback", row.CategoryScope);
        Assert.Equal("resolved", row.CategoryStatus);
        Assert.Null(row.CategoryRevision);
        Assert.Empty(row.CategoryChoices);
        Assert.Equal("saved source", Assert.Single(row.DisplayNameVariants.En).Text);
        Assert.Empty(Assert.Single(row.DisplayNameVariants.Fr).Contributors);
        var read = JsonSerializer.Deserialize<GroceryLineItemDto>(persisted.GetRawText())!;
        Assert.Null(read.Presentation);
        Assert.Equal("retained-row", read.RowId);
    }
}
