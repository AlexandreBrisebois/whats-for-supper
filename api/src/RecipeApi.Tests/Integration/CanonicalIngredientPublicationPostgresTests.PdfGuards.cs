using System.Net;
using System.Net.Http.Json;
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
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;
using PostgresTheory = RecipeApi.Tests.Integration.RecipeImportReportPostgresTests.PostgresTheoryAttribute;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    private const string PdfGuardSource = """
        {"name":"PDF pasta","recipeYield":"4 servings","recipeIngredient":["200 g pasta","100 ml sauce"],"supply":[{"name":"pasta","requiredQuantity":{"value":200,"unitText":"g"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Cook the pasta."}]}
        """;
    private static readonly byte[] PdfGuardBytes = "%PDF-1.4\ncontrolled guard fixture\n%%EOF\n"u8.ToArray();
    private static readonly byte[][] PdfGuardPages = [[7, 8, 9], [10, 11, 12]];

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshPdf_ContradictoryConversionReceiptRejectsInsteadOfLegacyFallback()
    {
        await WithStore(async (services, _, store, storage) =>
        {
            var (id, workflow, _) = await PdfGuardCaptureAsync(services, store, storage);
            var db = services.GetRequiredService<RecipeDbContext>();
            var convert = workflow.Tasks.Single(x => x.ProcessorName == "ConvertPdf");
            // Deliberately contradict one genuine result; the original observed
            // completion and delivered publication are not fabricated or replaced.
            var result = JsonNode.Parse(convert.Result!)!;
            result["imageCount"] = 9;
            convert.Result = result.ToJsonString();
            await db.SaveChangesAsync();
            var before = await PdfGuardSnapshotAsync(db, store, id);
            var (agent, _) = PdfGuardAgent(store);
            await Assert.ThrowsAsync<InvalidDataException>(() => agent.ExecuteAsync(
                workflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe"), default));
            Assert.Equal(before, await PdfGuardSnapshotAsync(db, store, id));
            var extractionTaskId = workflow.Tasks.Single(task => task.ProcessorName == "ExtractRecipe").TaskId;
            Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == extractionTaskId));
        });
    }

    [PostgresTheory]
    [InlineData("source")]
    [InlineData("page-order")]
    public async Task FreshPdf_SourceOrPageTamperPreservesSurvivingFacts(string mutation)
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var (id, workflow, _) = await PdfGuardCaptureAsync(services, store, storage);
            var db = services.GetRequiredService<RecipeDbContext>();
            if (mutation == "source")
                await storage.SaveAsync("recipes", $"{id}/original/source.pdf", new byte[] { 99, 98, 97 });
            else
            {
                await repository.SaveOriginalImageAsync(id, 0, "image/png", PdfGuardPages[1], default);
                await repository.SaveOriginalImageAsync(id, 1, "image/png", PdfGuardPages[0], default);
            }
            var before = await PdfGuardSnapshotAsync(db, store, id);
            var (agent, chat) = PdfGuardAgent(store);
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.ExecuteAsync(
                workflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe"), default));
            Assert.Empty(chat.Invocations);
            Assert.Equal(before, await PdfGuardSnapshotAsync(db, store, id));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshPdf_DelayedExtractionCannotOverwriteOrdinaryHumanIngredientAndStepClear()
    {
        await WithStore(async (services, _, store, storage) =>
        {
            var (id, workflow, _) = await PdfGuardCaptureAsync(services, store, storage);
            var db = services.GetRequiredService<RecipeDbContext>();
            var orchestrator = new WorkflowOrchestrator(services.GetRequiredService<IClock>(), new WorkflowRepository(storage), db, store);
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
            var (agent, chat) = PdfGuardAgent(store);
            string? clearedState = null;
            var calls = 0;
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .Returns(async () =>
                {
                    if (++calls == 1)
                    {
                        // The actual agent already captured valid PDF ancestry and
                        // dispatched extraction. A real ordinary edit now clears text.
                        await service.UpdateRecipe(id, new UpdateRecipeDto { Ingredients = [],
                            RecipeInstructions = JsonSerializer.SerializeToElement(Array.Empty<object>()) });
                        clearedState = await PdfGuardSnapshotAsync(db, store, id);
                    }
                    return new ChatResponse(new ChatMessage(ChatRole.Assistant, PdfGuardSource));
                });
            var extract = workflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.ExecuteAsync(extract, default));
            Assert.NotNull(clearedState);
            Assert.Equal(clearedState, await PdfGuardSnapshotAsync(db, store, id));
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.Equal("[]", saved.Ingredients);
            Assert.Null(saved.CanonicalContent);
            Assert.False(saved.IsReady);
            Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == extract.TaskId));
            await PdfGuardAssertMediaAsync(store, id);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshPdf_LaterWorkflowWithRealReusedConversionCannotBorrowBootstrap()
    {
        await WithStore(async (services, _, store, storage) =>
        {
            var (id, original, _) = await PdfGuardCaptureAsync(services, store, storage);
            var db = services.GetRequiredService<RecipeDbContext>();
            var clock = services.GetRequiredService<IClock>();
            var originalBootstrap = (await db.RecipeFilePublications.AsNoTracking()
                .SingleAsync(x => x.RecipeId == id && x.OperationId == original.Id)).Payload;
            var later = await new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db, store)
                .TriggerAsync("recipe-import", new() { ["recipeId"] = id.ToString() });
            Assert.NotEqual(original.Id, later.Id);
            var renderer = new Mock<IPdfPageRenderer>(MockBehavior.Strict);
            var convert = later.Tasks.Single(x => x.ProcessorName == "ConvertPdf");
            await ObservePdfConversionCompletionAsync(db, later, convert, clock,
                () => new PdfConversionProcessor(store, renderer.Object).ExecuteAsync(convert, default));
            renderer.VerifyNoOtherCalls();
            using var converted = JsonDocument.Parse((await db.RecipeFilePublications.AsNoTracking()
                .SingleAsync(x => x.OperationId == convert.TaskId)).Payload);
            Assert.Empty(converted.RootElement.GetProperty("candidate").GetProperty("sourceFiles").EnumerateObject());
            var extract = later.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            var (agent, _) = PdfGuardAgent(store);
            await agent.ExecuteAsync(extract, default);
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.Null(saved.CanonicalContent); // Missing origin is abstention, not a global legacy ban.
            Assert.Contains("200 g pasta", saved.Ingredients);
            Assert.False(saved.IsReady);
            using var extracted = JsonDocument.Parse((await db.RecipeFilePublications.AsNoTracking()
                .SingleAsync(x => x.OperationId == extract.TaskId)).Payload);
            Assert.False(extracted.RootElement.GetProperty("candidate").TryGetProperty("sourceKind", out var ignoredSourceKind));
            Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.RecipeId == id && x.OperationId == later.Id));
            Assert.Equal(originalBootstrap, (await db.RecipeFilePublications.AsNoTracking()
                .SingleAsync(x => x.RecipeId == id && x.OperationId == original.Id)).Payload);
            await PdfGuardAssertMediaAsync(store, id);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshPdf_RecoveredConversionAndCanonicalDeliveryReplayPreserveHumanClear()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var (id, workflow, renderer) = await PdfGuardCaptureAsync(services, store, storage, convert: false);
            var db = services.GetRequiredService<RecipeDbContext>();
            var clock = services.GetRequiredService<IClock>();
            var convert = workflow.Tasks.Single(x => x.ProcessorName == "ConvertPdf");
            var processor = new PdfConversionProcessor(store, renderer.Object);
            var history = typeof(WorkflowWorker).Assembly.GetType("RecipeApi.Services.WorkflowProcessorHistory")!;
            var attempt = Assert.IsType<WorkflowProcessorAttempt>(history.GetMethod("Begin", BindingFlags.Public | BindingFlags.Static)!
                .Invoke(null, [db, convert, workflow, clock.UtcNow]));
            convert.Status = TaskStatus.Processing;
            await db.SaveChangesAsync();
            storage.FailInfo = true;
            var failure = await Assert.ThrowsAsync<IOException>(() => processor.ExecuteAsync(convert, default));
            Assert.False((await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == convert.TaskId)).Delivered);
            // Faithfully observe the actual failed invocation's retry transition;
            // there was no returned success to synthesize for the interrupted call.
            convert.Status = TaskStatus.Pending;
            convert.RetryCount++;
            convert.ErrorMessage = failure.Message;
            convert.UpdatedAt = clock.UtcNow;
            await (Task)history.GetMethod("ObserveAsync", BindingFlags.Public | BindingFlags.Static)!
                .Invoke(null, [db, attempt, convert, "retry", false, null, clock.UtcNow, CancellationToken.None])!;
            await db.SaveChangesAsync();
            history.GetMethod("Validate", BindingFlags.Public | BindingFlags.Static)!.Invoke(null, [attempt]);
            storage.FailInfo = false;
            var returned = await ObservePdfConversionCompletionAsync(db, workflow, convert, clock,
                () => processor.ExecuteAsync(convert, default));
            using var receipt = JsonDocument.Parse(returned);
            Assert.True(receipt.RootElement.GetProperty("recovered").GetBoolean());
            Assert.False(receipt.RootElement.TryGetProperty("imageCount", out _));
            renderer.Verify(x => x.RenderAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()), Times.Once);
            var extract = workflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            var (agent, chat) = PdfGuardAgent(store);
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => agent.ExecuteAsync(extract, default));
            var committed = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.NotNull(committed.CanonicalContent);
            Assert.False((await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == extract.TaskId)).Delivered);
            var calls = chat.Invocations.Count;
            storage.FailInfo = false;
            await agent.ExecuteAsync(extract, default);
            await agent.ExecuteAsync(extract, default);
            Assert.Equal(calls, chat.Invocations.Count);
            Assert.Equal(committed.CanonicalContent, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent);
            var content = CanonicalRecipeContentStore.Read(committed)!;
            await services.GetRequiredService<CanonicalRecipeContentStore>().EditAsync(id, content.SourceRevision, Guid.NewGuid(),
                new UpdateRecipeDto { ExpectedContentRevision = content.ContentRevision,
                    IngredientLines = JsonSerializer.SerializeToElement(content.IngredientLines.Select((row, index) =>
                        PdfGuardRow(row) with { Amount = index == 0 ? null : row.Amount, AmountText = index == 0 ? null : row.AmountText })) });
            var protectedState = await PdfGuardSnapshotAsync(db, store, id);
            await agent.ExecuteAsync(extract, default);
            Assert.Equal(protectedState, await PdfGuardSnapshotAsync(db, store, id));
            Assert.Equal(calls, chat.Invocations.Count);
            db.ChangeTracker.Clear();
            var current = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id))!;
            Assert.Null(current.IngredientLines[0].Amount);
            Assert.Contains("amount", current.IngredientLines[0].Provenance.ProtectedFields);
            Assert.Equal(content.SourceRevision, current.SourceRevision);
            Assert.Equal(content.IngredientLines.Select(x => x.Id), current.IngredientLines.Select(x => x.Id));
            Assert.Equal(committed.RawMetadata, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).RawMetadata);
            await PdfGuardAssertMediaAsync(store, id);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshPdf_RetainedReviewUsesOriginalExtractionForChangedCommentRepair()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var (id, original, _) = await PdfGuardCaptureAsync(services, store, storage);
            var db = services.GetRequiredService<RecipeDbContext>();
            var clock = services.GetRequiredService<IClock>();
            var unsafeSource = PdfGuardSource.Replace("200 g pasta\"", "200 g pasta, diced\"", StringComparison.Ordinal);
            var (agent, chat) = PdfGuardAgent(store, unsafeSource);
            var originalExtract = original.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            var failure = await Assert.ThrowsAsync<RecipeContentReviewException>(() => agent.ExecuteAsync(originalExtract, default));
            Assert.Equal(new[] { "ingredients" }, failure.Reasons);
            var retained = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.False(retained.IsReady);
            Assert.Null(retained.CanonicalContent);
            Assert.Contains("200 g pasta, diced", retained.Ingredients);
            var originalJournal = await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == originalExtract.TaskId);
            using var retainedWire = JsonDocument.Parse(originalJournal.Payload);
            Assert.Equal("review-material", retainedWire.RootElement.GetProperty("candidate").GetProperty("sourceKind").GetString());
            original.Status = WorkflowStatus.Failed;
            originalExtract.Status = TaskStatus.Failed;
            await db.SaveChangesAsync();
            var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db, store);
            var reports = new RecipeImportReportService(clock, db, orchestrator);
            await reports.MarkFailedAsync(id, original.Id, originalExtract.TaskName, "Unsafe PDF wording", failure.Reasons);
            var member = (await db.FamilyMembers.FirstAsync()).Id;
            var beforeCorrection = await db.RecipeImportReports.AsNoTracking().SingleAsync(x => x.RecipeId == id);
            Assert.Equal(RecipeImportReportStatus.ReadyToReview, beforeCorrection.Status);
            var unchanged = await reports.SubmitAsync(id, member, new RecipeImportIssueRequest
                { Reasons = beforeCorrection.Reasons, Note = beforeCorrection.Note });
            Assert.False(unchanged.ReimportStarted);
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
            await service.UpdateRecipe(id, new UpdateRecipeDto { Ingredients = ["250 g pasta", "100 ml sauce"],
                RecipeInstructions = JsonSerializer.SerializeToElement(new[] { new { text = "Cook gently." } }) });
            Assert.False((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).IsReady);
            db.ChangeTracker.Clear();
            var accepted = await reports.SubmitAsync(id, member, new RecipeImportIssueRequest
                { Reasons = ["ingredients"], Note = "I corrected the PDF pasta and the original step." });
            Assert.True(accepted.ReimportStarted);
            var repair = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == accepted.ImportId);
            var repairExtract = repair.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            Assert.NotEqual(originalExtract.TaskId, repairExtract.TaskId);
            Assert.NotEqual(original.Id, repair.Id);
            Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.RecipeId == id && x.OperationId == repair.Id));
            var convert = repair.Tasks.Single(x => x.ProcessorName == "ConvertPdf");
            var noRender = new Mock<IPdfPageRenderer>(MockBehavior.Strict);
            await ObservePdfConversionCompletionAsync(db, repair, convert, clock,
                () => new PdfConversionProcessor(store, noRender.Object).ExecuteAsync(convert, default));
            noRender.VerifyNoOtherCalls();
            var calls = chat.Invocations.Count;
            await agent.ExecuteAsync(repairExtract, default);
            Assert.Equal(calls, chat.Invocations.Count); // Recovers captured human facts, no new OCR proposal.
            var repaired = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            var content = CanonicalRecipeContentStore.Read(repaired)!;
            Assert.Equal("250 g pasta", CanonicalRecipeContentStore.Render(content.IngredientLines[0]));
            Assert.Equal("human", content.IngredientLines[0].Provenance.Origin);
            Assert.Contains("amount", content.IngredientLines[0].Provenance.ProtectedFields);
            Assert.Equal("Cook gently.", Assert.Single(Assert.Single(content.InstructionSections).Steps).Text);
            Assert.Equal(LegacyGroceryQuantity.Parse("500"), SupperIngredientProjection.Read(repaired, 8)[0].GroceryObservation.Quantity);
            using var repairedWire = JsonDocument.Parse((await db.RecipeFilePublications.AsNoTracking()
                .SingleAsync(x => x.OperationId == repairExtract.TaskId)).Payload);
            Assert.Equal("review-canonical", repairedWire.RootElement.GetProperty("candidate").GetProperty("sourceKind").GetString());
            Assert.Equal(originalJournal.Payload, (await db.RecipeFilePublications.AsNoTracking()
                .SingleAsync(x => x.OperationId == originalExtract.TaskId)).Payload);
            await PdfGuardFinishAsync(services, repository, store, repair, chat);
            await new CompleteRecipeImportReportProcessor(reports).ExecuteAsync(
                repair.Tasks.Single(x => x.ProcessorName == "CompleteRecipeImportReport"), default);
            Assert.Equal(RecipeImportReportStatus.ReadyToReview,
                (await db.RecipeImportReports.AsNoTracking().SingleAsync(x => x.RecipeId == id)).Status);
            Assert.True((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).IsReady);
            var beforeReplay = await PdfGuardSnapshotAsync(db, store, id);
            await agent.ExecuteAsync(repairExtract, default);
            Assert.Equal(beforeReplay, await PdfGuardSnapshotAsync(db, store, id));
            await Assert.ThrowsAsync<RecipeContentReviewException>(() => agent.ExecuteAsync(originalExtract, default));
            Assert.Equal(beforeReplay, await PdfGuardSnapshotAsync(db, store, id));
            await PdfGuardAssertMediaAsync(store, id);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshPdf_OrdinaryAuthSaveReadAndGroceryPreserveSourceAndExplicitClear()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
                new DeploymentCalendarIntegrationTests.CalendarClock(), new()
                { ["Calendar:TimeZone"] = "America/Toronto", ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                    ["Tests:RealWorkflowOrchestrator"] = "true" });
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            var store = services.GetRequiredService<RecipeFilePublicationStore>();
            var repository = services.GetRequiredService<RecipeRepository>();
            var (id, workflow, _) = await PdfGuardCaptureAsync(services, store, services.GetRequiredService<IStorageProvider>());
            var (agent, chat) = PdfGuardAgent(store);
            var extract = workflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            await agent.ExecuteAsync(extract, default);
            await PdfGuardFinishAsync(services, repository, store, workflow, chat);
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            var initial = CanonicalRecipeContentStore.Read(saved)!;
            var monday = new DateOnly(2026, 10, 12);
            var occurrence = await db.CalendarEvents.SingleAsync(x => x.Date == monday && x.MealSlot == 0);
            occurrence.RecipeId = id;
            db.SupperServings.Add(new SupperServing { Date = monday, OverrideServings = 8 });
            await db.SaveChangesAsync();
            await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            using var client = factory.CreateAuthenticatedClient();
            await GroceryTestRows.CheckAsync(client, monday, "sauce");
            async Task<string> Controls()
            {
                var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                var rows = JsonSerializer.Deserialize<GroceryLineItemDto[]>(plan.GroceryItems)!;
                using var checks = JsonDocument.Parse(plan.GroceryState);
                using var baselines = JsonDocument.Parse(plan.GroceryCheckedDemandBaselines);
                return JsonSerializer.Serialize(rows.Where(row => row.NormalizedKey is "carrot" or "sauce")
                    .OrderBy(row => row.RowId).Select(row => new { row, check = checks.RootElement.GetProperty(row.RowId),
                        baseline = baselines.RootElement.GetProperty(row.RowId) }));
            }
            var controls = await Controls();
            using var save = await client.PatchAsJsonAsync($"/api/recipes/{id}", new
            {
                expectedContentRevision = initial.ContentRevision,
                ingredientLines = initial.IngredientLines.Select((row, index) => PdfGuardRow(row) with
                    { Amount = index == 0 ? LegacyGroceryQuantity.Parse("250") : row.Amount, AmountText = index == 0 ? "250" : row.AmountText })
            });
            Assert.Equal(HttpStatusCode.OK, save.StatusCode);
            db.ChangeTracker.Clear();
            var edited = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id))!;
            Assert.Equal(LegacyGroceryQuantity.Parse("250"), edited.IngredientLines[0].Amount);
            Assert.Equal(initial.SourceRevision, edited.SourceRevision);
            Assert.Equal(initial.IngredientLines.Select(x => x.Id), edited.IngredientLines.Select(x => x.Id));
            Assert.Equal(JsonSerializer.Serialize(initial.InstructionSections), JsonSerializer.Serialize(edited.InstructionSections));
            Assert.Equal(JsonSerializer.Serialize(initial.IngredientLines[1]), JsonSerializer.Serialize(edited.IngredientLines[1]));
            await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
            var rows = JsonSerializer.Deserialize<GroceryLineItemDto[]>(plan.GroceryItems)!;
            var pasta = Assert.Single(rows, x => x.NormalizedKey == "pasta");
            Assert.Equal(LegacyGroceryQuantity.Parse("500"), pasta.ExactQuantity);
            Assert.Equal(id, Assert.Single(pasta.RecipeIds));
            Assert.Equal(LegacyGroceryQuantity.Parse("200"), Assert.Single(rows, x => x.NormalizedKey == "sauce").ExactQuantity);
            Assert.Equal(controls, await Controls());
            var readOnly = await PdfGuardSnapshotAsync(db, store, id);
            var detail = (await client.GetFromJsonAsync<RecipeDetailResponseDto>($"/api/recipes/{id}"))!.Recipe;
            Assert.Equal(edited.ContentRevision, detail!.ContentRevision);
            Assert.Equal(LegacyGroceryQuantity.Parse("250"), detail.IngredientLines![0].Amount);
            using var projection = await client.GetAsync($"/api/recipes/{id}/ingredient-projection?supperDate={monday:yyyy-MM-dd}&context=assigned&occurrenceId={occurrence.Id}");
            Assert.Equal(HttpStatusCode.OK, projection.StatusCode);
            using var projected = JsonDocument.Parse(await projection.Content.ReadAsStringAsync());
            Assert.Equal(edited.ContentRevision, projected.RootElement.GetProperty("contentRevision").GetString());
            Assert.Equal("500 g pasta", projected.RootElement.GetProperty("lines")[0].GetProperty("displayText").GetString());
            Assert.Equal(readOnly, await PdfGuardSnapshotAsync(db, store, id));
            using var clear = await client.PatchAsJsonAsync($"/api/recipes/{id}", new
            {
                expectedContentRevision = edited.ContentRevision,
                ingredientLines = edited.IngredientLines.Select((row, index) => PdfGuardRow(row) with
                    { Amount = index == 0 ? null : row.Amount, AmountText = index == 0 ? null : row.AmountText,
                        Unit = index == 0 ? null : row.Unit })
            });
            Assert.Equal(HttpStatusCode.OK, clear.StatusCode);
            db.ChangeTracker.Clear();
            var cleared = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id))!;
            Assert.Null(cleared.IngredientLines[0].Amount);
            Assert.Null(cleared.IngredientLines[0].Unit);
            Assert.Equal("human", cleared.IngredientLines[0].Provenance.Origin);
            Assert.Contains("amount", cleared.IngredientLines[0].Provenance.ProtectedFields);
            Assert.Contains("unit", cleared.IngredientLines[0].Provenance.ProtectedFields);
            var afterClear = await PdfGuardSnapshotAsync(db, store, id);
            var calls = chat.Invocations.Count;
            await agent.ExecuteAsync(extract, default);
            Assert.Equal(calls, chat.Invocations.Count);
            Assert.Equal(afterClear, await PdfGuardSnapshotAsync(db, store, id));
            await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            Assert.Equal(controls, await Controls());
            var clearedPlan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
            Assert.Null(Assert.Single(JsonSerializer.Deserialize<GroceryLineItemDto[]>(clearedPlan.GroceryItems)!,
                row => row.NormalizedKey == "pasta").ExactQuantity);
            var clearReadState = await PdfGuardSnapshotAsync(db, store, id);
            var clearDetail = (await client.GetFromJsonAsync<RecipeDetailResponseDto>($"/api/recipes/{id}"))!.Recipe;
            Assert.Null(clearDetail!.IngredientLines![0].Amount);
            Assert.Null(clearDetail.IngredientLines[0].Unit);
            Assert.Equal(cleared.ContentRevision, clearDetail.ContentRevision);
            Assert.Equal(clearReadState, await PdfGuardSnapshotAsync(db, store, id));
            var final = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.Equal(saved.RawMetadata, final.RawMetadata);
            Assert.Equal(saved.SourceUrl, final.SourceUrl);
            Assert.Equal(JsonSerializer.Serialize(edited.IngredientLines[1]), JsonSerializer.Serialize(cleared.IngredientLines[1]));
            await PdfGuardAssertMediaAsync(store, id);
        });
    }

    private static async Task<(Guid Id, WorkflowInstance Workflow, Mock<IPdfPageRenderer> Renderer)> PdfGuardCaptureAsync(
        IServiceProvider services, RecipeFilePublicationStore store, IStorageProvider storage, bool convert = true)
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        var clock = services.GetRequiredService<IClock>();
        await storage.SaveAsync("workflows", "recipe-import.yaml", await File.ReadAllTextAsync(
            Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi/Workflows/recipe-import.yaml")));
        var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db, store);
        var upload = new FormFile(new MemoryStream(PdfGuardBytes), 0, PdfGuardBytes.Length, "file", "supper.pdf")
            { Headers = new HeaderDictionary(), ContentType = "application/pdf" };
        var id = await ActivatorUtilities.CreateInstance<PdfCaptureService>(services, store, orchestrator)
            .AcceptAsync((await db.FamilyMembers.FirstAsync()).Id, upload, 2, "Keep PDF evidence.", default);
        db.ChangeTracker.Clear();
        var workflow = (await db.WorkflowInstances.Include(x => x.Tasks).ToListAsync())
            .Single(x => x.WorkflowId == "recipe-import" && x.Parameters!.Contains(id.ToString(), StringComparison.Ordinal));
        var renderer = new Mock<IPdfPageRenderer>(MockBehavior.Strict);
        renderer.Setup(x => x.RenderAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .Returns(async (Stream source, CancellationToken ct) =>
            {
                using var bytes = new MemoryStream();
                await source.CopyToAsync(bytes, ct);
                Assert.Equal(PdfGuardBytes, bytes.ToArray());
                return (IReadOnlyList<byte[]>)PdfGuardPages;
            });
        if (convert)
        {
            var task = workflow.Tasks.Single(x => x.ProcessorName == "ConvertPdf");
            await ObservePdfConversionCompletionAsync(db, workflow, task, clock,
                () => new PdfConversionProcessor(store, renderer.Object).ExecuteAsync(task, default));
        }
        return (id, workflow, renderer);
    }

    private static (RecipeAgent Agent, Mock<IChatClient> Chat) PdfGuardAgent(RecipeFilePublicationStore store, string source = PdfGuardSource)
    {
        var chat = new Mock<IChatClient>();
        chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, source)));
        var prompts = new Mock<IPromptRepository>();
        prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
        return (new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
            NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe"), chat);
    }

    private static RecipeIngredientLineInput PdfGuardRow(RecipeIngredientLineDto row) => new()
    {
        Id = row.Id, Description = row.Description, Amount = row.Amount, AmountText = row.AmountText,
        Unit = row.Unit, Package = row.Package, Scaling = row.Scaling, Shopping = row.Shopping
    };

    private static async Task<string> PdfGuardSnapshotAsync(RecipeDbContext db, RecipeFilePublicationStore store, Guid id) =>
        JsonSerializer.Serialize(new
        {
            recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id),
            files = (await store.CaptureAsync(id)).Files,
            publications = await db.RecipeFilePublications.AsNoTracking().Where(x => x.RecipeId == id).OrderBy(x => x.OperationId).ToArrayAsync(),
            reports = await db.RecipeImportReports.AsNoTracking().Where(x => x.RecipeId == id).ToArrayAsync(),
            tasks = await db.WorkflowTasks.AsNoTracking().OrderBy(x => x.InstanceId).ThenBy(x => x.TaskId).ToArrayAsync(),
            plans = await db.WeeklyPlans.AsNoTracking().OrderBy(x => x.Id).ToArrayAsync(),
            operations = await db.CanonicalRecipeOperations.CountAsync()
        });

    private static async Task PdfGuardAssertMediaAsync(RecipeFilePublicationStore store, Guid id)
    {
        var capture = await store.CaptureAsync(id);
        Assert.Equal(PdfGuardBytes, capture.Files["original/source.pdf"]);
        for (var index = 0; index < PdfGuardPages.Length; index++)
            Assert.Equal(PdfGuardPages[index], capture.Files[$"original/{index}.png"]);
    }

    private static async Task PdfGuardFinishAsync(IServiceProvider services, RecipeRepository repository,
        RecipeFilePublicationStore store, WorkflowInstance workflow, Mock<IChatClient> chat)
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        var clock = services.GetRequiredService<IClock>();
        var handler = new SourceHandler(() => { },
            """{"candidates":[{"content":{"parts":[{"inlineData":{"mimeType":"image/webp","data":"BAUG"}}]}}]}""");
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["GEMINI_API_KEY"] = "synthetic-key" }).Build();
        await new RecipeHeroAgent(store, config, NullLogger<RecipeHeroAgent>.Instance, new HeroClientFactory(handler))
            .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "GenerateHero"), default);
        Assert.Equal(1, handler.Calls);
        await new SyncRecipeProcessor(clock, db, repository, services.GetRequiredService<SupperProjectionInvalidation>(),
            Mock.Of<ISupperProjectionPublisher>(), NullLogger<SyncRecipeProcessor>.Instance)
            .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
        chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                """[{"normalizedKey":"pasta","section":"Pantry","confidence":1},{"normalizedKey":"sauce","section":"Pantry","confidence":1}]""")));
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
    }
}
