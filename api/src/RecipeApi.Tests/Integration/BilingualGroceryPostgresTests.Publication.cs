using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class BilingualGroceryPostgresTests
{
    private sealed record SourceLine(string Name, string? Amount = "1", string? Unit = "g", RecipePackageDto? Package = null);

    private static RecipePackageDto Package(string capacity, string basis = "net") =>
        new(new("cans", null), new(LegacyGroceryQuantity.Parse(capacity)!, new("g", null)), basis);

    private static async Task<Recipe> ReadRecipe(TestWebApplicationFactory factory, Guid id)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
    }

    private static async Task<CanonicalRecipeContent> SaveLines(TestWebApplicationFactory factory, Guid id,
        Func<IReadOnlyList<RecipeIngredientLineDto>, IEnumerable<RecipeIngredientLineInput>> change)
    {
        var content = CanonicalRecipeContentStore.Read(await ReadRecipe(factory, id))!;
        using var client = factory.CreateAuthenticatedClient();
        using var response = await client.PatchAsJsonAsync($"/api/recipes/{id}", new
        {
            expectedContentRevision = content.ContentRevision,
            ingredientLines = change(content.IngredientLines).ToArray()
        }, Json);
        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return CanonicalRecipeContentStore.Read(await ReadRecipe(factory, id))!;
    }

    private static RecipeIngredientLineInput Input(RecipeIngredientLineDto line) => new()
    {
        Id = line.Id, Description = line.Description, Amount = line.Amount, AmountText = line.AmountText,
        Unit = line.Unit, Scaling = line.Scaling, Package = line.Package, Shopping = line.Shopping
    };

    // Associations originate in ordinary URL capture/extraction/publication. The
    // following guarded Save exercises supported user quantity/unit/package edits.
    private static async Task<Guid> PublishSource(TestWebApplicationFactory factory, string locale, params SourceLine[] lines)
    {
        using var scope = factory.Services.CreateScope();
        var source = JsonSerializer.Serialize(new
        {
            name = "Reviewed grocery " + locale,
            recipeYield = "4 servings",
            recipeIngredient = lines.Select(line => "1 g " + line.Name),
            supply = lines.Select(line => new { name = line.Name, requiredQuantity = new { value = 1, unitText = "g" } }),
            recipeInstructions = new[] { new { text = "Mix." } }
        });
        var imported = await BilingualShoppingIdentityPostgresTests.ImportAsync(scope.ServiceProvider, locale, source);
        var published = CanonicalRecipeContentStore.Read(await ReadRecipe(factory, imported.Id))!;
        var definitions = FoodVocabularyDefinitions.Read(BoundedVocabularyInput.Bytes());
        Assert.Equal(lines.Select(line => definitions.Resolve(line.Name)?.Food.Id), published.IngredientLines.Select(line => line.Shopping.FoodId));
        var saved = await SaveLines(factory, imported.Id, current => current.Select((line, index) =>
        {
            return Input(line) with
            {
                Amount = lines[index].Amount is { } amount ? LegacyGroceryQuantity.Parse(amount) : null, AmountText = lines[index].Amount,
                Unit = lines[index].Unit is { } unit ? new(unit, null) : null, Package = lines[index].Package
            };
        }));
        var evidence = JsonSerializer.Deserialize<RecipeFoodMappingEvidence>((await ReadRecipe(factory, imported.Id)).FoodMappingEvidence!, Json)!;
        Assert.All(evidence.Mappings, mapping =>
        {
            Assert.Equal(BoundedVocabularyInput.Revision, mapping.VocabularyRevision);
            Assert.Equal(BoundedVocabularyInput.Sha256, mapping.VocabularySha256);
            Assert.Equal(saved.ContentRevision, mapping.Facts.ContentRevision);
        });
        Assert.Contains(imported.Provider.Invocations, invocation => invocation.Method.Name == "GetResponseAsync");
        return imported.Id;
    }

    private static async Task Recompute(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(Monday, default);
    }

    private static List<GroceryLineItemDto> Rows(WeeklyPlan plan) => JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems, Json)!;
    private static Dictionary<string, bool> Checks(WeeklyPlan plan) => JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState, Json)!;

    private static async Task Check(TestWebApplicationFactory factory, GroceryLineItemDto row, bool value = true)
    {
        using var client = factory.CreateAuthenticatedClient();
        var schedule = await GroceryTestRows.ReadAsync(client, Monday);
        using var response = await client.PatchAsJsonAsync($"/api/schedule/0/grocery/item?referenceWeekStartDate={Monday:yyyy-MM-dd}", new
        {
            rowId = row.RowId, weekStartDate = Monday, expectedRowVersion = row.RowVersion,
            expectedPresentationEpoch = schedule.GetProperty("presentationEpoch").GetGuid(),
            @checked = value, clientMutationId = Guid.NewGuid()
        });
        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
    }

    private static async Task<string> VocabularyState(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var active = await services.GetRequiredService<FoodVocabularyStore>().CaptureActiveAsync();
        Assert.Equal(BoundedVocabularyInput.Reference, active!.Reference);
        Assert.Equal(BoundedVocabularyInput.Bytes(), active.RawBytes);
        var directory = Path.Combine(services.GetRequiredService<RecipesRootResolver>().Root, ".household", "food-vocabulary");
        return JsonSerializer.Serialize(new
        {
            membership = (await services.GetRequiredService<RecipeDbContext>().FamilySettings.AsNoTracking()
                .SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText(),
            files = Directory.GetFiles(directory).Order(StringComparer.Ordinal)
                .Select(path => new { name = Path.GetFileName(path), sha256 = FoodVocabularyDefinitions.Sha256(File.ReadAllBytes(path)) })
        }, Json);
    }

    [RecipeImportReportPostgresTests.PostgresTheory]
    [InlineData(false)]
    [InlineData(true)]
    public Task ReviewedPublication_ExactGroupingUnitsPackagesAndFallbackSurviveReversedSources(bool reverse) => WithHousehold(async factory =>
    {
        var sources = new (string Locale, SourceLine[] Lines)[]
        {
            ("en", [new("onions", "0.5", "kg"), new("onion, diced", "2", "ml"), new("onion, sliced", "1", "cup"),
                new("tomato"), new("canned tomatoes", "1", "cans", Package("400")), new("échalote"), new("tomatoes with basil")]),
            ("en", [new("onions", "1", "tsp"), new("onion, diced", "1", "tbsp"), new("onion, sliced", "1", "US cup"),
                new("canned tomatoes", "1", "cans", Package("800"))]),
            ("en", [new("onions", "1", "piece"), new("canned tomatoes", "1", "cans", Package("400", "drained"))]),
            ("fr", [new("oignons", "250"), new("oignon émincé", "3", "ml"), new("tomate", "2"),
                new("tomates en conserve", "2", "cans", Package("400")), new("échalote", "2"), new("tomates séchées", "2")]),
            ("fr", [new("oignons", "2", "tasse"), new("oignon émincé", "2", "c. à thé"),
                new("tomates en conserve", "2", "cans", Package("800"))]),
            ("fr", [new("oignons", "2", "c. à soupe"), new("oignon émincé", "2", "US cup"),
                new("tomates en conserve", "2", "cans", Package("400", "drained"))]),
            ("fr", [new("oignons", "2", "clove")])
        };
        if (reverse) Array.Reverse(sources);
        var ids = new List<Guid>();
        foreach (var source in sources)
        {
            var lines = reverse ? source.Lines.Reverse().ToArray() : source.Lines;
            var id = await PublishSource(factory, source.Locale, lines);
            ids.Add(id);
            await Assign(factory, id, ids.Count - 1);
        }
        var originalRecipes = await Task.WhenAll(ids.Select(id => ReadRecipe(factory, id)));
        var vocabulary = await VocabularyState(factory);
        var before = await Plan(factory);
        var rows = Rows(before);
        Assert.Equal(15, rows.Count);
        GroceryLineItemDto OnionUnit(string unit) => Assert.Single(rows, row => row.FoodId == Onion && row.UnitText == unit);
        Assert.Equal(LegacyGroceryQuantity.Parse("750"), OnionUnit("g").ExactQuantity);
        Assert.Equal(LegacyGroceryQuantity.Parse("5"), OnionUnit("ml").ExactQuantity);
        foreach (var unit in new[] { "cup", "tsp", "tbsp", "US cup" })
            Assert.Equal(LegacyGroceryQuantity.Parse("3"), OnionUnit(unit).ExactQuantity);
        Assert.Equal(LegacyGroceryQuantity.Parse("1"), OnionUnit("piece").ExactQuantity);
        Assert.Equal(LegacyGroceryQuantity.Parse("2"), OnionUnit("clove").ExactQuantity);
        Assert.Equal(LegacyGroceryQuantity.Parse("3"), Assert.Single(rows, row => row.FoodId == BoundedVocabularyInput.Tomato).ExactQuantity);
        var packages = rows.Where(row => row.FoodId == BoundedVocabularyInput.CannedTomato).ToArray();
        Assert.Equal(3, packages.Length);
        Assert.All(packages, row => Assert.Equal(LegacyGroceryQuantity.Parse("3"), row.ExactQuantity));
        var purchases = packages.Select(row => JsonDocument.Parse(row.DemandIdentity).RootElement.GetProperty("package").Deserialize<RecipePackageDto>(Json)!).ToArray();
        Assert.Contains(Package("400"), purchases);
        Assert.Contains(Package("800"), purchases);
        Assert.Contains(Package("400", "drained"), purchases);
        foreach (var fallback in new[] { "échalote", "tomatoes with basil", "tomates séchées" })
            Assert.Single(rows, row => row.FoodId is null && row.NormalizedKey == RecipeApi.Utils.IngredientNormalizer.Normalize(fallback));
        foreach (var row in rows) await Check(factory, row);
        var checkedPlan = await Plan(factory);
        using var en = factory.CreateAuthenticatedClient();
        using var fr = factory.CreateAuthenticatedClient();
        en.DefaultRequestHeaders.AcceptLanguage.ParseAdd("en");
        fr.DefaultRequestHeaders.AcceptLanguage.ParseAdd("fr");
        var responses = await Task.WhenAll(GroceryTestRows.ReadAsync(en, Monday), GroceryTestRows.ReadAsync(fr, Monday));
        foreach (var response in responses)
        {
            var onion = Assert.Single(response.GetProperty("groceryItems").EnumerateArray(), row => row.GetProperty("rowId").GetString() == OnionUnit("g").RowId);
            Assert.Equal("Fresh bulb onion", onion.GetProperty("displayLabels").GetProperty("en").GetString());
            Assert.Equal("Oignon frais", onion.GetProperty("displayLabels").GetProperty("fr").GetString());
            foreach (var name in new[] { "échalote", "tomatoes with basil", "tomates séchées" })
            {
                var fallback = Assert.Single(response.GetProperty("groceryItems").EnumerateArray(), candidate =>
                    (!candidate.TryGetProperty("foodId", out var food) || food.ValueKind == JsonValueKind.Null)
                    && candidate.GetProperty("normalizedKey").GetString() == RecipeApi.Utils.IngredientNormalizer.Normalize(name));
                Assert.Equal(name, fallback.GetProperty("displayLabels").GetProperty("en").GetString());
                Assert.Equal(name, fallback.GetProperty("displayLabels").GetProperty("fr").GetString());
            }
        }
        foreach (var recipe in originalRecipes)
        {
            var afterReads = await ReadRecipe(factory, recipe.Id);
            Assert.Equal((recipe.CanonicalContent, recipe.FoodMappingEvidence, recipe.RawMetadata),
                (afterReads.CanonicalContent, afterReads.FoodMappingEvidence, afterReads.RawMetadata));
            var content = CanonicalRecipeContentStore.Read(recipe)!;
            var reversed = await SaveLines(factory, recipe.Id, current => current.Reverse().Select(Input));
            Assert.Equal(content.IngredientLines.Select(line => line.Shopping).Reverse(), reversed.IngredientLines.Select(line => line.Shopping));
            Assert.Equal(recipe.RawMetadata, (await ReadRecipe(factory, recipe.Id)).RawMetadata);
        }
        await Recompute(factory);
        var after = await Plan(factory);
        Assert.Equal(rows.Select(row => row.RowId).Order(), Rows(after).Select(row => row.RowId).Order());
        foreach (var row in Rows(after))
        {
            var prior = rows.Single(previous => previous.RowId == row.RowId);
            Assert.Equal((prior.DemandIdentity, prior.ExactQuantity, prior.UnitText, prior.QuantityComplete),
                (row.DemandIdentity, row.ExactQuantity, row.UnitText, row.QuantityComplete));
        }
        Assert.Equal(checkedPlan.GroceryState, after.GroceryState);
        Assert.Equal(checkedPlan.GroceryCheckedDemandBaselines, after.GroceryCheckedDemandBaselines);
        Assert.Equal(vocabulary, await VocabularyState(factory));
    }, seedPlans: false);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task ReviewedPublication_PackageClearKeepsUntouched800CheckAndExactBaseline() => WithHousehold(async factory =>
    {
        var smallId = await PublishSource(factory, "en", new SourceLine("canned tomatoes", "3", "cans", Package("400")));
        var largeId = await PublishSource(factory, "fr", new SourceLine("tomates en conserve", "2", "cans", Package("800")));
        await Assign(factory, smallId, 0);
        await Assign(factory, largeId, 1);
        var rows = Rows(await Plan(factory));
        foreach (var row in rows) await Check(factory, row);
        var before = await Plan(factory);
        var small = Assert.Single(rows, row => row.RecipeIds.Contains(smallId));
        var large = Assert.Single(rows, row => row.RecipeIds.Contains(largeId));
        await SaveLines(factory, smallId, current => current.Select(line =>
        {
            return Input(line) with { Package = null };
        }));
        await Recompute(factory);
        var after = await Plan(factory);
        var continued = Assert.Single(Rows(after), row => row.RecipeIds.Contains(largeId));
        var changed = Assert.Single(Rows(after), row => row.RecipeIds.Contains(smallId));
        Assert.Equal(JsonSerializer.Serialize(Rows(before).Single(row => row.RowId == large.RowId), Json), JsonSerializer.Serialize(continued, Json));
        Assert.True(Checks(after)[large.RowId]);
        Assert.Equal(JsonDocument.Parse(before.GroceryCheckedDemandBaselines).RootElement.GetProperty(large.RowId).GetRawText(),
            JsonDocument.Parse(after.GroceryCheckedDemandBaselines).RootElement.GetProperty(large.RowId).GetRawText());
        Assert.NotEqual(small.RowId, changed.RowId);
        Assert.False(Checks(after)[changed.RowId]);
    }, seedPlans: false);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task ReviewedPublication_RangeUnknownAndIncomparableChangesPreserveAcknowledgedBaselineUntilProvenIncrease() => WithHousehold(async factory =>
    {
        var id = await PublishSource(factory, "fr", new SourceLine("oignon émincé", "2–3"));
        await Assign(factory, id, 0);
        var initial = Assert.Single(Rows(await Plan(factory)));
        await Check(factory, initial);
        var acknowledged = (await Plan(factory)).GroceryCheckedDemandBaselines;
        foreach (var (amount, unit) in new (string?, string)[] { ("3–4", "g"), (null, "g"), ("100", "cup"), ("3–4", "g") })
        {
            await SaveLines(factory, id, current => current.Select(line =>
            {
                return Input(line) with { Amount = amount is null ? null : LegacyGroceryQuantity.Parse(amount), AmountText = amount, Unit = new(unit, null) };
            }));
            await Recompute(factory);
            var plan = await Plan(factory);
            Assert.Equal(initial.RowId, Assert.Single(Rows(plan)).RowId);
            Assert.True(Checks(plan)[initial.RowId]);
            Assert.Equal(acknowledged, plan.GroceryCheckedDemandBaselines);
        }
        await SaveLines(factory, id, current => current.Select(line =>
        {
            return Input(line) with { Amount = LegacyGroceryQuantity.Parse("4–5"), AmountText = "4–5" };
        }));
        await Recompute(factory);
        var increased = await Plan(factory);
        Assert.False(Checks(increased)[initial.RowId]);
        Assert.Equal("{}", increased.GroceryCheckedDemandBaselines);
        await Check(factory, Assert.Single(Rows(increased)));
        var rechecked = await Plan(factory);
        await Recompute(factory);
        Assert.Equal(rechecked.GroceryCheckedDemandBaselines, (await Plan(factory)).GroceryCheckedDemandBaselines);
        Assert.True(Checks(await Plan(factory))[initial.RowId]);
    }, seedPlans: false);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task ReviewedPublication_LabelOnlyAndMissingLabelReadsPreserveSavedSourceAndShoppingAuthority() => WithHousehold(async factory =>
    {
        var enId = await PublishSource(factory, "en", new SourceLine("onion, diced"));
        var frId = await PublishSource(factory, "fr", new SourceLine("oignon émincé"));
        await Assign(factory, enId, 0);
        await Assign(factory, frId, 1);
        var row = Assert.Single(Rows(await Plan(factory)));
        await Check(factory, row);
        var before = await Plan(factory);
        var originals = await Task.WhenAll(new[] { enId, frId }.Select(id => ReadRecipe(factory, id)));
        using (var scope = factory.Services.CreateScope())
        {
            var document = JsonNode.Parse(BoundedVocabularyInput.Bytes())!;
            document["revision"] = "test-only-missing-label";
            var release = document["releases"]![0]!.DeepClone();
            release["revision"] = "test-only-missing-label";
            foreach (var food in release["foods"]!.AsArray()) food!["revision"] = food["revision"]!.GetValue<string>() + "-labels";
            release["foods"]![0]!["labels"]!["en"] = "Reviewed onion label";
            release["foods"]![0]!["labels"]!["fr"] = null;
            document["releases"]!.AsArray().Add(release);
            await scope.ServiceProvider.GetRequiredService<FoodVocabularyStore>().PublishReviewedAsync(
                Encoding.UTF8.GetBytes(document.ToJsonString()), BoundedVocabularyInput.Reference, Guid.NewGuid(), "test-only:label-fallback");
        }
        using var first = factory.CreateAuthenticatedClient();
        using var second = factory.CreateAuthenticatedClient();
        var responses = await Task.WhenAll(GroceryTestRows.ReadAsync(first, Monday), GroceryTestRows.ReadAsync(second, Monday));
        foreach (var response in responses)
        {
            var shown = Assert.Single(response.GetProperty("groceryItems").EnumerateArray());
            Assert.Equal("Reviewed onion label", shown.GetProperty("displayLabels").GetProperty("en").GetString());
            var fallback = shown.GetProperty("displayNameVariants").GetProperty("fr").EnumerateArray().Select(x => x.GetProperty("text").GetString()).Order().ToArray();
            Assert.Equal(new[] { "oignon émincé", "onion, diced" }.Order(), fallback);
            Assert.Equal("conflict", shown.GetProperty("labelStatus").GetString());
        }
        await Recompute(factory);
        var after = await Plan(factory);
        Assert.Equal(before.GroceryItems, after.GroceryItems);
        Assert.Equal(before.GroceryState, after.GroceryState);
        Assert.Equal(before.GroceryCheckedDemandBaselines, after.GroceryCheckedDemandBaselines);
        foreach (var original in originals)
        {
            var current = await ReadRecipe(factory, original.Id);
            Assert.Equal((original.CanonicalContent, original.FoodMappingEvidence, original.RawMetadata),
                (current.CanonicalContent, current.FoodMappingEvidence, current.RawMetadata));
        }
    }, seedPlans: false);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public Task ReviewedPublication_SplitMergePrivateNameAndExplicitClearUseExistingMeaningAndCheckPolicy() => WithHousehold(async factory =>
    {
        var enId = await PublishSource(factory, "en", new SourceLine("onion"));
        var frId = await PublishSource(factory, "fr", new SourceLine("oignon"), new SourceLine("tomate"));
        await Assign(factory, enId, 0);
        await Assign(factory, frId, 1);
        var vocabulary = await VocabularyState(factory);
        var initial = Rows(await Plan(factory));
        foreach (var row in initial) await Check(factory, row);
        var tomato = Assert.Single(initial, row => row.FoodId == BoundedVocabularyInput.Tomato);
        var tomatoBaseline = JsonDocument.Parse((await Plan(factory)).GroceryCheckedDemandBaselines).RootElement.GetProperty(tomato.RowId).GetRawText();
        var previous = initial.Where(row => row.FoodId == Onion).Select(row => row.RowId).ToArray();
        foreach (var unit in new[] { "cup", "g" })
        {
            await SaveLines(factory, enId, current => current.Select(line => Input(line) with { Unit = new(unit, null) }));
            await Recompute(factory);
            var plan = await Plan(factory);
            var onion = Rows(plan).Where(row => row.FoodId == Onion).ToArray();
            Assert.Equal(unit == "cup" ? 2 : 1, onion.Length);
            Assert.All(onion, row =>
            {
                Assert.DoesNotContain(row.RowId, previous);
                Assert.False(Checks(plan)[row.RowId]);
            });
            previous = onion.Select(row => row.RowId).ToArray();
        }
        var merged = Assert.Single(Rows(await Plan(factory)), row => row.FoodId == Onion);
        await Check(factory, merged);
        var checkedPlan = await Plan(factory);
        var renamed = await SaveLines(factory, enId, current => current.Select(line =>
            Input(line) with { Shopping = line.Shopping with { Name = "onion, diced" } }));
        Assert.Equal(Onion, renamed.IngredientLines[0].Shopping.FoodId);
        await Recompute(factory);
        var privatePlan = await Plan(factory);
        Assert.Equal(checkedPlan.GroceryState, privatePlan.GroceryState);
        Assert.Equal(checkedPlan.GroceryCheckedDemandBaselines, privatePlan.GroceryCheckedDemandBaselines);
        using var client = factory.CreateAuthenticatedClient();
        var shown = Assert.Single((await GroceryTestRows.ReadAsync(client, Monday)).GetProperty("groceryItems").EnumerateArray(),
            row => row.GetProperty("rowId").GetString() == merged.RowId);
        Assert.Contains("onion, diced", shown.GetProperty("displayLabels").GetProperty("en").GetString(), StringComparison.Ordinal);
        Assert.Contains("onion, diced", shown.GetProperty("displayLabels").GetProperty("fr").GetString(), StringComparison.Ordinal);
        var cleared = await SaveLines(factory, enId, current => current.Select(line =>
            Input(line) with { Shopping = new(line.Shopping.Name, null, null) }));
        await Recompute(factory);
        var afterClear = await Plan(factory);
        Assert.Null(cleared.IngredientLines[0].Shopping.FoodId);
        Assert.DoesNotContain(Rows(afterClear), row => row.RowId == merged.RowId);
        Assert.All(Rows(afterClear).Where(row => row.RowId != tomato.RowId), row => Assert.False(Checks(afterClear)[row.RowId]));
        var saved = await ReadRecipe(factory, enId);
        var decision = Assert.Single(JsonSerializer.Deserialize<RecipeFoodMappingEvidence>(saved.FoodMappingEvidence!, Json)!.NameDecisions);
        Assert.Equal("protected_clear", decision.Kind);
        await Recompute(factory);
        await GroceryTestRows.ReadAsync(client, Monday);
        var after = await Plan(factory);
        Assert.Equal(saved.FoodMappingEvidence, (await ReadRecipe(factory, enId)).FoodMappingEvidence);
        Assert.Equal(saved.CanonicalContent, (await ReadRecipe(factory, enId)).CanonicalContent);
        Assert.True(Checks(after)[tomato.RowId]);
        Assert.Equal(tomatoBaseline, JsonDocument.Parse(after.GroceryCheckedDemandBaselines).RootElement.GetProperty(tomato.RowId).GetRawText());
        Assert.Equal(vocabulary, await VocabularyState(factory));
    }, seedPlans: false);
}
