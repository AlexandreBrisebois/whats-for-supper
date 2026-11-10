using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using RecipeApi.Infrastructure;
using RecipeApi.Dto;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshUrlLosslessExtraction_PublishesCanonicalOriginalFactsOnce()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            await storage.SaveAsync("workflows", "url-import.yaml", """
                name: url-import
                parameters: [recipeId, url]
                tasks:
                  - name: fetch_url_content
                    processor: FetchUrlContent
                    payload: {recipeId: "{{ recipeId }}", url: "{{ url }}"}
                  - name: extract_recipe
                    processor: ExtractRecipe
                    depends_on: [fetch_url_content]
                    payload: {recipeId: "{{ recipeId }}"}
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
                """);
            var orchestrator = new WorkflowOrchestrator(services.GetRequiredService<IClock>(),
                new WorkflowRepository(storage), db, store);
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
            var id = await service.CaptureUrl(new() { Url = "https://example.test/pasta" },
                (await db.FamilyMembers.FirstAsync()).Id);
            db.ChangeTracker.Clear();
            var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == "url-import");
            await Web(store, new SourceHandler(() => { })).ExecuteAsync(
                workflow.Tasks.Single(x => x.ProcessorName == "FetchUrlContent"), default);
            const string complete = """
                {"name":"Pasta","recipeYield":"4 servings","recipeIngredient":["200 g pasta","100 ml sauce","salt to taste"],"supply":[{"name":"pasta","requiredQuantity":{"value":200,"unitText":"g"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Cook the pasta."}]}
                """;
            var chat = new Mock<IChatClient>();
            var calls = 0;
            chat.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(() => { calls++; return new ChatResponse(new ChatMessage(ChatRole.Assistant, complete)); });
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(p => p.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
            var extract = workflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            storage.FailInfo = true;
            await Assert.ThrowsAsync<IOException>(() => agent.ExecuteAsync(extract, default));
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            var canonical = CanonicalRecipeContentStore.Read(saved)!;
            Assert.Equal(4, canonical.Servings);
            Assert.Equal(3, canonical.IngredientLines.Count);
            Assert.Equal("200 g pasta", CanonicalRecipeContentStore.Render(canonical.IngredientLines[0]));
            Assert.Equal("100 ml sauce", CanonicalRecipeContentStore.Render(canonical.IngredientLines[1]));
            Assert.Null(canonical.IngredientLines[2].Amount);
            Assert.Equal("source", canonical.IngredientLines[0].Provenance.Origin);
            Assert.Empty(canonical.InstructionSections.SelectMany(x => x.Steps).SelectMany(x => x.Bindings));
            Assert.Equal(2, SupperIngredientProjection.Read(saved, 8).Count(x => x.GroceryObservation.Quantity is not null));
            var callsBeforeReplay = calls;
            Assert.False((await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == extract.TaskId)).Delivered);
            storage.FailInfo = false;
            await agent.ExecuteAsync(extract, default);
            using (var json = JsonDocument.Parse(await repository.GetRecipeJsonAsync(id, default)))
                Assert.Equal(id, RecipeExportContent.ReadCurrent(json.RootElement, id).RecipeId);
            Assert.Equal(callsBeforeReplay, calls);
            Assert.Equal(saved.CanonicalContent, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent);
            var hero = workflow.Tasks.Single(x => x.ProcessorName == "GenerateHero");
            var heroCapture = await store.CaptureForTaskAsync(hero, id);
            await store.PublishAsync(heroCapture,
                new(null, await repository.GetInfoAsync(id, default),
                    "GenerateHero\n" + JsonSerializer.Serialize(JsonDocument.Parse(hero.Payload).RootElement),
                    new Dictionary<string, byte[]?> { ["hero.webp"] = [1, 2, 3] }, SourceKind: "hero"), hero.TaskId);
            Assert.Equal(saved.CanonicalContent, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent);
            await new SyncRecipeProcessor(services.GetRequiredService<IClock>(), db, repository,
                services.GetRequiredService<SupperProjectionInvalidation>(), Mock.Of<ISupperProjectionPublisher>(),
                NullLogger<SyncRecipeProcessor>.Instance).ExecuteAsync(
                    workflow.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
            await new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance,
                Mock.Of<IScheduleEventPublisher>(), store).ExecuteAsync(
                    workflow.Tasks.Single(x => x.ProcessorName == "RecipeReady"), default);
            Assert.True((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).IsReady);
            var editedLines = canonical.IngredientLines.Select((line, index) => new RecipeIngredientLineInput
            {
                Id = line.Id, Description = line.Description,
                Amount = index == 0 ? LegacyGroceryQuantity.Parse("250") : line.Amount,
                AmountText = index == 0 ? "250" : line.AmountText,
                Unit = line.Unit, Scaling = line.Scaling, Package = line.Package, Shopping = line.Shopping
            }).ToArray();
            var editor = services.GetRequiredService<CanonicalRecipeContentStore>();
            await editor.EditAsync(id, canonical.SourceRevision, Guid.NewGuid(), new UpdateRecipeDto
            {
                ExpectedContentRevision = canonical.ContentRevision,
                IngredientLines = JsonSerializer.SerializeToElement(editedLines)
            });
            var revised = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            var projected = SupperIngredientProjection.Read(revised, 8);
            Assert.Equal(LegacyGroceryQuantity.Parse("500"), projected[0].GroceryObservation.Quantity);
            Assert.Equal(LegacyGroceryQuantity.Parse("200"), projected[1].GroceryObservation.Quantity);
            Assert.Equal(canonical.IngredientLines.Select(x => x.Id), CanonicalRecipeContentStore.Read(revised)!.IngredientLines.Select(x => x.Id));
            Assert.Equal(callsBeforeReplay, calls);
            var monday = new DateOnly(2026, 10, 12);
            (await db.CalendarEvents.SingleAsync(x => x.Date == monday && x.MealSlot == 0)).RecipeId = id;
            db.SupperServings.Add(new SupperServing { Date = monday, OverrideServings = 8 });
            await db.SaveChangesAsync();
            await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
            var grocery = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!;
            Assert.Equal(LegacyGroceryQuantity.Parse("500"), grocery.Single(x => x.NormalizedKey == "pasta").ExactQuantity);
            Assert.Equal(LegacyGroceryQuantity.Parse("200"), grocery.Single(x => x.NormalizedKey == "sauce").ExactQuantity);
            Assert.Single(grocery.Where(x => x.NormalizedKey == "pasta"));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshUrlCompleteButUnrepresentableQuantity_RetainsWordingForReviewInsteadOfCompleting()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            await storage.SaveAsync("workflows", "url-import.yaml", """
                name: url-import
                parameters: [recipeId, url]
                tasks:
                  - name: fetch_url_content
                    processor: FetchUrlContent
                    payload: {recipeId: "{{ recipeId }}", url: "{{ url }}"}
                  - name: extract_recipe
                    processor: ExtractRecipe
                    depends_on: [fetch_url_content]
                    payload: {recipeId: "{{ recipeId }}"}
                """);
            var orchestrator = new WorkflowOrchestrator(services.GetRequiredService<IClock>(),
                new WorkflowRepository(storage), db, store);
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
            var id = await service.CaptureUrl(new() { Url = "https://example.test/diced-pasta" },
                (await db.FamilyMembers.FirstAsync()).Id);
            db.ChangeTracker.Clear();
            var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == "url-import");
            await Web(store, new SourceHandler(() => { })).ExecuteAsync(
                workflow.Tasks.Single(x => x.ProcessorName == "FetchUrlContent"), default);
            const string complete = """
                {"name":"Pasta","recipeYield":"4","recipeIngredient":["200 g pasta, diced","100 ml sauce"],"supply":[{"name":"pasta","requiredQuantity":{"value":200,"unitText":"g"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Cook the pasta."}]}
                """;
            var chat = new Mock<IChatClient>();
            chat.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, complete)));
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(p => p.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
            var extract = workflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            var failure = await Assert.ThrowsAsync<RecipeContentReviewException>(() => agent.ExecuteAsync(extract, default));
            Assert.Equal(["ingredients"], failure.Reasons);
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.False(saved.IsReady);
            Assert.Null(saved.CanonicalContent);
            Assert.Contains("200 g pasta, diced", saved.Ingredients);
            Assert.Contains("Cook the pasta.", saved.RawMetadata);
            Assert.Contains("new acquired source", await repository.GetContentHtmlAsync(id, default));
            var journal = await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == extract.TaskId);
            using var receipt = JsonDocument.Parse(journal.Payload);
            Assert.Equal("review-material", receipt.RootElement.GetProperty("candidate").GetProperty("sourceKind").GetString());
            await Assert.ThrowsAsync<RecipeContentReviewException>(() => agent.ExecuteAsync(extract, default));
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshUrlIncompleteExtraction_RetainsEditableReviewMaterialWithoutCompletingOnReplay()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            await storage.SaveAsync("workflows", "url-import.yaml", """
                name: url-import
                parameters: [recipeId, url]
                tasks:
                  - name: fetch_url_content
                    processor: FetchUrlContent
                    payload: {recipeId: "{{ recipeId }}", url: "{{ url }}"}
                  - name: extract_recipe
                    processor: ExtractRecipe
                    depends_on: [fetch_url_content]
                    payload: {recipeId: "{{ recipeId }}"}
                """);
            var orchestrator = new WorkflowOrchestrator(services.GetRequiredService<IClock>(),
                new WorkflowRepository(storage), db, store);
            var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
            var member = (await db.FamilyMembers.FirstAsync()).Id;
            var id = await service.CaptureUrl(new() { Url = "https://example.test/pasta" }, member);
            db.ChangeTracker.Clear();
            var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == "url-import");
            await Web(store, new SourceHandler(() => { })).ExecuteAsync(
                workflow.Tasks.Single(x => x.ProcessorName == "FetchUrlContent"), default);

            const string incomplete = """
                {"name":"Pasta","recipeYield":"4","recipeIngredient":["200 g pasta","salt to taste"],"recipeInstructions":[]}
                """;
            var calls = 0;
            var chat = new Mock<IChatClient>();
            chat.Setup(c => c.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(() => { calls++; return new ChatResponse(new ChatMessage(ChatRole.Assistant, incomplete)); });
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(p => p.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
            var extract = workflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe");
            var failure = await Assert.ThrowsAsync<RecipeContentReviewException>(() => agent.ExecuteAsync(extract, default));
            Assert.Equal(["steps"], failure.Reasons);
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.False(saved.IsReady);
            Assert.Contains("200 g pasta", saved.Ingredients);
            Assert.Contains("salt to taste", saved.Ingredients);
            Assert.Equal("https://example.test/pasta", saved.SourceUrl);
            var journal = await db.RecipeFilePublications.AsNoTracking().SingleAsync(x => x.OperationId == extract.TaskId);
            using var receipt = JsonDocument.Parse(journal.Payload);
            Assert.Equal("review-material", receipt.RootElement.GetProperty("candidate").GetProperty("sourceKind").GetString());
            Assert.True(journal.Delivered);
            await Assert.ThrowsAsync<RecipeContentReviewException>(() => agent.ExecuteAsync(extract, default));
            Assert.Equal(2, calls);
            Assert.Equal(saved.Ingredients, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).Ingredients);
            Assert.Contains("new acquired source", await repository.GetContentHtmlAsync(id, default));

            workflow.Status = WorkflowStatus.Failed;
            extract.Status = RecipeApi.Models.TaskStatus.Failed;
            await db.SaveChangesAsync();
            await services.GetRequiredService<RecipeImportReportService>().MarkFailedAsync(
                id, workflow.Id, extract.TaskName, "Incomplete ingredients or steps", failure.Reasons);
            var report = await db.RecipeImportReports.AsNoTracking().SingleAsync(x => x.RecipeId == id);
            Assert.Equal(RecipeImportReportStatus.ReadyToReview, report.Status);
            Assert.Contains("review", report.Note, StringComparison.OrdinalIgnoreCase);
            await service.UpdateRecipe(id, new RecipeApi.Dto.UpdateRecipeDto
            {
                Ingredients = ["250 g pasta", "salt to taste"],
                RecipeInstructions = JsonSerializer.SerializeToElement(new[] { new { text = "Cook the pasta." } })
            });
            await Assert.ThrowsAsync<RecipeContentReviewException>(() => agent.ExecuteAsync(extract, default));
            var corrected = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.Contains("250 g pasta", corrected.Ingredients);
            Assert.False(corrected.IsReady);
            Assert.Equal(2, calls);
        });
    }
}
