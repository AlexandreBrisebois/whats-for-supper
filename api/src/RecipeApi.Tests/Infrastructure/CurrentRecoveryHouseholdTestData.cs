using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Infrastructure;

internal static class CurrentRecoveryHouseholdTestData
{
    internal static readonly Guid Member = Guid.Parse("20000000-0000-0000-0000-000000000001");
    internal static readonly Guid Extra = Guid.Parse("20000000-0000-0000-0000-000000000002");
    internal static readonly Guid Lineage = Guid.Parse("20000000-0000-0000-0000-000000000003");
    internal static readonly Guid Refresh = Guid.Parse("20000000-0000-0000-0000-000000000005");
    internal static readonly Guid Version = Guid.Parse("20000000-0000-0000-0000-000000000004");
    internal static readonly DateTimeOffset Created = DateTimeOffset.Parse("2026-11-01T00:00:00Z");
    internal static readonly DateTimeOffset Updated = DateTimeOffset.Parse("2026-11-02T00:00:00Z");

    // Independent wire fixtures, not serialization of the decoder's record types.
    internal static Dictionary<string, JsonNode> Example(Guid recipe, Guid household) => new()
    {
        ["durable-obligations"] = Obligations(recipe),
        ["household-food-overrides"] = JsonSerializer.SerializeToNode(new { version = 1, householdId = household, overrides = Array.Empty<object>() })!,
        ["food-dictionary"] = JsonNode.Parse("""{"version":1,"units":[],"releases":[],"mappings":[]}""")!,
        ["family-settings"] = JsonSerializer.SerializeToNode(new[] { new { id = Version, key = "supper_servings_default", value = new { servings = (int?)null, version = Version }, updatedAt = Updated } })!,
        ["family-members"] = JsonSerializer.SerializeToNode(new[] { new { id = Member, name = "Alex", browseViewMode = "stack", preferredLanguage = "fr", cookingViewMode = (string?)null, createdAt = Created, updatedAt = Updated } })!,
        ["recipe-import-reports"] = JsonSerializer.SerializeToNode(new[] { new { recipeId = recipe, reasons = new[] { "ingredients" }, note = "Private report", status = 1, reportedBy = (Guid?)Member, updatedBy = (Guid?)null, createdAt = Created, updatedAt = Updated, lastWorkflowInstanceId = (Guid?)Version, lastAttemptAt = (DateTimeOffset?)Updated, reimportedAt = (string?)null, lastError = (string?)null } })!,
        ["grocery-extras"] = JsonSerializer.SerializeToNode(new { version = 1, occurrences = new[] { new { id = Extra, lineageId = Lineage, predecessorId = (Guid?)null, weekStartDate = "2026-11-02", name = "Coffee", creationName = (string?)"Original coffee", normalizedKey = "coffee", grocerySection = "Beverages", @checked = true, removedAt = (string?)null, version = 3, createdAt = Created, updatedAt = Updated } } })!,
        ["supper-servings"] = JsonSerializer.SerializeToNode(new { version = 1, defaultServings = (int?)null, defaultVersion = (Guid?)Version, defaultUpdatedAt = (DateTimeOffset?)Updated, days = new[] { new { date = "2026-11-06", overrideServings = (int?)null, inheritedServings = (int?)6, version = Version, createdAt = Created, updatedAt = Updated } } })!,
        ["weekly-household-interest"] = JsonSerializer.SerializeToNode(new { version = 1, generation = Version, rows = new[] { new { weekStartDate = "2026-11-02", recipeId = recipe, positiveCount = 2, selected = true, capturedAt = Updated, closeId = Version } } })!,
        ["calendar-events"] = JsonSerializer.SerializeToNode(new[] { new { id = Version, recipeId = (Guid?)recipe, date = "2026-11-06", status = 2, mealSlot = 0, nonCookingKind = (string?)null, nonCookingLabel = (string?)null, preparedOn = (string?)"2026-11-03", preparedAtUtc = (DateTimeOffset?)DateTimeOffset.Parse("2026-11-03T20:00:00Z"), preparedServings = (int?)6, preparedOriginalServings = (int?)4, preparationPlanToken = (string?)"captured-plan", preparationServingVersion = (string?)"captured-portions", voteCount = (int?)2, candidateIds = new[] { recipe } } })!,
        ["ingredient-categories"] = JsonSerializer.SerializeToNode(new[] { new { normalizedKey = "coffee", grocerySection = "Beverages", confidence = 1.0, source = "manual", createdAt = Created, updatedAt = Updated } })!
    };
    internal static JsonNode Obligations(Guid recipe)
    {
        object Workflow(Guid id, string workflowId, object parameters, string processor, object payload) => new
        {
            id, workflowId, status = 1, parameters, launchDisposition = "captured", recipePublicationCapture = (string?)null, createdAt = Created, updatedAt = Updated,
            tasks = new[] { new { taskId = id, instanceId = id, taskName = "work", processorName = processor, payload,
                status = 1, dependsOn = Array.Empty<string>(), retryCount = 0, scheduledAt = (DateTimeOffset?)null,
                errorMessage = (string?)null, stackTrace = (string?)null, result = (object?)null, createdAt = Created, updatedAt = Updated } }
        };
        return JsonSerializer.SerializeToNode(new { version = 1, workflows = new[] {
            Workflow(Version, "import-recipe", new { recipeId = recipe }, "SyncRecipe", new { recipeId = recipe }),
            Workflow(Refresh, "supper-grocery-refresh", new { weekStartDate = "2026-11-02" }, "RefreshSupperGroceries", new { weekStartDate = "2026-11-02" }) },
            groceryMutations = Array.Empty<object>(), canonicalOperations = Array.Empty<object>(), filePublications = Array.Empty<object>(), derivedState = Array.Empty<object>() })!;
    }

}

