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

public sealed class CurrentRecoveryPlannerTests : CurrentRecoveryTestSet
{
    private static readonly Guid SettingId = Guid.Parse("30000000-0000-0000-0000-000000000001");
    private static readonly Guid PlanId = Guid.Parse("30000000-0000-0000-0000-000000000002");
    private const string RowId = "30000000-0000-0000-0000-000000000003";
    private const string Identity = "{\"fallback\":\"pasta\",\"bucket\":\"mass\"}";

    private JsonArray Settings() => JsonSerializer.SerializeToNode(new object[]
    {
        new { id = SettingId, key = "supper_servings_default", value = new { servings = (int?)null, version = CurrentRecoveryHouseholdTestData.Version }, updatedAt = CurrentRecoveryHouseholdTestData.Updated },
        new { id = PlanId, key = "family_goto", value = new { items = new[] { new { recipeId = _recipe, description = "Dinner", imageUrl = (string?)null, status = (string?)null } } }, updatedAt = CurrentRecoveryHouseholdTestData.Updated }
    })!.AsArray();

    private JsonArray Plans() => JsonNode.Parse($$$$"""
        [{"id":"{{{{PlanId}}}}","weekStartDate":"2026-11-02","status":2,
          "votingRoundId":null,"lastClosedRoundId":"{{{{CurrentRecoveryHouseholdTestData.Version}}}}","requiresRoundIdentity":true,
          "notifiedAt":null,"createdAt":"2026-11-01T00:00:00+00:00",
          "groceryListVersion":"18446744073709551615",
          "groceryItems":[{"rowId":"{{{{RowId}}}}","rowVersion":"9007199254740993","weekStartDate":"2026-11-02","source":"recipe",
            "demandIdentity":{{{{JsonSerializer.Serialize(Identity)}}}},"displayName":"Pasta","normalizedKey":"pasta","section":"Pantry",
            "quantity":{"kind":"range","min":{"n":"3","d":"1"},"max":{"n":"4","d":"1"}},"unitText":"cup","recipeIds":["{{{{_recipe}}}}"],"quantityComplete":true}],
          "groceryState":{"{{{{RowId}}}}":true},
          "groceryCheckedDemandBaselines":{"{{{{RowId}}}}":{"quantity":{"kind":"range","min":{"n":"2","d":"1"},"max":{"n":"3","d":"1"}},
            "quantityComplete":true,"unit":"cup","demandIdentity":{{{{JsonSerializer.Serialize(Identity)}}}},"acknowledgedAtRowVersion":"9007199254740992","inputFingerprint":null}},
          "groceryDemandEvidence":{"{{{{RowId}}}}":{"inputFingerprint":"{{{{new string('A', 64)}}}}","members":["observed-membership-is-negative-only"]}},
          "servingInputVersion":"pending-input","servingAppliedVersion":"previous-input","servingRefreshStatus":"updating",
          "servingRefreshWorkflowId":"{{{{CurrentRecoveryHouseholdTestData.Refresh}}}}","groceryResetSummaryVersion":null,"legacyGrocery":null}]
        """)!.AsArray();

    private void Set(string kind, JsonNode value) => _files[kind + ".json"] = JsonSerializer.SerializeToUtf8Bytes(value);

    private JsonArray HistoricalPlans()
    {
        var plans = Plans(); var plan = plans[0]!;
        plan["legacyGrocery"] = new JsonObject
        {
            ["items"] = $$"""[ { "displayName":"Pasta", "normalizedKey":"pasta", "section":"Pantry", "quantity":0.3333333333333333, "unitText":"cup", "recipeIds":["{{_recipe}}"], "quantityComplete":true, "checkReviewReason":"quantity_became_known" } ]""",
            ["state"] = "{ \"Pasta\" : true }",
            ["checkedDemandBaselines"] = "{ }",
            ["demandEvidence"] = "{}"
        };
        plan["groceryItems"] = new JsonArray();
        plan["groceryState"] = new JsonObject();
        plan["groceryCheckedDemandBaselines"] = new JsonObject();
        plan["groceryDemandEvidence"] = new JsonObject();
        return plans;
    }

