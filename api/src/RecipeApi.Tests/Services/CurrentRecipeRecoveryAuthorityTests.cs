using System.Text.Json;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CurrentRecipeRecoveryAuthorityTests
{
    private static CurrentRecipeRecoveryBaseline Baseline(CanonicalRecipeExport destination) => new(destination.RecipeId,
        destination.Content.ContentRevision, CurrentRecipeRecoveryAuthority.ContentHash(destination),
        destination.Content.SourceRevision, CurrentRecipeRecoveryAuthority.RawMetadataHash(destination), ["ingredientLines"]);

    private static CanonicalRecipeExport Changed(CanonicalRecipeExport saved) => saved with
    {
        Content = saved.Content with { ContentRevision = "incoming-opaque", Servings = 6 }
    };

    [Fact]
    public void IdenticalContentNeedsNoMergeAuthorityAndDoesNotMintIt()
    {
        var saved = CurrentRecipeExportTests.Example();
        var result = CurrentRecipeRecoveryAuthority.Assess(saved, saved, null);
        Assert.Equal("identical-no-write", result.State);
        Assert.Empty(result.SelectedFields);
    }

    [Fact]
    public void DifferentContentWithoutReviewedBaselineDefers()
    {
        var saved = CurrentRecipeExportTests.Example();
        var result = CurrentRecipeRecoveryAuthority.Assess(Changed(saved), saved, null);
        Assert.Equal("deferred", result.State);
        Assert.Equal("missing-captured-baseline", result.Reason);
        Assert.Empty(result.SelectedFields);
    }

    [Theory]
    [InlineData("recipe")]
    [InlineData("revision")]
    [InlineData("source")]
    [InlineData("evidence")]
    [InlineData("missing-hash")]
    [InlineData("missing-evidence-hash")]
    [InlineData("no-selection")]
    [InlineData("duplicate-selection")]
    [InlineData("unknown-selection")]
    public void StaleMissingOrInvalidCapturedAuthorityDefers(string mutation)
    {
        var saved = CurrentRecipeExportTests.Example();
        var baseline = Baseline(saved);
        baseline = mutation switch
        {
            "recipe" => baseline with { RecipeId = Guid.NewGuid() },
            "revision" => baseline with { ContentRevision = "previous-opaque" },
            "source" => baseline with { SourceRevision = "previous-source" },
            "evidence" => baseline with { RawMetadataHash = new string('0', 64) },
            "missing-hash" => baseline with { ContentHash = "" },
            "missing-evidence-hash" => baseline with { RawMetadataHash = "" },
            "no-selection" => baseline with { SelectedFields = [] },
            "duplicate-selection" => baseline with { SelectedFields = ["servings", "servings"] },
            "unknown-selection" => baseline with { SelectedFields = ["all"] },
            _ => throw new InvalidOperationException()
        };
        var result = CurrentRecipeRecoveryAuthority.Assess(Changed(saved), saved, baseline);
        Assert.Equal("deferred", result.State);
        Assert.Empty(result.SelectedFields);
    }

    [Fact]
    public void MatchingBaselineRetainsOnlyReviewedFieldsAndDoesNotMutateAnything()
    {
        var saved = CurrentRecipeExportTests.Example();
        var incoming = Changed(saved);
        var baseline = Baseline(saved) with { SelectedFields = ["servings"] };
        var before = JsonSerializer.Serialize(new { saved, incoming, baseline });
        var result = CurrentRecipeRecoveryAuthority.Assess(incoming, saved, baseline);
        Assert.Equal("captured-baseline-matches", result.State);
        Assert.Equal(new[] { "servings" }, result.SelectedFields);
        Assert.Equal(before, JsonSerializer.Serialize(new { saved, incoming, baseline }));
        baseline.SelectedFields[0] = "ingredientLines";
        Assert.Equal(new[] { "servings" }, result.SelectedFields);
        // Human/unknown protection and dependencies are still the merge owner's job.
        Assert.NotEqual("publishable", result.State);
    }

    [Fact]
    public void EqualTokenWithDivergentContentIsCorruptEvenWithoutBaseline()
    {
        var saved = CurrentRecipeExportTests.Example();
        var incoming = Changed(saved) with { Content = saved.Content with { Servings = 6 } };
        Assert.Throws<InvalidDataException>(() => CurrentRecipeRecoveryAuthority.Assess(incoming, saved, null));
    }

    [Fact]
    public void EqualCapturedTokenWithDifferentContentHashIsCorrupt()
    {
        var saved = CurrentRecipeExportTests.Example();
        var baseline = Baseline(saved) with { ContentHash = new string('0', 64) };
        Assert.Throws<InvalidDataException>(() => CurrentRecipeRecoveryAuthority.Assess(Changed(saved), saved, baseline));
    }

    [Fact]
    public void HashesSeparateCanonicalContentFromRawEvidencePresenceAndBytes()
    {
        var saved = CurrentRecipeExportTests.Example();
        var explicitNull = saved with { RawMetadata = "null" };
        var absent = saved with { RawMetadata = null };
        Assert.Equal(CurrentRecipeRecoveryAuthority.ContentHash(saved), CurrentRecipeRecoveryAuthority.ContentHash(explicitNull));
        Assert.NotEqual(CurrentRecipeRecoveryAuthority.RawMetadataHash(explicitNull), CurrentRecipeRecoveryAuthority.RawMetadataHash(absent));
        Assert.NotEqual(CurrentRecipeRecoveryAuthority.RawMetadataHash(saved), CurrentRecipeRecoveryAuthority.RawMetadataHash(saved with { RawMetadata = saved.RawMetadata + " " }));
    }
}