public class CurrentRecoveryHouseholdTestSet : CurrentRecoveryTestSet
{
    public async Task CheckHouseholdStateAsync(IServiceProvider services)
    {
        await WriteAsync();
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        var beforeDisk = DiskHashes();
        var beforeCounts = new[] { await db.FamilyMembers.CountAsync(),
            await db.CalendarEvents.CountAsync(),
            await db.WorkflowInstances.CountAsync() };
        var inspection = await service.InspectCurrentRecoveryAsync(_root, _household, Schema, []);
        var household = inspection.StagedHouseholdState;
        Assert.Equal("missing-captured-membership", Assert.Single(inspection.Recipes).Assessment.Reason);
        var values = new Dictionary<string, object>
        {
            ["family-settings"] = household.ReadSettings(),
            ["family-members"] = household.ReadMembers(), ["recipe-import-reports"] = household.ReadReports(),
            ["grocery-extras"] = household.ReadExtras(), ["supper-servings"] = household.ReadServings(),
            ["weekly-household-interest"] = household.ReadInterest(), ["calendar-events"] = household.ReadCalendar(),
            ["ingredient-categories"] = household.ReadCategories()
        };
        foreach (var (kind, value) in values)
            Assert.True(JsonNode.DeepEquals(JsonNode.Parse(_files[kind + ".json"]), JsonSerializer.SerializeToNode(value, Json)), kind);
        var report = Assert.Single(household.ReadReports());
        Assert.Equal(RecipeImportReportStatus.Reimporting, report.Status);
        Assert.Equal(CurrentRecoveryHouseholdTestData.Version, report.LastWorkflowInstanceId);
        var prepared = Assert.Single(household.ReadCalendar());
        Assert.Equal(new DateOnly(2026, 11, 6), prepared.Date);
        Assert.Equal(new DateOnly(2026, 11, 3), prepared.PreparedOn);
        Assert.Equal(6, prepared.PreparedServings);
        Assert.Equal(4, prepared.PreparedOriginalServings);
        Assert.Null(household.ReadServings().DefaultServings);
        Assert.Equal("Original coffee", Assert.Single(household.ReadExtras().Occurrences).CreationName);
        Assert.Equal(beforeCounts, new[] { await db.FamilyMembers.CountAsync(),
            await db.CalendarEvents.CountAsync(),
            await db.WorkflowInstances.CountAsync() });
        Assert.Equal(beforeDisk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));

        // Returned collections and later disk changes never mutate the frozen stage.
        household.ReadReports()[0].Reasons[0] = "duplicate";
        household.ReadMembers()[0] = household.ReadMembers()[0] with { Name = "Caller mutation" };
        household.ReadExtras().Occurrences[0] = household.ReadExtras().Occurrences[0] with { Name = "Caller mutation" };
        household.ReadCalendar()[0].CandidateIds![0] = Guid.NewGuid();
        foreach (var kind in values.Keys) await File.WriteAllTextAsync(Path.Combine(_root, kind + ".json"), "changed after inspection");
        Assert.Equal("ingredients", household.ReadReports()[0].Reasons[0]);
        Assert.Equal("Alex", household.ReadMembers()[0].Name);
        Assert.Equal("Coffee", household.ReadExtras().Occurrences[0].Name);
        Assert.Equal(_recipe, household.ReadCalendar()[0].CandidateIds![0]);
    }

    public async Task CheckHouseholdRefusalsAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        var before = JsonSerializer.Serialize(await db.FamilyMembers.AsNoTracking().ToListAsync(), Json);
        var original = _files["family-members.json"];
        _files["family-members.json"] = "[]"u8.ToArray();
        _manifest = _manifest with { Hashes = Hashes() };
        await WriteAsync();
        var disk = DiskHashes();
        var error = await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => service.InspectCurrentRecoveryAsync(_root, _household, Schema, []));
        Assert.Contains(error.Diagnostics, x => x.Path == "recipe-import-reports.json");
        Assert.Equal(before, JsonSerializer.Serialize(await db.FamilyMembers.AsNoTracking().ToListAsync(), Json));
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
        _files["family-members.json"] = original;
        _manifest = _manifest with { Hashes = Hashes() };
    }
}