    [Fact]
    public async Task HistoricalNameChecksRetainExactBytesWithoutBecomingIndependentAcknowledgements()
    {
        var plans = HistoricalPlans();
        Set("weekly-plans", plans);
        _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var inventory = await InspectAsync();
        var stage = CurrentRecoveryHouseholdState.Stage(inventory, await CurrentRecoveryRecipes.StageAsync(inventory));
        Assert.True(JsonNode.DeepEquals(plans, JsonSerializer.SerializeToNode(stage.ReadPlans(), Json)));
        Assert.Empty(stage.ReadPlans()[0].GroceryState);
        Assert.Empty(stage.ReadPlans()[0].GroceryCheckedDemandBaselines);
        Assert.Empty(stage.ReadPlans()[0].GroceryItems);
    }

    [Theory]
    [InlineData("mixed-current")]
    [InlineData("current-id")]
    [InlineData("current-baseline")]
    [InlineData("missing-recipe")]
    [InlineData("individual-voter")]
    [InlineData("duplicate-key")]
    public async Task HistoricalStateCannotBypassCurrentValidationOrInventMembership(string corruption)
    {
        var plans = HistoricalPlans(); var legacy = plans[0]!["legacyGrocery"]!;
        switch (corruption)
        {
            case "mixed-current": plans[0]!["groceryState"]![RowId] = true; break;
            case "current-baseline": legacy["checkedDemandBaselines"] = "{\"unproved\":null}"; break;
            case "duplicate-key": legacy["state"] = "{\"Pasta\":true,\"Pasta\":false}"; break;
            default:
                var rows = JsonNode.Parse(legacy["items"]!.GetValue<string>())!;
                if (corruption == "current-id") rows[0]!["rowId"] = RowId;
                else if (corruption == "missing-recipe") rows[0]!["recipeIds"]![0] = Guid.NewGuid();
                else rows[0]!["voterIds"] = new JsonArray(CurrentRecoveryHouseholdTestData.Member.ToString());
                legacy["items"] = rows.ToJsonString(); break;
        }
        Set("weekly-plans", plans);
        await AssertRejectedAsync("weekly-plans");
    }

