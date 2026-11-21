using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CurrentRecoveryDispatchTests : CurrentRecoveryTestSet
{
    private static readonly Guid Dispatch = Guid.Parse("61000000-0000-0000-0000-000000000001");
    private static readonly Guid Child = Guid.Parse("61000000-0000-0000-0000-000000000002");

    private static string Normalize(JsonNode? node)
    {
        using var document = JsonDocument.Parse(node?.ToJsonString() ?? "null");
        object? Sort(JsonElement value) => value.ValueKind switch
        {
            JsonValueKind.Object => value.EnumerateObject().OrderBy(x => x.Name, StringComparer.Ordinal)
                .ToDictionary(x => x.Name, x => Sort(x.Value)),
            JsonValueKind.Array => value.EnumerateArray().Select(Sort).ToArray(),
            _ => value.Clone()
        };
        return JsonSerializer.Serialize(Sort(document.RootElement));
    }

    // Independent persisted-wire fixture: do not call the capture/validation owner
    // to manufacture its own oracle. Original schedules differ from retry facts.
    private static string Capture(JsonNode workflow)
    {
        var tasks = new JsonObject();
        foreach (var task in workflow["tasks"]!.AsArray())
            tasks[JsonSerializer.Deserialize<Guid>(task!["taskId"]!.ToJsonString()).ToString("D")] = new JsonObject
            {
                ["name"] = task["taskName"]!.DeepClone(), ["processor"] = task["processorName"]!.DeepClone(),
                ["payload"] = Normalize(task["payload"]), ["dependsOn"] = task["dependsOn"]!.DeepClone(),
                ["scheduledAt"] = null
            };
        var launch = new JsonObject
        {
            ["version"] = 1, ["kind"] = "dispatch", ["instanceId"] = workflow["id"]!.DeepClone(),
            ["workflowId"] = workflow["workflowId"]!.DeepClone(), ["parameters"] = workflow["parameters"]!.DeepClone(), ["tasks"] = tasks
        };
        launch["inputHash"] = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(Normalize(launch))));
        return launch.ToJsonString();
    }

    private JsonNode Facts()
    {
        var value = CurrentRecoveryHouseholdTestData.Obligations(_recipe);
        var parent = value["workflows"]![0]!;
        var child = parent.DeepClone(); child["id"] = Child; child["workflowId"] = "child-maintenance";
        child["parameters"] = new JsonObject { ["private"] = "original" };
        child["tasks"]![0]!["taskId"] = Child; child["tasks"]![0]!["instanceId"] = Child;
        child["tasks"]![0]!["processorName"] = "UnknownExtension";
        child["tasks"]![0]!["payload"] = new JsonObject { ["opaque"] = "original bytes" };
        child["recipePublicationCapture"] = Capture(child);
        var task = parent["tasks"]![0]!.DeepClone();
        task["taskId"] = Dispatch; task["taskName"] = "dispatch"; task["processorName"] = "StartWorkflow";
        task["payload"] = new JsonObject { ["workflowId"] = "child-maintenance", ["parameters"] = child["parameters"]!.DeepClone() };
        task["status"] = 3;
        task["result"] = new JsonObject { ["workflowId"] = "child-maintenance", ["instanceId"] = Child, ["scheduledAt"] = null };
        parent["tasks"]!.AsArray().Add(task); parent["recipePublicationCapture"] = Capture(parent);
        // Completion of dispatch and a later child retry do not complete the child.
        child["tasks"]![0]!["scheduledAt"] = CurrentRecoveryHouseholdTestData.Updated.AddDays(1);
        child["tasks"]![0]!["retryCount"] = 2;
        value["workflows"]!.AsArray().Add(child);
        return value;
    }

    [Theory]
    [InlineData("missing")]
    [InlineData("parameters-and-child")]
    [InlineData("workflow-and-result")]
    [InlineData("version")]
    [InlineData("hash")]
    [InlineData("extension")]
    [InlineData("duplicate")]
    public async Task DivergentDispatchRefusesBeforeDestinationAccess(string corruption)
    {
        var value = Facts(); var parent = value["workflows"]![0]!; var child = value["workflows"]![2]!;
        var task = parent["tasks"]![1]!;
        if (corruption == "missing") parent["recipePublicationCapture"] = null;
        else if (corruption == "parameters-and-child")
        {
            task["payload"]!["parameters"]!["private"] = "changed";
            child["parameters"]!["private"] = "changed";
            // Both mutable link sides agree, but original parent/child captures do not.
        }
        else if (corruption == "workflow-and-result")
        {
            task["payload"]!["workflowId"] = "changed"; task["result"]!["workflowId"] = "changed"; child["workflowId"] = "changed";
        }
        else
        {
            var launch = JsonNode.Parse(parent["recipePublicationCapture"]!.GetValue<string>())!;
            if (corruption == "version") launch["version"] = 99;
            if (corruption == "hash") launch["inputHash"] = new string('A', 64);
            if (corruption == "extension") launch["capture"] = new JsonObject();
            parent["recipePublicationCapture"] = corruption == "duplicate"
                ? launch.ToJsonString().Insert(1, "\"version\":1,") : launch.ToJsonString();
        }
        await Save(value); var disk = DiskHashes();
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().DisposeAsync();
        var error = await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => service.InspectCurrentRecoveryAsync(_root, _household, Schema, []));
        Assert.Contains(error.Diagnostics, x => x.Path == "durable-obligations.json");
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }

    [Fact]
    public async Task FrozenDispatchReadBackRetainsOriginalIntentAndIndependentWork()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        await CheckDispatchAsync(factory.Services);
    }

    internal async Task CheckDispatchAsync(IServiceProvider services)
    {
        var value = Facts(); await Save(value);
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var before = new[] { await db.WorkflowInstances.CountAsync(), await db.WorkflowTasks.CountAsync(), await db.RecipeFilePublications.CountAsync() };
        var disk = DiskHashes();
        var inspection = await scope.ServiceProvider.GetRequiredService<ManagementService>().InspectCurrentRecoveryAsync(_root, _household, Schema, []);
        var facts = inspection.StagedHouseholdState.ReadObligations();
        Assert.True(JsonNode.DeepEquals(value, JsonSerializer.SerializeToNode(facts, Json)));
        Assert.Equal(RecipeApi.Models.TaskStatus.Pending, facts.Workflows[2].Tasks[0].Status);
        Assert.Equal(RecipeImportReportStatus.Reimporting, inspection.StagedHouseholdState.ReadReports()[0].Status);
        Assert.Equal(before, new[] { await db.WorkflowInstances.CountAsync(), await db.WorkflowTasks.CountAsync(), await db.RecipeFilePublications.CountAsync() });
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
        facts.Workflows[0].Parameters!.Clear();
        Assert.NotEmpty(inspection.StagedHouseholdState.ReadObligations().Workflows[0].Parameters!);
    }

    private async Task Save(JsonNode value)
    {
        _files["durable-obligations.json"] = JsonSerializer.SerializeToUtf8Bytes(value);
        _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
    }
}
