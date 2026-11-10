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
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientPublicationPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task FreshUrl_ExactAndAbsentFactsSurvivePublicationAndHumanAmountClear()
    {
        await WithStore(async (services, _, store, storage) =>
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
            var id = await service.CaptureUrl(new() { Url = "https://example.test/exact-facts" },
                (await db.FamilyMembers.FirstAsync()).Id);
            db.ChangeTracker.Clear();
            var workflow = await db.WorkflowInstances.Include(x => x.Tasks).SingleAsync(x => x.WorkflowId == "url-import");
            await Web(store, new SourceHandler(() => { })).ExecuteAsync(
                workflow.Tasks.Single(x => x.ProcessorName == "FetchUrlContent"), default);
            const string extracted = """
                {"name":"Exact facts","recipeYield":"4 servings","recipeIngredient":["½ cup flour","2–3 tbsp oil","0 g salt","2 eggs","cup water","Fresh basil leaves"],"supply":[{"name":"flour","requiredQuantity":{"value":0.5,"unitText":"cup"}},{"name":"oil","requiredQuantity":{"value":2,"unitText":"tbsp"}},{"name":"salt","requiredQuantity":{"value":0,"unitText":"g"}},{"name":"eggs","requiredQuantity":{"value":2}},{"name":"water","requiredQuantity":{"unitText":"cup"}}],"recipeInstructions":[{"text":"Mix the ingredients."}]}
                """;
            var chat = new Mock<IChatClient>();
            chat.Setup(x => x.GetResponseAsync(It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChatResponse(new ChatMessage(ChatRole.Assistant, extracted)));
            var prompts = new Mock<IPromptRepository>();
            prompts.Setup(x => x.GetPrompt(It.IsAny<PromptType>())).Returns("Extract recipe");
            var agent = new RecipeAgent(chat.Object, prompts.Object, new ConfigurationManager(),
                NullLogger<RecipeAgent>.Instance, store, "ExtractRecipe");
            await agent.ExecuteAsync(workflow.Tasks.Single(x => x.ProcessorName == "ExtractRecipe"), default);

            var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
            var content = CanonicalRecipeContentStore.Read(saved)!;
            Assert.Equal(6, content.IngredientLines.Count);
            Assert.Equal(new[] { "½ cup flour", "2–3 tbsp oil", "0 g salt", "2 eggs", "cup water", "Fresh basil leaves" },
                content.IngredientLines.Select(CanonicalRecipeContentStore.Render));
            Assert.Equal(LegacyGroceryQuantity.Parse("½"), content.IngredientLines[0].Amount);
            Assert.Equal(LegacyGroceryQuantity.Parse("2–3"), content.IngredientLines[1].Amount);
            Assert.Equal(LegacyGroceryQuantity.Parse("0"), content.IngredientLines[2].Amount);
            Assert.Equal(LegacyGroceryQuantity.Parse("2"), content.IngredientLines[3].Amount);
            Assert.Null(content.IngredientLines[3].Unit);
            Assert.Null(content.IngredientLines[4].Amount);
            Assert.Equal("cup", content.IngredientLines[4].Unit?.Text);
            Assert.Null(content.IngredientLines[5].Amount);
            Assert.Null(content.IngredientLines[5].Unit);
            Assert.All(content.IngredientLines, line => Assert.Equal("source", line.Provenance.Origin));
            Assert.DoesNotContain(await db.RecipeImportReports.AsNoTracking().ToListAsync(), x => x.RecipeId == id);
            var projected = SupperIngredientProjection.Read(saved, 8);
            Assert.Equal(LegacyGroceryQuantity.Parse("1"), projected[0].GroceryObservation.Quantity);
            Assert.Equal(LegacyGroceryQuantity.Parse("4–6"), projected[1].GroceryObservation.Quantity);
            Assert.Equal(LegacyGroceryQuantity.Parse("0"), projected[2].GroceryObservation.Quantity);
            Assert.Null(projected[4].GroceryObservation.Quantity);
            Assert.Null(projected[5].GroceryObservation.Quantity);

            var monday = new DateOnly(2026, 10, 12);
            (await db.CalendarEvents.SingleAsync(x => x.Date == monday && x.MealSlot == 0)).RecipeId = id;
            db.SupperServings.Add(new SupperServing { Date = monday, OverrideServings = 8 });
            await db.SaveChangesAsync();
            await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            var plan = await db.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
            var grocery = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!;
            Assert.Equal(LegacyGroceryQuantity.Parse("1"), Assert.Single(grocery, x => x.NormalizedKey == "flour").ExactQuantity);
            Assert.Equal(LegacyGroceryQuantity.Parse("4–6"), Assert.Single(grocery, x => x.NormalizedKey == "oil").ExactQuantity);
            Assert.Equal(LegacyGroceryQuantity.Parse("0"),
                Assert.Single(grocery, x => x.NormalizedKey == "salt" && x.RecipeIds.Contains(id)).ExactQuantity);

            var edited = content.IngredientLines.Select((line, index) => new RecipeIngredientLineInput
            {
                Id = line.Id, Description = line.Description,
                Amount = index == 0 ? null : line.Amount,
                AmountText = index == 0 ? null : line.AmountText,
                Unit = line.Unit, Scaling = line.Scaling, Package = line.Package, Shopping = line.Shopping
            }).ToArray();
            await services.GetRequiredService<CanonicalRecipeContentStore>().EditAsync(id, content.SourceRevision,
                Guid.NewGuid(), new UpdateRecipeDto
                {
                    ExpectedContentRevision = content.ContentRevision,
                    IngredientLines = JsonSerializer.SerializeToElement(edited)
                });
            db.ChangeTracker.Clear();
            var reopened = CanonicalRecipeContentStore.Read(await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id))!;
            Assert.Null(reopened.IngredientLines[0].Amount);
            Assert.Null(reopened.IngredientLines[0].AmountText);
            Assert.Equal("cup flour", CanonicalRecipeContentStore.Render(reopened.IngredientLines[0]));
            Assert.Equal("human", reopened.IngredientLines[0].Provenance.Origin);
            Assert.Equal(content.SourceRevision, reopened.SourceRevision);
            Assert.Equal(content.IngredientLines.Select(x => x.Id), reopened.IngredientLines.Select(x => x.Id));
            Assert.Equal(LegacyGroceryQuantity.Parse("2–3"), reopened.IngredientLines[1].Amount);
        });
    }
}
