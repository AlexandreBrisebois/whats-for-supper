using System.Text.Json;
using System.Text.Json.Nodes;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class FoodVocabularyReviewedReleaseTests
{
    private static string Data(string name) => Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
        "docs/data/food-vocabulary", name);

    [Fact]
    public void Reviewed44Release_RetainsEveryAuthoredIdentityQualifierAndExactAlias()
    {
        var draftBytes = File.ReadAllBytes(Data("model-draft-2026-11-12.1.json"));
        Assert.Equal("37f6843c90853e86c6d4d786644d870dea913bb91a6011eeb854eb1a8ff7285a", FoodVocabularyDefinitions.Sha256(draftBytes));
        var bytes = File.ReadAllBytes(Data("model-reviewed-2026-11-13.1.json"));
        Assert.Equal("a44ef018d74f44b1596e0763da3858c128d3c65b9fd27a6c3a8e2b29f50df1b0", FoodVocabularyDefinitions.Sha256(bytes));
        var definitions = FoodVocabularyDefinitions.Read(bytes);
        using var draft = JsonDocument.Parse(draftBytes);
        using var reviewed = JsonDocument.Parse(bytes);
        var foods = reviewed.RootElement.GetProperty("releases")[0].GetProperty("foods").EnumerateArray().ToArray();
        Assert.Equal(44, foods.Length);
        var aliases = 0;
        foreach (var original in draft.RootElement.GetProperty("releases")[0].GetProperty("foods").EnumerateArray())
        {
            var id = original.GetProperty("id").GetGuid();
            var food = Assert.Single(foods, item => item.GetProperty("id").GetGuid() == id);
            foreach (var field in new[] { "labels", "qualifiers" })
                Assert.True(JsonNode.DeepEquals(JsonNode.Parse(original.GetProperty(field).GetRawText()), JsonNode.Parse(food.GetProperty(field).GetRawText())));
            foreach (var alias in original.GetProperty("aliases").EnumerateArray())
            {
                aliases++;
                var text = alias.GetProperty("text").GetString()!;
                var match = Assert.IsType<FoodVocabularyMatch>(definitions.Resolve("  " + text.ToUpperInvariant().Normalize(System.Text.NormalizationForm.FormD) + "  "));
                Assert.Equal(id, match.Food.Id);
                Assert.Equal("model-reviewed-2026-11-13.1", match.DictionaryRevision);
            }
        }
        Assert.Equal(122, aliases);
    }

    [Fact]
    public void Reviewed44Release_LeavesEveryDeclaredAmbiguityAndCompoundUnmapped()
    {
        var definitions = FoodVocabularyDefinitions.Read(File.ReadAllBytes(Data("model-reviewed-2026-11-13.1.json")));
        using var draft = JsonDocument.Parse(File.ReadAllBytes(Data("model-draft-2026-11-12.1.json")));
        var excluded = draft.RootElement.GetProperty("excludedOrAmbiguous").EnumerateArray()
            .SelectMany(group => group.GetProperty("terms").EnumerateArray()).Select(term => term.GetString()!).ToArray();
        Assert.Equal(48, excluded.Length);
        foreach (var term in excluded) Assert.Null(definitions.Resolve(term));
        Assert.Null(definitions.Resolve("onion with herbs"));
        Assert.NotEqual(definitions.Resolve("tomato")!.Food.Id, definitions.Resolve("canned tomatoes")!.Food.Id);
        Assert.NotEqual(definitions.Resolve("salted butter")!.Food.Id, definitions.Resolve("unsalted butter")!.Food.Id);
    }
}
