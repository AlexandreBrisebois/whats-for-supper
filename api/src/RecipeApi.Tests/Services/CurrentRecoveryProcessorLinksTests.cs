using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CurrentRecoveryProcessorLinksTests : CurrentRecoveryTestSet
{
    private static readonly Guid Dispatch = Guid.Parse("60000000-0000-0000-0000-000000000001");
    private static readonly Guid Child = Guid.Parse("60000000-0000-0000-0000-000000000002");

    private JsonNode Facts(string processor = "StartWorkflow")
    {
        var value = CurrentRecoveryHouseholdTestData.Obligations(_recipe);
        var parent = value["workflows"]![0]!;
        // These predecessor fixtures retain historical links, not immutable dispatch
        // authority. New captured dispatch is qualified separately.
        parent["launchDisposition"] = "invalidated";
        var task = parent["tasks"]![0]!.DeepClone();
        task["taskId"] = Dispatch; task["taskName"] = "dispatch"; task["processorName"] = processor;
        task["status"] = 3;
        var child = parent.DeepClone();
        child["launchDisposition"] = "captured";
        child["id"] = Child; child["workflowId"] = "child-maintenance";
        child["parameters"] = new JsonObject { ["private"] = "retained original intent" };
        child["tasks"]![0]!["taskId"] = Child; child["tasks"]![0]!["instanceId"] = Child;
        child["tasks"]![0]!["processorName"] = "RetainedProcessor";
        child["tasks"]![0]!["payload"] = new JsonObject { ["opaque"] = "unaltered" };
        task["payload"] = new JsonObject { ["workflowId"] = "child-maintenance",
            ["parameters"] = child["parameters"]!.DeepClone(), ["schedule"] = null };
        task["result"] = new JsonObject { ["workflowId"] = "child-maintenance", ["instanceId"] = Child, ["scheduledAt"] = null };
        if (processor == "CompleteRecipeImportReport")
        {
            task["payload"] = new JsonObject { ["recipeId"] = _recipe };
            task["result"] = new JsonObject { ["recipeId"] = _recipe, ["workflowInstanceId"] = CurrentRecoveryHouseholdTestData.Version };
        }
        if (processor == "QueueRecipeSearchIndex")
        {
            child["workflowId"] = "index-recipe-search";
            child["parameters"] = new JsonObject { ["recipeId"] = _recipe, ["fingerprint"] = "captured-historical-fingerprint" };
            child["tasks"]![0]!["processorName"] = "IndexRecipeSearch";
            child["tasks"]![0]!["payload"] = child["parameters"]!.DeepClone();
            task["payload"] = new JsonObject { ["recipeId"] = _recipe };
            task["result"] = new JsonObject { ["recipeId"] = _recipe, ["workflowInstanceId"] = Child };
        }
        parent["tasks"]!.AsArray().Add(task);
        value["workflows"]!.AsArray().Add(child);
        return value;
    }

    [Theory]
    [InlineData("missing-child")]
    [InlineData("wrong-child-workflow")]
    [InlineData("wrong-result-workflow")]
    [InlineData("changed-parameters")]
    [InlineData("missing-result")]
    [InlineData("self-child")]
    [InlineData("child-cycle")]
    [InlineData("missing-payload-workflow")]
    [InlineData("null-parameter-value")]
    [InlineData("unexpected-scheduled-result")]
    [InlineData("missing-scheduled-result")]
    [InlineData("invalid-result-id")]
    [InlineData("report-result-recipe")]
    [InlineData("report-result-workflow")]
    [InlineData("report-payload-recipe")]
    [InlineData("search-result-recipe")]
    [InlineData("search-child-recipe")]
    [InlineData("search-child-workflow")]
    [InlineData("search-child-fingerprint")]
    [InlineData("search-result-status")]
    [InlineData("search-child-task-fingerprint")]
    public async Task InvalidProcessorAssociationsRejectBeforeDestinationAccess(string corruption)
    {
        var value = Facts(corruption.StartsWith("report-") ? "CompleteRecipeImportReport"
            : corruption.StartsWith("search-") ? "QueueRecipeSearchIndex" : "StartWorkflow");
        var parent = value["workflows"]![0]!; var child = value["workflows"]![2]!;
        var task = parent["tasks"]![1]!;
        switch (corruption)
        {
            case "missing-child": value["workflows"]!.AsArray().RemoveAt(2); break;
            case "wrong-child-workflow": child["workflowId"] = "unrelated"; break;
            case "wrong-result-workflow": task["result"]!["workflowId"] = "unrelated"; break;
            case "changed-parameters": child["parameters"]!["private"] = "new intent"; break;
            case "missing-result": task["result"] = null; break;
            case "self-child": task["result"]!["instanceId"] = CurrentRecoveryHouseholdTestData.Version; break;
            case "missing-payload-workflow": task["payload"]!.AsObject().Remove("workflowId"); break;
            case "null-parameter-value": task["payload"]!["parameters"]!["private"] = null; break;
            case "unexpected-scheduled-result": task["result"]!["scheduledAt"] = CurrentRecoveryHouseholdTestData.Updated; break;
            case "missing-scheduled-result": task["payload"]!["schedule"] = new JsonObject { ["cron"] = "0 0 * * *" }; break;
            case "invalid-result-id": task["result"]!["instanceId"] = "not-a-uuid"; break;
            case "child-cycle":
                var back = task.DeepClone(); back["taskId"] = Guid.NewGuid(); back["instanceId"] = Child;
                back["payload"]!["workflowId"] = parent["workflowId"]!.DeepClone();
                back["payload"]!["parameters"] = parent["parameters"]!.DeepClone();
                back["result"]!["workflowId"] = parent["workflowId"]!.DeepClone();
                back["result"]!["instanceId"] = CurrentRecoveryHouseholdTestData.Version;
                child["tasks"]!.AsArray().Add(back); break;
            case "report-result-recipe": case "search-result-recipe": task["result"]!["recipeId"] = Guid.NewGuid(); break;
            case "report-result-workflow": task["result"]!["workflowInstanceId"] = Child; break;
            case "report-payload-recipe": task["payload"]!["recipeId"] = Guid.NewGuid(); break;
            case "search-child-recipe": child["parameters"]!["recipeId"] = Guid.NewGuid(); break;
            case "search-child-workflow": child["workflowId"] = "unrelated"; break;
            case "search-child-fingerprint": child["parameters"]!.AsObject().Remove("fingerprint"); break;
            case "search-result-status": task["result"]!["status"] = "InventedSuccess"; break;
            case "search-child-task-fingerprint":
                child["tasks"]![0]!["processorName"] = "IndexRecipeSearch";
                child["tasks"]![0]!["payload"] = new JsonObject { ["recipeId"] = _recipe, ["fingerprint"] = "unrelated" }; break;
        }
        await SaveAsync(value);
        var disk = DiskHashes();
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().DisposeAsync();
        var error = await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => service.InspectCurrentRecoveryAsync(_root, _household, Schema, []));
        Assert.Contains(error.Diagnostics, x => x.Path == "durable-obligations.json");
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }

    [Theory]
    [InlineData("RecipeReady")]
    [InlineData("SyncRecipe")]
    [InlineData("ExtractRecipe")]
    [InlineData("GenerateDescription")]
    [InlineData("SynthesizeRecipe")]
    [InlineData("GenerateHero")]
    [InlineData("FetchUrlContent")]
    [InlineData("ConvertPdf")]
    [InlineData("CategorizeIngredients")]
    [InlineData("CategorizeRecipe")]
    [InlineData("ClassifyRecipeVegetarian")]
    [InlineData("IndexRecipeSearch")]
    public async Task CompletedRecipeTaskCannotClaimAnUnrelatedPayload(string processor)
    {
        var value = Facts("CompleteRecipeImportReport"); var task = value["workflows"]![0]!["tasks"]![1]!;
        // Explicit inert retention allows old writer tasks without launch capture;
        // it does not authorize forged completed associations.
        value["workflows"]![0]!["launchDisposition"] = "invalidated";
        task["processorName"] = processor; task["payload"]!["recipeId"] = Guid.NewGuid(); task["result"] = null;
        await SaveAsync(value);
        var inventory = await InspectAsync();
        var recipes = await CurrentRecoveryRecipes.StageAsync(inventory);
        var error = Assert.Throws<CurrentRecoveryPreflightException>(() => CurrentRecoveryHouseholdState.Stage(inventory, recipes));
        Assert.Contains(error.Diagnostics, x => x.Path == "durable-obligations.json");
    }

    [Theory]
    [InlineData("scheduled")]
    [InlineData("running")]
    [InlineData("disabled")]
    [InlineData("unhealthy")]
    [InlineData("pending")]
    [InlineData("failed-historical")]
    [InlineData("search-skipped")]
    [InlineData("scheduled-retry")]
    public async Task RetainedDispatchOutcomesNeverManufactureCompletionOrExecution(string outcome)
    {
        var value = Facts(outcome == "search-skipped" ? "QueueRecipeSearchIndex" : "StartWorkflow");
        var parent = value["workflows"]![0]!; var task = parent["tasks"]![1]!; var child = value["workflows"]![2]!;
        if (outcome is "scheduled" or "running" or "disabled" or "unhealthy")
        {
            task["payload"]!["workflowId"] = "demo-restore";
            child["workflowId"] = "demo-restore";
            child["parameters"] = new JsonObject { ["automaticDemoReset"] = "true" };
            task["result"] = new JsonObject { ["state"] = outcome,
                ["errorCode"] = outcome == "disabled" ? "DEMO_DISABLED" : outcome == "unhealthy" ? "INVALID_CRON" : null,
                ["instanceId"] = outcome is "scheduled" or "running" ? JsonValue.Create(Child) : null,
                ["scheduledAt"] = outcome == "scheduled" ? JsonValue.Create(CurrentRecoveryHouseholdTestData.Updated) : null };
        }
        if (outcome is "pending" or "failed-historical")
        {
            task["status"] = outcome == "pending" ? 1 : 4; task["result"] = null;
            if (outcome == "failed-historical")
            {
                parent["launchDisposition"] = "historical-inert"; parent["status"] = 3;
                task["payload"] = new JsonArray("original invalid input");
                task["errorMessage"] = "preserved original failure";
            }
        }
        if (outcome == "search-skipped") task["result"] = new JsonObject { ["status"] = "Skipped", ["recipeId"] = _recipe };
        if (outcome == "scheduled-retry")
        {
            task["payload"]!["schedule"] = new JsonObject { ["cron"] = "0 0 * * *" };
            task["result"]!["scheduledAt"] = CurrentRecoveryHouseholdTestData.Updated;
            child["tasks"]![0]!["scheduledAt"] = CurrentRecoveryHouseholdTestData.Updated.AddDays(1);
            child["tasks"]![0]!["retryCount"] = 2;
        }
        await SaveAsync(value);
        var inventory = await InspectAsync();
        var stage = CurrentRecoveryHouseholdState.Stage(inventory, await CurrentRecoveryRecipes.StageAsync(inventory));
        Assert.True(JsonNode.DeepEquals(value, JsonSerializer.SerializeToNode(stage.ReadObligations(), Json)));
        Assert.Equal(RecipeApi.Models.TaskStatus.Pending, stage.ReadObligations().Workflows[2].Tasks[0].Status);
        Assert.Equal(RecipeApi.Models.RecipeImportReportStatus.Reimporting, stage.ReadReports()[0].Status);
    }

    [Theory]
    [InlineData("StartWorkflow")]
    [InlineData("CompleteRecipeImportReport")]
    [InlineData("QueueRecipeSearchIndex")]
    public async Task FrozenProcessorLinksRetainPendingChildAndUnresolvedReport(string processor)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        await CheckProcessorLinksAsync(factory.Services, processor);
    }

    internal async Task CheckProcessorLinksAsync(IServiceProvider services, string processor = "StartWorkflow")
    {
        var value = Facts(processor); await SaveAsync(value);
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        async Task<int[]> Counts() => [await db.WorkflowInstances.CountAsync(), await db.WorkflowTasks.CountAsync(), await db.RecipeImportReports.CountAsync()];
        var before = await Counts(); var disk = DiskHashes();
        var inspection = await scope.ServiceProvider.GetRequiredService<ManagementService>().InspectCurrentRecoveryAsync(_root, _household, Schema, []);
        var stage = inspection.StagedHouseholdState;
        Assert.True(JsonNode.DeepEquals(value, JsonSerializer.SerializeToNode(stage.ReadObligations(), Json)));
        Assert.Equal(RecipeApi.Models.TaskStatus.Pending, stage.ReadObligations().Workflows[2].Tasks[0].Status);
        Assert.Equal(RecipeApi.Models.RecipeImportReportStatus.Reimporting, stage.ReadReports()[0].Status);
        Assert.Equal(before, await Counts());
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
        stage.ReadObligations().Workflows[2].Parameters!.Clear();
        Assert.NotEmpty(stage.ReadObligations().Workflows[2].Parameters!);
    }

    private async Task SaveAsync(JsonNode value)
    {
        _files["durable-obligations.json"] = JsonSerializer.SerializeToUtf8Bytes(value);
        _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
    }
}
