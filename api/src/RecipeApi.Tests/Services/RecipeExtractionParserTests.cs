using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class RecipeExtractionParserTests
{
    [Theory]
    [InlineData("2")]
    [InlineData("[]")]
    [InlineData("{}")]
    [InlineData("true")]
    [InlineData("null")]
    public void OptionalYield_MalformedDoesNotWeakenRequiredContent(string yield)
    {
        var result = RecipeExtractionParser.ParseAndNormalize($$"""
            {"name":"Radiatore","recipeYield":{{yield}},"recipeIngredient":["510 g beef","340 g pasta"],"recipeInstructions":["Cook the pasta."]}
            """);
        Assert.True(result.IsSemanticallyComplete);
        Assert.Null(result.Recipe!.RecipeYield);
        Assert.Equal(new[] { "510 g beef", "340 g pasta" }, result.Recipe.RecipeIngredient);
        var missingIngredients = RecipeExtractionParser.ParseAndNormalize($$"""
            {"name":"Radiatore","recipeYield":{{yield}},"recipeInstructions":["Cook the pasta."]}
            """);
        Assert.False(missingIngredients.IsSemanticallyComplete);
    }

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

    [Fact]
    public void ParseAndNormalize_ToleratesFractionAndNonNumericSupplyQuantities()
    {
        var result = RecipeExtractionParser.ParseAndNormalize("""
            {
              "name": "Poulet au beurre",
              "recipeIngredient": [
                "1 ml (1/4 de c. à thé) de sel",
                "1/2 oignon, coupé en dés",
                "1 1/2 tasse de riz",
                "2,5 cm de gingembre",
                "Coriandre au goût"
              ],
              "supply": [
                { "@type": "HowToSupply", "name": "Sel", "requiredQuantity": { "@type": "QuantitativeValue", "value": "1/4", "unitText": "tsp" } },
                { "@type": "HowToSupply", "name": "Oignon", "requiredQuantity": { "@type": "QuantitativeValue", "value": "1/2", "unitText": null } },
                { "@type": "HowToSupply", "name": "Riz", "requiredQuantity": { "@type": "QuantitativeValue", "value": "1 1/2", "unitText": "cup" } },
                { "@type": "HowToSupply", "name": "Gingembre", "requiredQuantity": { "@type": "QuantitativeValue", "value": "2,5", "unitText": "cm" } },
                { "@type": "HowToSupply", "name": "Coriandre", "requiredQuantity": { "@type": "QuantitativeValue", "value": "au goût" } }
              ],
              "recipeInstructions": [
                { "@type": "HowToSection", "name": "Préparation", "itemListElement": [{ "@type": "HowToStep", "text": "Cuire le poulet." }] }
              ]
            }
            """);

        Assert.True(result.IsSemanticallyComplete);
        Assert.Equal(5, result.Recipe!.Supply!.Count);
        Assert.Equal(0.25, result.Recipe.Supply[0].RequiredQuantity!.Value);
        Assert.Equal("tsp", result.Recipe.Supply[0].RequiredQuantity!.UnitText);
        Assert.Equal(0.5, result.Recipe.Supply[1].RequiredQuantity!.Value);
        Assert.Equal(1.5, result.Recipe.Supply[2].RequiredQuantity!.Value);
        Assert.Equal(2.5, result.Recipe.Supply[3].RequiredQuantity!.Value);
        Assert.Null(result.Recipe.Supply[4].RequiredQuantity!.Value);
    }

    [Fact]
    public void ParseAndNormalize_ToleratesMalformedSupplyAndNumericNutritionAndTotalTime()
    {
        var result = RecipeExtractionParser.ParseAndNormalize("""
            {
              "name": "Poulet au beurre",
              "totalTime": 30,
              "recipeIngredient": ["4 poitrines de poulet", "Sel"],
              "supply": [
                "Poitrines de poulet",
                { "@type": "HowToSupply", "name": "Sel", "requiredQuantity": "au goût" },
                { "@type": "HowToSupply", "name": "Beurre", "requiredQuantity": 30 }
              ],
              "nutrition": {
                "@type": "NutritionInformation",
                "calories": 480,
                "proteinContent": "35 g"
              },
              "recipeInstructions": [
                { "@type": "HowToStep", "text": "Cuire le poulet." }
              ]
            }
            """);

        Assert.True(result.IsSemanticallyComplete);
        Assert.Null(result.Recipe!.TotalTime);
        Assert.Equal(3, result.Recipe.Supply!.Count);
        Assert.Equal("Poitrines de poulet", result.Recipe.Supply[0].Name);
        Assert.Null(result.Recipe.Supply[0].RequiredQuantity);
        Assert.Null(result.Recipe.Supply[1].RequiredQuantity);
        Assert.Equal(30, result.Recipe.Supply[2].RequiredQuantity!.Value);
        Assert.Equal("480", result.Recipe.Nutrition!.Calories);
        Assert.Equal("35 g", result.Recipe.Nutrition.ProteinContent);
    }
}
