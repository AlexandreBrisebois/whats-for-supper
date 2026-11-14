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

public sealed class CurrentRecoveryObligationsTests : CurrentRecoveryTestSet
{
    private const string Row = "50000000-0000-0000-0000-000000000001";
    private const string Mutation = "50000000-0000-0000-0000-000000000002";
    private JsonObject Obligations() => JsonNode.Parse($$$$"""
        {"version":1,"workflows":[
          {"id":"{{{{CurrentRecoveryHouseholdTestData.Version}}}}","workflowId":"import-recipe","status":1,
           "parameters":{"recipeId":"{{{{_recipe}}}}","privateNote":"retained intent"},"launchDisposition":"captured","recipePublicationCapture":null,
           "createdAt":"2026-11-01T00:00:00+00:00","updatedAt":"2026-11-02T00:00:00+00:00",
           "tasks":[{"taskId":"{{{{CurrentRecoveryHouseholdTestData.Version}}}}","instanceId":"{{{{CurrentRecoveryHouseholdTestData.Version}}}}",
             "taskName":"sync","processorName":"SyncRecipe","payload":{"recipeId":"{{{{_recipe}}}}"},"status":1,"dependsOn":[],
             "retryCount":0,"scheduledAt":null,"errorMessage":null,"stackTrace":null,"result":null,
             "createdAt":"2026-11-01T00:00:00+00:00","updatedAt":"2026-11-02T00:00:00+00:00"}]}],
         "groceryMutations":[{"id":"{{{{Mutation}}}}","inputHash":"{{{{new string('A',64)}}}}","weekStartDate":"2026-11-02",
           "outcome":{"updatedAt":"2026-11-02T00:00:00+00:00","weekStartDate":"2026-11-02","listVersion":"9007199254740994",
             "checks":{"{{{{Row}}}}":true},"rows":[{"rowId":"{{{{Row}}}}","rowVersion":"9007199254740993","weekStartDate":"2026-11-02","source":"recipe",
               "demandIdentity":"saved-original-meaning","displayName":"Flour","normalizedKey":"flour","section":"Pantry",
               "quantity":{"kind":"range","min":{"n":"2","d":"1"},"max":{"n":"3","d":"1"}},"unitText":"cup","recipeIds":["{{{{_recipe}}}}"],"quantityComplete":null}],
             "rowId":"{{{{Row}}}}","rowVersion":"9007199254740993","checked":true}}],
         "canonicalOperations":[],"filePublications":[],"derivedState":[]}
        """)!.AsObject();

    private static string Normalize(string raw)
    {
        using var document = JsonDocument.Parse(raw);
        object? Sort(JsonElement e) => e.ValueKind switch
        {
            JsonValueKind.Object => e.EnumerateObject().OrderBy(x => x.Name, StringComparer.Ordinal).ToDictionary(x => x.Name, x => Sort(x.Value)),
            JsonValueKind.Array => e.EnumerateArray().Select(Sort).ToArray(), _ => e.Clone()
        };
        return JsonSerializer.Serialize(Sort(document.RootElement));
    }

