using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
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
    [InlineData("raw")]
    [InlineData("finished-dish")]
    [InlineData("missing-dish")]
    [InlineData("force")]
    [InlineData("force-string")]
    [InlineData("recovered")]
    [InlineData("existing")]
    [InlineData("no-source")]
    [InlineData("no-image")]
    public Task HeroProcessorHistory_BindsOriginalCandidateAndReturnedReceipt(string mode) =>
        CheckHeroProcessorHistoryAsync(Memory(), mode);

    internal static async Task CheckHeroProcessorHistoryAsync(Action<DbContextOptionsBuilder> configure, string mode)
    {
        await using var fixture = new Fixture(configure, "GenerateHero");
        await using var db = fixture.CreateDb();
        var storage = new InMemoryStorageProvider();
        var repository = new RecipeRepository(storage);
        var id = Guid.NewGuid();
        var imageCount = mode is "finished-dish" or "missing-dish" ? 2 : 0;
        var dish = imageCount == 2 ? 1 : -1;
        var force = mode is "force" or "force-string";
        db.Recipes.Add(new Recipe { Id = id, Name = "Original", Notes = "private original", ImageCount = imageCount, FinishedDishIndex = dish });
        var parent = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "hero-history", Status = WorkflowStatus.Processing,
            Parameters = JsonSerializer.Serialize(new { recipeId = id.ToString() }), CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        var payload = mode == "force-string" ? JsonSerializer.Serialize(new { RecipeId = id, Force = "TRUE" })
            : JsonSerializer.Serialize(new { recipeId = id, force });
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = parent.Id, Instance = parent,
            TaskName = "produce", ProcessorName = "GenerateHero", Payload = payload,
            Status = TaskStatus.Pending, DependsOn = [], CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        db.WorkflowTasks.Add(task);
        await db.SaveChangesAsync();
        await repository.SaveInfoAsync(new RecipeInfo { Id = id, Name = "Original", Notes = "private original", ImageCount = imageCount, FinishedDishImageIndex = dish }, default);
        if (mode != "no-source" && mode != "finished-dish")
            await storage.SaveAsync("recipes", $"{id}/recipe.json", "{\"name\":\"Original raw recipe\"}");
        if (mode == "finished-dish")
            await storage.SaveAsync("recipes", $"{id}/original/1.png", new byte[] { 1, 2, 3 });
        if (force || mode == "existing")
            await storage.SaveAsync("recipes", $"{id}/hero.webp", new byte[] { 7, 8, 9 });
        await TestPublicationStore.Create(db, storage, fixture.Clock).CaptureLaunchAsync(parent);
        await db.SaveChangesAsync();
        using var handler = new DemoAiBoundaryTests.SyntheticHandler(mode == "no-image"
            ? """{"candidates":[{"content":{"parts":[{"text":"No image produced"}]}}]}"""
            : """{"candidates":[{"content":{"parts":[{"inlineData":{"mimeType":"image/webp","data":"BAUG"}}]}}]}""");
        var config = new ConfigurationManager(); config["GEMINI_API_KEY"] = "synthetic-only";
        object? returned = null;
        fixture.OnExecute = async executing =>
        {
            await using var producing = fixture.CreateDb();
            var agent = new RecipeHeroAgent(TestPublicationStore.Create(producing, storage, fixture.Clock), config,
                NullLogger<RecipeHeroAgent>.Instance, new DemoAiBoundaryTests.ClientFactory(handler));
            returned = await agent.ExecuteAsync(executing, default);
            if (mode == "recovered")
            {
                var before = handler.Sends;
                returned = await agent.ExecuteAsync(executing, default);
                Assert.Equal(before, handler.Sends);
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
        var published = mode is not ("existing" or "no-source" or "no-image");
        Assert.Equal("private original", (await repository.GetInfoAsync(id, default)).Notes);
        Assert.Equal(published ? new byte[] { 4, 5, 6 } : mode == "existing" ? new byte[] { 7, 8, 9 } : null,
            await storage.LoadAsync("recipes", $"{id}/hero.webp"));
        read.RecipeFilePublications.RemoveRange(await read.RecipeFilePublications.ToArrayAsync());
        var live = await read.Recipes.SingleAsync(); live.Name = "new human name"; live.Notes = "new private"; live.RawMetadata = "{}";
        await read.SaveChangesAsync();
        await storage.SaveAsync("recipes", $"{id}/hero.webp", new byte[] { 99 });
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

        Refuse(wire => Result(wire, JsonSerializer.Serialize(new { message = $"Generated hero image for {Guid.NewGuid()} (Force={force})" })));
        Refuse(wire => Result(wire, "{}"));
        Refuse(wire => Result(wire, JsonSerializer.Serialize(new { message = $"Generated hero image for {id} (Force={!force})" })));
        if (mode is not ("existing" or "no-source" or "no-image"))
        {
            Assert.Single(JsonNode.Parse(original)!["publications"]!.AsArray());
            Refuse(wire => Candidate(wire, value => value["candidate"]!["info"]!["notes"] = "forged private notes"));
            if (!force)
                Refuse(wire => Candidate(wire, value => value["capture"]!["files"]!["hero.webp"] = Convert.ToBase64String(new byte[] { 99 })));
            if (mode != "finished-dish")
                Refuse(wire => Candidate(wire, value => value["capture"]!["files"]!["recipe.json"] = null));
            else
                Refuse(wire => Candidate(wire, value => value["capture"]!["files"]!["original/1.png"] = null));
        }
        else Assert.Empty(JsonNode.Parse(original)!["publications"]!.AsArray());
        // The same receipt is emitted on every skip and on recovery: removing the
        // publication cannot prove a skip, and must remain an unqualified observation.
        var absent = JsonNode.Parse(original)!; absent["publications"] = new JsonArray();
        attempt.Outcome = absent.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        validate.Invoke(null, [attempt]);
        var extended = JsonNode.Parse(original)!;
        var receipt = JsonNode.Parse(extended["returnedResult"]!.GetValue<string>())!.AsObject();
        receipt["retainedExtension"] = new JsonObject { ["futureFact"] = null };
        Result(extended, receipt.ToJsonString());
        attempt.Outcome = extended.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        validate.Invoke(null, [attempt]);
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
        Assert.Equal(mode is "existing" or "no-source" ? 0 : 1, handler.Sends);
    }
}
