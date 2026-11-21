using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
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
    [InlineData("rendered")]
    [InlineData("reused")]
    [InlineData("recovered")]
    [InlineData("skipped")]
    public Task PdfProcessorHistory_BindsReturnedResultToOriginalPublication(string mode) => CheckPdfProcessorHistoryAsync(Memory(), mode);

    internal static async Task CheckPdfProcessorHistoryAsync(Action<DbContextOptionsBuilder> configure, string mode)
    {
        await using var fixture = new Fixture(configure, "ConvertPdf");
        await using var db = fixture.CreateDb();
        var storage = new InMemoryStorageProvider();
        var repository = new RecipeRepository(storage);
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "PDF original", Notes = "private original" };
        db.Recipes.Add(recipe);
        var parent = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "pdf-capture", Status = WorkflowStatus.Processing,
            Parameters = JsonSerializer.Serialize(new { recipeId = recipe.Id.ToString() }), CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = parent.Id, Instance = parent,
            TaskName = "convert", ProcessorName = "ConvertPdf", Payload = JsonSerializer.Serialize(new { recipeId = recipe.Id }),
            Status = TaskStatus.Pending, DependsOn = [], CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        db.WorkflowTasks.Add(task);
        await db.SaveChangesAsync();
        await repository.SaveInfoAsync(new RecipeInfo { Id = recipe.Id, Name = recipe.Name,
            ImageCount = mode == "reused" ? 2 : 0, FinishedDishImageIndex = -1 }, default);
        if (mode != "skipped") await storage.SaveAsync("recipes", $"{recipe.Id}/original/source.pdf", new byte[] { 37, 80, 68, 70 });
        if (mode == "reused")
            for (var i = 0; i < 2; i++) await repository.SaveOriginalImageAsync(recipe.Id, i, "image/png", new byte[] { 11, (byte)i }, default);
        await TestPublicationStore.Create(db, storage, fixture.Clock).CaptureLaunchAsync(parent);
        await db.SaveChangesAsync();
        var renderer = new Mock<IPdfPageRenderer>(MockBehavior.Strict);
        renderer.Setup(x => x.RenderAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new byte[][] { [1, 2, 3], [4, 5, 6] });
        object? returned = null;
        fixture.OnExecute = async executing =>
        {
            await using var producing = fixture.CreateDb();
            var processor = new PdfConversionProcessor(TestPublicationStore.Create(producing, storage, fixture.Clock), renderer.Object);
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
        using var originalDocument = JsonDocument.Parse(original);
        var receipt = JsonNode.Parse(originalDocument.RootElement.GetProperty("returnedResult").GetString()!)!;
        Assert.Equal(mode == "skipped", receipt["skipped"]?.GetValue<bool>() == true);
        if (mode == "recovered") Assert.True(receipt["recovered"]!.GetValue<bool>());
        else if (mode != "skipped") Assert.Equal(2, receipt["imageCount"]!.GetValue<int>());
        // Erase only fixture-owned live journals and replace live source/media. The
        // original attempt must validate independently, without reading these facts.
        read.RecipeFilePublications.RemoveRange(await read.RecipeFilePublications.ToArrayAsync());
        var live = await read.Recipes.SingleAsync(); live.Notes = "newer private"; live.ImageCount = 9;
        await read.SaveChangesAsync();
        await storage.SaveAsync("recipes", $"{recipe.Id}/original/source.pdf", new byte[] { 99 });
        validate.Invoke(null, [attempt]);
        void Refuse(Action<JsonNode> change)
        {
            var wire = JsonNode.Parse(original)!;
            change(wire);
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
        Refuse(wire => Result(wire, value => value["imageCount"] = 9));
        Refuse(wire => Result(wire, value => value["recipeId"] = Guid.NewGuid()));
        Refuse(wire => Result(wire, value => value["recovered"] = false));
        var extended = JsonNode.Parse(original)!;
        Result(extended, value => value["retainedExtension"] = new JsonObject { ["futureFact"] = null });
        attempt.Outcome = extended.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        validate.Invoke(null, [attempt]); // Unknown original result extensions are retained, not new authority.
        attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        if (mode != "skipped")
        {
            Refuse(wire => Result(wire, value => value.Remove(mode == "recovered" ? "recovered" : "imageCount")));
            Refuse(wire =>
            {
                var publication = wire["publications"]![0]!;
                var journal = JsonNode.Parse(publication["payload"]!.GetValue<string>())!;
                journal["capture"]!["files"]!["original/source.pdf"] = null;
                publication["payload"] = journal.ToJsonString();
                publication["inputHash"] = HistoryHash(new JsonObject
                {
                    ["capture"] = journal["capture"]!.DeepClone(), ["candidate"] = journal["candidate"]!.DeepClone()
                }.ToJsonString());
                // This mutation remains a valid generic publication; the missing
                // original PDF specifically violates its processor association.
                var generic = typeof(RecipeFilePublicationStore).GetMethod("ValidateRecoveryJournal", BindingFlags.Static | BindingFlags.NonPublic)!;
                generic.Invoke(null, [publication.Deserialize<RecipeFilePublication>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!]);
            });
        }
        if (mode != "skipped")
        {
            Refuse(wire => Result(wire, value => value["skipped"] = true));
            Refuse(wire => wire["publications"] = new JsonArray());
        }
        else Refuse(wire => Result(wire, value => value.Remove("skipped")));
        if (mode == "skipped")
        {
            var request = attempt.Request;
            var wire = JsonNode.Parse(request)!;
            wire["parameters"] = JsonSerializer.Serialize(new { recipeId = Guid.NewGuid().ToString() });
            attempt.Request = wire.ToJsonString(); attempt.RequestHash = HistoryHash(attempt.Request);
            var changed = JsonNode.Parse(original)!; changed["requestHash"] = attempt.RequestHash;
            attempt.Outcome = changed.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
            var error = Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
            Assert.IsType<InvalidDataException>(error.InnerException);
            attempt.Request = request; attempt.RequestHash = HistoryHash(request);
            attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        }
        Assert.Equal(original, (await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync()).Outcome);
        Assert.Equal("newer private", (await read.Recipes.AsNoTracking().SingleAsync()).Notes);
    }
}
