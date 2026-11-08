using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

public sealed partial class WorkflowWorkerAuthorityTests
{
    [Theory]
    [InlineData("indexed")]
    [InlineData("missing")]
    [InlineData("deleted")]
    [InlineData("stale")]
    [InlineData("empty")]
    [InlineData("no-sidecar")]
    [InlineData("no-provider")]
    [InlineData("demo")]
    [InlineData("provider-failure")]
    [InlineData("absent-fingerprint")]
    [InlineData("null-fingerprint")]
    [InlineData("empty-fingerprint")]
    [InlineData("both-aliases")]
    [InlineData("upper-alias")]
    public Task SearchHistory_BindsOriginalInvocationWithoutCertifyingIndexing(string mode) =>
        CheckSearchHistoryAsync(Memory(), mode);

    internal static async Task CheckSearchHistoryAsync(Action<DbContextOptionsBuilder> configure, string mode)
    {
        await using var fixture = new Fixture(configure, "IndexRecipeSearch");
        await using var db = fixture.CreateDb();
        var id = Guid.NewGuid();
        var recipe = new Recipe { Id = id, Name = mode == "empty" ? null : "Original search text",
            Ingredients = "[]", DeletedAt = mode == "deleted" ? fixture.Clock.UtcNow : null };
        if (mode != "missing") db.Recipes.Add(recipe);
        if (mode is not "missing" and not "no-sidecar")
            db.RecipeSearchDocuments.Add(new RecipeSearchDocument { RecipeId = id });
        var fingerprint = mode == "stale" ? "stale-original-selection" : SearchFingerprintService.ComputeSourceFingerprint(recipe);
        var input = new JsonObject { [mode == "upper-alias" ? "RecipeId" : "recipeId"] = id };
        if (mode == "both-aliases") input["RecipeId"] = Guid.NewGuid();
        if (mode != "absent-fingerprint") input["fingerprint"] = mode == "null-fingerprint" ? null : mode == "empty-fingerprint" ? "" : fingerprint;
        var parameters = new JsonObject { ["recipeId"] = id.ToString() };
        if (mode != "absent-fingerprint") parameters["fingerprint"] = input["fingerprint"]?.DeepClone() ?? JsonValue.Create("");
        var parent = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "index-recipe-search", Status = WorkflowStatus.Processing,
            Parameters = parameters.ToJsonString(), CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = parent.Id, Instance = parent,
            TaskName = "index_job", ProcessorName = "IndexRecipeSearch", Status = TaskStatus.Pending, DependsOn = [],
            Payload = input.ToJsonString(), CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        db.WorkflowTasks.Add(task);
        await TestPublicationStore.Create(db, new InMemoryStorageProvider(), fixture.Clock).CaptureLaunchAsync(parent);
        await db.SaveChangesAsync();
        var embedding = new Mock<IEmbeddingProvider>(MockBehavior.Strict);
        var setup = embedding.Setup(x => x.GenerateAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()));
        if (mode == "provider-failure") setup.ThrowsAsync(new InvalidOperationException("synthetic embedding boundary failure"));
        else setup.ReturnsAsync(Enumerable.Repeat(0.01f, 1536).ToArray());
        object? returned = null;
        fixture.OnExecute = async executing =>
        {
            await using var producing = fixture.CreateDb();
            returned = await new SearchIndexWorkflow(fixture.Clock, producing, mode == "no-provider" ? null : embedding.Object,
                demoMode: new DemoModeOptions(new ConfigurationManager { ["DEMO_MODE"] = (mode == "demo").ToString() }))
                .ExecuteAsync(executing, default);
        };
        fixture.Result = _ => returned;
        Assert.Equal(1, await fixture.Worker.ProcessPendingTasksAsync(default));
        await using var read = fixture.CreateDb();
        var failed = mode is "provider-failure" or "upper-alias";
        Assert.Equal(failed ? TaskStatus.Failed : TaskStatus.Completed, (await read.WorkflowTasks.SingleAsync()).Status);
        var skipped = mode is "missing" or "deleted" or "stale" or "empty" or "no-sidecar" or "upper-alias";
        embedding.Verify(x => x.GenerateAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Exactly(skipped || mode is "demo" or "no-provider" ? 0 : 1));
        var sidecar = await read.RecipeSearchDocuments.SingleOrDefaultAsync();
        if (mode is "missing" or "no-sidecar") Assert.Null(sidecar);
        else
        {
            Assert.Equal(skipped ? "pending" : "ready", sidecar!.IndexStatus);
            Assert.Equal(skipped || mode is "demo" or "no-provider" ? "pending" : mode == "provider-failure" ? "failed" : "ready", sidecar.EmbeddingStatus);
            if (!skipped) Assert.Equal(SearchFingerprintService.ComputeSourceFingerprint(recipe), sidecar.SourceFingerprint);
        }
        var attempt = await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync();
        var validate = typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.WorkflowProcessorHistory")!
            .GetMethod("Validate", BindingFlags.Static | BindingFlags.Public)!;
        validate.Invoke(null, [attempt]);
        var original = attempt.Outcome!;
        var originalRequest = attempt.Request;
        // Original invocation validation has no dependency on later source or derived rows.
        var currentRecipe = await read.Recipes.SingleOrDefaultAsync();
        if (currentRecipe is not null) currentRecipe.Name = "Later human content";
        if (sidecar is not null) read.RecipeSearchDocuments.Remove(sidecar);
        var currentParent = await read.WorkflowInstances.SingleAsync();
        currentParent.Parameters = JsonSerializer.Serialize(new { recipeId = Guid.NewGuid(), fingerprint = "later" });
        (await read.WorkflowTasks.SingleAsync()).Payload = "{}";
        await read.SaveChangesAsync();
        validate.Invoke(null, [attempt]);
        if (failed)
        {
            using var outcome = JsonDocument.Parse(original);
            Assert.False(outcome.RootElement.GetProperty("processorReturned").GetBoolean());
            Assert.Equal(JsonValueKind.Null, outcome.RootElement.GetProperty("returnedResult").ValueKind);
            return;
        }
        void Result(JsonNode wire, string result)
        { wire["returnedResult"] = result; wire["task"]!["result"] = result; }
        void Refuse(string result)
        {
            var wire = JsonNode.Parse(original)!; Result(wire, result);
            attempt.Outcome = wire.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
            var error = Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
            Assert.True(error.InnerException is InvalidDataException or JsonException or ArgumentException, error.ToString());
            attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        }
        Refuse(JsonSerializer.Serialize(new { message = $"Indexed recipe {Guid.NewGuid()}" }));
        Refuse(JsonSerializer.Serialize(new { message = $"Indexed recipe {id}." }));
        Refuse("{\"message\":null}"); Refuse("{\"message\":42}"); Refuse("{}"); Refuse("null");
        Refuse($"{{\"message\":\"Indexed recipe {id}\",\"message\":null}}");
        var extended = JsonNode.Parse(original)!;
        var receipt = JsonNode.Parse(extended["returnedResult"]!.GetValue<string>())!;
        receipt["futureObservation"] = new JsonObject { ["observed"] = null };
        Result(extended, receipt.ToJsonString());
        attempt.Outcome = extended.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        validate.Invoke(null, [attempt]);
        void RefuseInput(string payload, string parentParameters)
        {
            var request = JsonNode.Parse(originalRequest)!;
            request["task"]!["payload"] = payload; request["parameters"] = parentParameters;
            attempt.Request = request.ToJsonString(); attempt.RequestHash = HistoryHash(attempt.Request);
            var outcome = JsonNode.Parse(original)!;
            outcome["requestHash"] = attempt.RequestHash; outcome["task"]!["payload"] = payload;
            attempt.Outcome = outcome.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
            Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
            attempt.Request = originalRequest; attempt.RequestHash = HistoryHash(originalRequest);
            attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        }
        RefuseInput(new JsonObject { ["recipeId"] = Guid.NewGuid(), ["fingerprint"] = input["fingerprint"]?.DeepClone() }.ToJsonString(), parameters.ToJsonString());
        RefuseInput(new JsonObject { ["RecipeId"] = id }.ToJsonString(), parameters.ToJsonString());
        RefuseInput("{\"recipeId\":null}", parameters.ToJsonString());
        RefuseInput("{\"recipeId\":42}", parameters.ToJsonString());
        RefuseInput($"{{\"recipeId\":\"{id}\",\"recipeId\":\"{id}\"}}", parameters.ToJsonString());
        var divergent = input.DeepClone(); divergent["fingerprint"] = "different-original-selection";
        RefuseInput(divergent.ToJsonString(), parameters.ToJsonString());
        divergent["fingerprint"] = 42; RefuseInput(divergent.ToJsonString(), parameters.ToJsonString());
        divergent["fingerprint"] = null;
        if (mode is not "null-fingerprint" and not "empty-fingerprint" and not "absent-fingerprint")
            RefuseInput(divergent.ToJsonString(), parameters.ToJsonString());
        divergent.AsObject().Remove("fingerprint");
        if (mode is not "null-fingerprint" and not "empty-fingerprint" and not "absent-fingerprint")
            RefuseInput(divergent.ToJsonString(), parameters.ToJsonString());
        var fingerprintMismatch = parameters.DeepClone(); fingerprintMismatch["fingerprint"] = "different-parent-selection";
        RefuseInput(input.ToJsonString(), fingerprintMismatch.ToJsonString());
        var parentMismatch = parameters.DeepClone(); parentMismatch["recipeId"] = Guid.NewGuid().ToString();
        RefuseInput(input.ToJsonString(), parentMismatch.ToJsonString());
        Assert.Equal(original, (await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync()).Outcome);
    }
}
