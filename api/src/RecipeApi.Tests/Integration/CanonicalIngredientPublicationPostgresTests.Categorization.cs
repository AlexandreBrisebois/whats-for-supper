using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryCategorization_UrlAndPhotoReachReadyWithChangedFactsAndReplay()
    {
        foreach (var photo in new[] { false, true })
            await WithStore(async (services, repository, store, storage) =>
            {
                var (id, extraction) = await WholeUseImport(services, store, storage, photo);
                var chat = new Mock<IChatClient>();
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, WholeUseSource)));
                var prompts = new Mock<IPromptRepository>();
                prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
                await new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance,
                    store, "ExtractRecipe").ExecuteAsync(extraction, default);
                var db = services.GetRequiredService<RecipeDbContext>();
                var before = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == extraction.InstanceId);
                var category = workflow.Tasks.Single(x => x.ProcessorName == "CategorizeRecipe");
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                        """{"cuisineType":"Italian","mealTypes":["Lunch","Supper"],"primaryMealType":"Supper","isVegetarian":true}""")));
                var processor = ActivatorUtilities.CreateInstance<CategorizeRecipeProcessor>(services, chat.Object);
                await processor.ExecuteAsync(category, default);
                var classified = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                Assert.Equal("Supper", classified.Category);
                Assert.Equal("Italian", classified.CuisineType);
                Assert.Equal(new[] { "Lunch", "Supper" }, classified.MealTypes);
                Assert.True(classified.IsVegetarian);
                Assert.Equal(before.CanonicalContent, classified.CanonicalContent);
                Assert.True(await store.CompleteReadinessAsync(workflow.Tasks.Single(x => x.ProcessorName == "RecipeReady"), id));
                var ready = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                Assert.True(ready.IsReady);
                Assert.Equal(before.CanonicalContent, ready.CanonicalContent);
                await processor.ExecuteAsync(category, default);
                Assert.True((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).IsReady);
            });
    }
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryCategorization_RejectsUnrelatedMetadataAndHumanChangeDuringProvider()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var (id, extraction) = await WholeUseImport(services, store, storage, photo: false);
            var chat = new Mock<IChatClient>();
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, WholeUseSource)));
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
            await new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance,
                store, "ExtractRecipe").ExecuteAsync(extraction, default);
            var db = services.GetRequiredService<RecipeDbContext>();
            var category = await db.WorkflowTasks.SingleAsync(x => x.InstanceId == extraction.InstanceId && x.ProcessorName == "CategorizeRecipe");
            var capture = await store.CaptureForTaskAsync(category, id);
            var info = await repository.GetInfoAsync(id, default);
            info.Description = "Unrelated replacement";
            var input = "CategorizeRecipe\n" + category.Payload;
            await Assert.ThrowsAsync<InvalidDataException>(() => store.PublishAsync(capture,
                new(null, info, input, SourceKind: "categorization"), category.TaskId));
            var prior = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            var originalFiles = capture.Files;
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .Returns(async () =>
                {
                    var human = await db.Recipes.SingleAsync(x => x.Id == id);
                    human.Name = "Human corrected name";
                    human.Description = "";
                    await db.SaveChangesAsync();
                    return new ChatResponse(new ChatMessage(ChatRole.Assistant,
                        """{"cuisineType":"Italian","mealTypes":["Supper"],"primaryMealType":"Supper","isVegetarian":true}"""));
                });
            var processor = ActivatorUtilities.CreateInstance<CategorizeRecipeProcessor>(services, chat.Object);
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => processor.ExecuteAsync(category, default));
            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            Assert.Equal("Human corrected name", saved.Name);
            Assert.Equal("", saved.Description);
            Assert.Equal(prior.Category, saved.Category);
            Assert.Equal(prior.CanonicalContent, saved.CanonicalContent);
            Assert.False(saved.IsReady);
            Assert.False(await db.RecipeFilePublications.AnyAsync(x => x.OperationId == category.TaskId));
            var afterFiles = (await store.CaptureAsync(id)).Files;
            foreach (var file in originalFiles) Assert.Equal(file.Value, afterFiles[file.Key]);
            // A stale queued invocation fails before reaching the provider again.
            var calls = chat.Invocations.Count;
            await Assert.ThrowsAsync<RecipeContentConflictException>(() => processor.ExecuteAsync(category, default));
            Assert.Equal(calls, chat.Invocations.Count);
        });
    }

}
