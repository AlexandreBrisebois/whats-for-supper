using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CanonicalRelationshipHistoryTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [Theory]
    [InlineData("whole")][InlineData("absolute")][InlineData("fraction")][InlineData("fixed")][InlineData("perItem")][InlineData("remainder")]
    public async Task ActualGuardedRelationshipSave_RemainsReadableForFollowingQuantitySaveAndRetainedReplay(string role)
    {
        await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var clock = new SystemClock();
        var vocabulary = TestPublicationStore.Vocabulary(db, new InMemoryStorageProvider(), clock);
        var store = new CanonicalRecipeContentStore(db, clock,
            new SupperProjectionInvalidation(db, clock, new DeploymentCalendar(new ConfigurationManager())), vocabulary);
        var texts = role switch
        {
            "absolute" => new[] { "Add 50 g pasta." },
            "fraction" => new[] { "Add half of the pasta (100 g)." },
            "fixed" => new[] { "For any number of portions, use exactly 1 tbsp oil." },
            "perItem" => new[] { "For all 4 pieces of chicken, use exactly 5 ml of oil on each piece." },
            "remainder" => new[] { "Add 50 g pasta.", "Finally, use all the remaining pasta." },
            _ => new[] { "Add all 200 g pasta." }
        };
        var row = new RecipeIngredientLineDto { Id = Guid.NewGuid(), Description = "pasta", Amount = LegacyGroceryQuantity.Parse("200"),
            AmountText = "200", Package = null, Unit = new("g", null), Scaling = "proportional", Shopping = new("pasta", null, null),
            Provenance = new("unknown", null, []) };
        if (role == "fixed") row = row with { Description = "oil", Amount = LegacyGroceryQuantity.Parse("2"), AmountText = "2", Unit = new("tbsp", null), Shopping = new("oil", null, null) };
        RecipeIngredientLineDto[] rows = [row];
        if (role == "perItem")
        {
            row = row with { Description = "chicken", Amount = LegacyGroceryQuantity.Parse("4"), AmountText = "4", Unit = new("pieces", null), Shopping = new("chicken", null, null) };
            rows = [row, row with { Id = Guid.NewGuid(), Description = "oil", Amount = LegacyGroceryQuantity.Parse("20"), AmountText = "20", Unit = new("ml", null), Shopping = new("oil", null, null) }];
        }
        var steps = texts.Select((_, index) => new RecipeInstructionStepDto(Guid.NewGuid(), "Mix." + index, "old-text-" + index, [])).ToArray();
        var before = new CanonicalRecipeContent(2, "before", "source", 4, rows, [new(Guid.NewGuid(), null, steps)]);
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Pasta", Servings = 4,
            RawMetadata = """{"recipeIngredient":["200 g pasta"],"recipeInstructions":[{"text":"Mix pasta."}]}""",
            Ingredients = "[\"200 g pasta\"]", CanonicalContent = JsonSerializer.Serialize(before, Json) };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        var operation = Guid.NewGuid();
        var input = new UpdateRecipeDto { ExpectedContentRevision = before.ContentRevision,
            InstructionSections = JsonSerializer.SerializeToElement(new[] { new { id = before.InstructionSections[0].Id, name = (string?)null,
                steps = steps.Select((step, index) => new { id = step.Id, text = texts[index] }) } }, Json) };
        var discovered = await store.EditAsync(recipe.Id, before.SourceRevision, operation, input);
        Assert.Equal(role is "perItem" or "remainder" ? 2 : 1, discovered.Content.InstructionSections.SelectMany(x => x.Steps).Sum(x => x.Bindings.Count));
        var original = await db.CanonicalRecipeOperations.AsNoTracking().SingleAsync();
        // Domain RED: independently reading the real accepted history cannot
        // reproduce the randomly allocated relationship ID and rejects it.
        Assert.Empty(CanonicalRecipeContentStore.VocabularyReferences(original));
        foreach (var corruption in new[] { "empty-id", "row-id-reuse", "missing-use", "proof", "span", "graph", "duplicate-id", "missing-link", "predecessor" })
        {
            var node = JsonNode.Parse(original.Result)!;
            var uses = node["result"]!["content"]!["instructionSections"]![0]!["steps"]![0]!["bindings"]!.AsArray();
            var binding = uses[0]!;
            switch (corruption)
            {
                case "duplicate-id": uses.Add(binding.DeepClone()); break;
                case "missing-link":
                    if (role == "perItem") uses[1]!["payload"]!.AsObject().Remove("countBindingId");
                    else if (role == "remainder") node["result"]!["content"]!["instructionSections"]![0]!["steps"]![1]!["bindings"]![0]!["payload"]!.AsObject().Remove("predecessors");
                    else binding["status"] = "uncertain";
                    break;
                case "predecessor":
                    if (role == "remainder") node["result"]!["content"]!["instructionSections"]![0]!["steps"]![1]!["bindings"]![0]!["payload"]!["predecessors"]![0] = Guid.NewGuid();
                    else if (role == "perItem") uses[1]!["payload"]!["countBindingId"] = Guid.NewGuid();
                    else binding["stepId"] = Guid.NewGuid();
                    break;
                case "empty-id": binding["id"] = Guid.Empty; break;
                case "row-id-reuse": binding["id"] = row.Id; break;
                case "missing-use": uses.Clear(); break;
                case "proof": binding["payload"]!["relationshipEvidence"]!["originalAmount"] = JsonSerializer.SerializeToNode(LegacyGroceryQuantity.Parse("999"), Json); break;
                case "span": binding["span"]!["start"] = binding["span"]!["start"]!.GetValue<int>() + 1; break;
                case "graph":
                    if (role == "perItem") uses[1]!["payload"]!["countBindingId"] = Guid.NewGuid();
                    else if (role == "remainder") binding["payload"]!["allocationGroup"]!["bindingIds"]![0] = Guid.NewGuid();
                    else binding["role"] = "unsupported";
                    break;
            }
            // The original request hash remains valid. Result IDs cannot grant
            // authority to changed proof, changed spans or incoherent graph edges.
            var forged = new CanonicalRecipeOperation { RecipeId = original.RecipeId, OperationId = original.OperationId,
                InputHash = original.InputHash, OriginalRequest = original.OriginalRequest, Result = node.ToJsonString(), CreatedAt = original.CreatedAt };
            Assert.Throws<InvalidDataException>(() => CanonicalRecipeContentStore.VocabularyReferences(forged));
        }
        var amount = role == "perItem" ? "6" : "250";
        var corrected = await store.EditAsync(recipe.Id, before.SourceRevision, Guid.NewGuid(), new UpdateRecipeDto
        {
            ExpectedContentRevision = discovered.Content.ContentRevision,
            IngredientLines = JsonSerializer.SerializeToElement(rows.Select((line, index) => new { id = line.Id, description = line.Description,
                amount = index == 0 ? LegacyGroceryQuantity.Parse(amount) : line.Amount, amountText = index == 0 ? amount : line.AmountText, unit = line.Unit, scaling = line.Scaling, package = line.Package, shopping = line.Shopping }), Json)
        });
        Assert.Equal(amount, corrected.Content.IngredientLines[0].AmountText);
        var carriedOperation = await db.CanonicalRecipeOperations.AsNoTracking().SingleAsync(x => x.OperationId != operation);
        var changedCarry = JsonNode.Parse(carriedOperation.Result)!;
        changedCarry["result"]!["content"]!["instructionSections"]![0]!["steps"]![0]!["bindings"]![0]!["id"] = Guid.NewGuid();
        Assert.Throws<InvalidDataException>(() => CanonicalRecipeContentStore.VocabularyReferences(new()
        { RecipeId = carriedOperation.RecipeId, OperationId = carriedOperation.OperationId, InputHash = carriedOperation.InputHash,
            OriginalRequest = carriedOperation.OriginalRequest, Result = changedCarry.ToJsonString(), CreatedAt = carriedOperation.CreatedAt }));
        var replacementTexts = role switch
        {
            "absolute" => new[] { "Add 75 g pasta." },
            "fraction" => new[] { "Add half of the pasta (125 g)." },
            "fixed" => new[] { "For any number of portions, use exactly 2 tbsp oil." },
            "perItem" => new[] { "For all 6 pieces of chicken, use exactly 6 ml of oil on each piece." },
            "remainder" => new[] { "Add 75 g pasta.", "Finally, use all the remaining pasta." },
            _ => new[] { "Add all 250 g pasta." }
        };
        var replacementId = Guid.NewGuid();
        var replaced = await store.EditAsync(recipe.Id, before.SourceRevision, replacementId, new UpdateRecipeDto
        {
            ExpectedContentRevision = corrected.Content.ContentRevision,
            InstructionSections = JsonSerializer.SerializeToElement(new[] { new { id = corrected.Content.InstructionSections[0].Id, name = (string?)null,
                steps = corrected.Content.InstructionSections[0].Steps.Select((step, index) => new { id = step.Id, text = replacementTexts[index] }) } }, Json)
        });
        var replacement = await db.CanonicalRecipeOperations.AsNoTracking().SingleAsync(x => x.OperationId == replacementId);
        Assert.Empty(CanonicalRecipeContentStore.VocabularyReferences(replacement));
        var priorBinding = corrected.Content.InstructionSections[0].Steps[0].Bindings[0].GetProperty("id").GetGuid();
        Assert.NotEqual(priorBinding, replaced.Content.InstructionSections[0].Steps[0].Bindings[0].GetProperty("id").GetGuid());
        var reused = JsonNode.Parse(replacement.Result)!;
        reused["result"]!["content"]!["instructionSections"]![0]!["steps"]![0]!["bindings"]![0]!["id"] = priorBinding;
        Assert.Throws<InvalidDataException>(() => CanonicalRecipeContentStore.VocabularyReferences(new()
        { RecipeId = replacement.RecipeId, OperationId = replacement.OperationId, InputHash = replacement.InputHash,
            OriginalRequest = replacement.OriginalRequest, Result = reused.ToJsonString(), CreatedAt = replacement.CreatedAt }));
        if (role == "remainder")
        {
            foreach (var invalidGroup in new[] { corrected.Content.InstructionSections[0].Steps[0].Bindings[0].GetProperty("payload").GetProperty("allocationGroup").GetProperty("id").GetGuid(),
                replaced.Content.InstructionSections[0].Steps[0].Bindings[0].GetProperty("id").GetGuid() })
            {
                var groupCollision = JsonNode.Parse(replacement.Result)!;
                var recordedSteps = groupCollision["result"]!["content"]!["instructionSections"]![0]!["steps"]!;
                recordedSteps[0]!["bindings"]![0]!["payload"]!["allocationGroup"]!["id"] = invalidGroup;
                recordedSteps[1]!["bindings"]![0]!["payload"]!["allocationGroup"]!["id"] = invalidGroup;
                recordedSteps[1]!["bindings"]![0]!["payload"]!["allocationGroupId"] = invalidGroup;
                Assert.Throws<InvalidDataException>(() => CanonicalRecipeContentStore.VocabularyReferences(new()
                { RecipeId = replacement.RecipeId, OperationId = replacement.OperationId, InputHash = replacement.InputHash,
                    OriginalRequest = replacement.OriginalRequest, Result = groupCollision.ToJsonString(), CreatedAt = replacement.CreatedAt }));
            }
        }
        var replay = await store.EditAsync(recipe.Id, before.SourceRevision, operation, input);
        Assert.Equal(discovered.Content.ContentRevision, replay.Content.ContentRevision);
        Assert.Equal(3, await db.CanonicalRecipeOperations.CountAsync());
        Assert.Equal(original.Result, (await db.CanonicalRecipeOperations.AsNoTracking().SingleAsync(x => x.OperationId == operation)).Result);
    }

    [Fact]
    public async Task RetainedStandaloneForeignFixedBinding_AllowsHistoryReadAndStaleGuardAfterQuantitySave()
    {
        await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var clock = new SystemClock();
        var vocabulary = TestPublicationStore.Vocabulary(db, new InMemoryStorageProvider(), clock);
        var store = new CanonicalRecipeContentStore(db, clock, new SupperProjectionInvalidation(db, clock, new DeploymentCalendar(new ConfigurationManager())), vocabulary);
        var row = new RecipeIngredientLineDto { Id = Guid.NewGuid(), Description = "oil", Amount = LegacyGroceryQuantity.Parse("2"), AmountText = "2", Package = null,
            Unit = new("tbsp", null), Scaling = "proportional", Shopping = new("oil", null, null), Provenance = new("unknown", null, []) };
        var steps = new[] { "Heat one tbsp oil from a 400 g package; cook 20 minutes at 180 °C.", "Finish with 1 tbsp oil." }.Select((text, index) =>
        {
            var stepId = Guid.NewGuid(); var textRevision = Guid.NewGuid().ToString("N");
            var expected = index == 0 ? "one tbsp" : "1 tbsp"; var start = text.IndexOf(expected, StringComparison.Ordinal);
            return new RecipeInstructionStepDto(stepId, text, textRevision, [JsonSerializer.SerializeToElement(new
            {
                id = Guid.NewGuid(), ingredientLineId = row.Id, stepId, validatedContentRevision = "before", validatedTextRevision = textRevision,
                span = new { start, end = start + expected.Length, expectedText = expected }, role = index == 0 ? "fixed" : "absolute",
                payload = new { amount = LegacyGroceryQuantity.Parse("1"), unit = row.Unit }, status = "validated"
            }, Json)]);
        }).ToArray();
        var before = new CanonicalRecipeContent(2, "before", "source", 4, [row], [new(Guid.NewGuid(), null, steps)]);
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Oil", Servings = 4, CanonicalContent = JsonSerializer.Serialize(before, Json) };
        db.Recipes.Add(recipe); await db.SaveChangesAsync();
        UpdateRecipeDto Input(string revision, string amount) => new() { ExpectedContentRevision = revision,
            IngredientLines = JsonSerializer.SerializeToElement(new[] { new { id = row.Id, description = row.Description, amount = LegacyGroceryQuantity.Parse(amount),
                amountText = amount, unit = row.Unit, package = row.Package, shopping = row.Shopping, scaling = row.Scaling } }, Json) };
        var firstOperationId = Guid.NewGuid();
        var saved = await store.EditAsync(recipe.Id, before.SourceRevision, firstOperationId, Input(before.ContentRevision, "3"));
        Assert.Empty(CanonicalRecipeContentStore.VocabularyReferences(await db.CanonicalRecipeOperations.AsNoTracking().SingleAsync()));
        await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.EditAsync(recipe.Id, before.SourceRevision, Guid.NewGuid(), Input(before.ContentRevision, "9")));
        var changeUnit = Input(saved.Content.ContentRevision, "3");
        var changedRows = JsonNode.Parse(changeUnit.IngredientLines.GetRawText())!;
        changedRows[0]!["unit"]!["text"] = "tsp";
        changeUnit.IngredientLines = JsonSerializer.SerializeToElement(changedRows, Json);
        var uncertain = await store.EditAsync(recipe.Id, before.SourceRevision, Guid.NewGuid(), changeUnit);
        Assert.Throws<InvalidDataException>(() => RecipeExportContent.WriteCurrent(new(recipe.Id, uncertain.Content, null)));
        foreach (var accepted in await db.CanonicalRecipeOperations.AsNoTracking().ToArrayAsync())
        {
            Assert.Empty(CanonicalRecipeContentStore.VocabularyReferences(accepted));
            foreach (var field in new[] { "proof", "validation", "reference" })
            {
                var forged = JsonNode.Parse(accepted.Result)!;
                var binding = forged["result"]!["content"]!["instructionSections"]![0]!["steps"]![0]!["bindings"]![0]!;
                if (field == "proof") binding["payload"]!["amount"] = JsonSerializer.SerializeToNode(LegacyGroceryQuantity.Parse("999"), Json);
                else if (field == "validation") binding["validatedContentRevision"] = "";
                else binding["ingredientLineId"] = Guid.NewGuid();
                Assert.Throws<InvalidDataException>(() => CanonicalRecipeContentStore.VocabularyReferences(new()
                { RecipeId = accepted.RecipeId, OperationId = accepted.OperationId, InputHash = accepted.InputHash,
                    OriginalRequest = accepted.OriginalRequest, Result = forged.ToJsonString(), CreatedAt = accepted.CreatedAt }));
            }
        }
        await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.EditAsync(recipe.Id, before.SourceRevision, Guid.NewGuid(), Input(before.ContentRevision, "9")));
        Assert.Equal(uncertain.Content.ContentRevision, CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync())!.ContentRevision);
        var retained = uncertain;
        foreach (var replacementText in new[] { "Short instruction.", "" })
        {
            var operationId = Guid.NewGuid();
            retained = await store.EditAsync(recipe.Id, before.SourceRevision, operationId, new UpdateRecipeDto
            {
                ExpectedContentRevision = retained.Content.ContentRevision,
                InstructionSections = JsonSerializer.SerializeToElement(retained.Content.InstructionSections.Select(section => new
                { id = section.Id, name = section.Name, steps = section.Steps.Select((step, index) => new { id = step.Id, text = index == 0 ? replacementText : step.Text }) }), Json)
            });
            Assert.Equal(uncertain.Content.InstructionSections[0].Steps[0].Bindings[0].GetRawText(), retained.Content.InstructionSections[0].Steps[0].Bindings[0].GetRawText());
            Assert.Empty(CanonicalRecipeContentStore.VocabularyReferences(await db.CanonicalRecipeOperations.AsNoTracking().SingleAsync(x => x.OperationId == operationId)));
            Assert.Equal(0, CookingStepProjection.Read(retained.Content, 6).ValidatedUses);
            Assert.Throws<InvalidDataException>(() => RecipeExportContent.WriteCurrent(new(recipe.Id, retained.Content, null)));
            var original = await db.CanonicalRecipeOperations.AsNoTracking().SingleAsync(x => x.OperationId == operationId);
            foreach (var corruption in new[] { "stale-token", "inactive-proof", "inactive-span", "inactive-reference", "activate", "step-owner", "duplicate-id", "inject" })
            {
                var forged = JsonNode.Parse(original.Result)!;
                var uses = forged["result"]!["content"]!["instructionSections"]![0]!["steps"]![0]!["bindings"]!.AsArray();
                var use = uses[0]!;
                switch (corruption)
                {
                    case "stale-token": use["validatedContentRevision"] = "invented-nonblank-old-token"; break;
                    case "inactive-proof": use["payload"]!["amount"] = JsonSerializer.SerializeToNode(LegacyGroceryQuantity.Parse("999"), Json); break;
                    case "inactive-span": use["span"]!["start"] = use["span"]!["start"]!.GetValue<int>() + 1; use["span"]!["end"] = use["span"]!["end"]!.GetValue<int>() + 1; break;
                    case "inactive-reference": use["ingredientLineId"] = Guid.NewGuid(); break;
                    case "activate": use["validatedContentRevision"] = retained.Content.ContentRevision; use["validatedTextRevision"] = retained.Content.InstructionSections[0].Steps[0].TextRevision; break;
                    case "step-owner": use["stepId"] = Guid.NewGuid(); break;
                    case "duplicate-id": uses.Add(use.DeepClone()); break;
                    case "inject": var injected = use.DeepClone(); injected["id"] = Guid.NewGuid(); injected["validatedTextRevision"] = "other-old-text"; uses.Add(injected); break;
                }
                Assert.Throws<InvalidDataException>(() => CanonicalRecipeContentStore.VocabularyReferences(new()
                { RecipeId = original.RecipeId, OperationId = original.OperationId, InputHash = original.InputHash,
                    OriginalRequest = original.OriginalRequest, Result = forged.ToJsonString(), CreatedAt = original.CreatedAt }));
            }
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.EditAsync(recipe.Id, before.SourceRevision, Guid.NewGuid(), Input(before.ContentRevision, "9")));
        }
        var removalId = Guid.NewGuid();
        var removed = await store.EditAsync(recipe.Id, before.SourceRevision, removalId, new UpdateRecipeDto
        { ExpectedContentRevision = retained.Content.ContentRevision, IngredientLines = JsonSerializer.SerializeToElement(Array.Empty<object>(), Json) });
        Assert.Empty(removed.Content.IngredientLines);
        Assert.Equal(retained.Content.InstructionSections[0].Steps[0].Bindings[0].GetRawText(), removed.Content.InstructionSections[0].Steps[0].Bindings[0].GetRawText());
        Assert.Empty(CanonicalRecipeContentStore.VocabularyReferences(await db.CanonicalRecipeOperations.AsNoTracking().SingleAsync(x => x.OperationId == removalId)));
        Assert.Equal(0, CookingStepProjection.Read(removed.Content, 6).ValidatedUses);
        Assert.Throws<InvalidDataException>(() => RecipeExportContent.WriteCurrent(new(recipe.Id, removed.Content, null)));
        await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.EditAsync(recipe.Id, before.SourceRevision, Guid.NewGuid(), Input(before.ContentRevision, "9")));
        var first = await db.CanonicalRecipeOperations.AsNoTracking().SingleAsync(x => x.OperationId == firstOperationId);
        var count = await db.CanonicalRecipeOperations.CountAsync();
        var replay = await store.EditAsync(recipe.Id, before.SourceRevision, first.OperationId, Input(before.ContentRevision, "3"));
        Assert.Equal(saved.Content.ContentRevision, replay.Content.ContentRevision);
        Assert.Equal(count, await db.CanonicalRecipeOperations.CountAsync());
    }

}
