using System.Text.Json;
using System.Text.Json.Nodes;
using RecipeApi.Dto;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class CookingStepRelationshipProducerTests
{
    private static CanonicalRecipeContent RemainderUses(string first = "Use 1 tbsp oil.",
        string final = "Finally, use all the remaining oil.", string description = "oil", string total = "2")
    {
        var content = Content(first, description, total, final);
        return content with { IngredientLines = [content.IngredientLines[0] with { Unit = new("tbsp", null) }] };
    }

    [Theory]
    [InlineData("Use 1 tbsp oil.", "Finally, use all the remaining oil.", "oil", "Use 2 tbsp oil.", "Finally, use all the remaining (2 tbsp) oil.", "remaining")]
    [InlineData("Utilisez 1 tbsp d'huile.", "Enfin, utilisez tout le reste d'huile.", "huile", "Utilisez 2 tbsp d'huile.", "Enfin, utilisez tout le reste (2 tbsp) d'huile.", "reste")]
    [InlineData("Utilisez 1 tbsp d’huile.", "Enfin, utilisez tout le reste d’huile.", "huile", "Utilisez 2 tbsp d’huile.", "Enfin, utilisez tout le reste (2 tbsp) d’huile.", "reste")]
    [InlineData("Use 1 tbsp 🍅 oil.", "Finally, use all the remaining 🍅 oil.", "🍅 oil", "Use 2 tbsp 🍅 oil.", "Finally, use all the remaining (2 tbsp) 🍅 oil.", "remaining")]
    [InlineData("Utilisez 1 tbsp d’hui\u0301le.", "Enfin, utilisez tout le reste d’hui\u0301le.", "hui\u0301le", "Utilisez 2 tbsp d’hui\u0301le.", "Enfin, utilisez tout le reste (2 tbsp) d’hui\u0301le.", "reste")]
    public void ExplicitFinalAllRemainingProducesClosedSourceBoundSequence(string first, string final, string description,
        string projectedFirst, string projectedFinal, string remainderText)
    {
        var original = RemainderUses(first, final, description);
        var result = CookingStepRelationshipProducer.Discover(original);
        var steps = result.InstructionSections[0].Steps;
        var prior = Assert.Single(steps[0].Bindings);
        var remainder = Assert.Single(steps[1].Bindings);
        Assert.Equal("absolute", prior.GetProperty("role").GetString());
        Assert.Equal("remainder", remainder.GetProperty("role").GetString());
        Assert.Equal(remainderText, remainder.GetProperty("span").GetProperty("expectedText").GetString());
        var group = prior.GetProperty("payload").GetProperty("allocationGroup");
        Assert.True(group.GetProperty("exhaustive").GetBoolean());
        Assert.Equal(new[] { prior.GetProperty("id").GetGuid(), remainder.GetProperty("id").GetGuid() },
            group.GetProperty("bindingIds").EnumerateArray().Select(id => id.GetGuid()));
        Assert.True(JsonElement.DeepEquals(group, remainder.GetProperty("payload").GetProperty("allocationGroup")));
        Assert.Equal(group.GetProperty("id").GetGuid(), remainder.GetProperty("payload").GetProperty("allocationGroupId").GetGuid());
        Assert.Equal(prior.GetProperty("id").GetGuid(), Assert.Single(remainder.GetProperty("payload").GetProperty("predecessors").EnumerateArray()).GetGuid());
        Assert.Equal(original.IngredientLines, result.IngredientLines);
        Assert.Equal(new[] { first, final }, steps.Select(step => step.Text));
        Assert.Equal(new[] { projectedFirst, projectedFinal }, CookingStepProjection.Read(result, 8).Sections[0].Steps.Select(step => step.Text));
        CookingStepRelationshipProducer.ValidateFresh(result);
    }

    [Fact]
    public void RemainderCorrectionRetainsPriorAmountAndSupportsZeroAndQuietReduction()
    {
        var before = CookingStepRelationshipProducer.Discover(RemainderUses());
        var ids = before.InstructionSections[0].Steps.Select(step => Assert.Single(step.Bindings).GetProperty("id").GetGuid()).ToArray();
        foreach (var (total, final, count) in new[] { ("3", "Finally, use all the remaining (4 tbsp) oil.", 2),
            ("1", "Finally, use all the remaining (0 tbsp) oil.", 2), ("1/2", "Finally, use all the remaining oil.", 0) })
        {
            var changed = before with { ContentRevision = "corrected-" + total,
                IngredientLines = [before.IngredientLines[0] with { Amount = LegacyGroceryQuantity.Parse(total), AmountText = total }] };
            var result = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, changed), before);
            var projection = CookingStepProjection.Read(result, 8);
            Assert.Equal(count, projection.ValidatedUses);
            Assert.Equal(count == 0 ? "Use 1 tbsp oil." : "Use 2 tbsp oil.", projection.Sections[0].Steps[0].Text);
            Assert.Equal(final, projection.Sections[0].Steps[1].Text);
            Assert.Equal(new[] { "Use 1 tbsp oil.", "Finally, use all the remaining oil." }, result.InstructionSections[0].Steps.Select(step => step.Text));
            if (count != 0)
            {
                Assert.Equal(ids, result.InstructionSections[0].Steps.Select(step => Assert.Single(step.Bindings).GetProperty("id").GetGuid()));
                Assert.Equal(JsonSerializer.Serialize(result), JsonSerializer.Serialize(CookingStepRelationshipProducer.Discover(result, result)));
            }
        }
    }

    [Theory]
    [InlineData("Use all the remaining oil.")]
    [InlineData("Finally, use the remaining oil.")]
    [InlineData("Finally, use some remaining oil.")]
    [InlineData("Finally, use all oil.")]
    [InlineData("Finally, use all the remaining oil or butter.")]
    [InlineData("If needed, finally, use all the remaining oil.")]
    [InlineData("Finally, use all the remaining oil. Cook for 20 minutes.")]
    [InlineData("Finally, use all the remaining oil and oil.")]
    [InlineData("Enfin, utilisez le reste d'huile.")]
    [InlineData("Utilisez tout le reste d'huile.")]
    public void UnsupportedFinalIntentNeverEstablishesExhaustiveness(string final)
    {
        var content = RemainderUses(final: final);
        var result = CookingStepRelationshipProducer.Discover(content);
        Assert.All(result.InstructionSections[0].Steps, step => Assert.Empty(step.Bindings));
        Assert.Equal(content.InstructionSections[0].Steps.Select(step => step.Text), CookingStepProjection.Read(result, 8).Sections[0].Steps.Select(step => step.Text));
    }

    [Theory]
    [InlineData("extra")]
    [InlineData("rangeTotal")]
    [InlineData("rangePrior")]
    [InlineData("unknownTotal")]
    [InlineData("unknownUnit")]
    [InlineData("incompatibleUnit")]
    [InlineData("missingPrior")]
    [InlineData("reverse")]
    [InlineData("duplicateRow")]
    [InlineData("duplicateStep")]
    [InlineData("conditional")]
    [InlineData("ambiguousPartial")]
    public void UnsupportedRemainderDependenciesAbstain(string fault)
    {
        var content = RemainderUses();
        var row = content.IngredientLines[0];
        var steps = content.InstructionSections[0].Steps.ToArray();
        if (fault == "extra") steps = [..steps, new(Guid.NewGuid(), "Use oil later.", "extra", [])];
        if (fault == "rangeTotal") row = row with { Amount = LegacyGroceryQuantity.Parse("2–3") };
        if (fault == "rangePrior") steps[0] = steps[0] with { Text = "Use 1–2 tbsp oil." };
        if (fault == "unknownTotal") row = row with { Amount = null };
        if (fault == "unknownUnit") { row = row with { Unit = new("mystery", null) }; steps[0] = steps[0] with { Text = "Use 1 mystery oil." }; }
        if (fault == "incompatibleUnit") steps[0] = steps[0] with { Text = "Use 1 tsp oil." };
        if (fault == "missingPrior") steps = [steps[1]];
        if (fault == "reverse") steps = [steps[1], steps[0]];
        if (fault == "duplicateStep") steps[1] = steps[1] with { Id = steps[0].Id };
        if (fault == "conditional") steps = [..steps, new(Guid.NewGuid(), "If needed, stir.", "extra", [])];
        if (fault == "ambiguousPartial") steps = [..steps, new(Guid.NewGuid(), "Use the rest.", "extra", [])];
        content = content with { IngredientLines = fault == "duplicateRow" ? [row, row with { Id = Guid.NewGuid() }] : [row],
            InstructionSections = [content.InstructionSections[0] with { Steps = steps }] };
        var result = CookingStepRelationshipProducer.Discover(content);
        Assert.All(result.InstructionSections[0].Steps, step => Assert.Empty(step.Bindings));
    }

    [Fact]
    public void RemainderStepEditsReplaceAffectedProofAndRetainUnrelatedRowIdentity()
    {
        var content = RemainderUses();
        var sauce = content.IngredientLines[0] with { Id = Guid.NewGuid(), Description = "sauce", Amount = LegacyGroceryQuantity.Parse("100"),
            AmountText = "100", Unit = new("ml", null), Shopping = new("sauce", null, null) };
        content = content with { IngredientLines = [content.IngredientLines[0], sauce],
            InstructionSections = [content.InstructionSections[0] with { Steps = [..content.InstructionSections[0].Steps,
                new(Guid.NewGuid(), "Add all 100 ml sauce.", "sauce-text", [])] }] };
        var before = CookingStepRelationshipProducer.Discover(content);
        var steps = before.InstructionSections[0].Steps;
        var ids = steps.Select(step => Assert.Single(step.Bindings).GetProperty("id").GetGuid()).ToArray();
        var edited = before with { ContentRevision = "final-edited", InstructionSections = [before.InstructionSections[0] with
            { Steps = [steps[0], steps[1] with { Text = "Finally, add all the remaining oil.", TextRevision = "final-new" }, steps[2]] }] };
        var result = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, edited), before);
        var currentIds = result.InstructionSections[0].Steps.Select(step => Assert.Single(step.Bindings).GetProperty("id").GetGuid()).ToArray();
        Assert.Equal(ids[0], currentIds[0]);
        Assert.NotEqual(ids[1], currentIds[1]);
        Assert.Equal(ids[2], currentIds[2]);
        Assert.Equal(new[] { "Use 2 tbsp oil.", "Finally, add all the remaining (2 tbsp) oil.", "Add all 200 ml sauce." },
            CookingStepProjection.Read(result, 8).Sections[0].Steps.Select(step => step.Text));
        CookingStepRelationshipProducer.ValidateFresh(result);
        var priorEdited = result with { ContentRevision = "prior-edited", InstructionSections = [result.InstructionSections[0] with
            { Steps = [result.InstructionSections[0].Steps[0] with { Text = "Use 1/2 tbsp oil.", TextRevision = "prior-new" }, result.InstructionSections[0].Steps[1], result.InstructionSections[0].Steps[2]] }] };
        var changed = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(result, priorEdited), result);
        Assert.NotEqual(currentIds[0], Assert.Single(changed.InstructionSections[0].Steps[0].Bindings).GetProperty("id").GetGuid());
        Assert.NotEqual(currentIds[1], Assert.Single(changed.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid());
        Assert.Equal(currentIds[2], Assert.Single(changed.InstructionSections[0].Steps[2].Bindings).GetProperty("id").GetGuid());
        var cleared = changed with { ContentRevision = "cleared", IngredientLines = [changed.IngredientLines[0] with { Amount = null, AmountText = null }, sauce] };
        var clearResult = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(changed, cleared), changed);
        Assert.Empty(clearResult.InstructionSections[0].Steps[0].Bindings);
        Assert.Empty(clearResult.InstructionSections[0].Steps[1].Bindings);
        Assert.Equal(currentIds[2], Assert.Single(clearResult.InstructionSections[0].Steps[2].Bindings).GetProperty("id").GetGuid());
    }

    [Theory]
    [InlineData("finalMarker")]
    [InlineData("allMarker")]
    [InlineData("source")]
    [InlineData("textRevision")]
    [InlineData("span")]
    [InlineData("predecessor")]
    [InlineData("cycle")]
    [InlineData("group")]
    [InlineData("memberOrder")]
    [InlineData("missing")]
    [InlineData("missingFinal")]
    [InlineData("duplicate")]
    [InlineData("overlap")]
    [InlineData("extraPayload")]
    [InlineData("emptyGroup")]
    [InlineData("splitGroup")]
    [InlineData("overlappingProof")]
    public void RemainderFreshProofIndependentlyRejectsForgedOrStaleSourceAndGraph(string fault)
    {
        var original = CookingStepRelationshipProducer.Discover(RemainderUses());
        var steps = original.InstructionSections[0].Steps.ToArray();
        var prior = Assert.Single(steps[0].Bindings);
        var final = JsonNode.Parse(Assert.Single(steps[1].Bindings).GetRawText())!;
        if (fault == "finalMarker") steps[1] = steps[1] with { Text = "Use all the remaining oil." };
        if (fault == "allMarker") steps[1] = steps[1] with { Text = "Finally, use the remaining oil." };
        if (fault == "emptyGroup")
        {
            var priorNode = JsonNode.Parse(prior.GetRawText())!;
            priorNode["payload"]!["allocationGroup"]!["id"] = Guid.Empty;
            steps[0] = steps[0] with { Bindings = [JsonSerializer.SerializeToElement(priorNode)] };
            final["payload"]!["allocationGroup"]!["id"] = Guid.Empty;
            final["payload"]!["allocationGroupId"] = Guid.Empty;
        }
        if (fault == "splitGroup")
        {
            var groupId = Guid.NewGuid();
            final["payload"]!["allocationGroup"]!["id"] = groupId;
            final["payload"]!["allocationGroupId"] = groupId;
        }
        if (fault == "source") final["payload"]!["relationshipEvidence"]!["sourceRevision"] = "forged";
        if (fault == "textRevision") final["validatedTextRevision"] = "stale";
        if (fault == "span") final["span"]!["expectedText"] = "oil";
        if (fault == "predecessor") final["payload"]!["predecessors"] = JsonSerializer.SerializeToNode(new[] { Guid.NewGuid() });
        if (fault == "cycle") final["payload"]!["predecessors"] = JsonSerializer.SerializeToNode(new[] { final["id"]!.GetValue<Guid>() });
        if (fault == "group") final["payload"]!["allocationGroupId"] = Guid.NewGuid();
        if (fault == "memberOrder") final["payload"]!["allocationGroup"]!["bindingIds"] = JsonSerializer.SerializeToNode(new[] { final["id"]!.GetValue<Guid>(), prior.GetProperty("id").GetGuid() });
        if (fault == "duplicate") final["id"] = prior.GetProperty("id").GetGuid();
        if (fault == "overlap") final["span"] = JsonSerializer.SerializeToNode(new { start = 28, end = 31, expectedText = "oil" });
        if (fault == "extraPayload") final["payload"]!["unproved"] = true;
        steps[1] = steps[1] with { Bindings = [JsonSerializer.SerializeToElement(final)] };
        if (fault == "overlappingProof")
        {
            var overlapping = final.DeepClone();
            overlapping["id"] = Guid.NewGuid();
            steps[1] = steps[1] with { Bindings = [JsonSerializer.SerializeToElement(final), JsonSerializer.SerializeToElement(overlapping)] };
        }
        if (fault == "missing") steps[0] = steps[0] with { Bindings = [] };
        if (fault == "missingFinal") steps[1] = steps[1] with { Bindings = [] };
        var forged = original with { InstructionSections = [original.InstructionSections[0] with { Steps = steps }] };
        Assert.Throws<InvalidDataException>(() => CookingStepRelationshipProducer.ValidateFresh(forged));
    }
    [Theory]
    [InlineData("Optionally, stir.")]
    [InlineData("Au besoin, remuez.")]
    [InlineData("Provided it thickens, stir.")]
    [InlineData("Otherwise, stir.")]
    [InlineData("Else, simmer.")]
    [InlineData("Either stir or leave it.")]
    [InlineData("Depending on thickness, stir.")]
    [InlineData("Sinon, remuez.")]
    [InlineData("Autrement, remuez.")]
    [InlineData("Selon la texture, remuez.")]
    public void UnnamedBranchCannotCertifyClosedRemainderSequence(string branch)
    {
        var original = RemainderUses();
        var content = original with { InstructionSections = [original.InstructionSections[0] with
            { Steps = [..original.InstructionSections[0].Steps, new(Guid.NewGuid(), branch, "branch", [])] }] };
        var result = CookingStepRelationshipProducer.Discover(content);
        Assert.All(result.InstructionSections[0].Steps.Take(2), step => Assert.Empty(step.Bindings));
        Assert.Equal(0, CookingStepProjection.Read(result, 8).ValidatedUses);
    }

    [Theory]
    [InlineData("Simmer 20 minutes at 180 °C.", 2)]
    [InlineData("Simmer 1 minutes at 1 °C.", 2)]
    [InlineData("Simmer 0 minutes at 180 °C.", 0)]
    [InlineData("Simmer 20 minutes at 0 °C.", 0)]
    [InlineData("Simmer 20 minutes at 180 °C. Optionally stir.", 0)]
    [InlineData("Simmer 20 minutes at 180 °C if needed.", 0)]
    [InlineData("Stir.", 0)]
    public void AdditionalRemainderProcedureMustMatchClosedNeutralGrammar(string procedure, int validated)
    {
        var original = RemainderUses();
        var content = original with { InstructionSections = [original.InstructionSections[0] with
            { Steps = [..original.InstructionSections[0].Steps, new(Guid.NewGuid(), procedure, "procedure", [])] }] };
        var result = CookingStepRelationshipProducer.Discover(content);
        Assert.Equal(validated, CookingStepProjection.Read(result, 8).ValidatedUses);
        Assert.Equal(procedure, CookingStepProjection.Read(result, 8).Sections[0].Steps[2].Text);
        Assert.Equal(procedure, result.InstructionSections[0].Steps[2].Text);
    }

    [Theory]
    [InlineData("Add half of the sauce (50 ml).")]
    [InlineData("Add all 100 ml sauce.")]
    [InlineData("Add 50 ml sauce.")]
    public void ClosedIndependentOtherRowClauseDoesNotInvalidateRemainder(string other)
    {
        var original = RemainderUses();
        var sauce = original.IngredientLines[0] with { Id = Guid.NewGuid(), Description = "sauce", Amount = LegacyGroceryQuantity.Parse("100"),
            AmountText = "100", Unit = new("ml", null), Shopping = new("sauce", null, null) };
        var content = original with { IngredientLines = [original.IngredientLines[0], sauce], InstructionSections = [original.InstructionSections[0] with
            { Steps = [..original.InstructionSections[0].Steps, new(Guid.NewGuid(), other, "other", [])] }] };
        var result = CookingStepRelationshipProducer.Discover(content);
        Assert.Equal(3, CookingStepProjection.Read(result, 8).ValidatedUses);
        CookingStepRelationshipProducer.ValidateFresh(result);
    }

    [Theory]
    [InlineData("oil or butter", "Use 1 tbsp oil or butter.", "Finally, use all the remaining oil or butter.")]
    [InlineData("huile ou beurre", "Utilisez 1 tbsp d’huile ou beurre.", "Enfin, utilisez tout le reste d’huile ou beurre.")]
    public void AlternativeIngredientDescriptionCannotCertifyRemainder(string description, string first, string final)
    {
        var content = RemainderUses(first, final, description);
        var result = CookingStepRelationshipProducer.Discover(content);
        Assert.All(result.InstructionSections[0].Steps, step => Assert.Empty(step.Bindings));
        Assert.Equal(0, CookingStepProjection.Read(result, 8).ValidatedUses);
    }

    [Theory]
    [InlineData("sauce or butter", "Add 50 ml sauce or butter.")]
    [InlineData("sauce if needed", "Add 50 ml sauce if needed.")]
    [InlineData("sauce ou beurre", "Ajouter 50 ml de sauce ou beurre.")]
    public void ConditionalOtherRowDescriptionCannotCertifyIndependentRemainderContext(string description, string other)
    {
        var original = RemainderUses();
        var row = original.IngredientLines[0] with { Id = Guid.NewGuid(), Description = description,
            Amount = LegacyGroceryQuantity.Parse("100"), AmountText = "100", Unit = new("ml", null), Shopping = new(description, null, null) };
        var content = original with { IngredientLines = [original.IngredientLines[0], row], InstructionSections = [original.InstructionSections[0] with
            { Steps = [..original.InstructionSections[0].Steps, new(Guid.NewGuid(), other, "other", [])] }] };
        var result = CookingStepRelationshipProducer.Discover(content);
        Assert.All(result.InstructionSections[0].Steps.Take(2), step => Assert.Empty(step.Bindings));
    }

}
