using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

public sealed partial class WorkflowWorkerAuthorityTests
{
    [Theory]
    [InlineData("confirmed")]
    [InlineData("upper-alias")]
    [InlineData("both-aliases")]
    [InlineData("repeated")]
    [InlineData("pending-delivery")]
    [InlineData("unlinked")]
    [InlineData("replay")]
    public Task SyncHistory_RetainsOriginalSiblingAssociation(string mode) => CheckSyncHistoryAsync(Memory(), mode);

    internal static async Task CheckSyncHistoryAsync(Action<DbContextOptionsBuilder> configure, string mode)
    {
        await using var fixture = new Fixture(configure, "SyncRecipe");
        await using var db = fixture.CreateDb();
        var storage = new InMemoryStorageProvider();
        var repository = new RecipeRepository(storage);
        var export = CurrentRecipeExportTests.Example();
        var id = export.RecipeId;
        var replay = mode == "replay";
        db.Recipes.Add(new Recipe { Id = id, Name = "Original", Ingredients = "[]",
            CanonicalContent = replay ? JsonSerializer.Serialize(export.Content, new JsonSerializerOptions(JsonSerializerDefaults.Web)) : null,
            RawMetadata = replay ? export.RawMetadata : null, Servings = replay ? export.Content.Servings : null });
        var parent = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "sync-history", Status = WorkflowStatus.Processing,
            Parameters = JsonSerializer.Serialize(new { recipeId = id.ToString() }), CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        var producer = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = parent.Id, Instance = parent,
            TaskName = "produce", ProcessorName = "GenerateDescription", Status = TaskStatus.Completed, DependsOn = [],
            Payload = JsonSerializer.Serialize(new { recipeId = id }), CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        var payload = mode == "upper-alias" ? new JsonObject { ["RecipeId"] = id }
            : mode == "both-aliases" ? new JsonObject { ["recipeId"] = id, ["RecipeId"] = Guid.NewGuid() }
            : new JsonObject { ["recipeId"] = id };
        if (replay) payload["mode"] = "current-format-replay";
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = parent.Id, Instance = parent,
            TaskName = "sync", ProcessorName = "SyncRecipe", Status = TaskStatus.Pending, DependsOn = replay ? [] : ["produce"],
            Payload = payload.ToJsonString(), CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        if (!replay) db.WorkflowTasks.Add(producer);
        db.WorkflowTasks.Add(task);
        await db.SaveChangesAsync();
        await repository.SaveInfoAsync(new RecipeInfo { Id = id, Name = "Original" }, default);
        await storage.SaveAsync("recipes", $"{id}/recipe.json", replay ? RecipeExportContent.WriteCurrent(export) : "{}");
        var store = TestPublicationStore.Create(db, storage, fixture.Clock);
        await store.CaptureLaunchAsync(parent);
        await db.SaveChangesAsync();
        if (!replay && mode != "unlinked")
            await store.PublishAsync(await store.CaptureForTaskAsync(producer, id),
                new RecipePublicationCandidate("{}", new RecipeInfo { Id = id, Name = "Produced" },
                    "GenerateDescription\n" + Normalize(producer.Payload!)), producer.TaskId);
        if (mode == "pending-delivery")
        {
            var pending = await db.RecipeFilePublications.SingleAsync(); pending.Delivered = false;
            await db.SaveChangesAsync();
        }
        object? returned = null;
        fixture.OnExecute = async executing =>
        {
            await using var producing = fixture.CreateDb();
            var processor = new SyncRecipeProcessor(fixture.Clock, producing, repository,
                new SupperProjectionInvalidation(producing, fixture.Clock, new DeploymentCalendar(new ConfigurationManager())),
                Mock.Of<ISupperProjectionPublisher>(), NullLogger<SyncRecipeProcessor>.Instance, TestPublicationStore.Vocabulary(producing, (repository).StorageProvider, fixture.Clock));
            returned = await processor.ExecuteAsync(executing, default);
            if (mode == "repeated") returned = await processor.ExecuteAsync(executing, default);
        };
        fixture.Result = _ => returned;
        Assert.Equal(1, await fixture.Worker.ProcessPendingTasksAsync(default));
        await using var read = fixture.CreateDb();
        Assert.Equal(mode == "unlinked" ? TaskStatus.Failed : TaskStatus.Completed,
            (await read.WorkflowTasks.SingleAsync(x => x.TaskId == task.TaskId)).Status);
        var attempt = await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync();
        var validate = typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.WorkflowProcessorHistory")!
            .GetMethod("Validate", BindingFlags.Static | BindingFlags.Public)!;
        validate.Invoke(null, [attempt]);
        var original = attempt.Outcome!;
        var originalRequest = attempt.Request;
        if (mode == "unlinked")
        {
            using var failed = JsonDocument.Parse(original);
            Assert.False(failed.RootElement.GetProperty("processorReturned").GetBoolean());
            Assert.Equal(JsonValueKind.Null, failed.RootElement.GetProperty("returnedResult").ValueKind);
            return;
        }
        void Result(JsonNode wire, string result) { wire["returnedResult"] = result; wire["task"]!["result"] = result; }
        void Refuse(Action<JsonNode> change)
        {
            var wire = JsonNode.Parse(original)!; change(wire);
            attempt.Outcome = wire.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
            var error = Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
            Assert.True(error.InnerException is InvalidDataException or JsonException, error.ToString());
            attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        }
        // Intended red: correctly rehashed wrong-recipe receipts used to pass.
        Refuse(wire => Result(wire, JsonSerializer.Serialize(new { message = replay
            ? $"Verified identical current recipe content for {Guid.NewGuid()}."
            : $"Confirmed committed recipe publication for {Guid.NewGuid()}." })));
        Refuse(wire => Result(wire, "{\"message\":null}"));
        Refuse(wire => Result(wire, "{\"message\":42}"));
        Refuse(wire => Result(wire, "{}"));
        var receipt = JsonNode.Parse(JsonNode.Parse(original)!["returnedResult"]!.GetValue<string>())!;
        if (!replay)
        {
            Assert.Equal(3, JsonNode.Parse(original)!["version"]!.GetValue<int>());
            var publications = receipt["publicationConfirmation"]!["publications"]!.AsArray();
            var saved = await read.RecipeFilePublications.AsNoTracking().SingleAsync();
            Assert.True(saved.Delivered);
            Assert.Equal(mode != "pending-delivery", publications[0]!["delivered"]!.GetValue<bool>());
            Assert.Equal(saved.Payload, Assert.Single(publications)!["payload"]!.GetValue<string>());
            Assert.Equal(producer.TaskId, publications[0]!["operationId"]!.GetValue<Guid>());
            void Receipt(Action<JsonNode> change) => Refuse(wire =>
            {
                var changed = receipt.DeepClone(); change(changed); Result(wire, changed.ToJsonString());
            });
            Receipt(x => x.AsObject().Remove("publicationConfirmation"));
            Receipt(x => x["publicationConfirmation"] = null);
            Receipt(x => x["publicationConfirmation"]!["version"] = 2);
            Receipt(x => x["publicationConfirmation"]!.AsObject().Remove("version"));
            Receipt(x => x["publicationConfirmation"]!["publications"] = null);
            Receipt(x => x["publicationConfirmation"]!["publications"] = new JsonArray());
            Receipt(x => x["publicationConfirmation"]!["publications"]![0]!["recipeId"] = Guid.NewGuid());
            Receipt(x => x["publicationConfirmation"]!["publications"]![0]!["operationId"] = task.TaskId);
            Receipt(x => x["publicationConfirmation"]!["publications"]![0]!["resultHash"] = new string('0', 64));
            Receipt(x => x["publicationConfirmation"]!["publications"]!.AsArray().Add(publications[0]!.DeepClone()));
            Receipt(x => x["publicationConfirmation"]!["publications"]![0]!.AsObject().Remove("delivered"));
            Receipt(x => x["publicationConfirmation"]!["publications"]![0]!["delivered"] = null);
            Receipt(x => x["publicationConfirmation"]!["publications"]![0]!["payload"] = null);
            Receipt(x =>
            {
                var publication = x["publicationConfirmation"]!["publications"]![0]!;
                var journal = JsonNode.Parse(publication["payload"]!.GetValue<string>())!;
                journal["candidate"]!["producerInput"] = "DifferentProcessor\n{}";
                publication["payload"] = journal.ToJsonString();
                publication["inputHash"] = HistoryHash(new JsonObject { ["capture"] = journal["capture"]!.DeepClone(),
                    ["candidate"] = journal["candidate"]!.DeepClone() }.ToJsonString());
                Assert.Equal("DifferentProcessor\n{}", typeof(RecipeFilePublicationStore)
                    .GetMethod("ValidateRecoveryJournal", BindingFlags.Static | BindingFlags.NonPublic)!
                    .Invoke(null, [publication.Deserialize<RecipeFilePublication>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!]));
            });
            // Version-2 absence remains an unqualified old receipt; never recapture current siblings.
            var legacy = JsonNode.Parse(original)!; legacy["version"] = 2;
            var legacyReceipt = receipt.DeepClone(); legacyReceipt.AsObject().Remove("publicationConfirmation");
            Result(legacy, legacyReceipt.ToJsonString());
            attempt.Outcome = legacy.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
            validate.Invoke(null, [attempt]);
        }
        else
        {
            Assert.False(receipt.AsObject().ContainsKey("publicationConfirmation"));
            Refuse(wire => { var changed = receipt.DeepClone(); changed["publicationConfirmation"] = null; Result(wire, changed.ToJsonString()); });
        }
        Refuse(wire => Result(wire, receipt.ToJsonString().Replace("\"message\":", "\"message\":null,\"message\":", StringComparison.Ordinal)));
        receipt["futureObservation"] = new JsonObject { ["unknown"] = null };
        var extended = JsonNode.Parse(original)!; Result(extended, receipt.ToJsonString());
        attempt.Outcome = extended.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        validate.Invoke(null, [attempt]);
        // Live graph/publication/files are deliberately changed only in this disposable fixture.
        var live = await read.Recipes.SingleAsync(); live.Name = "New human name";
        var currentParent = await read.WorkflowInstances.SingleAsync(); currentParent.Parameters = "{}";
        if (!replay)
        {
            var currentProducer = await read.WorkflowTasks.SingleAsync(x => x.TaskId == producer.TaskId);
            currentProducer.Payload = "{\"changed\":true}"; currentProducer.Status = TaskStatus.Failed;
        }
        read.RecipeFilePublications.RemoveRange(await read.RecipeFilePublications.ToArrayAsync());
        await read.SaveChangesAsync();
        await storage.SaveAsync("recipes", $"{id}/recipe.json", "new current bytes");
        attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        validate.Invoke(null, [attempt]);
        var changedRequest = JsonNode.Parse(originalRequest)!;
        changedRequest["parameters"] = JsonSerializer.Serialize(new { recipeId = Guid.NewGuid().ToString() });
        attempt.Request = changedRequest.ToJsonString(); attempt.RequestHash = HistoryHash(attempt.Request);
        var changedOutcome = JsonNode.Parse(original)!; changedOutcome["requestHash"] = attempt.RequestHash;
        attempt.Outcome = changedOutcome.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
        attempt.Request = originalRequest; attempt.RequestHash = HistoryHash(originalRequest);
        attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        Assert.Equal(original, (await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync()).Outcome);
    }

    private static string Normalize(string raw)
    {
        var type = typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.CanonicalRecipeContentStore")!;
        return (string)type.GetMethod("NormalizeJson", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [raw])!;
    }
}
