using Xunit;
using System.Text.Json;
using System.Reflection;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Controllers;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Workflow.Exceptions;
using RecipeApi.Infrastructure;
using RecipeApi.Tests.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Mvc;
using Moq;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

public sealed partial class WorkflowWorkerAuthorityTests
{
    [Fact]
    public Task ProcessorHistory_RetainsOnlyObservedOperationAssociationsAfterLiveChanges() => CheckProcessorAssociationsAsync(Memory());

    internal static async Task CheckProcessorAssociationsAsync(Action<DbContextOptionsBuilder> configure)
    {
        await using var fixture = new Fixture(configure, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = "Original", Notes = "original private",
            Ingredients = "[]", RawMetadata = "{\"extension\":null}", CreatedAt = fixture.Clock.UtcNow, UpdatedAt = fixture.Clock.UtcNow };
        db.Recipes.Add(recipe);
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe", recipe.Id);
        await db.SaveChangesAsync();
        var storage = new InMemoryStorageProvider();
        await new RecipeRepository(storage).SaveInfoAsync(new RecipeInfo { Id = recipe.Id, Name = recipe.Name }, default);
        var unrelated = Guid.NewGuid();
        var initial = TestPublicationStore.Create(db, storage, fixture.Clock);
        await initial.PublishAsync(await initial.CaptureAsync(recipe.Id),
            new RecipePublicationCandidate("{}", new RecipeInfo { Id = recipe.Id, Name = recipe.Name }), unrelated);
        fixture.OnExecute = async _ =>
        {
            await using var producerDb = fixture.CreateDb();
            var publisher = TestPublicationStore.Create(producerDb, storage, fixture.Clock);
            await publisher.PublishAsync(await publisher.CaptureAsync(recipe.Id),
                new RecipePublicationCandidate("{\"ingredients\":[\"salt\"],\"extension\":null}",
                    new RecipeInfo { Id = recipe.Id, Name = "Produced" }, "AuthorityProbe\n{}"), task.TaskId);
            var current = await producerDb.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipe.Id);
            await new CanonicalRecipeContentStore(producerDb, fixture.Clock,
                new SupperProjectionInvalidation(producerDb, fixture.Clock, new DeploymentCalendar(new ConfigurationManager())))
                .ConvertAsync(recipe.Id, CanonicalRecipeContentStore.InspectContentRevision(current),
                    CanonicalRecipeContentStore.InspectSourceRevision(current), task.TaskId);
        };
        await fixture.Worker.ProcessPendingTasksAsync(default);
        await using var read = fixture.CreateDb();
        var attempt = Assert.Single(await read.WorkflowProcessorAttempts.AsNoTracking().ToArrayAsync());
        using var outcome = JsonDocument.Parse(Assert.IsType<string>(attempt.Outcome));
        var publication = Assert.Single(outcome.RootElement.GetProperty("publications").EnumerateArray());
        Assert.Equal(task.TaskId, publication.GetProperty("operationId").GetGuid());
        var operation = Assert.Single(outcome.RootElement.GetProperty("canonicalOperations").EnumerateArray());
        Assert.Equal(task.TaskId, operation.GetProperty("operationId").GetGuid());
        var original = await read.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == task.TaskId);
        Assert.Equal(original.Payload, publication.GetProperty("payload").GetString());
        var canonical = await read.CanonicalRecipeOperations.AsNoTracking().SingleAsync(x => x.OperationId == task.TaskId);
        Assert.Equal(canonical.Result, operation.GetProperty("result").GetString());
        var live = await read.Recipes.SingleAsync(x => x.Id == recipe.Id);
        live.Notes = "newer private";
        read.RecipeFilePublications.RemoveRange(await read.RecipeFilePublications.Where(x => x.OperationId == task.TaskId).ToArrayAsync());
        read.CanonicalRecipeOperations.RemoveRange(await read.CanonicalRecipeOperations.Where(x => x.OperationId == task.TaskId).ToArrayAsync());
        await read.SaveChangesAsync();
        await using var retained = fixture.CreateDb();
        Assert.Equal(attempt.Outcome, (await retained.WorkflowProcessorAttempts.AsNoTracking().SingleAsync()).Outcome);
        Assert.True(await retained.RecipeFilePublications.AnyAsync(x => x.OperationId == unrelated));
        var validate = typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.WorkflowProcessorHistory")!
            .GetMethod("Validate", BindingFlags.Static | BindingFlags.Public)!;
        validate.Invoke(null, [attempt]); // Original facts validate after live journals disappear.
        var originalOutcome = attempt.Outcome!;
        void Refuse(Action<System.Text.Json.Nodes.JsonNode> change)
        {
            var changed = System.Text.Json.Nodes.JsonNode.Parse(originalOutcome)!;
            change(changed);
            attempt.Outcome = changed.ToJsonString();
            attempt.OutcomeHash = HistoryHash(attempt.Outcome);
            var rejected = Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
            Assert.True(rejected.InnerException is InvalidDataException or JsonException, rejected.ToString());
            attempt.Outcome = originalOutcome;
            attempt.OutcomeHash = HistoryHash(originalOutcome);
        }
        Refuse(node => node["canonicalOperations"]![0]!["inputHash"] = new string('0', 64));
        Assert.Equal(JsonValueKind.String, operation.GetProperty("originalRequest").ValueKind);
        Refuse(node =>
        {
            var journal = System.Text.Json.Nodes.JsonNode.Parse(node["canonicalOperations"]![0]!["originalRequest"]!.GetValue<string>())!;
            journal.AsObject().Remove("input"); // Omission is not an observed null.
            node["canonicalOperations"]![0]!["originalRequest"] = journal.ToJsonString();
        });
        Refuse(node =>
        {
            var result = System.Text.Json.Nodes.JsonNode.Parse(node["canonicalOperations"]![0]!["result"]!.GetValue<string>())!;
            result["content"]!["sourceRevision"] = "different-original-source";
            node["canonicalOperations"]![0]!["result"] = result.ToJsonString();
        });
        Refuse(node => node["publications"]![0]!["resultHash"] = new string('0', 64));
        Refuse(node =>
        {
            var journal = System.Text.Json.Nodes.JsonNode.Parse(node["publications"]![0]!["payload"]!.GetValue<string>())!;
            journal["candidate"]!["producerInput"] = "DifferentProcessor\n{}";
            node["publications"]![0]!["payload"] = journal.ToJsonString();
            node["publications"]![0]!["inputHash"] = HistoryHash(new System.Text.Json.Nodes.JsonObject
            {
                ["capture"] = journal["capture"]!.DeepClone(), ["candidate"] = journal["candidate"]!.DeepClone()
            }.ToJsonString());
            var changedJournal = node["publications"]![0]!.Deserialize<RecipeFilePublication>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            var inspect = typeof(RecipeFilePublicationStore).GetMethod("ValidateRecoveryJournal", BindingFlags.Static | BindingFlags.NonPublic)!;
            Assert.Equal("DifferentProcessor\n{}", inspect.Invoke(null, [changedJournal]));
        });
        Refuse(node =>
        {
            var result = System.Text.Json.Nodes.JsonNode.Parse(node["canonicalOperations"]![0]!["result"]!.GetValue<string>())!;
            result["content"]!.AsObject().Remove("sourceRevision");
            node["canonicalOperations"]![0]!["result"] = result.ToJsonString();
        });
        Refuse(node =>
        {
            var result = System.Text.Json.Nodes.JsonNode.Parse(node["canonicalOperations"]![0]!["result"]!.GetValue<string>())!;
            result["createdIds"]!["foreign"] = Guid.NewGuid();
            node["canonicalOperations"]![0]!["result"] = result.ToJsonString();
        });
        Refuse(node => node["canonicalOperations"]![0]!["recipeId"] = Guid.NewGuid());
        Refuse(node =>
        {
            var result = System.Text.Json.Nodes.JsonNode.Parse(node["canonicalOperations"]![0]!["result"]!.GetValue<string>())!;
            node["canonicalOperations"]![0]!["result"] = result.ToJsonString().Replace("\"sourceRevision\":",
                "\"sourceRevision\":\"contradictory\",\"sourceRevision\":", StringComparison.Ordinal);
        });

        // Qualify both edits with a supplied basis and omission-only replays,
        // including request-local allocations across ingredients/sections/steps.
        var owner = new CanonicalRecipeContentStore(retained, fixture.Clock,
            new SupperProjectionInvalidation(retained, fixture.Clock, new DeploymentCalendar(new ConfigurationManager())));
        var currentRecipe = await retained.Recipes.SingleAsync(x => x.Id == recipe.Id);
        var currentContent = CanonicalRecipeContentStore.Read(currentRecipe)!;
        var edit = new RecipeApi.Dto.UpdateRecipeDto
        {
            ExpectedContentRevision = currentContent.ContentRevision, Servings = 4,
            IngredientLines = JsonSerializer.SerializeToElement(new[] { new {
                clientId = "row", description = "oil", amount = (object?)null, amountText = (string?)null,
                unit = (object?)null, scaling = "proportional", package = (object?)null,
                shopping = new { name = "oil", foodId = (string?)null, mappingRevision = (string?)null } } }),
            InstructionSections = JsonSerializer.SerializeToElement(new[] { new { clientId = "section", name = (string?)null,
                steps = new[] { new { clientId = "step", text = "Stir." } } } })
        };
        var editId = Guid.NewGuid();
        var edited = await owner.EditAsync(recipe.Id, currentContent.SourceRevision, editId, edit);
        Assert.Equal(3, edited.CreatedIds.Count);
        Assert.Equal(HistoryHash(JsonSerializer.Serialize(edited)), HistoryHash(JsonSerializer.Serialize(await owner.EditAsync(recipe.Id, currentContent.SourceRevision, editId, edit))));
        var omitted = new RecipeApi.Dto.UpdateRecipeDto { ExpectedContentRevision = edited.Content.ContentRevision, Name = "Observed edit" };
        var omittedId = Guid.NewGuid();
        var unchangedBasis = await owner.EditAsync(recipe.Id, edited.Content.SourceRevision, omittedId, omitted);
        Assert.Equal(4, unchangedBasis.Content.Servings);
        Assert.Equal(HistoryHash(JsonSerializer.Serialize(unchangedBasis)), HistoryHash(JsonSerializer.Serialize(await owner.EditAsync(recipe.Id, edited.Content.SourceRevision, omittedId, omitted))));
        var originalEdit = await retained.CanonicalRecipeOperations.AsNoTracking().SingleAsync(x => x.OperationId == omittedId);
        var inspectOriginal = typeof(CanonicalRecipeContentStore).GetMethod("ValidateOriginalOperation", BindingFlags.Static | BindingFlags.NonPublic)!;
        Assert.Equal(true, inspectOriginal.Invoke(null, [originalEdit]));
        var oldBytes = JsonSerializer.Serialize(originalEdit);
        var old = JsonSerializer.Deserialize<CanonicalRecipeOperation>(oldBytes)!;
        old.OriginalRequest = null;
        var legacyBytes = JsonSerializer.Serialize(old);
        Assert.DoesNotContain("OriginalRequest", legacyBytes);
        Assert.Equal(false, inspectOriginal.Invoke(null, [old]));
        Assert.Equal(legacyBytes, JsonSerializer.Serialize(old));
        var changedStepInput = new RecipeApi.Dto.UpdateRecipeDto {
            ExpectedContentRevision = unchangedBasis.Content.ContentRevision,
            InstructionSections = JsonSerializer.SerializeToElement(new[] { new {
                id = edited.Content.InstructionSections[0].Id, name = (string?)null,
                steps = new[] { new { id = edited.Content.InstructionSections[0].Steps[0].Id, text = "Stir again." } } } }) };
        var stepOperation = Guid.NewGuid();
        await owner.EditAsync(recipe.Id, edited.Content.SourceRevision, stepOperation, changedStepInput);
        var stepJournal = await retained.CanonicalRecipeOperations.AsNoTracking().SingleAsync(x => x.OperationId == stepOperation);
        Assert.Equal(true, inspectOriginal.Invoke(null, [stepJournal]));
        var changedStepResult = System.Text.Json.Nodes.JsonNode.Parse(stepJournal.Result)!;
        changedStepResult["content"]!["instructionSections"]![0]!["steps"]![0]!["textRevision"] = edited.Content.InstructionSections[0].Steps[0].TextRevision;
        stepJournal.Result = changedStepResult.ToJsonString();
        var refusedRevision = Assert.Throws<TargetInvocationException>(() => inspectOriginal.Invoke(null, [stepJournal]));
        Assert.IsType<InvalidDataException>(refusedRevision.InnerException);
        // A codec-valid changed result cannot masquerade as the original edit.
        var changedResult = System.Text.Json.Nodes.JsonNode.Parse(originalEdit.Result)!;
        changedResult["content"]!["ingredientLines"]![0]!["description"] = "different oil";
        originalEdit.Result = changedResult.ToJsonString();
        var refusedEdit = Assert.Throws<TargetInvocationException>(() => inspectOriginal.Invoke(null, [originalEdit]));
        Assert.IsType<InvalidDataException>(refusedEdit.InnerException);
    }

    private static string HistoryHash(string value)
    {
        var normalize = typeof(CanonicalRecipeContentStore).GetMethod("NormalizeJson", BindingFlags.Static | BindingFlags.NonPublic)!;
        return Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(
            (string)normalize.Invoke(null, [value])!)));
    }

    [Fact]
    public Task ProcessorHistory_NullReturnIsExplicitAndDoesNotReusePriorResult() => CheckNullProcessorResultAsync(Memory());

    internal static async Task CheckNullProcessorResultAsync(Action<DbContextOptionsBuilder> configure)
    {
        await using var fixture = new Fixture(configure, "AuthorityProbe");
        fixture.Result = _ => null;
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
        await db.SaveChangesAsync();
        var originalResult = await db.WorkflowTasks.AsNoTracking().Where(x => x.TaskId == task.TaskId).Select(x => x.Result).SingleAsync();
        await fixture.Worker.ProcessPendingTasksAsync(default);
        await using var read = fixture.CreateDb();
        var attempt = Assert.Single(await read.WorkflowProcessorAttempts.AsNoTracking().ToArrayAsync());
        using var outcome = JsonDocument.Parse(Assert.IsType<string>(attempt.Outcome));
        Assert.True(outcome.RootElement.GetProperty("processorReturned").GetBoolean());
        Assert.Equal(JsonValueKind.Null, outcome.RootElement.GetProperty("returnedResult").ValueKind);
        Assert.Equal("succeeded", outcome.RootElement.GetProperty("disposition").GetString());
        Assert.Equal(originalResult, outcome.RootElement.GetProperty("task").GetProperty("result").GetString());
        Assert.Equal(TaskStatus.Completed, (await read.WorkflowTasks.SingleAsync(x => x.TaskId == task.TaskId)).Status);
        var validate = typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.WorkflowProcessorHistory")!
            .GetMethod("Validate", BindingFlags.Static | BindingFlags.Public);
        Assert.NotNull(validate);
        validate.Invoke(null, [attempt]);
        // Rehashing an omitted observation must not turn it into an explicit null.
        var node = System.Text.Json.Nodes.JsonNode.Parse(attempt.Outcome!)!;
        node.AsObject().Remove("returnedResult");
        attempt.Outcome = node.ToJsonString();
        var normalize = typeof(CanonicalRecipeContentStore).GetMethod("NormalizeJson", BindingFlags.Static | BindingFlags.NonPublic)!;
        var normalized = (string)normalize.Invoke(null, [attempt.Outcome])!;
        attempt.OutcomeHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(normalized)));
        Assert.Throws<TargetInvocationException>(() => validate.Invoke(null, [attempt]));
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(false, true)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public Task ProcessorHistory_UnacknowledgedSaveDoesNotInventAnotherOutcome(bool outcome, bool committed) =>
        CheckUnacknowledgedHistoryAsync(Memory(), outcome, committed);

    internal static async Task CheckUnacknowledgedHistoryAsync(Action<DbContextOptionsBuilder> configure, bool outcome, bool committed)
    {
        var fault = new HistorySaveFault(outcome, committed);
        await using var fixture = new Fixture(b => { configure(b); b.AddInterceptors(fault); }, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
        await db.SaveChangesAsync();
        fault.Armed = true;
        await fixture.Worker.ProcessPendingTasksAsync(default);
        Assert.False(fault.Armed);
        await using var read = fixture.CreateDb();
        var saved = await read.WorkflowTasks.SingleAsync(x => x.TaskId == task.TaskId);
        var attempts = await read.WorkflowProcessorAttempts.AsNoTracking().ToArrayAsync();
        if (!outcome && !committed)
        {
            Assert.Empty(fixture.Executed);
            Assert.Empty(attempts);
            Assert.Equal(TaskStatus.Pending, saved.Status);
        }
        else
        {
            var attempt = Assert.Single(attempts);
            Assert.Equal(outcome && committed ? TaskStatus.Completed : TaskStatus.Processing, saved.Status);
            Assert.Equal(outcome && committed, attempt.Outcome is not null);
            Assert.Equal(outcome ? 1 : 0, fixture.Executed.Count);
            Assert.Equal(outcome && committed, attempt.ObservedAt is not null);
            if (outcome && committed)
                Assert.Equal(WorkflowStatus.Completed, (await read.WorkflowInstances.SingleAsync(x => x.Id == task.InstanceId)).Status);
        }
    }

    private sealed class HistorySaveFault(bool outcome, bool committed) : SaveChangesInterceptor
    {
        public bool Armed { get; set; }
        private bool Matches(DbContext? db) => Armed && db!.ChangeTracker.Entries<WorkflowProcessorAttempt>()
            .Any(x => outcome ? x.State == EntityState.Modified && x.Entity.Outcome is not null : x.State == EntityState.Added);
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData data,
            InterceptionResult<int> result, CancellationToken ct = default)
        {
            if (!committed && Matches(data.Context)) { Armed = false; throw new IOException("before history save"); }
            return ValueTask.FromResult(result);
        }
        public override ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData data, int result, CancellationToken ct = default)
        {
            // Accepted changes are already Unchanged; identify this invocation by
            // its newly observed receipt rather than relying on tracking state.
            if (committed && Armed && data.Context!.ChangeTracker.Entries<WorkflowProcessorAttempt>()
                .Any(x => outcome ? x.Entity.Outcome is not null : x.Entity.Outcome is null))
            { Armed = false; throw new IOException("lost history acknowledgement"); }
            return ValueTask.FromResult(result);
        }
    }

    [Fact]
    public Task ProcessorHistory_OriginalAndOutcomeSurviveResetAndRemoval() => CheckProcessorHistoryAsync(Memory());

    internal static async Task CheckProcessorHistoryAsync(Action<DbContextOptionsBuilder> configure)
    {
        await using var fixture = new Fixture(configure, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
        await db.SaveChangesAsync();
        var originalCapture = await db.WorkflowInstances.AsNoTracking().Where(x => x.Id == task.InstanceId).Select(x => x.RecipePublicationCapture).SingleAsync();
        var originalResult = await db.WorkflowTasks.AsNoTracking().Where(x => x.TaskId == task.TaskId).Select(x => x.Result).SingleAsync();
        fixture.OnExecute = async _ =>
        {
            await using var started = fixture.CreateDb();
            var pending = Assert.Single(await started.WorkflowProcessorAttempts.AsNoTracking().ToArrayAsync());
            Assert.Null(pending.Outcome);
            Assert.Null(pending.OutcomeHash);
            Assert.Null(pending.ObservedAt);
        };
        await fixture.Worker.ProcessPendingTasksAsync(default);
        await using var read = fixture.CreateDb();
        var first = Assert.Single(await read.WorkflowProcessorAttempts.AsNoTracking().ToArrayAsync());
        using var request = JsonDocument.Parse(first.Request);
        Assert.Equal(originalCapture, request.RootElement.GetProperty("capture").GetString());
        Assert.Equal(originalResult, request.RootElement.GetProperty("task").GetProperty("result").GetString());
        Assert.Equal(JsonValueKind.Null, request.RootElement.GetProperty("task").GetProperty("resetIntentId").ValueKind);
        using var outcome = JsonDocument.Parse(Assert.IsType<string>(first.Outcome));
        Assert.Equal("succeeded", outcome.RootElement.GetProperty("disposition").GetString());
        using var returned = JsonDocument.Parse(outcome.RootElement.GetProperty("returnedResult").GetString()!);
        Assert.Equal(task.TaskId, returned.RootElement.GetProperty("executed").GetGuid());
        Assert.True(outcome.RootElement.GetProperty("processorReturned").GetBoolean());
        Assert.NotNull(first.OutcomeHash);
        var originalRequest = first.Request;
        var originalOutcome = first.Outcome;
        var controller = new WorkflowController(fixture.Clock, Mock.Of<IWorkflowOrchestrator>(), read,
            new DemoModeOptions(new ConfigurationManager()));
        Assert.IsType<OkObjectResult>(await controller.ResetTask(task.TaskId));
        fixture.OnExecute = null;
        await fixture.Worker.ProcessPendingTasksAsync(default);
        await using var after = fixture.CreateDb();
        var attempts = await after.WorkflowProcessorAttempts.AsNoTracking().ToArrayAsync();
        Assert.Equal(2, attempts.Length);
        Assert.Equal(originalRequest, attempts.Single(x => x.Id == first.Id).Request);
        Assert.Equal(originalOutcome, attempts.Single(x => x.Id == first.Id).Outcome);
        using var second = JsonDocument.Parse(attempts.Single(x => x.Id != first.Id).Request);
        Assert.Equal(JsonValueKind.String, second.RootElement.GetProperty("task").GetProperty("resetIntentId").ValueKind);
        var parent = await after.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == task.InstanceId);
        await using var transaction = after.Database.IsRelational() ? await after.Database.BeginTransactionAsync() : null;
        var retain = typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.WorkflowLifecycle")!
            .GetMethod("RetainAsync", BindingFlags.Static | BindingFlags.Public)!;
        await (Task)retain.Invoke(null, [after, parent, "pruned", Guid.NewGuid(), fixture.Clock.UtcNow, CancellationToken.None, null])!;
        after.WorkflowTasks.RemoveRange(parent.Tasks);
        after.WorkflowInstances.Remove(parent);
        await after.SaveChangesAsync();
        if (transaction is not null) await transaction.CommitAsync();
        await using var retained = fixture.CreateDb();
        Assert.Equal(2, await retained.WorkflowProcessorAttempts.CountAsync(x => x.TaskId == task.TaskId));
        using var lifecycle = JsonDocument.Parse((await retained.WorkflowLifecycleRecords.SingleAsync()).Payload);
        Assert.Equal(2, lifecycle.RootElement.GetProperty("processorAttempts").GetArrayLength());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public Task ProcessorHistory_FailureIsNotAResultFromAnEarlierAttempt(bool retry) => CheckProcessorFailureHistoryAsync(Memory(), retry);

    internal static async Task CheckProcessorFailureHistoryAsync(Action<DbContextOptionsBuilder> configure, bool retry)
    {
        await using var fixture = new Fixture(configure, "AuthorityProbe");
        await using var db = fixture.CreateDb();
        var task = await fixture.AddAsync(db, WorkflowStatus.Processing, "AuthorityProbe");
        await db.SaveChangesAsync();
        var originalResult = await db.WorkflowTasks.AsNoTracking().Where(x => x.TaskId == task.TaskId).Select(x => x.Result).SingleAsync();
        fixture.OnExecute = _ => throw (retry ? new TransientWorkflowException("original transient") : new InvalidOperationException("original fatal"));
        await fixture.Worker.ProcessPendingTasksAsync(default);
        await using var read = fixture.CreateDb();
        var saved = await read.WorkflowTasks.SingleAsync(x => x.TaskId == task.TaskId);
        Assert.Equal(retry ? TaskStatus.Pending : TaskStatus.Failed, saved.Status);
        Assert.Equal(originalResult, saved.Result);
        var attempt = Assert.Single(await read.WorkflowProcessorAttempts.AsNoTracking().ToArrayAsync());
        using var outcome = JsonDocument.Parse(Assert.IsType<string>(attempt.Outcome));
        Assert.Equal(retry ? "retry" : "failed", outcome.RootElement.GetProperty("disposition").GetString());
        Assert.False(outcome.RootElement.GetProperty("processorReturned").GetBoolean());
        Assert.Equal(JsonValueKind.Null, outcome.RootElement.GetProperty("returnedResult").ValueKind);
        Assert.Equal(saved.Result, outcome.RootElement.GetProperty("task").GetProperty("result").GetString());
    }
}
