using System.Text.Json;
using System.Text.Json.Nodes;
using RecipeApi.Dto;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class CookingStepAllocationTests
{
    private static CanonicalRecipeContent FixedContent()
    {
        var row = new RecipeIngredientLineDto { Id = Guid.NewGuid(), Description = "oil", Amount = LegacyGroceryQuantity.Parse("2"),
            AmountText = "2", Unit = new("tbsp", null), Scaling = "proportional", Package = null,
            Shopping = new("oil", null, null), Provenance = new("human", null, []) };
        var steps = new[] { "Heat one tbsp oil from a 400 g package; cook 20 minutes at 180 °C.", "Finish with 1 tbsp oil." }
            .Select((text, index) => {
                var stepId = Guid.NewGuid(); var span = index == 0 ? "one tbsp" : "1 tbsp";
                return new RecipeInstructionStepDto(stepId, text, "text", [JsonSerializer.SerializeToElement(new {
                    id = Guid.NewGuid(), ingredientLineId = row.Id, stepId, validatedContentRevision = "before", validatedTextRevision = "text",
                    span = new { start = text.IndexOf(span, StringComparison.Ordinal), end = text.IndexOf(span, StringComparison.Ordinal) + span.Length, expectedText = span },
                    role = index == 0 ? "fixed" : "absolute", payload = new { amount = LegacyGroceryQuantity.Parse("1"), unit = row.Unit }, status = "validated"
                }, new JsonSerializerOptions(JsonSerializerDefaults.Web))]);
            }).ToArray();
        return new(2, "before", "source", 4, [row], [new(Guid.NewGuid(), null, steps)]);
    }

    [Theory]
    [InlineData("valid")]
    [InlineData("corrected")]
    [InlineData("fixedRow")]
    [InlineData("unknownBasis")]
    [InlineData("stale")]
    [InlineData("contentStale")]
    [InlineData("span")]
    [InlineData("unicode")]
    [InlineData("unit")]
    [InlineData("amount")]
    [InlineData("missingAmount")]
    [InlineData("missingUnit")]
    [InlineData("id")]
    [InlineData("duplicateAcrossSteps")]
    [InlineData("overlap")]
    [InlineData("rowUnitChanged")]
    [InlineData("sourceChanged")]
    [InlineData("grouped")]
    [InlineData("remainderGroup")]
    public void StandaloneFixedRetainsEvidenceWordingAndIndependentScaling(string fault)
    {
        var before = FixedContent(); var steps = before.InstructionSections[0].Steps.ToArray();
        var node = JsonNode.Parse(steps[0].Bindings[0].GetRawText())!;
        if (fault == "stale") node["validatedTextRevision"] = "old";
        if (fault == "contentStale") node["validatedContentRevision"] = "old";
        if (fault == "span") node["span"]!["end"] = 999;
        if (fault == "unicode") { steps[0] = steps[0] with { Text = "😀one tbsp" }; node["span"] = JsonNode.Parse("{\"start\":1,\"end\":10,\"expectedText\":\"x\"}"); }
        if (fault == "unit") node["payload"]!["unit"]!["text"] = "tsp";
        if (fault == "amount") node["payload"]!["amount"]!["value"]!["d"] = "0";
        if (fault == "missingAmount") node["payload"]!.AsObject().Remove("amount");
        if (fault == "missingUnit") node["payload"]!.AsObject().Remove("unit");
        if (fault == "id") node["id"] = Guid.Empty;
        if (fault is "grouped" or "remainderGroup") {
            var group = Guid.NewGuid(); var ids = steps.Select(x => x.Bindings[0].GetProperty("id").GetGuid()).ToArray();
            var proof = JsonSerializer.SerializeToNode(new { id = group, exhaustive = true, bindingIds = ids });
            node["payload"]!["allocationGroup"] = proof!.DeepClone();
            var second = JsonNode.Parse(steps[1].Bindings[0].GetRawText())!;
            second["payload"]!["allocationGroup"] = proof.DeepClone();
            if (fault == "remainderGroup") { second["role"] = "remainder"; second["payload"]!["allocationGroupId"] = group; second["payload"]!["predecessors"] = JsonSerializer.SerializeToNode(new[] { ids[0] }); }
            steps[1] = steps[1] with { Bindings = [JsonSerializer.SerializeToElement(second)] };
        }
        steps[0] = steps[0] with { Bindings = [JsonSerializer.SerializeToElement(node)] };
        if (fault == "duplicateAcrossSteps") {
            var duplicate = node.DeepClone(); duplicate["stepId"] = steps[1].Id;
            steps[1] = steps[1] with { Text = steps[0].Text, Bindings = [JsonSerializer.SerializeToElement(duplicate)] };
        }
        if (fault == "overlap") { var extra = node.DeepClone(); extra["id"] = Guid.NewGuid(); steps[0] = steps[0] with { Bindings = [steps[0].Bindings[0], JsonSerializer.SerializeToElement(extra)] }; }
        before = before with { InstructionSections = [before.InstructionSections[0] with { Steps = steps }],
            Servings = fault == "unknownBasis" ? null : 4,
            IngredientLines = [before.IngredientLines[0] with { Scaling = fault == "fixedRow" ? "fixed" : "proportional" }] };
        var after = fault is "corrected" or "rowUnitChanged" or "sourceChanged" ? CookingStepProjection.Revalidate(before, before with {
            ContentRevision = "after", SourceRevision = fault == "sourceChanged" ? "new-source" : before.SourceRevision,
            IngredientLines = [before.IngredientLines[0] with { Amount = LegacyGroceryQuantity.Parse("3"), Unit = new(fault == "rowUnitChanged" ? "tsp" : "tbsp", null) }] }) : before;
        foreach (var target in new int?[] { null, 4, 8, 6, 4 }) {
            var result = CookingStepProjection.Read(after, target);
            var fixedValid = fault is "valid" or "corrected" or "fixedRow" or "unknownBasis";
            var otherValid = fault is not ("duplicateAcrossSteps" or "rowUnitChanged" or "sourceChanged" or "grouped" or "remainderGroup") && !(fault == "unknownBasis" && target is not null);
            Assert.Equal((fixedValid ? 1 : 0) + (otherValid ? 1 : 0), result.ValidatedUses);
            Assert.Equal(steps[0].Text, result.Sections[0].Steps[0].Text);
            Assert.Equal(steps[0].Text, result.Sections[0].Steps[0].OriginalText);
            if (otherValid) Assert.Equal($"Finish with {(target is null || fault == "fixedRow" ? "1" : CanonicalRecipeContentStore.Render(before.IngredientLines[0] with { Amount = LegacyGroceryQuantity.Scale(LegacyGroceryQuantity.Parse("1"), target.Value, 4), AmountText = null, Unit = null, Description = "" }).TrimEnd())} tbsp oil.", result.Sections[0].Steps[1].Text);
        }
        Assert.Equal(before.InstructionSections[0].Steps[0].Bindings[0].GetProperty("payload").GetRawText(), after.InstructionSections[0].Steps[0].Bindings[0].GetProperty("payload").GetRawText());
        if (fault == "corrected") Assert.Equal("after", after.InstructionSections[0].Steps[0].Bindings[0].GetProperty("validatedContentRevision").GetString());
    }
}
