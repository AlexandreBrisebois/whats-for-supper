using System.Text;
using System.Text.Json.Nodes;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class FoodVocabularyHistoryObservationTests
{
    private static FoodVocabularyInventoryFacts Empty() => new(new(null), [], [], [],
        new([], [], [], [], [], [], [], [], [], [], []), new(FoodVocabularyOverrideCoverage.CapturedV1, []));

    [Fact]
    public void EmptySnapshot_RoundTripsExactContextAndCompleteOwnerCoverage()
    {
        var snapshot = Guid.NewGuid();
        var bytes = FoodVocabularyInventoryQualification.WriteHistoryObservations(Empty(), "snapshot", snapshot, null, null);
        var observed = Assert.Single(FoodVocabularyInventoryQualification.ReadHistoryObservations(bytes));
        Assert.Equal(snapshot, observed.Context.SnapshotId);
        Assert.Equal("snapshot", observed.Context.Kind);
        Assert.Equal(FoodVocabularyOverrideCoverage.CapturedV1, observed.Facts.Overrides.Coverage);
        Assert.Empty(observed.Facts.Overrides.Rows!);
        Assert.Equal(bytes, FoodVocabularyInventoryQualification.WriteHistoryObservations(observed.Facts,
            observed.Context.Kind, snapshot, null, null));
    }

    [Theory]
    [InlineData("null-context")]
    [InlineData("null-context-id")]
    [InlineData("string-version")]
    [InlineData("unknown-field")]
    [InlineData("duplicate-owner")]
    [InlineData("changed-raw")]
    public void MalformedMetadata_RejectsWithInvalidData(string mutation)
    {
        var bytes = FoodVocabularyInventoryQualification.WriteHistoryObservations(Empty(), "snapshot", Guid.NewGuid(), null, null);
        var root = JsonNode.Parse(bytes)!.AsObject();
        var row = root["observations"]![0]!.AsObject();
        switch (mutation)
        {
            case "null-context": row["context"] = null; break;
            case "null-context-id": row["context"]!["contextId"] = null; break;
            case "string-version": root["version"] = "1"; break;
            case "unknown-field": root["extra"] = true; break;
            case "duplicate-owner": root["observations"]!.AsArray().Add(row.DeepClone()); break;
            case "changed-raw": row["rawJson"] = "{}"; break;
        }
        Assert.Throws<InvalidDataException>(() => FoodVocabularyInventoryQualification.ReadHistoryObservations(Encoding.UTF8.GetBytes(root.ToJsonString())));
    }

    [Fact]
    public void InvalidUtf8_RejectsWithInvalidData() => Assert.Throws<InvalidDataException>(() =>
        FoodVocabularyInventoryQualification.ReadHistoryObservations([0xff]));
}
