using System.Text.Json;
using System.Text.Json.Nodes;
using RecipeApi.Dto;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class CookingStepRelationshipProducerTests
{
    private static CanonicalRecipeContent FixedUse(string text = "For any number of portions, use exactly 1 tbsp oil.",
        string description = "oil", string unit = "tbsp", string total = "2")
    {
        var content = Content(text, description, total);
        return content with { IngredientLines = [content.IngredientLines[0] with { Unit = new(unit, null) }] };
    }

    [Theory]
    [InlineData("For any number of portions, use exactly 1 tbsp oil.", "oil", "tbsp", "1 tbsp", "1")]
    [InlineData("For any number of portions, use exactly 1/2 tbsp of oil.", "oil", "tbsp", "1/2 tbsp", "1/2")]
    [InlineData("Quel que soit le nombre de portions, utilisez exactement 1 c. à soupe d'huile.", "huile", "c. à soupe", "1 c. à soupe", "1")]
    [InlineData("Quel que soit le nombre de portions, utilisez exactement ½ c. à soupe d’huile.", "huile", "c. à soupe", "½ c. à soupe", "1/2")]
    [InlineData("For any number of portions, use exactly 1 tbsp 🍅 oil.", "🍅 oil", "tbsp", "1 tbsp", "1")]
    [InlineData("Quel que soit le nombre de portions, utilisez exactement 1 c. à soupe d’hui\u0301le.", "hui\u0301le", "c. à soupe", "1 c. à soupe", "1")]
    public void ExplicitFixedPortionsClauseProducesSourceBoundStandaloneProof(string text, string description,
        string unit, string measurement, string amount)
    {
        var original = FixedUse(text, description, unit);
        var result = CookingStepRelationshipProducer.Discover(original);
        var step = Assert.Single(result.InstructionSections[0].Steps);
        var binding = Assert.Single(step.Bindings);
        Assert.Equal("fixed", binding.GetProperty("role").GetString());
        Assert.Equal(original.ContentRevision, binding.GetProperty("validatedContentRevision").GetString());
        Assert.Equal(step.TextRevision, binding.GetProperty("validatedTextRevision").GetString());
        var span = binding.GetProperty("span");
        Assert.Equal(text.IndexOf(measurement, StringComparison.Ordinal), span.GetProperty("start").GetInt32());
        Assert.Equal(measurement, text[span.GetProperty("start").GetInt32()..span.GetProperty("end").GetInt32()]);
        Assert.Equal(measurement, span.GetProperty("expectedText").GetString());
        var payload = binding.GetProperty("payload");
        Assert.Equal(LegacyGroceryQuantity.Parse(amount), payload.GetProperty("amount").Deserialize<GroceryQuantity>(new JsonSerializerOptions(JsonSerializerDefaults.Web)));
        Assert.Equal(original.IngredientLines[0].Unit, payload.GetProperty("unit").Deserialize<RecipeUnitDto>(new JsonSerializerOptions(JsonSerializerDefaults.Web)));
        Assert.Equal("explicit-fixed-portions-clause", payload.GetProperty("relationshipEvidence").GetProperty("rule").GetString());
        Assert.Equal(original.SourceRevision, payload.GetProperty("relationshipEvidence").GetProperty("sourceRevision").GetString());
        Assert.False(payload.TryGetProperty("allocationGroup", out _));
        Assert.False(payload.TryGetProperty("predecessors", out _));
        Assert.Equal(original.IngredientLines, result.IngredientLines);
        foreach (var target in new int?[] { null, 4, 8, 6, 4 })
        {
            var projected = CookingStepProjection.Read(result, target);
            Assert.Equal(1, projected.ValidatedUses);
            Assert.Equal(text, projected.Sections[0].Steps[0].Text);
            Assert.Equal(text, projected.Sections[0].Steps[0].OriginalText);
        }
        CookingStepRelationshipProducer.ValidateFresh(result);
    }

    [Theory]
    [InlineData("corrected", "3")]
    [InlineData("belowUse", "1/2")]
    [InlineData("equal", "1")]
    [InlineData("fixedRow", "2")]
    [InlineData("unknownBasis", "2")]
    public void FixedProofRetainsAmountIdentityAndWordingAcrossPermittedContexts(string change, string total)
    {
        var original = FixedUse();
        if (change == "fixedRow") original = original with { IngredientLines = [original.IngredientLines[0] with { Scaling = "fixed" }] };
        if (change == "unknownBasis") original = original with { Servings = null };
        var before = CookingStepRelationshipProducer.Discover(original);
        var binding = Assert.Single(before.InstructionSections[0].Steps[0].Bindings);
        var changed = before with { ContentRevision = "after", IngredientLines = [before.IngredientLines[0] with
            { Amount = LegacyGroceryQuantity.Parse(total), AmountText = total }] };
        var result = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, changed), before);
        var retained = Assert.Single(result.InstructionSections[0].Steps[0].Bindings);
        Assert.Equal(binding.GetProperty("id").GetGuid(), retained.GetProperty("id").GetGuid());
        Assert.True(JsonElement.DeepEquals(binding.GetProperty("payload"), retained.GetProperty("payload")));
        Assert.Equal("after", retained.GetProperty("validatedContentRevision").GetString());
        Assert.Equal(1, CookingStepProjection.Read(result, 8).ValidatedUses);
        Assert.Equal(original.InstructionSections[0].Steps[0].Text, CookingStepProjection.Read(result, 8).Sections[0].Steps[0].Text);
        Assert.Equal(JsonSerializer.Serialize(result), JsonSerializer.Serialize(CookingStepRelationshipProducer.Discover(result, result)));
    }

    [Fact]
    public void FreshStandaloneFixedUseDoesNotInferAnAllocationBoundFromTotal()
    {
        var original = FixedUse(total: "1/2");
        var result = CookingStepRelationshipProducer.Discover(original);
        var binding = Assert.Single(result.InstructionSections[0].Steps[0].Bindings);
        Assert.Equal("fixed", binding.GetProperty("role").GetString());
        Assert.False(binding.GetProperty("payload").TryGetProperty("allocationGroup", out _));
        Assert.Equal(1, CookingStepProjection.Read(result, 8).ValidatedUses);
        CookingStepRelationshipProducer.ValidateFresh(result);
    }

    [Theory]
    [InlineData("Use exactly 1 tbsp oil.")]
    [InlineData("For 4 portions, use exactly 1 tbsp oil.")]
    [InlineData("For any number of portions, use 1 tbsp oil.")]
    [InlineData("If needed, for any number of portions, use exactly 1 tbsp oil.")]
    [InlineData("For any number of portions, use exactly 1 tbsp oil or butter.")]
    [InlineData("For any number of portions, do not use exactly 1 tbsp oil.")]
    [InlineData("For any number of portions, use exactly 1 tbsp oil per piece.")]
    [InlineData("For any number of portions, use exactly 1 tbsp oil. Cook 20 minutes at 180 °C.")]
    [InlineData("For any number of portions, use exactly 1 tbsp oil and oil.")]
    [InlineData("For any number of portions, use exactly 1–2 tbsp oil.")]
    [InlineData("For any number of portions, use exactly 0 tbsp oil.")]
    [InlineData("For any number of portions, use exactly 1 tsp oil.")]
    [InlineData("Quel que soit le nombre de portions, utilisez 1 tbsp d'huile.")]
    [InlineData("Quel que soit le nombre de portions, utilisez exactement 1 tbsp d'huile si nécessaire.")]
    public void UnsupportedFixedIntentRetainsReadableOriginal(string text)
    {
        var content = FixedUse(text);
        var result = CookingStepRelationshipProducer.Discover(content);
        Assert.Empty(result.InstructionSections[0].Steps[0].Bindings);
        Assert.Equal(text, CookingStepProjection.Read(result, 8).Sections[0].Steps[0].Text);
    }

    [Theory]
    [InlineData("duplicateRow")]
    [InlineData("duplicateId")]
    [InlineData("duplicateStep")]
    [InlineData("repeat")]
    [InlineData("conditional")]
    [InlineData("unknownTotal")]
    [InlineData("rangeTotal")]
    [InlineData("zeroTotal")]
    [InlineData("unknownUnit")]
    [InlineData("package")]
    [InlineData("sourceRevision")]
    [InlineData("contentRevision")]
    [InlineData("textRevision")]
    [InlineData("stepId")]
    [InlineData("missingDescription")]
    public void UnsupportedFixedDependenciesAbstain(string fault)
    {
        var content = FixedUse();
        var row = content.IngredientLines[0];
        var step = content.InstructionSections[0].Steps[0];
        if (fault == "unknownTotal") row = row with { Amount = null, AmountText = null };
        if (fault == "rangeTotal") row = row with { Amount = LegacyGroceryQuantity.Parse("2–3"), AmountText = "2–3" };
        if (fault == "zeroTotal") row = row with { Amount = LegacyGroceryQuantity.Parse("0"), AmountText = "0" };
        if (fault == "unknownUnit") { row = row with { Unit = new("mystery", null) }; step = step with { Text = step.Text.Replace("tbsp", "mystery") }; }
        if (fault == "package") row = row with { Package = new(new("can", null), new(LegacyGroceryQuantity.Parse("400")!, new("g", null)), "net") };
        if (fault == "sourceRevision") content = content with { SourceRevision = "" };
        if (fault == "contentRevision") content = content with { ContentRevision = "" };
        if (fault == "textRevision") step = step with { TextRevision = "" };
        if (fault == "stepId") step = step with { Id = Guid.Empty };
        if (fault == "missingDescription") row = row with { Description = null! };
        var steps = fault == "repeat" ? new[] { step, new RecipeInstructionStepDto(Guid.NewGuid(), "Use oil later.", "other", []) }
            : fault == "conditional" ? [step, new(Guid.NewGuid(), "If needed, stir.", "other", [])]
            : fault == "duplicateStep" ? [step, step] : [step];
        content = content with { IngredientLines = fault == "duplicateRow" ? [row, row with { Id = Guid.NewGuid() }]
            : fault == "duplicateId" ? [row, row with { Description = "butter" }] : [row],
            InstructionSections = [content.InstructionSections[0] with { Steps = steps }] };
        var result = CookingStepRelationshipProducer.Discover(content);
        Assert.All(result.InstructionSections[0].Steps, item => Assert.Empty(item.Bindings));
    }

    [Theory]
    [InlineData("amount")]
    [InlineData("unit")]
    [InlineData("source")]
    [InlineData("rule")]
    [InlineData("role")]
    [InlineData("revision")]
    [InlineData("textRevision")]
    [InlineData("span")]
    [InlineData("grouped")]
    [InlineData("extra")]
    public void FreshFixedProofRejectsForgedOrStaleEvidence(string fault)
    {
        var original = CookingStepRelationshipProducer.Discover(FixedUse());
        var step = original.InstructionSections[0].Steps[0];
        var proof = JsonNode.Parse(Assert.Single(step.Bindings).GetRawText())!;
        if (fault == "amount") proof["payload"]!["amount"]!["value"]!["n"] = "2";
        if (fault == "unit") proof["payload"]!["unit"]!["text"] = "tsp";
        if (fault == "source") proof["payload"]!["relationshipEvidence"]!["sourceRevision"] = "old";
        if (fault == "rule") proof["payload"]!["relationshipEvidence"]!["rule"] = "explicit-absolute-clause";
        if (fault == "role") proof["role"] = "absolute";
        if (fault == "revision") proof["validatedContentRevision"] = "old";
        if (fault == "textRevision") proof["validatedTextRevision"] = "old";
        if (fault == "span") proof["span"]!["start"] = 0;
        if (fault == "grouped") proof["payload"]!["allocationGroup"] = JsonSerializer.SerializeToNode(new { id = Guid.NewGuid(), exhaustive = true, bindingIds = new[] { proof["id"]!.GetValue<Guid>() } });
        if (fault == "extra") proof["payload"]!["extra"] = true;
        var forged = original with { InstructionSections = [original.InstructionSections[0] with
            { Steps = [step with { Bindings = [JsonSerializer.SerializeToElement(proof)] }] }] };
        Assert.Throws<InvalidDataException>(() => CookingStepRelationshipProducer.ValidateFresh(forged));
    }

    [Fact]
    public void FixedStepSaveAndClearPreserveIndependentWholeProof()
    {
        var content = FixedUse();
        var sauce = content.IngredientLines[0] with { Id = Guid.NewGuid(), Description = "sauce", Amount = LegacyGroceryQuantity.Parse("100"),
            AmountText = "100", Unit = new("ml", null), Shopping = new("sauce", null, null) };
        content = content with { IngredientLines = [content.IngredientLines[0], sauce], InstructionSections = [content.InstructionSections[0] with
            { Steps = [content.InstructionSections[0].Steps[0], new(Guid.NewGuid(), "Add all 100 ml sauce.", "sauce-text", [])] }] };
        var before = CookingStepRelationshipProducer.Discover(content);
        var steps = before.InstructionSections[0].Steps;
        var fixedId = Assert.Single(steps[0].Bindings).GetProperty("id").GetGuid();
        var sauceId = Assert.Single(steps[1].Bindings).GetProperty("id").GetGuid();
        var changed = before with { ContentRevision = "edited", InstructionSections = [before.InstructionSections[0] with
            { Steps = [steps[0] with { Text = steps[0].Text.Replace("1 tbsp", "1/2 tbsp"), TextRevision = "changed" }, steps[1]] }] };
        var result = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, changed), before);
        Assert.NotEqual(fixedId, Assert.Single(result.InstructionSections[0].Steps[0].Bindings).GetProperty("id").GetGuid());
        Assert.Equal(sauceId, Assert.Single(result.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid());
        CookingStepRelationshipProducer.ValidateFresh(result);
        var cleared = result with { ContentRevision = "cleared", IngredientLines = [result.IngredientLines[0] with { Amount = null, AmountText = null }, sauce] };
        var final = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(result, cleared), result);
        Assert.Empty(final.InstructionSections[0].Steps[0].Bindings);
        Assert.Equal(sauceId, Assert.Single(final.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid());
        Assert.Null(final.IngredientLines[0].Amount);
    }

    [Fact]
    public void FixedSourceReplacesChangedAbsoluteProofButPreservesUnownedFixedProof()
    {
        var before = CookingStepRelationshipProducer.Discover(FixedUse("Use 1 tbsp oil."));
        var step = before.InstructionSections[0].Steps[0];
        var oldId = Assert.Single(step.Bindings).GetProperty("id").GetGuid();
        var changed = before with { ContentRevision = "fixed", InstructionSections = [before.InstructionSections[0] with
            { Steps = [step with { Text = FixedUse().InstructionSections[0].Steps[0].Text, TextRevision = "fixed-text" }] }] };
        var result = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, changed), before);
        var binding = Assert.Single(result.InstructionSections[0].Steps[0].Bindings);
        Assert.Equal("fixed", binding.GetProperty("role").GetString());
        Assert.NotEqual(oldId, binding.GetProperty("id").GetGuid());
        CookingStepRelationshipProducer.ValidateFresh(result);

        // Existing supported proof belongs to its existing owner until changed;
        // recognizing its wording does not silently replace that proof.
        var foreign = JsonNode.Parse(binding.GetRawText())!;
        foreign["payload"]!.AsObject().Remove("relationshipEvidence");
        var unowned = result with { InstructionSections = [result.InstructionSections[0] with
            { Steps = [result.InstructionSections[0].Steps[0] with { Bindings = [JsonSerializer.SerializeToElement(foreign)] }] }] };
        var unrelated = unowned with { ContentRevision = "unrelated" };
        var retained = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(unowned, unrelated), unowned);
        var retainedProof = Assert.Single(retained.InstructionSections[0].Steps[0].Bindings);
        Assert.Equal(binding.GetProperty("id").GetGuid(), retainedProof.GetProperty("id").GetGuid());
        Assert.False(retainedProof.GetProperty("payload").TryGetProperty("relationshipEvidence", out _));
        Assert.Equal(1, CookingStepProjection.Read(retained, 8).ValidatedUses);
    }
}
