using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Infrastructure;
using RecipeApi.Utils;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task BilingualGroceries_ActualEnFrImportsAndQuantitySavesAggregateOneSavedFoodThroughOrdinaryAssignment()
    {
        await WithStore(async (services, repository, store, storage) =>
        {
            var db = services.GetRequiredService<RecipeDbContext>();
            await InstallThreeAnchorInput(db, storage);
            var ids = new List<Guid>();
            var chat = new Mock<IChatClient>();
            foreach (var (name, photo) in new[] { ("onion", false), ("oignon", true) })
            {
                var (id, extraction) = await WholeUseImport(services, store, storage, photo);
                var source = JsonSerializer.Serialize(new
                {
                    name = "Bilingual " + name, recipeYield = "4 servings", recipeIngredient = new[] { "25 g " + name },
                    supply = new[] { new { name, requiredQuantity = new { value = 25, unitText = "g" } } },
                    recipeInstructions = new[] { new { text = "Mix." } }
                });
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, source)));
                var prompts = new Mock<IPromptRepository>();
                prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
                await new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(), NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe")
                    .ExecuteAsync(extraction, default);
                var imported = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                var content = CanonicalRecipeContentStore.Read(imported)!;
                Assert.Equal(ThreeAnchorFoodIds[0], Assert.Single(content.IngredientLines).Shopping.FoodId);
                Assert.Equal(name, content.IngredientLines[0].Shopping.Name);
                // Complete the real follow-up publication, category and Ready seams.
                var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.Id == extraction.InstanceId);
                var clock = services.GetRequiredService<IClock>();
                var hero = workflow.Tasks.Single(x => x.ProcessorName == "GenerateHero");
                await store.PublishAsync(await store.CaptureForTaskAsync(hero, id),
                    new(null, await repository.GetInfoAsync(id, default), "GenerateHero\n" + JsonSerializer.Serialize(JsonDocument.Parse(hero.Payload!).RootElement),
                        new Dictionary<string, byte[]?> { ["hero.webp"] = [7, 8, 9] }, SourceKind: "hero"), hero.TaskId);
                await new SyncRecipeProcessor(clock, db, repository, services.GetRequiredService<SupperProjectionInvalidation>(),
                    Mock.Of<ISupperProjectionPublisher>(), NullLogger<SyncRecipeProcessor>.Instance,
                    TestPublicationStore.Vocabulary(db, repository.StorageProvider, clock, services))
                    .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "SyncRecipe"), default);
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                        JsonSerializer.Serialize(new[] { new { normalizedKey = IngredientNormalizer.Normalize(name), section = "Produce", confidence = 1 } }))));
                await new CategorizeIngredientsProcessor(clock, db, chat.Object, NullLogger<CategorizeIngredientsProcessor>.Instance)
                    .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeIngredients"), default);
                chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant,
                        """{"cuisineType":"Italian","mealTypes":["Lunch","Supper"],"primaryMealType":"Supper","isVegetarian":true}""")));
                await ActivatorUtilities.CreateInstance<CategorizeRecipeProcessor>(services, chat.Object)
                    .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "CategorizeRecipe"), default);
                await new RecipeReadyProcessor(db, NullLogger<RecipeReadyProcessor>.Instance, Mock.Of<IScheduleEventPublisher>(), store)
                    .ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "RecipeReady"), default);
                Assert.True((await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id)).IsReady);
                var line = content.IngredientLines[0];
                var update = new UpdateRecipeDto
                {
                    ExpectedContentRevision = content.ContentRevision,
                    IngredientLines = JsonSerializer.SerializeToElement(new[] { new
                    {
                        id = line.Id, description = line.Description, amount = LegacyGroceryQuantity.Parse("50"), amountText = "50",
                        unit = line.Unit, scaling = line.Scaling, package = line.Package, shopping = line.Shopping
                    } }, new JsonSerializerOptions(JsonSerializerDefaults.Web))
                };
                var saved = await services.GetRequiredService<CanonicalRecipeContentStore>()
                    .EditAsync(id, content.SourceRevision, Guid.NewGuid(), update);
                Assert.Equal(line.Shopping, Assert.Single(saved.Content.IngredientLines).Shopping);
                ids.Add(id);
            }
            var beforeReads = chat.Invocations.Count;
            var monday = new DateOnly(2026, 10, 12);
            db.SupperServings.AddRange(new SupperServing { Date = monday, OverrideServings = 4 },
                new SupperServing { Date = monday.AddDays(1), OverrideServings = 4 });
            await db.SaveChangesAsync();
            var schedule = services.GetRequiredService<ScheduleService>();
            await schedule.AssignRecipeAsync(new(0, 0, ids[0]), referenceWeekStartDate: monday);
            await schedule.AssignRecipeAsync(new(0, 1, ids[1]), referenceWeekStartDate: monday);
            var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
            var rows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!
                .Where(x => x.RecipeIds.Any(ids.Contains)).ToArray();
            // Domain RED: existing normalized-name grouping produces onion + oignon.
            var onion = Assert.Single(rows);
            Assert.Equal(LegacyGroceryQuantity.Parse("100"), onion.ExactQuantity);
            Assert.Equal(ids.OrderBy(x => x), onion.RecipeIds.OrderBy(x => x));
            Assert.Equal(beforeReads, chat.Invocations.Count);
        }, localRecipeStore: true);
    }
}
