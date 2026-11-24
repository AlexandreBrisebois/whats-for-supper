using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class FoodVocabularyBoundedReleaseTests
{
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
        var normalize = typeof(StructuredRecipeContentStore).GetMethod("NormalizeJson",
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
}
