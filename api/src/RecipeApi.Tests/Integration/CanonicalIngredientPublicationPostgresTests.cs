using RecipeApi.Tests.Infrastructure;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using Xunit;
using Xunit.Abstractions;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests(ITestOutputHelper output)
{
    private static readonly Guid Id = TomorrowPushPostgresTests.Selected;
    private const string Original = """{"name":"Original","recipeIngredient":["salt"],"recipeInstructions":[{"@type":"HowToStep","text":"Mix."}]}""";
    private const string Replacement = """{"name":"Replacement","recipeIngredient":["pepper"],"recipeInstructions":[{"@type":"HowToStep","text":"Stir."}]}""";

    private async Task WithStore(Func<IServiceProvider, RecipeRepository, RecipeFilePublicationStore, FailingStorage, Task> action, bool localRecipeStore = false, Action<IServiceCollection>? configureServices = null)
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var settingsOverrides = new Dictionary<string, string?>
            { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString };
            if (localRecipeStore) settingsOverrides["Tests:LocalRecipeStore"] = "true";
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(),
                settingsOverrides, configureServices: configureServices);
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            recipe.RawMetadata = Original; recipe.Ingredients = "[\"salt\"]"; recipe.Servings = null;
            await db.SaveChangesAsync();
            var storage = new FailingStorage(services.GetRequiredService<IStorageProvider>());
            var repository = new RecipeRepository(storage);
            await repository.SaveInfoAsync(new RecipeInfo { Id = Id, Name = "Original", ImageCount = 1 }, default);
            await repository.SaveRecipeJsonAsync(Id, Original, default);
            await repository.SaveOriginalImageAsync(Id, 0, "image/png", [1, 2, 3], default);
            await repository.SaveContentHtmlAsync(Id, "retained source", default);
            var store = new RecipeFilePublicationStore(db, repository, services.GetRequiredService<IClock>(),
                services.GetRequiredService<SupperProjectionInvalidation>(), TestPublicationStore.Vocabulary(db, repository.StorageProvider, services.GetRequiredService<IClock>(), services));
            await action(services, repository, store, storage);
        });
    }

    private static RecipePublicationCandidate Candidate() => new(Replacement, new RecipeInfo { Id = Id, Name = "Replacement", ImageCount = 1, Description = "Generated description" });

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Agent_SynthesisAndSeparateDescriptionPreserveNewerHumanFieldsAndAllLiveFiles()
    {
        foreach (var processor in new[] { "SynthesizeRecipe", "GenerateDescription" })
            await WithStore(async (services, repository, store, _) =>
            {
                var db = services.GetRequiredService<RecipeDbContext>();
                var chat = new Mock<IChatClient>();
                chat.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .Returns(async () =>
                    {
                        var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                        recipe.Name = "New human name"; recipe.Description = "";
                        await db.SaveChangesAsync();
                        return new ChatResponse(new ChatMessage(ChatRole.Assistant,
                            processor == "SynthesizeRecipe" ? Replacement : "Delayed generated description"));
                    });
                var prompts = new Mock<IPromptRepository>();
                prompts.Setup(p => p.GetPrompt(It.IsAny<PromptType>())).Returns("Test generation prompt");
                var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                    NullLogger<RecipeAgent>.Instance, store, processor);
                await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.ExecuteAsync(new WorkflowTask
                {
                    TaskId = Guid.NewGuid(), Payload = JsonSerializer.Serialize(new { recipeId = Id, description = "Make soup" })
                }, default));
                Assert.Equal(Original, await repository.GetRecipeJsonAsync(Id, default));
                Assert.Equal("Original", (await repository.GetInfoAsync(Id, default)).Name);
                Assert.Equal(new byte[] { 1, 2, 3 }, await repository.GetOriginalImageAsync(Id, 0, default));
                var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
                Assert.Equal("New human name", saved.Name); Assert.Equal("", saved.Description);
                Assert.False(await db.RecipeFilePublications.AnyAsync());
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PendingDelivery_RejectsNewerDatabaseOrSourceAndCorruptJournalWithoutOverwritingFiles()
    {
        foreach (var change in new[] { "database", "source", "journal" })
            await WithStore(async (services, repository, store, storage) =>
            {
                var operation = Guid.NewGuid();
                var capture = await store.CaptureAsync(Id);
                storage.FailInfo = true;
                await Assert.ThrowsAsync<IOException>(() => store.PublishAsync(capture, Candidate(), operation));
                storage.FailInfo = false;
                var db = services.GetRequiredService<RecipeDbContext>();
                if (change == "database")
                {
                    var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                    recipe.Name = "New human name"; await db.SaveChangesAsync();
                }
                else if (change == "source") await repository.SaveContentHtmlAsync(Id, "New retained source", default);
                else
                {
                    var journal = await db.RecipeFilePublications.SingleAsync();
                    journal.InputHash = "corrupt"; await db.SaveChangesAsync();
                }
                var jsonBefore = await repository.GetRecipeJsonAsync(Id, default);
                var infoBefore = JsonSerializer.Serialize(await repository.GetInfoAsync(Id, default));
                if (change == "journal") await Assert.ThrowsAsync<InvalidDataException>(() => store.ResumeAsync(Id, operation));
                else await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.ResumeAsync(Id, operation));
                Assert.Equal(jsonBefore, await repository.GetRecipeJsonAsync(Id, default));
                Assert.Equal(infoBefore, JsonSerializer.Serialize(await repository.GetInfoAsync(Id, default)));
                Assert.False((await db.RecipeFilePublications.SingleAsync()).Delivered);
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Sync_AfterCommittedWorkflowPublicationDoesNotReplayFilesOverNewHumanFields()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var operation = Guid.NewGuid(); var instance = Guid.NewGuid();
            db.WorkflowInstances.Add(new WorkflowInstance { Id = instance, WorkflowId = "recipe-import" });
            db.WorkflowTasks.Add(new WorkflowTask { TaskId = operation, InstanceId = instance, ProcessorName = "ExtractRecipe", TaskName = "extract_recipe" });
            await db.SaveChangesAsync();
            await store.PublishAsync(await store.CaptureAsync(Id), Candidate(), operation);
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            recipe.Name = "New human name"; recipe.Description = "";
            await db.SaveChangesAsync();
            await new SyncRecipeProcessor(services.GetRequiredService<IClock>(), db, repository,
                services.GetRequiredService<SupperProjectionInvalidation>(), Mock.Of<ISupperProjectionPublisher>(),
                NullLogger<SyncRecipeProcessor>.Instance, TestPublicationStore.Vocabulary(db, (repository).StorageProvider, services.GetRequiredService<IClock>(), services)).ExecuteAsync(new WorkflowTask { InstanceId = instance,
                    Payload = JsonSerializer.Serialize(new { recipeId = Id }) }, default);
            await db.Entry(recipe).ReloadAsync();
            Assert.Equal("New human name", recipe.Name); Assert.Equal("", recipe.Description);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Agent_DeliveryRetryDoesNotCallProviderAgainAndChangedPayloadConflicts()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var chat = new Mock<IChatClient>(); var calls = 0;
            chat.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .Returns(() => Task.FromResult(new ChatResponse(new ChatMessage(ChatRole.Assistant, ++calls == 1 ? Replacement : "Generated description"))));
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(p => p.GetPrompt(It.IsAny<PromptType>())).Returns("Test extraction prompt");
            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
            var task = new WorkflowTask { TaskId = Guid.NewGuid(), Payload = JsonSerializer.Serialize(new { recipeId = Id }) };
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => agent.ExecuteAsync(task, default));
            Assert.Equal(2, calls);
            storage.FailInfo = false;
            await agent.ExecuteAsync(task, default);
            await agent.ExecuteAsync(task, default);
            Assert.Equal(2, calls);
            var otherProcessor = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "GenerateDescription");
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => otherProcessor.ExecuteAsync(task, default));
            task.Payload = JsonSerializer.Serialize(new { recipeId = Id, repairNote = "Changed operation input" });
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.ExecuteAsync(task, default));
            Assert.Equal(2, calls);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task Agent_DelayedExtractionDoesNotReplaceLiveFilesAfterHumanEdit()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var chat = new Mock<IChatClient>();
            chat.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .Returns(async () =>
                {
                    var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                    recipe.Name = "New human name"; recipe.Description = "New human description";
                    await db.SaveChangesAsync();
                    return new ChatResponse(new ChatMessage(ChatRole.Assistant, Replacement));
                });
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(p => p.GetPrompt(It.IsAny<PromptType>())).Returns("Test extraction prompt");
            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.DoExtractRecipeAsync(Id, default));
            Assert.Equal(Original, await repository.GetRecipeJsonAsync(Id, default));
            Assert.Equal("Original", (await repository.GetInfoAsync(Id, default)).Name);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CapturedPublication_RejectsStaleFullCandidateBeforeAnyLiveReplacement()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            var captured = await store.CaptureAsync(Id);
            var db = services.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            recipe.Description = "New human description"; recipe.Name = "New human name";
            await db.SaveChangesAsync();
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.PublishAsync(captured, Candidate(), Guid.NewGuid()));
            await db.Entry(recipe).ReloadAsync();
            Assert.Equal("New human name", recipe.Name); Assert.Equal("New human description", recipe.Description);
            Assert.Equal(Original, await repository.GetRecipeJsonAsync(Id, default));
            Assert.Equal("Original", (await repository.GetInfoAsync(Id, default)).Name);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CapturedPublication_SourceMediaChangeRejectsCandidateAndPreservesNewEvidence()
    {
        await WithStore(async (_, repository, store, _) =>
        {
            var captured = await store.CaptureAsync(Id);
            await repository.SaveOriginalImageAsync(Id, 0, "image/png", [4, 5, 6], default);
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.PublishAsync(captured, Candidate(), Guid.NewGuid()));
            Assert.Equal(Original, await repository.GetRecipeJsonAsync(Id, default));
            Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(Id, 0, default));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CapturedPublication_PostCommitFileFailureResumesExactlyAndReplaysWithoutNewMutation()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var captured = await store.CaptureAsync(Id);
            var operation = Guid.NewGuid();
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => store.PublishAsync(captured, Candidate(), operation));
            var db = services.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            await db.Entry(recipe).ReloadAsync();
            Assert.Equal("Replacement", recipe.Name); Assert.Equal("Generated description", recipe.Description);
            var stamp = recipe.UpdatedAt;
            storage.FailInfo = false;
            await store.ResumeAsync(Id, operation);
            Assert.Equal(Replacement, await repository.GetRecipeJsonAsync(Id, default));
            Assert.Equal("Replacement", (await repository.GetInfoAsync(Id, default)).Name);
            var writes = storage.AtomicWrites;
            await store.PublishAsync(captured, Candidate(), operation);
            Assert.Equal(writes, storage.AtomicWrites);
            await db.Entry(recipe).ReloadAsync(); Assert.Equal(stamp, recipe.UpdatedAt);
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.PublishAsync(captured,
                Candidate() with { RecipeJson = Original }, operation));
            Assert.Equal(new byte[] { 1, 2, 3 }, await repository.GetOriginalImageAsync(Id, 0, default));
            Assert.Equal("retained source", await repository.GetContentHtmlAsync(Id, default));
            Assert.Equal("pending", (await db.RecipeSearchDocuments.SingleAsync(x => x.RecipeId == Id)).IndexStatus);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task CapturedPublication_ConvertedOwnerRemainsFencedBeforeFilesOrFieldsChange()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            await new CanonicalRecipeContentStore(db, services.GetRequiredService<IClock>(),
                services.GetRequiredService<SupperProjectionInvalidation>(), TestPublicationStore.Vocabulary(db, services.GetRequiredService<IStorageProvider>(), services.GetRequiredService<IClock>(), services)).ConvertAsync(Id,
                CanonicalRecipeContentStore.InspectContentRevision(recipe), CanonicalRecipeContentStore.InspectSourceRevision(recipe), Guid.NewGuid());
            var captured = await store.CaptureAsync(Id);
            var canonical = recipe.CanonicalContent;
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.PublishAsync(captured, Candidate(), Guid.NewGuid()));
            await db.Entry(recipe).ReloadAsync(); Assert.Equal(canonical, recipe.CanonicalContent);
            Assert.Equal(Original, await repository.GetRecipeJsonAsync(Id, default));
        });
    }

    private sealed class FailingStorage(IStorageProvider inner) : IStorageProvider
    {
        public bool FailInfo { get; set; }
        public bool FailJson { get; set; }
        public int AtomicWrites { get; private set; }
        public Func<Task>? BeforeStage { get; set; }
        public Task SaveAsync(string partition, string key, string value) => SaveAsync(partition, key, System.Text.Encoding.UTF8.GetBytes(value));
        public Task SaveAsync(string partition, string key, byte[] value) => FailInfo && key.EndsWith("/recipe.info", StringComparison.Ordinal)
            ? throw new IOException("Simulated file delivery interruption") : inner.SaveAsync(partition, key, value);
        public async Task SaveAtomicallyAsync(string partition, string key, byte[] value)
        {
            AtomicWrites++;
            if (BeforeStage is { } callback && key.Contains("/.publications/", StringComparison.Ordinal)) await callback();
            if (FailInfo && key.EndsWith("/recipe.info", StringComparison.Ordinal) || FailJson && key.EndsWith("/recipe.json", StringComparison.Ordinal)) throw new IOException("Simulated file delivery interruption");
            await inner.SaveAtomicallyAsync(partition, key, value);
        }
        public Task DeleteAtomicallyAsync(string partition, string key) => inner.DeleteAtomicallyAsync(partition, key);
        public Task<byte[]?> LoadAsync(string partition, string key) => inner.LoadAsync(partition, key);
        public Task<List<KeyValuePair<string, string>>> FindAsync(string partition, string key) => inner.FindAsync(partition, key);
        public List<string> List(string partition) => inner.List(partition);
    }
}
