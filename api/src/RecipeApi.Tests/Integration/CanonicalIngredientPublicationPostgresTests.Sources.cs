using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    private async Task<WorkflowInstance> Launch(IServiceProvider services, RecipeDbContext db)
    {
        var storage = services.GetRequiredService<IStorageProvider>();
        await storage.SaveAsync("workflows", "guarded-web.yaml", """
            name: guarded-web
            parameters: [recipeId, url]
            tasks:
              - name: acquire
                processor: FetchUrlContent
                payload: {recipeId: "{{ recipeId }}", url: "{{ url }}"}
              - name: extract
                processor: ExtractRecipe
                depends_on: [acquire]
                payload: {recipeId: "{{ recipeId }}"}
              - name: hero
                processor: GenerateHero
                depends_on: [extract]
                payload: {recipeId: "{{ recipeId }}"}
            """);
        return await new WorkflowOrchestrator(services.GetRequiredService<IClock>(), new WorkflowRepository(storage), db, RecipeApi.Tests.Infrastructure.TestPublicationStore.Create(db, storage, services.GetRequiredService<IClock>()))
            .TriggerAsync("guarded-web", new() { ["recipeId"] = Id.ToString(), ["url"] = "https://example.test/recipe" });
    }

    private sealed class SourceHandler(Action onFetch, string response = "new acquired source") : HttpMessageHandler
    {
        public int Calls { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Calls++; onFetch();
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(response) });
        }
    }

    private static WebAcquisitionAgent Web(RecipeFilePublicationStore store, HttpMessageHandler handler, string context = "{\"name\":\"Acquired name\"}")
    {
        var chat = new Mock<IChatClient>();
        chat.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, context)));
        var prompts = new Mock<IPromptRepository>();
        prompts.Setup(p => p.GetPrompt(It.IsAny<PromptType>())).Returns("Extract context");
        return new WebAcquisitionAgent(chat.Object, store, prompts.Object, new HttpClient(handler), NullLogger<WebAcquisitionAgent>.Instance);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task ManualOriginalCorrection_PreventsCapturedExtractionReplacingIngredientsAndSteps()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            var capture = await store.CaptureAsync(Id);
            var instructions = JsonSerializer.SerializeToElement(new[] { new { text = "Taste and adjust salt." } });
            await services.GetRequiredService<RecipeService>().UpdateRecipe(Id, new RecipeApi.Dto.UpdateRecipeDto
            { Ingredients = ["Salt as I prefer"], RecipeInstructions = instructions });
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => store.PublishAsync(capture, Candidate(), Guid.NewGuid()));
            var saved = await services.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == Id);
            Assert.Equal("[\"Salt as I prefer\"]", saved.Ingredients);
            Assert.Equal("Taste and adjust salt.", JsonDocument.Parse(saved.RawMetadata!).RootElement.GetProperty("recipeInstructions")[0].GetProperty("text").GetString());
            Assert.Equal(Original, await repository.GetRecipeJsonAsync(Id, default));
            Assert.Equal("retained source", await repository.GetContentHtmlAsync(Id, default));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task WorkflowLaunch_CapturesBeforeAcquisitionAndRejectsHumanEditBeforeProvider()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var instance = await Launch(services, db);
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
            recipe.Name = "Later human name"; await db.SaveChangesAsync();
            var handler = new SourceHandler(() => { });
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => Web(store, handler)
                .ExecuteAsync(instance.Tasks.Single(t => t.ProcessorName == "FetchUrlContent"), default));
            Assert.Equal(0, handler.Calls);
            Assert.Equal("retained source", await repository.GetContentHtmlAsync(Id, default));
            Assert.Equal("Original", (await repository.GetInfoAsync(Id, default)).Name);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task WebAcquisition_StagesBeforeGuardedCommitAndDeliveryRetryDoesNotFetchAgain()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var instance = await Launch(services, db);
            var handler = new SourceHandler(() => Assert.Equal("retained source", repository.GetContentHtmlAsync(Id, default).GetAwaiter().GetResult()));
            var agent = Web(store, handler);
            var task = instance.Tasks.Single(t => t.ProcessorName == "FetchUrlContent");
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => agent.ExecuteAsync(task, default));
            Assert.False((await db.RecipeFilePublications.SingleAsync()).Delivered);
            storage.FailInfo = false;
            await agent.ExecuteAsync(task, default);
            var writes = storage.AtomicWrites;
            await agent.ExecuteAsync(task, default);
            Assert.Equal(writes, storage.AtomicWrites);
            Assert.Equal(1, handler.Calls);
            Assert.Equal("new acquired source", await repository.GetContentHtmlAsync(Id, default));
            Assert.Equal(Original, await repository.GetRecipeJsonAsync(Id, default));
            Assert.Equal("https://example.test/recipe", (await repository.GetInfoAsync(Id, default)).SourceUrl);
        });
    }
    private sealed class PageRenderer(Func<Task<IReadOnlyList<byte[]>>> render) : IPdfPageRenderer
    {
        public Task<IReadOnlyList<byte[]>> RenderAsync(Stream source, CancellationToken ct) => render();
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PdfConversion_DelayedPagesDoNotOverwriteNewHumanFactsOrOriginals()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var files = new LocalRecipeStore(services.GetRequiredService<RecipesRootResolver>(), NullLogger<LocalRecipeStore>.Instance);
            await files.SaveSourcePdfAsync(Id, new MemoryStream([7, 8]));
            var info = await repository.GetInfoAsync(Id, default);
            info.ImageCount = 0; await repository.SaveInfoAsync(info, default);
            var before = await repository.GetOriginalImageAsync(Id, 0, default);
            var renderer = new PageRenderer(async () =>
            {
                var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                recipe.Name = "Later human name"; await db.SaveChangesAsync();
                return new byte[][] { [4, 5, 6] };
            });
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => new RecipeApi.Services.Processors.PdfConversionProcessor(
                store, renderer).ExecuteAsync(new WorkflowTask
                { TaskId = Guid.NewGuid(), Payload = JsonSerializer.Serialize(new { recipeId = Id }) }, default));
            Assert.Equal(before, await repository.GetOriginalImageAsync(Id, 0, default));
            Assert.Equal(0, (await repository.GetInfoAsync(Id, default)).ImageCount);
        });
    }

    private sealed class HeroClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task HeroGeneration_DelayedImageDoesNotReplaceNewHumanFacts()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var handler = new SourceHandler(() =>
            {
                var recipe = db.Recipes.Single(x => x.Id == Id);
                recipe.Name = "Later human name"; db.SaveChanges();
            }, """{"candidates":[{"content":{"parts":[{"inlineData":{"mimeType":"image/webp","data":"BAUG"}}]}}]}""");
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            { ["GEMINI_API_KEY"] = "synthetic-key" }).Build();
            var agent = new RecipeHeroAgent(store, config,
                NullLogger<RecipeHeroAgent>.Instance, new HeroClientFactory(handler));
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.CreateHeroImageAsync(Id, force: true));
            Assert.Equal(1, handler.Calls);
            Assert.False(File.Exists(Path.Combine(services.GetRequiredService<RecipesRootResolver>().Root, Id.ToString(), "hero.webp")));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task WorkflowPublicationChain_UsesAcquiredSourceAndRejectsLaterHumanEdit()
    {
        foreach (var edit in new[] { false, true })
            await WithStore(async (services, repository, store, storage) =>
            {
                var db = services.GetRequiredService<RecipeDbContext>();
                var instance = await Launch(services, db);
                await Web(store, new SourceHandler(() => { })).ExecuteAsync(instance.Tasks.Single(t => t.ProcessorName == "FetchUrlContent"), default);
                if (edit)
                {
                    var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                    recipe.Description = "Later human description"; await db.SaveChangesAsync();
                }
                var calls = 0;
                var chat = new Mock<IChatClient>();
                chat.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .Returns((IEnumerable<ChatMessage> messages, ChatOptions? options, CancellationToken ct) =>
                    {
                        if (++calls == 1) Assert.Contains("new acquired source", string.Join("\n", messages.Select(m => m.Text)));
                        return Task.FromResult(new ChatResponse(new ChatMessage(ChatRole.Assistant, calls == 1 ? Replacement : "Generated description")));
                    });
                var prompts = new Mock<IPromptRepository>();
                prompts.Setup(p => p.GetPrompt(It.IsAny<PromptType>())).Returns("Extract captured source");
                var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
                var task = instance.Tasks.Single(t => t.ProcessorName == "ExtractRecipe");
                if (edit)
                {
                    await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.ExecuteAsync(task, default));
                    Assert.Equal(0, calls); Assert.Equal(Original, await repository.GetRecipeJsonAsync(Id, default));
                }
                else
                {
                    await agent.ExecuteAsync(task, default);
                    Assert.Equal(2, calls);
                    using var saved = JsonDocument.Parse(await repository.GetRecipeJsonAsync(Id, default));
                    Assert.Equal("Replacement", saved.RootElement.GetProperty("name").GetString());
                    Assert.Equal("pepper", saved.RootElement.GetProperty("recipeIngredient")[0].GetString());
                    Assert.Equal(2, await db.RecipeFilePublications.CountAsync());
                    var heroHandler = new SourceHandler(() => { }, """{"candidates":[{"content":{"parts":[{"inlineData":{"mimeType":"image/webp","data":"BAUG"}}]}}]}""");
                    var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["GEMINI_API_KEY"] = "synthetic-key" }).Build();
                    var hero = new RecipeHeroAgent(store, config, NullLogger<RecipeHeroAgent>.Instance, new HeroClientFactory(heroHandler));
                    var heroTask = instance.Tasks.Single(x => x.ProcessorName == "GenerateHero");
                    await hero.ExecuteAsync(heroTask, default);
                    var writes = storage.AtomicWrites;
                    await hero.ExecuteAsync(heroTask, default);
                    Assert.Equal(writes, storage.AtomicWrites); Assert.Equal(1, heroHandler.Calls);
                    Assert.Equal(3, await db.RecipeFilePublications.CountAsync());
                    var current = await db.Recipes.SingleAsync(x => x.Id == Id); current.Name = "Newer human name"; await db.SaveChangesAsync();
                    await new RecipeApi.Services.Processors.SyncRecipeProcessor(services.GetRequiredService<IClock>(), db, repository,
                        services.GetRequiredService<SupperProjectionInvalidation>(), Mock.Of<ISupperProjectionPublisher>(),
                        NullLogger<RecipeApi.Services.Processors.SyncRecipeProcessor>.Instance).ExecuteAsync(new WorkflowTask
                        { InstanceId = instance.Id, Payload = JsonSerializer.Serialize(new { recipeId = Id }) }, default);
                    Assert.Equal("Newer human name", (await db.Recipes.SingleAsync(x => x.Id == Id)).Name);
                    Assert.All(await db.RecipeFilePublications.ToListAsync(), publication => Assert.True(publication.Delivered));
                }
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task PdfPublication_InterruptedPageMembershipResumesWithoutRenderingAgain()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var files = new LocalRecipeStore(services.GetRequiredService<RecipesRootResolver>(), NullLogger<LocalRecipeStore>.Instance);
            await files.SaveSourcePdfAsync(Id, new MemoryStream([7, 8]));
            var info = await repository.GetInfoAsync(Id, default);
            info.ImageCount = 0; await repository.SaveInfoAsync(info, default);
            var calls = 0;
            var renderer = new PageRenderer(() => { calls++; return Task.FromResult<IReadOnlyList<byte[]>>(new byte[][] { [4, 5], [6, 7] }); });
            var processor = new RecipeApi.Services.Processors.PdfConversionProcessor(store, renderer);
            var task = new WorkflowTask { TaskId = Guid.NewGuid(), Payload = JsonSerializer.Serialize(new { recipeId = Id }) };
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => processor.ExecuteAsync(task, default));
            var db = services.GetRequiredService<RecipeDbContext>();
            Assert.False((await db.RecipeFilePublications.SingleAsync()).Delivered);
            Assert.Equal(2, (await db.Recipes.SingleAsync(x => x.Id == Id)).ImageCount);
            Assert.Equal(0, (await repository.GetInfoAsync(Id, default)).ImageCount);
            storage.FailInfo = false;
            await processor.ExecuteAsync(task, default);
            var writes = storage.AtomicWrites;
            await processor.ExecuteAsync(task, default);
            Assert.Equal(writes, storage.AtomicWrites); Assert.Equal(1, calls);
            Assert.Equal(2, (await repository.GetInfoAsync(Id, default)).ImageCount);
            Assert.Equal(new byte[] { 6, 7 }, await repository.GetOriginalImageAsync(Id, 1, default));
            await using var pdf = await files.ReadSourcePdfAsync(Id);
            Assert.Equal(7, pdf!.ReadByte());
        });
    }

    private sealed class AcquisitionMediaHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            HttpContent content = request.RequestUri!.AbsolutePath == "/hero"
                ? new ByteArrayContent([4, 5, 6]) : new StringContent("new acquired source");
            if (request.RequestUri.AbsolutePath == "/hero") content.Headers.ContentType = new("image/png");
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = content });
        }
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task WebPublication_ReplacesSelectedImageAlternativesAndRetainsPriorBytesAndPrivateNotes()
    {
        await WithStore(async (services, repository, store, _) =>
        {
            await repository.SaveOriginalImageAsync(Id, 0, "image/jpeg", [9, 8], default);
            var db = services.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.SingleAsync(x => x.Id == Id); recipe.Notes = "Human note"; await db.SaveChangesAsync();
            var info = await repository.GetInfoAsync(Id, default); info.Notes = "Human note"; await repository.SaveInfoAsync(info, default);
            var instance = await Launch(services, db);
            await Web(store, new AcquisitionMediaHandler(), """{"name":"Acquired name","heroImageUrl":"https://example.test/hero","notes":"Acquired context note"}""")
                .ExecuteAsync(instance.Tasks.Single(x => x.ProcessorName == "FetchUrlContent"), default);
            Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(Id, 0, default));
            Assert.Equal("Human note", (await repository.GetInfoAsync(Id, default)).Notes);
            Assert.Equal("Human note", (await db.Recipes.SingleAsync(x => x.Id == Id)).Notes);
            using var retained = JsonDocument.Parse((await db.RecipeFilePublications.SingleAsync()).Payload);
            Assert.Equal("CQg=", retained.RootElement.GetProperty("capture").GetProperty("files").GetProperty("original/0.jpg").GetString());
            Assert.Contains("Acquired context note", retained.RootElement.GetProperty("candidate").GetProperty("sourceContext").GetString());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task WorkflowLaunch_ChangedTaskOrCorruptCaptureCannotReachAcquisition()
    {
        foreach (var corrupt in new[] { false, true })
            await WithStore(async (services, repository, store, _) =>
            {
                var db = services.GetRequiredService<RecipeDbContext>();
                var instance = await Launch(services, db);
                var task = instance.Tasks.Single(x => x.ProcessorName == "FetchUrlContent");
                if (corrupt)
                {
                    var document = System.Text.Json.Nodes.JsonNode.Parse(instance.RecipePublicationCapture!)!;
                    document["inputHash"] = "corrupt";
                    instance.RecipePublicationCapture = document.ToJsonString();
                    await db.SaveChangesAsync();
                }
                else task.Payload = JsonSerializer.Serialize(new { recipeId = Id, url = "https://example.test/changed" });
                var handler = new SourceHandler(() => { });
                await Assert.ThrowsAsync<InvalidDataException>(() => Web(store, handler).ExecuteAsync(task, default));
                Assert.Equal(0, handler.Calls);
                Assert.Equal("retained source", await repository.GetContentHtmlAsync(Id, default));
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task EarlierContentJournal_PreservesItsWireHashAndPendingDeliveryReplay()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
            // Exact pre-source-publication fingerprint shape. This historical
            // fixture must remain decodable, rather than acquire newly added fields.
            var legacyFields = JsonSerializer.Serialize(new
            {
                recipe.Id,
                recipe.Name,
                recipe.Description,
                recipe.Notes,
                recipe.Rating,
                recipe.SourceUrl,
                Ingredients = HistoricalNormalizeJson(recipe.Ingredients),
                RawMetadata = HistoricalNormalizeJson(recipe.RawMetadata),
                recipe.Servings,
                Canonical = HistoricalNormalizeJson(recipe.CanonicalContent),
                recipe.CuisineType,
                recipe.MealTypes,
                recipe.TotalTime,
                recipe.ImageCount,
                recipe.IsSynthesized,
                recipe.DeletedAt
            }, JsonDefaults.CamelCase);
            var fingerprint = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(
                HistoricalNormalizeJson(legacyFields))));
            var current = await store.CaptureAsync(Id);
            var paths = new[] { "recipe.info", "recipe.json", "original/content.html", "original/source.pdf", "original/0.jpg", "original/0.png", "original/0.webp" };
            var captured = new RecipePublicationCapture(Id, current.ContentRevision, current.SourceRevision, fingerprint,
                paths.ToDictionary(path => path, path => current.Files[path]));
            var operation = Guid.NewGuid();
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => store.PublishAsync(captured, Candidate(), operation));
            var journal = await db.RecipeFilePublications.SingleAsync();
            using var wire = JsonDocument.Parse(journal.Payload);
            Assert.False(wire.RootElement.GetProperty("capture").TryGetProperty("fieldHashVersion", out var ignoredVersion));
            Assert.False(wire.RootElement.GetProperty("candidate").TryGetProperty("sourceFiles", out var ignoredFiles));
            storage.FailInfo = false;
            await store.ResumeAsync(Id, operation);
            var writes = storage.AtomicWrites;
            await store.PublishAsync(captured, Candidate(), operation);
            Assert.Equal(writes, storage.AtomicWrites);
            Assert.Equal(Replacement, await repository.GetRecipeJsonAsync(Id, default));
        });
    }

    private static string HistoricalNormalizeJson(string? json)
    {
        if (json is null) return "null";
        using var document = JsonDocument.Parse(json);
        object? Ordered(JsonElement value) => value.ValueKind switch
        {
            JsonValueKind.Object => value.EnumerateObject().OrderBy(p => p.Name, StringComparer.Ordinal).ToDictionary(p => p.Name, p => Ordered(p.Value)),
            JsonValueKind.Array => value.EnumerateArray().Select(Ordered).ToArray(),
            _ => value.Clone()
        };
        return JsonSerializer.Serialize(Ordered(document.RootElement));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task SourceOnlyWriters_DoNotReplayOldInfoNameOrUrlOverAlreadySavedHumanFields()
    {
        foreach (var kind in new[] { "hero", "pdf" })
            await WithStore(async (services, repository, store, _) =>
            {
                var db = services.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.SingleAsync(x => x.Id == Id);
                recipe.Name = "Already saved human name"; recipe.SourceUrl = "https://example.test/human-source";
                await db.SaveChangesAsync();
                if (kind == "hero")
                {
                    var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["GEMINI_API_KEY"] = "synthetic-key" }).Build();
                    var handler = new SourceHandler(() => { }, """{"candidates":[{"content":{"parts":[{"inlineData":{"mimeType":"image/webp","data":"BAUG"}}]}}]}""");
                    await new RecipeHeroAgent(store, config, NullLogger<RecipeHeroAgent>.Instance, new HeroClientFactory(handler)).CreateHeroImageAsync(Id, force: true);
                }
                else
                {
                    var files = new LocalRecipeStore(services.GetRequiredService<RecipesRootResolver>(), NullLogger<LocalRecipeStore>.Instance);
                    await files.SaveSourcePdfAsync(Id, new MemoryStream([7, 8]));
                    var info = await repository.GetInfoAsync(Id, default); info.ImageCount = 0; await repository.SaveInfoAsync(info, default);
                    await new RecipeApi.Services.Processors.PdfConversionProcessor(store,
                        new PageRenderer(() => Task.FromResult<IReadOnlyList<byte[]>>(new byte[][] { [4, 5, 6] })))
                        .ExecuteAsync(new WorkflowTask { TaskId = Guid.NewGuid(), Payload = JsonSerializer.Serialize(new { recipeId = Id }) }, default);
                }
                await db.Entry(recipe).ReloadAsync();
                Assert.Equal("Already saved human name", recipe.Name);
                Assert.Equal("https://example.test/human-source", recipe.SourceUrl);
                Assert.Equal("Original", (await repository.GetInfoAsync(Id, default)).Name);
            });
    }

}
