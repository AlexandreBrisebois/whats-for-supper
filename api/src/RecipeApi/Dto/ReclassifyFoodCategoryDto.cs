using System.Text.Json.Serialization;

namespace RecipeApi.Dto;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed class ReclassifyFoodCategoryDto
{
    public string? GrocerySection { get; init; }
    private string? expectedCategoryRevision;
    [JsonIgnore] public bool HasExpectedCategoryRevision { get; private set; }
    public string? ExpectedCategoryRevision
    {
        get => expectedCategoryRevision;
        init { expectedCategoryRevision = value; HasExpectedCategoryRevision = true; }
    }
}
