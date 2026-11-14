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
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    private const string WholeUseSource = """
        {"name":"Whole-use pasta","recipeYield":"4 servings","recipeIngredient":["200 g pasta","100 ml sauce"],"supply":[{"name":"pasta","requiredQuantity":{"value":200,"unitText":"g"}},{"name":"sauce","requiredQuantity":{"value":100,"unitText":"ml"}}],"recipeInstructions":[{"text":"Add all 200 g pasta."},{"text":"Cook 20 minutes at 180 °C."}]}
        """;

    private static async Task<(Guid Id, WorkflowTask Extraction)> WholeUseImport(IServiceProvider services,
        RecipeFilePublicationStore store, FailingStorage storage, bool photo)
    {
        var db = services.GetRequiredService<RecipeDbContext>();
        var workflowId = photo ? "recipe-import" : "url-import";
        await storage.SaveAsync("workflows", workflowId + ".yaml", await File.ReadAllTextAsync(
            Path.Combine(DeploymentCalendarPostgresTests.RepositoryRoot(), $"api/src/RecipeApi/Workflows/{workflowId}.yaml")));
        var orchestrator = new WorkflowOrchestrator(services.GetRequiredService<IClock>(), new WorkflowRepository(storage), db, store);
        var service = ActivatorUtilities.CreateInstance<RecipeService>(services, store, orchestrator);
        var member = (await db.FamilyMembers.FirstAsync()).Id;
        var id = photo
            ? await service.CreateRecipe(member, new FormFileCollection { Upload() }, new())
            : await service.CaptureUrl(new() { Url = "https://example.test/whole-use" }, member);
        db.ChangeTracker.Clear();
        var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == workflowId);
        if (!photo) await Web(store, new SourceHandler(() => { })).ExecuteAsync(
            workflow.Tasks.Single(x => x.ProcessorName == "FetchUrlContent"), default);
        return (id, workflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe"));
    }

    private static CanonicalRecipeExport WholeUseExport(Guid id, string source, string? sourceUrl,
        string stepText, string amount = "200")
    {
        var sourceRevision = CanonicalRecipeContentStore.InspectSourceRevision(new Recipe
        { Id = id, RawMetadata = source, SourceUrl = sourceUrl });
        RecipeIngredientLineDto Line(string description, string quantity, string unit) => new()
        {
            Id = Guid.NewGuid(), Description = description, Amount = LegacyGroceryQuantity.Parse(quantity), AmountText = quantity,
            Unit = new(unit, null), Scaling = "proportional", Package = null,
            Shopping = new(description, null, null), Provenance = new("source", sourceRevision, [])
        };
        return new CanonicalRecipeExport(id,
            new CanonicalRecipeContent(2, Guid.NewGuid().ToString("N"), sourceRevision, 4,
                [Line("pasta", amount, "g"), Line("sauce", "100", "ml")],
                [new(Guid.NewGuid(), null, [new(Guid.NewGuid(), stepText, Guid.NewGuid().ToString("N"), []),
                    new(Guid.NewGuid(), "Cook 20 minutes at 180 °C.", Guid.NewGuid().ToString("N"), [])])]), source);
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryWholeUse_FreshUrlAndPhotoPublishProofAndReplayWithoutDuplicateDemand()
    {
        foreach (var photo in new[] { false, true })
            await WithStore(async (services, repository, store, storage) =>
            {
                var (id, extraction) = await WholeUseImport(services, store, storage, photo);
                var chat = new Mock<IChatClient>();
                var calls = 0;
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(() => { calls++; return new ChatResponse(new ChatMessage(ChatRole.Assistant, WholeUseSource)); });
                var prompts = new Mock<IPromptRepository>();
                prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
                var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
                await agent.ExecuteAsync(extraction, default);
                var db = services.GetRequiredService<RecipeDbContext>();
                var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                var content = CanonicalRecipeContentStore.Read(saved)!;
                var binding = Assert.Single(content.InstructionSections.SelectMany(x => x.Steps).SelectMany(x => x.Bindings));
                Assert.Equal("whole", binding.GetProperty("role").GetString());
                Assert.Equal(content.IngredientLines[0].Id, binding.GetProperty("ingredientLineId").GetGuid());
                var projection = CookingStepProjection.Read(content, 8);
                Assert.Equal("Add all 400 g pasta.", projection.Sections[0].Steps[0].Text);
                Assert.Equal("Cook 20 minutes at 180 °C.", projection.Sections[0].Steps[1].Text);
                Assert.Equal("Add all 200 g pasta.", content.InstructionSections[0].Steps[0].Text);
                Assert.Equal(1, projection.ValidatedUses);
                var callsBeforeReplay = calls;
                await agent.ExecuteAsync(extraction, default);
                Assert.Equal(callsBeforeReplay, calls);
                Assert.Equal(saved.CanonicalContent, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent);
                if (photo) Assert.Equal(new byte[] { 4, 5, 6 }, await repository.GetOriginalImageAsync(id, 0, default));

                var monday = new DateOnly(2026, 10, 12);
                (await db.CalendarEvents.SingleAsync(x => x.Date == monday && x.MealSlot == 0)).RecipeId = id;
                db.SupperServings.Add(new SupperServing { Date = monday, OverrideServings = 8 });
                await db.SaveChangesAsync();
                await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
                var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                var groceries = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!;
                Assert.Equal(LegacyGroceryQuantity.Parse("400"), Assert.Single(groceries,
                    x => x.NormalizedKey == "pasta" && x.RecipeIds.Contains(id)).ExactQuantity);
            });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryWholeUse_PublicationRejectsProviderCertifiedBindingWithoutWholeEvidence()
    {
        await WithStore(async (services, _, store, storage) =>
        {
            var (id, extraction) = await WholeUseImport(services, store, storage, photo: false);
            var capture = await store.CaptureForTaskAsync(extraction, id);
            var source = WholeUseSource.Replace("Add all 200 g pasta.", "Add 200 g pasta.", StringComparison.Ordinal);
            var prepared = WholeUseExport(id, source, capture.Fields!.SourceUrl, "Add 200 g pasta.");
            var section = prepared.Content.InstructionSections[0];
            var step = section.Steps[0];
            var forged = JsonSerializer.SerializeToElement(new
            {
                id = Guid.NewGuid(), ingredientLineId = prepared.Content.IngredientLines[0].Id, stepId = step.Id,
                validatedContentRevision = prepared.Content.ContentRevision, validatedTextRevision = step.TextRevision,
                span = new { start = 4, end = 9, expectedText = "200 g" }, role = "whole", payload = new { }, status = "validated"
            });
            prepared = prepared with { Content = prepared.Content with { InstructionSections =
                [section with { Steps = [step with { Bindings = [forged] }, section.Steps[1]] }] } };
            var db = services.GetRequiredService<RecipeDbContext>();
            var before = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            var journals = await db.RecipeFilePublications.CountAsync();
            await Assert.ThrowsAsync<InvalidDataException>(() => store.PublishAsync(capture,
                new(RecipeExportContent.WriteCurrent(prepared), new RecipeInfo { Id = id, Name = "Whole-use pasta", SourceUrl = capture.Fields.SourceUrl },
                    "ExtractRecipe\n" + JsonSerializer.Serialize(JsonDocument.Parse(extraction.Payload!).RootElement), SourceKind: "fresh-canonical"), extraction.TaskId));
            db.ChangeTracker.Clear();
            Assert.Equal(before.CanonicalContent, (await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).CanonicalContent);
            Assert.Equal(journals, await db.RecipeFilePublications.CountAsync());
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryWholeUse_PublicationRejectsCanonicalProofThatDiffersFromRetainedSource()
    {
        foreach (var changedFact in new[] { "step", "amount" })
            await WithStore(async (services, repository, store, storage) =>
            {
                var (id, extraction) = await WholeUseImport(services, store, storage, photo: false);
                var capture = await store.CaptureForTaskAsync(extraction, id);
                var source = changedFact == "step"
                    ? WholeUseSource.Replace("Add all 200 g pasta.", "Add 200 g pasta.", StringComparison.Ordinal)
                    : WholeUseSource.Replace("\"200 g pasta\"", "\"250 g pasta\"", StringComparison.Ordinal)
                        .Replace("\"value\":200", "\"value\":250", StringComparison.Ordinal);
                var prepared = WholeUseExport(id, source, capture.Fields!.SourceUrl, "Add all 200 g pasta.");
                prepared = prepared with { Content = CookingStepRelationshipProducer.Discover(prepared.Content) };
                Assert.Single(prepared.Content.InstructionSections.SelectMany(x => x.Steps).SelectMany(x => x.Bindings));
                CookingStepRelationshipProducer.ValidateFresh(prepared.Content);
                var db = services.GetRequiredService<RecipeDbContext>();
                var before = JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id));
                var files = capture.Files;
                var journals = await db.RecipeFilePublications.CountAsync();
                var info = await repository.GetInfoAsync(id, default);
                await Assert.ThrowsAsync<InvalidDataException>(() => store.PublishAsync(capture,
                    new(RecipeExportContent.WriteCurrent(prepared), info,
                        "ExtractRecipe\n" + JsonSerializer.Serialize(JsonDocument.Parse(extraction.Payload!).RootElement), SourceKind: "fresh-canonical"), extraction.TaskId));
                db.ChangeTracker.Clear();
                Assert.Equal(before, JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)));
                Assert.Equal(journals, await db.RecipeFilePublications.CountAsync());
                var retained = (await store.CaptureAsync(id)).Files;
                Assert.Equal(files.Keys.Order(), retained.Keys.Order());
                foreach (var path in files.Keys) Assert.Equal(files[path], retained[path]);
            });
    }

}
