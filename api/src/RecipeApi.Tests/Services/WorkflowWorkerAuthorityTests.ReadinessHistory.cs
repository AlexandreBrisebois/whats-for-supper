using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
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
    [InlineData("pdf")]
    [InlineData("non-pdf")]
    [InlineData("recovered")]
    [InlineData("already-ready")]
    [InlineData("missing")]
    public Task ReadinessProcessorHistory_BindsReturnedResultToOriginalPublication(string mode) =>
        CheckReadinessProcessorHistoryAsync(Memory(), mode);

    internal static async Task CheckReadinessProcessorHistoryAsync(Action<DbContextOptionsBuilder> configure, string mode)
    {
        await using var fixture = new Fixture(configure, "RecipeReady");
        await using var db = fixture.CreateDb();
        var storage = new InMemoryStorageProvider();
        var repository = new RecipeRepository(storage);
        var id = Guid.NewGuid();
        db.Recipes.Add(new Recipe { Id = id, Name = "Readiness original",
            Notes = "original private", IsReady = mode == "already-ready" });
        var parent = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "readiness-history", Status = WorkflowStatus.Processing,
            Parameters = JsonSerializer.Serialize(new { recipeId = id.ToString() }), CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = parent.Id, Instance = parent,
            TaskName = "ready", ProcessorName = "RecipeReady", Payload = JsonSerializer.Serialize(new { recipeId = id }),
            Status = TaskStatus.Pending, DependsOn = [], CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        db.WorkflowTasks.Add(task);
        await db.SaveChangesAsync();
        await repository.SaveInfoAsync(new RecipeInfo { Id = id, Name = "Readiness original", Notes = "original private" }, default);
        if (mode is "pdf" or "recovered") await storage.SaveAsync("recipes", $"{id}/original/source.pdf", new byte[] { 37, 80, 68, 70 });
        await TestPublicationStore.Create(db, storage, fixture.Clock).CaptureLaunchAsync(parent);
        await db.SaveChangesAsync();
        object? returned = null;
        fixture.OnExecute = async executing =>
        {
            await using var producing = fixture.CreateDb();
            if (mode == "missing")
            {
                producing.Recipes.Remove(await producing.Recipes.SingleAsync());
                await producing.SaveChangesAsync();
            }
            var processor = new RecipeReadyProcessor(producing, NullLogger<RecipeReadyProcessor>.Instance,
                Mock.Of<IScheduleEventPublisher>(), TestPublicationStore.Create(producing, storage, fixture.Clock));
            returned = await processor.ExecuteAsync(executing, default);
            if (mode == "recovered") returned = await processor.ExecuteAsync(executing, default);
        };
        fixture.Result = _ => returned;
        Assert.Equal(1, await fixture.Worker.ProcessPendingTasksAsync(default));
        await using var read = fixture.CreateDb();
        Assert.Equal(TaskStatus.Completed, (await read.WorkflowTasks.SingleAsync()).Status);
        var attempt = await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync();
        var validate = typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.WorkflowProcessorHistory")!
            .GetMethod("Validate", BindingFlags.Static | BindingFlags.Public)!;
        validate.Invoke(null, [attempt]);
        var original = attempt.Outcome!;
        using var observation = JsonDocument.Parse(original);
        var result = JsonNode.Parse(observation.RootElement.GetProperty("returnedResult").GetString()!)!;
        var published = mode is "pdf" or "non-pdf" or "recovered";
        if (published)
        {
            Assert.Equal("Ready", result["status"]!.GetValue<string>());
            Assert.Single(observation.RootElement.GetProperty("publications").EnumerateArray());
            Assert.True((await read.Recipes.SingleAsync()).IsReady);
            Assert.Equal(mode != "non-pdf", (await repository.GetInfoAsync(id, default)).IsReady == true);
        }
        else Assert.Empty(observation.RootElement.GetProperty("publications").EnumerateArray());
        // Only fixture-owned live journals/source are removed or changed. Original
        // receipt associations must not depend on today's recipe or file state.
        read.RecipeFilePublications.RemoveRange(await read.RecipeFilePublications.ToArrayAsync());
        var live = await read.Recipes.SingleOrDefaultAsync();
        if (live is not null) { live.Notes = "newer private"; live.IsReady = false; }
        await read.SaveChangesAsync();
        await storage.SaveAsync("recipes", $"{id}/original/source.pdf", new byte[] { 99 });
        validate.Invoke(null, [attempt]);
        void Refuse(Action<JsonNode> change)
        {
            var wire = JsonNode.Parse(original)!; change(wire);
            attempt.Outcome = wire.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
            var error = Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
            Assert.True(error.InnerException is InvalidDataException or JsonException, error.ToString());
            attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        }
        void Result(JsonNode wire, Action<JsonObject> change)
        {
            var value = JsonNode.Parse(wire["returnedResult"]!.GetValue<string>())!.AsObject(); change(value);
            wire["returnedResult"] = value.ToJsonString(); wire["task"]!["result"] = value.ToJsonString();
        }
        Refuse(wire => Result(wire, value => value["recipeId"] = Guid.NewGuid()));
        Refuse(wire => Result(wire, value => value["status"] = "Other"));
        Refuse(wire => Result(wire, value => value["message"] = "different observation"));
        if (published)
        {
            Refuse(wire => wire["publications"] = new JsonArray());
            Refuse(wire => Result(wire, value => value["status"] = "AlreadyReady"));
            Refuse(wire => Result(wire, value => value.Remove("status")));
            Refuse(wire => Result(wire, value => value.Remove("recipeId")));
            Refuse(wire =>
            {
                // Changing an ignored candidate field preserves the generic
                // publication semantics but breaks this producer's original input.
                var publication = wire["publications"]![0]!;
                var journal = JsonNode.Parse(publication["payload"]!.GetValue<string>())!;
                journal["candidate"]!["info"]!["notes"] = "different candidate notes";
                publication["payload"] = journal.ToJsonString();
                publication["inputHash"] = HistoryHash(new JsonObject {
                    ["capture"] = journal["capture"]!.DeepClone(), ["candidate"] = journal["candidate"]!.DeepClone() }.ToJsonString());
                var generic = typeof(RecipeFilePublicationStore).GetMethod("ValidateRecoveryJournal", BindingFlags.Static | BindingFlags.NonPublic)!;
                generic.Invoke(null, [publication.Deserialize<RecipeFilePublication>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!]);
            });
        }
        else if (mode == "already-ready") Refuse(wire => Result(wire, value => value["status"] = "Ready"));
        else Refuse(wire => Result(wire, value => value.Remove("message")));
        var extended = JsonNode.Parse(original)!;
        Result(extended, value => value["retainedExtension"] = new JsonObject { ["futureFact"] = null });
        attempt.Outcome = extended.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        validate.Invoke(null, [attempt]);
        attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        var request = attempt.Request;
        var changedRequest = JsonNode.Parse(request)!;
        changedRequest["parameters"] = JsonSerializer.Serialize(new { recipeId = Guid.NewGuid().ToString() });
        attempt.Request = changedRequest.ToJsonString(); attempt.RequestHash = HistoryHash(attempt.Request);
        var changedOutcome = JsonNode.Parse(original)!; changedOutcome["requestHash"] = attempt.RequestHash;
        attempt.Outcome = changedOutcome.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
        attempt.Request = request; attempt.RequestHash = HistoryHash(request);
        attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        Assert.Equal(original, (await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync()).Outcome);
    }
}
