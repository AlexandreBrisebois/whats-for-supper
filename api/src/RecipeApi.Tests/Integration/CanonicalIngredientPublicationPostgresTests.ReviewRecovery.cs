using System.Text.Json;
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
    public async Task ReviewedFreshUrl_HumanCorrectionAndChangedComment_ReachesCanonicalReadyWithoutLosingEdits()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            await storage.SaveAsync("workflows", "url-import.yaml", """
                name: url-import
                parameters: [recipeId, url, repairReasons?, repairNote?]
                tasks:
                  - name: fetch_url_content
                    processor: FetchUrlContent
                    payload: {recipeId: "{{ recipeId }}", url: "{{ url }}"}
                  - name: extract_recipe
                    processor: ExtractRecipe
                    depends_on: [fetch_url_content]
                    payload: {recipeId: "{{ recipeId }}", repairReasons: "{{ repairReasons }}", repairNote: "{{ repairNote }}"}
                  - name: generate_hero
                    processor: GenerateHero
                    depends_on: [extract_recipe]
                    payload: {recipeId: "{{ recipeId }}"}
                  - name: sync_recipe
                    processor: SyncRecipe
                    depends_on: [generate_hero]
                    payload: {recipeId: "{{ recipeId }}"}
                  - name: recipe_ready
                    processor: RecipeReady
                    depends_on: [sync_recipe]
                    payload: {recipeId: "{{ recipeId }}"}
                  - name: complete_import_report
                    processor: CompleteRecipeImportReport
                    depends_on: [recipe_ready]
                    payload: {recipeId: "{{ recipeId }}"}
                """);
            var clock = services.GetRequiredService<IClock>();
            var orchestrator = new WorkflowOrchestrator(clock, new WorkflowRepository(storage), db, store);
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
            var member = (await db.FamilyMembers.FirstAsync()).Id;
            var id = await service.CaptureUrl(new() { Url = "https://example.test/reviewed-pasta" }, member);
            db.ChangeTracker.Clear();
            var first = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == "url-import");
            await Web(store, new SourceHandler(() => { })).ExecuteAsync(first.Tasks.Single(x => x.ProcessorName == "FetchUrlContent"), default);
            const string unsafeSource = """
                {"name":"Pasta","recipeYield":"4 servings","recipeIngredient":["200 g pasta, diced","100 ml sauce"],"supply":[{"name":"pasta","requiredQuantity":{"value":200,"unitText":"g"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Cook the pasta."}]}
                """;
            var chat = new Mock<IChatClient>();
            var calls = 0;
            chat.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(() => { calls++; return new ChatResponse(new ChatMessage(ChatRole.Assistant, unsafeSource)); });
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(p => p.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
            var firstExtract = first.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            var failure = await Assert.ThrowsAsync<RecipeContentReviewException>(() => agent.ExecuteAsync(firstExtract, default));
            first.Status = WorkflowStatus.Failed;
            firstExtract.Status = RecipeApi.Models.TaskStatus.Failed;
            await db.SaveChangesAsync();
            var reports = new RecipeImportReportService(clock, db, orchestrator);
            await reports.MarkFailedAsync(id, first.Id, firstExtract.TaskName, "Unsafe source wording", failure.Reasons);

            await service.UpdateRecipe(id, new UpdateRecipeDto
            {
                Ingredients = ["250 g pasta", "100 ml sauce"],
                RecipeInstructions = JsonSerializer.SerializeToElement(new[] { new { text = "Cook gently." } })
            });
            db.ChangeTracker.Clear();
            var submitted = await reports.SubmitAsync(id, member,
                new RecipeImportIssueRequest { Reasons = ["ingredients"], Note = "I corrected the pasta to 250 g and the cooking step." });
            Assert.True(submitted.ReimportStarted);
            var repair = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == submitted.ImportId);
            await Web(store, new SourceHandler(() => { })).ExecuteAsync(repair.Tasks.Single(x => x.ProcessorName == "FetchUrlContent"), default);
            var repairExtract = repair.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            var concurrent = await db.Recipes.SingleAsync(x => x.Id == id);
            var capturedNotes = concurrent.Notes;
            concurrent.Notes = "Concurrent human correction";
            await db.SaveChangesAsync();
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => agent.ExecuteAsync(repairExtract, default));
            Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == repairExtract.TaskId));
            concurrent.Notes = capturedNotes;
            await db.SaveChangesAsync();
            var beforeRepairCalls = calls;
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => agent.ExecuteAsync(repairExtract, default));
            Assert.False((await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == repairExtract.TaskId)).Delivered);
            storage.FailInfo = false;
            await agent.ExecuteAsync(repairExtract, default);
            await agent.ExecuteAsync(repairExtract, default);
            Assert.Equal(beforeRepairCalls, calls);
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            var content = CanonicalRecipeContentStore.Read(saved)!;
            Assert.Equal("250 g pasta", CanonicalRecipeContentStore.Render(content.IngredientLines[0]));
            Assert.Equal(LegacyGroceryQuantity.Parse("250"), content.IngredientLines[0].Amount);
            Assert.Equal(LegacyGroceryQuantity.Parse("500"), SupperIngredientProjection.Read(saved, 8)[0].GroceryObservation.Quantity);
            Assert.Equal("human", content.IngredientLines[0].Provenance.Origin);
            using (var source = JsonDocument.Parse(saved.RawMetadata!))
            {
                Assert.Equal(200, source.RootElement.GetProperty("supply")[0].GetProperty("requiredQuantity").GetProperty("value").GetInt32());
                Assert.Equal("250 g pasta", source.RootElement.GetProperty("recipeIngredient")[0].GetString());
            }
            Assert.Equal("Cook gently.", content.InstructionSections.Single().Steps.Single().Text);
            Assert.False(saved.IsReady);
            Assert.Equal("https://example.test/reviewed-pasta", saved.SourceUrl);
            var hero = repair.Tasks.Single(x => x.ProcessorName == "GenerateHero");
            await store.PublishAsync(await store.CaptureForTaskAsync(hero, id),
                new(null, await repository.GetInfoAsync(id, default),
                    "GenerateHero\n" + JsonSerializer.Serialize(JsonDocument.Parse(hero.Payload).RootElement),
                    new Dictionary<string, byte[]?> { ["hero.webp"] = [4, 5, 6] }, SourceKind: "hero"), hero.TaskId);
            Assert.Equal(saved.CanonicalContent, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent);
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
            var human = await db.Recipes.SingleAsync(x => x.Id == id);
            human.Notes = "Keep this correction";
            await db.SaveChangesAsync();
            await agent.ExecuteAsync(repairExtract, default);
            var afterReplay = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.Equal("Keep this correction", afterReplay.Notes);
            Assert.Equal(saved.CanonicalContent, afterReplay.CanonicalContent);
            Assert.Equal(beforeRepairCalls, calls);
            var management = services.GetRequiredService<ManagementService>();
            await management.BackupAsync();
            var readback = await management.RestoreAsync();
            Assert.Equal(0, readback.Errors);
            Assert.Equal(afterReplay.CanonicalContent,
                (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent);
        }, localRecipeStore: true);
    }
}
