using System.Text.Json;
using RecipeApi.Models;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class RecipeDispatchLaunchTests
{
    private static void Validate(WorkflowInstance instance, bool retainUncaptured = false)
    {
        // Exercise the existing recovery owner without widening its public API.
        var method = typeof(RecipeFilePublicationStore).GetMethod("ValidateRecoveryLaunch",
            System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.NonPublic)!;
        try { method.Invoke(null, [instance, retainUncaptured]); }
        catch (System.Reflection.TargetInvocationException error)
        { System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(error.InnerException!).Throw(); }
    }

    private static WorkflowInstance Instance(string processor = "StartWorkflow")
    {
        var instance = new WorkflowInstance
        {
            Id = Guid.NewGuid(), WorkflowId = "maintenance",
            Parameters = JsonSerializer.Serialize(new Dictionary<string, string> { ["private"] = "original intent" })
        };
        instance.Tasks.Add(new WorkflowTask
        {
            TaskId = Guid.NewGuid(), InstanceId = instance.Id, TaskName = "dispatch", ProcessorName = processor,
            Payload = """{"workflowId":"child","parameters":{"private":"original intent"}}""",
            ScheduledAt = DateTimeOffset.Parse("2026-11-08T01:00:00Z")
        });
        return instance;
    }

    [Fact]
    public void HistoricalReadyDispatchIsRetainedInertWithoutBecomingPublicationAuthority()
    {
        var instance = Instance("RecipeReady");
        var recipe = Guid.NewGuid();
        var task = instance.Tasks.Single();
        var parameters = new Dictionary<string, string> { ["recipeId"] = recipe.ToString() };
        instance.Parameters = JsonSerializer.Serialize(parameters);
        task.Payload = JsonSerializer.Serialize(new { recipeId = recipe });
        // Freeze the exact earlier dispatch shape independently of today's writer
        // classification. It never captured source files or publication authority.
        var tasks = new Dictionary<Guid, object> { [task.TaskId] = new { name = task.TaskName,
            processor = task.ProcessorName, payload = task.Payload, dependsOn = task.DependsOn, scheduledAt = task.ScheduledAt } };
        var facts = new { version = 1, kind = "dispatch", instanceId = instance.Id, workflowId = instance.WorkflowId, parameters, tasks };
        string Normalize(JsonElement value) => JsonSerializer.Serialize(Order(value));
        object? Order(JsonElement value) => value.ValueKind switch
        {
            JsonValueKind.Object => value.EnumerateObject().OrderBy(x => x.Name, StringComparer.Ordinal)
                .ToDictionary(x => x.Name, x => Order(x.Value)),
            JsonValueKind.Array => value.EnumerateArray().Select(Order).ToArray(),
            _ => value.Clone()
        };
        var frozen = JsonSerializer.SerializeToNode(facts)!;
        frozen["inputHash"] = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(Normalize(JsonSerializer.SerializeToElement(facts)))));
        var original = instance.RecipePublicationCapture = frozen.ToJsonString();
        Validate(instance, retainUncaptured: true);
        Assert.Equal(original, instance.RecipePublicationCapture);
        Assert.Throws<InvalidDataException>(() => Validate(instance));
        task.Payload = JsonSerializer.Serialize(new { recipeId = Guid.NewGuid() });
        Assert.Throws<InvalidDataException>(() => Validate(instance, retainUncaptured: true));
    }

    [Theory]
    [InlineData("StartWorkflow")]
    [InlineData("CompleteRecipeImportReport")]
    [InlineData("QueueRecipeSearchIndex")]
    public void UncapturedDispatchCannotClaimCapturedAuthority(string processor)
    {
        var instance = Instance(processor);
        Assert.Throws<InvalidDataException>(() => Validate(instance));
        // Retention of old work is explicitly nonexecuting and remains available.
        Validate(instance, retainUncaptured: true);
    }

    [Theory]
    [InlineData("StartWorkflow")]
    [InlineData("CompleteRecipeImportReport")]
    [InlineData("QueueRecipeSearchIndex")]
    [InlineData("IndexRecipeSearch")]
    [InlineData("UnknownExtension")]
    public async Task NonwriterLaunchCapturesIntentWithoutReadingRecipeStorage(string processor)
    {
        await using var db = TestDbContextFactory.Create();
        var store = TestPublicationStore.Create(db, new InMemoryStorageProvider(), new SystemClock());
        await db.DisposeAsync(); // Any recipe/database read would fail.
        var instance = Instance(processor);
        await store.CaptureLaunchAsync(instance);
        Assert.NotNull(instance.RecipePublicationCapture);
        Validate(instance);
        using var saved = JsonDocument.Parse(instance.RecipePublicationCapture!);
        Assert.Equal(instance.Id, saved.RootElement.GetProperty("instanceId").GetGuid());
        Assert.False(saved.RootElement.TryGetProperty("capture", out _));
        Assert.Contains("original intent", instance.RecipePublicationCapture);
    }

    [Theory]
    [InlineData("workflow")]
    [InlineData("parameters")]
    [InlineData("instance")]
    [InlineData("payload")]
    [InlineData("processor")]
    [InlineData("name")]
    [InlineData("dependencies")]
    [InlineData("task-id")]
    [InlineData("membership")]
    public async Task CapturedDispatchRejectsChangedIntentEvenWhenRawFactsAgree(string mutation)
    {
        await using var db = TestDbContextFactory.Create();
        var store = TestPublicationStore.Create(db, new InMemoryStorageProvider(), new SystemClock());
        var instance = Instance();
        await store.CaptureLaunchAsync(instance);
        var task = instance.Tasks.Single();
        switch (mutation)
        {
            case "workflow": instance.WorkflowId = "different"; break;
            case "parameters": instance.Parameters = """{"private":"changed"}"""; break;
            case "instance": instance.Id = Guid.NewGuid(); task.InstanceId = instance.Id; break;
            case "payload": task.Payload = """{"workflowId":"other","parameters":{}}"""; break;
            case "processor": task.ProcessorName = "Other"; break;
            case "name": task.TaskName = "other"; break;
            case "dependencies": task.DependsOn = ["other"]; break;
            case "task-id": task.TaskId = Guid.NewGuid(); break;
            case "membership": instance.Tasks.Clear(); break;
        }
        Assert.Throws<InvalidDataException>(() => Validate(instance));
    }

    [Fact]
    public async Task RetryAndCompletionFactsRemainIndependentFromOriginalLaunchIntent()
    {
        await using var db = TestDbContextFactory.Create();
        var store = TestPublicationStore.Create(db, new InMemoryStorageProvider(), new SystemClock());
        var instance = Instance();
        await store.CaptureLaunchAsync(instance);
        var original = instance.RecipePublicationCapture;
        var task = instance.Tasks.Single();
        task.ScheduledAt = task.ScheduledAt!.Value.AddDays(2); task.RetryCount = 3;
        task.Status = RecipeApi.Models.TaskStatus.Completed; task.Result = """{"instanceId":"original receipt"}""";
        instance.Status = WorkflowStatus.Completed;
        Validate(instance);
        Assert.NotNull(original);
        using var saved = JsonDocument.Parse(original!);
        Assert.Equal(DateTimeOffset.Parse("2026-11-08T01:00:00Z"), saved.RootElement.GetProperty("tasks")
            .GetProperty(task.TaskId.ToString()).GetProperty("scheduledAt").GetDateTimeOffset());
        Assert.Equal(original, instance.RecipePublicationCapture);
    }
}
