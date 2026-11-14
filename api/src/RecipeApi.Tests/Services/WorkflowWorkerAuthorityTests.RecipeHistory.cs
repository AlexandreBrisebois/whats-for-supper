using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
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
    [InlineData("ExtractRecipe", "published")]
    [InlineData("ExtractRecipe", "recovered")]
    [InlineData("ExtractRecipe", "no-source")]
    [InlineData("GenerateDescription", "published")]
    [InlineData("GenerateDescription", "recovered")]
    [InlineData("SynthesizeRecipe", "published")]
    [InlineData("SynthesizeRecipe", "recovered")]
    [InlineData("SynthesizeRecipe", "fallback")]
    [InlineData("SynthesizeRecipe", "fallback-empty")]
    [InlineData("SynthesizeRecipe", "fallback-null")]
    public Task RecipeProcessorHistory_BindsOriginalCandidateAndReturnedReceipt(string processor, string mode) =>
        CheckRecipeProcessorHistoryAsync(Memory(), processor, mode);

    internal static async Task CheckRecipeProcessorHistoryAsync(Action<DbContextOptionsBuilder> configure, string processor, string mode)
    {
        await using var fixture = new Fixture(configure, processor);
        await using var db = fixture.CreateDb();
        var storage = new InMemoryStorageProvider();
        var repository = new RecipeRepository(storage);
        var id = Guid.NewGuid();
        var description = mode == "fallback-empty" ? "" : mode == "fallback-null" ? null : "original synthesis description";
        const string recipeJson = """
            {"name":"Retained output","recipeIngredient":["2 eggs"],"recipeInstructions":[{"@type":"HowToSection","name":"Cook","itemListElement":[{"@type":"HowToStep","text":"Cook eggs."}]}],"totalTime":"PT10M"}
            """;
        db.Recipes.Add(new Recipe { Id = id, Name = "Original", Notes = "private original", Ingredients = "[]" });
        var parent = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "recipe-history", Status = WorkflowStatus.Processing,
            Parameters = JsonSerializer.Serialize(new { recipeId = id.ToString(), description = description ?? "" }),
            CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = parent.Id, Instance = parent,
            TaskName = "produce", ProcessorName = processor,
            Payload = JsonSerializer.Serialize(new { recipeId = id, description, repairNote = "untrusted original focus" }),
            Status = TaskStatus.Pending, DependsOn = [], CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        db.WorkflowTasks.Add(task);
        await db.SaveChangesAsync();
        await repository.SaveInfoAsync(new RecipeInfo { Id = id, Name = "Original", Notes = "private original" }, default);
        await storage.SaveAsync("recipes", $"{id}/recipe.json", recipeJson);
        if (processor == "ExtractRecipe" && mode != "no-source")
            await storage.SaveAsync("recipes", $"{id}/original/content.html", "<html>original source</html>");
        await TestPublicationStore.Create(db, storage, fixture.Clock).CaptureLaunchAsync(parent);
        await db.SaveChangesAsync();
        var chat = new Mock<IChatClient>();
        chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IEnumerable<ChatMessage> messages, ChatOptions? _, CancellationToken _) =>
                new ChatResponse(new ChatMessage(ChatRole.Assistant,
                    messages.Any(x => x.Text.StartsWith("Description: ", StringComparison.Ordinal)) && mode.StartsWith("fallback", StringComparison.Ordinal)
                        ? "unusable response" : messages.Any(x => x.Text.Contains("Recipe Data (JSON):", StringComparison.Ordinal))
                            ? "Generated original description" : recipeJson)));
        var prompts = new Mock<IPromptRepository>();
        prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Process recipe");
        object? returned = null;
        fixture.OnExecute = async executing =>
        {
            await using var producing = fixture.CreateDb();
            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance,
                TestPublicationStore.Create(producing, storage, fixture.Clock), processor);
            returned = await agent.ExecuteAsync(executing, default);
            if (mode == "recovered")
            {
                var before = chat.Invocations.Count;
                returned = await agent.ExecuteAsync(executing, default);
                Assert.Equal(before, chat.Invocations.Count);
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
        read.RecipeFilePublications.RemoveRange(await read.RecipeFilePublications.ToArrayAsync());
        var live = await read.Recipes.SingleAsync(); live.Name = "new human name"; live.Notes = "new private"; live.RawMetadata = "{}";
        await read.SaveChangesAsync();
        await storage.SaveAsync("recipes", $"{id}/recipe.json", "{}");
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
        void Result(JsonNode wire, string result)
        {
            wire["returnedResult"] = result; wire["task"]!["result"] = result;
        }
        void Candidate(JsonNode wire, Action<JsonNode> change)
        {
            var publication = wire["publications"]![0]!;
            var journal = JsonNode.Parse(publication["payload"]!.GetValue<string>())!;
            change(journal);
            publication["payload"] = journal.ToJsonString();
            publication["inputHash"] = HistoryHash(new JsonObject { ["capture"] = journal["capture"]!.DeepClone(),
                ["candidate"] = journal["candidate"]!.DeepClone() }.ToJsonString());
            typeof(RecipeFilePublicationStore).GetMethod("ValidateRecoveryJournal", BindingFlags.Static | BindingFlags.NonPublic)!
                .Invoke(null, [publication.Deserialize<RecipeFilePublication>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!]);
        }
        Refuse(wire => Result(wire, JsonSerializer.Serialize(new { message = $"Published recipe candidate for {Guid.NewGuid()}" })));
        Refuse(wire => Result(wire, "{}"));
        if (mode != "no-source")
        {
            if (processor != "ExtractRecipe" || mode == "recovered")
                Refuse(wire => wire["publications"] = new JsonArray());
            Refuse(wire => Candidate(wire, value => value["candidate"]!["info"]!["notes"] = "forged candidate notes"));
            if (processor == "GenerateDescription")
                Refuse(wire => Candidate(wire, value => value["capture"]!["files"]!["recipe.json"] = Convert.ToBase64String("{}"u8.ToArray())));
            if (processor == "ExtractRecipe")
                Refuse(wire => Candidate(wire, value => value["capture"]!["files"]!["original/content.html"] = null));
        }
        var extended = JsonNode.Parse(original)!;
        var receipt = JsonNode.Parse(extended["returnedResult"]!.GetValue<string>())!.AsObject();
        receipt["retainedExtension"] = new JsonObject { ["futureFact"] = null };
        Result(extended, receipt.ToJsonString());
        attempt.Outcome = extended.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        validate.Invoke(null, [attempt]);
        attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        var originalRequest = attempt.Request;
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
}
