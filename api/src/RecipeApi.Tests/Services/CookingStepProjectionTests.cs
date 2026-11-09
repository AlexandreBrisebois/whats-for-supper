using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CookingStepProjectionTests
{
    private static readonly Guid RowId = Guid.Parse("10000000-0000-4000-8000-000000000001");
    private static readonly Guid StepId = Guid.Parse("10000000-0000-4000-8000-000000000002");
    private static JsonElement Use(int start, int end, string expected, string revision = "content", object? payload = null) =>
        JsonSerializer.SerializeToElement(new { id = Guid.NewGuid(), ingredientLineId = RowId, stepId = StepId,
            validatedContentRevision = revision, validatedTextRevision = "text", span = new { start, end, expectedText = expected },
            role = "whole", payload, status = "validated" });
    private static CanonicalRecipeContent Content(string text, params JsonElement[] uses) => new(2, "content", "source", 4,
        [new RecipeIngredientLineDto { Id = RowId, Description = "pasta", Amount = LegacyGroceryQuantity.Parse("200"),
            AmountText = "200", Unit = new("g", null), Scaling = "proportional", Package = null,
            Shopping = new("pasta", null, null), Provenance = new("human", null, []) }],
        [new(Guid.NewGuid(), "Pasta", [new(StepId, text, "text", uses)])]);

    [Theory]
    [InlineData("Add 200 g, then 200 g.", 4, 9, "200 g", "stale")]
    [InlineData("Add 200 g, then 200 g.", 5, 10, "200 g", "content")]
    [InlineData("😀200 g", 1, 7, "\ude00200 g", "content")]
    [InlineData("Add 200 g.", -1, 9, "200 g", "content")]
    public void InvalidProofLeavesExactSourceReadable(string source, int start, int end, string expected, string revision)
    {
        var projection = CookingStepProjection.Read(Content(source, Use(start, end, expected, revision, new { })), 8);
        Assert.Equal(source, projection.Sections[0].Steps[0].Text);
        Assert.Equal(1, projection.UncertainUses);
    }

    [Fact]
    public void OverlappingUsesRemainOriginalButIndependentUseProjects()
    {
        const string text = "200 g and 200 g then 200 g";
        var content = Content(text, Use(0, 5, "200 g", payload: new { }), Use(0, 5, "200 g", payload: new { }), Use(21, 26, "200 g", payload: new { }));
        var result = CookingStepProjection.Read(content, 8);
        Assert.Equal("200 g and 200 g then 400 g", result.Sections[0].Steps[0].Text);
        Assert.Equal(1, result.ValidatedUses);
        Assert.Equal(2, result.UncertainUses);
    }

    [Fact]
    public void NullRoleEvidenceCannotAuthorizeReplacement()
    {
        var result = CookingStepProjection.Read(Content("Add 200 g.", Use(4, 9, "200 g")), 8);
        Assert.Equal("Add 200 g.", result.Sections[0].Steps[0].Text);
        Assert.Equal(1, result.UncertainUses);
    }

    [Fact]
    public void UnknownBasisRetainsOriginalAndDoesNotBlockOtherCookingContent()
    {
        var content = Content("Add 200 g.", Use(4, 9, "200 g", payload: new { })) with { Servings = null };
        Assert.Equal("Add 200 g.", CookingStepProjection.Read(content, 8).Sections[0].Steps[0].Text);
    }
}
