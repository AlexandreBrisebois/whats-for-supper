using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class CookingStepAllocationTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void SavedAbsoluteUsesScaleFromTheirOwnBasisWithoutChangingDemand(bool splitOil)
    {
        var rowId = Guid.NewGuid();
        var unit = new RecipeUnitDto(splitOil ? "tbsp" : "g", null);
        var amount = LegacyGroceryQuantity.Parse(splitOil ? "1" : "50");
        var source = splitOil ? "Heat 1 tbsp oil." : "Add 50 g pasta from a 400 g package; cook 20 minutes at 180 °C.";
        var steps = Enumerable.Range(0, splitOil ? 2 : 1).Select(_ =>
        {
            var id = Guid.NewGuid();
            var expected = splitOil ? "1 tbsp" : "50 g";
            return new RecipeInstructionStepDto(id, source, "text", [JsonSerializer.SerializeToElement(new
            {
                id = Guid.NewGuid(), ingredientLineId = rowId, stepId = id, validatedContentRevision = "before",
                validatedTextRevision = "text", span = new { start = splitOil ? 5 : 4, end = splitOil ? 11 : 8, expectedText = expected },
                role = "absolute", payload = new { amount, unit }, status = "validated"
            })]);
        }).ToArray();
        var row = new RecipeIngredientLineDto { Id = rowId, Description = splitOil ? "oil" : "pasta",
            Amount = LegacyGroceryQuantity.Parse(splitOil ? "2" : "200"), AmountText = null, Package = null, Unit = unit, Scaling = "proportional",
            Shopping = new(splitOil ? "oil" : "pasta", null, null), Provenance = new("human", null, []) };
        var before = new CanonicalRecipeContent(2, "before", "source", 4, [row], [new(Guid.NewGuid(), null, steps)]);
        var after = splitOil ? before : CookingStepProjection.Revalidate(before, before with
        { ContentRevision = "after", IngredientLines = [row with { Amount = LegacyGroceryQuantity.Parse("250") }] });
        var result = CookingStepProjection.Read(after, splitOil ? 8 : 6);
        Assert.All(result.Sections[0].Steps, step => Assert.Equal(splitOil ? "Heat 2 tbsp oil." :
            "Add 75 g pasta from a 400 g package; cook 20 minutes at 180 °C.", step.Text));
        Assert.Equal(steps.Length, result.ValidatedUses);
        Assert.Equal(0, result.UncertainUses);
        Assert.All(after.InstructionSections[0].Steps, step => Assert.Equal(source, step.Text));
        Assert.Equal(LegacyGroceryQuantity.Parse(splitOil ? "2" : "250"), after.IngredientLines[0].Amount);
        if (!splitOil)
            Assert.Equal("50", after.InstructionSections[0].Steps[0].Bindings[0].GetProperty("payload").GetProperty("amount").GetProperty("value").GetProperty("n").GetString());
    }
    [Theory]
    [InlineData("valid", 2)]
    [InlineData("halves", 2)]
    [InlineData("halvesCorrected", 2)]
    [InlineData("halfAndAbsoluteCorrected", 0)]
    [InlineData("reduced", 0)]
    [InlineData("underallocated", 0)]
    [InlineData("ungrouped", 2)]
    [InlineData("missing", 0)]
    [InlineData("stale", 0)]
    [InlineData("unit", 0)]
    [InlineData("whole", 0)]
    [InlineData("range", 0)]
    [InlineData("alternative", 0)]
    [InlineData("duplicate", 0)]
    public void ExhaustiveGroupsRequireCompleteCompatibleExactProof(string fault, int valid)
    {
        var row = new RecipeIngredientLineDto { Id = Guid.NewGuid(), Description = "oil",
            Amount = LegacyGroceryQuantity.Parse("2"), AmountText = null, Package = null,
            Unit = new("tbsp", null), Scaling = "proportional", Shopping = new("oil", null, null),
            Provenance = new("human", null, []) };
        var ids = new[] { Guid.NewGuid(), Guid.NewGuid() };
        var group = Guid.NewGuid();
        var steps = ids.Select((id, index) =>
        {
            var stepId = Guid.NewGuid();
            var relative = fault.StartsWith("halves") || (fault == "halfAndAbsoluteCorrected" && index == 1);
            var text = relative ? "Use half the oil." : "Use 1 tbsp oil.";
            var spanText = relative ? "half" : "1 tbsp";
            return new RecipeInstructionStepDto(stepId, text, "text", [JsonSerializer.SerializeToElement(new
            {
                id, ingredientLineId = row.Id, stepId, validatedContentRevision = "before",
                validatedTextRevision = fault == "stale" && index == 1 ? "stale" : "text",
                span = new { start = 4, end = 4 + spanText.Length, expectedText = spanText },
                role = relative ? "fraction" : fault == "whole" && index == 1 ? "whole" : "absolute",
                payload = new { fraction = new { n = "1", d = "2" }, amount = LegacyGroceryQuantity.Parse("1"), unit = new RecipeUnitDto(fault == "unit" && index == 1 ? "tsp" : "tbsp", null),
                    allocationGroup = new { id = group, exhaustive = fault != "alternative", bindingIds = fault == "duplicate" ? new[] { ids[0], ids[0] } : ids } },
                status = "validated"
            })]);
        }).ToArray();
        var before = new CanonicalRecipeContent(2, "before", "source", 4, [row], [new(Guid.NewGuid(), null, steps)]);
        var content = fault == "reduced" ? CookingStepProjection.Revalidate(before, before with {
            ContentRevision = "after", IngredientLines = [row with { Amount = LegacyGroceryQuantity.Parse("1") }] }) : before;
        if (fault is "halvesCorrected" or "halfAndAbsoluteCorrected") content = CookingStepProjection.Revalidate(before, before with {
            ContentRevision = "after", IngredientLines = [row with { Amount = LegacyGroceryQuantity.Parse("3") }] });
        if (fault == "missing") content = content with { InstructionSections = [content.InstructionSections[0] with { Steps = [steps[0]] }] };
        if (fault == "range") content = content with { IngredientLines = [row with { Amount = LegacyGroceryQuantity.Parse("2–3") }] };
        if (fault == "underallocated") content = content with { IngredientLines = [row with { Amount = LegacyGroceryQuantity.Parse("3") }] };
        if (fault == "ungrouped") content = content with { IngredientLines = [row with { Amount = LegacyGroceryQuantity.Parse("1") }],
            InstructionSections = content.InstructionSections.Select(section => section with { Steps = section.Steps.Select(step => step with {
                Bindings = step.Bindings.Select(raw => { var node = System.Text.Json.Nodes.JsonNode.Parse(raw.GetRawText())!;
                    node["payload"]!.AsObject().Remove("allocationGroup"); return JsonSerializer.SerializeToElement(node); }).ToArray()
            }).ToArray() }).ToArray() };
        var result = CookingStepProjection.Read(content, 8);
        Assert.Equal(valid, result.ValidatedUses);
        Assert.Equal(fault == "missing" ? 1 : 2 - valid, result.UncertainUses);
        for (var i = 0; i < result.Sections[0].Steps.Count; i++)
        {
            var original = content.InstructionSections[0].Steps[i].Text;
            Assert.Equal(valid > 0 && original == "Use 1 tbsp oil." ? "Use 2 tbsp oil." : original, result.Sections[0].Steps[i].Text);
        }
        Assert.All(content.InstructionSections[0].Steps, step => Assert.Equal(steps.Single(original => original.Id == step.Id).Text, step.Text));
    }

    [Theory]
    [InlineData("valid", 1)]
    [InlineData("corrected", 1)]
    [InlineData("zero", 1)]
    [InlineData("one", 1)]
    [InlineData("range", 1)]
    [InlineData("fixed", 1)]
    [InlineData("large", 1)]
    [InlineData("denominatorZero", 0)]
    [InlineData("negative", 0)]
    [InlineData("aboveOne", 0)]
    [InlineData("notNormalized", 0)]
    [InlineData("numberToken", 0)]
    [InlineData("missing", 0)]
    [InlineData("unknownTotal", 0)]
    [InlineData("stale", 0)]
    [InlineData("unitChanged", 0)]
    [InlineData("sourceChanged", 0)]
    [InlineData("wordingChanged", 0)]
    [InlineData("overlap", 0)]
    [InlineData("overflow", 0)]
    public void RelativeFractionRetainsWordingAndRevalidatesAgainstCurrentTotal(string fault, int valid)
    {
        var row = new RecipeIngredientLineDto { Id = Guid.NewGuid(), Description = "pasta",
            Amount = LegacyGroceryQuantity.Parse("200"), AmountText = "200", Package = null,
            Unit = new("g", null), Scaling = fault == "fixed" ? "fixed" : "proportional",
            Shopping = new("pasta", null, null), Provenance = new("human", null, []) };
        var stepId = Guid.NewGuid();
        var fraction = JsonSerializer.Deserialize<JsonElement>(fault switch {
            "zero" => "{\"n\":\"0\",\"d\":\"1\"}", "one" => "{\"n\":\"1\",\"d\":\"1\"}",
            "denominatorZero" => "{\"n\":\"1\",\"d\":\"0\"}", "negative" => "{\"n\":\"-1\",\"d\":\"2\"}",
            "aboveOne" => "{\"n\":\"3\",\"d\":\"2\"}", "notNormalized" => "{\"n\":\"2\",\"d\":\"4\"}",
            "numberToken" => "{\"n\":1,\"d\":2}", "large" => "{\"n\":\"1\",\"d\":\"99999999999999999999999999999999999999\"}",
            "missing" => "null", _ => "{\"n\":\"1\",\"d\":\"2\"}" });
        var raw = JsonSerializer.SerializeToElement(new {
            id = Guid.NewGuid(), ingredientLineId = row.Id, stepId, validatedContentRevision = "before",
            validatedTextRevision = fault == "stale" ? "old" : "text",
            span = new { start = 4, end = 8, expectedText = "half" }, role = "fraction", payload = new { fraction }, status = "validated"
        });
        var step = new RecipeInstructionStepDto(stepId, "Add half the pasta; cook 20 minutes at 180 °C.", "text", [raw]);
        if (fault == "overlap") step = step with { Bindings = [raw, JsonSerializer.SerializeToElement(new { id = Guid.NewGuid(), span = new { start = 4, end = 8 } })] };
        var before = new CanonicalRecipeContent(2, "before", "source", 4, [row], [new(Guid.NewGuid(), null, [step])]);
        if (fault == "range") before = before with { IngredientLines = [row with { Amount = LegacyGroceryQuantity.Parse("200–250") }] };
        if (fault == "unknownTotal") before = before with { IngredientLines = [row with { Amount = null, AmountText = null }] };
        if (fault == "overflow") before = before with { IngredientLines = [row with { Amount = LegacyGroceryQuantity.Parse("99999999999999999999999999999999999999") }] };
        var after = fault is "corrected" or "unitChanged" or "sourceChanged" or "wordingChanged"
            ? CookingStepProjection.Revalidate(before, before with { ContentRevision = "after",
                SourceRevision = fault == "sourceChanged" ? "new-source" : "source",
                IngredientLines = [row with { Amount = LegacyGroceryQuantity.Parse("250"), AmountText = "250", Unit = fault == "unitChanged" ? new("cup", null) : row.Unit }],
                InstructionSections = [before.InstructionSections[0] with { Steps = [step with { Text = fault == "wordingChanged" ? "Add half the pasta, gently." : step.Text }] }] }) : before;
        var result = CookingStepProjection.Read(after, 6);
        Assert.Equal(valid, result.ValidatedUses);
        Assert.Equal((fault == "overlap" ? 2 : 1) - valid, result.UncertainUses);
        Assert.Equal(after.InstructionSections[0].Steps[0].Text, result.Sections[0].Steps[0].Text);
        Assert.Equal(raw.GetProperty("id").GetGuid(), after.InstructionSections[0].Steps[0].Bindings[0].GetProperty("id").GetGuid());
        Assert.Equal(raw.GetProperty("payload").GetRawText(), after.InstructionSections[0].Steps[0].Bindings[0].GetProperty("payload").GetRawText());
        if (fault == "corrected") Assert.Equal("after", after.InstructionSections[0].Steps[0].Bindings[0].GetProperty("validatedContentRevision").GetString());
    }

    [Theory]
    [InlineData("valid", 2, "remaining (2 tbsp)")]
    [InlineData("corrected", 2, "remaining (4 tbsp)")]
    [InlineData("zero", 2, "remaining (0 tbsp)")]
    [InlineData("fractionRange", 2, "remaining (2–3 tbsp)")]
    [InlineData("scalarRange", 2, "remaining (2–4 tbsp)")]
    [InlineData("fixed", 2, "remaining (1 tbsp)")]
    [InlineData("unknown", 0, "remaining")]
    [InlineData("rangePrior", 0, "remaining")]
    [InlineData("unit", 0, "remaining")]
    [InlineData("stale", 0, "remaining")]
    [InlineData("missing", 0, "remaining")]
    [InlineData("cycle", 0, "remaining")]
    [InlineData("wrongGroup", 0, "remaining")]
    [InlineData("alternative", 0, "remaining")]
    [InlineData("reduced", 0, "remaining")]
    [InlineData("whole", 0, "remaining")]
    [InlineData("overflow", 1, "remaining")]
    public void RemainderRequiresClosedOrderedCompatibleProof(string fault, int valid, string rendered)
    {
        var row = new RecipeIngredientLineDto { Id = Guid.NewGuid(), Description = "oil",
            Amount = LegacyGroceryQuantity.Parse("2"), AmountText = null, Package = null,
            Unit = new("tbsp", null), Scaling = fault == "fixed" ? "fixed" : "proportional",
            Shopping = new("oil", null, null), Provenance = new("human", null, []) };
        var ids = new[] { Guid.NewGuid(), Guid.NewGuid() };
        var groupId = Guid.NewGuid();
        var group = new { id = groupId, exhaustive = fault != "alternative", bindingIds = ids };
        var steps = ids.Select((id, index) => {
            var stepId = Guid.NewGuid(); var relative = index == 0 && fault == "fractionRange";
            var expectedText = index == 1 ? "remaining" : relative ? "half" : "1 tbsp";
            var text = $"Use {expectedText} oil; cook 20 minutes at 180 °C.";
            return new RecipeInstructionStepDto(stepId, text, "text", [JsonSerializer.SerializeToElement(new {
                id, ingredientLineId = row.Id, stepId, validatedContentRevision = "before",
                validatedTextRevision = fault == "stale" && index == 0 ? "old" : "text",
                span = new { start = 4, end = 4 + expectedText.Length, expectedText },
                role = index == 1 ? "remainder" : relative ? "fraction" : fault == "whole" ? "whole" : "absolute",
                payload = new { allocationGroup = group, allocationGroupId = fault == "wrongGroup" ? Guid.NewGuid() : groupId,
                    predecessors = fault == "missing" ? Array.Empty<Guid>() : fault == "cycle" ? new[] { ids[1] } : new[] { ids[0] },
                    amount = LegacyGroceryQuantity.Parse(fault == "rangePrior" ? "1–2" : "1"),
                    fraction = new { n = "1", d = "2" }, unit = new RecipeUnitDto(fault == "unit" ? "tsp" : "tbsp", null) }, status = "validated"
            })]);
        }).ToArray();
        var before = new CanonicalRecipeContent(2, "before", "source", 4, [row], [new(Guid.NewGuid(), null, steps)]);
        if (fault is "fractionRange" or "scalarRange") before = before with { IngredientLines = [row with { Amount = LegacyGroceryQuantity.Parse("2–3") }] };
        if (fault == "unknown") before = before with { IngredientLines = [row with { Amount = null }] };
        if (fault == "overflow") before = before with { IngredientLines = [row with { Amount = LegacyGroceryQuantity.Parse("99999999999999999999999999999999999999") }] };
        var after = fault is "corrected" or "reduced" or "zero" ? CookingStepProjection.Revalidate(before, before with {
            ContentRevision = "after", IngredientLines = [row with { Amount = LegacyGroceryQuantity.Parse(fault == "corrected" ? "3" : fault == "zero" ? "1" : "1/2") }] }) : before;
        var result = CookingStepProjection.Read(after, 8);
        Assert.Equal(valid, result.ValidatedUses); Assert.Equal(2 - valid, result.UncertainUses);
        Assert.Equal($"Use {rendered} oil; cook 20 minutes at 180 °C.", result.Sections[0].Steps[1].Text);
        Assert.Equal(steps.Select(x => x.Text), after.InstructionSections[0].Steps.Select(x => x.Text));
        Assert.Equal(ids, after.InstructionSections[0].Steps.Select(x => x.Bindings[0].GetProperty("id").GetGuid()));
        Assert.Equal(steps[0].Bindings[0].GetProperty("payload").GetRawText(), after.InstructionSections[0].Steps[0].Bindings[0].GetProperty("payload").GetRawText());
    }

    [Theory]
    [InlineData("valid", 2)]
    [InlineData("correctedCount", 2)]
    [InlineData("correctedDoseTotal", 2)]
    [InlineData("original", 2)]
    [InlineData("missing", 1)]
    [InlineData("cycle", 1)]
    [InlineData("duplicateDoseAcrossSteps", 1)]
    [InlineData("stale", 0)]
    [InlineData("duplicate", 0)]
    [InlineData("overlap", 0)]
    [InlineData("range", 1)]
    [InlineData("fixedCount", 1)]
    [InlineData("grouped", 1)]
    [InlineData("badDose", 1)]
    [InlineData("unit", 1)]
    [InlineData("countUnitChanged", 0)]
    [InlineData("countTextChanged", 0)]
    [InlineData("sourceChanged", 0)]
    [InlineData("unknownBasis", 0)]
    [InlineData("overflow", 0)]
    public void PerItemScalesOnlySeparatelyProvenCount(string fault, int valid)
    {
        var countRow = new RecipeIngredientLineDto { Id = Guid.NewGuid(), Description = "pieces",
            Amount = LegacyGroceryQuantity.Parse(fault == "range" ? "4–6" : fault == "overflow" ? "99999999999999999999999999999999999999" : "4"),
            AmountText = null, Unit = new("pieces", null), Package = null,
            Scaling = fault == "fixedCount" ? "fixed" : "proportional", Shopping = new("pieces", null, null), Provenance = new("human", null, []) };
        var doseRow = countRow with { Id = Guid.NewGuid(), Description = "oil", Amount = LegacyGroceryQuantity.Parse("2"),
            Unit = new("tsp", null), Scaling = "proportional", Shopping = new("oil", null, null) };
        var stepId = Guid.NewGuid(); var countId = Guid.NewGuid(); var doseId = Guid.NewGuid();
        const string text = "Spread 1/2 tsp on each of 4 pieces from a 400 g package; cook 20 minutes at 180 °C in a 20 cm pan.";
        var count = JsonSerializer.SerializeToElement(new { id = countId, ingredientLineId = countRow.Id, stepId,
            validatedContentRevision = "before", validatedTextRevision = fault == "stale" ? "old" : "text",
            span = new { start = 26, end = 34, expectedText = "4 pieces" }, role = "whole", payload = new { }, status = "validated" });
        var dose = JsonSerializer.SerializeToElement(new { id = doseId, ingredientLineId = doseRow.Id, stepId,
            validatedContentRevision = "before", validatedTextRevision = "text",
            span = new { start = 7, end = 14, expectedText = "1/2 tsp" }, role = "perItem",
            payload = new { dose = new { amount = LegacyGroceryQuantity.Parse(fault == "badDose" ? "1–2" : "1/2"),
                unit = new RecipeUnitDto(fault == "unit" ? "tbsp" : "tsp", null) },
                countBindingId = fault == "missing" ? Guid.NewGuid() : fault == "cycle" ? doseId : countId }, status = "validated" });
        if (fault == "grouped") {
            var node = System.Text.Json.Nodes.JsonNode.Parse(count.GetRawText())!;
            node["payload"]!["allocationGroup"] = JsonSerializer.SerializeToNode(new { id = Guid.NewGuid(), exhaustive = true, bindingIds = new[] { countId } });
            count = JsonSerializer.SerializeToElement(node);
        }
        var step = new RecipeInstructionStepDto(stepId, text, "text", fault == "duplicate" ? [count, count, dose] : fault == "overlap" ?
            [count, dose, JsonSerializer.SerializeToElement(new { id = Guid.NewGuid(), span = new { start = 26, end = 34 } })] : [count, dose]);
        var before = new CanonicalRecipeContent(2, "before", "source", fault == "unknownBasis" ? null : 4,
            [countRow, doseRow], [new(Guid.NewGuid(), null, [step])]);
        if (fault == "duplicateDoseAcrossSteps") {
            var extraId = Guid.NewGuid();
            var node = System.Text.Json.Nodes.JsonNode.Parse(dose.GetRawText())!;
            node["stepId"] = extraId.ToString();
            before = before with { InstructionSections = [before.InstructionSections[0] with {
                Steps = [step, new(extraId, text, "text", [JsonSerializer.SerializeToElement(node)])] }] };
        }
        var after = fault is "correctedCount" or "correctedDoseTotal" or "countUnitChanged" or "countTextChanged" or "sourceChanged" ?
            CookingStepProjection.Revalidate(before, before with { ContentRevision = "after",
                SourceRevision = fault == "sourceChanged" ? "new" : "source",
                IngredientLines = [countRow with { Amount = LegacyGroceryQuantity.Parse(fault == "correctedCount" ? "6" : "4"),
                    Unit = fault == "countUnitChanged" ? new("g", null) : countRow.Unit },
                    doseRow with { Amount = LegacyGroceryQuantity.Parse(fault == "correctedDoseTotal" ? "3" : "2") }],
                InstructionSections = [before.InstructionSections[0] with { Steps = [step with { Text = fault == "countTextChanged" ? text + " Changed." : text }] }] }) : before;
        var result = CookingStepProjection.Read(after, fault == "original" ? null : 8);
        Assert.Equal(valid, result.ValidatedUses);
        Assert.Equal(after.InstructionSections.SelectMany(x => x.Steps).Sum(x => x.Bindings.Count) - valid, result.UncertainUses);
        var expected = after.InstructionSections[0].Steps[0].Text;
        if (valid > 0 && fault != "original" && fault != "fixedCount") expected = expected.Replace("4 pieces", fault == "correctedCount" ? "12 pieces" : fault == "range" ? "8–12 pieces" : "8 pieces");
        Assert.Equal(expected, result.Sections[0].Steps[0].Text);
        Assert.Equal(after.InstructionSections[0].Steps[0].Text, result.Sections[0].Steps[0].OriginalText);
        Assert.Equal(doseId, after.InstructionSections[0].Steps[0].Bindings.Single(x => x.GetProperty("id").GetGuid() == doseId).GetProperty("id").GetGuid());
        Assert.True(JsonElement.DeepEquals(dose.GetProperty("payload"), after.InstructionSections[0].Steps[0].Bindings.Single(x => x.GetProperty("id").GetGuid() == doseId).GetProperty("payload")));
    }

}
