using System.Net;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

public sealed partial class WorkflowWorkerAuthorityTests
{
    [Theory]
    [InlineData("plain")]
    [InlineData("hero")]
    [InlineData("hero-failed")]
    [InlineData("forbidden")]
    [InlineData("fallback")]
    [InlineData("recovered")]
    public Task WebProcessorHistory_BindsOriginalUrlContextAndReturnedReceipt(string mode) =>
        CheckWebProcessorHistoryAsync(Memory(), mode);

    internal static async Task CheckWebProcessorHistoryAsync(Action<DbContextOptionsBuilder> configure, string mode)
    {
        await using var fixture = new Fixture(configure, "FetchUrlContent");
        await using var db = fixture.CreateDb();
        var storage = new InMemoryStorageProvider();
        var repository = new RecipeRepository(storage);
        var id = Guid.NewGuid();
        const string url = "https://source.example.test/recipe?original=1";
        const string html = "<html>original retained source é</html>";
        var context = JsonSerializer.Serialize(new { name = mode == "fallback" ? "  " : "Acquired original",
            heroImageUrl = mode is "hero" or "hero-failed" ? "https://source.example.test/image" : null,
            notes = "acquired evidence, never private notes", futureFact = new { retained = true } });
        db.Recipes.Add(new Recipe { Id = id, Name = "Original", Notes = "private original", ImageCount = 2, FinishedDishIndex = 1 });
        var parent = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "web-history", Status = WorkflowStatus.Processing,
            Parameters = JsonSerializer.Serialize(new { recipeId = id.ToString(), url }), CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = parent.Id, Instance = parent,
            TaskName = "acquire", ProcessorName = "FetchUrlContent", Payload = JsonSerializer.Serialize(new { recipeId = id, url }),
            Status = TaskStatus.Pending, DependsOn = [], CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        db.WorkflowTasks.Add(task);
        await db.SaveChangesAsync();
        await repository.SaveInfoAsync(new RecipeInfo { Id = id, Name = "Original", Notes = "private original", ImageCount = 2, FinishedDishImageIndex = 1 }, default);
        await storage.SaveAsync("recipes", $"{id}/original/1.jpg", new byte[] { 1, 2, 3 });
        await TestPublicationStore.Create(db, storage, fixture.Clock).CaptureLaunchAsync(parent);
        await db.SaveChangesAsync();
        var calls = 0;
        using var http = new HttpClient(new Agents.WebAcquisitionAgentTests.FakeHttpMessageHandler(request =>
        {
            calls++;
            if (request.RequestUri!.ToString() == url)
                return new HttpResponseMessage(mode == "forbidden" ? HttpStatusCode.Forbidden : HttpStatusCode.OK) { Content = new StringContent(html) };
            return new HttpResponseMessage(mode == "hero-failed" ? HttpStatusCode.NotFound : HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(new byte[] { 7, 8, 9 }) { Headers = { ContentType = new("image/png") } }
            };
        }));
        var chat = new Mock<IChatClient>();
        chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, context)));
        var prompts = new Mock<IPromptRepository>();
        prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract web context");
        object? returned = null;
        fixture.OnExecute = async executing =>
        {
            await using var producing = fixture.CreateDb();
            var agent = new WebAcquisitionAgent(chat.Object, TestPublicationStore.Create(producing, storage, fixture.Clock),
                prompts.Object, http, NullLogger<WebAcquisitionAgent>.Instance);
            returned = await agent.ExecuteAsync(executing, default);
            if (mode == "recovered")
            {
                var before = calls;
                returned = await agent.ExecuteAsync(executing, default);
                Assert.Equal(before, calls);
            }
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
        var originalRequest = attempt.Request;
        Assert.Equal(mode == "forbidden" ? "" : html, await repository.GetContentHtmlAsync(id, default));
        Assert.Equal("private original", (await repository.GetInfoAsync(id, default)).Notes);
        // Historical qualification must survive changes to fixture-owned live facts.
        read.RecipeFilePublications.RemoveRange(await read.RecipeFilePublications.ToArrayAsync());
        var live = await read.Recipes.SingleAsync(); live.Name = "new human name"; live.Notes = "new private"; live.SourceUrl = "https://changed.example.test";
        await read.SaveChangesAsync();
        await storage.SaveAsync("recipes", $"{id}/original/content.html", "changed source");
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
            var result = JsonNode.Parse(wire["returnedResult"]!.GetValue<string>())!.AsObject(); change(result);
            wire["returnedResult"] = result.ToJsonString(); wire["task"]!["result"] = result.ToJsonString();
        }
        void Candidate(JsonNode wire, Action<JsonNode> change)
        {
            var publication = wire["publications"]![0]!;
            var journal = JsonNode.Parse(publication["payload"]!.GetValue<string>())!;
            change(journal["candidate"]!);
            publication["payload"] = journal.ToJsonString();
            publication["inputHash"] = HistoryHash(new JsonObject { ["capture"] = journal["capture"]!.DeepClone(),
                ["candidate"] = journal["candidate"]!.DeepClone() }.ToJsonString());
            // This change passes the independent publication owner. The missing
            // association belongs to the original processor, not generic integrity.
            typeof(RecipeFilePublicationStore).GetMethod("ValidateRecoveryJournal", BindingFlags.Static | BindingFlags.NonPublic)!
                .Invoke(null, [publication.Deserialize<RecipeFilePublication>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!]);
        }
        Refuse(wire => Result(wire, value => value["message"] = "Fetched and processed content from https://different.example.test"));
        Refuse(wire => Result(wire, value => value.Remove("message")));
        Refuse(wire => wire["publications"] = new JsonArray());
        Refuse(wire => Candidate(wire, value => value["sourceContext"] = JsonSerializer.Serialize(new { name = "Different context" })));
        Refuse(wire => Candidate(wire, value => value["info"]!["notes"] = "forged private candidate"));
        if (mode == "hero")
            Refuse(wire => Candidate(wire, value => value["sourceContext"] = JsonSerializer.Serialize(new { name = "Acquired original" })));
        if (mode != "hero")
            Refuse(wire => Candidate(wire, value => value["info"]!["imageCount"] = 3));
        var extended = JsonNode.Parse(original)!;
        Result(extended, value => value["retainedExtension"] = new JsonObject { ["futureFact"] = null });
        attempt.Outcome = extended.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        validate.Invoke(null, [attempt]);
        attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        var request = JsonNode.Parse(originalRequest)!;
        request["parameters"] = JsonSerializer.Serialize(new { recipeId = Guid.NewGuid().ToString(), url });
        attempt.Request = request.ToJsonString(); attempt.RequestHash = HistoryHash(attempt.Request);
        var outcome = JsonNode.Parse(original)!; outcome["requestHash"] = attempt.RequestHash;
        attempt.Outcome = outcome.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
        attempt.Request = originalRequest; attempt.RequestHash = HistoryHash(originalRequest);
        attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        Assert.Equal(original, (await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync()).Outcome);
        chat.Verify(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
