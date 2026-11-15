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

namespace RecipeApi.Tests.Services;

public sealed partial class RecipeProtectedReimportTests
{
    [Theory]
    [InlineData("source")]
    [InlineData("protected-before")]
    [InlineData("renamed-before")]
    [InlineData("stale-after")]
    [InlineData("mapped-source")]
    [InlineData("mapped-clear-before")]
    [InlineData("reordered")]
    [InlineData("duplicate")]
    [InlineData("changed-shape")]
    [InlineData("followup")]
    [InlineData("report-note-mismatch")]
    [InlineData("report-reasons-mismatch")]
    [InlineData("provider-failure")]
    [InlineData("provider-cancellation")]
    [InlineData("delivery-replay")]
    [InlineData("delivery-newer-pending")]
    [InlineData("metadata-sync-failure")]
    public async Task ReportedCanonicalPhoto_RealAcceptedRepairUpdatesSourceFactsAndPreservesOriginalMedia(string mode)
    {
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
        { ["Tests:LocalRecipeStore"] = "true", ["Tests:RealWorkflowOrchestrator"] = "true" });
        await QualifyPhotoRepairAsync(factory, mode);
    }

    internal static async Task QualifyPhotoRepairAsync(TestWebApplicationFactory factory, string mode, string channel = "photo")
    {
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var storage = services.GetRequiredService<IStorageProvider>();
        var mapped = mode.StartsWith("mapped-", StringComparison.Ordinal);
        if (mapped)
            await services.GetRequiredService<FoodVocabularyStore>().PublishReviewedAsync(await File.ReadAllBytesAsync(Path.Combine(
                Integration.DeploymentCalendarPostgresTests.RepositoryRoot(), "api/src/RecipeApi.Tests/Fixtures/food-vocabulary-three-anchor-v1.json")),
                null, Guid.NewGuid(), "photo-repair-qualified-fixture");
        var workflowId = channel == "url" ? "url-import" : "recipe-import";
        await storage.SaveAsync("workflows", workflowId + ".yaml", await File.ReadAllTextAsync(Path.Combine(
            Integration.DeploymentCalendarPostgresTests.RepositoryRoot(), $"api/src/RecipeApi/Workflows/{workflowId}.yaml")));
        var originalBytes = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=");
        using var image = new MemoryStream(originalBytes);
        var file = new FormFile(image, 0, image.Length, "files", "recipe.png") { Headers = new HeaderDictionary(), ContentType = "image/png" };
        var id = channel == "url"
            ? await services.GetRequiredService<RecipeService>().CaptureUrl(new() { Url = "https://example.test/protected-repair" }, factory.DefaultFamilyMemberId)
            : channel == "pdf"
                ? await services.GetRequiredService<PdfCaptureService>().AcceptAsync(factory.DefaultFamilyMemberId,
                    new FormFile(new MemoryStream("%PDF-1.4 retained source"u8.ToArray()), 0, "%PDF-1.4 retained source"u8.Length, "file", "recipe.pdf")
                    { Headers = new HeaderDictionary(), ContentType = "application/pdf" }, 0, null, default)
                : await services.GetRequiredService<RecipeService>().CreateRecipe(factory.DefaultFamilyMemberId,
                    new FormFileCollection { file }, new CreateRecipeDto { Rating = 0, FinishedDishImageIndex = -1 });
        var db = services.GetRequiredService<RecipeDbContext>();
        var first = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == workflowId);
        var publisher = services.GetRequiredService<RecipeFilePublicationStore>();
        var source = mapped ? Source(200).Replace("pasta", "onion", StringComparison.Ordinal) : Source(200);
        var calls = 0;
        var providerMode = "";
        Func<Task>? beforeResponse = null;
        using var cancellation = new CancellationTokenSource();
        var chat = new Mock<IChatClient>();
        chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
            .Returns(async () =>
            {
                calls++;
                if (providerMode == "provider-failure") throw new IOException("Controlled photo repair provider failure");
                if (providerMode == "provider-cancellation")
                {
                    cancellation.Cancel();
                    cancellation.Token.ThrowIfCancellationRequested();
                }
                if (beforeResponse is not null) await beforeResponse();
                return new ChatResponse(new ChatMessage(ChatRole.Assistant, source));
            });
        var prompts = new Mock<IPromptRepository>();
        prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract the selected recipe response.");
        var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance,
            publisher, "ExtractRecipe");
        await PrepareOriginalChannel(services, publisher, first, channel, originalBytes);
        await agent.ExecuteAsync(first.Tasks.Single(x => x.ProcessorName == "ExtractRecipe"), default);
        if (mode is "followup" or "metadata-sync-failure")
        {
            var originalHero = first.Tasks.Single(x => x.ProcessorName == "GenerateHero");
            var heroCapture = await publisher.CaptureForTaskAsync(originalHero, id);
            var normalize = typeof(CanonicalRecipeContentStore).GetMethod("NormalizeJson", BindingFlags.Static | BindingFlags.NonPublic)!;
            await publisher.PublishAsync(heroCapture, new(null,
                JsonSerializer.Deserialize<RecipeInfo>(heroCapture.Files["recipe.info"]!, JsonDefaults.CaseInsensitive)!,
                "GenerateHero\n" + (string)normalize.Invoke(null, [originalHero.Payload])!,
                new Dictionary<string, byte[]?> { ["hero.webp"] = [7, 8, 9] }, SourceKind: "hero"), originalHero.TaskId);
        }
        await publisher.CompleteReadinessAsync(first.Tasks.Single(x => x.ProcessorName == "RecipeReady"), id);
        first.Status = WorkflowStatus.Completed;
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var original = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        var baseline = CanonicalRecipeContentStore.Read(original)!;
        Assert.Equal("200", baseline.IngredientLines[0].Amount!.Value!.N);
        Assert.Equal("source", baseline.IngredientLines[0].Provenance.Origin);
        if (mapped) Assert.NotNull(baseline.IngredientLines[0].Shopping.FoodId);
        if (mode == "metadata-sync-failure")
        {
            var innerStore = services.GetRequiredService<IRecipeStore>();
            var failedStore = new Mock<IRecipeStore>(MockBehavior.Strict);
            failedStore.Setup(x => x.ReadInfoAsync(id, It.IsAny<CancellationToken>()))
                .Returns((Guid recipeId, CancellationToken token) => innerStore.ReadInfoAsync(recipeId, token));
            failedStore.Setup(x => x.WriteInfoAsync(It.IsAny<RecipeInfo>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new IOException("Controlled metadata synchronization interruption after canonical commit"));
            var failedImages = new ImageService(failedStore.Object, NullLogger<ImageService>.Instance);
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, failedImages);
            await Assert.ThrowsAsync<IOException>(() => service.UpdateRecipe(id, new UpdateRecipeDto
            {
                ExpectedContentRevision = baseline.ContentRevision,
                Name = "Current private photo name", Description = "", Notes = "Current private note",
                IngredientLines = JsonSerializer.SerializeToElement(baseline.IngredientLines.Select(line => new
                {
                    id = line.Id, description = line.Description, amount = line.Amount, amountText = line.AmountText,
                    unit = line.Unit, scaling = line.Scaling, package = line.Package, shopping = line.Shopping
                }))
            }));
            db.ChangeTracker.Clear();
            original = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            baseline = CanonicalRecipeContentStore.Read(original)!;
            Assert.Equal(("Current private photo name", "", "Current private note"), (original.Name, original.Description, original.Notes));
            Assert.Equal("Pasta", (await innerStore.ReadInfoAsync(id))!.Name);
            Assert.False(string.IsNullOrEmpty((await innerStore.ReadInfoAsync(id))!.Description));
        }

        using var client = factory.CreateAuthenticatedClient();
        client.DefaultRequestHeaders.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        async Task ClearHumanFields()
        {
            using var changed = await client.PatchAsJsonAsync($"/api/recipes/{id}", new
            {
                expectedContentRevision = baseline.ContentRevision, servings = 4,
                name = "My private pasta name", description = "", notes = "Private repair note",
                ingredientLines = baseline.IngredientLines.Select((line, index) => new
                {
                    id = line.Id, description = index == 0 && mode == "renamed-before" ? "our private pasta" : line.Description,
                    amount = index == 0 ? null : line.Amount,
                    amountText = index == 0 ? null : line.AmountText, unit = line.Unit,
                    scaling = line.Scaling, package = line.Package,
                    shopping = index == 0 ? new RecipeShoppingAssociationDto(mapped ? "onion" : "our noodles", null, null) : line.Shopping
                }),
                instructionSections = baseline.InstructionSections.Select(section => new
                {
                    id = section.Id, name = section.Name,
                    steps = section.Steps.Select(step => new { id = step.Id, text = "Human cooking instruction." })
                })
            });
            Assert.Equal(HttpStatusCode.OK, changed.StatusCode);
        }
        if (mode is "protected-before" or "mapped-clear-before" or "renamed-before") await ClearHumanFields();
        var stepRepair = mode.StartsWith("steps-", StringComparison.Ordinal);
        if (mode == "steps-missing-proof")
        {
            // A current record without retained producer authority cannot certify
            // original step ownership (for example, converted historical content).
            var originalExtraction = first.Tasks.Single(t => t.ProcessorName == "ExtractRecipe").TaskId;
            db.RecipeFilePublications.Remove(await db.RecipeFilePublications.SingleAsync(x => x.OperationId == originalExtraction));
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
        }
        if (mode is "steps-protected" or "steps-reverted")
        {
            async Task SetStep(string text)
            {
                var current = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id))!;
                using var result = await client.PatchAsJsonAsync($"/api/recipes/{id}", new
                {
                    expectedContentRevision = current.ContentRevision,
                    instructionSections = current.InstructionSections.Select(section => new
                    { id = section.Id, name = section.Name, steps = section.Steps.Select(step => new { id = step.Id, text }) })
                });
                Assert.Equal(HttpStatusCode.OK, result.StatusCode);
            }
            await SetStep("My human step.");
            if (mode == "steps-reverted") await SetStep("Cook the pasta gently.");
        }
        var capturedEvidence = (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).FoodMappingEvidence;
        using var reported = await client.PostAsJsonAsync($"/api/recipes/{id}/import-report",
            new RecipeImportIssueRequest { Reasons = stepRepair ? ["steps"] : ["ingredients"], Note = stepRepair ? "Read the original cooking instruction again." : "The original says 300 g pasta, please read that line again." });
        Assert.Equal(HttpStatusCode.OK, reported.StatusCode);
        db.ChangeTracker.Clear();
        var report = await db.RecipeImportReports.AsNoTracking().SingleAsync(x => x.RecipeId == id);
        Assert.Equal(RecipeImportReportStatus.Reimporting, report.Status);
        Assert.NotNull(report.RepairIntentId);
        var repair = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == report.LastWorkflowInstanceId);
        if (mode is "report-note-mismatch" or "report-reasons-mismatch")
        {
            var changedReport = await db.RecipeImportReports.SingleAsync(x => x.RecipeId == id);
            if (mode == "report-note-mismatch") changedReport.Note = "Different feedback, still nonblank.";
            else changedReport.Reasons = ["steps"];
            await db.SaveChangesAsync();
            var beforeMismatchCalls = calls;
            var mismatchedTask = repair.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.ExecuteAsync(mismatchedTask, default));
            Assert.Equal(beforeMismatchCalls, calls);
            db.ChangeTracker.Clear();
            Assert.Equal(original.CanonicalContent, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent);
            Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == mismatchedTask.TaskId));
            return;
        }
        await ReuseCapturedChannel(publisher, db, repair, channel, id);
        source = mapped ? Source(300).Replace("pasta", "onion", StringComparison.Ordinal) : Source(300);
        if (stepRepair)
        {
            source = source.Replace("Cook the pasta gently.", "Add all 200 g pasta.", StringComparison.Ordinal);
            var task = repair.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            if (mode == "steps-late-human")
            {
                beforeResponse = async () =>
                {
                    using var changed = await client.PatchAsJsonAsync($"/api/recipes/{id}", new
                    {
                        expectedContentRevision = baseline.ContentRevision,
                        instructionSections = baseline.InstructionSections.Select(section => new
                        { id = section.Id, name = section.Name, steps = section.Steps.Select(step => new { id = step.Id, text = "Late human step." }) })
                    });
                    Assert.Equal(HttpStatusCode.OK, changed.StatusCode);
                };
                await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.ExecuteAsync(task, default));
                db.ChangeTracker.Clear();
                Assert.Equal("Late human step.", CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking()
                    .SingleAsync(x => x.Id == id))!.InstructionSections.Single().Steps.Single().Text);
                Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == task.TaskId));
                return;
            }
            if (mode == "steps-forged-proof")
            {
                var capture = await publisher.CaptureForTaskAsync(task, id);
                var normalize = typeof(CanonicalRecipeContentStore).GetMethod("NormalizeJson", BindingFlags.NonPublic | BindingFlags.Static)!;
                var prepare = typeof(RecipeFilePublicationStore).GetMethod("PrepareAcceptedRepairAsync", BindingFlags.NonPublic | BindingFlags.Instance)!;
                var candidate = await (Task<RecipePublicationCandidate>)prepare.Invoke(publisher,
                    [capture, source, JsonSerializer.Deserialize<RecipeInfo>(capture.Files["recipe.info"]!, JsonDefaults.CaseInsensitive)!,
                        "ExtractRecipe\n" + (string)normalize.Invoke(null, [task.Payload])!, task.TaskId, CancellationToken.None])!;
                var prepareIngredients = typeof(RecipeFilePublicationStore).GetMethod("PreparePhotoIngredientRepair", BindingFlags.NonPublic | BindingFlags.Instance)!;
                var unselected = (FoodMappingPreparation)prepareIngredients.Invoke(publisher, [capture, source, task.TaskId, null])!;
                await Assert.ThrowsAsync<InvalidDataException>(() => publisher.PublishAsync(capture, candidate with
                {
                    RecipeJson = RecipeExportContent.WriteCurrent(unselected.Export), SourceContext = null,
                    SourceKind = "canonical-ingredient-repair", MappingEvidence = unselected.Evidence
                }, task.TaskId));
                Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == task.TaskId));
                foreach (var fault in new[] { "snapshot", "hash", "foreign", "cycle" })
                {
                    var proof = JsonNode.Parse(candidate.SourceContext!)!;
                    if (fault == "snapshot") proof["stepSource"]!["content"]!["servings"] = 9;
                    else if (fault == "hash") proof["stepSource"]!["payloadHash"] = new string('0', 64);
                    else proof["stepSource"]!["operationId"] = fault == "cycle" ? task.TaskId : Guid.NewGuid();
                    await Assert.ThrowsAsync<InvalidDataException>(() => publisher.PublishAsync(capture,
                        candidate with { SourceContext = proof.ToJsonString() }, task.TaskId));
                    Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == task.TaskId));
                }
            }
            await agent.ExecuteAsync(task, default);
            db.ChangeTracker.Clear();
            var repaired = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id))!;
            Assert.Equal("200", repaired.IngredientLines[0].Amount!.Value!.N);
            Assert.Equal("100", repaired.IngredientLines[1].Amount!.Value!.N);
            var expected = mode is "steps-source" or "steps-forged-proof" or "steps-repeat" ? "Add all 200 g pasta." : mode == "steps-protected" ? "My human step." : "Cook the pasta gently.";
            Assert.Equal(expected, repaired.InstructionSections.Single().Steps.Single().Text);
            if (mode is "steps-source" or "steps-forged-proof" or "steps-repeat")
                Assert.Equal("Add all 400 g pasta.", CookingStepProjection.Read(repaired, 8).Sections.Single().Steps.Single().Text);
            else Assert.Empty(repaired.InstructionSections.Single().Steps.Single().Bindings);
            var committed = (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent;
            var callsBeforeRepeat = calls;
            await agent.ExecuteAsync(task, default);
            Assert.Equal(callsBeforeRepeat, calls);
            Assert.Equal(committed, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent);
            Assert.Equal(originalBytes, await services.GetRequiredService<RecipeRepository>().GetOriginalImageAsync(id, 0, default));
            if (mode == "steps-repeat")
            {
                await new RecipeHeroAgent(publisher, new ConfigurationManager(), NullLogger<RecipeHeroAgent>.Instance)
                    .ExecuteAsync(repair.Tasks.Single(x => x.ProcessorName == "GenerateHero"), default);
                await ActivatorUtilities.CreateInstance<SyncRecipeProcessor>(services)
                    .ExecuteAsync(repair.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
                var category = repair.Tasks.Single(x => x.ProcessorName == "CategorizeRecipe");
                await publisher.PublishCategorizationAsync(category, await publisher.CaptureForTaskAsync(category, id),
                    new Recipe { Id = id, Name = "Pasta", Category = "Pasta" });
                await publisher.CompleteReadinessAsync(repair.Tasks.Single(x => x.ProcessorName == "RecipeReady"), id);
                await new CompleteRecipeImportReportProcessor(services.GetRequiredService<RecipeImportReportService>())
                    .ExecuteAsync(repair.Tasks.Single(x => x.ProcessorName == "CompleteRecipeImportReport"), default);
                (await db.WorkflowInstances.SingleAsync(x => x.Id == repair.Id)).Status = WorkflowStatus.Completed;
                await db.SaveChangesAsync();
                using var again = await client.PostAsJsonAsync($"/api/recipes/{id}/import-report",
                    new RecipeImportIssueRequest { Reasons = ["steps"], Note = "Now check the sauce instruction from the same original." });
                Assert.Equal(HttpStatusCode.OK, again.StatusCode);
                db.ChangeTracker.Clear();
                var nextReport = await db.RecipeImportReports.AsNoTracking().SingleAsync(x => x.RecipeId == id);
                var next = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == nextReport.LastWorkflowInstanceId);
                Assert.NotEqual(repair.Id, next.Id);
                await ReuseCapturedChannel(publisher, db, next, channel, id);
                source = Source(400).Replace("Cook the pasta gently.", "Add all 100 g sauce.", StringComparison.Ordinal);
                await agent.ExecuteAsync(next.Tasks.Single(x => x.ProcessorName == "ExtractRecipe"), default);
                db.ChangeTracker.Clear();
                var second = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id))!;
                Assert.Equal("Add all 100 g sauce.", second.InstructionSections.Single().Steps.Single().Text);
                Assert.Equal("Add all 200 g sauce.", CookingStepProjection.Read(second, 8).Sections.Single().Steps.Single().Text);
                Assert.Equal("200", second.IngredientLines[0].Amount!.Value!.N);
                Assert.Equal("100", second.IngredientLines[1].Amount!.Value!.N);
            }
            var publications = await db.RecipeFilePublications.AsNoTracking().Where(x => x.RecipeId == id).ToDictionaryAsync(x => x.OperationId);
            var validateSources = typeof(RecipeFilePublicationStore).GetMethod("ValidateRecoveryRepairSources", BindingFlags.NonPublic | BindingFlags.Static)!;
            validateSources.Invoke(null, [publications]);
            if (mode == "steps-repeat")
            {
                var missingPredecessor = publications.Where(x => x.Key != task.TaskId).ToDictionary(x => x.Key, x => x.Value);
                var missing = Assert.Throws<TargetInvocationException>(() => validateSources.Invoke(null, [missingPredecessor]));
                Assert.IsType<InvalidDataException>(missing.InnerException);
            }
            using var proofWire = JsonDocument.Parse(publications[task.TaskId].Payload);
            var repairInput = JsonNode.Parse(proofWire.RootElement.GetProperty("candidate").GetProperty("sourceContext").GetString()!)!;
            if (repairInput["stepSource"] is not null)
            {
                publications.Remove(first.Tasks.Single(x => x.ProcessorName == "ExtractRecipe").TaskId);
                var failure = Assert.Throws<TargetInvocationException>(() => validateSources.Invoke(null, [publications]));
                Assert.IsType<InvalidDataException>(failure.InnerException);
            }
            return;
        }
        if (mode is "stale-during-provider" or "source-during-provider")
        {
            var pending = repair.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            var beforeCalls = calls;
            if (mode == "stale-during-provider") beforeResponse = ClearHumanFields;
            else beforeResponse = () => storage.SaveAsync("recipes", $"{id}/original/{(channel == "url" ? "content.html" : "source.pdf")}", "changed after accepted capture");
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.ExecuteAsync(pending, default));
            Assert.True(calls > beforeCalls);
            db.ChangeTracker.Clear();
            var after = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            if (mode == "stale-during-provider")
            {
                Assert.Null(CanonicalRecipeContentStore.Read(after)!.IngredientLines[0].Amount);
                Assert.Equal("Human cooking instruction.", CanonicalRecipeContentStore.Read(after)!.InstructionSections[0].Steps[0].Text);
            }
            else Assert.Equal(original.CanonicalContent, after.CanonicalContent);
            Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == pending.TaskId));
            return;
        }
        if (mode is "delivery-replay" or "delivery-newer-pending")
        {
            await QualifyPhotoDeliveryAsync(services, repair.Tasks.Single(x => x.ProcessorName == "ExtractRecipe"), id,
                chat, prompts.Object, mode == "delivery-newer-pending");
            return;
        }
        if (mode is "provider-failure" or "provider-cancellation")
        {
            var beforeFailure = (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent;
            var root = services.GetRequiredService<RecipesRootResolver>().Root;
            var files = PhotoFiles(root);
            providerMode = mode;
            var failedTask = repair.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            if (mode == "provider-failure") await Assert.ThrowsAsync<IOException>(() => agent.ExecuteAsync(failedTask, default));
            else await Assert.ThrowsAnyAsync<OperationCanceledException>(() => agent.ExecuteAsync(failedTask, cancellation.Token));
            db.ChangeTracker.Clear();
            Assert.Equal(beforeFailure, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent);
            Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == failedTask.TaskId));
            Assert.Equal(files, PhotoFiles(root));
            return;
        }
        if (mode is "reordered" or "duplicate" or "changed-shape")
        {
            var changedSource = JsonNode.Parse(source)!;
            if (mode == "reordered")
            {
                changedSource["recipeIngredient"] = new JsonArray(changedSource["recipeIngredient"]!.AsArray().Reverse().Select(x => x!.DeepClone()).ToArray());
                changedSource["supply"] = new JsonArray(changedSource["supply"]!.AsArray().Reverse().Select(x => x!.DeepClone()).ToArray());
            }
            else if (mode == "duplicate")
            {
                changedSource["recipeIngredient"]![1] = "150 g pasta";
                changedSource["supply"]![1]!["name"] = "pasta";
            }
            else
            {
                changedSource["recipeIngredient"]!.AsArray().Add("10 g salt");
                changedSource["supply"]!.AsArray().Add(JsonNode.Parse("""{"name":"salt","requiredQuantity":{"value":10,"unitText":"g"}}"""));
            }
            source = changedSource.ToJsonString();
            var beforeReview = (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent;
            var reviewTask = repair.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            await Assert.ThrowsAsync<RecipeContentReviewException>(() => agent.ExecuteAsync(reviewTask, default));
            db.ChangeTracker.Clear();
            Assert.Equal(beforeReview, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent);
            Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == reviewTask.TaskId));
            Assert.Equal(originalBytes, await services.GetRequiredService<RecipeRepository>().GetOriginalImageAsync(id, 0, default));
            return;
        }
        var beforeRepairCalls = calls;
        var repairTask = repair.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
        if (mode == "stale-after")
        {
            await ClearHumanFields();
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.ExecuteAsync(repairTask, default));
            Assert.Equal(beforeRepairCalls, calls);
        }
        else
        {
            var returned = await agent.ExecuteAsync(repairTask, default);
            var publication = await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == repairTask.TaskId);
            var validate = typeof(RecipeAgent).GetMethod("ValidateOriginalHistory", BindingFlags.Static | BindingFlags.NonPublic)!;
            Assert.Equal(id, validate.Invoke(null, ["ExtractRecipe", repairTask.Payload,
                JsonSerializer.Serialize(returned, JsonDefaults.CamelCase), new[] { publication }]));
        }
        if (mode != "stale-after") Assert.True(calls > beforeRepairCalls);
        db.ChangeTracker.Clear();
        var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
        var current = CanonicalRecipeContentStore.Read(saved)!;
        if (mode is "source" or "mapped-source" or "followup" or "metadata-sync-failure") Assert.Equal("300", current.IngredientLines[0].Amount!.Value!.N);
        else
        {
            Assert.Null(current.IngredientLines[0].Amount);
            if (mode == "renamed-before") Assert.Equal("our private pasta", current.IngredientLines[0].Description);
            Assert.Equal(mapped ? "onion" : "our noodles", current.IngredientLines[0].Shopping.Name);
            Assert.Equal(("My private pasta name", "", "Private repair note"), (saved.Name, saved.Description, saved.Notes));
            Assert.Equal("Human cooking instruction.", current.InstructionSections.Single().Steps.Single().Text);
        }
        Assert.Equal(mode == "stale-after" ? "100" : "150", current.IngredientLines[1].Amount!.Value!.N);
        if (mode == "mapped-source") Assert.Equal(baseline.IngredientLines[0].Shopping, current.IngredientLines[0].Shopping);
        if (mode == "mapped-clear-before") Assert.Null(current.IngredientLines[0].Shopping.FoodId);
        if (mapped)
        {
            using var oldProof = JsonDocument.Parse(capturedEvidence!);
            using var newProof = JsonDocument.Parse(saved.FoodMappingEvidence!);
            var oldDecision = oldProof.RootElement.GetProperty("nameDecisions")[0];
            var newDecision = newProof.RootElement.GetProperty("nameDecisions")[0];
            Assert.Equal(oldDecision.GetProperty("decidingOperationId").GetGuid(), newDecision.GetProperty("decidingOperationId").GetGuid());
            Assert.Equal(oldDecision.GetProperty("mappingRevision").GetString(), newDecision.GetProperty("mappingRevision").GetString());
            Assert.Equal(oldDecision.GetProperty("kind").GetString(), newDecision.GetProperty("kind").GetString());
            if (mode == "mapped-source")
            {
                var authority = await services.GetRequiredService<FoodVocabularyStore>().CaptureAuthorityAsync(saved.FoodMappingEvidence);
                Assert.Throws<InvalidDataException>(() => FoodMappingQualification.Validate(current, original.FoodMappingEvidence, authority, id));
                FoodMappingQualification.Validate(current, saved.FoodMappingEvidence, authority, id);
            }
            else Assert.Equal("protected_clear", newDecision.GetProperty("kind").GetString());
        }
        Assert.Equal(baseline.IngredientLines[0].Id, current.IngredientLines[0].Id);
        Assert.NotEqual(baseline.ContentRevision, current.ContentRevision);
        Assert.Equal(originalBytes, await services.GetRequiredService<RecipeRepository>().GetOriginalImageAsync(id, 0, default));
        if (mode is "source" or "mapped-source" or "followup" or "metadata-sync-failure") Assert.Equal(original.Notes, saved.Notes);
        if (mode == "metadata-sync-failure") Assert.Equal((original.Name, original.Description, original.Notes), (saved.Name, saved.Description, saved.Notes));
        Assert.Equal(RecipeImportReportStatus.Reimporting, (await db.RecipeImportReports.AsNoTracking().SingleAsync(x => x.RecipeId == id)).Status);
        if (mode is "followup" or "metadata-sync-failure")
        {
            var hero = repair.Tasks.Single(x => x.ProcessorName == "GenerateHero");
            await new RecipeHeroAgent(publisher, new ConfigurationManager(), NullLogger<RecipeHeroAgent>.Instance).ExecuteAsync(hero, default);
            Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == hero.TaskId));
            await ActivatorUtilities.CreateInstance<SyncRecipeProcessor>(services).ExecuteAsync(
                repair.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
            var category = repair.Tasks.Single(x => x.ProcessorName == "CategorizeRecipe");
            await publisher.PublishCategorizationAsync(category, await publisher.CaptureForTaskAsync(category, id),
                new Recipe { Id = id, Name = saved.Name, Category = "Pasta" });
            await publisher.CompleteReadinessAsync(repair.Tasks.Single(x => x.ProcessorName == "RecipeReady"), id);
            await new CompleteRecipeImportReportProcessor(services.GetRequiredService<RecipeImportReportService>()).ExecuteAsync(
                repair.Tasks.Single(x => x.ProcessorName == "CompleteRecipeImportReport"), default);
            db.ChangeTracker.Clear();
            var finished = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.Equal(current.ContentRevision, CanonicalRecipeContentStore.Read(finished)!.ContentRevision);
            if (mode == "metadata-sync-failure")
            {
                Assert.Equal((original.Name, original.Description, original.Notes), (finished.Name, finished.Description, finished.Notes));
                Assert.Equal("Pasta", (await services.GetRequiredService<IRecipeStore>().ReadInfoAsync(id))!.Name);
            }
            Assert.Equal(RecipeImportReportStatus.ReadyToReview, (await db.RecipeImportReports.AsNoTracking().SingleAsync(x => x.RecipeId == id)).Status);
            Assert.Equal([7, 8, 9], await storage.LoadAsync("recipes", $"{id}/hero.webp"));
            var beforeLateReplay = calls;
            await agent.ExecuteAsync(repairTask, default);
            Assert.Equal(beforeLateReplay, calls);
            if (mode == "metadata-sync-failure")
            {
                var read = await client.GetFromJsonAsync<RecipeDetailResponseDto>($"/api/recipes/{id}");
                Assert.Equal((original.Name, original.Description, original.Notes), (read!.Recipe.Name, read.Recipe.Description, read.Recipe.Notes));
            }
            Assert.Equal(originalBytes, await services.GetRequiredService<RecipeRepository>().GetOriginalImageAsync(id, 0, default));
            var calendar = services.GetRequiredService<DeploymentCalendar>().Capture(services.GetRequiredService<IClock>().UtcNow);
            var week = calendar.CurrentWeekStartDate.ToString("yyyy-MM-dd");
            var day = calendar.Today.ToString("yyyy-MM-dd");
            var portions = (await client.GetFromJsonAsync<JsonElement>($"/api/schedule/servings?weekOffset=0&referenceWeekStartDate={week}")).GetProperty("data");
            using var chosen = await client.PutAsJsonAsync("/api/schedule/servings", new
            {
                referenceWeekStartDate = week, weekOffset = 0, expectedVersion = portions.GetProperty("version").GetString(),
                days = new[] { new { date = day, servings = 8 } }
            });
            Assert.Equal(HttpStatusCode.OK, chosen.StatusCode);
            using var assigned = await client.PostAsJsonAsync($"/api/schedule/assign?referenceWeekStartDate={week}",
                new { weekOffset = 0, dayIndex = calendar.Today.DayNumber - calendar.CurrentWeekStartDate.DayNumber, recipeId = id, requireEmpty = true });
            Assert.Equal(HttpStatusCode.OK, assigned.StatusCode);
            await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(calendar.CurrentWeekStartDate, default);
            var schedule = (await client.GetFromJsonAsync<JsonElement>($"/api/schedule?weekOffset=0&referenceWeekStartDate={week}")).GetProperty("data");
            var pasta = Assert.Single(schedule.GetProperty("groceryItems").EnumerateArray(), row => row.GetProperty("normalizedKey").GetString() == "pasta");
            Assert.Equal("600", pasta.GetProperty("quantity").GetProperty("value").GetProperty("n").GetString());
            Assert.Equal("1", pasta.GetProperty("quantity").GetProperty("value").GetProperty("d").GetString());
        }
    }

    private static string Source(int amount) => JsonSerializer.Serialize(new
    {
        name = "Pasta", recipeYield = "4 servings", recipeIngredient = new[] { $"{amount} g pasta", $"{amount / 2} g sauce" },
        supply = new[] { new { name = "pasta", requiredQuantity = new { value = amount, unitText = "g" } },
            new { name = "sauce", requiredQuantity = new { value = amount / 2, unitText = "g" } } },
        recipeInstructions = new[] { new { name = "Cook", itemListElement = new[] { new { text = "Cook the pasta gently." } } } }
    });
}
