using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshPhoto_WitnessedExtractionPublishesCurrentFactsAndKeepsOriginalImage()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            await storage.SaveAsync("workflows", "recipe-import.yaml", await File.ReadAllTextAsync(
                Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi/Workflows/recipe-import.yaml")));
            var orchestrator = new WorkflowOrchestrator(services.GetRequiredService<IClock>(),
                new WorkflowRepository(storage), db, store);
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
            var id = await service.CreateRecipe((await db.FamilyMembers.FirstAsync()).Id,
                new FormFileCollection { Upload() }, new());
            db.ChangeTracker.Clear();
            var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == "recipe-import");
            Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(id, 0, default));
            const string extracted = """
                {"name":"Photo pasta","recipeYield":"4 servings","recipeIngredient":["200 g pasta","100 ml sauce","salt to taste"],"supply":[{"name":"pasta","requiredQuantity":{"value":200,"unitText":"g"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Cook the pasta."}]}
                """;
            var chat = new Mock<IChatClient>();
            var calls = 0;
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(() => { calls++; return new ChatResponse(new ChatMessage(ChatRole.Assistant, extracted)); });
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
            var extraction = workflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => agent.ExecuteAsync(extraction, default));
            var callsBeforeReplay = calls;
            storage.FailInfo = false;
            await agent.ExecuteAsync(extraction, default);
            Assert.Equal(callsBeforeReplay, calls);

            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            var canonical = CanonicalRecipeContentStore.Read(saved);
            Assert.NotNull(canonical);
            Assert.Equal(4, canonical.Servings);
            Assert.Equal(new[] { "200 g pasta", "100 ml sauce", "salt to taste" },
                canonical.IngredientLines.Select(CanonicalRecipeContentStore.Render));
            Assert.All(canonical.IngredientLines, line => Assert.Equal("source", line.Provenance.Origin));
            Assert.Empty(canonical.InstructionSections.SelectMany(x => x.Steps).SelectMany(x => x.Bindings));
            Assert.Equal(LegacyGroceryQuantity.Parse("400"), SupperIngredientProjection.Read(saved, 8)[0].GroceryObservation.Quantity);
            Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(id, 0, default));
            using var json = JsonDocument.Parse(await repository.GetRecipeJsonAsync(id, default));
            Assert.Equal(id, RecipeExportContent.ReadCurrent(json.RootElement, id).RecipeId);
            var hero = workflow.Tasks.Single(x => x.ProcessorName == "GenerateHero");
            var heroCapture = await store.CaptureForTaskAsync(hero, id);
            await store.PublishAsync(heroCapture,
                new(null, await repository.GetInfoAsync(id, default),
                    "GenerateHero\n" + JsonSerializer.Serialize(JsonDocument.Parse(hero.Payload).RootElement),
                    new Dictionary<string, byte[]?> { ["hero.webp"] = [7, 8, 9] }, SourceKind: "hero"), hero.TaskId);
            await new SyncRecipeProcessor(services.GetRequiredService<IClock>(), db, repository,
                services.GetRequiredService<SupperProjectionInvalidation>(), Mock.Of<ISupperProjectionPublisher>(),
                NullLogger<SyncRecipeProcessor>.Instance).ExecuteAsync(
                    workflow.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
            await new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance,
                Mock.Of<IScheduleEventPublisher>(), store).ExecuteAsync(
                    workflow.Tasks.Single(x => x.ProcessorName == "RecipeReady"), default);
            var ready = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.True(ready.IsReady);
            Assert.Equal(saved.CanonicalContent, ready.CanonicalContent);
            Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(id, 0, default));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshPhoto_RetainedWordingAndChangedCommentRecoverToProtectedCanonicalFacts()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            await storage.SaveAsync("workflows", "recipe-import.yaml", await File.ReadAllTextAsync(
                Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi/Workflows/recipe-import.yaml")));
            var clock = services.GetRequiredService<IClock>();
            var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db, store);
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
            var member = (await db.FamilyMembers.FirstAsync()).Id;
            var id = await service.CreateRecipe(member, new FormFileCollection { Upload() }, new());
            db.ChangeTracker.Clear();
            var first = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == "recipe-import");
            const string unsafeSource = """
                {"name":"Photo pasta","recipeYield":"4 servings","recipeIngredient":["200 g pasta, diced","100 ml sauce"],"supply":[{"name":"pasta","requiredQuantity":{"value":200,"unitText":"g"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Cook the pasta."}]}
                """;
            var calls = 0;
            var chat = new Mock<IChatClient>();
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(() => { calls++; return new ChatResponse(new ChatMessage(ChatRole.Assistant, unsafeSource)); });
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
            var firstExtract = first.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            var failure = await Assert.ThrowsAsync<RecipeContentReviewException>(() => agent.ExecuteAsync(firstExtract, default));
            Assert.Equal(["ingredients"], failure.Reasons);
            var retained = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.False(retained.IsReady);
            Assert.Null(retained.CanonicalContent);
            Assert.Contains("200 g pasta, diced", retained.Ingredients);
            Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(id, 0, default));
            await Assert.ThrowsAsync<RecipeContentReviewException>(() => agent.ExecuteAsync(firstExtract, default));
            var callsAfterFailure = calls;
            first.Status = WorkflowStatus.Failed;
            firstExtract.Status = RecipeApi.Models.TaskStatus.Failed;
            await db.SaveChangesAsync();
            var reports = new RecipeImportReportService(clock, db, orchestrator);
            await reports.MarkFailedAsync(id, first.Id, firstExtract.TaskName, "Unsafe photo wording", failure.Reasons);
            Assert.Equal(RecipeImportReportStatus.ReadyToReview,
                (await db.RecipeImportReports.AsNoTracking().SingleAsync(x => x.RecipeId == id)).Status);

            await service.UpdateRecipe(id, new UpdateRecipeDto
            {
                Ingredients = ["250 g pasta", "100 ml sauce"],
                RecipeInstructions = JsonSerializer.SerializeToElement(new[] { new { text = "Cook gently." } })
            });
            db.ChangeTracker.Clear();
            var submitted = await reports.SubmitAsync(id, member,
                new RecipeImportIssueRequest { Reasons = ["ingredients"], Note = "I corrected the pasta and step." });
            Assert.True(submitted.ReimportStarted);
            var repair = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == submitted.ImportId);
            Assert.Equal("recipe-import", repair.WorkflowId);
            var repairExtract = repair.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => agent.ExecuteAsync(repairExtract, default));
            storage.FailInfo = false;
            await agent.ExecuteAsync(repairExtract, default);
            Assert.Equal(callsAfterFailure, calls);
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            var canonical = CanonicalRecipeContentStore.Read(saved)!;
            Assert.Equal("250 g pasta", CanonicalRecipeContentStore.Render(canonical.IngredientLines[0]));
            Assert.Equal("human", canonical.IngredientLines[0].Provenance.Origin);
            Assert.Equal("Cook gently.", Assert.Single(Assert.Single(canonical.InstructionSections).Steps).Text);
            Assert.Equal(LegacyGroceryQuantity.Parse("500"), SupperIngredientProjection.Read(saved, 8)[0].GroceryObservation.Quantity);
            var hero = repair.Tasks.Single(x => x.ProcessorName == "GenerateHero");
            await store.PublishAsync(await store.CaptureForTaskAsync(hero, id),
                new(null, await repository.GetInfoAsync(id, default),
                    "GenerateHero\n" + JsonSerializer.Serialize(JsonDocument.Parse(hero.Payload).RootElement),
                    new Dictionary<string, byte[]?> { ["hero.webp"] = [7, 8, 9] }, SourceKind: "hero"), hero.TaskId);
            await new SyncRecipeProcessor(clock, db, repository,
                services.GetRequiredService<SupperProjectionInvalidation>(), Mock.Of<ISupperProjectionPublisher>(),
                NullLogger<SyncRecipeProcessor>.Instance).ExecuteAsync(
                    repair.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
            await new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance,
                Mock.Of<IScheduleEventPublisher>(), store).ExecuteAsync(
                    repair.Tasks.Single(x => x.ProcessorName == "RecipeReady"), default);
            await new CompleteRecipeImportReportProcessor(reports).ExecuteAsync(
                repair.Tasks.Single(x => x.ProcessorName == "CompleteRecipeImportReport"), default);
            Assert.True((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).IsReady);
            Assert.Equal(RecipeImportReportStatus.ReadyToReview,
                (await db.RecipeImportReports.AsNoTracking().SingleAsync(x => x.RecipeId == id)).Status);
            Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(id, 0, default));
            await Assert.ThrowsAsync<RecipeContentReviewException>(() => agent.ExecuteAsync(firstExtract, default));
            Assert.Equal(callsAfterFailure, calls);
            Assert.Equal(saved.CanonicalContent, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshPhotoAuthority_RejectsLaterImportAndPdfPageImages()
    {
        await WithStore(async (services, _, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            await storage.SaveAsync("workflows", "recipe-import.yaml", await File.ReadAllTextAsync(
                Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi/Workflows/recipe-import.yaml")));
            var orchestrator = new WorkflowOrchestrator(services.GetRequiredService<IClock>(),
                new WorkflowRepository(storage), db, store);
            var member = (await db.FamilyMembers.FirstAsync()).Id;
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
            var photoId = await service.CreateRecipe(member, new FormFileCollection { Upload() }, new());
            var later = await orchestrator.TriggerAsync("recipe-import", new() { ["recipeId"] = photoId.ToString() });
            var laterExtract = later.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            const string extracted = """
                {"name":"Pasta","recipeYield":"4 servings","recipeIngredient":["200 g pasta"],"supply":[{"name":"pasta","requiredQuantity":{"value":200,"unitText":"g"}}],"recipeInstructions":[{"text":"Cook."}]}
                """;
            var chat = new Mock<IChatClient>();
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, extracted)));
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
            await agent.ExecuteAsync(laterExtract, default);
            var laterSaved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == photoId);
            Assert.Null(laterSaved.CanonicalContent);
            Assert.Contains("200 g pasta", laterSaved.Ingredients);

            var pdf = ActivatorUtilities.CreateInstance<PdfCaptureService>(services, store, orchestrator);
            var pdfId = await pdf.AcceptAsync(member, RecipeFollowupIntentTests.Upload("application/pdf"), 0, null, default);
            db.ChangeTracker.Clear();
            var pdfWorkflow = (await db.WorkflowInstances.Include(x => x.Tasks).ToListAsync())
                .Single(x => x.WorkflowId == "recipe-import" && x.Parameters!.Contains(pdfId.ToString(), StringComparison.Ordinal));
            var convert = pdfWorkflow.Tasks.Single(x => x.ProcessorName == "ConvertPdf");
            await new PdfConversionProcessor(store,
                new PageRenderer(() => Task.FromResult<IReadOnlyList<byte[]>>([new byte[] { 7, 8, 9 }])))
                .ExecuteAsync(convert, default);
            var pdfExtract = pdfWorkflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            var pdfCapture = await store.CaptureForTaskAsync(pdfExtract, pdfId);
            Assert.NotNull(pdfCapture.Files.GetValueOrDefault("original/0.png"));
            await agent.ExecuteAsync(pdfExtract, default);
            var pdfSaved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == pdfId);
            Assert.Null(pdfSaved.CanonicalContent);
            Assert.Contains("200 g pasta", pdfSaved.Ingredients);
        });
    }
}
