using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CurrentRecipeExportTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly Guid RecipeId = Guid.Parse("10000000-0000-0000-0000-000000000001");

    public static StructuredRecipeExport Example() => new(RecipeId, new(2, "revision-opaque", "source-opaque", null,
        [Line("flour", "⅓", "cup"), Line("garlic", "2–3", "cloves"), Line("salt", null, null), Line("salt", "0", "tsp")],
        [new(Guid.NewGuid(), null, [new(Guid.NewGuid(), "Mix 🥣, puis cuire.", "text-opaque", [])])]),
        """{ "@context": "https://schema.org/", "@type": "Recipe", "recipeYield": "4 portions", "recipeIngredient": ["stale source"], "privateEvidence": "retain exactly" }""");

    private static RecipeIngredientLineDto Line(string description, string? amount, string? unit) => new()
    {
        Id = Guid.NewGuid(), Description = description,
        Amount = amount is null ? null : QuantityMath.Parse(amount), AmountText = amount,
        Unit = unit is null ? null : new(unit, null), Scaling = "proportional", Package = null,
        Shopping = new(description, null, null), Provenance = new("unknown", "evidence:retained", ["amount", "description"])
    };

    private static JsonObject ContentNode(StructuredRecipeContent? content = null)
        => JsonSerializer.SerializeToNode(content ?? Example().Content, Json)!.AsObject();

    private static JsonObject BoundContentNode()
    {
        var content = ContentNode();
        var step = content["instructionSections"]![0]!["steps"]![0]!;
        step["bindings"] = new JsonArray(new JsonObject
        {
            ["id"] = Guid.NewGuid(), ["ingredientLineId"] = content["ingredientLines"]![0]!["id"]!.DeepClone(),
            ["stepId"] = step["id"]!.DeepClone(), ["validatedContentRevision"] = content["contentRevision"]!.DeepClone(),
            ["validatedTextRevision"] = step["textRevision"]!.DeepClone(),
            ["span"] = new JsonObject { ["start"] = 4, ["end"] = 6, ["expectedText"] = "🥣" },
            ["role"] = "mention", ["payload"] = new JsonObject(), ["status"] = "valid"
        });
        return content;
    }

    private static string BuildRetiredV2Wrapper(StructuredRecipeExport export)
        => new JsonObject
        {
            ["format"] = "wfs-recipe",
            ["version"] = 2,
            ["recipeId"] = export.RecipeId,
            ["contentSchemaVersion"] = 2,
            ["contentRevision"] = export.Content.ContentRevision,
            ["content"] = JsonSerializer.SerializeToNode(export.Content, Json),
            ["rawMetadata"] = export.RawMetadata
        }.ToJsonString();

    [Fact]
    public void SchemaOrgRoundTrip_PreservesIngredientsInstructionsAndYieldBasis()
    {
        const string sourceJson = """
            {
              "@context": "https://schema.org/",
              "@type": "Recipe",
              "name": "Herb Pasta",
              "recipeYield": "4 portions",
              "recipeIngredient": ["340 g pasta", "2 tbsp olive oil"],
              "recipeInstructions": [{ "@type": "HowToSection", "itemListElement": [{ "@type": "HowToStep", "text": "Boil pasta." }] }]
            }
            """;

        var (derived, _) = StructuredRecipeContentStore.FromSchemaOrg(RecipeId, sourceJson, null, null, Guid.NewGuid(), "source");
        Assert.Equal(4, derived.Servings);
        Assert.Equal(2, derived.IngredientLines.Count);
        Assert.Single(derived.InstructionSections);

        var exported = StructuredRecipeContentStore.ToSchemaOrgJson(derived, sourceJson, "Herb Pasta", null);
        using var exportedDoc = JsonDocument.Parse(exported);
        Assert.Equal("https://schema.org/", exportedDoc.RootElement.GetProperty("@context").GetString());
        Assert.Equal("Recipe", exportedDoc.RootElement.GetProperty("@type").GetString());
        Assert.Equal("4 portions", exportedDoc.RootElement.GetProperty("recipeYield").GetString());
        Assert.False(exportedDoc.RootElement.TryGetProperty("backupContentVersion", out _));
        Assert.False(exportedDoc.RootElement.TryGetProperty("format", out _));

        // Manually corrected servings updates recipeYield without altering printed ingredients
        var corrected = derived with { Servings = 3 };
        var correctedJson = StructuredRecipeContentStore.ToSchemaOrgJson(corrected, exported, "Herb Pasta", null);
        var (reloadedCorrected, _) = StructuredRecipeContentStore.FromSchemaOrg(RecipeId, correctedJson, null, null, Guid.NewGuid(), "source");
        Assert.Equal(3, reloadedCorrected.Servings);
        Assert.Contains("340 g pasta", reloadedCorrected.IngredientLines.Select(StructuredRecipeContentStore.Render));

        // Explicit unknown servings writes recipeYield as null and restores servings null
        var unknown = derived with { Servings = null };
        var unknownJson = StructuredRecipeContentStore.ToSchemaOrgJson(unknown, exported, "Herb Pasta", null);
        using var unknownDoc = JsonDocument.Parse(unknownJson);
        Assert.Equal(JsonValueKind.Null, unknownDoc.RootElement.GetProperty("recipeYield").ValueKind);
        var (reloadedUnknown, _) = StructuredRecipeContentStore.FromSchemaOrg(RecipeId, unknownJson, null, null, Guid.NewGuid(), "source");
        Assert.Null(reloadedUnknown.Servings);
    }

    [Theory]
    [InlineData("schema-version")]
    [InlineData("source")]
    [InlineData("basis")]
    [InlineData("duplicate")]
    [InlineData("zero-id")]
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
    public void InvalidCanonicalFactsOrIdentities_FailValidation(string mutation)
    {
        var content = ContentNode();
        var line = content["ingredientLines"]![0]!;
        var step = content["instructionSections"]![0]!["steps"]![0]!;
        switch (mutation)
        {
            case "schema-version": content["contentSchemaVersion"] = 1; break;
            case "source": content["sourceRevision"] = ""; break;
            case "basis": content["servings"] = 0; break;
            case "duplicate": content["ingredientLines"]![1]!["id"] = line["id"]!.DeepClone(); break;
            case "zero-id": line["id"] = Guid.Empty; break;
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
        var parsed = content.Deserialize<StructuredRecipeContent>(Json)!;
        Assert.Throws<InvalidDataException>(() => StructuredRecipeContentStore.ValidateContent(parsed));
    }

    [Fact]
    public void SavedBinding_ValidatesExactUtf16SpanAndPayload()
    {
        var parsed = BoundContentNode().Deserialize<StructuredRecipeContent>(Json)!;
        StructuredRecipeContentStore.ValidateContent(parsed);
        var binding = Assert.Single(parsed.InstructionSections[0].Steps[0].Bindings);
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
        var content = BoundContentNode();
        var bindings = content["instructionSections"]![0]!["steps"]![0]!["bindings"]!.AsArray();
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
        var parsed = content.Deserialize<StructuredRecipeContent>(Json)!;
        Assert.Throws<InvalidDataException>(() => StructuredRecipeContentStore.ValidateContent(parsed));
    }

    [Theory]
    [InlineData("v1")]
    [InlineData("v2")]
    [InlineData("unknown")]
    public async Task SyncRecipeProcessor_RejectsRetiredAndUnknownWrapperEnvelopes(string envelopeKind)
    {
        using var db = TestDbContextFactory.Create();
        var export = Example();
        var recipe = new Recipe { Id = export.RecipeId, Name = "Wrapped Recipe", IsReady = true };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();

        var repository = new RecipeRepository(new InMemoryStorageProvider());
        var wrappedJson = envelopeKind switch
        {
            "v1" => """{"backupContentVersion":1,"rawMetadata":"{\"@context\":\"https://schema.org/\",\"@type\":\"Recipe\",\"recipeYield\":\"4 portions\",\"recipeIngredient\":[\"2 cups flour\"]}","ingredients":"[\"2 cups flour\"]","servings":4}""",
            "v2" => BuildRetiredV2Wrapper(export),
            _ => """{"format":"legacy-custom","version":3,"recipeIngredient":["2 cups flour"]}"""
        };
        await repository.SaveRecipeJsonAsync(recipe.Id, wrappedJson, default);

        var clock = new SystemClock();
        var publisher = new Mock<ISupperProjectionPublisher>();
        var invalidation = new SupperProjectionInvalidation(db, clock, new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager()));
        var processor = new SyncRecipeProcessor(clock, db, repository, invalidation,
            publisher.Object, NullLogger<SyncRecipeProcessor>.Instance, TestPublicationStore.Vocabulary(db, repository.StorageProvider, clock));
        var task = new WorkflowTask { Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id }) };

        await Assert.ThrowsAsync<InvalidDataException>(() => processor.ExecuteAsync(task, default));
        var saved = await db.Recipes.AsNoTracking().SingleAsync(r => r.Id == recipe.Id);
        Assert.Null(saved.CanonicalContent);
    }

    [Fact]
    public async Task SyncRecipeProcessor_ReplayMode_RejectsRetiredWfsRecipeV2Wrapper()
    {
        using var db = TestDbContextFactory.Create();
        var export = Example();
        var recipe = new Recipe
        {
            Id = export.RecipeId,
            Name = "Current Recipe",
            CanonicalContent = JsonSerializer.Serialize(export.Content, Json),
            RawMetadata = export.RawMetadata,
            Servings = export.Content.Servings,
            Ingredients = "[]"
        };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();

        var repository = new RecipeRepository(new InMemoryStorageProvider());
        await repository.SaveRecipeJsonAsync(recipe.Id, BuildRetiredV2Wrapper(export), default);

        var clock = new SystemClock();
        var publisher = new Mock<ISupperProjectionPublisher>();
        var invalidation = new SupperProjectionInvalidation(db, clock, new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager()));
        var processor = new SyncRecipeProcessor(clock, db, repository, invalidation,
            publisher.Object, NullLogger<SyncRecipeProcessor>.Instance, TestPublicationStore.Vocabulary(db, repository.StorageProvider, clock));
        var task = new WorkflowTask { Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id, mode = "current-format-replay" }) };

        await Assert.ThrowsAsync<InvalidDataException>(() => processor.ExecuteAsync(task, default));
    }

    [Fact]
    public async Task SyncRecipeProcessor_AcceptsPureSchemaOrgRecipeJsonDirectly()
    {
        using var db = TestDbContextFactory.Create();
        var recipeId = Guid.NewGuid();
        db.Recipes.Add(new Recipe { Id = recipeId, Name = "Pure Schema.org", IsReady = true });
        await db.SaveChangesAsync();

        var repository = new RecipeRepository(new InMemoryStorageProvider());
        await repository.SaveRecipeJsonAsync(recipeId, """
            {
              "@context": "https://schema.org/",
              "@type": "Recipe",
              "name": "Pure Schema.org",
              "recipeYield": "4 portions",
              "recipeIngredient": ["500 g beef", "2 carrots"],
              "recipeInstructions": [{ "@type": "HowToSection", "itemListElement": [{ "@type": "HowToStep", "text": "Simmer gently." }] }]
            }
            """, default);

        var clock = new SystemClock();
        var publisher = new Mock<ISupperProjectionPublisher>();
        var invalidation = new SupperProjectionInvalidation(db, clock, new DeploymentCalendar(new Microsoft.Extensions.Configuration.ConfigurationManager()));
        var processor = new SyncRecipeProcessor(clock, db, repository, invalidation,
            publisher.Object, NullLogger<SyncRecipeProcessor>.Instance, TestPublicationStore.Vocabulary(db, repository.StorageProvider, clock));
        var task = new WorkflowTask { Payload = JsonSerializer.Serialize(new { recipeId }) };

        Assert.NotNull(await processor.ExecuteAsync(task, default));
        var saved = await db.Recipes.AsNoTracking().SingleAsync(r => r.Id == recipeId);
        Assert.NotNull(saved.CanonicalContent);
        Assert.Equal(4, saved.Servings);
        Assert.Contains("500 g beef", saved.Ingredients);
        Assert.Contains("Simmer gently.", saved.RawMetadata);
    }
}
