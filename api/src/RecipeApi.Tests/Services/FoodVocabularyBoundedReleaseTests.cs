using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class FoodVocabularyBoundedReleaseTests
{
    [Fact]
    public void PinnedThreeFoodReleaseRetainsReviewedSourceIdsLabelsQualifiersAliasesAndProvenance()
    {
        var bytes = BoundedVocabularyInput.Bytes();
        Assert.Equal(BoundedVocabularyInput.Sha256, FoodVocabularyDefinitions.Sha256(bytes));
        var definitions = new FoodVocabularyCapture(BoundedVocabularyInput.Reference, 1, bytes).Definitions();
        Assert.Equal(BoundedVocabularyInput.Revision, definitions.Revision);
        using var document = JsonDocument.Parse(bytes);
        using var review = JsonDocument.Parse(File.ReadAllBytes(BoundedVocabularyInput.PathFor(".review.json")));
        var sourcePath = Path.Combine(Path.GetDirectoryName(BoundedVocabularyInput.PathFor(".json"))!,
            review.RootElement.GetProperty("selectedFrom").GetProperty("path").GetString()!);
        var sourceBytes = File.ReadAllBytes(sourcePath);
        Assert.Equal(review.RootElement.GetProperty("selectedFrom").GetProperty("sha256").GetString(), FoodVocabularyDefinitions.Sha256(sourceBytes));
        using var source = JsonDocument.Parse(sourceBytes);
        var foods = document.RootElement.GetProperty("releases")[0].GetProperty("foods");
        Assert.Equal(3, foods.GetArrayLength());
        Assert.Empty(document.RootElement.GetProperty("units").EnumerateArray());
        Assert.Equal(15, foods.EnumerateArray().Sum(food => food.GetProperty("aliases").GetArrayLength()));
        foreach (var food in foods.EnumerateArray())
        {
            var retained = Assert.Single(source.RootElement.GetProperty("releases")[0].GetProperty("foods").EnumerateArray(),
                item => item.GetProperty("id").GetGuid() == food.GetProperty("id").GetGuid());
            Assert.True(JsonElement.DeepEquals(retained, food));
        }
        Assert.Equal(BoundedVocabularyInput.Sha256, review.RootElement.GetProperty("reference").GetProperty("sha256").GetString());
        Assert.Equal(BoundedVocabularyInput.ReviewIdentity, review.RootElement.GetProperty("adoptionReviewIdentity").GetString());
        Assert.Equal(FoodVocabularyDefinitions.Sha256(File.ReadAllBytes(BoundedVocabularyInput.PathFor(".corpus.json"))),
            review.RootElement.GetProperty("corpus").GetProperty("sha256").GetString());
    }

    [Fact]
    public void EveryReviewedCorpusOutcomeUsesExactWholePhrasePolicyAndReportsFalseMergesSeparately()
    {
        var definitions = FoodVocabularyDefinitions.Read(BoundedVocabularyInput.Bytes());
        using var corpus = JsonDocument.Parse(File.ReadAllBytes(BoundedVocabularyInput.PathFor(".corpus.json")));
        var exact = 0;
        var unmapped = 0;
        foreach (var item in corpus.RootElement.GetProperty("cases").EnumerateArray())
        {
            var text = item.GetProperty("text").GetString()!;
            var match = definitions.Resolve(text);
            Assert.False(string.IsNullOrWhiteSpace(item.GetProperty("rationale").GetString()));
            if (item.GetProperty("outcome").GetString() == "exact")
            {
                exact++;
                Assert.Equal(item.GetProperty("foodId").GetGuid(), match?.Food.Id);
                Assert.Equal(match!.Food.Id, definitions.Resolve("  " + text.ToUpperInvariant().Normalize(NormalizationForm.FormD) + "  ")?.Food.Id);
            }
            else
            {
                unmapped++;
                Assert.Null(match);
            }
        }
        Assert.Equal(15, exact);
        Assert.Equal(65, unmapped);
        Assert.NotEqual(definitions.Resolve("tomato")!.Food.Id, definitions.Resolve("canned tomatoes")!.Food.Id);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void CollisionReviewRejectsSameLocaleAndAbstainsAcrossLocales(bool sameLocale)
    {
        var node = JsonNode.Parse(BoundedVocabularyInput.Bytes())!;
        var alias = node["releases"]![0]!["foods"]![1]!["aliases"]![sameLocale ? 0 : 2]!;
        alias["text"] = "onion";
        alias["matchKey"] = "onion";
        var bytes = Encoding.UTF8.GetBytes(node.ToJsonString());
        if (sameLocale) Assert.Throws<InvalidDataException>(() => FoodVocabularyDefinitions.Read(bytes));
        else Assert.Null(FoodVocabularyDefinitions.Read(bytes).Resolve("onion"));
    }

    [Fact]
    public void CapturedAuthorityRejectsTwoHashesForOneDocumentRevision()
    {
        var bytes = BoundedVocabularyInput.Bytes();
        var node = JsonNode.Parse(bytes)!;
        node["sourceRef"] = "conflicting-provenance";
        var changed = Encoding.UTF8.GetBytes(node.ToJsonString());
        var different = BoundedVocabularyInput.Reference with { Sha256 = FoodVocabularyDefinitions.Sha256(changed) };
        Assert.Throws<InvalidDataException>(() => new FoodVocabularyAuthority(BoundedVocabularyInput.Reference,
            [new(BoundedVocabularyInput.Reference, 1, bytes), new(different, 1, changed)]).Validate());
    }

    [Fact]
    public void CapturedAuthorityRejectsMissingReferenceAsInvalidData()
    {
        Assert.Throws<InvalidDataException>(() => new FoodVocabularyAuthority(null,
            [new(null!, 1, BoundedVocabularyInput.Bytes())]).Validate());
    }

    [Fact]
    public void ForeignPersistedMembershipRejectsTwoHashesForOneDocumentRevision()
    {
        var path = Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-publication-input.json");
        var node = JsonNode.Parse(File.ReadAllBytes(path))!;
        var original = node["retained"]![0]!.DeepClone();
        var different = original.DeepClone();
        different["sha256"] = new string('a', 64);
        var operation = node["operations"]![0]!.DeepClone();
        var id = Guid.NewGuid().ToString("D");
        operation["operationId"] = id;
        operation["request"]!["operationId"] = id;
        operation["request"]!["expectedHead"] = original.DeepClone();
        operation["request"]!["newFile"] = different.DeepClone();
        var normalize = typeof(CanonicalRecipeContentStore).GetMethod("NormalizeJson",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!;
        operation["inputHash"] = FoodVocabularyDefinitions.Sha256(Encoding.UTF8.GetBytes(
            (string)normalize.Invoke(null, [operation["request"]!.ToJsonString()])!));
        operation["committedOutcome"]!["previousHead"] = original.DeepClone();
        operation["committedOutcome"]!["newHead"] = different.DeepClone();
        operation["committedOutcome"]!["presentationVersion"] = "2";
        node["operations"]!.AsArray().Add(operation);
        node["retained"]!.AsArray().Add(different);
        node["activeSha256"] = new string('a', 64);
        node["presentationVersion"] = "2";
        node["presentationEpoch"] = id;
        Assert.Throws<InvalidDataException>(() => FoodVocabularyStore.InspectMembership(node.ToJsonString()));
    }

    [Fact]
    public void AdoptionAndReversalManifestsBindCapturedInputsAndPreserveEveryBusinessTable()
    {
        using var review = JsonDocument.Parse(File.ReadAllBytes(BoundedVocabularyInput.PathFor(".review.json")));
        foreach (var (suffix, field) in new[] { (".adoption.json", "adoptionManifest"), (".reversal.json", "reversalManifest") })
            Assert.Equal(FoodVocabularyDefinitions.Sha256(File.ReadAllBytes(BoundedVocabularyInput.PathFor(suffix))),
                review.RootElement.GetProperty(field).GetProperty("sha256").GetString());
        using var adoption = JsonDocument.Parse(File.ReadAllBytes(BoundedVocabularyInput.PathFor(".adoption.json")));
        Assert.Equal(BoundedVocabularyInput.Sha256, adoption.RootElement.GetProperty("reference").GetProperty("sha256").GetString());
        var cases = adoption.RootElement.GetProperty("cases").EnumerateArray().ToArray();
        Assert.Equal(new[] { "en", "fr" }, cases.Select(item => item.GetProperty("locale").GetString()));
        foreach (var item in cases)
        {
            Assert.Equal("Passed", item.GetProperty("outcome").GetString());
            Assert.Equal(JsonValueKind.Null, item.GetProperty("priorHead").ValueKind);
            Assert.Empty(item.GetProperty("affectedSet").GetProperty("changedBusinessTables").EnumerateArray());
            Assert.Equal(3, item.GetProperty("ordinaryPublication").GetProperty("mappedLines").GetInt32());
            Assert.Equal(3, item.GetProperty("ordinaryPublication").GetProperty("mappingFacts").GetArrayLength());
            foreach (var table in item.GetProperty("before").GetProperty("tables").EnumerateObject().Where(x => x.Name != "family_settings"))
                Assert.True(JsonElement.DeepEquals(table.Value, item.GetProperty("after").GetProperty("tables").GetProperty(table.Name)), table.Name);
            Assert.Matches("^[a-f0-9]{64}$", item.GetProperty("before").GetProperty("manifestSha256").GetString()!);
        }
        using var reversal = JsonDocument.Parse(File.ReadAllBytes(BoundedVocabularyInput.PathFor(".reversal.json")));
        var bytes = Convert.FromBase64String(reversal.RootElement.GetProperty("acceptedRawBytesBase64").GetString()!);
        Assert.Equal(reversal.RootElement.GetProperty("replacementHead").GetProperty("sha256").GetString(), FoodVocabularyDefinitions.Sha256(bytes));
        Assert.Null(FoodVocabularyDefinitions.Read(bytes).Resolve("onion"));
        Assert.Equal(BoundedVocabularyInput.Sha256, reversal.RootElement.GetProperty("priorHead").GetProperty("sha256").GetString());
        Assert.Equal(3, reversal.RootElement.GetProperty("affectedSet").GetProperty("retainedMappingCount").GetInt32());
        Assert.Equal(0, reversal.RootElement.GetProperty("affectedSet").GetProperty("rewrittenSavedMappings").GetInt32());
        Assert.Empty(reversal.RootElement.GetProperty("affectedSet").GetProperty("changedBusinessTables").EnumerateArray());
        foreach (var table in reversal.RootElement.GetProperty("before").GetProperty("tables").EnumerateObject().Where(x => x.Name != "family_settings"))
            Assert.True(JsonElement.DeepEquals(table.Value, reversal.RootElement.GetProperty("after").GetProperty("tables").GetProperty(table.Name)), table.Name);
    }
}
