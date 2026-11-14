using System.Text.Json;
using System.Text.Json.Nodes;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CurrentRecipeExportTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly Guid RecipeId = Guid.Parse("10000000-0000-0000-0000-000000000001");

    public static CanonicalRecipeExport Example() => new(RecipeId, new(2, "revision-opaque", "source-opaque", null,
        [Line("flour", "⅓", "cup"), Line("garlic", "2–3", "cloves"), Line("salt", null, null), Line("salt", "0", "tsp")],
        [new(Guid.NewGuid(), null, [new(Guid.NewGuid(), "Mix 🥣, puis cuire.", "text-opaque", [])])]),
        """{ "recipeYield": "4 portions", "recipeIngredient": ["stale source"], "privateEvidence": "retain exactly" }""");

    private static RecipeIngredientLineDto Line(string description, string? amount, string? unit) => new()
    {
        Id = Guid.NewGuid(), Description = description,
        Amount = amount is null ? null : LegacyGroceryQuantity.Parse(amount), AmountText = amount,
        Unit = unit is null ? null : new(unit, null), Scaling = "proportional", Package = null,
        Shopping = new(description, null, null), Provenance = new("unknown", "evidence:retained", ["amount", "description"])
    };

    // Build the input independently of the writer, so decoder failures cannot hide behind it.
    private static JsonObject Envelope(CanonicalRecipeExport? input = null)
    {
        var export = input ?? Example();
        return new()
        {
            ["format"] = "wfs-recipe", ["version"] = 2, ["recipeId"] = export.RecipeId,
            ["contentSchemaVersion"] = 2, ["contentRevision"] = export.Content.ContentRevision,
            ["content"] = JsonSerializer.SerializeToNode(export.Content, Json), ["rawMetadata"] = export.RawMetadata
        };
    }

    private static CanonicalRecipeExport Read(JsonNode node) =>
        RecipeExportContent.ReadCurrent(JsonSerializer.SerializeToElement(node), RecipeId);

    [Fact]
    public void DeclaredCurrentEnvelope_PreservesExactFactsEvidenceAndUnknownBasis()
    {
        var input = Example();
        var decoded = Read(Envelope(input));
        Assert.Equal(JsonSerializer.Serialize(input, Json), JsonSerializer.Serialize(decoded, Json));
        Assert.Null(decoded.Content.Servings);
        Assert.Equal("⅓", decoded.Content.IngredientLines[0].AmountText);
        Assert.Equal(LegacyGroceryQuantity.Parse("1/3"), decoded.Content.IngredientLines[0].Amount);
        Assert.Equal(LegacyGroceryQuantity.Parse("2–3"), decoded.Content.IngredientLines[1].Amount);
        Assert.Null(decoded.Content.IngredientLines[2].Amount);
        Assert.Equal(LegacyGroceryQuantity.Parse("0"), decoded.Content.IngredientLines[3].Amount);
        Assert.Equal(4, decoded.Content.IngredientLines.Select(x => x.Id).Distinct().Count());
    }

    [Fact]
    public void RepeatedRoundTrip_KeepsExplicitClearsSeparateFromRetainedSource()
    {
        var original = Example();
        var cleared = original with { Content = original.Content with { IngredientLines = [], InstructionSections = [] } };
        var decoded = cleared;
        for (var index = 0; index < 3; index++)
        {
            using var document = JsonDocument.Parse(RecipeExportContent.WriteCurrent(decoded));
            decoded = RecipeExportContent.ReadCurrent(document.RootElement, RecipeId);
            Assert.Equal(JsonSerializer.Serialize(cleared, Json), JsonSerializer.Serialize(decoded, Json));
            Assert.Empty(decoded.Content.IngredientLines);
            Assert.Empty(decoded.Content.InstructionSections);
        }
        decoded = Read(Envelope(original with { RawMetadata = null }));
        Assert.Null(decoded.RawMetadata);
        Assert.Equal(4, decoded.Content.IngredientLines.Count);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("[]")]
    [InlineData("null")]
    [InlineData("{\"backupContentVersion\":1,\"rawMetadata\":null,\"ingredients\":\"[]\",\"servings\":null}")]
    [InlineData("{\"format\":\"wfs-recipe\",\"version\":1}")]
    public void RoutineDecoder_RejectsLegacyAndUnversionedInput(string json)
    {
        using var document = JsonDocument.Parse(json);
        Assert.Throws<InvalidDataException>(() => RecipeExportContent.ReadCurrent(document.RootElement, RecipeId));
    }

    [Theory]
    [InlineData("recipeId")]
    [InlineData("contentSchemaVersion")]
    [InlineData("contentRevision")]
    [InlineData("content")]
    [InlineData("rawMetadata")]
    public void MissingRequiredProperty_IsNotEquivalentToNull(string property)
    {
        var envelope = Envelope();
        envelope.Remove(property);
        Assert.Throws<InvalidDataException>(() => Read(envelope));
    }

    [Theory]
    [InlineData("id")]
    [InlineData("amount")]
    [InlineData("amountText")]
    [InlineData("unit")]
    [InlineData("package")]
    [InlineData("provenance")]
    public void MissingSavedRowField_IsRejected(string property)
    {
        var envelope = Envelope();
        envelope["content"]!["ingredientLines"]![0]!.AsObject().Remove(property);
        Assert.Throws<InvalidDataException>(() => Read(envelope));
    }

    [Theory]
    [InlineData("revision")]
    [InlineData("source")]
    [InlineData("basis")]
    [InlineData("duplicate")]
    [InlineData("zero-id")]
    [InlineData("client-id")]
    [InlineData("quantity")]
    [InlineData("notation")]
    [InlineData("unknown-protection")]
    [InlineData("duplicate-protection")]
    [InlineData("missing-protection")]
    [InlineData("unknown-origin")]
    [InlineData("step-id")]
    [InlineData("text-revision")]
    [InlineData("null-steps")]
    [InlineData("missing-bindings")]
    public void InvalidCanonicalFactsOrIdentities_FailPreflight(string mutation)
    {
        var envelope = Envelope();
        var content = envelope["content"]!;
        var line = content["ingredientLines"]![0]!;
        var step = content["instructionSections"]![0]!["steps"]![0]!;
        switch (mutation)
        {
            case "revision": content["contentRevision"] = "different"; break;
            case "source": content["sourceRevision"] = ""; break;
            case "basis": content["servings"] = 0; break;
            case "duplicate": content["ingredientLines"]![1]!["id"] = line["id"]!.DeepClone(); break;
            case "zero-id": line["id"] = Guid.Empty; break;
            case "client-id": line.AsObject().Remove("id"); line["clientId"] = "new"; break;
            case "quantity": line["amount"]!["value"]!["d"] = "0"; break;
            case "notation": line["amountText"] = "0.33"; break;
            case "unknown-protection": line["provenance"]!["protectedFields"] = new JsonArray("made-up"); break;
            case "duplicate-protection": line["provenance"]!["protectedFields"] = new JsonArray("amount", "amount"); break;
            case "missing-protection": line["provenance"]!.AsObject().Remove("protectedFields"); break;
            case "unknown-origin": line["provenance"]!["origin"] = "made-up"; break;
            case "step-id": step["id"] = line["id"]!.DeepClone(); break;
            case "text-revision": step["textRevision"] = null; break;
            case "null-steps": content["instructionSections"]![0]!["steps"] = null; break;
            case "missing-bindings": step.AsObject().Remove("bindings"); break;
        }
        Assert.Throws<InvalidDataException>(() => Read(envelope));
    }

    [Fact]
    public void Decoder_RejectsRecipeMismatchUnknownAndDuplicateMembers()
    {
        var envelope = Envelope();
        Assert.Throws<InvalidDataException>(() => RecipeExportContent.ReadCurrent(JsonSerializer.SerializeToElement(envelope), Guid.NewGuid()));
        envelope["unknown"] = true;
        Assert.Throws<InvalidDataException>(() => Read(envelope));
        envelope.Remove("unknown");
        var json = envelope.ToJsonString().Insert(1, "\"version\":1,");
        using var duplicate = JsonDocument.Parse(json);
        Assert.Throws<InvalidDataException>(() => RecipeExportContent.ReadCurrent(duplicate.RootElement, RecipeId));
    }

    [Fact]
    public void InternalVersionOneDecoder_RemainsSeparateAndAuthoritative()
    {
        using var document = JsonDocument.Parse("""{"backupContentVersion":1,"rawMetadata":"{\"recipeYield\":\"4 portions\"}","ingredients":"[]","servings":null}""");
        var legacy = RecipeExportContent.Read(document.RootElement)!;
        Assert.Null(legacy.Servings);
        Assert.Equal("[]", legacy.Ingredients);
        Assert.Throws<InvalidDataException>(() => RecipeExportContent.ReadCurrent(document.RootElement, RecipeId));
    }

    [Fact]
    public void CurrentEnvelope_PreservesPackageCapacityFoodMappingAndIndependentUnitDefinitions()
    {
        var input = Example();
        var row = input.Content.IngredientLines[0] with
        {
            Amount = LegacyGroceryQuantity.Parse("2"), AmountText = "2", Unit = new("cans", "count:can"),
            Package = new(new("can", "count:can"), new(LegacyGroceryQuantity.Parse("400")!, new("g", "mass:g")), "net"),
            Shopping = new("tomates", Guid.NewGuid(), "dictionary-captured"),
            Provenance = new("human", null, ["amount", "shopping"])
        };
        input = input with { Content = input.Content with { Servings = 3, IngredientLines = [row] } };
        var decoded = Read(JsonNode.Parse(RecipeExportContent.WriteCurrent(input))!);
        Assert.Equal(JsonSerializer.Serialize(input, Json), JsonSerializer.Serialize(decoded, Json));
        Assert.Equal("mass:g", decoded.Content.IngredientLines[0].Package!.Capacity.Unit.DefinitionId);
        Assert.Equal("4 portions", JsonDocument.Parse(decoded.RawMetadata!).RootElement.GetProperty("recipeYield").GetString());
    }

    private static JsonObject BoundEnvelope()
    {
        var envelope = Envelope();
        var content = envelope["content"]!;
        var step = content["instructionSections"]![0]!["steps"]![0]!;
        step["bindings"] = new JsonArray(new JsonObject
        {
            ["id"] = Guid.NewGuid(), ["ingredientLineId"] = content["ingredientLines"]![0]!["id"]!.DeepClone(),
            ["stepId"] = step["id"]!.DeepClone(), ["validatedContentRevision"] = content["contentRevision"]!.DeepClone(),
            ["validatedTextRevision"] = step["textRevision"]!.DeepClone(),
            ["span"] = new JsonObject { ["start"] = 4, ["end"] = 6, ["expectedText"] = "🥣" },
            ["role"] = "mention", ["payload"] = new JsonObject(), ["status"] = "valid"
        });
        return envelope;
    }

    [Fact]
    public void SavedBinding_PreservesExactUtf16SpanAndPayload()
    {
        var envelope = BoundEnvelope();
        var decoded = Read(envelope);
        var roundTrip = Read(JsonNode.Parse(RecipeExportContent.WriteCurrent(decoded))!);
        Assert.Equal(JsonSerializer.Serialize(decoded, Json), JsonSerializer.Serialize(roundTrip, Json));
        var binding = Assert.Single(roundTrip.Content.InstructionSections[0].Steps[0].Bindings);
        Assert.Equal(4, binding.GetProperty("span").GetProperty("start").GetInt32());
        Assert.Equal("🥣", binding.GetProperty("span").GetProperty("expectedText").GetString());
    }

    [Theory]
    [InlineData("missing-role")]
    [InlineData("missing-span")]
    [InlineData("missing-ingredient")]
    [InlineData("foreign-step")]
    [InlineData("content-revision")]
    [InlineData("text-revision")]
    [InlineData("start-surrogate")]
    [InlineData("end-surrogate")]
    [InlineData("expected-text")]
    [InlineData("overlap")]
    public void BindingIdentityAndSpanCorruption_IsRejectedAsInvalidData(string mutation)
    {
        var envelope = BoundEnvelope();
        var bindings = envelope["content"]!["instructionSections"]![0]!["steps"]![0]!["bindings"]!.AsArray();
        var binding = bindings[0]!;
        switch (mutation)
        {
            case "missing-role": binding.AsObject().Remove("role"); break;
            case "missing-span": binding.AsObject().Remove("span"); break;
            case "missing-ingredient": binding["ingredientLineId"] = Guid.NewGuid(); break;
            case "foreign-step": binding["stepId"] = Guid.NewGuid(); break;
            case "content-revision": binding["validatedContentRevision"] = "older"; break;
            case "text-revision": binding["validatedTextRevision"] = "older"; break;
            case "start-surrogate": binding["span"]!["start"] = 5; break;
            case "end-surrogate": binding["span"]!["end"] = 5; break;
            case "expected-text": binding["span"]!["expectedText"] = "other"; break;
            case "overlap": var other = binding.DeepClone(); other["id"] = Guid.NewGuid(); bindings.Add(other); break;
        }
        Assert.Throws<InvalidDataException>(() => Read(envelope));
    }

    [Fact]
    public void IdenticalReplay_ComparesFactsAndEvidenceWithoutOrderingOpaqueTokens()
    {
        var saved = Example();
        var incoming = Read(Envelope(saved));
        Assert.True(RecipeExportContent.IsIdenticalCurrent(incoming, saved));
        Assert.True(RecipeExportContent.IsIdenticalCurrent(incoming with { RawMetadata = JsonSerializer.Serialize(JsonDocument.Parse(saved.RawMetadata!).RootElement) }, saved));
        Assert.False(RecipeExportContent.IsIdenticalCurrent(incoming with { Content = incoming.Content with { ContentRevision = "000-older-looking" } }, saved));
        Assert.False(RecipeExportContent.IsIdenticalCurrent(incoming with { RawMetadata = null }, saved));
    }

    [Fact]
    public void IdenticalTokenWithDifferentCanonicalContent_IsCorrupt()
    {
        var saved = Example();
        Assert.Throws<InvalidDataException>(() => RecipeExportContent.IsIdenticalCurrent(saved with
            { Content = saved.Content with { Servings = 5 } }, saved));
        Assert.Throws<InvalidDataException>(() => RecipeExportContent.IsIdenticalCurrent(saved with { RecipeId = Guid.NewGuid() }, saved));
    }

    [Fact]
    public void Replay_DistinguishesAbsentEvidenceFromRetainedJsonNull()
    {
        var saved = Example() with { RawMetadata = null };
        var retainedNull = saved with { RawMetadata = "null" };
        Assert.False(RecipeExportContent.IsIdenticalCurrent(retainedNull, saved));
        Assert.False(RecipeExportContent.IsIdenticalCurrent(saved, retainedNull));
    }
}
