using System.Text.Json;
using System.Text.Json.Nodes;
using RecipeApi.Dto;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class CookingStepRelationshipProducerTests
{
    private const string PerItemEnglish = "For all 4 pieces of tofu, use exactly 1/2 tsp of oil on each piece.";
    private const string PerItemFrench = "Pour tous les 4 morceaux de tofu, utilisez exactement 1/2 c. à thé d’huile sur chaque morceau.";
    private static readonly JsonSerializerOptions PerItemJson = new(JsonSerializerDefaults.Web);

    private static CanonicalRecipeContent PerItemContent(string text = PerItemEnglish, string countName = "tofu",
        string doseName = "oil", string countUnit = "pieces", string doseUnit = "tsp")
    {
        var content = Content(text, countName, "4");
        var count = content.IngredientLines[0] with { Unit = new(countUnit, null) };
        var dose = count with { Id = Guid.NewGuid(), Description = doseName, Amount = LegacyGroceryQuantity.Parse("2"),
            AmountText = "2", Unit = new(doseUnit, null), Shopping = new(doseName, null, null) };
        return content with { IngredientLines = [count, dose] };
    }

    private static RecipeInstructionStepDto PerItemStep(CanonicalRecipeContent content) => content.InstructionSections[0].Steps[0];
    private static CanonicalRecipeContent PerItemWithBindings(CanonicalRecipeContent content, params JsonElement[] bindings) =>
        content with { InstructionSections = [content.InstructionSections[0] with { Steps = [PerItemStep(content) with { Bindings = bindings }] }] };
    private static JsonElement PerItemMutate(JsonElement binding, Action<JsonObject> change)
    {
        var node = JsonNode.Parse(binding.GetRawText())!.AsObject();
        change(node);
        return JsonSerializer.SerializeToElement(node);
    }

    // Deliberately hand-supplied graph for validating hostile submissions. Producer
    // acceptance below always starts with empty bindings, never with this helper.
    private static CanonicalRecipeContent PerItemSubmission(CanonicalRecipeContent content)
    {
        var step = PerItemStep(content);
        var count = content.IngredientLines[0]; var dose = content.IngredientLines[1];
        var countId = Guid.NewGuid(); var doseId = Guid.NewGuid();
        JsonElement Binding(Guid id, RecipeIngredientLineDto row, string role, string measurement, object payload) =>
            JsonSerializer.SerializeToElement(new { id, ingredientLineId = row.Id, stepId = step.Id,
                validatedContentRevision = content.ContentRevision, validatedTextRevision = step.TextRevision,
                span = new { start = step.Text.IndexOf(measurement, StringComparison.Ordinal),
                    end = step.Text.IndexOf(measurement, StringComparison.Ordinal) + measurement.Length, expectedText = measurement },
                role, payload, status = "validated" });
        object Evidence(string amount) => new { version = 1, rule = "explicit-per-item-clause", sourceRevision = content.SourceRevision,
            originalAmount = LegacyGroceryQuantity.Parse(amount) };
        return PerItemWithBindings(content,
            Binding(countId, count, "whole", "4 " + count.Unit!.Text, new { relationshipEvidence = Evidence("4") }),
            Binding(doseId, dose, "perItem", "1/2 " + dose.Unit!.Text, new { relationshipEvidence = Evidence("1/2"),
                dose = new { amount = LegacyGroceryQuantity.Parse("1/2"), unit = dose.Unit }, countBindingId = countId }));
    }

    [Theory]
    [InlineData(PerItemEnglish, "tofu", "oil", "pieces", "tsp", "4 pieces", "1/2 tsp", "For all 8 pieces of tofu, use exactly 1/2 tsp of oil on each piece.")]
    [InlineData(PerItemFrench, "tofu", "huile", "morceaux", "c. à thé", "4 morceaux", "1/2 c. à thé", "Pour tous les 8 morceaux de tofu, utilisez exactement 1/2 c. à thé d’huile sur chaque morceau.")]
    [InlineData("For all 4 pieces of 🍅 tofu, use exactly ½ tsp of oil on each piece.", "🍅 tofu", "oil", "pieces", "tsp", "4 pieces", "½ tsp", "For all 8 pieces of 🍅 tofu, use exactly ½ tsp of oil on each piece.")]
    [InlineData("Pour tous les 4 morceaux de tofu, utilisez exactement 1/2 c. à thé d'huíle sur chaque morceau.", "tofu", "huíle", "morceaux", "c. à thé", "4 morceaux", "1/2 c. à thé", "Pour tous les 8 morceaux de tofu, utilisez exactement 1/2 c. à thé d'huíle sur chaque morceau.")]
    public void PerItemProducerDerivesDistinctSourceBoundCountAndDose(string text, string countName, string doseName,
        string countUnit, string doseUnit, string countText, string doseText, string projected)
    {
        var original = PerItemContent(text, countName, doseName, countUnit, doseUnit);
        Assert.Empty(PerItemStep(original).Bindings);
        var result = CookingStepRelationshipProducer.Discover(original);
        var bindings = PerItemStep(result).Bindings;
        Assert.Equal(2, bindings.Count);
        for (var index = 0; index < 2; index++)
        {
            var binding = bindings[index]; var measurement = index == 0 ? countText : doseText;
            Assert.Equal(index == 0 ? "whole" : "perItem", binding.GetProperty("role").GetString());
            Assert.Equal(original.IngredientLines[index].Id, binding.GetProperty("ingredientLineId").GetGuid());
            Assert.Equal(original.ContentRevision, binding.GetProperty("validatedContentRevision").GetString());
            Assert.Equal(PerItemStep(original).TextRevision, binding.GetProperty("validatedTextRevision").GetString());
            var span = binding.GetProperty("span");
            Assert.Equal(text.IndexOf(measurement, StringComparison.Ordinal), span.GetProperty("start").GetInt32());
            Assert.Equal(measurement, text[span.GetProperty("start").GetInt32()..span.GetProperty("end").GetInt32()]);
            Assert.Equal(measurement, span.GetProperty("expectedText").GetString());
            var payload = binding.GetProperty("payload"); var evidence = payload.GetProperty("relationshipEvidence");
            Assert.Equal("explicit-per-item-clause", evidence.GetProperty("rule").GetString());
            Assert.Equal(1, evidence.GetProperty("version").GetInt32());
            Assert.Equal(original.SourceRevision, evidence.GetProperty("sourceRevision").GetString());
            Assert.Equal(LegacyGroceryQuantity.Parse(index == 0 ? "4" : "1/2"), evidence.GetProperty("originalAmount").Deserialize<GroceryQuantity>(PerItemJson));
            Assert.False(payload.TryGetProperty("allocationGroup", out _));
        }
        var dosePayload = bindings[1].GetProperty("payload");
        Assert.Equal(bindings[0].GetProperty("id").GetGuid(), dosePayload.GetProperty("countBindingId").GetGuid());
        Assert.Equal(LegacyGroceryQuantity.Parse("1/2"), dosePayload.GetProperty("dose").GetProperty("amount").Deserialize<GroceryQuantity>(PerItemJson));
        Assert.Equal(original.IngredientLines[1].Unit, dosePayload.GetProperty("dose").GetProperty("unit").Deserialize<RecipeUnitDto>(PerItemJson));
        Assert.Equal(original.IngredientLines, result.IngredientLines);
        Assert.Equal(text, PerItemStep(result).Text);
        Assert.Equal(2, CookingStepProjection.Read(result, 8).ValidatedUses);
        Assert.Equal(projected, CookingStepProjection.Read(result, 8).Sections[0].Steps[0].Text);
        Assert.Equal(text, CookingStepProjection.Read(result, 8).Sections[0].Steps[0].OriginalText);
        CookingStepRelationshipProducer.ValidateFresh(result);
        Assert.Equal(JsonSerializer.Serialize(result), JsonSerializer.Serialize(CookingStepRelationshipProducer.Discover(result, result)));
    }

    [Theory]
    [InlineData("3")]
    [InlineData(null)]
    public void PerItemProducerCarriesCorrectedCountAndUnknownDoseTotalWithoutRedistribution(string? doseTotal)
    {
        var before = CookingStepRelationshipProducer.Discover(PerItemContent());
        Assert.Equal(2, PerItemStep(before).Bindings.Count);
        var changed = before with { ContentRevision = "corrected", IngredientLines = [before.IngredientLines[0] with
            { Amount = LegacyGroceryQuantity.Parse("6"), AmountText = "6" }, before.IngredientLines[1] with
            { Amount = doseTotal is null ? null : LegacyGroceryQuantity.Parse(doseTotal), AmountText = doseTotal }] };
        var after = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, changed), before);
        Assert.Equal(2, PerItemStep(after).Bindings.Count);
        for (var index = 0; index < 2; index++)
        {
            Assert.Equal(PerItemStep(before).Bindings[index].GetProperty("id").GetGuid(), PerItemStep(after).Bindings[index].GetProperty("id").GetGuid());
            Assert.True(JsonElement.DeepEquals(PerItemStep(before).Bindings[index].GetProperty("payload"), PerItemStep(after).Bindings[index].GetProperty("payload")));
            Assert.Equal("corrected", PerItemStep(after).Bindings[index].GetProperty("validatedContentRevision").GetString());
        }
        Assert.Equal("For all 12 pieces of tofu, use exactly 1/2 tsp of oil on each piece.", CookingStepProjection.Read(after, 8).Sections[0].Steps[0].Text);
        Assert.Equal(PerItemEnglish, PerItemStep(after).Text);
        Assert.Equal(doseTotal, after.IngredientLines[1].AmountText);
        var staleFresh = PerItemWithBindings(after);
        Assert.Empty(PerItemStep(CookingStepRelationshipProducer.Discover(staleFresh)).Bindings);
        var edited = after with { ContentRevision = "edited", InstructionSections = [after.InstructionSections[0] with
            { Steps = [PerItemStep(after) with { Text = PerItemEnglish.Replace("4 pieces", "6 pieces").Replace("1/2 tsp", "1/3 tsp"), TextRevision = "edited-text" }] }] };
        var saved = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(after, edited), after);
        Assert.Equal(2, PerItemStep(saved).Bindings.Count);
        Assert.NotEqual(PerItemStep(after).Bindings[1].GetProperty("id").GetGuid(), PerItemStep(saved).Bindings[1].GetProperty("id").GetGuid());
        Assert.Equal(LegacyGroceryQuantity.Parse("1/3"), PerItemStep(saved).Bindings[1].GetProperty("payload").GetProperty("dose").GetProperty("amount").Deserialize<GroceryQuantity>(PerItemJson));
        CookingStepRelationshipProducer.ValidateFresh(saved);
    }

    [Fact]
    public void PerItemProducerFreshValidationRemapsBothIdentitiesAndAcceptsIndependentCountOnly()
    {
        var submitted = PerItemSubmission(PerItemContent());
        CookingStepRelationshipProducer.ValidateFresh(submitted);
        CookingStepRelationshipProducer.ValidateFresh(PerItemWithBindings(submitted, PerItemStep(submitted).Bindings[0]));
        Assert.Throws<InvalidDataException>(() => CookingStepRelationshipProducer.ValidateFresh(PerItemWithBindings(submitted, PerItemStep(submitted).Bindings[1])));
    }

    [Theory]
    [InlineData("missing")][InlineData("self")][InlineData("role")][InlineData("row")][InlineData("revision")]
    [InlineData("textRevision")][InlineData("source")][InlineData("rule")][InlineData("amount")][InlineData("unit")]
    [InlineData("span")][InlineData("overlap")][InlineData("group")][InlineData("duplicate")][InlineData("reversed")]
    public void PerItemProducerFreshValidationRejectsForgedGraph(string fault)
    {
        var submitted = PerItemSubmission(PerItemContent()); var bindings = PerItemStep(submitted).Bindings.ToArray();
        bindings[1] = PerItemMutate(bindings[1], node =>
        {
            var payload = node["payload"]!.AsObject();
            switch (fault)
            {
                case "missing": payload["countBindingId"] = Guid.NewGuid().ToString(); break;
                case "self": payload["countBindingId"] = node["id"]!.DeepClone(); break;
                case "role": node["role"] = "fixed"; break;
                case "row": node["ingredientLineId"] = submitted.IngredientLines[0].Id.ToString(); break;
                case "revision": node["validatedContentRevision"] = "old"; break;
                case "textRevision": node["validatedTextRevision"] = "old"; break;
                case "source": payload["relationshipEvidence"]!["sourceRevision"] = "old"; break;
                case "rule": payload["relationshipEvidence"]!["rule"] = "explicit-whole-clause"; break;
                case "amount": payload["dose"]!["amount"] = JsonSerializer.SerializeToNode(LegacyGroceryQuantity.Parse("1"), PerItemJson); break;
                case "unit": payload["dose"]!["unit"]!["text"] = "tbsp"; break;
                case "span": node["span"]!["expectedText"] = "1/2 tbsp"; break;
                case "overlap": node["span"] = JsonNode.Parse(bindings[0].GetProperty("span").GetRawText()); break;
                case "group": payload["allocationGroup"] = JsonSerializer.SerializeToNode(new { id = Guid.NewGuid(), exhaustive = true, bindingIds = new[] { node["id"]!.GetValue<string>() } }); break;
            }
        });
        if (fault == "duplicate") bindings = [bindings[0], bindings[0], bindings[1]];
        if (fault == "reversed") bindings = [bindings[1], bindings[0]];
        Assert.Throws<InvalidDataException>(() => CookingStepRelationshipProducer.ValidateFresh(PerItemWithBindings(submitted, bindings)));
    }

    [Theory]
    [InlineData("For 4 pieces of tofu, use exactly 1/2 tsp of oil on each piece.")]
    [InlineData("For all 4 pieces of tofu, use exactly 1/2 tsp of oil.")]
    [InlineData("For all 4 pieces of tofu, use 1/2 tsp of oil on each piece.")]
    [InlineData("If needed, for all 4 pieces of tofu, use exactly 1/2 tsp of oil on each piece.")]
    [InlineData("For all 4 pieces of tofu, do not use exactly 1/2 tsp of oil on each piece.")]
    [InlineData("For all 4 pieces of tofu, use exactly 1/2 tsp of oil or butter on each piece.")]
    [InlineData("For all 4 pieces of tofu, use exactly 1/2 tsp of oil on each piece. Cook 20 minutes.")]
    [InlineData("For all 4 pieces of tofu,\nuse exactly 1/2 tsp of oil on each piece.")]
    [InlineData("For all 4 pieces of tofu, use exactly 1/0 tsp of oil on each piece.")]
    [InlineData("For all 4 pieces of tofu, use exactly 1,000 tsp of oil on each piece.")]
    [InlineData("For all 4 pieces of tofu, use exactly 1–2 tsp of oil on each piece.")]
    [InlineData("For all 4 pieces of tofu, use exactly 1/2 tbsp of oil on each piece.")]
    [InlineData("Pour tous les 4 morceaux de tofu, utilisez exactement 1/2 c. à thé d’huile sur chaque morceau si nécessaire.")]
    public void PerItemProducerUnsupportedLanguageRetainsOriginal(string text)
    {
        var original = PerItemContent(text);
        var result = CookingStepRelationshipProducer.Discover(original);
        Assert.Empty(PerItemStep(result).Bindings);
        Assert.Equal(text, CookingStepProjection.Read(result, 8).Sections[0].Steps[0].Text);
    }

    [Theory]
    [InlineData("missingDose")][InlineData("duplicateId")][InlineData("duplicateDescription")]
    [InlineData("duplicateStep")][InlineData("duplicateMention")][InlineData("unknownCount")][InlineData("countUnit")][InlineData("doseUnit")]
    public void PerItemProducerAmbiguousOrMissingFactsDoNotCreateGraph(string fault)
    {
        var original = PerItemContent(); var rows = original.IngredientLines.ToArray();
        if (fault == "missingDose") rows = [rows[0]];
        if (fault == "duplicateId") rows[1] = rows[1] with { Id = rows[0].Id };
        if (fault == "duplicateDescription") rows = [.. rows, rows[1] with { Id = Guid.NewGuid() }];
        if (fault == "unknownCount") rows[0] = rows[0] with { Amount = null, AmountText = null };
        if (fault == "countUnit") rows[0] = rows[0] with { Unit = new("g", null) };
        if (fault == "doseUnit") rows[1] = rows[1] with { Unit = null };
        original = original with { IngredientLines = rows };
        if (fault is "duplicateStep" or "duplicateMention") original = original with { InstructionSections = [original.InstructionSections[0] with
            { Steps = [PerItemStep(original), PerItemStep(original) with { Id = fault == "duplicateStep" ? PerItemStep(original).Id : Guid.NewGuid() }] }] };
        var result = CookingStepRelationshipProducer.Discover(original);
        Assert.All(result.InstructionSections.SelectMany(x => x.Steps), step => Assert.Empty(step.Bindings));
        Assert.Equal(rows, result.IngredientLines);
    }

    [Fact]
    public void PerItemProducerRetainsIndependentCountWhenOnlyDoseDependencyFailsAndPreservesForeignGraph()
    {
        var before = PerItemSubmission(PerItemContent());
        var changed = before with { ContentRevision = "unit-changed", IngredientLines = [before.IngredientLines[0], before.IngredientLines[1] with { Unit = new("tbsp", null) }] };
        var after = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, changed), before);
        var count = Assert.Single(PerItemStep(after).Bindings);
        Assert.Equal("whole", count.GetProperty("role").GetString());
        Assert.Equal(PerItemStep(before).Bindings[0].GetProperty("id").GetGuid(), count.GetProperty("id").GetGuid());
        Assert.Equal(1, CookingStepProjection.Read(after, 8).ValidatedUses);
        var foreign = PerItemWithBindings(before, PerItemStep(before).Bindings.Select(binding => PerItemMutate(binding,
            node => node["payload"]!.AsObject().Remove("relationshipEvidence"))).ToArray());
        Assert.Equal(JsonSerializer.Serialize(foreign), JsonSerializer.Serialize(CookingStepRelationshipProducer.Discover(foreign)));
    }

    [Fact]
    public void PerItemProducerDoesNotEraseIndependentRemainderAndFixedProof()
    {
        var before = PerItemContent();
        var sauce = before.IngredientLines[1] with { Id = Guid.NewGuid(), Description = "sauce", Amount = LegacyGroceryQuantity.Parse("3"),
            Unit = new("tbsp", null), Shopping = new("sauce", null, null) };
        var butter = sauce with { Id = Guid.NewGuid(), Description = "butter", Shopping = new("butter", null, null) };
        before = before with { IngredientLines = [.. before.IngredientLines, sauce, butter], InstructionSections = [before.InstructionSections[0] with
            { Steps = [PerItemStep(before), new(Guid.NewGuid(), "Use 1 tbsp sauce.", "sauce-first", []),
                new(Guid.NewGuid(), "Finally, use all the remaining sauce.", "sauce-final", []),
                new(Guid.NewGuid(), "For any number of portions, use exactly 1 tbsp butter.", "butter-fixed", [])] }] };
        var result = CookingStepRelationshipProducer.Discover(before);
        Assert.Equal(new[] { 2, 1, 1, 1 }, result.InstructionSections[0].Steps.Select(step => step.Bindings.Count));
        Assert.Equal("remainder", Assert.Single(result.InstructionSections[0].Steps[2].Bindings).GetProperty("role").GetString());
        Assert.Equal("fixed", Assert.Single(result.InstructionSections[0].Steps[3].Bindings).GetProperty("role").GetString());
        CookingStepRelationshipProducer.ValidateFresh(result);
        var saved = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(result, result with { ContentRevision = "unrelated" }), result);
        Assert.Equal(result.InstructionSections[0].Steps.SelectMany(x => x.Bindings).Select(x => x.GetProperty("id").GetGuid()),
            saved.InstructionSections[0].Steps.SelectMany(x => x.Bindings).Select(x => x.GetProperty("id").GetGuid()));
    }
    [Theory]
    [InlineData("duplicateCount")][InlineData("duplicateDose")][InlineData("duplicateIdentity")]
    public void PerItemProducerDoesNotRepairAmbiguousOwnedGraphByInventingNewIdentities(string fault)
    {
        var before = PerItemSubmission(PerItemContent());
        var bindings = PerItemStep(before).Bindings.ToArray();
        if (fault == "duplicateCount") bindings = [bindings[0], bindings[0], bindings[1]];
        if (fault == "duplicateDose") bindings = [bindings[0], bindings[1], bindings[1]];
        if (fault == "duplicateIdentity") bindings[1] = PerItemMutate(bindings[1], node => node["id"] = bindings[0].GetProperty("id").GetGuid().ToString());
        var result = CookingStepRelationshipProducer.Discover(PerItemWithBindings(before, bindings));
        Assert.Empty(PerItemStep(result).Bindings);
    }

    [Theory]
    [InlineData("range", 1)][InlineData("fixedCount", 1)][InlineData("unknownBasis", 0)]
    public void PerItemProducerKeepsSupportedIndependentCountContexts(string change, int validated)
    {
        var before = PerItemSubmission(PerItemContent());
        var changed = before with { ContentRevision = "context", Servings = change == "unknownBasis" ? null : 4,
            IngredientLines = [before.IngredientLines[0] with
                { Amount = LegacyGroceryQuantity.Parse(change == "range" ? "4–6" : "4"), Scaling = change == "fixedCount" ? "fixed" : "proportional" }, before.IngredientLines[1]] };
        var result = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, changed), before);
        Assert.Equal(change == "unknownBasis" ? 2 : 1, PerItemStep(result).Bindings.Count);
        Assert.Equal("whole", PerItemStep(result).Bindings[0].GetProperty("role").GetString());
        Assert.Equal(validated, CookingStepProjection.Read(result, 8).ValidatedUses);
        Assert.Equal(PerItemEnglish, PerItemStep(result).Text);
    }

    [Theory]
    [InlineData(null)][InlineData("0")]
    public void PerItemProducerFreshUnknownOrZeroDoseTotalDoesNotInventAnAllocationConstraint(string? total)
    {
        var original = PerItemContent();
        original = original with { IngredientLines = [original.IngredientLines[0], original.IngredientLines[1] with
            { Amount = total is null ? null : LegacyGroceryQuantity.Parse(total), AmountText = total }] };
        var result = CookingStepRelationshipProducer.Discover(original);
        Assert.Equal(2, PerItemStep(result).Bindings.Count);
        Assert.Equal(2, CookingStepProjection.Read(result, 8).ValidatedUses);
        Assert.Equal(original.IngredientLines, result.IngredientLines);
        CookingStepRelationshipProducer.ValidateFresh(result);
    }

    [Theory]
    [InlineData("binding")][InlineData("payload")][InlineData("evidence")][InlineData("dose")]
    public void PerItemProducerFreshValidationRejectsUnknownRawExtensions(string location)
    {
        var submitted = PerItemSubmission(PerItemContent()); var bindings = PerItemStep(submitted).Bindings.ToArray();
        bindings[1] = PerItemMutate(bindings[1], node =>
        {
            var target = location switch { "binding" => node, "payload" => node["payload"]!.AsObject(),
                "evidence" => node["payload"]!["relationshipEvidence"]!.AsObject(), _ => node["payload"]!["dose"]!.AsObject() };
            target["unproved"] = true;
        });
        Assert.Throws<InvalidDataException>(() => CookingStepRelationshipProducer.ValidateFresh(PerItemWithBindings(submitted, bindings)));
    }

    [Theory]
    [InlineData("tbsp")][InlineData(null)]
    public void PerItemProducerUnsupportedDoseUnitKeepsCountAndOtherProofAcrossFollowingSave(string? unit)
    {
        var original = PerItemContent();
        var sauce = original.IngredientLines[1] with { Id = Guid.NewGuid(), Description = "sauce", Amount = LegacyGroceryQuantity.Parse("3"),
            Unit = new("tbsp", null), Shopping = new("sauce", null, null) };
        var butter = sauce with { Id = Guid.NewGuid(), Description = "butter", Shopping = new("butter", null, null) };
        var pasta = sauce with { Id = Guid.NewGuid(), Description = "pasta", Amount = LegacyGroceryQuantity.Parse("200"),
            Unit = new("g", null), Shopping = new("pasta", null, null) };
        original = original with { IngredientLines = [.. original.IngredientLines, sauce, butter, pasta], InstructionSections = [original.InstructionSections[0] with
            { Steps = [PerItemStep(original), new(Guid.NewGuid(), "Use 1 tbsp sauce.", "sauce-first", []),
                new(Guid.NewGuid(), "Finally, use all the remaining sauce.", "sauce-final", []),
                new(Guid.NewGuid(), "For any number of portions, use exactly 1 tbsp butter.", "butter-fixed", []),
                new(Guid.NewGuid(), "Add all 200 g pasta.", "pasta-whole", [])] }] };
        CanonicalRecipeContent Save(CanonicalRecipeContent before, CanonicalRecipeContent next) =>
            CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, next), before);
        var before = CookingStepRelationshipProducer.Discover(original);
        Assert.Equal(new[] { 2, 1, 1, 1, 1 }, before.InstructionSections[0].Steps.Select(step => step.Bindings.Count));
        before = Save(before, before with { ContentRevision = "count-six", IngredientLines = [before.IngredientLines[0] with
            { Amount = LegacyGroceryQuantity.Parse("6"), AmountText = "6" }, .. before.IngredientLines.Skip(1)] });
        before = Save(before, before with { ContentRevision = "current-six-step", InstructionSections = [before.InstructionSections[0] with
            { Steps = [PerItemStep(before) with { Text = PerItemEnglish.Replace("4 pieces", "6 pieces").Replace("1/2 tsp", "1/3 tsp"), TextRevision = "current-six-text" }, .. before.InstructionSections[0].Steps.Skip(1)] }] });
        var expectedCountId = PerItemStep(before).Bindings[0].GetProperty("id").GetGuid();
        var independentIds = before.InstructionSections[0].Steps.Skip(1).SelectMany(step => step.Bindings).Select(binding => binding.GetProperty("id").GetGuid()).ToArray();
        var changed = before with { ContentRevision = "dose-unit-change", IngredientLines = [before.IngredientLines[0], before.IngredientLines[1] with
            { Unit = unit is null ? null : new(unit, null), Amount = null, AmountText = null }, .. before.IngredientLines.Skip(2)] };
        var result = Save(before, changed);
        foreach (var revision in new[] { "dose-unit-change", "following-save" })
        {
            if (revision == "following-save") result = Save(result, result with { ContentRevision = revision });
            Assert.Equal(new[] { 1, 1, 1, 1, 1 }, result.InstructionSections[0].Steps.Select(step => step.Bindings.Count));
            var count = Assert.Single(PerItemStep(result).Bindings);
            Assert.Equal(expectedCountId, count.GetProperty("id").GetGuid());
            Assert.Equal("whole", count.GetProperty("role").GetString());
            Assert.Equal(revision, count.GetProperty("validatedContentRevision").GetString());
            Assert.Equal(independentIds, result.InstructionSections[0].Steps.Skip(1).SelectMany(step => step.Bindings).Select(binding => binding.GetProperty("id").GetGuid()));
            Assert.Equal(5, CookingStepProjection.Read(result, 8).ValidatedUses);
            Assert.Equal("For all 12 pieces of tofu, use exactly 1/3 tsp of oil on each piece.", CookingStepProjection.Read(result, 8).Sections[0].Steps[0].Text);
            Assert.Null(result.IngredientLines[1].Amount);
        }
        var cleared = Save(result, result with { ContentRevision = "count-cleared", IngredientLines = [result.IngredientLines[0] with
            { Amount = null, AmountText = null }, .. result.IngredientLines.Skip(1)] });
        Assert.Empty(PerItemStep(cleared).Bindings);
        Assert.Equal(independentIds, cleared.InstructionSections[0].Steps.Skip(1).SelectMany(step => step.Bindings).Select(binding => binding.GetProperty("id").GetGuid()));
        Assert.Null(cleared.IngredientLines[0].Amount);
    }

    [Theory]
    [InlineData("rename")][InlineData("delete")]
    public void PerItemProducerDoseRenameOrDeleteRetainsAuthoritativeUpstreamCountAcrossFollowingSave(string change)
    {
        var original = PerItemContent();
        var sauce = original.IngredientLines[1] with { Id = Guid.NewGuid(), Description = "sauce", Amount = LegacyGroceryQuantity.Parse("3"),
            Unit = new("tbsp", null), Shopping = new("sauce", null, null) };
        var butter = sauce with { Id = Guid.NewGuid(), Description = "butter", Shopping = new("butter", null, null) };
        var pasta = sauce with { Id = Guid.NewGuid(), Description = "pasta", Amount = LegacyGroceryQuantity.Parse("200"),
            Unit = new("g", null), Shopping = new("pasta", null, null) };
        original = original with { IngredientLines = [.. original.IngredientLines, sauce, butter, pasta], InstructionSections = [original.InstructionSections[0] with
            { Steps = [PerItemStep(original), new(Guid.NewGuid(), "Use 1 tbsp sauce.", "sauce-first", []),
                new(Guid.NewGuid(), "Finally, use all the remaining sauce.", "sauce-final", []),
                new(Guid.NewGuid(), "For any number of portions, use exactly 1 tbsp butter.", "butter-fixed", []),
                new(Guid.NewGuid(), "Add all 200 g pasta.", "pasta-whole", [])] }] };
        CanonicalRecipeContent Save(CanonicalRecipeContent before, CanonicalRecipeContent next) =>
            CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, next), before);
        var before = CookingStepRelationshipProducer.Discover(original);
        Assert.Equal(new[] { 2, 1, 1, 1, 1 }, before.InstructionSections[0].Steps.Select(step => step.Bindings.Count));
        var countId = PerItemStep(before).Bindings[0].GetProperty("id").GetGuid();
        var otherIds = before.InstructionSections[0].Steps.Skip(1).SelectMany(step => step.Bindings).Select(binding => binding.GetProperty("id").GetGuid()).ToArray();
        var changed = before with { ContentRevision = "dose-" + change, IngredientLines = change == "delete"
            ? [before.IngredientLines[0], .. before.IngredientLines.Skip(2)]
            : [before.IngredientLines[0], before.IngredientLines[1] with { Description = "olive oil", Shopping = new("olive oil", null, null) }, .. before.IngredientLines.Skip(2)] };
        var result = Save(before, changed);
        foreach (var revision in new[] { "dose-" + change, "following-save" })
        {
            if (revision == "following-save") result = Save(result, result with { ContentRevision = revision });
            Assert.Equal(new[] { 1, 1, 1, 1, 1 }, result.InstructionSections[0].Steps.Select(step => step.Bindings.Count));
            Assert.Equal(countId, Assert.Single(PerItemStep(result).Bindings).GetProperty("id").GetGuid());
            Assert.Equal(otherIds, result.InstructionSections[0].Steps.Skip(1).SelectMany(step => step.Bindings).Select(binding => binding.GetProperty("id").GetGuid()));
            Assert.Equal(5, CookingStepProjection.Read(result, 8).ValidatedUses);
            Assert.Equal("For all 8 pieces of tofu, use exactly 1/2 tsp of oil on each piece.", CookingStepProjection.Read(result, 8).Sections[0].Steps[0].Text);
            Assert.Equal(PerItemEnglish, PerItemStep(result).Text);
        }
        var fresh = PerItemWithBindings(result);
        Assert.Empty(PerItemStep(CookingStepRelationshipProducer.Discover(fresh)).Bindings);
        foreach (var invalidation in new[] { "amount-clear", "source", "text" })
        {
            var next = result with { ContentRevision = invalidation, SourceRevision = invalidation == "source" ? "new-source" : result.SourceRevision,
                IngredientLines = invalidation == "amount-clear" ? [result.IngredientLines[0] with { Amount = null, AmountText = null }, .. result.IngredientLines.Skip(1)] : result.IngredientLines,
                InstructionSections = invalidation == "text" ? [result.InstructionSections[0] with
                    { Steps = [PerItemStep(result) with { Text = PerItemEnglish + " Changed.", TextRevision = "changed-text" }, .. result.InstructionSections[0].Steps.Skip(1)] }] : result.InstructionSections };
            Assert.Empty(PerItemStep(Save(result, next)).Bindings);
        }
    }

    [Theory]
    [InlineData("same-save")][InlineData("later-save")]
    public void PerItemProducerCountCarryDoesNotLicenseFreshExhaustiveGroupForRenamedDose(string timing)
    {
        CanonicalRecipeContent Save(CanonicalRecipeContent before, CanonicalRecipeContent next) =>
            CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, next), before);
        var before = CookingStepRelationshipProducer.Discover(PerItemContent());
        var countId = PerItemStep(before).Bindings[0].GetProperty("id").GetGuid();
        var renamed = before with { ContentRevision = "renamed", IngredientLines = [before.IngredientLines[0], before.IngredientLines[1] with
            { Description = "olive oil", Shopping = new("olive oil", null, null) }] };
        if (timing == "later-save")
        {
            before = Save(before, renamed);
            Assert.Equal(countId, Assert.Single(PerItemStep(before).Bindings).GetProperty("id").GetGuid());
            renamed = before;
        }
        var candidate = renamed with { ContentRevision = "new-allocation", InstructionSections = [renamed.InstructionSections[0] with
            { Steps = [PerItemStep(renamed), new(Guid.NewGuid(), "Use 1 tsp olive oil.", "new-use", []),
                new(Guid.NewGuid(), "Finally, use all the remaining olive oil.", "new-remainder", [])] }] };
        var result = Save(before, candidate);
        foreach (var revision in new[] { "new-allocation", "following-save" })
        {
            if (revision == "following-save") result = Save(result, result with { ContentRevision = revision });
            Assert.Equal(countId, Assert.Single(PerItemStep(result).Bindings).GetProperty("id").GetGuid());
            Assert.All(result.InstructionSections[0].Steps.Skip(1), step => Assert.Empty(step.Bindings));
            Assert.Equal(1, CookingStepProjection.Read(result, 8).ValidatedUses);
            Assert.Equal("Finally, use all the remaining olive oil.", CookingStepProjection.Read(result, 8).Sections[0].Steps[2].Text);
            Assert.Equal(renamed.IngredientLines, result.IngredientLines);
        }
    }

}
