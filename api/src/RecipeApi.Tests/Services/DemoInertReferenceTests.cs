using System.Reflection;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class DemoInertReferenceTests
{
    [Fact]
    public Task InputlessVisitor_RemainsStrictUntilDemoInvalidationThenRetainsRawFailedRows() => Check(null);

    [Theory]
    [InlineData("payload")]
    [InlineData("result")]
    [InlineData("dependency")]
    [InlineData("child")]
    [InlineData("reset")]
    [InlineData("hash")]
    [InlineData("unknown")]
    [InlineData("captured-task")]
    [InlineData("attempt")]
    [InlineData("claimed")]
    [InlineData("retry")]
    [InlineData("error")]
    public Task UnreviewedAuthorityOrCorruptOriginal_RejectsBeforeDemoWrites(string mutation) => Check(mutation);

    private static async Task Check(string? mutation)
    {
        var configuration = new ConfigurationManager { ["DataRoot"] = Path.Combine(Path.GetTempPath(), "wfs-demo-reference-" + Guid.NewGuid().ToString("N")) };
        var data = new DataRootResolver(configuration);
        var roots = new RecipesRootResolver(data, configuration);
        await using var db = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning)).Options);
        var clock = new SystemClock();
        var boundary = new RecoveryBoundary(db, configuration, roots);
        var vocabulary = new FoodVocabularyStore(db, new InMemoryStorageProvider(), roots, boundary, clock);
        var at = clock.UtcNow;
        var instance = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "dreaming", Parameters = "{}", Status = WorkflowStatus.Pending,
            CreatedAt = at, UpdatedAt = at };
        var original = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = instance.Id, TaskName = "maintenance",
            ProcessorName = "ProcessMaintenanceCommands", Payload = "{}", Status = RecipeApi.Models.TaskStatus.Pending,
            ScheduledAt = at.AddHours(1), CreatedAt = at, UpdatedAt = at };
        instance.Tasks.Add(original);
        typeof(RecipeFilePublicationStore).GetMethod("CaptureDispatchLaunch", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [instance]);
        var extra = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = instance.Id, TaskName = "unreviewed",
            ProcessorName = "GenerateHero", Status = RecipeApi.Models.TaskStatus.Pending, ScheduledAt = at.AddHours(1), CreatedAt = at, UpdatedAt = at };
        instance.Tasks.Add(extra);
        switch (mutation)
        {
            case "claimed": extra.Status = RecipeApi.Models.TaskStatus.Processing; break;
            case "retry": extra.RetryCount = 1; break;
            case "error": extra.ErrorMessage = "Earlier failure"; break;
            case "payload": extra.Payload = "{\"foodAuthority\":{\"revision\":\"future\"}}"; break;
            case "result": extra.Result = "{}"; break;
            case "dependency": extra.DependsOn = [original.TaskName]; break;
            case "child": extra.ChildLaunchIntentId = Guid.NewGuid(); break;
            case "reset": extra.ResetIntentId = Guid.NewGuid(); break;
            case "hash":
            case "unknown":
                var node = JsonNode.Parse(instance.RecipePublicationCapture!)!;
                if (mutation == "hash") node["inputHash"] = new string('0', 64);
                else node["foodAuthority"] = new JsonObject();
                instance.RecipePublicationCapture = node.ToJsonString();
                break;
            case "captured-task": original.Payload = "{\"changed\":true}"; break;
            case "attempt":
                typeof(RecipeFilePublicationStore).Assembly.GetType("RecipeApi.Services.WorkflowProcessorHistory")!
                    .GetMethod("Begin", BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic)!
                    .Invoke(null, [db, extra, instance, at]);
                break;
        }
        db.WorkflowInstances.Add(instance);
        await db.SaveChangesAsync();
        var beforeCapture = instance.RecipePublicationCapture;
        var ordinaryError = await Record.ExceptionAsync(() => vocabulary.CaptureActiveAsync());
        Assert.True(ordinaryError is InvalidDataException or System.Text.Json.JsonException, ordinaryError?.ToString());
        var recovery = new RecoverySnapshotService(db, roots, data, configuration, clock, boundary, vocabulary);
        var guard = typeof(RecoverySnapshotService).GetMethod("RequireLegacyDemoFoodFreeAsync", BindingFlags.Instance | BindingFlags.NonPublic)!;
        if (mutation is not null)
        {
            var error = await Record.ExceptionAsync(() => (Task)guard.Invoke(recovery, [CancellationToken.None, true])!);
            Assert.True(error is InvalidDataException or System.Text.Json.JsonException, error?.ToString());
            Assert.Equal(WorkflowStatus.Pending, instance.Status);
            Assert.Equal(mutation == "claimed" ? RecipeApi.Models.TaskStatus.Processing : RecipeApi.Models.TaskStatus.Pending, extra.Status);
        }
        else
        {
            await Assert.ThrowsAsync<InvalidDataException>(() => (Task)guard.Invoke(recovery, [CancellationToken.None, false])!);
            await (Task)guard.Invoke(recovery, [CancellationToken.None, true])!;
            Assert.Equal(WorkflowStatus.Pending, instance.Status);
            instance.Status = WorkflowStatus.Failed;
            foreach (var task in instance.Tasks)
            { task.Status = RecipeApi.Models.TaskStatus.Failed; task.ErrorMessage = "Invalidated by demo reset"; }
            extra.ErrorMessage = "Unowned failure";
            await db.SaveChangesAsync();
            await Assert.ThrowsAsync<InvalidDataException>(() => vocabulary.CaptureActiveAsync());
            extra.ErrorMessage = "Invalidated by demo reset";
            await db.SaveChangesAsync();
            Assert.Null(await vocabulary.CaptureActiveAsync());
            var execution = typeof(RecipeFilePublicationStore).GetMethod("ValidateExecutionLaunch", BindingFlags.Static | BindingFlags.NonPublic)!;
            Assert.IsType<InvalidDataException>(Assert.Throws<TargetInvocationException>(() => execution.Invoke(null, [instance])).InnerException);
        }
        Assert.Equal(beforeCapture, instance.RecipePublicationCapture);
        Assert.Equal(2, await db.WorkflowTasks.CountAsync());
        Assert.False(await db.FamilySettings.AnyAsync(x => x.Key == "food_vocabulary_publication"));
    }
}
