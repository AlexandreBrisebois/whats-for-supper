using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
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
    [InlineData("classified")]
    [InlineData("missing")]
    [InlineData("no-result")]
    [InlineData("caught-failure")]
    [InlineData("upper-alias")]
    [InlineData("both-aliases")]
    public Task RecipeCategoryHistory_BindsInvocationWithoutCertifyingMetadata(string mode) =>
        CheckMetadataHistoryAsync(Memory(), "CategorizeRecipe", mode);

    [Theory]
    [InlineData("classified")]
    [InlineData("false")]
    [InlineData("missing")]
    [InlineData("empty")]
    [InlineData("no-result")]
    [InlineData("provider-failure")]
    [InlineData("upper-alias")]
    [InlineData("both-aliases")]
    public Task VegetarianHistory_BindsInvocationAndExplicitOutcome(string mode) =>
        CheckMetadataHistoryAsync(Memory(), "ClassifyRecipeVegetarian", mode);

    internal static async Task CheckMetadataHistoryAsync(Action<DbContextOptionsBuilder> configure,
        string processor, string mode)
    {
        await using var fixture = new Fixture(configure, processor);
        await using var db = fixture.CreateDb();
        var id = Guid.NewGuid();
        var vegetarian = processor == "ClassifyRecipeVegetarian";
        if (mode != "missing")
            db.Recipes.Add(new Recipe { Id = id, Name = "Original", Description = "Retained", Ingredients = mode == "empty" ? "[]" : "[\"tomato\"]" });
        var parent = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "metadata-history", Status = WorkflowStatus.Processing,
            Parameters = JsonSerializer.Serialize(new { recipeId = id.ToString() }), CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = parent.Id, Instance = parent,
            TaskName = "observe", ProcessorName = processor, Status = TaskStatus.Pending, DependsOn = [],
            Payload = mode == "upper-alias" ? new JsonObject { ["RecipeId"] = id }.ToJsonString()
                : mode == "both-aliases" ? new JsonObject { ["recipeId"] = id, ["RecipeId"] = Guid.NewGuid() }.ToJsonString()
                : new JsonObject { ["recipeId"] = id }.ToJsonString(),
            CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        db.WorkflowTasks.Add(task);
        await TestPublicationStore.Create(db, new InMemoryStorageProvider(), fixture.Clock).CaptureLaunchAsync(parent);
        await db.SaveChangesAsync();
        var chat = new Mock<IChatClient>(MockBehavior.Strict);
        var setup = chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()));
        if (mode is "caught-failure" or "provider-failure") setup.ThrowsAsync(new HttpRequestException("synthetic boundary failure"));
        else setup.ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, mode == "no-result" ? "null"
            : mode == "false" ? "{\"isVegetarian\":false}"
            : "{\"cuisineType\":\"Italian\",\"mealTypes\":[\"Lunch\"],\"primaryMealType\":\"Lunch\",\"isVegetarian\":true}")));
        object? returned = null;
        fixture.OnExecute = async executing =>
        {
            await using var producing = fixture.CreateDb();
            returned = vegetarian
                ? await new ClassifyRecipeVegetarianProcessor(producing, chat.Object,
                    new VegetarianClassificationPolicy(Options.Create(new VegetarianClassificationOptions())), fixture.Clock).ExecuteAsync(executing, default)
                : await new CategorizeRecipeProcessor(fixture.Clock, producing, chat.Object,
                    NullLogger<CategorizeRecipeProcessor>.Instance).ExecuteAsync(executing, default);
        };
        fixture.Result = _ => returned;
        Assert.Equal(1, await fixture.Worker.ProcessPendingTasksAsync(default));
        await using var read = fixture.CreateDb();
        var failed = vegetarian && mode is "provider-failure" or "upper-alias";
        Assert.Equal(failed ? TaskStatus.Failed : TaskStatus.Completed, (await read.WorkflowTasks.SingleAsync()).Status);
        var calls = mode == "missing" || vegetarian && mode is "empty" or "upper-alias" ? 0 : 1;
        chat.Verify(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()), Times.Exactly(calls));
        var recipe = await read.Recipes.SingleOrDefaultAsync();
        if (mode == "missing") Assert.Null(recipe);
        else if (vegetarian)
            Assert.Equal(mode is "empty" or "no-result" or "provider-failure" or "upper-alias" ? (bool?)null : mode != "false", recipe!.IsVegetarian);
        else
        {
            Assert.Equal(mode is "no-result" or "caught-failure" ? "Supper" : "Lunch", recipe!.Category);
            Assert.Equal(mode is "no-result" or "caught-failure" ? null : "Italian", recipe.CuisineType);
        }
        var attempt = await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync();
        var validate = typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.WorkflowProcessorHistory")!
            .GetMethod("Validate", BindingFlags.Static | BindingFlags.Public)!;
        validate.Invoke(null, [attempt]);
        var original = attempt.Outcome!;
        var originalRequest = attempt.Request;
        // Later rows cannot supply original input, provider, policy or mutation authority.
        if (recipe is not null)
        {
            recipe.Ingredients = "[\"new human ingredients\"]"; recipe.IsVegetarian = false;
            recipe.Category = "Snack"; recipe.CuisineType = "new human cuisine";
            await read.SaveChangesAsync();
        }
        validate.Invoke(null, [attempt]);
        if (failed)
        {
            using var outcome = JsonDocument.Parse(original);
            Assert.False(outcome.RootElement.GetProperty("processorReturned").GetBoolean());
            Assert.Equal(JsonValueKind.Null, outcome.RootElement.GetProperty("returnedResult").ValueKind);
            Assert.Equal(original, (await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync()).Outcome);
            return;
        }
        void Result(JsonNode wire, string result)
        { wire["returnedResult"] = result; wire["task"]!["result"] = result; }
        void Refuse(string result)
        {
            var wire = JsonNode.Parse(original)!; Result(wire, result);
            attempt.Outcome = wire.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
            var error = Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
            Assert.True(error.InnerException is InvalidDataException or JsonException, error.ToString());
            attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        }
        if (vegetarian)
        {
            Refuse(JsonSerializer.Serialize(new { recipeId = Guid.NewGuid(), outcome = "classified", isVegetarian = true }));
            Refuse(JsonSerializer.Serialize(new { recipeId = id, outcome = "invented" }));
            Refuse(JsonSerializer.Serialize(new { recipeId = id, outcome = (string?)null }));
            Refuse(JsonSerializer.Serialize(new { recipeId = id, outcome = "classified" }));
            Refuse(JsonSerializer.Serialize(new { recipeId = id, outcome = "classified", isVegetarian = (bool?)null }));
            Refuse(JsonSerializer.Serialize(new { recipeId = id, outcome = "classified", isVegetarian = "true" }));
            Refuse(JsonSerializer.Serialize(new { recipeId = id, outcome = "not-found", isVegetarian = true }));
            Refuse(JsonSerializer.Serialize(new { recipeId = id, outcome = "unknown-no-ingredients", isVegetarian = (bool?)null }));
            Refuse($"{{\"recipeId\":\"{id}\",\"outcome\":\"classified\",\"isVegetarian\":true,\"isVegetarian\":false}}");
            Refuse(JsonSerializer.Serialize(new { recipeId = 42, outcome = "not-found" }));
            Refuse(JsonSerializer.Serialize(new { recipeId = (string?)null, outcome = "not-found" }));
            Refuse($"{{\"recipeId\":\"{id}\",\"outcome\":\"not-found\",\"outcome\":\"not-found\"}}");
        }
        else
        {
            Refuse(JsonSerializer.Serialize(new { message = $"CategorizeRecipe completed for recipe {Guid.NewGuid()}." }));
            Refuse(JsonSerializer.Serialize(new { message = $"CategorizeRecipe published for recipe {id}." }));
            Refuse("{\"message\":null}"); Refuse("{\"message\":42}");
            Refuse($"{{\"message\":\"CategorizeRecipe completed for recipe {id}.\",\"message\":null}}");
        }
        Refuse("{}"); Refuse("null");
        var extended = JsonNode.Parse(original)!;
        var receipt = JsonNode.Parse(extended["returnedResult"]!.GetValue<string>())!;
        receipt["futureObservation"] = new JsonObject { ["observed"] = null };
        Result(extended, receipt.ToJsonString());
        attempt.Outcome = extended.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        validate.Invoke(null, [attempt]);
        void RefusePayload(string payload)
        {
            var altered = JsonNode.Parse(originalRequest)!;
            altered["task"]!["payload"] = payload;
            attempt.Request = altered.ToJsonString(); attempt.RequestHash = HistoryHash(attempt.Request);
            var observed = JsonNode.Parse(original)!;
            observed["requestHash"] = attempt.RequestHash; observed["task"]!["payload"] = payload;
            attempt.Outcome = observed.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
            Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
            attempt.Request = originalRequest; attempt.RequestHash = HistoryHash(originalRequest);
            attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        }
        RefusePayload($"{{\"recipeId\":\"{id}\",\"recipeId\":\"{id}\"}}");
        RefusePayload(new JsonObject { ["recipeId"] = Guid.NewGuid() }.ToJsonString());
        RefusePayload("{\"recipeId\":null}");
        RefusePayload("{\"recipeId\":42}");
        var request = JsonNode.Parse(originalRequest)!;
        request["parameters"] = JsonSerializer.Serialize(new { recipeId = Guid.NewGuid().ToString() });
        attempt.Request = request.ToJsonString(); attempt.RequestHash = HistoryHash(attempt.Request);
        var changed = JsonNode.Parse(original)!; changed["requestHash"] = attempt.RequestHash;
        attempt.Outcome = changed.ToJsonString(); attempt.OutcomeHash = HistoryHash(attempt.Outcome);
        Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
        attempt.Request = originalRequest; attempt.RequestHash = HistoryHash(originalRequest);
        attempt.Outcome = original; attempt.OutcomeHash = HistoryHash(original);
        Assert.Equal(original, (await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync()).Outcome);
    }
}
