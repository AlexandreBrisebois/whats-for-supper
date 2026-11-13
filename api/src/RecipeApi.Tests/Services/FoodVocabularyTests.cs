using RecipeApi.Infrastructure;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.Json;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Dto;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class FoodVocabularyTests
{
    private static byte[] Fixture() => File.ReadAllBytes(Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
        "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json"));

    [Fact]
    public void ExactAliasesPreserveProductIdentityAndNeverUseLabelsOrShortenedPhrases()
    {
        var definitions = FoodVocabularyDefinitions.Read(Fixture());
        Assert.Equal(Guid.Parse("ac9818ee-4c30-4f91-a4ea-0aa4fc7265ee"), definitions.Resolve("  OIGNON  ")?.Food.Id);
        Assert.Equal(Guid.Parse("031a0c4b-2d73-4a70-88aa-8ad3dd680ebb"), definitions.Resolve("canned tomatoes")?.Food.Id);
        Assert.NotEqual(definitions.Resolve("tomato")?.Food.Id, definitions.Resolve("canned tomato")?.Food.Id);
        Assert.Null(definitions.Resolve("Fresh bulb onion")); // A label is not an alias.
        Assert.Null(definitions.Resolve("canned tomatoes with basil"));
    }

    [Theory]
    [InlineData("match-key")]
    [InlineData("collision")]
    [InlineData("unknown")]
    [InlineData("duplicate")]
    [InlineData("revision")]
    public void InvalidDefinitionsCannotGrantAuthority(string change)
    {
        var node = JsonNode.Parse(Fixture())!.AsObject();
        var foods = node["releases"]![0]!["foods"]!.AsArray();
        if (change == "match-key") foods[0]!["aliases"]![0]!["matchKey"] = "tomato";
        if (change == "collision")
        {
            foods[1]!["aliases"]![0]!["text"] = "onion";
            foods[1]!["aliases"]![0]!["matchKey"] = "onion";
        }
        if (change == "unknown") node["mappings"] = new JsonArray();
        if (change == "revision") node["revision"] = "../escape";
        var raw = node.ToJsonString();
        if (change == "duplicate") raw = raw.Replace("\"version\":1", "\"version\":1,\"version\":1", StringComparison.Ordinal);
        Assert.Throws<InvalidDataException>(() => FoodVocabularyDefinitions.Read(Encoding.UTF8.GetBytes(raw)));
    }

    [Fact]
    public void CapturedAuthorityOwnsBytesAndRejectsTamperOrMissingActiveDocument()
    {
        var bytes = Fixture();
        var reference = new FoodVocabularyReference("fixture-three-anchor-v1", FoodVocabularyDefinitions.Sha256(bytes));
        var captured = new FoodVocabularyCapture(reference, 1, bytes);
        bytes[0] = 0;
        var exposed = captured.RawBytes;
        exposed[0] = 0;
        var authority = new FoodVocabularyAuthority(reference, [captured]);
        Assert.NotNull(authority.ActiveDefinitions());
        Assert.Throws<InvalidDataException>(() => new FoodVocabularyAuthority(reference, []).Validate());
        Assert.Throws<InvalidDataException>(() => new FoodVocabularyAuthority(reference, [captured, captured]).Validate());
        Assert.Throws<InvalidDataException>(() => new FoodVocabularyCapture(reference, 2, captured.RawBytes).Definitions());
        Assert.Throws<InvalidDataException>(() => new FoodVocabularyCapture(reference with { Sha256 = new string('0', 64) }, 1,
            captured.RawBytes).Definitions());
    }

    [Fact]
    public void CrossLocaleAmbiguityAbstainsRatherThanSelectingFirstFood()
    {
        var node = JsonNode.Parse(Fixture())!;
        var alias = node["releases"]![0]!["foods"]![1]!["aliases"]![2]!;
        alias["text"] = "onion";
        alias["matchKey"] = "onion";
        var definitions = FoodVocabularyDefinitions.Read(Encoding.UTF8.GetBytes(node.ToJsonString()));
        Assert.Null(definitions.Resolve("onion"));
    }

    [Fact]
    public void ActiveReleaseIsExplicitAndHistoricalAliasesNeverBecomeNewDecisions()
    {
        var node = JsonNode.Parse(Fixture())!;
        var old = node["releases"]![0]!.DeepClone();
        node["revision"] = "fixture-three-anchor-v2";
        node["releases"]![0]!["revision"] = "fixture-three-anchor-v2";
        node["releases"]![0]!["foods"]![0]!["revision"] = "fixture-three-anchor-v2/food-1";
        node["releases"]![0]!["foods"]![0]!["aliases"]!.AsArray().RemoveAt(0); // Remove "onion" from active.
        node["releases"]!.AsArray().Insert(0, old); // History occurs first deliberately.
        var definitions = FoodVocabularyDefinitions.Read(Encoding.UTF8.GetBytes(node.ToJsonString()));
        Assert.Null(definitions.Resolve("onion"));
        Assert.Equal("fixture-three-anchor-v2", definitions.Resolve("oignon")!.DictionaryRevision);
        node["revision"] = "missing-active-release";
        Assert.Throws<InvalidDataException>(() => FoodVocabularyDefinitions.Read(Encoding.UTF8.GetBytes(node.ToJsonString())));
    }

    [Fact]
    public void SourceQualificationAndQuantityCarryUseCapturedDocumentsWithoutChangingOriginalFacts()
    {
        var bytes = Fixture();
        var reference = new FoodVocabularyReference("fixture-three-anchor-v1", FoodVocabularyDefinitions.Sha256(bytes));
        var authority = new FoodVocabularyAuthority(reference, [new(reference, 1, bytes)]);
        var id = Guid.NewGuid();
        var prepare = typeof(CanonicalRecipeContentStore).GetMethod("PrepareFreshSource", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!;
        var original = (CanonicalRecipeExport)prepare.Invoke(null, [id,
            """{"name":"Source","recipeYield":"4 servings","recipeIngredient":["25 g onion"],"supply":[{"name":"onion","requiredQuantity":{"value":25,"unitText":"g"}}],"recipeInstructions":[{"text":"Mix."}]}""", "https://example.test/source"])!;
        var mapped = FoodMappingQualification.Prepare(original, authority, Guid.NewGuid());
        Assert.Equal(original.Content.IngredientLines[0].Description, mapped.Export.Content.IngredientLines[0].Description);
        Assert.Equal(original.Content.IngredientLines[0].Provenance, mapped.Export.Content.IngredientLines[0].Provenance);
        Assert.Equal("25 g onion", CanonicalRecipeContentStore.Render(mapped.Export.Content.IngredientLines[0]));
        Assert.NotNull(mapped.Export.Content.IngredientLines[0].Shopping.FoodId);
        var row = mapped.Export.Content.IngredientLines[0];
        var next = mapped.Export with { Content = mapped.Export.Content with
        {
            ContentRevision = "quantity-next",
            IngredientLines = [row with { Amount = LegacyGroceryQuantity.Parse("50"), AmountText = "50" }]
        } };
        var carried = FoodMappingQualification.Prepare(next, authority, Guid.NewGuid(), mapped.Export.Content, mapped.Evidence);
        Assert.Equal(row.Shopping, carried.Export.Content.IngredientLines[0].Shopping);
        Assert.Equal(mapped.Decisions[0].DecidingOperationId, carried.Decisions[0].DecidingOperationId);
        Assert.Equal("quantity-next", carried.Decisions[0].ContentRevision);
        var bad = mapped.Export with { Content = mapped.Export.Content with
        { IngredientLines = [row with { Shopping = row.Shopping with { FoodId = Guid.NewGuid() } }] } };
        Assert.Throws<InvalidDataException>(() => FoodMappingQualification.Validate(bad.Content, mapped.Evidence, authority, id));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void QuantityChangesCarryActualPrivateRenameOrProtectedClearWithoutReplacingDecidingOperation(bool clear)
    {
        var bytes = Fixture();
        var reference = new FoodVocabularyReference("fixture-three-anchor-v1", FoodVocabularyDefinitions.Sha256(bytes));
        var authority = new FoodVocabularyAuthority(reference, [new(reference, 1, bytes)]);
        var prepare = typeof(CanonicalRecipeContentStore).GetMethod("PrepareFreshSource", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!;
        var source = (CanonicalRecipeExport)prepare.Invoke(null, [Guid.NewGuid(),
            """{"name":"Source","recipeYield":"4 servings","recipeIngredient":["25 g onion"],"supply":[{"name":"onion","requiredQuantity":{"value":25,"unitText":"g"}}],"recipeInstructions":[{"text":"Mix."}]}""", "https://example.test/source"])!;
        var mapped = FoodMappingQualification.Prepare(source, authority, Guid.NewGuid());
        var original = clear ? mapped.Export : source;
        var line = original.Content.IngredientLines[0];
        var changed = original with { Content = original.Content with
        {
            ContentRevision = "actual-name-decision",
            IngredientLines = [line with { Shopping = new(clear ? line.Shopping.Name : "my private onion stash", null, null),
                Provenance = new("human", line.Provenance.SourceRef, ["shopping"]) }]
        } };
        var decidingOperation = Guid.NewGuid();
        var decision = FoodMappingQualification.Prepare(changed, authority, decidingOperation,
            original.Content, clear ? mapped.Evidence : null);
        Assert.Equal(clear ? "protected_clear" : "explicit_private", Assert.Single(decision.Decisions).Kind);
        var changedLine = decision.Export.Content.IngredientLines[0];
        var quantity = decision.Export with { Content = decision.Export.Content with
        { ContentRevision = "quantity-following", IngredientLines = [changedLine with { Amount = LegacyGroceryQuantity.Parse("50"), AmountText = "50" }] } };
        var following = FoodMappingQualification.Prepare(quantity, authority, Guid.NewGuid(), decision.Export.Content, decision.Evidence);
        var retained = Assert.Single(following.Decisions);
        Assert.Equal(clear ? "protected_clear" : "explicit_private", retained.Kind);
        Assert.Equal(decidingOperation, retained.DecidingOperationId);
        Assert.Equal("quantity-following", retained.ContentRevision);
        Assert.Null(following.Export.Content.IngredientLines[0].Shopping.FoodId);
        Assert.Null(following.Export.Content.IngredientLines[0].Shopping.MappingRevision);
    }

    [Fact]
    public void GenuineOldV1AndV3EvidenceStillValidatesWithOriginalExactWireBytes()
    {
        var bytes = File.ReadAllBytes(Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/canonical-old-authority-v1-v3.json"));
        Assert.Equal("ed94bb7c6d31232b24c7e9a0004b02f8ebf86892bb8618709c7795816cdc37c0", FoodVocabularyDefinitions.Sha256(bytes));
        using var document = JsonDocument.Parse(bytes);
        var operations = document.RootElement.GetProperty("proofs")[0].GetProperty("operations");
        var validateOperation = typeof(CanonicalRecipeContentStore).GetMethod("ValidateOriginalOperation",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!;
        Assert.Equal(2, operations.GetArrayLength());
        foreach (var value in operations.EnumerateArray())
        {
            var operation = value.Deserialize<CanonicalRecipeOperation>()!;
            var before = operation.OriginalRequest + "\n" + operation.Result + "\n" + operation.InputHash;
            Assert.True((bool)validateOperation.Invoke(null, [operation])!);
            Assert.Equal(before, operation.OriginalRequest + "\n" + operation.Result + "\n" + operation.InputHash);
        }
        var publications = document.RootElement.GetProperty("proofs")[1].GetProperty("publications");
        var validatePublication = typeof(RecipeFilePublicationStore).GetMethod("ValidateRecoveryJournal",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!;
        Assert.NotEmpty(publications.EnumerateArray());
        foreach (var value in publications.EnumerateArray())
        {
            var publication = value.Deserialize<RecipeFilePublication>()!;
            var before = publication.Payload + "\n" + publication.InputHash + "\n" + publication.ResultHash;
            validatePublication.Invoke(null, [publication]);
            Assert.Equal(before, publication.Payload + "\n" + publication.InputHash + "\n" + publication.ResultHash);
        }
        // This consumes actual old-producer records for pure validation. It does
        // not claim a fresh old binary execution, row installation or DV replay.
    }

    [Theory]
    [InlineData("head")]
    [InlineData("hash")]
    [InlineData("retained")]
    [InlineData("epoch")]
    public void MembershipCannotContradictRetainedCommittedOutcome(string change)
    {
        var node = JsonNode.Parse(File.ReadAllBytes(Path.Combine(Integration.DeploymentCalendarPostgresTests.RepositoryRoot(),
            "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-publication-input.json")))!;
        Assert.Single(FoodVocabularyStore.MembershipReferences(node.ToJsonString()));
        if (change == "head") node["activeSha256"] = new string('0', 64);
        if (change == "hash") node["operations"]![0]!["inputHash"] = new string('0', 64);
        if (change == "retained") node["retained"]!.AsArray().Clear();
        if (change == "epoch") node["presentationEpoch"] = Guid.NewGuid().ToString("D");
        Assert.Throws<InvalidDataException>(() => FoodVocabularyStore.MembershipReferences(node.ToJsonString()));
    }
}
