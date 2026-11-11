using System.Text.Json;
using System.Text.Json.Nodes;
using RecipeApi.Dto;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CookingStepRelationshipProducerTests
{
    private static CanonicalRecipeContent Content(string text, string description = "pasta", string quantity = "200", params string[] otherSteps) => new(2, "content", "source", 4,
        [new RecipeIngredientLineDto { Id = Guid.NewGuid(), Description = description, Amount = LegacyGroceryQuantity.Parse(quantity),
            AmountText = quantity, Unit = new("g", null), Scaling = "proportional", Package = null, Shopping = new(description, null, null), Provenance = new("source", "source", []) }],
        [new(Guid.NewGuid(), null, new[] { text }.Concat(otherSteps).Select(t => new RecipeInstructionStepDto(Guid.NewGuid(), t, Guid.NewGuid().ToString(), [])).ToArray())]);

    [Theory]
    [InlineData("Add all 200 g pasta.", "pasta", "Add all 400 g pasta.")]
    [InlineData("Add all 200 g of pasta.", "pasta", "Add all 400 g of pasta.")]
    [InlineData("Ajouter tous les 200 g de pâtes.", "pâtes", "Ajouter tous les 400 g de pâtes.")]
    [InlineData("Ajoutez la totalité des 200 g de pâtes.", "pâtes", "Ajoutez la totalité des 400 g de pâtes.")]
    [InlineData("Add all 200 g 🍅 tomatoes.", "🍅 tomatoes", "Add all 400 g 🍅 tomatoes.")]
    public void ExplicitWholeClauseProducesCurrentProofWithoutChangingSavedText(string text, string description, string projected)
    {
        var original = Content(text, description);
        var result = CookingStepRelationshipProducer.Discover(original);
        Assert.Single(result.InstructionSections[0].Steps[0].Bindings);
        Assert.Equal(text, result.InstructionSections[0].Steps[0].Text);
        Assert.Equal(original.IngredientLines, result.IngredientLines);
        Assert.Equal(projected, CookingStepProjection.Read(result, 8).Sections[0].Steps[0].Text);
        CookingStepRelationshipProducer.ValidateFresh(result);
    }

    [Theory]
    [InlineData("Add 50 g pasta.", "pasta", "Add 75 g pasta.")]
    [InlineData("Use 50 g of pasta.", "pasta", "Use 75 g of pasta.")]
    [InlineData("Ajouter 50 g de pâtes.", "pâtes", "Ajouter 75 g de pâtes.")]
    [InlineData("Add 50 g 🍅 tomatoes.", "🍅 tomatoes", "Add 75 g 🍅 tomatoes.")]
    public void ExplicitAbsoluteClauseProducesCurrentProofAndRetainsOriginalFacts(string text, string description, string projected)
    {
        var original = Content(text, description);
        var result = CookingStepRelationshipProducer.Discover(original);
        var binding = Assert.Single(result.InstructionSections[0].Steps[0].Bindings);
        Assert.Equal("absolute", binding.GetProperty("role").GetString());
        Assert.Equal(LegacyGroceryQuantity.Parse("50"), binding.GetProperty("payload").GetProperty("amount").Deserialize<GroceryQuantity>(new JsonSerializerOptions(JsonSerializerDefaults.Web)));
        Assert.Equal(text, result.InstructionSections[0].Steps[0].Text);
        Assert.Equal(original.IngredientLines, result.IngredientLines);
        Assert.Equal(projected, CookingStepProjection.Read(result, 6).Sections[0].Steps[0].Text);
        CookingStepRelationshipProducer.ValidateFresh(result);
    }

    private static CanonicalRecipeContent MultipleUses(string first = "Add 1 tbsp oil.", string second = "Use 1 tbsp oil.")
    {
        var content = Content(first, "oil", "2", second);
        return content with { IngredientLines = [content.IngredientLines[0] with { Unit = new("tbsp", null) }] };
    }

    [Theory]
    [InlineData("Add 1 tbsp oil.", "Use 1 tbsp oil.", "Add 2 tbsp oil.", "Use 2 tbsp oil.")]
    [InlineData("Ajouter 1 tbsp d'huile.", "Utilisez 1 tbsp d'huile.", "Ajouter 2 tbsp d'huile.", "Utilisez 2 tbsp d'huile.")]
    public void MultipleIndependentAbsoluteUsesScaleWithoutInferringExhaustiveAllocation(string first, string second, string doubledFirst, string doubledSecond)
    {
        var original = MultipleUses(first, second);
        if (first.StartsWith("Ajouter")) original = original with { IngredientLines = [original.IngredientLines[0] with { Description = "huile", Shopping = new("huile", null, null) }] };
        var result = CookingStepRelationshipProducer.Discover(original);
        var uses = result.InstructionSections[0].Steps.Select(step => Assert.Single(step.Bindings)).ToArray();
        Assert.Equal(2, uses.Select(use => use.GetProperty("id").GetGuid()).Distinct().Count());
        Assert.All(uses, use =>
        {
            Assert.Equal(original.IngredientLines[0].Id, use.GetProperty("ingredientLineId").GetGuid());
            Assert.Equal("absolute", use.GetProperty("role").GetString());
            Assert.False(use.GetProperty("payload").TryGetProperty("allocationGroup", out _));
            Assert.False(use.GetProperty("payload").TryGetProperty("allocationGroupId", out _));
        });
        Assert.Equal(new[] { first, second }, result.InstructionSections[0].Steps.Select(step => step.Text));
        Assert.Equal(original.IngredientLines, result.IngredientLines);
        var projection = CookingStepProjection.Read(result, 8);
        Assert.Equal(2, projection.ValidatedUses);
        Assert.Equal(new[] { doubledFirst, doubledSecond }, projection.Sections[0].Steps.Select(step => step.Text));
        CookingStepRelationshipProducer.ValidateFresh(result);
    }

    [Fact]
    public void MultipleAbsoluteTotalCorrectionCarriesEachAmountWithoutRedistributionAndEditReplacesOnlyAffectedProof()
    {
        var before = CookingStepRelationshipProducer.Discover(MultipleUses());
        var originalIds = before.InstructionSections[0].Steps.Select(step => Assert.Single(step.Bindings).GetProperty("id").GetGuid()).ToArray();
        var changed = before with { ContentRevision = "corrected", IngredientLines = [before.IngredientLines[0] with { Amount = LegacyGroceryQuantity.Parse("3"), AmountText = "3" }] };
        var corrected = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, changed), before);
        Assert.Equal(originalIds, corrected.InstructionSections[0].Steps.Select(step => Assert.Single(step.Bindings).GetProperty("id").GetGuid()));
        Assert.Equal(new[] { "Add 2 tbsp oil.", "Use 2 tbsp oil." }, CookingStepProjection.Read(corrected, 8).Sections[0].Steps.Select(step => step.Text));
        Assert.Equal(JsonSerializer.Serialize(corrected), JsonSerializer.Serialize(CookingStepRelationshipProducer.Discover(corrected, corrected)));
        var steps = corrected.InstructionSections[0].Steps;
        var edited = corrected with { ContentRevision = "edited", InstructionSections = [corrected.InstructionSections[0] with { Steps = [steps[0] with { Text = "Mix 1/2 tbsp oil.", TextRevision = "new-text" }, steps[1]] }] };
        var replaced = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(corrected, edited), corrected);
        Assert.NotEqual(originalIds[0], Assert.Single(replaced.InstructionSections[0].Steps[0].Bindings).GetProperty("id").GetGuid());
        Assert.Equal(originalIds[1], Assert.Single(replaced.InstructionSections[0].Steps[1].Bindings).GetProperty("id").GetGuid());
        Assert.Equal(new[] { "Mix 1 tbsp oil.", "Use 2 tbsp oil." }, CookingStepProjection.Read(replaced, 8).Sections[0].Steps.Select(step => step.Text));
        Assert.Equal(edited.IngredientLines, replaced.IngredientLines);
    }

    [Fact]
    public void MultipleUsesAcrossSectionsDoNotRequireAClosedOrExhaustiveSum()
    {
        var original = MultipleUses();
        original = original with { IngredientLines = [original.IngredientLines[0] with { Amount = LegacyGroceryQuantity.Parse("4"), AmountText = "4" }],
            InstructionSections = [original.InstructionSections[0] with { Steps = [original.InstructionSections[0].Steps[0]] }, new(Guid.NewGuid(), "Finish", [original.InstructionSections[0].Steps[1]])] };
        var result = CookingStepRelationshipProducer.Discover(original);
        Assert.All(result.InstructionSections.SelectMany(section => section.Steps), step => Assert.Single(step.Bindings));
        Assert.Equal(2, CookingStepProjection.Read(result, 8).ValidatedUses);
        CookingStepRelationshipProducer.ValidateFresh(result);
    }

    [Theory]
    [InlineData("Use oil later.")]
    [InlineData("Use 1 tbsp oil or sauce.")]
    [InlineData("If needed, use 1 tbsp oil.")]
    [InlineData("Add all 2 tbsp oil.")]
    [InlineData("Add 1 tbsp oil and 1 tbsp oil.")]
    [InlineData("Add the remaining oil.")]
    [InlineData("Add 1 tbsp oil. Cook for 20 minutes.")]
    public void UnsupportedMultipleUseSequencesAbstainWithoutRewriting(string second)
    {
        var original = MultipleUses(second: second);
        var result = CookingStepRelationshipProducer.Discover(original);
        Assert.All(result.InstructionSections[0].Steps, step => Assert.Empty(step.Bindings));
        Assert.Equal(new[] { "Add 1 tbsp oil.", second }, CookingStepProjection.Read(result, 8).Sections[0].Steps.Select(step => step.Text));
    }

    [Fact]
    public void MultipleUseFreshValidationRejectsDuplicateIdentityAndForgedExhaustiveGroup()
    {
        var original = CookingStepRelationshipProducer.Discover(MultipleUses());
        var steps = original.InstructionSections[0].Steps;
        var first = Assert.Single(steps[0].Bindings);
        var second = JsonNode.Parse(Assert.Single(steps[1].Bindings).GetRawText())!;
        second["id"] = first.GetProperty("id").GetGuid();
        var duplicate = original with { InstructionSections = [original.InstructionSections[0] with { Steps = [steps[0], steps[1] with { Bindings = [JsonSerializer.SerializeToElement(second)] }] }] };
        Assert.Throws<InvalidDataException>(() => CookingStepRelationshipProducer.ValidateFresh(duplicate));
        second = JsonNode.Parse(steps[1].Bindings[0].GetRawText())!;
        second["payload"]!["allocationGroup"] = JsonSerializer.SerializeToNode(new { id = Guid.NewGuid(), exhaustive = true, bindingIds = new[] { first.GetProperty("id").GetGuid(), second["id"]!.GetValue<Guid>() } });
        var forged = original with { InstructionSections = [original.InstructionSections[0] with { Steps = [steps[0], steps[1] with { Bindings = [JsonSerializer.SerializeToElement(second)] }] }] };
        Assert.Throws<InvalidDataException>(() => CookingStepRelationshipProducer.ValidateFresh(forged));
    }

    [Fact]
    public void AbsoluteTotalCorrectionRetainsFiftyAndStepEditReplacesProof()
    {
        var before = CookingStepRelationshipProducer.Discover(Content("Add 50 g pasta."));
        var prior = Assert.Single(before.InstructionSections[0].Steps[0].Bindings);
        var after = before with { ContentRevision = "corrected", IngredientLines = [before.IngredientLines[0] with { Amount = LegacyGroceryQuantity.Parse("250"), AmountText = "250" }] };
        var result = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, after), before);
        Assert.Equal("Add 75 g pasta.", CookingStepProjection.Read(result, 6).Sections[0].Steps[0].Text);
        Assert.Equal(prior.GetProperty("id").GetGuid(), Assert.Single(result.InstructionSections[0].Steps[0].Bindings).GetProperty("id").GetGuid());
        Assert.Equal(JsonSerializer.Serialize(result), JsonSerializer.Serialize(CookingStepRelationshipProducer.Discover(result, result)));
        var step = result.InstructionSections[0].Steps[0];
        var edited = result with { ContentRevision = "edited", InstructionSections = [result.InstructionSections[0] with { Steps = [step with { Text = "Use 40 g pasta.", TextRevision = "edited-text" }] }] };
        var replaced = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(result, edited), result);
        var current = Assert.Single(replaced.InstructionSections[0].Steps[0].Bindings);
        Assert.NotEqual(prior.GetProperty("id").GetGuid(), current.GetProperty("id").GetGuid());
        Assert.Equal("Use 60 g pasta.", CookingStepProjection.Read(replaced, 6).Sections[0].Steps[0].Text);
        Assert.Equal("Use 40 g pasta.", replaced.InstructionSections[0].Steps[0].Text);
    }

    [Theory]
    [InlineData("Add 50 g pasta or sauce.")]
    [InlineData("Do not add 50 g pasta.")]
    [InlineData("Add 50 g pasta. Cook for 20 minutes.")]
    [InlineData("Add 50 g pasta and 50 g pasta.")]
    [InlineData("Add 250 g pasta.")]
    [InlineData("Add 0 g pasta.")]
    [InlineData("Add 50 ml pasta.")]
    [InlineData("Add half the pasta.")]
    public void AmbiguousOrUnsupportedAbsoluteClauseAbstains(string text)
    {
        var result = CookingStepRelationshipProducer.Discover(Content(text));
        Assert.Empty(result.InstructionSections[0].Steps[0].Bindings);
        Assert.Equal(text, CookingStepProjection.Read(result, 6).Sections[0].Steps[0].Text);
    }

    [Fact]
    public void AbsoluteFreshProofRejectsChangedAmountUnitRoleOrRevision()
    {
        var original = CookingStepRelationshipProducer.Discover(Content("Add 50 g pasta."));
        var binding = Assert.Single(original.InstructionSections[0].Steps[0].Bindings);
        foreach (var property in new[] { "amount", "unit", "role", "validatedContentRevision" })
        {
            var node = JsonNode.Parse(binding.GetRawText())!;
            if (property == "amount") node["payload"]![property] = JsonSerializer.SerializeToNode(LegacyGroceryQuantity.Parse("60"), new JsonSerializerOptions(JsonSerializerDefaults.Web));
            else if (property == "unit") node["payload"]![property] = JsonSerializer.SerializeToNode(new RecipeUnitDto("ml", null), new JsonSerializerOptions(JsonSerializerDefaults.Web));
            else node[property] = "forged";
            var changed = original with { InstructionSections = [original.InstructionSections[0] with { Steps = [original.InstructionSections[0].Steps[0] with { Bindings = [JsonSerializer.SerializeToElement(node)] }] }] };
            Assert.Throws<InvalidDataException>(() => CookingStepRelationshipProducer.ValidateFresh(changed));
        }
    }

    [Theory]
    [InlineData("clear")]
    [InlineData("reduced")]
    [InlineData("unit")]
    [InlineData("description")]
    public void AbsoluteDependencyChangeAbstainsWithoutRewritingSavedFacts(string change)
    {
        var before = CookingStepRelationshipProducer.Discover(Content("Add 50 g pasta."));
        var row = before.IngredientLines[0];
        row = change switch
        {
            "clear" => row with { Amount = null, AmountText = null },
            "reduced" => row with { Amount = LegacyGroceryQuantity.Parse("40"), AmountText = "40" },
            "unit" => row with { Unit = new("ml", null) },
            _ => row with { Description = "noodles" }
        };
        var after = before with { ContentRevision = "changed", IngredientLines = [row] };
        var result = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, after), before);
        Assert.Equal(0, CookingStepProjection.Read(result, 6).ValidatedUses);
        Assert.Equal("Add 50 g pasta.", CookingStepProjection.Read(result, 6).Sections[0].Steps[0].Text);
        Assert.Equal(after.IngredientLines, result.IngredientLines);
    }

    [Fact]
    public void RepeatedAbsoluteMentionAndDuplicateRowsAbstain()
    {
        var repeated = CookingStepRelationshipProducer.Discover(Content("Add 50 g pasta.", "pasta", "200", "Use pasta later."));
        Assert.Empty(repeated.InstructionSections[0].Steps[0].Bindings);
        var original = Content("Add 50 g pasta.");
        var duplicate = original with { IngredientLines = [original.IngredientLines[0], original.IngredientLines[0] with { Id = Guid.NewGuid() }] };
        Assert.Empty(CookingStepRelationshipProducer.Discover(duplicate).InstructionSections[0].Steps[0].Bindings);
    }

    [Theory]
    [InlineData("Add 200 g pasta.")]
    [InlineData("Add all 200 g pasta except a spoonful.")]
    [InlineData("Do not add all 200 g pasta.")]
    [InlineData("Add all 200 g pasta, or half now.")]
    [InlineData("Add all 100 g pasta.")]
    [InlineData("Add all 200 g pasta. Cook for 20 minutes at 180 °C.")]
    [InlineData("Add all 200 g pasta and 200 g pasta.")]
    public void UnsupportedOrContradictoryClauseAbstains(string text)
    {
        var result = CookingStepRelationshipProducer.Discover(Content(text));
        Assert.Empty(result.InstructionSections[0].Steps[0].Bindings);
        Assert.Equal(text, CookingStepProjection.Read(result, 8).Sections[0].Steps[0].Text);
    }

    [Theory]
    [InlineData("Use pasta later.")]
    [InlineData("Reserve half for later.")]
    [InlineData("Réserver le reste.")]
    public void GlobalDuplicateOrPartialEvidencePreventsWholeProof(string second)
    {
        var result = CookingStepRelationshipProducer.Discover(Content("Add all 200 g pasta.", "pasta", "200", second));
        Assert.Empty(result.InstructionSections[0].Steps[0].Bindings);
    }

    [Fact]
    public void UnrelatedTimeTemperatureAndPackageNumbersStayOriginal()
    {
        const string second = "Cook for 20 minutes at 180 °C in a 400 g container.";
        var result = CookingStepRelationshipProducer.Discover(Content("Add all 200 g pasta.", "pasta", "200", second));
        var projected = CookingStepProjection.Read(result, 8);
        Assert.Equal("Add all 400 g pasta.", projected.Sections[0].Steps[0].Text);
        Assert.Equal(second, projected.Sections[0].Steps[1].Text);
    }

    [Fact]
    public void AmountCorrectionCarriesPriorWholeAndRepeatedDiscoveryIsStable()
    {
        var before = CookingStepRelationshipProducer.Discover(Content("Add all 200 g pasta."));
        var after = before with { ContentRevision = "corrected", IngredientLines = [before.IngredientLines[0] with { Amount = LegacyGroceryQuantity.Parse("250"), AmountText = "250" }] };
        var result = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, after), before);
        Assert.Equal("Add all 500 g pasta.", CookingStepProjection.Read(result, 8).Sections[0].Steps[0].Text);
        Assert.Equal(before.InstructionSections[0].Steps[0].Bindings[0].GetProperty("id").GetGuid(), result.InstructionSections[0].Steps[0].Bindings[0].GetProperty("id").GetGuid());
        Assert.Equal(JsonSerializer.Serialize(result), JsonSerializer.Serialize(CookingStepRelationshipProducer.Discover(result, result)));
    }

    [Fact]
    public void ChangedStepReplacesOldProofWithoutOverlapAndClearRemovesEligibility()
    {
        var before = CookingStepRelationshipProducer.Discover(Content("Add all 200 g pasta."));
        var after = before with { ContentRevision = "changed", InstructionSections = [before.InstructionSections[0] with { Steps = [before.InstructionSections[0].Steps[0] with { Text = "Use all 200 g pasta.", TextRevision = "changed-text" }] }] };
        var result = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, after), before);
        Assert.Single(result.InstructionSections[0].Steps[0].Bindings);
        Assert.Equal("Use all 400 g pasta.", CookingStepProjection.Read(result, 8).Sections[0].Steps[0].Text);
        var cleared = result with { ContentRevision = "clear", IngredientLines = [result.IngredientLines[0] with { Amount = null, AmountText = null }] };
        var final = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(result, cleared), result);
        Assert.Equal(0, CookingStepProjection.Read(final, 8).ValidatedUses);
        Assert.Equal("Use all 200 g pasta.", final.InstructionSections[0].Steps[0].Text);
    }

    [Fact]
    public void AddedDuplicateInvalidatesEarlierWholeEvidence()
    {
        var before = CookingStepRelationshipProducer.Discover(Content("Add all 200 g pasta."));
        var after = before with { ContentRevision = "duplicate", InstructionSections = [before.InstructionSections[0] with { Steps = [..before.InstructionSections[0].Steps, new(Guid.NewGuid(), "Reserve half the pasta.", "new-text", [])] }] };
        var result = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, after), before);
        Assert.Equal(0, CookingStepProjection.Read(result, 8).ValidatedUses);
    }

    [Fact]
    public void ExplicitUnrelatedPartialEditPreservesWholeProofAndIdentity()
    {
        var original = Content("Add all 200 g pasta.");
        original = original with { IngredientLines = [original.IngredientLines[0], original.IngredientLines[0] with { Id = Guid.NewGuid(), Description = "sauce", Shopping = new("sauce", null, null) }] };
        var before = CookingStepRelationshipProducer.Discover(original);
        var after = before with { ContentRevision = "unrelated", InstructionSections = [before.InstructionSections[0] with { Steps = [..before.InstructionSections[0].Steps, new(Guid.NewGuid(), "Add half the sauce.", "new-text", [])] }] };
        var result = CookingStepRelationshipProducer.Discover(CookingStepProjection.Revalidate(before, after), before);
        Assert.Equal("Add all 400 g pasta.", CookingStepProjection.Read(result, 8).Sections[0].Steps[0].Text);
        Assert.Equal(before.InstructionSections[0].Steps[0].Bindings[0].GetProperty("id").GetGuid(), result.InstructionSections[0].Steps[0].Bindings[0].GetProperty("id").GetGuid());
    }

    [Fact]
    public void DuplicateOwnedBindingsDoNotThrowOrRemainEligible()
    {
        var before = CookingStepRelationshipProducer.Discover(Content("Add all 200 g pasta."));
        var binding = before.InstructionSections[0].Steps[0].Bindings[0];
        var duplicate = before with { InstructionSections = [before.InstructionSections[0] with { Steps = [before.InstructionSections[0].Steps[0] with { Bindings = [binding, binding] }] }] };
        var result = CookingStepRelationshipProducer.Discover(duplicate, duplicate);
        Assert.Equal(0, CookingStepProjection.Read(result, 8).ValidatedUses);
    }

    [Fact]
    public void DuplicateCanonicalDescriptionsAreAmbiguous()
    {
        var original = Content("Add all 200 g pasta.");
        var result = CookingStepRelationshipProducer.Discover(original with { IngredientLines = [original.IngredientLines[0], original.IngredientLines[0] with { Id = Guid.NewGuid() }] });
        Assert.Empty(result.InstructionSections[0].Steps[0].Bindings);
    }

    [Fact]
    public void ExistingOtherRolesArePreservedAndNeverOverlapped()
    {
        var original = Content("Add all 200 g pasta.");
        var fixedUse = JsonSerializer.SerializeToElement(new { id = Guid.NewGuid(), role = "fixed", status = "validated", payload = new { amount = LegacyGroceryQuantity.Parse("200") } });
        var content = original with { InstructionSections = [original.InstructionSections[0] with { Steps = [original.InstructionSections[0].Steps[0] with { Bindings = [fixedUse] }] }] };
        Assert.Equal(JsonSerializer.Serialize(content), JsonSerializer.Serialize(CookingStepRelationshipProducer.Discover(content)));
    }

    [Fact]
    public void IncomingValidatedLabelAndMarkerCannotCertifyFreshContent()
    {
        var derived = CookingStepRelationshipProducer.Discover(Content("Add all 200 g pasta."));
        var changed = derived with { IngredientLines = [derived.IngredientLines[0] with { Amount = LegacyGroceryQuantity.Parse("250"), AmountText = "250" }] };
        Assert.Throws<InvalidDataException>(() => CookingStepRelationshipProducer.ValidateFresh(changed));
        var ambiguous = derived with { InstructionSections = [derived.InstructionSections[0] with { Steps = [derived.InstructionSections[0].Steps[0] with { Text = "Add 200 g pasta." }] }] };
        Assert.Throws<InvalidDataException>(() => CookingStepRelationshipProducer.ValidateFresh(ambiguous));
    }

    [Fact]
    public void StagedFreshContentWithoutBindingsRetainsReadableFallback()
    {
        var original = Content("Add all 200 g pasta.");
        CookingStepRelationshipProducer.ValidateFresh(original);
        Assert.Equal("Add all 200 g pasta.", CookingStepProjection.Read(original, 8).Sections[0].Steps[0].Text);
    }

    [Fact]
    public void MalformedOwnedMarkerCannotKeepAnUnprovedBindingEligible()
    {
        var original = CookingStepRelationshipProducer.Discover(Content("Add all 200 g pasta."));
        var node = JsonNode.Parse(original.InstructionSections[0].Steps[0].Bindings[0].GetRawText())!;
        node["payload"] = JsonSerializer.SerializeToNode(new { relationshipEvidence = "invalid" });
        node["span"] = JsonSerializer.SerializeToNode(new { start = 4, end = 9, expectedText = "200 g" });
        var malformed = original with { InstructionSections = [original.InstructionSections[0] with { Steps = [original.InstructionSections[0].Steps[0] with { Text = "Add 200 g pasta.", Bindings = [JsonSerializer.SerializeToElement(node)] }] }] };
        Assert.Equal(0, CookingStepProjection.Read(CookingStepRelationshipProducer.Discover(malformed), 8).ValidatedUses);
    }
}