    private static string Hash(object value, JsonSerializerOptions? options = null) => Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
        System.Text.Encoding.UTF8.GetBytes(Normalize(JsonSerializer.Serialize(value, options ?? Json)))));

    private static string LaunchHash(JsonNode launch) => Hash(new
    {
        version = launch["version"]!.GetValue<int>(), capture = launch["capture"], tasks = launch["tasks"],
        workflowId = launch["workflowId"], parameters = launch["parameters"]
    });

    private static string LaunchJson(JsonNode workflow, object capture, object tasks)
    {
        var launch = JsonSerializer.SerializeToNode(new { version = 2, capture, tasks,
            workflowId = workflow["workflowId"], parameters = workflow["parameters"] }, Json)!;
        launch["inputHash"] = LaunchHash(launch);
        return launch.ToJsonString();
    }

    private void AddLaunch(JsonObject value)
    {
        var workflow = value["workflows"]![0]!;
        var task = workflow["tasks"]![0]!;
        task["processorName"] = "ExtractRecipe";
        var capture = new RecipePublicationCapture(_recipe, "captured-content", "captured-source", new string('C', 64),
            new Dictionary<string, byte[]?> { ["original/content.html"] = "retained bytes"u8.ToArray() }, 2);
        var tasks = new Dictionary<Guid, object> { [CurrentRecoveryHouseholdTestData.Version] = new
        {
            name = "sync", processor = "ExtractRecipe", payload = Normalize(task["payload"]!.ToJsonString()),
            dependsOn = Array.Empty<string>()
        } };
        workflow["recipePublicationCapture"] = LaunchJson(workflow, capture, tasks);
    }

    private void AddJournal(JsonObject value)
    {
        var capture = new RecipePublicationCapture(_recipe, "absent", "absent", "absent", new Dictionary<string, byte[]?>(), 2);
        var candidate = new RecipePublicationCandidate(null, new RecipeApi.Models.RecipeInfo { Id = _recipe },
            SourceFiles: new Dictionary<string, byte[]?>(), SourceKind: "bootstrap");
        var output = new Dictionary<string, byte[]?> { ["recipe.info"] = JsonSerializer.SerializeToUtf8Bytes(candidate.Info, JsonDefaults.CamelCase) };
        value["filePublications"]!.AsArray().Add(JsonSerializer.SerializeToNode(new
        {
            recipeId = _recipe, operationId = Guid.Parse(Mutation), inputHash = Hash(new { capture, candidate }, JsonDefaults.CamelCase),
            payload = JsonSerializer.Serialize(new { capture, candidate, output }, JsonDefaults.CamelCase), resultHash = new string('B',64),
            delivered = false, createdAt = CurrentRecoveryHouseholdTestData.Created
        }));
    }

    private void AddPublicationChain(JsonObject value)
    {
        var workflow = value["workflows"]![0]!;
        var first = workflow["tasks"]![0]!;
        first["processorName"] = "FetchUrlContent";
        var second = first.DeepClone();
        second["taskId"] = Mutation; second["taskName"] = "extract";
        second["processorName"] = "ExtractRecipe"; second["dependsOn"] = new JsonArray("sync");
        workflow["tasks"]!.AsArray().Add(second);
        var info = new RecipeApi.Models.RecipeInfo { Id = _recipe, Name = "retained name" };
        var capture = new RecipePublicationCapture(_recipe, "launch-content", "launch-source", new string('C', 64),
            new Dictionary<string, byte[]?>
            {
                ["recipe.info"] = JsonSerializer.SerializeToUtf8Bytes(info, JsonDefaults.CamelCase),
                ["original/content.html"] = null, ["recipe.json"] = null
            }, 2);
        var tasks = workflow["tasks"]!.AsArray().ToDictionary(x => x!["taskId"]!.GetValue<string>(), x => new
        {
            name = x!["taskName"]!.GetValue<string>(), processor = x["processorName"]!.GetValue<string>(),
            payload = Normalize(x["payload"]!.ToJsonString()), dependsOn = x["dependsOn"]!.Deserialize<string[]>()!
        });
        workflow["recipePublicationCapture"] = LaunchJson(workflow, capture, tasks);
        var source = new Dictionary<string, byte[]?> { ["original/content.html"] = "saved source bytes"u8.ToArray() };
        var firstCandidate = new RecipePublicationCandidate(null, info,
            "FetchUrlContent\n" + Normalize(first["payload"]!.ToJsonString()), source, SourceKind: "web");
        var firstOutput = new Dictionary<string, byte[]?>(source) { ["recipe.info"] = capture.Files["recipe.info"] };
        var after = new Dictionary<string, byte[]?>(capture.Files);
        foreach (var pair in firstOutput) after[pair.Key] = pair.Value;
        var nextCapture = capture with { FieldHash = new string('B',64), Files = after,
            ContentRevision = "after-source-content", SourceRevision = "after-source" };
        const string content = "{\"recipeIngredient\":[\"flour\"]}";
        var secondCandidate = new RecipePublicationCandidate(content, info,
            "ExtractRecipe\n" + Normalize(second["payload"]!.ToJsonString()));
        var secondOutput = new Dictionary<string, byte[]?> { ["recipe.info"] = capture.Files["recipe.info"],
            ["recipe.json"] = System.Text.Encoding.UTF8.GetBytes(content) };
        void Add(Guid id, RecipePublicationCapture before, RecipePublicationCandidate candidate,
            Dictionary<string, byte[]?> output, string resultHash) => value["filePublications"]!.AsArray().Add(
                JsonSerializer.SerializeToNode(new
                {
                    recipeId = _recipe, operationId = id, inputHash = Hash(new { capture = before, candidate }, JsonDefaults.CamelCase),
                    payload = JsonSerializer.Serialize(new { capture = before, candidate, output }, JsonDefaults.CamelCase),
                    resultHash, delivered = true, createdAt = CurrentRecoveryHouseholdTestData.Created
                }));
        Add(CurrentRecoveryHouseholdTestData.Version, capture, firstCandidate, firstOutput, new string('B',64));
        Add(Guid.Parse(Mutation), nextCapture, secondCandidate, secondOutput, new string('D',64));
    }

    [Theory]
    [InlineData("valid")]
    [InlineData("first-baseline")]
    [InlineData("child-baseline")]
    [InlineData("child-source-bytes")]
    [InlineData("child-fingerprint-version")]
    [InlineData("missing-predecessor")]
    [InlineData("undelivered-predecessor")]
    [InlineData("unrelated-predecessor")]
    public async Task PublicationAncestryMustRetainCapturedPredecessorFacts(string corruption)
    {
        var value = Obligations(); AddPublicationChain(value);
        var publications = value["filePublications"]!.AsArray();
        var target = corruption == "first-baseline" ? publications[0]! : publications[1]!;
        var payload = JsonNode.Parse(target["payload"]!.GetValue<string>())!;
        switch (corruption)
        {
            case "first-baseline": case "child-baseline": payload["capture"]!["fieldHash"] = new string('E',64); break;
            case "child-source-bytes": payload["capture"]!["files"]!["original/content.html"] = Convert.ToBase64String("forged source"u8); break;
            case "child-fingerprint-version": payload["capture"]!.AsObject().Remove("fieldHashVersion"); break;
            case "missing-predecessor": publications.RemoveAt(0); break;
            case "undelivered-predecessor": publications[0]!["delivered"] = false; break;
            case "unrelated-predecessor":
                var workflow = value["workflows"]![0]!;
                workflow["tasks"]![1]!["dependsOn"] = new JsonArray();
                var launch = JsonNode.Parse(workflow["recipePublicationCapture"]!.GetValue<string>())!;
                launch["tasks"]![Mutation]!["dependsOn"] = new JsonArray();
                launch["inputHash"] = LaunchHash(launch);
                workflow["recipePublicationCapture"] = launch.ToJsonString(); break;
        }
        target["payload"] = payload.ToJsonString();
        target["inputHash"] = Hash(new { capture = payload["capture"], candidate = payload["candidate"] }, JsonDefaults.CamelCase);
        Set(value); _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var disk = DiskHashes();
        var inventory = await InspectAsync(); var recipes = await CurrentRecoveryRecipes.StageAsync(inventory);
        if (corruption == "valid")
        {
            var stage = CurrentRecoveryHouseholdState.Stage(inventory, recipes);
            Assert.True(JsonNode.DeepEquals(value, JsonSerializer.SerializeToNode(stage.ReadObligations(), Json)));
            Assert.Equal(RecipeApi.Models.TaskStatus.Pending, stage.ReadObligations().Workflows[0].Tasks[1].Status);
        }
        else
        {
            var error = Assert.Throws<CurrentRecoveryPreflightException>(() => CurrentRecoveryHouseholdState.Stage(inventory, recipes));
            Assert.Contains(error.Diagnostics, x => x.Path == "durable-obligations.json");
        }
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }

    [Theory]
    [InlineData("historical-inert", 2, 3, true)]
    [InlineData("historical-inert", 3, 4, true)]
    [InlineData("invalidated", 1, 1, true)]
    [InlineData("historical-inert", 1, 1, false)]
    [InlineData("captured", 2, 3, false)]
    [InlineData("resume", 2, 3, false)]
    public async Task UncapturedHistoricalWritersRequireExplicitNonExecutingDisposition(
        string disposition, int workflowStatus, int taskStatus, bool accepted)
    {
        var value = Obligations(); var workflow = value["workflows"]![0]!;
        workflow["launchDisposition"] = disposition; workflow["status"] = workflowStatus;
        workflow["tasks"]![0]!["processorName"] = "ExtractRecipe";
        workflow["tasks"]![0]!["status"] = taskStatus;
        Set(value); _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var disk = DiskHashes(); var inventory = await InspectAsync();
        var recipes = await CurrentRecoveryRecipes.StageAsync(inventory);
        if (accepted)
        {
            var stage = CurrentRecoveryHouseholdState.Stage(inventory, recipes);
            Assert.True(JsonNode.DeepEquals(value, JsonSerializer.SerializeToNode(stage.ReadObligations(), Json)));
            Assert.Equal(workflowStatus, (int)stage.ReadObligations().Workflows[0].Status);
            Assert.Null(stage.ReadObligations().Workflows[0].RecipePublicationCapture);
            Assert.Equal("retained intent", stage.ReadObligations().Workflows[0].Parameters!["privateNote"]);
        }
        else
        {
            var error = Assert.Throws<CurrentRecoveryPreflightException>(() => CurrentRecoveryHouseholdState.Stage(inventory, recipes));
            Assert.Contains(error.Diagnostics, x => x.Path == "durable-obligations.json");
        }
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }

    [Theory]
    [InlineData("parameters")]
    [InlineData("workflow")]
    public async Task CapturedRecoveryLaunchRejectsChangedImmutableIntent(string mutation)
    {
        var value = Obligations(); AddLaunch(value);
        var workflow = value["workflows"]![0]!;
        if (mutation == "parameters") workflow["parameters"]!["privateNote"] = "changed after launch";
        else workflow["workflowId"] = "different-definition";
        Set(value); _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var inventory = await InspectAsync(); var recipes = await CurrentRecoveryRecipes.StageAsync(inventory);
        var error = Assert.Throws<CurrentRecoveryPreflightException>(() => CurrentRecoveryHouseholdState.Stage(inventory, recipes));
        Assert.Contains(error.Diagnostics, x => x.Path == "durable-obligations.json");
    }

    [Theory]
    [InlineData("captured", false, false)]
    [InlineData("historical-inert", false, true)]
    [InlineData("invalidated", false, true)]
    [InlineData("invalidated", true, false)]
    public async Task HistoricalLaunchWithoutImmutableParametersRemainsEvidenceOnly(
        string disposition, bool corruptTask, bool accepted)
    {
        var value = Obligations(); AddLaunch(value); var workflow = value["workflows"]![0]!;
        workflow["launchDisposition"] = disposition; workflow["status"] = 2; workflow["tasks"]![0]!["status"] = 3;
        var launch = JsonNode.Parse(workflow["recipePublicationCapture"]!.GetValue<string>())!.AsObject();
        launch.Remove("version"); launch.Remove("workflowId"); launch.Remove("parameters");
        launch["inputHash"] = Hash(new { capture = launch["capture"], tasks = launch["tasks"] });
        workflow["recipePublicationCapture"] = launch.ToJsonString();
        if (corruptTask) workflow["tasks"]![0]!["payload"]!["recipeId"] = Guid.NewGuid();
        Set(value); _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var inventory = await InspectAsync(); var recipes = await CurrentRecoveryRecipes.StageAsync(inventory);
        if (accepted)
        {
            var stage = CurrentRecoveryHouseholdState.Stage(inventory, recipes);
            Assert.True(JsonNode.DeepEquals(value, JsonSerializer.SerializeToNode(stage.ReadObligations(), Json)));
        }
        else
        {
            var error = Assert.Throws<CurrentRecoveryPreflightException>(() => CurrentRecoveryHouseholdState.Stage(inventory, recipes));
            Assert.Contains(error.Diagnostics, x => x.Path == "durable-obligations.json");
        }
    }

    public CurrentRecoveryObligationsTests()
    {
        // The receipt predates this empty current list. Historical replay facts
        // must never be reconstructed from current rows or checks.
        _files["weekly-plans.json"] = JsonSerializer.SerializeToUtf8Bytes(new[] { new
        {
            id = Guid.Parse(Mutation), weekStartDate = "2026-11-02", status = 2, votingRoundId = (Guid?)null,
            lastClosedRoundId = (Guid?)null, requiresRoundIdentity = true, notifiedAt = (string?)null,
            createdAt = CurrentRecoveryHouseholdTestData.Created, groceryListVersion = "18446744073709551615",
            groceryItems = Array.Empty<object>(), groceryState = new Dictionary<string, bool>(),
            groceryCheckedDemandBaselines = new Dictionary<string, object>(), groceryDemandEvidence = new Dictionary<string, object>(),
            servingInputVersion = (string?)null, servingAppliedVersion = (string?)null, servingRefreshStatus = (string?)null,
            servingRefreshWorkflowId = (Guid?)null, groceryResetSummaryVersion = (string?)null, legacyGrocery = (object?)null
        } });
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task FrozenDurableFactsKeepOriginalReceiptAndPendingIntentWithoutPublication(bool publicationChain)
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        await CheckObligationsAsync(factory.Services, publicationChain);
    }

    internal async Task CheckObligationsAsync(IServiceProvider services, bool publicationChain = false)
    {
        var value = Obligations();
        if (publicationChain) AddPublicationChain(value);
        else { AddLaunch(value); AddJournal(value); }
        var content = JsonNode.Parse(_files[_manifest.Recipes[0].Content])!["content"]!.DeepClone();
        value["canonicalOperations"]!.AsArray().Add(new JsonObject
        {
            ["recipeId"] = _recipe, ["operationId"] = Mutation, ["inputHash"] = new string('D',64),
            ["result"] = new JsonObject { ["content"] = content, ["createdIds"] = new JsonObject() },
            ["createdAt"] = CurrentRecoveryHouseholdTestData.Created
        });
        value["derivedState"]!.AsArray().Add(JsonSerializer.SerializeToNode(new
        {
            recipeId = _recipe, documentText = "captured search document", searchMetadata = new { retained = "opaque" },
            embeddingJson = (string?)null, embeddingModel = "synthetic-no-provider", embeddingVersion = (string?)null,
            indexStatus = "pending", embeddingStatus = "failed", embeddingFingerprint = (string?)null,
            lastIndexedAt = (DateTimeOffset?)null, sourceFingerprint = (string?)null, schemaVersion = 1
        }));
        Set(value);
        _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        async Task<int[]> Counts() => [await db.WorkflowInstances.CountAsync(), await db.WorkflowTasks.CountAsync(),
            await db.GroceryMutationOutcomes.CountAsync(), await db.RecipeFilePublications.CountAsync()];
        var before = await Counts(); var disk = DiskHashes();
        var inspection = await scope.ServiceProvider.GetRequiredService<ManagementService>().InspectCurrentRecoveryAsync(_root, _household, Schema, []);
        var stage = inspection.StagedHouseholdState;
        Assert.True(JsonNode.DeepEquals(value, JsonSerializer.SerializeToNode(stage.ReadObligations(), Json)));
        Assert.Empty(stage.ReadPlans()[0].GroceryItems);
        Assert.Equal("9007199254740994", stage.ReadObligations().GroceryMutations[0].Outcome.ListVersion);
        Assert.Equal("9007199254740993", stage.ReadObligations().GroceryMutations[0].Outcome.RowVersion);
        Assert.True(stage.ReadObligations().GroceryMutations[0].Outcome.Checked);
        Assert.Equal(RecipeApi.Models.WorkflowStatus.Processing, stage.ReadObligations().Workflows[0].Status);
        Assert.Equal(before, await Counts());
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
        stage.ReadObligations().Workflows[0].Parameters!["privateNote"] = "caller mutation";
        stage.ReadObligations().GroceryMutations[0].Outcome.Checks[Row] = false;
        await File.WriteAllTextAsync(Path.Combine(_root, "durable-obligations.json"), "later mutation");
        Assert.Equal("retained intent", stage.ReadObligations().Workflows[0].Parameters!["privateNote"]);
        Assert.True(stage.ReadObligations().GroceryMutations[0].Outcome.Checks[Row]);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task TerminalRefreshDispatchCannotCertifyAppliedInputs(bool falselyCurrent)
    {
        var value = Obligations();
        var shared = CurrentRecoveryHouseholdTestData.Obligations(_recipe);
        var refresh = shared["workflows"]![1]!.DeepClone();
        refresh["status"] = 2; refresh["tasks"]![0]!["status"] = 3;
        value["workflows"]!.AsArray().Add(refresh);
        var plans = JsonNode.Parse(_files["weekly-plans.json"])!;
        plans[0]!["servingInputVersion"] = "new-input";
        plans[0]!["servingAppliedVersion"] = "old-input";
        plans[0]!["servingRefreshStatus"] = falselyCurrent ? "current" : "updating";
        plans[0]!["servingRefreshWorkflowId"] = CurrentRecoveryHouseholdTestData.Refresh;
        _files["weekly-plans.json"] = JsonSerializer.SerializeToUtf8Bytes(plans);
        Set(value); _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var inventory = await InspectAsync();
        var recipes = await CurrentRecoveryRecipes.StageAsync(inventory);
        if (falselyCurrent)
        {
            var error = Assert.Throws<CurrentRecoveryPreflightException>(() => CurrentRecoveryHouseholdState.Stage(inventory, recipes));
            Assert.Contains(error.Diagnostics, x => x.Path == "durable-obligations.json");
        }
        else
        {
            var stage = CurrentRecoveryHouseholdState.Stage(inventory, recipes);
            Assert.Equal("updating", stage.ReadPlans()[0].ServingRefreshStatus);
            Assert.Equal("old-input", stage.ReadPlans()[0].ServingAppliedVersion);
            Assert.Equal(RecipeApi.Models.WorkflowStatus.Completed, stage.ReadObligations().Workflows[1].Status);
        }
    }

    [Fact]
    public async Task ExplicitTypedEmptyObligationsRequireNoInventedIdsOrDefaults()
    {
        var value = Obligations();
        value["workflows"] = new JsonArray(); value["groceryMutations"] = new JsonArray();
        _files["recipe-import-reports.json"] = "[]"u8.ToArray();
        Set(value); _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var inventory = await InspectAsync();
        var stage = CurrentRecoveryHouseholdState.Stage(inventory, await CurrentRecoveryRecipes.StageAsync(inventory));
        Assert.True(JsonNode.DeepEquals(value, JsonSerializer.SerializeToNode(stage.ReadObligations(), Json)));
    }

    private void Set(JsonNode value) => _files["durable-obligations.json"] = JsonSerializer.SerializeToUtf8Bytes(value);

    [Theory]
    [InlineData("placeholder")]
    [InlineData("missing-collection")]
    [InlineData("unknown-field")]
    [InlineData("missing-workflow")]
    [InlineData("foreign-recipe")]
    [InlineData("duplicate-workflow")]
    [InlineData("task-owner")]
    [InlineData("task-cycle")]
    [InlineData("task-unknown-dependency")]
    [InlineData("task-negative-retry")]
    [InlineData("task-completed-parent-pending")]
    [InlineData("writer-without-capture")]
    [InlineData("receipt-week")]
    [InlineData("receipt-row-version")]
    [InlineData("receipt-check")]
    [InlineData("receipt-dangling-check")]
    [InlineData("receipt-dangling-recipe")]
    [InlineData("receipt-duplicate")]
    [InlineData("receipt-partial-item")]
    [InlineData("receipt-excessive-version")]
    [InlineData("receipt-unknown-field")]
    [InlineData("receipt-same-list-divergence")]
    [InlineData("receipt-row-newer-than-list")]
    [InlineData("launch-unknown-field")]
    [InlineData("launch-duplicate-key")]
    [InlineData("journal-unknown-field")]
    [InlineData("journal-null-capture")]
    [InlineData("launch-capture-path")]
    [InlineData("journal-capture-path")]
    public async Task InvalidDurableFactsRejectBeforeDestinationAccess(string corruption)
    {
        var value = Obligations(); var workflow = value["workflows"]![0]!; var task = workflow["tasks"]![0]!;
        var mutation = value["groceryMutations"]![0]!; var outcome = mutation["outcome"]!;
        switch (corruption)
        {
            case "placeholder": Set(new JsonArray()); break;
            case "missing-collection": value.Remove("groceryMutations"); break;
            case "unknown-field": value["voterIds"] = new JsonArray(); break;
            case "missing-workflow": value["workflows"] = new JsonArray(); break;
            case "foreign-recipe": workflow["parameters"]!["recipeId"] = Guid.NewGuid(); break;
            case "duplicate-workflow": value["workflows"]!.AsArray().Add(workflow.DeepClone()); break;
            case "task-owner": task["instanceId"] = Guid.NewGuid(); break;
            case "task-cycle": task["dependsOn"] = new JsonArray("sync"); break;
            case "task-unknown-dependency": task["dependsOn"] = new JsonArray("missing"); break;
            case "task-negative-retry": task["retryCount"] = -1; break;
            case "task-completed-parent-pending": workflow["status"] = 2; break;
            case "writer-without-capture": task["processorName"] = "ExtractRecipe"; break;
            case "receipt-same-list-divergence": outcome["listVersion"] = "18446744073709551615"; break;
            case "receipt-row-newer-than-list": outcome["listVersion"] = "2"; break;
            case "launch-capture-path":
                AddLaunch(value);
                var unsafeLaunch = JsonNode.Parse(workflow["recipePublicationCapture"]!.GetValue<string>())!;
                unsafeLaunch["capture"]!["files"]!["../escape"] = null;
                unsafeLaunch["inputHash"] = LaunchHash(unsafeLaunch);
                workflow["recipePublicationCapture"] = unsafeLaunch.ToJsonString(); break;
            case "journal-capture-path":
                AddJournal(value);
                var unsafeJournal = value["filePublications"]![0]!;
                var unsafePayload = JsonNode.Parse(unsafeJournal["payload"]!.GetValue<string>())!;
                unsafePayload["capture"]!["files"]!["../escape"] = null;
                unsafeJournal["inputHash"] = Hash(new { capture = unsafePayload["capture"], candidate = unsafePayload["candidate"] });
                unsafeJournal["payload"] = unsafePayload.ToJsonString(); break;
            case "launch-unknown-field":
            case "launch-duplicate-key":
                AddLaunch(value);
                var launch = JsonNode.Parse(workflow["recipePublicationCapture"]!.GetValue<string>())!;
                launch["unsupportedAuthority"] = true;
                workflow["recipePublicationCapture"] = corruption == "launch-duplicate-key"
                    ? "{\"unsupportedAuthority\":false," + launch.ToJsonString()[1..] : launch.ToJsonString();
                break;
            case "journal-unknown-field":
            case "journal-null-capture":
                AddJournal(value);
                var journal = value["filePublications"]![0]!;
                var payload = JsonNode.Parse(journal["payload"]!.GetValue<string>())!;
                if (corruption == "journal-unknown-field") payload["unsupportedAuthority"] = true;
                else payload["capture"] = null;
                journal["payload"] = payload.ToJsonString();
                break;
            case "receipt-week": outcome["weekStartDate"] = "2026-11-09"; break;
            case "receipt-row-version": outcome["rowVersion"] = "2"; break;
            case "receipt-check": outcome["checked"] = false; break;
            case "receipt-dangling-check": outcome["checks"]![Guid.NewGuid().ToString()] = true; break;
            case "receipt-dangling-recipe": outcome["rows"]![0]!["recipeIds"]![0] = Guid.NewGuid(); break;
            case "receipt-duplicate": value["groceryMutations"]!.AsArray().Add(mutation.DeepClone()); break;
            case "receipt-partial-item": outcome.AsObject().Remove("checked"); break;
            case "receipt-excessive-version": outcome["listVersion"] = "18446744073709551616"; break;
            case "receipt-unknown-field": outcome["rows"]![0]!["voterIds"] = new JsonArray(); break;
        }
        if (corruption != "placeholder") Set(value);
        _manifest = _manifest with { Hashes = Hashes() }; await WriteAsync();
        var disk = DiskHashes();
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ManagementService>();
        await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().DisposeAsync();
        var error = await Assert.ThrowsAsync<CurrentRecoveryPreflightException>(() => service.InspectCurrentRecoveryAsync(_root, _household, Schema, []));
        Assert.Contains(error.Diagnostics, x => x.Path == "durable-obligations.json");
        Assert.Equal(disk.OrderBy(x => x.Key), DiskHashes().OrderBy(x => x.Key));
    }
}
