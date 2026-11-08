using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CurrentRecoveryDictionaryTests : CurrentRecoveryTestSet
{
    private static readonly Guid Food = Guid.Parse("40000000-0000-0000-0000-000000000001");
    private static readonly Guid Override = Guid.Parse("40000000-0000-0000-0000-000000000002");

    private JsonObject Dictionary() => JsonNode.Parse($$"""
        {"version":1,"units":[
          {"id":"culinary:cup","family":"cup","factor":{"n":"1","d":"1"},"countKind":null,"aliases":[{"locale":"en","text":"cups"},{"locale":"fr","text":"tasses"}]},
          {"id":"culinary:tsp","family":"tsp","factor":{"n":"1","d":"1"},"countKind":null,"aliases":[{"locale":"en","text":"teaspoon"},{"locale":"fr","text":"c. à thé"}]},
          {"id":"culinary:tbsp","family":"tbsp","factor":{"n":"1","d":"1"},"countKind":null,"aliases":[{"locale":"en","text":"tablespoon"},{"locale":"fr","text":"c. à soupe"}]}],
         "releases":[{"revision":"dictionary-pinned","sourceRef":"curated-fixture","foods":[
           {"id":"{{Food}}","revision":"food-pinned","labels":{"en":"Flour","fr":"Farine"},"qualifiers":{"form":"dry"},"status":"validated",
            "aliases":[{"locale":"fr","text":"farine","matchKey":"farine","relation":"exact","sourceRef":"reviewed-fixture","reviewedAt":"2026-11-01T00:00:00+00:00"}]}]}],
         "mappings":[]}
        """)!.AsObject();

    private JsonObject Overrides() => JsonNode.Parse($$"""
        {"version":1,"householdId":"{{_household}}","overrides":[
          {"id":"{{Override}}","revision":"category-pinned","foodId":"{{Food}}","dictionaryRevision":"dictionary-pinned",
           "fallbackKey":null,"shoppingName":"","grocerySection":"Pantry","protectedFields":["shoppingName","grocerySection"],
           "createdAt":"2026-11-01T00:00:00+00:00","updatedAt":"2026-11-02T00:00:00+00:00"}]}
        """)!.AsObject();

    private void Set(string kind, JsonNode value) => _files[kind + ".json"] = JsonSerializer.SerializeToUtf8Bytes(value);

    private (JsonObject Dictionary, JsonObject Content) Mapped()
    {
        var dictionary = Dictionary();
        var content = JsonNode.Parse(_files[_manifest.Recipes[0].Content])!.AsObject();
        var line = content["content"]!["ingredientLines"]![0]!;
        line["unit"]!["definitionId"] = "culinary:cup";
        // Include the original spelling as well as independently supported EN/FR aliases.
        dictionary["units"]![0]!["aliases"]!.AsArray().Add(new JsonObject { ["locale"] = "en", ["text"] = "cup" });
        line["shopping"]!["foodId"] = Food;
        line["shopping"]!["mappingRevision"] = "mapping-pinned";
        line["provenance"]!["protectedFields"]!.AsArray().Add("shopping");
        dictionary["mappings"]!.AsArray().Add(JsonSerializer.SerializeToNode(new
        {
            recipeId = _recipe, ingredientLineId = line["id"]!.GetValue<string>(), contentRevision = "revision-opaque",
            foodId = Food, foodRevision = "food-pinned", dictionaryRevision = "dictionary-pinned", mappingRevision = "mapping-pinned",
            origin = "source", sourceRef = "evidence:retained", evidenceSourceRevision = "source-opaque", protectedFields = new[] { "shopping" }
        }));
        return (dictionary, content);
    }

    [Fact]
    public async Task DictionaryAndPrivateOverridesRetainSavedFactsWithoutPublication()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        await CheckDictionaryStateAsync(factory.Services);
    }

    internal async Task CheckDictionaryStateAsync(IServiceProvider services)
    {
        var (dictionary, content) = Mapped();
        var overrides = Overrides();
        overrides["overrides"]!.AsArray().Add(JsonSerializer.SerializeToNode(new
        {
            id = Guid.NewGuid(), revision = "fallback-pinned", foodId = (Guid?)null, dictionaryRevision = (string?)null,
            fallbackKey = "unmapped source spelling", shoppingName = (string?)null, grocerySection = (string?)null,
            protectedFields = new[] { "shoppingName", "grocerySection" }, createdAt = CurrentRecoveryHouseholdTestData.Created,
            updatedAt = CurrentRecoveryHouseholdTestData.Updated
        }));
        Set("food-dictionary", dictionary); Set("household-food-overrides", overrides);
        _files[_manifest.Recipes[0].Content] = JsonSerializer.SerializeToUtf8Bytes(content);
        _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        async Task<string[]> Destination() => [
            JsonSerializer.Serialize(await db.Recipes.IgnoreQueryFilters().AsNoTracking().OrderBy(x => x.Id).ToArrayAsync()),
            JsonSerializer.Serialize(await db.IngredientCategories.AsNoTracking().OrderBy(x => x.NormalizedKey).ToArrayAsync()),
            JsonSerializer.Serialize(await db.WorkflowInstances.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync()),
            JsonSerializer.Serialize(await db.GroceryMutationOutcomes.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync())];
        var before = await Destination(); var disk = DiskHashes();
        var result = await scope.ServiceProvider.GetRequiredService<ManagementService>().InspectCurrentRecoveryAsync(_root, _household, Schema, []);
        var stage = result.StagedHouseholdState;
        Assert.True(JsonNode.DeepEquals(dictionary, JsonSerializer.SerializeToNode(stage.ReadDictionary(), Json)));
        Assert.True(JsonNode.DeepEquals(overrides, JsonSerializer.SerializeToNode(stage.ReadFoodOverrides(), Json)));
        Assert.Equal(new[] { "cup", "tsp", "tbsp" }, stage.ReadDictionary().Units.Select(x => x.Family));
        Assert.Equal(Food, Assert.Single(stage.ReadDictionary().Mappings).FoodId);
        Assert.Equal("", stage.ReadFoodOverrides().Overrides[0].ShoppingName);
        Assert.Null(stage.ReadFoodOverrides().Overrides[1].ShoppingName);
        Assert.Equal(before, await Destination());
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
        stage.ReadDictionary().Releases[0].Foods[0].Qualifiers["form"] = "caller mutation";
        stage.ReadDictionary().Units[0].Aliases[0] = new("en", "caller mutation");
        stage.ReadFoodOverrides().Overrides[0].ProtectedFields[0] = "caller mutation";
        await File.WriteAllTextAsync(Path.Combine(_root, "food-dictionary.json"), "later disk mutation");
        await File.WriteAllTextAsync(Path.Combine(_root, "household-food-overrides.json"), "later disk mutation");
        Assert.Equal("dry", stage.ReadDictionary().Releases[0].Foods[0].Qualifiers["form"]);
        Assert.Equal("cups", stage.ReadDictionary().Units[0].Aliases[0].Text);
        Assert.Equal("shoppingName", stage.ReadFoodOverrides().Overrides[0].ProtectedFields[0]);
    }

    [Theory]
    [InlineData("absent-mapping")]
    [InlineData("missing-line")]
    [InlineData("missing-recipe")]
    [InlineData("stale-content")]
    [InlineData("stale-food")]
    [InlineData("stale-dictionary")]
    [InlineData("stale-mapping")]
    [InlineData("stale-evidence")]
    [InlineData("missing-source")]
    [InlineData("unknown-unit")]
    [InlineData("wrong-unit-text")]
    [InlineData("unprotected-mapping")]
    [InlineData("unresolved-food")]
    public async Task SavedMappingsRequireExactDeclaredRecipeLineRevisionAndEvidence(string corruption)
    {
        var (dictionary, content) = Mapped();
        var mapping = dictionary["mappings"]![0]!;
        var line = content["content"]!["ingredientLines"]![0]!;
        switch (corruption)
        {
            case "absent-mapping": dictionary["mappings"] = new JsonArray(); break;
            case "missing-line": mapping["ingredientLineId"] = Guid.NewGuid(); break;
            case "missing-recipe": mapping["recipeId"] = Guid.NewGuid(); break;
            case "stale-content": mapping["contentRevision"] = "stale"; break;
            case "stale-food": mapping["foodRevision"] = "stale"; break;
            case "stale-dictionary": mapping["dictionaryRevision"] = "stale"; break;
            case "stale-mapping": mapping["mappingRevision"] = "stale"; break;
            case "stale-evidence": mapping["evidenceSourceRevision"] = "stale"; break;
            case "missing-source": mapping["sourceRef"] = null; mapping["evidenceSourceRevision"] = null; break;
            case "unknown-unit": line["unit"]!["definitionId"] = "not-declared"; break;
            case "wrong-unit-text": line["unit"]!["text"] = "tbsp"; break;
            case "unprotected-mapping": mapping["protectedFields"] = new JsonArray(); break;
            case "unresolved-food": dictionary["releases"]![0]!["foods"]![0]!["status"] = "unresolved"; break;
        }
        Set("food-dictionary", dictionary); Set("household-food-overrides", Overrides());
        _files[_manifest.Recipes[0].Content] = JsonSerializer.SerializeToUtf8Bytes(content);
        await AssertRejectedAsync("food-dictionary");
    }

    [Theory]
    [InlineData("placeholder")]
    [InlineData("unit-factor")]
    [InlineData("unit-family")]
    [InlineData("alias-family")]
    [InlineData("duplicate-unit")]
    [InlineData("duplicate-release")]
    [InlineData("duplicate-food")]
    [InlineData("missing-label")]
    [InlineData("unreviewed-alias")]
    [InlineData("broad-alias")]
    [InlineData("unknown-field")]
    [InlineData("missing-mapping")]
    public async Task DictionaryRejectsUnsupportedFactsBeforeDestinationAccess(string corruption)
    {
        var value = Dictionary();
        var food = value["releases"]![0]!["foods"]![0]!;
        switch (corruption)
        {
            case "placeholder": Set("food-dictionary", new JsonArray()); break;
            case "unit-factor": value["units"]![0]!["factor"]!["n"] = "240"; break;
            case "unit-family": value["units"]![0]!["family"] = "volume"; break;
            case "alias-family": value["units"]![0]!["aliases"]![1]!["text"] = "c. à thé"; break;
            case "duplicate-unit": value["units"]!.AsArray().Add(value["units"]![0]!.DeepClone()); break;
            case "duplicate-release": value["releases"]!.AsArray().Add(value["releases"]![0]!.DeepClone()); break;
            case "duplicate-food": value["releases"]![0]!["foods"]!.AsArray().Add(food.DeepClone()); break;
            case "missing-label": food["labels"]!.AsObject().Remove("fr"); break;
            case "unreviewed-alias": food["aliases"]![0]!["reviewedAt"] = null; break;
            case "broad-alias": food["aliases"]![0]!["relation"] = "broader"; break;
            case "unknown-field": food["globalHumanOverride"] = true; break;
            case "missing-mapping": value.AsObject().Remove("mappings"); break;
        }
        if (corruption != "placeholder") Set("food-dictionary", value);
        Set("household-food-overrides", Overrides());
        await AssertRejectedAsync("food-dictionary");
    }

    [Theory]
    [InlineData("placeholder")]
    [InlineData("foreign-household")]
    [InlineData("missing-food")]
    [InlineData("missing-release")]
    [InlineData("mixed-target")]
    [InlineData("missing-protection")]
    [InlineData("duplicate-target")]
    [InlineData("unknown-field")]
    public async Task OverridesRequireDeclaredScopeTargetsAndProtection(string corruption)
    {
        var value = Overrides(); var row = value["overrides"]![0]!;
        switch (corruption)
        {
            case "placeholder": Set("household-food-overrides", new JsonArray()); break;
            case "foreign-household": value["householdId"] = Guid.NewGuid(); break;
            case "missing-food": row["foodId"] = Guid.NewGuid(); break;
            case "missing-release": row["dictionaryRevision"] = "not-in-archive"; break;
            case "mixed-target": row["fallbackKey"] = "flour"; break;
            case "missing-protection": row.AsObject().Remove("protectedFields"); break;
            case "duplicate-target": var duplicate = row.DeepClone(); duplicate["id"] = Guid.NewGuid(); value["overrides"]!.AsArray().Add(duplicate); break;
            case "unknown-field": row["voterIds"] = new JsonArray(); break;
        }
        if (corruption != "placeholder") Set("household-food-overrides", value);
        Set("food-dictionary", Dictionary());
        await AssertRejectedAsync("household-food-overrides");
    }

    private async Task AssertRejectedAsync(string kind)
    {
        _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var disk = DiskHashes();
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().DisposeAsync();
        var error = await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => service.InspectCurrentRecoveryAsync(_root, _household, Schema, []));
        Assert.Contains(error.Diagnostics, x => x.Path == kind + ".json");
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ReusedFoodRevisionComparesFactsRatherThanObjectKeyOrder(bool divergent)
    {
        var dictionary = Dictionary();
        dictionary["releases"]![0]!["foods"]![0]!["qualifiers"]!["salt"] = "unsalted";
        var release = dictionary["releases"]![0]!.DeepClone();
        release["revision"] = "later-dictionary-release";
        release["foods"]![0]!["qualifiers"] = new JsonObject { ["salt"] = "unsalted", ["form"] = "dry" };
        if (divergent) release["foods"]![0]!["labels"]!["en"] = "Different saved facts under the same food revision";
        dictionary["releases"]!.AsArray().Add(release);
        Set("food-dictionary", dictionary); Set("household-food-overrides", Overrides());
        if (divergent) { await AssertRejectedAsync("food-dictionary"); return; }
        _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var inventory = await InspectAsync();
        var stage = CurrentRecoveryHouseholdState.Stage(inventory, await CurrentRecoveryRecipes.StageAsync(inventory));
        Assert.Equal(2, stage.ReadDictionary().Releases.Length);
    }

    [Theory]
    [InlineData("unit-null")]
    [InlineData("unit-alias-null")]
    [InlineData("release-null")]
    [InlineData("food-null")]
    [InlineData("labels-null")]
    [InlineData("qualifiers-null")]
    [InlineData("alias-null")]
    [InlineData("mapping-null")]
    [InlineData("invalid-rational")]
    [InlineData("alias-collision")]
    [InlineData("purchase-change")]
    public async Task MalformedNestedDefinitionsAndPurchaseIdentityChangesReject(string corruption)
    {
        var dictionary = Dictionary();
        var foods = dictionary["releases"]![0]!["foods"]!.AsArray();
        switch (corruption)
        {
            case "unit-null": dictionary["units"]![0] = null; break;
            case "unit-alias-null": dictionary["units"]![0]!["aliases"]![0] = null; break;
            case "release-null": dictionary["releases"]![0] = null; break;
            case "food-null": foods[0] = null; break;
            case "labels-null": foods[0]!["labels"] = null; break;
            case "qualifiers-null": foods[0]!["qualifiers"] = null; break;
            case "alias-null": foods[0]!["aliases"]![0] = null; break;
            case "mapping-null": dictionary["mappings"]!.AsArray().Add((JsonNode?)null); break;
            case "invalid-rational": dictionary["units"]![0]!["factor"]!["d"] = "0"; break;
            case "alias-collision": var food = foods[0]!.DeepClone(); food["id"] = Guid.NewGuid(); food["qualifiers"]!["form"] = "wet"; foods.Add(food); break;
            case "purchase-change": var release = dictionary["releases"]![0]!.DeepClone(); release["revision"] = "later";
                release["foods"]![0]!["revision"] = "new-food-revision"; release["foods"]![0]!["qualifiers"]!["form"] = "wet";
                dictionary["releases"]!.AsArray().Add(release); break;
        }
        Set("food-dictionary", dictionary); Set("household-food-overrides", Overrides());
        await AssertRejectedAsync("food-dictionary");
    }

    [Fact]
    public async Task MetricAndSpecificCountDefinitionsRemainIndependentAndMissingTranslationStaysNull()
    {
        var dictionary = Dictionary();
        foreach (var unit in new[]
        {
            new { id = "mass:kg", family = "mass", factor = new { n = "1000", d = "1" }, countKind = (string?)null, aliases = new[] { new { locale = "en", text = "kg" } } },
            new { id = "volume:ml", family = "volume", factor = new { n = "1", d = "1" }, countKind = (string?)null, aliases = new[] { new { locale = "fr", text = "ml" } } },
            new { id = "count:clove", family = "count", factor = new { n = "1", d = "1" }, countKind = (string?)"clove", aliases = new[] { new { locale = "en", text = "cloves" } } }
        }) dictionary["units"]!.AsArray().Add(JsonSerializer.SerializeToNode(unit));
        dictionary["releases"]![0]!["foods"]![0]!["labels"]!["en"] = null;
        Set("food-dictionary", dictionary); Set("household-food-overrides", Overrides());
        _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var inventory = await InspectAsync();
        var stage = CurrentRecoveryHouseholdState.Stage(inventory, await CurrentRecoveryRecipes.StageAsync(inventory));
        Assert.Equal(6, stage.ReadDictionary().Units.Length);
        Assert.Equal("clove", stage.ReadDictionary().Units[5].CountKind);
        Assert.Null(stage.ReadDictionary().Releases[0].Foods[0].Labels.En);
        Assert.Equal("Farine", stage.ReadDictionary().Releases[0].Foods[0].Labels.Fr);
    }
}
