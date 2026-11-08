using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CurrentRecoveryHouseholdTests : CurrentRecoveryHouseholdTestSet
{
    [Fact]
    public async Task SupportedHouseholdState_RetainsFactsWithoutPublishingOrDispatching()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        await CheckHouseholdStateAsync(factory.Services);
    }

    [Theory]
    [InlineData("family-members", "name", "")]
    [InlineData("family-members", "browseViewMode", "unsupported")]
    [InlineData("family-members", "preferredLanguage", "de")]
    [InlineData("family-members", "cookingViewMode", "unsupported")]
    [InlineData("recipe-import-reports", "note", null)]
    [InlineData("recipe-import-reports", "reportedBy", "00000000-0000-0000-0000-000000000001")]
    [InlineData("recipe-import-reports", "recipeId", "00000000-0000-0000-0000-000000000001")]
    [InlineData("ingredient-categories", "source", "unsupported")]
    [InlineData("ingredient-categories", "grocerySection", "unsupported")]
    [InlineData("calendar-events", "recipeId", "00000000-0000-0000-0000-000000000001")]
    [InlineData("calendar-events", "preparationPlanToken", "")]
    [InlineData("calendar-events", "preparedOn", null)]
    public async Task InvalidHouseholdFacts_RejectBeforeDestinationAccess(string kind, string field, string? value)
    {
        var node = JsonNode.Parse(_files[kind + ".json"])!;
        var row = node[0]!.AsObject();
        if (value is null) row.Remove(field); else row[field] = value;
        Set(kind, node);
        await AssertRejectedBeforeDatabaseAsync(kind);
    }

    [Theory]
    [InlineData("family-members")]
    [InlineData("calendar-events")]
    [InlineData("ingredient-categories")]
    [InlineData("recipe-import-reports")]
    public async Task DuplicateMembership_RejectsCompleteInput(string kind)
    {
        var node = JsonNode.Parse(_files[kind + ".json"])!.AsArray();
        node.Add(node[0]!.DeepClone());
        Set(kind, node);
        await AssertRejectedBeforeDatabaseAsync(kind);
    }

    [Theory]
    [InlineData("grocery-extras", "occurrences", "predecessorId", "20000000-0000-0000-0000-000000000002")]
    [InlineData("grocery-extras", "occurrences", "lineageId", "00000000-0000-0000-0000-000000000000")]
    [InlineData("supper-servings", "days", "overrideServings", 0)]
    [InlineData("supper-servings", "days", "version", "00000000-0000-0000-0000-000000000000")]
    [InlineData("weekly-household-interest", "rows", "positiveCount", 0)]
    [InlineData("weekly-household-interest", "rows", "recipeId", "00000000-0000-0000-0000-000000000001")]
    public async Task InvalidDatedState_RejectsBeforeDestinationAccess(string kind, string collection, string field, object value)
    {
        var node = JsonNode.Parse(_files[kind + ".json"])!;
        node[collection]![0]![field] = JsonSerializer.SerializeToNode(value);
        Set(kind, node);
        await AssertRejectedBeforeDatabaseAsync(kind);
    }

    [Fact]
    public async Task RecipeAttributionRequiresDeclaredMembers_NotLivePlaceholders()
    {
        var info = JsonNode.Parse(_files[_manifest.Recipes[0].Metadata])!;
        info["addedBy"] = Guid.NewGuid();
        _files[_manifest.Recipes[0].Metadata] = JsonSerializer.SerializeToUtf8Bytes(info);
        await AssertRejectedBeforeDatabaseAsync("family-members");
    }

    [Fact]
    public async Task PrivacyAndRequiredEnvelopes_RejectUnknownVoterDataAndPlaceholderArrays()
    {
        var history = JsonNode.Parse(_files["weekly-household-interest.json"])!;
        history["rows"]![0]!["voterIds"] = new JsonArray(CurrentRecoveryHouseholdTestData.Member.ToString());
        Set("weekly-household-interest", history);
        Set("supper-servings", new JsonArray());
        _manifest = _manifest with { Hashes = Hashes() };
        await WriteAsync();
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var error = await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => scope.ServiceProvider.GetRequiredService<ManagementService>()
            .InspectCurrentRecoveryAsync(_root, _household, Schema, []));
        Assert.Contains(error.Diagnostics, x => x.Path == "weekly-household-interest.json");
        Assert.Contains(error.Diagnostics, x => x.Path == "supper-servings.json");
        Assert.DoesNotContain("voterIds", JsonSerializer.Serialize(error.Diagnostics));
        Assert.DoesNotContain("Private report", JsonSerializer.Serialize(error.Diagnostics));
    }

    [Fact]
    public async Task EmptyHouseholdAndLegacyCookedState_PreserveExplicitNullWithoutAllocatingIdentity()
    {
        Set("family-members", new JsonArray());
        Set("family-settings", new JsonArray());
        Set("recipe-import-reports", new JsonArray());
        Set("ingredient-categories", new JsonArray());
        Set("grocery-extras", JsonNode.Parse("{\"version\":1,\"occurrences\":[]}")!);
        Set("supper-servings", JsonNode.Parse("{\"version\":1,\"defaultServings\":null,\"defaultVersion\":null,\"defaultUpdatedAt\":null,\"days\":[]}")!);
        var events = JsonNode.Parse(_files["calendar-events.json"])!;
        foreach (var field in new[] { "preparedOn", "preparedAtUtc", "preparedServings", "preparedOriginalServings", "preparationPlanToken", "preparationServingVersion" })
            events[0]![field] = null;
        Set("calendar-events", events);
        _manifest = _manifest with { Hashes = Hashes() };
        await WriteAsync();
        var inventory = await InspectAsync();
        var stage = CurrentRecoveryHouseholdState.Stage(inventory, await CurrentRecoveryRecipes.StageAsync(inventory));
        Assert.Empty(stage.ReadMembers());
        Assert.Empty(stage.ReadExtras().Occurrences);
        Assert.Null(stage.ReadServings().DefaultVersion);
        Assert.Null(stage.ReadServings().DefaultUpdatedAt);
        Assert.Equal(RecipeApi.Models.CalendarEventStatus.Cooked, stage.ReadCalendar()[0].Status);
        Assert.Null(stage.ReadCalendar()[0].PreparedOn);
        Assert.Null(stage.ReadCalendar()[0].PreparedAtUtc);
    }

    [Theory]
    [InlineData("family-members", "createdAt")]
    [InlineData("family-members", "preferredLanguage")]
    [InlineData("recipe-import-reports", "updatedBy")]
    [InlineData("calendar-events", "candidateIds")]
    [InlineData("ingredient-categories", "updatedAt")]
    public async Task RequiredNullableAndLifecycleFields_DoNotReceiveDefaults(string kind, string field)
    {
        var value = JsonNode.Parse(_files[kind + ".json"])!;
        value[0]!.AsObject().Remove(field);
        Set(kind, value);
        await AssertRejectedBeforeDatabaseAsync(kind);
    }

    [Theory]
    [InlineData("grocery-extras", "occurrences")]
    [InlineData("supper-servings", "days")]
    [InlineData("weekly-household-interest", "rows")]
    public async Task DuplicateDatedMembershipRejects(string kind, string collection)
    {
        var value = JsonNode.Parse(_files[kind + ".json"])!;
        var rows = value[collection]!.AsArray();
        rows.Add(rows[0]!.DeepClone());
        Set(kind, value);
        await AssertRejectedBeforeDatabaseAsync(kind);
    }

    [Fact]
    public async Task ExtraCarryRetainsCompleteLineageAndRejectsCarryAfterCheck()
    {
        var value = JsonNode.Parse(_files["grocery-extras.json"])!;
        var root = value["occurrences"]![0]!;
        root["checked"] = false;
        var successor = root.DeepClone();
        successor["id"] = Guid.NewGuid();
        successor["predecessorId"] = CurrentRecoveryHouseholdTestData.Extra;
        successor["weekStartDate"] = "2026-11-09";
        value["occurrences"]!.AsArray().Add(successor);
        Set("grocery-extras", value);
        _manifest = _manifest with { Hashes = Hashes() };
        await WriteAsync();
        var inventory = await InspectAsync();
        var stage = CurrentRecoveryHouseholdState.Stage(inventory, await CurrentRecoveryRecipes.StageAsync(inventory));
        Assert.Equal(2, stage.ReadExtras().Occurrences.Length);
        Assert.Equal(CurrentRecoveryHouseholdTestData.Extra, stage.ReadExtras().Occurrences[1].PredecessorId);
        root["checked"] = true;
        Set("grocery-extras", value);
        await AssertRejectedBeforeDatabaseAsync("grocery-extras");
    }

    [Fact]
    public async Task IndependentArtifactsStillDiagnoseAfterInvalidRosterAndCancellationIsNotSwallowed()
    {
        Set("family-members", new JsonArray((JsonNode?)null));
        Set("calendar-events", new JsonArray((JsonNode?)null));
        _manifest = _manifest with { Hashes = Hashes() };
        await WriteAsync();
        var inventory = await InspectAsync();
        var recipes = await CurrentRecoveryRecipes.StageAsync(inventory);
        var error = Assert.Throws<CurrentRecoveryPreflightException>(() => CurrentRecoveryHouseholdState.Stage(inventory, recipes));
        Assert.Contains(error.Diagnostics, x => x.Path == "family-members.json");
        Assert.Contains(error.Diagnostics, x => x.Path == "calendar-events.json");
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        Assert.ThrowsAny<OperationCanceledException>(() => CurrentRecoveryHouseholdState.Stage(inventory, recipes, cancellation.Token));
    }

    private void Set(string kind, JsonNode value) => _files[kind + ".json"] = JsonSerializer.SerializeToUtf8Bytes(value);

    private async Task AssertRejectedBeforeDatabaseAsync(string kind)
    {
        _manifest = _manifest with { Hashes = Hashes() };
        await WriteAsync();
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
