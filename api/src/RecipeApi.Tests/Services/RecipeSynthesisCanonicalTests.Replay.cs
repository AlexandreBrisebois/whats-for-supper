using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed partial class RecipeSynthesisCanonicalTests
{
    private const string ReplayGeneratedJson = """{"name":"Generated pasta","recipeYield":"4 servings","recipeIngredient":["200 g pasta"],"recipeInstructions":[{"name":"Cook","itemListElement":[{"text":"Cook the pasta."}]}]}""";

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public Task SynthesizedPublication_InterruptedDeliveryResumesOnceAndPreservesLaterHumanEdits(bool rejectNewerPending) =>
        WithAcceptedSynthesis((_, services, task, id) => QualifyReplayAsync(services, task, id, rejectNewerPending));

    internal static Task QualifySynthesizedReplayAsync(TestWebApplicationFactory factory, bool rejectNewerPending) =>
        WithAcceptedSynthesis(factory, (_, services, task, id) => QualifyReplayAsync(services, task, id, rejectNewerPending));

    private static async Task QualifyReplayAsync(IServiceProvider services, WorkflowTask task, Guid id, bool rejectNewerPending)
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var storage = new InterruptedSynthesisStorage(services.GetRequiredService<IStorageProvider>());
            var clock = services.GetRequiredService<IClock>();
            var publisher = new RecipeFilePublicationStore(db, new RecipeRepository(storage), clock,
                services.GetRequiredService<SupperProjectionInvalidation>(), TestPublicationStore.Vocabulary(db, storage, clock, services));
            var calls = 0;
            var agent = ReplayAgent(publisher, _ => { calls++; return Task.CompletedTask; });
            storage.FailJson = true;
            await Assert.ThrowsAsync<IOException>(() => agent.ExecuteAsync(task, default));
            var recipe = await db.Recipes.SingleAsync(x => x.Id == id);
            var original = recipe.CanonicalContent;
            Assert.NotNull(original);
            var journal = await db.RecipeFilePublications.SingleAsync(x => x.OperationId == task.TaskId);
            Assert.False(journal.Delivered);
            storage.FailJson = false;
            var beforeReplay = calls;
            if (rejectNewerPending)
            {
                recipe.Name = "Newer human name";
                recipe.Description = "";
                await db.SaveChangesAsync();
                var files = SynthesisFiles(services.GetRequiredService<RecipesRootResolver>().Root);
                await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.ExecuteAsync(task, default));
                Assert.Equal(beforeReplay, calls);
                Assert.Equal(files, SynthesisFiles(services.GetRequiredService<RecipesRootResolver>().Root));
                Assert.False(journal.Delivered);
                Assert.Equal(original, recipe.CanonicalContent);
                Assert.Equal("Newer human name", recipe.Name);
                return;
            }
            await agent.ExecuteAsync(task, default);
            Assert.Equal(beforeReplay, calls);
            Assert.True(journal.Delivered);
            await db.Entry(journal).ReloadAsync();
            var retainedJournal = journal.Payload;
            var deliveredFiles = SynthesisFiles(services.GetRequiredService<RecipesRootResolver>().Root);
            recipe.Name = "Newer human name";
            recipe.Description = "";
            recipe.Notes = "Newer private note";
            await db.SaveChangesAsync();
            await agent.ExecuteAsync(task, default);
            Assert.Equal(beforeReplay, calls);
            db.ChangeTracker.Clear();
            var after = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.Equal(("Newer human name", "", "Newer private note", original),
                (after.Name, after.Description, after.Notes, after.CanonicalContent));
            Assert.Equal(deliveredFiles, SynthesisFiles(services.GetRequiredService<RecipesRootResolver>().Root));
            Assert.Equal(retainedJournal, (await db.RecipeFilePublications.SingleAsync(x => x.OperationId == task.TaskId)).Payload);
        }

    [Theory]
    [InlineData("source-file")]
    [InlineData("human-name")]
    public Task SynthesizedPublication_ConcurrentInputChangeRejectsStaleGeneratedOutput(string change) =>
        WithAcceptedSynthesis((_, services, task, id) => QualifyConcurrentAsync(services, task, id, change));

    internal static Task QualifySynthesisConcurrentAsync(TestWebApplicationFactory factory, string change) =>
        WithAcceptedSynthesis(factory, (_, services, task, id) => QualifyConcurrentAsync(services, task, id, change));

    private static async Task QualifyConcurrentAsync(IServiceProvider services, WorkflowTask task, Guid id, string change)
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var storage = services.GetRequiredService<IStorageProvider>();
            var publisher = services.GetRequiredService<RecipeFilePublicationStore>();
            var changed = false;
            var agent = ReplayAgent(publisher, async _ =>
            {
                if (changed) return;
                changed = true;
                if (change == "source-file") await storage.SaveAsync("recipes", $"{id}/original/content.html", "Newer source bytes");
                else
                {
                    var recipe = await db.Recipes.SingleAsync(x => x.Id == id);
                    recipe.Name = "Newer human name";
                    recipe.Description = "";
                    await db.SaveChangesAsync();
                }
            });
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.ExecuteAsync(task, default));
            db.ChangeTracker.Clear();
            var after = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.Null(after.CanonicalContent);
            Assert.Null(after.RawMetadata);
            Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == task.TaskId));
            if (change == "source-file")
                Assert.Equal("Newer source bytes", System.Text.Encoding.UTF8.GetString((await storage.LoadAsync("recipes", $"{id}/original/content.html"))!));
            else Assert.Equal(("Newer human name", ""), (after.Name, after.Description));
        }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public Task SynthesizedPublication_ProviderFailureOrCancellationLeavesAcceptedScaffoldUnchanged(bool cancel) =>
        WithAcceptedSynthesis(async (_, services, task, id) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            using var cancellation = new CancellationTokenSource();
            var agent = ReplayAgent(services.GetRequiredService<RecipeFilePublicationStore>(), _ =>
            {
                if (!cancel) throw new IOException("Controlled synthesis provider failure");
                cancellation.Cancel();
                cancellation.Token.ThrowIfCancellationRequested();
                return Task.CompletedTask;
            });
            var root = services.GetRequiredService<RecipesRootResolver>().Root;
            var files = SynthesisFiles(root);
            if (cancel) await Assert.ThrowsAnyAsync<OperationCanceledException>(() => agent.ExecuteAsync(task, cancellation.Token));
            else await Assert.ThrowsAsync<IOException>(() => agent.ExecuteAsync(task, default));
            db.ChangeTracker.Clear();
            var after = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.Null(after.CanonicalContent);
            Assert.Null(after.RawMetadata);
            Assert.False(after.IsReady);
            Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == task.TaskId));
            Assert.Equal(files, SynthesisFiles(root));
        });

    private static RecipeAgent ReplayAgent(RecipeFilePublicationStore publisher, Func<CancellationToken, Task> beforeResponse)
    {
        var chat = new Mock<IChatClient>();
        chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .Returns(async (IEnumerable<ChatMessage> messages, ChatOptions _, CancellationToken token) =>
            {
                await beforeResponse(token);
                return new ChatResponse(new ChatMessage(ChatRole.Assistant,
                    messages.Any(x => x.Text.StartsWith("Description: ", StringComparison.Ordinal)) ? ReplayGeneratedJson : "Generated narrative."));
            });
        var prompts = new Mock<IPromptRepository>();
        prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Generate the selected recipe response.");
        return new(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance, publisher, "SynthesizeRecipe");
    }

    private static async Task WithAcceptedSynthesis(Func<TestWebApplicationFactory, IServiceProvider, WorkflowTask, Guid, Task> qualify)
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
        { ["Tests:LocalRecipeStore"] = "true", ["Tests:RealWorkflowOrchestrator"] = "true" });
        await WithAcceptedSynthesis(factory, qualify);
    }

    private static async Task WithAcceptedSynthesis(TestWebApplicationFactory factory,
        Func<TestWebApplicationFactory, IServiceProvider, WorkflowTask, Guid, Task> qualify)
    {
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        await services.GetRequiredService<IStorageProvider>().SaveAsync("workflows", "goto-synthesis.yaml", await File.ReadAllTextAsync(Path.Combine(
            Integration.DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi/Workflows/goto-synthesis.yaml")));
        using var client = factory.CreateAuthenticatedClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        using var response = await client.PostAsJsonAsync("/api/recipes/describe", new { name = "Requested pasta", description = "A pasta supper." });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetProperty("id").GetGuid();
        var task = await services.GetRequiredService<RecipeDbContext>().WorkflowTasks.SingleAsync(x => x.ProcessorName == "SynthesizeRecipe");
        await qualify(factory, services, task, id);
    }

    private static string SynthesisFiles(string root) => string.Join("\n", Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories)
        .Order(StringComparer.Ordinal).Select(path => Path.GetRelativePath(root, path) + ":" + Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)))));

    private sealed class InterruptedSynthesisStorage(IStorageProvider inner) : IStorageProvider
    {
        public bool FailJson { get; set; }
        public Task SaveAsync(string partition, string key, string value) => inner.SaveAsync(partition, key, value);
        public Task SaveAsync(string partition, string key, byte[] value) => inner.SaveAsync(partition, key, value);
        public Task SaveAtomicallyAsync(string partition, string key, byte[] value) => FailJson && key.EndsWith("/recipe.json", StringComparison.Ordinal)
            ? throw new IOException("Controlled synthesis delivery interruption") : inner.SaveAtomicallyAsync(partition, key, value);
        public Task DeleteAtomicallyAsync(string partition, string key) => inner.DeleteAtomicallyAsync(partition, key);
        public Task<byte[]?> LoadAsync(string partition, string key) => inner.LoadAsync(partition, key);
        public Task<List<KeyValuePair<string, string>>> FindAsync(string partition, string key) => inner.FindAsync(partition, key);
        public List<string> List(string partition) => inner.List(partition);
    }
}
