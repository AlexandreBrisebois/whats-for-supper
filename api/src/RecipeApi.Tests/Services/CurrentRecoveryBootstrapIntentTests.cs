using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class CurrentRecoveryBootstrapIntentTests : CurrentRecoveryTestSet
{
    private static readonly Guid TaskId = Guid.Parse("62000000-0000-0000-0000-000000000001");
    private static string Normalize(object value)
    {
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(value, JsonDefaults.CamelCase));
        object? Sort(JsonElement item) => item.ValueKind switch
        {
            JsonValueKind.Object => item.EnumerateObject().OrderBy(x => x.Name, StringComparer.Ordinal).ToDictionary(x => x.Name, x => Sort(x.Value)),
            JsonValueKind.Array => item.EnumerateArray().Select(Sort).ToArray(), _ => item.Clone()
        };
        return JsonSerializer.Serialize(Sort(document.RootElement));
    }
    private static string Hash(object value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(Normalize(value))));

    // Construct the persisted wire envelope independently of the production owner.
    private static string Dispatch(JsonNode workflow)
    {
        var task = workflow["tasks"]![0]!;
        var facts = JsonSerializer.SerializeToNode(new
        {
            version = 1, kind = "dispatch", instanceId = workflow["id"], workflowId = workflow["workflowId"],
            parameters = workflow["parameters"], tasks = new Dictionary<Guid, object> { [TaskId] = new
            {
                name = task["taskName"], processor = task["processorName"], payload = "null",
                dependsOn = Array.Empty<string>(), scheduledAt = (DateTimeOffset?)null
            } }
        })!;
        facts["inputHash"] = Hash(facts);
        return facts.ToJsonString();
    }

    private JsonNode Facts(bool initialized = false)
    {
        var value = CurrentRecoveryHouseholdTestData.Obligations(_recipe);
        var workflow = value["workflows"]![0]!;
        workflow["workflowId"] = "url-import"; workflow["status"] = 4;
        workflow["parameters"] = new JsonObject { ["recipeId"] = _recipe.ToString(), ["url"] = "https://example.test/original" };
        var task = workflow["tasks"]![0]!;
        task["taskId"] = TaskId; task["taskName"] = "initialize_url_import";
        task["processorName"] = "UrlCaptureInitialization"; task["payload"] = null; task["status"] = 4;
        workflow["recipePublicationCapture"] = Dispatch(workflow);
        var capture = new RecipePublicationCapture(_recipe, "absent", "absent", "absent", new Dictionary<string, byte[]?>(), 2);
        var candidate = new RecipePublicationCandidate(null,
            new RecipeInfo { Id = _recipe, SourceUrl = "https://example.test/original" },
            SourceFiles: new Dictionary<string, byte[]?>(), SourceKind: "bootstrap",
            BootstrapIntent: workflow["recipePublicationCapture"]!.GetValue<string>());
        var output = new Dictionary<string, byte[]?> { ["recipe.info"] = JsonSerializer.SerializeToUtf8Bytes(candidate.Info, JsonDefaults.CamelCase) };
        value["filePublications"]!.AsArray().Add(JsonSerializer.SerializeToNode(new
        {
            recipeId = _recipe, operationId = CurrentRecoveryHouseholdTestData.Version,
            inputHash = Hash(new { capture, candidate }),
            payload = JsonSerializer.Serialize(new { capture, candidate, output }, JsonDefaults.CamelCase),
            resultHash = new string('B', 64), delivered = initialized, createdAt = CurrentRecoveryHouseholdTestData.Created
        }));
        if (initialized)
        {
            workflow["status"] = 0; task["taskName"] = "extract"; task["processorName"] = "ExtractRecipe"; task["status"] = 1;
            task["payload"] = new JsonObject { ["recipeId"] = _recipe.ToString() };
            var after = new RecipePublicationCapture(_recipe, "bootstrap-content", "bootstrap-source", new string('B', 64), output, 2);
            var launch = JsonSerializer.SerializeToNode(new
            {
                version = 2, capture = after, tasks = new Dictionary<Guid, object> { [TaskId] = new
                {
                    name = "extract", processor = "ExtractRecipe", payload = Normalize(task["payload"]!), dependsOn = Array.Empty<string>()
                } }, workflowId = "url-import", parameters = workflow["parameters"]
            }, JsonDefaults.CamelCase)!;
            launch["inputHash"] = Hash(launch); workflow["recipePublicationCapture"] = launch.ToJsonString();
        }
        return value;
    }

    [Theory]
    [InlineData("missing-workflow")]
    [InlineData("coherent-input-change")]
    [InlineData("missing-current-capture")]
    [InlineData("nested-null-task")]
    [InlineData("nested-unknown-field")]
    [InlineData("nested-duplicate")]
    [InlineData("writer-baseline")]
    [InlineData("writer-files")]
    [InlineData("writer-fingerprint-version")]
    [InlineData("initialized-before-delivery")]
    public async Task SavedBootstrapIntentBindsItsRetainedWorkflowBeforeDestinationAccess(string corruption)
    {
        var value = Facts(corruption.StartsWith("writer-", StringComparison.Ordinal) || corruption == "initialized-before-delivery");
        var workflow = value["workflows"]![0]!;
        if (corruption == "missing-workflow")
        {
            value["workflows"]!.AsArray().RemoveAt(0);
            _files["recipe-import-reports.json"] = "[]"u8.ToArray();
        }
        if (corruption == "coherent-input-change")
        {
            workflow["parameters"]!["url"] = "https://example.test/changed";
            workflow["recipePublicationCapture"] = Dispatch(workflow);
        }
        if (corruption == "missing-current-capture")
        {
            workflow["recipePublicationCapture"] = null; workflow["launchDisposition"] = "invalidated";
        }
        if (corruption.StartsWith("nested-", StringComparison.Ordinal))
        {
            var journal = value["filePublications"]![0]!;
            var payload = JsonNode.Parse(journal["payload"]!.GetValue<string>())!;
            var launch = JsonNode.Parse(payload["candidate"]!["bootstrapIntent"]!.GetValue<string>())!;
            if (corruption == "nested-null-task") launch["tasks"]![TaskId.ToString()] = null;
            if (corruption == "nested-unknown-field") launch["extraAuthority"] = true;
            payload["candidate"]!["bootstrapIntent"] = corruption == "nested-duplicate"
                ? launch.ToJsonString().Insert(1, "\"version\":1,") : launch.ToJsonString();
            journal["payload"] = payload.ToJsonString();
            journal["inputHash"] = Hash(new { capture = payload["capture"], candidate = payload["candidate"] });
        }
        if (corruption.StartsWith("writer-", StringComparison.Ordinal))
        {
            var launch = JsonNode.Parse(workflow["recipePublicationCapture"]!.GetValue<string>())!;
            launch.AsObject().Remove("inputHash");
            if (corruption == "writer-baseline") launch["capture"]!["fieldHash"] = new string('E', 64);
            if (corruption == "writer-files") launch["capture"]!["files"]!["recipe.info"] = Convert.ToBase64String("different retained input"u8);
            if (corruption == "writer-fingerprint-version") launch["capture"]!.AsObject().Remove("fieldHashVersion");
            launch["inputHash"] = Hash(launch); workflow["recipePublicationCapture"] = launch.ToJsonString();
        }
        if (corruption == "initialized-before-delivery") value["filePublications"]![0]!["delivered"] = false;
        await Save(value); var disk = DiskHashes();
        var inventory = await InspectAsync(); var recipes = await CurrentRecoveryRecipes.StageAsync(inventory);
        var error = Assert.Throws<CurrentRecoveryPreflightException>(() => CurrentRecoveryHouseholdState.Stage(inventory, recipes));
        Assert.Contains(error.Diagnostics, x => x.Path == "durable-obligations.json");
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task OriginalBootstrapAndIndependentPendingWorkSurviveFrozenReadBack(bool initialized)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        await CheckAsync(factory.Services, initialized);
    }

    internal async Task CheckAsync(IServiceProvider services, bool initialized)
    {
        var value = Facts(initialized); await Save(value); var disk = DiskHashes();
        using var scope = services.CreateScope();
        var inspection = await scope.ServiceProvider.GetRequiredService<ManagementService>()
            .InspectCurrentRecoveryAsync(_root, _household, Schema, []);
        var facts = inspection.StagedHouseholdState.ReadObligations();
        Assert.True(JsonNode.DeepEquals(value, JsonSerializer.SerializeToNode(facts, Json)));
        Assert.Equal(initialized, facts.FilePublications.Single().Delivered);
        Assert.Equal(initialized ? RecipeApi.Models.TaskStatus.Pending : RecipeApi.Models.TaskStatus.Failed, facts.Workflows[0].Tasks[0].Status);
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
