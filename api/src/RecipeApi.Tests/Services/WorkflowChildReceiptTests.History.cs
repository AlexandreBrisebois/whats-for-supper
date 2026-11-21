using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class WorkflowChildReceiptTests
{
    [Theory]
    [InlineData(false, false)]
    [InlineData(false, true)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public Task ProcessorHistory_BindsOriginalSelectedChild(bool search, bool recovered) => CheckChildHistory(search, recovered);

    [Fact]
    public Task ProcessorHistory_PreservesOriginalChildSchedule() => CheckChildHistory(false, false, scheduled: true);

    internal static async Task CheckChildHistory(bool search, bool recovered,
        Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null, bool scheduled = false)
    {
        await using var f = await Fixture.Create(search, configure);
        f.Parent.ResetIntentId = Guid.NewGuid();
        if (scheduled)
        {
            f.Parent.Payload = """{"workflowId":"child","schedule":{"cron":"0 8 * * *"}}""";
            var launchParent = await f.Db.WorkflowInstances.SingleAsync(x => x.Id == f.Parent.InstanceId);
            launchParent.RecipePublicationCapture = null;
            await RecipeApi.Tests.Infrastructure.TestPublicationStore.Create(f.Db, f.Storage,
                new SystemClock()).CaptureLaunchAsync(launchParent);
        }
        await f.Db.SaveChangesAsync();
        if (recovered)
        {
            await f.Execute();
            (await f.Db.WorkflowInstances.SingleAsync(x => x.WorkflowId == f.ChildId)).Status = WorkflowStatus.Paused;
        }
        f.Parent.Status = RecipeApi.Models.TaskStatus.Pending;
        await f.Db.SaveChangesAsync();
        Assert.Equal(1, await f.Pickup());
        await using var read = f.Read();
        var attempt = await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync();
        var validate = typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.WorkflowProcessorHistory")!
            .GetMethod("Validate", BindingFlags.Static | BindingFlags.Public)!;
        validate.Invoke(null, [attempt]);
        var original = attempt.Outcome!;
        var observed = JsonNode.Parse(original)!;
        var intent = await read.WorkflowChildIntents.AsNoTracking().SingleAsync();

        void Refuse(Action<JsonNode> change)
        {
            var wire = JsonNode.Parse(original)!; change(wire);
            attempt.Outcome = wire.ToJsonString(); attempt.OutcomeHash = ChildHistoryHash(attempt.Outcome);
            var error = Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
            Assert.True(error.InnerException is InvalidDataException or JsonException, error.ToString());
            attempt.Outcome = original; attempt.OutcomeHash = ChildHistoryHash(original);
        }
        void Returned(JsonNode wire, Action<JsonNode> change)
        {
            var result = JsonNode.Parse(wire["returnedResult"]!.GetValue<string>())!; change(result);
            wire["returnedResult"] = result.ToJsonString(); wire["task"]!["result"] = result.ToJsonString();
        }
        Refuse(wire => Returned(wire, result => result[search ? "workflowInstanceId" : "instanceId"] = Guid.NewGuid()));
        Assert.NotNull(observed["childCommand"]);
        Assert.Equal(intent.Request, observed["childCommand"]!["request"]!.GetValue<string>());
        Assert.Equal(intent.Prepared, observed["childCommand"]!["prepared"]!.GetValue<string>());
        Assert.Equal(intent.Id, observed["selectedChildLaunchIntentId"]!.GetValue<Guid>());
        Refuse(wire => wire["childCommand"] = null);
        Refuse(wire => wire.AsObject().Remove("childCommand"));
        Refuse(wire => wire["childCommand"]!["acceptedAt"] = null);
        Refuse(wire => wire["childCommand"]!["parentTaskId"] = Guid.NewGuid());
        Refuse(wire => wire["selectedChildLaunchIntentId"] = Guid.NewGuid());
        Refuse(wire =>
        {
            var command = wire["childCommand"]!;
            var request = JsonNode.Parse(command["request"]!.GetValue<string>())!;
            request["ResetIntentId"] = Guid.NewGuid();
            command["request"] = request.ToJsonString(); command["requestHash"] = ChildHistoryHash(request.ToJsonString());
        });
        Refuse(wire =>
        {
            var command = wire["childCommand"]!;
            var prepared = JsonNode.Parse(command["prepared"]!.GetValue<string>())!;
            prepared["Tasks"]![0]!["Payload"] = "{\"forged\":true}";
            command["prepared"] = prepared.ToJsonString(); command["preparedHash"] = ChildHistoryHash(prepared.ToJsonString());
        });
        if (search)
            Refuse(wire => Returned(wire, result => result["recipeId"] = Guid.NewGuid()));
        else
        {
            Refuse(wire => Returned(wire, result => result["workflowId"] = "unrelated"));
            Refuse(wire => Returned(wire, result => result["scheduledAt"] = DateTimeOffset.UtcNow.AddDays(1)));
        }
        var extended = JsonNode.Parse(original)!;
        Returned(extended, result => result["futureObservation"] = "preserve unqualified");
        attempt.Outcome = extended.ToJsonString(); attempt.OutcomeHash = ChildHistoryHash(attempt.Outcome);
        validate.Invoke(null, [attempt]);
        // An earlier observation has no original command capture. Preserve it
        // without upgrading current graph membership into causal authority.
        var historical = JsonNode.Parse(original)!; historical["version"] = 1; historical.AsObject().Remove("childCommand");
        attempt.Outcome = historical.ToJsonString(); attempt.OutcomeHash = ChildHistoryHash(attempt.Outcome);
        validate.Invoke(null, [attempt]);

        // Only this fixture's live graph/journal/source is changed. The frozen
        // command must validate independently, including after history pruning.
        var child = await read.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == intent.Id);
        read.WorkflowInstances.Remove(child);
        read.WorkflowChildIntents.Remove(await read.WorkflowChildIntents.SingleAsync());
        var parent = await read.WorkflowTasks.SingleAsync(x => x.TaskId == f.Parent.TaskId);
        parent.ChildLaunchIntentId = null; parent.ResetIntentId = Guid.NewGuid();
        (await read.Recipes.SingleAsync()).Name = "new human content";
        await read.SaveChangesAsync();
        await f.Storage.SaveAsync("workflows", f.ChildId + ".yaml", "invalid: [");
        attempt.Outcome = original; attempt.OutcomeHash = ChildHistoryHash(original);
        validate.Invoke(null, [attempt]);
        Assert.Equal(original, (await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync()).Outcome);
    }

    [Theory]
    [InlineData("capture-failed")]
    [InlineData("missing-recipe")]
    [InlineData("deleted-recipe")]
    public Task ProcessorHistory_RetainsIncompleteChildObservations(string mode) => CheckIncompleteChildHistory(mode);

    internal static async Task CheckIncompleteChildHistory(string mode,
        Action<DbContextOptionsBuilder<RecipeDbContext>>? configure = null)
    {
        var failed = mode == "capture-failed";
        await using var f = await Fixture.Create(!failed, configure);
        if (failed) await f.Storage.SaveAsync("workflows", "child.yaml", "invalid: [");
        else
        {
            var recipe = await f.Db.Recipes.SingleAsync();
            if (mode == "missing-recipe") f.Db.Recipes.Remove(recipe);
            else recipe.DeletedAt = DateTimeOffset.UtcNow;
        }
        f.Parent.Status = RecipeApi.Models.TaskStatus.Pending;
        await f.Db.SaveChangesAsync();
        await f.Pickup();
        await using var read = f.Read();
        var attempt = await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync();
        var validate = typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.WorkflowProcessorHistory")!
            .GetMethod("Validate", BindingFlags.Static | BindingFlags.Public)!;
        validate.Invoke(null, [attempt]);
        var original = attempt.Outcome!;
        var wire = JsonNode.Parse(original)!;
        if (failed)
        {
            Assert.False(wire["processorReturned"]!.GetValue<bool>());
            Assert.Null(wire["returnedResult"]);
            Assert.NotNull(wire["childCommand"]);
            Assert.Null(wire["childCommand"]!["prepared"]);
            Assert.Null(wire["childCommand"]!["acceptedAt"]);
            foreach (var field in new[] { "prepared", "preparedHash", "acceptedAt" })
            {
                var absent = JsonNode.Parse(original)!;
                absent["childCommand"]!.AsObject().Remove(field);
                attempt.Outcome = absent.ToJsonString(); attempt.OutcomeHash = ChildHistoryHash(attempt.Outcome);
                var missing = Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
                Assert.True(missing.InnerException is InvalidDataException or JsonException, missing.ToString());
            }
            wire["childCommand"]!["acceptedAt"] = DateTimeOffset.UtcNow;
        }
        else
        {
            Assert.True(wire["processorReturned"]!.GetValue<bool>());
            Assert.Null(wire["selectedChildLaunchIntentId"]);
            Assert.Null(wire["childCommand"]);
            var result = JsonNode.Parse(wire["returnedResult"]!.GetValue<string>())!;
            Assert.Equal("Skipped", result["status"]!.GetValue<string>());
            result["recipeId"] = Guid.NewGuid();
            wire["returnedResult"] = result.ToJsonString(); wire["task"]!["result"] = result.ToJsonString();
        }
        attempt.Outcome = wire.ToJsonString(); attempt.OutcomeHash = ChildHistoryHash(attempt.Outcome);
        var error = Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
        Assert.True(error.InnerException is InvalidDataException or JsonException, error.ToString());
        Assert.Empty(await read.WorkflowInstances.Where(x => x.WorkflowId == f.ChildId).ToArrayAsync());
        Assert.Equal(original, (await read.WorkflowProcessorAttempts.AsNoTracking().SingleAsync()).Outcome);
    }

    private static string ChildHistoryHash(string value)
    {
        object? Sort(JsonElement element) => element.ValueKind switch
        {
            JsonValueKind.Object => element.EnumerateObject().OrderBy(x => x.Name, StringComparer.Ordinal).ToDictionary(x => x.Name, x => Sort(x.Value)),
            JsonValueKind.Array => element.EnumerateArray().Select(Sort).ToArray(),
            _ => element.Clone()
        };
        using var doc = JsonDocument.Parse(value);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(Sort(doc.RootElement)))));
    }
}
