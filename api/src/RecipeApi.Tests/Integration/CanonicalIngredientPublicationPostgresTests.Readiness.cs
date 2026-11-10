using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    private static async Task<WorkflowTask> ReadyTask(IServiceProvider services, RecipeFilePublicationStore store,
        RecipeRepository repository, FailingStorage storage, bool pdf = true, bool extraction = false)
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
        recipe.IsReady = false; recipe.IsDiscoverable = false; recipe.RotationHumanOff = true;
        recipe.RotationSource = "Human"; recipe.CookedSuppressed = true;
        await db.SaveChangesAsync();
        var info = await repository.GetInfoAsync(Id, default);
        info.Notes = "retained private notes"; info.IsReady = null;
        await repository.SaveInfoAsync(info, default);
        if (pdf) await storage.SaveAsync("recipes", $"{Id}/original/source.pdf", "%PDF retained source");
        var instance = new WorkflowInstance { Id = Guid.NewGuid(), WorkflowId = "ready-test",
            Parameters = JsonSerializer.Serialize(new Dictionary<string, string> { ["recipeId"] = Id.ToString() }) };
        var task = new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = instance.Id, TaskName = "recipe_ready",
            ProcessorName = "RecipeReady", Payload = JsonSerializer.Serialize(new { recipeId = Id }) };
        instance.Tasks.Add(task);
        if (extraction)
        {
            task.DependsOn = ["extract"];
            instance.Tasks.Add(new WorkflowTask { TaskId = Guid.NewGuid(), InstanceId = instance.Id, TaskName = "extract",
                ProcessorName = "ExtractRecipe", Payload = task.Payload });
        }
        await store.CaptureLaunchAsync(instance);
        db.WorkflowInstances.Add(instance); await db.SaveChangesAsync();
        return task;
    }

    private static Task<object?> RunReady(IServiceProvider services, RecipeFilePublicationStore store, WorkflowTask task) =>
        new RecipeReadyProcessor(services.GetRequiredService<RecipeDbContext>(), NullLogger<RecipeReadyProcessor>.Instance,
            Mock.Of<IScheduleEventPublisher>(), store).ExecuteAsync(task, default);

    private static string? ReadReadyJournal(RecipeFilePublication journal) =>
        (string?)typeof(RecipeFilePublicationStore).GetMethod("ValidateRecoveryJournal", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.NonPublic)!
            .Invoke(null, [journal]);

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Ready_CanonicalFactsRemainExactThroughMetadataCommitDeliveryAndReplay()
    {
        foreach (var pdf in new[] { true, false })
            await WithStore(async (services, repository, store, storage) =>
            {
                await SeedCurrentReplayAsync(services, repository);
                var task = await ReadyTask(services, store, repository, storage, pdf: pdf);
                var before = await store.CaptureAsync(Id);
                var db = services.GetRequiredService<RecipeDbContext>();
                if (pdf)
                {
                    storage.FailInfo = true;
                    await Assert.ThrowsAsync<IOException>(() => RunReady(services, store, task));
                    Assert.False((await db.RecipeFilePublications.AsNoTracking().SingleAsync()).Delivered);
                    Assert.True((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)).IsReady);
                    Assert.Null((await repository.GetInfoAsync(Id, default)).IsReady);
                }
                else await RunReady(services, store, task);

                await using var fresh = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>()
                    .UseNpgsql(db.Database.GetConnectionString()!).Options);
                var owner = new RecipeFilePublicationStore(fresh, repository, services.GetRequiredService<IClock>(),
                    new SupperProjectionInvalidation(fresh, services.GetRequiredService<IClock>(), services.GetRequiredService<DeploymentCalendar>()));
                storage.FailInfo = false;
                var events = new Mock<IScheduleEventPublisher>();
                var receipt = await new RecipeReadyProcessor(fresh, NullLogger<RecipeReadyProcessor>.Instance,
                    events.Object, owner).ExecuteAsync(task, default);
                var observed = JsonSerializer.SerializeToElement(receipt, new JsonSerializerOptions(JsonSerializerDefaults.Web));
                Assert.Equal("Ready", observed.GetProperty("status").GetString());
                Assert.Equal(Id, observed.GetProperty("recipeId").GetGuid());
                events.Verify(x => x.PublishRecipeReadyAsync(Id, It.IsAny<string>(), It.IsAny<string?>(), null), Times.Once);
                events.VerifyNoOtherCalls();
                var after = await owner.CaptureAsync(Id);
                Assert.Equal(JsonSerializer.Serialize(before.Fields! with { IsReady = true }), JsonSerializer.Serialize(after.Fields));
                foreach (var (path, bytes) in before.Files.Where(x => x.Key != "recipe.info"))
                    Assert.Equal(bytes, after.Files[path]);
                var info = await repository.GetInfoAsync(Id, default);
                Assert.Equal(pdf ? true : (bool?)null, info.IsReady);
                Assert.Equal("retained private notes", info.Notes);
                if (!pdf) Assert.Equal(before.Files["recipe.info"], after.Files["recipe.info"]);
                var journal = await fresh.RecipeFilePublications.AsNoTracking().SingleAsync();
                Assert.True(journal.Delivered);
                Assert.Equal("RecipeReady\n" + HistoricalNormalizeJson(task.Payload), ReadReadyJournal(journal));
                var writes = storage.AtomicWrites;
                Assert.True(await owner.CompleteReadinessAsync(task, Id));
                Assert.Equal(writes, storage.AtomicWrites);
                Assert.Equal(journal.Payload, (await fresh.RecipeFilePublications.AsNoTracking().SingleAsync()).Payload);
                Assert.Equal(after.Fields!.CanonicalContent, HistoricalNormalizeJson(
                    (await fresh.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)).CanonicalContent));
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Ready_CanonicalEditAfterCaptureCannotBeReplacedOrFinalizedByStaleReadiness()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var export = await SeedCurrentReplayAsync(services, repository);
            var task = await ReadyTask(services, store, repository, storage);
            var db = services.GetRequiredService<RecipeDbContext>();
            var editor = services.GetRequiredService<CanonicalRecipeContentStore>();
            await editor.EditAsync(Id, export.Content.SourceRevision, Guid.NewGuid(), new RecipeApi.Dto.UpdateRecipeDto
            { ExpectedContentRevision = export.Content.ContentRevision, Servings = 5 });
            var changed = (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)).CanonicalContent;
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => RunReady(services, store, task));
            var actual = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            Assert.Equal(changed, actual.CanonicalContent);
            Assert.False(actual.IsReady);
            Assert.False(await db.RecipeFilePublications.AnyAsync());
            Assert.Null((await repository.GetInfoAsync(Id, default)).IsReady);
            Assert.Equal(RecipeExportContent.WriteCurrent(export), await repository.GetRecipeJsonAsync(Id, default));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Ready_CanonicalPermissionDoesNotAuthorizeExtractionOrSemanticReplacement()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var export = await SeedCurrentReplayAsync(services, repository);
            var ready = await ReadyTask(services, store, repository, storage, extraction: true);
            var db = services.GetRequiredService<RecipeDbContext>();
            var extract = await db.WorkflowTasks.SingleAsync(x => x.InstanceId == ready.InstanceId && x.ProcessorName == "ExtractRecipe");
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.CaptureForTaskAsync(extract, Id));
            var before = await store.CaptureAsync(Id);
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.PublishAsync(before, Candidate(), Guid.NewGuid()));
            Assert.False(await db.RecipeFilePublications.AnyAsync());
            var after = await store.CaptureAsync(Id);
            Assert.Equal(JsonSerializer.Serialize(before.Fields), JsonSerializer.Serialize(after.Fields));
            Assert.Equal(RecipeExportContent.WriteCurrent(export), await repository.GetRecipeJsonAsync(Id, default));
            Assert.False((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)).IsReady);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Ready_UsesCapturedExtractionAncestor_AndBothJournalsReadBackThroughTheirOwner()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var ready = await ReadyTask(services, store, repository, storage, extraction: true);
            var db = services.GetRequiredService<RecipeDbContext>();
            var instance = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == ready.InstanceId);
            var extract = instance.Tasks.Single(x => x.TaskName == "extract");
            var input = "ExtractRecipe\n" + HistoricalNormalizeJson(extract.Payload);
            await store.PublishAsync(await store.CaptureForTaskAsync(extract, Id), Candidate() with { ProducerInput = input }, extract.TaskId);
            await RunReady(services, store, ready);
            Assert.Equal(Replacement, await repository.GetRecipeJsonAsync(Id, default));
            Assert.True((await repository.GetInfoAsync(Id, default)).IsReady);
            var journals = await db.RecipeFilePublications.AsNoTracking().ToDictionaryAsync(x => x.OperationId);
            Assert.Equal(2, journals.Count); Assert.All(journals.Values, x => Assert.True(x.Delivered));
            Assert.Equal(input, ReadReadyJournal(journals[extract.TaskId]));
            Assert.Equal("RecipeReady\n" + HistoricalNormalizeJson(ready.Payload),
                ReadReadyJournal(journals[ready.TaskId]));
            typeof(RecipeFilePublicationStore).GetMethod("ValidateRecoveryPublicationChain", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.NonPublic)!
                .Invoke(null, [instance, journals]);
            var writes = storage.AtomicWrites;
            await RunReady(services, store, ready);
            Assert.Equal(writes, storage.AtomicWrites);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Ready_ReceiptAndDatabaseCommitPrecedePdfDelivery_ThenFreshScopeResumesOriginal()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var task = await ReadyTask(services, store, repository, storage);
            var db = services.GetRequiredService<RecipeDbContext>();
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => RunReady(services, store, task));
            var journal = await db.RecipeFilePublications.AsNoTracking().SingleAsync();
            Assert.False(journal.Delivered);
            Assert.Null((await repository.GetInfoAsync(Id, default)).IsReady);
            await using var independent = new RecipeDbContext(new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(db.Database.GetConnectionString()!).Options);
            var actual = await independent.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            Assert.True(actual.IsReady); Assert.False(actual.IsDiscoverable);
            Assert.True(actual.RotationHumanOff); Assert.True(actual.CookedSuppressed); Assert.Equal("Human", actual.RotationSource);
            Assert.Equal(journal.Payload, (await independent.RecipeFilePublications.AsNoTracking().SingleAsync()).Payload);
            var owner = new RecipeFilePublicationStore(independent, repository, services.GetRequiredService<IClock>(),
                new SupperProjectionInvalidation(independent, services.GetRequiredService<IClock>(), services.GetRequiredService<DeploymentCalendar>()));
            storage.FailInfo = false;
            Assert.True(await owner.CompleteReadinessAsync(task, Id));
            Assert.True((await repository.GetInfoAsync(Id, default)).IsReady);
            Assert.Equal("retained private notes", (await repository.GetInfoAsync(Id, default)).Notes);
            Assert.Equal(journal.Payload, (await independent.RecipeFilePublications.AsNoTracking().SingleAsync()).Payload);
            var writes = storage.AtomicWrites;
            Assert.True(await owner.CompleteReadinessAsync(task, Id));
            Assert.Equal(writes, storage.AtomicWrites);
            Assert.Equal(actual.UpdatedAt, (await independent.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)).UpdatedAt);
            Assert.Equal(Original, await repository.GetRecipeJsonAsync(Id, default));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Ready_CapturedSourceOrStageRaceRejectsBeforeAnyReadyMutation()
    {
        foreach (var phase in new[] { "before", "stage" })
            await WithStore(async (services, repository, store, storage) =>
            {
                var task = await ReadyTask(services, store, repository, storage);
                Task Change() => storage.SaveAsync("recipes", $"{Id}/original/source.pdf", "replacement PDF");
                if (phase == "before") await Change(); else storage.BeforeStage = Change;
                await Assert.ThrowsAsync<RecipeContentConflictException>(() => RunReady(services, store, task));
                var db = services.GetRequiredService<RecipeDbContext>();
                Assert.False((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id)).IsReady);
                Assert.False(await db.RecipeFilePublications.AnyAsync());
                Assert.Null((await repository.GetInfoAsync(Id, default)).IsReady);
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Ready_PendingReceiptCannotRepairChangedSourceOrReversedReadiness()
    {
        foreach (var change in new[] { "source", "ready" })
            await WithStore(async (services, repository, store, storage) =>
            {
                var task = await ReadyTask(services, store, repository, storage);
                storage.FailInfo = true;
                await Assert.ThrowsAsync<IOException>(() => RunReady(services, store, task));
                var db = services.GetRequiredService<RecipeDbContext>();
                var journal = await db.RecipeFilePublications.AsNoTracking().SingleAsync();
                if (change == "source") await storage.SaveAsync("recipes", $"{Id}/original/source.pdf", "new PDF");
                else
                {
                    var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                    recipe.IsReady = false; await db.SaveChangesAsync();
                }
                storage.FailInfo = false;
                await Assert.ThrowsAsync<RecipeContentConflictException>(() => RunReady(services, store, task));
                Assert.Null((await repository.GetInfoAsync(Id, default)).IsReady);
                Assert.False((await db.RecipeFilePublications.AsNoTracking().SingleAsync()).Delivered);
                Assert.Equal(journal.Payload, (await db.RecipeFilePublications.AsNoTracking().SingleAsync()).Payload);
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Ready_NoPdfSelectsNoFiles_AndAlreadyReadyHistoryDoesNotCreateAnAuthority()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var task = await ReadyTask(services, store, repository, storage, pdf: false);
            var info = await storage.LoadAsync("recipes", $"{Id}/recipe.info");
            await RunReady(services, store, task);
            Assert.Equal(info, await storage.LoadAsync("recipes", $"{Id}/recipe.info"));
            var db = services.GetRequiredService<RecipeDbContext>();
            Assert.True((await db.RecipeFilePublications.SingleAsync()).Delivered);
            Assert.True((await db.Recipes.SingleAsync(x => x.Id == Id)).IsReady);
        });
        await WithStore(async (services, repository, store, storage) =>
        {
            var task = await ReadyTask(services, store, repository, storage);
            var db = services.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id); recipe.IsReady = true;
            await db.SaveChangesAsync();
            var info = await storage.LoadAsync("recipes", $"{Id}/recipe.info");
            await RunReady(services, store, task);
            Assert.Equal(info, await storage.LoadAsync("recipes", $"{Id}/recipe.info"));
            Assert.False(await db.RecipeFilePublications.AnyAsync());
        });
    }
}
