using RecipeApi.Tests.Infrastructure;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
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
using RecipeApi.Services.Processors;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshPdf_OriginalBootstrapAndConvertedPagesPublishCanonicalAndReachReady()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            Assert.True(db.Database.IsNpgsql());
            var clock = services.GetRequiredService<IClock>();
            await storage.SaveAsync("workflows", "recipe-import.yaml", await File.ReadAllTextAsync(
                Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi/Workflows/recipe-import.yaml")));
            var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db, store);
            var member = (await db.FamilyMembers.FirstAsync()).Id;
            // Acceptance retains bytes; this controlled renderer isolates ancestry,
            // not PDF validity, native rendering, OCR quality or worker dispatch.
            var originalPdf = "%PDF-1.4\ncontrolled ancestry fixture\n%%EOF\n"u8.ToArray();
            var upload = new FormFile(new MemoryStream(originalPdf), 0, originalPdf.Length, "file", "supper.pdf")
                { Headers = new HeaderDictionary(), ContentType = "application/pdf" };
            var captureService = ActivatorUtilities.CreateInstance<PdfCaptureService>(services, store, orchestrator);
            var id = await captureService.AcceptAsync(member, upload, 2, "Retain the original PDF.", default);
            db.ChangeTracker.Clear();
            var workflow = (await db.WorkflowInstances.Include(x => x.Tasks).ToListAsync())
                .Single(x => x.WorkflowId == "recipe-import" && x.Parameters!.Contains(id.ToString(), StringComparison.Ordinal));
            var bootstrap = await db.RecipeFilePublications.AsNoTracking()
                .SingleAsync(x => x.RecipeId == id && x.OperationId == workflow.Id);
            Assert.True(bootstrap.Delivered);
            using var bootstrapWire = JsonDocument.Parse(bootstrap.Payload);
            var accepted = bootstrapWire.RootElement.GetProperty("candidate");
            Assert.Equal("bootstrap", accepted.GetProperty("sourceKind").GetString());
            Assert.False(string.IsNullOrWhiteSpace(accepted.GetProperty("followupIntent").GetString()));
            Assert.Equal(originalPdf, accepted.GetProperty("sourceFiles").GetProperty("original/source.pdf").GetBytesFromBase64());
            Assert.Equal(0, accepted.GetProperty("info").GetProperty("imageCount").GetInt32());
            Assert.NotNull(workflow.RecipePublicationCapture);
            var initial = await store.CaptureAsync(id);
            Assert.Null(initial.Fields!.CanonicalContent);
            Assert.Null(initial.Fields.Ingredients);
            Assert.Null(initial.Fields.RawMetadata);
            Assert.Equal(originalPdf, initial.Files["original/source.pdf"]);

            byte[][] pages = [[7, 8, 9], [10, 11, 12]];
            var renderer = new Mock<IPdfPageRenderer>(MockBehavior.Strict);
            renderer.Setup(x => x.RenderAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
                .Returns(async (Stream source, CancellationToken ct) =>
                {
                    using var read = new MemoryStream();
                    await source.CopyToAsync(read, ct);
                    Assert.Equal(originalPdf, read.ToArray());
                    return (IReadOnlyList<byte[]>)pages;
                });
            var convert = workflow.Tasks.Single(x => x.ProcessorName == "ConvertPdf");
            var conversion = new PdfConversionProcessor(store, renderer.Object);
            // Use the same admission and completion observation owners as the worker,
            // retaining the ACTUAL returned result. No attempt/publication is seeded.
            var returned = await ObservePdfConversionCompletionAsync(db, workflow, convert, clock,
                () => conversion.ExecuteAsync(convert, default));
            renderer.Verify(x => x.RenderAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()), Times.Once);
            var converted = await db.RecipeFilePublications.AsNoTracking()
                .SingleAsync(x => x.RecipeId == id && x.OperationId == convert.TaskId);
            Assert.True(converted.Delivered);
            var validateReceipt = typeof(PdfConversionProcessor).GetMethod("ValidateOriginalHistory", BindingFlags.Static | BindingFlags.NonPublic)!;
            Assert.Equal(id, Assert.IsType<Guid>(validateReceipt.Invoke(null, [convert.Payload, returned, new[] { converted }])));
            using var convertedWire = JsonDocument.Parse(converted.Payload);
            var candidate = convertedWire.RootElement.GetProperty("candidate");
            Assert.Equal("pdf", candidate.GetProperty("sourceKind").GetString());
            Assert.Equal(40, candidate.GetProperty("sourceFiles").EnumerateObject().Count());
            Assert.Equal(originalPdf, convertedWire.RootElement.GetProperty("capture").GetProperty("files")
                .GetProperty("original/source.pdf").GetBytesFromBase64());
            Assert.Equal(bootstrap.ResultHash, convertedWire.RootElement.GetProperty("capture").GetProperty("fieldHash").GetString());
            var extraction = workflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            Assert.Equal(new[] { convert.TaskName }, extraction.DependsOn);
            var extractionCapture = await store.CaptureForTaskAsync(extraction, id);
            Assert.Equal(converted.ResultHash, extractionCapture.FieldHash);
            Assert.Equal(originalPdf, extractionCapture.Files["original/source.pdf"]);
            for (var index = 0; index < pages.Length; index++)
                Assert.Equal(pages[index], extractionCapture.Files[$"original/{index}.png"]);
            Assert.Equal(2, (await repository.GetInfoAsync(id, default)).ImageCount);
            Assert.Equal(-1, (await repository.GetInfoAsync(id, default)).FinishedDishImageIndex);

            const string extracted = """
                {"name":"PDF pasta","recipeYield":"4 servings","recipeIngredient":["200 g pasta","100 ml sauce","salt to taste"],"supply":[{"name":"pasta","requiredQuantity":{"value":200,"unitText":"g"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Cook the pasta."}]}
                """;
            var chat = new Mock<IChatClient>();
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, extracted)));
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
            await agent.ExecuteAsync(extraction, default);
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            // Intended red at the current PDF fence: legacy-only extraction leaves null.
            var content = CanonicalRecipeContentStore.Read(saved);
            Assert.NotNull(content);
            Assert.Equal(4, content.Servings);
            Assert.Equal(new[] { "200 g pasta", "100 ml sauce", "salt to taste" },
                content.IngredientLines.Select(CanonicalRecipeContentStore.Render));
            Assert.Equal(LegacyGroceryQuantity.Parse("200"), content.IngredientLines[0].Amount);
            Assert.Equal("g", content.IngredientLines[0].Unit!.Text);
            Assert.Equal(LegacyGroceryQuantity.Parse("100"), content.IngredientLines[1].Amount);
            Assert.Null(content.IngredientLines[2].Amount);
            Assert.Null(content.IngredientLines[2].Unit);
            Assert.All(content.IngredientLines, line =>
            {
                Assert.NotEqual(Guid.Empty, line.Id);
                Assert.Equal("source", line.Provenance.Origin);
                Assert.Equal(content.SourceRevision, line.Provenance.SourceRef);
                Assert.Empty(line.Provenance.ProtectedFields);
            });
            Assert.Equal(3, content.IngredientLines.Select(x => x.Id).Distinct().Count());
            Assert.Empty(content.InstructionSections.SelectMany(x => x.Steps).SelectMany(x => x.Bindings));
            Assert.Equal("Cook the pasta.", Assert.Single(Assert.Single(content.InstructionSections).Steps).Text);
            var extractionJournal = await db.RecipeFilePublications.AsNoTracking()
                .SingleAsync(x => x.RecipeId == id && x.OperationId == extraction.TaskId);
            using var extractionWire = JsonDocument.Parse(extractionJournal.Payload);
            Assert.Equal("fresh-canonical", extractionWire.RootElement.GetProperty("candidate").GetProperty("sourceKind").GetString());
            Assert.True(extractionJournal.Delivered);
            using var exported = JsonDocument.Parse(await repository.GetRecipeJsonAsync(id, default));
            Assert.Equal(JsonSerializer.Serialize(content, JsonDefaults.CamelCase),
                JsonSerializer.Serialize(RecipeExportContent.ReadCurrent(exported.RootElement, id).Content, JsonDefaults.CamelCase));

            var heroHandler = new SourceHandler(() => { },
                """{"candidates":[{"content":{"parts":[{"inlineData":{"mimeType":"image/webp","data":"BAUG"}}]}}]}""");
            var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
                { ["GEMINI_API_KEY"] = "synthetic-key" }).Build();
            await new RecipeHeroAgent(store, configuration, NullLogger<RecipeHeroAgent>.Instance,
                new HeroClientFactory(heroHandler)).ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "GenerateHero"), default);
            Assert.Equal(1, heroHandler.Calls);
            await new SyncRecipeProcessor(clock, db, repository, services.GetRequiredService<SupperProjectionInvalidation>(),
                Mock.Of<ISupperProjectionPublisher>(), NullLogger<SyncRecipeProcessor>.Instance, TestPublicationStore.Vocabulary(db, (repository).StorageProvider, clock, services))
                .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                    """[{"normalizedKey":"pasta","section":"Pantry","confidence":1},{"normalizedKey":"sauce","section":"Pantry","confidence":1},{"normalizedKey":"salt","section":"Pantry","confidence":1}]""")));
            await new CategorizeIngredientsProcessor(clock, db, chat.Object, NullLogger<CategorizeIngredientsProcessor>.Instance)
                .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeIngredients"), default);
            Assert.Equal("Pantry", (await db.IngredientCategories.AsNoTracking().SingleAsync(x => x.NormalizedKey == "pasta")).GrocerySection);
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                    """{"cuisineType":"Italian","mealTypes":["Supper"],"primaryMealType":"Supper","isVegetarian":true}""")));
            await ActivatorUtilities.CreateInstance<CategorizeRecipeProcessor>(services, chat.Object)
                .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeRecipe"), default);
            await new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance, Mock.Of<IScheduleEventPublisher>(), store)
                .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "RecipeReady"), default);
            var ready = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.True(ready.IsReady);
            Assert.Equal("Italian", ready.CuisineType);
            Assert.Equal(saved.CanonicalContent, ready.CanonicalContent);
            Assert.Equal(saved.RawMetadata, ready.RawMetadata);
            var final = await store.CaptureAsync(id);
            Assert.Equal(originalPdf, final.Files["original/source.pdf"]);
            for (var index = 0; index < pages.Length; index++)
                Assert.Equal(pages[index], final.Files[$"original/{index}.png"]);
            Assert.Equal("Retain the original PDF.", (await repository.GetInfoAsync(id, default)).Notes);
        });
    }

    private static async Task<string> ObservePdfConversionCompletionAsync(RecipeDbContext db, WorkflowInstance workflow,
        WorkflowTask task, IClock clock, Func<Task<object?>> execute)
    {
        Assert.Equal(TaskStatus.Pending, task.Status);
        var history = typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.WorkflowProcessorHistory")!;
        var attempt = Assert.IsType<WorkflowProcessorAttempt>(history.GetMethod("Begin", BindingFlags.Public | BindingFlags.Static)!
            .Invoke(null, [db, task, workflow, clock.UtcNow]));
        task.Status = TaskStatus.Processing;
        task.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync();
        var result = await execute();
        Assert.NotNull(result);
        var returned = JsonSerializer.Serialize(result, JsonDefaults.CamelCase);
        task.Result = returned;
        task.Status = TaskStatus.Completed;
        task.UpdatedAt = clock.UtcNow;
        await (Task)history.GetMethod("ObserveAsync", BindingFlags.Public | BindingFlags.Static)!
            .Invoke(null, [db, attempt, task, "succeeded", true, returned, clock.UtcNow, CancellationToken.None])!;
        await db.SaveChangesAsync();
        history.GetMethod("Validate", BindingFlags.Public | BindingFlags.Static)!.Invoke(null, [attempt]);
        Assert.True(JsonNode.DeepEquals(JsonNode.Parse(returned),
            JsonNode.Parse((await db.WorkflowTasks.AsNoTracking().SingleAsync(x => x.TaskId == task.TaskId)).Result!)));
        Assert.NotNull((await db.WorkflowProcessorAttempts.AsNoTracking().SingleAsync(x => x.Id == attempt.Id)).Outcome);
        return returned;
    }
}