    [Fact]
    public async Task PlannerAndSettingsRetainExactAcknowledgementAndUnknownValuesWithoutPublication()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        await CheckPlannerStateAsync(factory.Services);
    }

    // Reused by the real PostgreSQL inspection seam, with a fresh factory scope.
    internal async Task CheckPlannerStateAsync(IServiceProvider services)
    {
        var settings = Settings();
        settings.Add(JsonSerializer.SerializeToNode(new { id = Guid.NewGuid(), key = "private-unknown-setting", value = new { explicitlyCleared = (string?)null, choices = Array.Empty<string>(), original = "  preserve whitespace  " }, updatedAt = CurrentRecoveryHouseholdTestData.Updated }));
        Set("family-settings", settings);
        Set("weekly-plans", Plans());
        _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var disk = DiskHashes();
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var counts = new[] { await db.WeeklyPlans.CountAsync(), await db.FamilySettings.CountAsync(), await db.WorkflowInstances.CountAsync(), await db.GroceryMutationOutcomes.CountAsync() };
        var settingsBefore = JsonSerializer.Serialize(await db.FamilySettings.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync(), Json);
        var plansBefore = JsonSerializer.Serialize(await db.WeeklyPlans.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync(), Json);
        var result = await scope.ServiceProvider.GetRequiredService<ManagementService>().InspectCurrentRecoveryAsync(_root, _household, Schema, []);
        var stage = result.StagedHouseholdState;
        Assert.True(JsonNode.DeepEquals(settings, JsonSerializer.SerializeToNode(stage.ReadSettings(), Json)));
        Assert.True(JsonNode.DeepEquals(Plans(), JsonSerializer.SerializeToNode(stage.ReadPlans(), Json)));
        var plan = Assert.Single(stage.ReadPlans());
        Assert.True(plan.GroceryState[RowId]);
        Assert.Equal("18446744073709551615", plan.GroceryListVersion);
        Assert.Equal("9007199254740993", plan.GroceryItems[0].RowVersion);
        Assert.Equal("2", plan.GroceryCheckedDemandBaselines[RowId]!.Quantity!.Min!.N);
        Assert.Equal("3", plan.GroceryItems[0].Quantity!.Min!.N);
        Assert.Null(stage.ReadServings().DefaultServings);
        Assert.Equal("updating", plan.ServingRefreshStatus);
        Assert.Equal("previous-input", plan.ServingAppliedVersion);
        Assert.Equal(counts, new[] { await db.WeeklyPlans.CountAsync(), await db.FamilySettings.CountAsync(), await db.WorkflowInstances.CountAsync(), await db.GroceryMutationOutcomes.CountAsync() });
        Assert.Equal(settingsBefore, JsonSerializer.Serialize(await db.FamilySettings.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync(), Json));
        Assert.Equal(plansBefore, JsonSerializer.Serialize(await db.WeeklyPlans.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync(), Json));
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
        plan.GroceryState[RowId] = false;
        plan.GroceryCheckedDemandBaselines[RowId] = null;
        plan.GroceryDemandEvidence[RowId].Members[0] = "Caller mutation";
        plan.GroceryItems[0].RecipeIds[0] = Guid.NewGuid();
        await File.WriteAllTextAsync(Path.Combine(_root, "weekly-plans.json"), "changed after inspection");
        var again = stage.ReadPlans()[0];
        Assert.True(again.GroceryState[RowId]);
        Assert.NotNull(again.GroceryCheckedDemandBaselines[RowId]);
        Assert.Equal("observed-membership-is-negative-only", again.GroceryDemandEvidence[RowId].Members[0]);
        Assert.Equal(_recipe, again.GroceryItems[0].RecipeIds[0]);
    }

    [Theory]
    [InlineData("missing")]
    [InlineData("null")]
    [InlineData("incomplete")]
    [InlineData("incomparable")]
    public async Task UnknownAcknowledgementIsNeverReconstructedFromCurrentDemand(string state)
    {
        var plans = Plans();
        var baselines = plans[0]!["groceryCheckedDemandBaselines"]!.AsObject();
        if (state == "missing") baselines.Remove(RowId);
        else if (state == "null") baselines[RowId] = null;
        else if (state == "incomplete") { baselines[RowId]!["quantity"] = null; baselines[RowId]!["quantityComplete"] = false; }
        else { baselines[RowId]!["unit"] = "tbsp"; baselines[RowId]!["demandIdentity"] = "captured-incompatible-identity"; }
        Set("weekly-plans", plans);
        _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var inventory = await InspectAsync();
        var stage = CurrentRecoveryHouseholdState.Stage(inventory, await CurrentRecoveryRecipes.StageAsync(inventory));
        Assert.True(JsonNode.DeepEquals(plans, JsonSerializer.SerializeToNode(stage.ReadPlans(), Json)));
        Assert.True(stage.ReadPlans()[0].GroceryState[RowId]);
    }

    [Fact]
    public async Task ExplicitSavedDefaultDoesNotBecomeRosterCount_AndAbsentSettingDoesNotCreateOne()
    {
        var settings = Settings(); settings[0]!["value"]!["servings"] = 6;
        var serving = JsonNode.Parse(_files["supper-servings.json"])!; serving["defaultServings"] = 6;
        Set("family-settings", settings); Set("supper-servings", serving);
        _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var inventory = await InspectAsync();
        var stage = CurrentRecoveryHouseholdState.Stage(inventory, await CurrentRecoveryRecipes.StageAsync(inventory));
        Assert.Single(stage.ReadMembers());
        Assert.Equal(6, stage.ReadSettings()[0].Value.GetProperty("servings").GetInt32());
        settings.RemoveAt(0); serving["defaultServings"] = null; serving["defaultVersion"] = null; serving["defaultUpdatedAt"] = null;
        Set("family-settings", settings); Set("supper-servings", serving);
        _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        inventory = await InspectAsync();
        stage = CurrentRecoveryHouseholdState.Stage(inventory, await CurrentRecoveryRecipes.StageAsync(inventory));
        Assert.DoesNotContain(stage.ReadSettings(), x => x.Key == "supper_servings_default");
        Assert.Null(stage.ReadServings().DefaultVersion);
    }

    [Theory]
    [InlineData("id")]
    [InlineData("value")]
    [InlineData("updatedAt")]
    [InlineData("default-mismatch")]
    [InlineData("derived-count")]
    [InlineData("duplicate-key")]
    [InlineData("duplicate-id")]
    [InlineData("goto-reference")]
    [InlineData("goto-incomplete")]
    public async Task InvalidSettingsRejectBeforeDestinationAccess(string corruption)
    {
        var settings = Settings();
        switch (corruption)
        {
            case "default-mismatch": settings[0]!["value"]!["version"] = Guid.NewGuid(); break;
            case "derived-count": settings[0]!["value"]!["servings"] = 1; break;
            case "duplicate-key": settings.Add(settings[0]!.DeepClone()); settings[2]!["id"] = Guid.NewGuid(); break;
            case "duplicate-id": settings[1]!["id"] = SettingId; break;
            case "goto-reference": settings[1]!["value"]!["items"]![0]!["recipeId"] = Guid.NewGuid(); break;
            case "goto-incomplete": settings[1]!["value"]!["items"]![0]!.AsObject().Remove("imageUrl"); break;
            default: settings[0]!.AsObject().Remove(corruption); break;
        }
        Set("family-settings", settings);
        await AssertRejectedAsync("family-settings");
    }

    [Theory]
    [InlineData("row-week")]
    [InlineData("row-id")]
    [InlineData("row-version")]
    [InlineData("list-version")]
    [InlineData("quantity")]
    [InlineData("recipe-reference")]
    [InlineData("extra-check")]
    [InlineData("unchecked-baseline")]
    [InlineData("future-baseline")]
    [InlineData("baseline-quantity")]
    [InlineData("evidence")]
    [InlineData("missing-null")]
    [InlineData("duplicate-row")]
    [InlineData("duplicate-week")]
    [InlineData("individual-voters")]
    public async Task InvalidPlannerRejectsBeforeDestinationAccess(string corruption)
    {
        var plans = Plans(); var plan = plans[0]!; var row = plan["groceryItems"]![0]!;
        switch (corruption)
        {
            case "row-week": row["weekStartDate"] = "2026-11-09"; break;
            case "row-id": row["rowId"] = Guid.Empty; break;
            case "row-version": row["rowVersion"] = "09007199254740993"; break;
            case "list-version": plan["groceryListVersion"] = "18446744073709551616"; break;
            case "quantity": row["quantity"]!["min"]!["d"] = "0"; break;
            case "recipe-reference": row["recipeIds"]![0] = Guid.NewGuid(); break;
            case "extra-check": plan["groceryState"]![Guid.NewGuid().ToString()] = true; break;
            case "unchecked-baseline": plan["groceryState"]![RowId] = false; break;
            case "future-baseline": plan["groceryCheckedDemandBaselines"]![RowId]!["acknowledgedAtRowVersion"] = "9007199254740994"; break;
            case "baseline-quantity": plan["groceryCheckedDemandBaselines"]![RowId]!["quantity"]!["min"]!["n"] = "-1"; break;
            case "evidence": plan["groceryDemandEvidence"]![RowId]!["inputFingerprint"] = "not-a-hash"; break;
            case "missing-null": row.AsObject().Remove("unitText"); break;
            case "duplicate-row": plan["groceryItems"]!.AsArray().Add(row.DeepClone()); break;
            case "duplicate-week": plans.Add(plan.DeepClone()); plans[1]!["id"] = Guid.NewGuid(); break;
            case "individual-voters": plan["voterIds"] = new JsonArray(CurrentRecoveryHouseholdTestData.Member.ToString()); break;
        }
        Set("weekly-plans", plans);
        await AssertRejectedAsync("weekly-plans");
    }

    private async Task AssertRejectedAsync(string kind)
    {
        _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var before = DiskHashes();
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().DisposeAsync();
        var error = await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => service.InspectCurrentRecoveryAsync(_root, _household, Schema, []));
        Assert.Contains(error.Diagnostics, x => x.Path == kind + ".json");
        Assert.Equal(before.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }
}
