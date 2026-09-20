using Microsoft.Extensions.Configuration;
using RecipeApi.Dto;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class RecipeSearchFilterOptionsTests
{
    [Fact]
    public void Defaults_PreserveBuiltInMainOrder_FixedMealTypes_AndFallbackShape()
    {
        var options = CreateOptions([]);

        Assert.Equal(["beef", "poultry", "pork", "fish", "pasta", "vegetarian"], options.Main.Select(main => main.Id));
        Assert.All(options.Main, main => Assert.Null(main.Label));
        Assert.Equal(28, options.RediscoveryIntervalDays);

        var fallback = RecipeSearchFilterDiscoveryDto.CreateFallback(options);
        Assert.Null(fallback.GeneratedAt);
        Assert.Equal(options.Main.Select(main => main.Id), fallback.Main.Select(main => main.Id));
        Assert.Equal(["Supper", "Lunch", "Breakfast", "Dessert"], fallback.MealTypes);
        Assert.Empty(fallback.Cuisines.Promoted);
        Assert.Empty(fallback.Cuisines.All);
    }

    [Fact]
    public void ValidOverride_PreservesConfiguredOrder_AndReturnsLabelsOnlyForCustomIds()
    {
        var options = CreateOptions(new Dictionary<string, string?>
        {
            ["RecipeSearchFilters:Main:0:Id"] = "pasta",
            ["RecipeSearchFilters:Main:0:Concept"] = "pasta dishes",
            ["RecipeSearchFilters:Main:0:Label"] = "Should not override translation",
            ["RecipeSearchFilters:Main:1:Id"] = "taco-night",
            ["RecipeSearchFilters:Main:1:Concept"] = "tacos",
            ["RecipeSearchFilters:Main:1:Label"] = "Taco night",
            ["RecipeSearchFilters:RediscoveryIntervalDays"] = "42"
        });

        Assert.Collection(options.Main,
            main => { Assert.Equal("pasta", main.Id); Assert.Equal("pasta dishes", main.Concept); Assert.Null(main.Label); },
            main => { Assert.Equal("taco-night", main.Id); Assert.Equal("tacos", main.Concept); Assert.Equal("Taco night", main.Label); });
        Assert.Equal(42, options.RediscoveryIntervalDays);
    }

    [Theory]
    [InlineData("", "fish", "Custom")]
    [InlineData("custom", "", "Custom")]
    [InlineData("custom", "fish", " ")]
    public void InvalidMainOverride_FallsBackAsOneSafeDefinitionSet(string id, string concept, string label)
    {
        var options = CreateOptions(new Dictionary<string, string?>
        {
            ["RecipeSearchFilters:Main:0:Id"] = id,
            ["RecipeSearchFilters:Main:0:Concept"] = concept,
            ["RecipeSearchFilters:Main:0:Label"] = label
        });

        Assert.Equal(["beef", "poultry", "pork", "fish", "pasta", "vegetarian"], options.Main.Select(main => main.Id));
    }

    [Theory]
    [InlineData("0")]
    [InlineData("366")]
    [InlineData("not-a-number")]
    public void InvalidRediscoveryInterval_FallsBackTo28Days(string interval)
    {
        var options = CreateOptions(new Dictionary<string, string?>
        {
            ["RecipeSearchFilters:RediscoveryIntervalDays"] = interval
        });

        Assert.Equal(28, options.RediscoveryIntervalDays);
    }

    private static RecipeSearchFilterOptions CreateOptions(IEnumerable<KeyValuePair<string, string?>> values) =>
        new(new ConfigurationBuilder().AddInMemoryCollection(values).Build());
}
