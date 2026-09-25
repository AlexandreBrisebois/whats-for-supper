using Microsoft.Extensions.Options;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public class VegetarianClassificationPolicyTests
{
    [Fact]
    public void PromptRules_UsesConfiguredNonVegetarianIngredients()
    {
        var policy = new VegetarianClassificationPolicy(Options.Create(new VegetarianClassificationOptions
        {
            NonVegetarianIngredients = ["custom stock", "insect protein"]
        }));

        var rules = policy.BuildPromptRules();

        Assert.Contains("custom stock", rules);
        Assert.Contains("insect protein", rules);
        Assert.DoesNotContain("fish sauce", rules);
    }
}
