using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class RecipeExtractionParserTests
{
    [Fact]
    public void ParseAndNormalize_CanonicalSections_PreservesSectionAndStepText()
    {
        var result = RecipeExtractionParser.ParseAndNormalize("""
            {
              "name": "Test Recipe",
              "recipeIngredient": ["500 g boeuf"],
              "recipeInstructions": [
                {
                  "@type": "HowToSection",
                  "name": "Préparation",
                  "itemListElement": [
                    { "@type": "HowToStep", "text": "Step one" },
                    { "@type": "HowToStep", "text": "Step two" }
                  ]
                }
              ]
            }
            """);

        Assert.True(result.IsSemanticallyComplete);
        var section = Assert.Single(result.Recipe!.RecipeInstructions!);
        Assert.Equal("Préparation", section.Name);
        Assert.Equal(["Step one", "Step two"], section.ItemListElement!.Select(step => step.Text));
    }

    [Fact]
    public void ParseAndNormalize_FlatFrenchSteps_PreservesTextInUnnamedCanonicalSection()
    {
        var result = RecipeExtractionParser.ParseAndNormalize("""
            {
              "name": "BBQ Québec",
              "recipeIngredient": ["500 g boeuf"],
              "recipeInstructions": [
                { "@type": "HowToStep", "text": "Préchauffer le BBQ à 250 °F." },
                { "@type": "HowToStep", "text": "Déposer la viande sur la grille et cuire jusqu'à la cuisson désirée." }
              ]
            }
            """);

        Assert.True(result.IsSemanticallyComplete);
        var section = Assert.Single(result.Recipe!.RecipeInstructions!);
        Assert.Null(section.Name);
        Assert.Equal(
            ["Préchauffer le BBQ à 250 °F.", "Déposer la viande sur la grille et cuire jusqu'à la cuisson désirée."],
            section.ItemListElement!.Select(step => step.Text));
    }

    [Fact]
    public void ParseAndNormalize_StringSteps_NormalizesToUnnamedCanonicalSection()
    {
        var result = RecipeExtractionParser.ParseAndNormalize("""
            {
              "name": "Test Recipe",
              "recipeIngredient": ["flour"],
              "recipeInstructions": ["Step one", "Step two"]
            }
            """);

        Assert.True(result.IsSemanticallyComplete);
        var section = Assert.Single(result.Recipe!.RecipeInstructions!);
        Assert.Null(section.Name);
        Assert.Equal(["Step one", "Step two"], section.ItemListElement!.Select(step => step.Text));
    }

    [Theory]
    [InlineData("[]")]
    [InlineData("[{\"@type\":\"HowToSection\",\"name\":\"Preparation\",\"itemListElement\":[]}]")]
    [InlineData("[{\"@type\":\"HowToStep\",\"text\":null}]")]
    [InlineData("[{\"@type\":\"HowToStep\",\"text\":\"   \"}]")]
    public void ParseAndNormalize_UnusableInstructions_AreNotSemanticallyComplete(string instructions)
    {
        var result = RecipeExtractionParser.ParseAndNormalize($$"""
            {
              "name": "Test Recipe",
              "recipeIngredient": ["flour"],
              "recipeInstructions": {{instructions}}
            }
            """);

        Assert.False(result.IsSemanticallyComplete);
        Assert.Empty(result.Recipe!.RecipeInstructions!);
    }
}
